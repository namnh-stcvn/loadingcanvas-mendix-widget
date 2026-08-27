/**
 * Mendix Data Adapter
 *
 * Bridges the React widget to the Mendix Data API (`mx.data`).
 * In a Mendix runtime, `mx.data` is available globally via `window.mx.data`.
 * In the dev environment (Vite), we fall back to JSON parsing for testing.
 *
 * This adapter handles:
 * - Loading TruckSelection → TruckItem (via truckAdapter)
 * - Loading TransportOrders → CargoItem[] (via cargoAdapter)
 * - Loading PackingPlan → CargoItem[] (via stateAdapter)
 * - Saving PackingPlan (delete + recreate items)
 */

import type { CargoItem } from "../viewModels/CargoItem";
import type { TruckItem } from "../viewModels/TruckItem";
import { deserializePlan, serializePlan, type PackingPlanData } from "./stateAdapter";
import {
  computeScale,
  truckSelectionToTruckItem,
  DEFAULT_TRUCK_AXLE_COUNT,
  DEFAULT_TRUCK_HEIGHT_METER,
  DEFAULT_TRUCK_LENGTH_METER,
  DEFAULT_TRUCK_MAX_PAYLOAD_KG,
  DEFAULT_TRUCK_WIDTH_METER,
  type TruckSelectionData,
} from "./truckAdapter";
import {
  applyPackingUnitData,
  DEFAULT_HEIGHT_METER,
  DEFAULT_LENGTH_METER,
  DEFAULT_WEIGHT_KG,
  DEFAULT_WIDTH_METER,
  packingTypeFromColor,
  resolvePackingType,
  transportOrdersToCargoItems,
  type PackingUnitData,
  type TransportOrderData,
} from "./cargoAdapter";
import type { CanvasState } from "../state/CanvasState";
import type { MxData, MxObject } from "../types/mx";
import Big from "big.js";
import { fromCargoId, toCargoId } from "../domain/cargoIdentity";

/**
 * Check if we're running inside a Mendix runtime with mx.data available.
 */
export const isMendixRuntime = (): boolean => {
  return typeof window !== "undefined" && typeof window.mx !== "undefined" && typeof window.mx.data?.get === "function";
};

/**
 * Safely access the global `mx.data` object.
 */
export const getMx = (): MxData | null => {
  if (!isMendixRuntime()) {
    return null;
  }
  return window.mx!.data!;
};

/**
 * Convert a number to Big.js representation (required for Mendix Decimal attributes).
 */
export type MendixDecimal = Big;

export const toBig = (val: number): MendixDecimal => {
  if (!Number.isFinite(val)) {
    throw new Error(`Cannot convert non-finite value to Mendix Decimal: ${val}`);
  }
  return new Big(val);
};

export const getObjectGuid = (obj: unknown): string | undefined => {
  if (typeof obj === "string") {
    return obj;
  }
  if (!obj || typeof obj !== "object") {
    return undefined;
  }
  const candidate = obj as Partial<MxObject> & { guid?: string; id?: string };
  if (typeof candidate.getGuid === "function") {
    return candidate.getGuid();
  }
  if (typeof candidate.getGUID === "function") {
    return candidate.getGUID();
  }
  return candidate.guid ?? candidate.id;
};

const isMxObject = (obj: unknown): obj is MxObject => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as MxObject).get === "function" &&
    typeof (obj as MxObject).set === "function" &&
    typeof (obj as MxObject).getAttributes === "function"
  );
};

const setMxAttribute = (obj: unknown, attribute: string, value: unknown, context: string): void => {
  if (!isMxObject(obj)) {
    throw new Error(`${context}: created value is not a Mendix object`);
  }
  try {
    obj.set(attribute, value);
  } catch (error) {
    throw new Error(`${context}: failed to set ${attribute}`, { cause: error });
  }
};

const MENDIX_DECIMAL_SCALE = 8;

type DecimalConstructor = new (value: number | string) => unknown;

const getDecimalConstructor = (obj: unknown, attribute: string, context: string): DecimalConstructor => {
  if (!isMxObject(obj)) {
    throw new Error(`${context}: created value is not a Mendix object`);
  }

  const tryGetConstructor = (attr: string): DecimalConstructor | null => {
    const currentValue = obj.get(attr);
    if (currentValue !== null && typeof currentValue === "object" && typeof currentValue.constructor === "function") {
      return currentValue.constructor as DecimalConstructor;
    }
    return null;
  };

  const constructor = tryGetConstructor(attribute);
  if (constructor) {
    return constructor;
  }

  // All Decimal attributes on the same MxObject share the same Mendix Decimal constructor.
  // If the target attribute has no default value, borrow the constructor from another
  // Decimal attribute that does (e.g. PositionX/Width/Height usually have defaults).
  const fallbackAttributes = ["PositionX", "PositionY", "Length", "Width", "LengthMeters", "WidthMeters", "WeightKg"];
  for (const attr of fallbackAttributes) {
    if (attr === attribute) {
      continue;
    }
    const fallback = tryGetConstructor(attr);
    if (fallback) {
      return fallback;
    }
  }

  throw new Error(`${context}: ${attribute} has no native Mendix Decimal default value`);
};

const setMxDecimalAttribute = (obj: unknown, attribute: string, value: number, context: string): void => {
  if (!Number.isFinite(value)) {
    throw new Error(`${context}: ${attribute} must be a finite number`);
  }
  const Decimal = getDecimalConstructor(obj, attribute, context);
  const normalizedValue = new Big(value).round(MENDIX_DECIMAL_SCALE, Big.roundHalfUp).toFixed(MENDIX_DECIMAL_SCALE);
  setMxAttribute(obj, attribute, new Decimal(normalizedValue), context);
};

const PACKING_PLAN_TRUCK_ASSOCIATIONS = ["TCSLoadingMeter.PackingPlan_TruckSelection", "PackingPlan_TruckSelection"];
const PACKING_PLAN_ITEM_ASSOCIATIONS = ["TCSLoadingMeter.PackingPlanItem_PackingPlan", "PackingPlanItem_PackingPlan"];

// Candidate names stay bounded and adapter-local (see docs/PACKING_PLAN_ENTITY.md).
const TRANSPORT_ORDER_PACKING_UNIT_ASSOCIATIONS = [
  "TCSTransportModule.TransportOrder_PackingUnit",
  "TransportOrder_PackingUnit",
];
const PACKING_UNIT_PACKING_TYPE_ASSOCIATIONS = [
  "DataModelModule.PackingUnit_DataModelModule.PackingType",
  "PackingUnit_PackingType",
];

const getAssociationGuid = (obj: unknown, associationNames: string[]): string | undefined => {
  if (!isMxObject(obj)) {
    return undefined;
  }

  for (const associationName of associationNames) {
    try {
      const guid = getObjectGuid(obj.get(associationName));
      if (guid) {
        return guid;
      }
    } catch {
      continue;
    }
  }
  return undefined;
};

// Reference attributes are not part of getAttributes(); read them via mxObject.get().
// Handles single-reference GUIDs as well as reference sets (GUID arrays).
export const getReferenceGuids = (obj: unknown, associationNames: string[]): string[] => {
  if (!isMxObject(obj)) {
    return [];
  }

  for (const associationName of associationNames) {
    const guids: string[] = [];
    try {
      const value = obj.get(associationName);
      if (Array.isArray(value)) {
        for (const entry of value) {
          const guid = getObjectGuid(entry);
          if (guid) {
            guids.push(guid);
          }
        }
      } else if (value !== null && value !== undefined && value !== "") {
        const guid = getObjectGuid(value);
        if (guid) {
          guids.push(guid);
        }
      }
    } catch {
      continue;
    }
    if (guids.length > 0) {
      return [...new Set(guids)];
    }
  }
  return [];
};

export const filterByAssociationGuid = (
  objects: unknown[],
  associationNames: string[],
  expectedGuid: string
): unknown[] => objects.filter((obj) => getAssociationGuid(obj, associationNames) === expectedGuid);

/**
 * Extract plain JavaScript key-value pairs from either an MxObject or a plain JS object.
 */
export const toPlainObject = (obj: unknown): Record<string, unknown> => {
  if (!obj || typeof obj !== "object") {
    return {};
  }
  const anyObj = obj as Record<string, unknown>;

  // Check if it's a Mendix MxObject (has .get() method)
  if (typeof anyObj.get === "function" && typeof anyObj.getAttributes === "function") {
    const mxObject = obj as MxObject;
    const result: Record<string, unknown> = {};
    const guid = getObjectGuid(mxObject);

    if (guid) {
      result.id = guid;
      result.guid = guid;
    }

    if (typeof anyObj.getAttributes === "function") {
      const attrs = mxObject.getAttributes();
      for (const attr of attrs) {
        let val = mxObject.get(attr);
        // Handle Mendix Big.js decimal numbers
        if (
          val !== null &&
          typeof val === "object" &&
          typeof (val as { toNumber?: () => number }).toNumber === "function"
        ) {
          val = (val as { toNumber: () => number }).toNumber();
        }
        result[attr] = val;
        // camelCase alias
        const camel = attr.charAt(0).toLowerCase() + attr.slice(1);
        if (!(camel in result)) {
          result[camel] = val;
        }
        // lowercase alias
        const lower = attr.toLowerCase();
        if (!(lower in result)) {
          result[lower] = val;
        }
      }
    }
    return result;
  }

  // Already a plain JS object
  return { ...anyObj };
};

/**
 * Safely extract TruckSelectionData from an MxObject or plain object.
 */
export const extractTruckData = (obj: unknown, fallbackGuid?: string): TruckSelectionData | null => {
  if (!obj) {
    return null;
  }
  const raw = toPlainObject(obj);
  const id = String(raw.id ?? raw.guid ?? fallbackGuid ?? "truck-1");

  const length = Number(
    raw.internalLengthMeter ??
      raw.InternalLengthMeter ??
      raw.lengthMeter ??
      raw.LengthMeter ??
      raw.length ??
      raw.Length ??
      raw.internalLength ??
      raw.InternalLength ??
      DEFAULT_TRUCK_LENGTH_METER
  );

  const width = Number(
    raw.internalWidthMeter ??
      raw.InternalWidthMeter ??
      raw.widthMeter ??
      raw.WidthMeter ??
      raw.width ??
      raw.Width ??
      raw.internalWidth ??
      raw.InternalWidth ??
      DEFAULT_TRUCK_WIDTH_METER
  );

  const height = Number(
    raw.internalHeightMeter ??
      raw.InternalHeightMeter ??
      raw.heightMeter ??
      raw.HeightMeter ??
      raw.height ??
      raw.Height ??
      raw.internalHeight ??
      raw.InternalHeight ??
      DEFAULT_TRUCK_HEIGHT_METER
  );

  const code = String(
    raw.code ??
      raw.Code ??
      raw.truckCode ??
      raw.TruckCode ??
      raw.trailerCode ??
      raw.TrailerCode ??
      raw.name ??
      raw.Name ??
      "TRUCK"
  );

  // raw.* names are Mendix entity attributes and remain unchanged
  const truckType = (raw.trailerType ??
    raw.TrailerType ??
    raw.type ??
    raw.Type ??
    "DryVan") as TruckSelectionData["truckType"];

  const maxPayloadKg = Number(
    raw.maxPayloadKg ??
      raw.MaxPayloadKg ??
      raw.maxPayload ??
      raw.MaxPayload ??
      raw.payloadKg ??
      raw.PayloadKg ??
      raw.payload ??
      raw.Payload ??
      DEFAULT_TRUCK_MAX_PAYLOAD_KG
  );

  const axleCount = Number(raw.axleCount ?? raw.AxleCount ?? raw.axles ?? raw.Axles ?? DEFAULT_TRUCK_AXLE_COUNT);

  const rawMaxLoad = raw.maxLoadMeters ?? raw.MaxLoadMeters ?? raw.maxLoadMeter ?? raw.MaxLoadMeter;
  const maxLoadMeters =
    rawMaxLoad !== undefined && rawMaxLoad !== null
      ? Number(rawMaxLoad)
      : length > 0
        ? length
        : DEFAULT_TRUCK_LENGTH_METER;

  return {
    id,
    code,
    truckType: truckType || "DryVan",
    maxPayloadKg: isNaN(maxPayloadKg) ? DEFAULT_TRUCK_MAX_PAYLOAD_KG : maxPayloadKg,
    axleCount: isNaN(axleCount) ? DEFAULT_TRUCK_AXLE_COUNT : axleCount,
    internalLengthMeter: length > 0 ? length : DEFAULT_TRUCK_LENGTH_METER,
    internalWidthMeter: width > 0 ? width : DEFAULT_TRUCK_WIDTH_METER,
    internalHeightMeter: height > 0 ? height : DEFAULT_TRUCK_HEIGHT_METER,
    maxLoadMeters: maxLoadMeters > 0 ? maxLoadMeters : length > 0 ? length : DEFAULT_TRUCK_LENGTH_METER,
  };
};

/**
 * Safely extract TransportOrderData from an MxObject or plain object.
 */
export const extractTransportOrderData = (obj: unknown, fallbackGuid?: string): TransportOrderData | null => {
  if (!obj) {
    return null;
  }
  const raw = toPlainObject(obj);
  const id = String(raw.id ?? raw.guid ?? fallbackGuid ?? "");

  const length = Number(
    raw.lengthMeter ??
      raw.LengthMeter ??
      raw.length ??
      raw.Length ??
      raw.packingUnitLengthMeter ??
      raw.PackingUnitLengthMeter ??
      1.2
  );

  const width = Number(
    raw.widthMeter ??
      raw.WidthMeter ??
      raw.width ??
      raw.Width ??
      raw.packingUnitWidthMeter ??
      raw.PackingUnitWidthMeter ??
      0.8
  );

  const height = Number(
    raw.heightMeter ??
      raw.HeightMeter ??
      raw.height ??
      raw.Height ??
      raw.packingUnitHeightMeter ??
      raw.PackingUnitHeightMeter ??
      1.6
  );

  const name = String(
    raw.name ??
      raw.Name ??
      raw.transportOrderNo ??
      raw.TransportOrderNo ??
      raw.code ??
      raw.Code ??
      raw.orderNumber ??
      raw.OrderNumber ??
      raw.description ??
      raw.Description ??
      `Cargo ${id}`
  );

  const rawType = String(
    raw.packingType ?? raw.PackingType ?? raw.type ?? raw.Type ?? raw.packageType ?? raw.PackageType ?? "pallet"
  ).toLowerCase();

  const packingType = resolvePackingType(rawType);

  const weightKg = Number(
    raw.weightKg ?? raw.WeightKg ?? raw.weight ?? raw.Weight ?? raw.grossWeight ?? raw.GrossWeight ?? DEFAULT_WEIGHT_KG
  );

  const packingUnit: PackingUnitData = {
    id,
    name,
    lengthMeter: length > 0 ? length : DEFAULT_LENGTH_METER,
    widthMeter: width > 0 ? width : DEFAULT_WIDTH_METER,
    heightMeter: height > 0 ? height : DEFAULT_HEIGHT_METER,
    packingType,
    weightKg: isNaN(weightKg) ? DEFAULT_WEIGHT_KG : weightKg,
  };

  return {
    id,
    name,
    packingUnit,
  };
};

/**
 * Load a single Mendix object by GUID using mx.data.get.
 * Falls back to JSON parsing in dev mode.
 */
export const loadMendixObject = async (guid: string): Promise<unknown> => {
  const mxData = getMx();
  if (mxData) {
    return new Promise((resolve, reject) => {
      if (!guid) {
        resolve(null);
        return;
      }
      mxData.get({
        guid,
        callback: (obj: unknown) => resolve(obj),
        error: (err: Error) => reject(err),
      });
    });
  }
  // Dev fallback: assume the guid is actually a JSON string or mock
  try {
    return JSON.parse(guid);
  } catch {
    return { id: guid, guid };
  }
};

/**
 * Load multiple Mendix objects in batch by GUIDs using mx.data.get({ guids }).
 */
export const loadMendixObjects = async (guids: string[]): Promise<unknown[]> => {
  if (!guids || guids.length === 0) {
    return [];
  }
  const mxData = getMx();
  if (mxData) {
    return new Promise((resolve, reject) => {
      mxData.get({
        guids,
        callback: (objs: unknown) => {
          const list = Array.isArray(objs) ? objs : objs ? [objs] : [];
          resolve(list);
        },
        error: (err: Error) => reject(err),
      });
    });
  }
  // Dev fallback
  return guids
    .map((g) => {
      try {
        return JSON.parse(g);
      } catch {
        return { id: g, guid: g };
      }
    })
    .filter(Boolean);
};

/**
 * Load a list of Mendix objects via XPath using mx.data.get({ xpath }).
 * Falls back to JSON parsing in dev mode.
 */
export const loadMendixList = async (xpath: string): Promise<unknown[]> => {
  const mxData = getMx();
  if (mxData) {
    return new Promise((resolve, reject) => {
      mxData.get({
        xpath,
        callback: (items: unknown) => {
          const list = Array.isArray(items) ? items : items ? [items] : [];
          resolve(list);
        },
        error: (err: Error) => reject(err),
      });
    });
  }
  // Dev fallback: assume xpath is actually a JSON string
  try {
    const parsed = JSON.parse(xpath);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Execute a Mendix microflow action.
 * Falls back to a no-op in dev mode.
 */
export const executeMendixAction = async (actionId: string, params: Record<string, unknown> = {}): Promise<unknown> => {
  const mxData = getMx();
  if (mxData) {
    return new Promise((resolve, reject) => {
      mxData.action({
        params: { actionId, ...params },
        callback: (result: unknown) => resolve(result),
        error: (err: Error) => reject(err),
      });
    });
  }
  return null;
};

export interface LoadedTruckResult {
  truck: TruckItem | null;
  scale: { widthScale: number; heightScale: number };
  truckGuid: string | null;
}

/**
 * Load TruckSelection once, calculate scale, and convert to TruckItem.
 */
export const loadTruckAndScale = async (truckRef: string | undefined): Promise<LoadedTruckResult> => {
  if (!truckRef) {
    return { truck: null, scale: { widthScale: 1, heightScale: 1 }, truckGuid: null };
  }

  try {
    const rawObj = await loadMendixObject(truckRef);
    const truckData = extractTruckData(rawObj, truckRef);
    if (!truckData) {
      return { truck: null, scale: { widthScale: 1, heightScale: 1 }, truckGuid: null };
    }
    const scale = computeScale(truckData);
    const truck = truckSelectionToTruckItem(truckData, scale);
    return { truck, scale, truckGuid: truckData.id };
  } catch (err) {
    console.error("Failed to load TruckSelection:", err);
    return { truck: null, scale: { widthScale: 1, heightScale: 1 }, truckGuid: null };
  }
};

/**
 * Load the TruckSelection object and convert it to a TruckItem view model.
 */
export const loadTruckItem = async (
  truckRef: string | undefined,
  scale: { widthScale: number; heightScale: number }
): Promise<TruckItem | null> => {
  if (!truckRef) {
    return null;
  }

  try {
    const rawObj = await loadMendixObject(truckRef);
    const truckData = extractTruckData(rawObj, truckRef);
    if (!truckData) {
      return null;
    }
    return truckSelectionToTruckItem(truckData, scale);
  } catch (err) {
    console.error("Failed to load TruckSelection:", err);
    return null;
  }
};

/**
 * Load TransportOrder objects and convert them to CargoItem view models.
 */
export const loadCargoItems = async (
  ordersGuids: string[],
  scale: { widthScale: number; heightScale: number }
): Promise<CargoItem[]> => {
  if (!ordersGuids || ordersGuids.length === 0) {
    return [];
  }

  try {
    const rawObjs = await loadMendixObjects(ordersGuids);

    // Batch results are keyed by each object's OWN GUID; mx.data.get({guids}) makes
    // no ordering/count guarantee across runtime versions, so consuming another
    // array positionally would risk assigning PackingUnits to the wrong TransportOrder.
    const unitsByOrderGuid = new Map<string, string[]>();
    let missingUnits = 0;
    for (const raw of rawObjs) {
      const orderGuid = getObjectGuid(raw);
      if (!orderGuid) {
        missingUnits += 1;
        continue;
      }
      const unitGuids = getReferenceGuids(raw, TRANSPORT_ORDER_PACKING_UNIT_ASSOCIATIONS);
      if (unitGuids.length === 0) {
        missingUnits += 1;
      }
      unitsByOrderGuid.set(orderGuid, unitGuids);
    }
    if (missingUnits > 0 && isMendixRuntime()) {
      console.warn(
        `loadCargoItems: ${missingUnits}/${rawObjs.length} TransportOrders have no PackingUnit linked (tried: ${TRANSPORT_ORDER_PACKING_UNIT_ASSOCIATIONS.join(", ")})`
      );
    }

    const unitPlainByGuid = new Map<string, Record<string, unknown>>();
    const unitTypeGuidByUnit = new Map<string, string>();
    const allUnitGuids = [...new Set([...unitsByOrderGuid.values()].flat())];
    if (allUnitGuids.length > 0) {
      const unitObjects = await loadMendixObjects(allUnitGuids);
      for (const unitObj of unitObjects) {
        const unitGuid = getObjectGuid(unitObj);
        if (!unitGuid) {
          continue;
        }
        unitPlainByGuid.set(unitGuid, toPlainObject(unitObj));
        const typeGuid = getReferenceGuids(unitObj, PACKING_UNIT_PACKING_TYPE_ASSOCIATIONS)[0];
        if (typeGuid) {
          unitTypeGuidByUnit.set(unitGuid, typeGuid);
        }
      }
    }

    const typeValueByGuid = new Map<string, string>();
    const allTypeGuids = [...new Set(unitTypeGuidByUnit.values())];
    if (allTypeGuids.length > 0) {
      const typeObjects = await loadMendixObjects(allTypeGuids);
      for (const typeObj of typeObjects) {
        const typeGuid = getObjectGuid(typeObj);
        if (!typeGuid) {
          continue;
        }
        const enumValue = toPlainObject(typeObj).E_PackingType;
        if (enumValue !== undefined && enumValue !== null) {
          typeValueByGuid.set(typeGuid, String(enumValue));
        }
      }
    }

    const ordersData: TransportOrderData[] = rawObjs
      .map((raw) => {
        // Keyed by own GUID; extractTransportOrderData also self-resolves id/guid
        // attributes, so no cross-array positional lookup is involved anywhere.
        const orderGuid = getObjectGuid(raw);
        const order = extractTransportOrderData(raw, orderGuid);
        if (!order) {
          return null;
        }
        const unitGuid = (orderGuid ? unitsByOrderGuid.get(orderGuid) : undefined)?.[0];
        const unitPlain = unitGuid ? (unitPlainByGuid.get(unitGuid) ?? null) : null;
        const typeGuid = unitGuid ? unitTypeGuidByUnit.get(unitGuid) : undefined;
        const packingTypeValue = typeGuid ? (typeValueByGuid.get(typeGuid) ?? null) : null;
        return applyPackingUnitData(order, unitPlain, packingTypeValue);
      })
      .filter((d): d is TransportOrderData => d !== null);

    return transportOrdersToCargoItems(ordersData, scale);
  } catch (err) {
    console.error("Failed to load TransportOrders:", err);
    return [];
  }
};

const findPackingPlan = async (truckGuid: string): Promise<unknown[]> => {
  const plans = await loadMendixList("//TCSLoadingMeter.PackingPlan");
  return filterByAssociationGuid(plans, PACKING_PLAN_TRUCK_ASSOCIATIONS, truckGuid);
};

const findPackingPlanItems = async (planGuid: string): Promise<unknown[]> => {
  const items = await loadMendixList("//TCSLoadingMeter.PackingPlanItem");
  return filterByAssociationGuid(items, PACKING_PLAN_ITEM_ASSOCIATIONS, planGuid);
};

/**
 * Load a saved PackingPlan for the given TruckSelection.
 */
export const loadPackingPlan = async (
  truckGuid: string | null,
  scale: { widthScale: number; heightScale: number }
): Promise<CargoItem[]> => {
  if (!truckGuid) {
    return [];
  }

  try {
    const plans = await findPackingPlan(truckGuid);

    if (plans.length === 0) {
      return [];
    }

    const planPlain = toPlainObject(plans[0]);
    const planGuid = (planPlain.id ?? planPlain.guid) as string;
    if (!planGuid) {
      return [];
    }

    const planItems = await findPackingPlanItems(planGuid);

    const planData: PackingPlanData = {
      truckId: truckGuid,
      items: planItems.map((item) => {
        const raw = toPlainObject(item);
        // Association not in getAttributes(); read by mxObject.get()
        let transportOrderId: string | null = null;
        if (isMxObject(item)) {
          try {
            transportOrderId =
              getObjectGuid(item.get("TCSLoadingMeter.PackingPlanItem_TransportOrder")) ??
              getObjectGuid(item.get("PackingPlanItem_TransportOrder")) ??
              null;
          } catch {
            transportOrderId = null;
          }
        }
        // Plain-object fixtures may carry the association as a field.
        if (!transportOrderId && raw.TransportOrder != null) {
          transportOrderId = String(raw.TransportOrder);
        }
        if (!transportOrderId && raw.transportOrder != null) {
          transportOrderId = String(raw.transportOrder);
        }
        const rawItemId = String(raw.id ?? raw.guid ?? "item");
        if (!transportOrderId && isMendixRuntime()) {
          // Without the association the item key would be a PackingPlanItem GUID,
          // which silently mismatches TransportOrder-keyed cargo lists.
          console.warn(
            `loadPackingPlan: PackingPlanItem ${rawItemId} has no readable TransportOrder association (tried TCSLoadingMeter.PackingPlanItem_TransportOrder); falling back to "${rawItemId}"`
          );
        }
        const resolvedOrderId = transportOrderId ?? rawItemId;
        const itemId = toCargoId(resolvedOrderId);
        // PackingPlanItem has no Name/Type attributes (docs/PACKING_PLAN_ENTITY.md); type derives from Color.
        const colorValue =
          raw.Color !== undefined || raw.color !== undefined ? String(raw.Color ?? raw.color) : undefined;
        const itemType = packingTypeFromColor(colorValue);
        return {
          id: itemId,
          name: String(raw.Name ?? raw.name ?? `Cargo ${itemId}`),
          type: itemType,
          x: Number(raw.PositionX ?? raw.positionX ?? raw.x ?? 0),
          y: Number(raw.PositionY ?? raw.positionY ?? raw.y ?? 0),
          length: Number(raw.Length ?? raw.length ?? DEFAULT_LENGTH_METER),
          width: Number(raw.Width ?? raw.width ?? DEFAULT_WIDTH_METER),
          rotation: Number(raw.Rotation ?? raw.rotation ?? 0) as 0 | 90 | 180 | 270,
          color: colorValue ?? (itemType === "box" ? "blue" : "orange"),
          lengthM:
            raw.LengthMeters !== undefined || raw.lengthMeters !== undefined || raw.lengthM !== undefined
              ? Number(raw.LengthMeters ?? raw.lengthMeters ?? raw.lengthM)
              : undefined,
          widthM:
            raw.WidthMeters !== undefined || raw.widthMeters !== undefined || raw.widthM !== undefined
              ? Number(raw.WidthMeters ?? raw.widthMeters ?? raw.widthM)
              : undefined,
          weightKg:
            raw.WeightKg !== undefined || raw.weightKg !== undefined ? Number(raw.WeightKg ?? raw.weightKg) : undefined,
        };
      }),
    };

    return deserializePlan(planData, scale);
  } catch (err) {
    console.error("Failed to load PackingPlan:", err);
    return [];
  }
};

/**
 * Save the current canvas state as a PackingPlan.
 */
export const savePackingPlan = async (
  truckGuid: string | null,
  state: Pick<CanvasState, "truck" | "cargos">,
  scale: { widthScale: number; heightScale: number },
  onSaveMicroflow?: () => void
): Promise<PackingPlanData> => {
  const plan = serializePlan(state, scale);

  if (!isMendixRuntime()) {
    onSaveMicroflow?.();
    return plan;
  }

  try {
    const plans = truckGuid ? await findPackingPlan(truckGuid) : [];

    let planGuid: string | null = null;
    const mxData = getMx()!;

    if (plans.length > 0) {
      const planPlain = toPlainObject(plans[0]);
      planGuid = (planPlain.id ?? planPlain.guid) as string;

      const existingItems = await findPackingPlanItems(planGuid);
      const itemGuids = existingItems
        .map((item) => {
          const p = toPlainObject(item);
          return (p.id ?? p.guid) as string;
        })
        .filter(Boolean);

      if (itemGuids.length > 0) {
        await new Promise<void>((resolve, reject) => {
          mxData.remove({
            guids: itemGuids,
            callback: () => resolve(),
            error: (err: Error) => reject(err),
          });
        });
      }
    } else {
      const newPlanObj = await new Promise<unknown>((resolve, reject) => {
        mxData.create({
          entity: "TCSLoadingMeter.PackingPlan",
          callback: (obj: unknown) => {
            try {
              if (truckGuid) {
                try {
                  setMxAttribute(obj, "TCSLoadingMeter.PackingPlan_TruckSelection", truckGuid, "PackingPlan");
                } catch (firstError) {
                  try {
                    setMxAttribute(obj, "PackingPlan_TruckSelection", truckGuid, "PackingPlan");
                  } catch (secondError) {
                    throw new Error("PackingPlan: unable to set TruckSelection association", {
                      cause: secondError,
                    });
                  }
                  console.warn("PackingPlan: used association fallback", firstError);
                }
              }
              resolve(obj);
            } catch (error) {
              reject(error);
            }
          },
          error: (err: Error) => reject(err),
        });
      });
      const planPlain = toPlainObject(newPlanObj);
      planGuid = (planPlain.id ?? planPlain.guid) as string;
    }

    const createdItems: unknown[] = [];
    for (const item of plan.items) {
      await new Promise<void>((resolve, reject) => {
        mxData.create({
          entity: "TCSLoadingMeter.PackingPlanItem",
          callback: (itemObj: unknown) => {
            try {
              const orderId = fromCargoId(item.id);
              setMxAttribute(
                itemObj,
                "TCSLoadingMeter.PackingPlanItem_PackingPlan",
                planGuid,
                `PackingPlanItem ${item.id}`
              );

              // Set TransportOrder association following the same pattern as PackingPlanItem_PackingPlan
              // Use module-prefixed Domain Model name: TCSLoadingMeter.PackingPlanItem_TransportOrder
              setMxAttribute(
                itemObj,
                "TCSLoadingMeter.PackingPlanItem_TransportOrder",
                orderId,
                `PackingPlanItem ${item.id}`
              );
              setMxDecimalAttribute(itemObj, "PositionX", item.x, `PackingPlanItem ${item.id}`);
              setMxDecimalAttribute(itemObj, "PositionY", item.y, `PackingPlanItem ${item.id}`);
              setMxDecimalAttribute(itemObj, "Length", item.length, `PackingPlanItem ${item.id}`);
              setMxDecimalAttribute(itemObj, "Width", item.width, `PackingPlanItem ${item.id}`);
              // Height is a required column; the 2D canvas has no Z value so store 0.
              setMxDecimalAttribute(itemObj, "Height", 0, `PackingPlanItem ${item.id}`);
              setMxAttribute(itemObj, "Rotation", item.rotation, `PackingPlanItem ${item.id}`);
              setMxAttribute(itemObj, "Color", item.color, `PackingPlanItem ${item.id}`);
              setMxDecimalAttribute(itemObj, "LengthMeters", item.lengthM ?? 0, `PackingPlanItem ${item.id}`);
              setMxDecimalAttribute(itemObj, "WidthMeters", item.widthM ?? 0, `PackingPlanItem ${item.id}`);
              setMxDecimalAttribute(itemObj, "WeightKg", item.weightKg ?? 0, `PackingPlanItem ${item.id}`);
              createdItems.push(itemObj);
              resolve();
            } catch (error) {
              reject(error);
            }
          },
          error: (err: Error) => reject(err),
        });
      });
    }

    if (createdItems.length > 0) {
      await new Promise<void>((resolve, reject) => {
        mxData.commit({
          mxobjs: createdItems,
          callback: () => resolve(),
          error: (err: Error) => reject(err),
        });
      });
    }
  } catch (err) {
    console.error("Failed to save PackingPlan:", err);
    throw err;
  }

  onSaveMicroflow?.();

  return plan;
};
