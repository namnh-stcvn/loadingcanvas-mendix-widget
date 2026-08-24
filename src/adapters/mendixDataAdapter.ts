/**
 * Mendix Data Adapter
 *
 * Bridges the React widget to the Mendix Data API (`mx.data`).
 * In a Mendix runtime, `mx.data` is available globally via `window.mx.data`.
 * In the dev environment (Vite), we fall back to JSON parsing for testing.
 *
 * This adapter handles:
 * - Loading TruckSelection → TrailerItem (via trailerAdapter)
 * - Loading TransportOrders → CargoItem[] (via cargoAdapter)
 * - Loading PackingPlan → CargoItem[] (via stateAdapter)
 * - Saving PackingPlan (delete + recreate items)
 */

import type { CargoItem } from "../viewModels/CargoItem";
import type { TrailerItem } from "../viewModels/TrailerItem";
import { deserializePlan, serializePlan, type PackingPlanData } from "./stateAdapter";
import { computeScale, truckSelectionToTrailerItem, type TruckSelectionData } from "./trailerAdapter";
import { transportOrdersToCargoItems, type TransportOrderData, type PackingUnitData } from "./cargoAdapter";
import type { CanvasState } from "../state/CanvasState";
import type { MxData, MxObject } from "../types/mx";
import Big from "big.js";

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
  const fallbackAttributes = ["PositionX", "PositionY", "Width", "Height", "WeightKg", "HeightMeters"];
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
  const id = String(raw.id ?? raw.guid ?? fallbackGuid ?? "trailer-1");

  const length = Number(
    raw.internalLengthMeter ??
      raw.InternalLengthMeter ??
      raw.lengthMeter ??
      raw.LengthMeter ??
      raw.length ??
      raw.Length ??
      raw.internalLength ??
      raw.InternalLength ??
      13.6
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
      2.45
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
      2.7
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
      "TRAILER"
  );

  const trailerType = (raw.trailerType ??
    raw.TrailerType ??
    raw.type ??
    raw.Type ??
    "DryVan") as TruckSelectionData["trailerType"];

  const maxPayloadKg = Number(
    raw.maxPayloadKg ??
      raw.MaxPayloadKg ??
      raw.maxPayload ??
      raw.MaxPayload ??
      raw.payloadKg ??
      raw.PayloadKg ??
      raw.payload ??
      raw.Payload ??
      24000
  );

  const axleCount = Number(raw.axleCount ?? raw.AxleCount ?? raw.axles ?? raw.Axles ?? 2);

  const rawMaxLoad = raw.maxLoadMeters ?? raw.MaxLoadMeters ?? raw.maxLoadMeter ?? raw.MaxLoadMeter;
  const maxLoadMeters =
    rawMaxLoad !== undefined && rawMaxLoad !== null ? Number(rawMaxLoad) : length > 0 ? length : 13.6;

  return {
    id,
    code,
    trailerType: trailerType || "DryVan",
    maxPayloadKg: isNaN(maxPayloadKg) ? 24000 : maxPayloadKg,
    axleCount: isNaN(axleCount) ? 2 : axleCount,
    internalLengthMeter: length > 0 ? length : 13.6,
    internalWidthMeter: width > 0 ? width : 2.45,
    internalHeightMeter: height > 0 ? height : 2.7,
    maxLoadMeters: maxLoadMeters > 0 ? maxLoadMeters : length > 0 ? length : 13.6,
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

  const packingType: "pallet" | "box" = rawType.includes("box") ? "box" : "pallet";

  const weightKg = Number(
    raw.weightKg ?? raw.WeightKg ?? raw.weight ?? raw.Weight ?? raw.grossWeight ?? raw.GrossWeight ?? 500
  );

  const packingUnit: PackingUnitData = {
    id,
    name,
    lengthMeter: length > 0 ? length : 1.2,
    widthMeter: width > 0 ? width : 0.8,
    heightMeter: height > 0 ? height : 1.6,
    packingType,
    weightKg: isNaN(weightKg) ? 500 : weightKg,
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

export interface LoadedTrailerResult {
  trailer: TrailerItem | null;
  scale: { widthScale: number; heightScale: number };
  truckGuid: string | null;
}

/**
 * Load TruckSelection once, calculate scale, and convert to TrailerItem.
 */
export const loadTrailerAndScale = async (truckRef: string | undefined): Promise<LoadedTrailerResult> => {
  if (!truckRef) {
    return { trailer: null, scale: { widthScale: 1, heightScale: 1 }, truckGuid: null };
  }

  try {
    const rawObj = await loadMendixObject(truckRef);
    const truckData = extractTruckData(rawObj, truckRef);
    if (!truckData) {
      return { trailer: null, scale: { widthScale: 1, heightScale: 1 }, truckGuid: null };
    }
    const scale = computeScale(truckData);
    const trailer = truckSelectionToTrailerItem(truckData, scale);
    return { trailer, scale, truckGuid: truckData.id };
  } catch (err) {
    console.error("Failed to load TruckSelection:", err);
    return { trailer: null, scale: { widthScale: 1, heightScale: 1 }, truckGuid: null };
  }
};

/**
 * Load the TruckSelection object and convert it to a TrailerItem view model.
 */
export const loadTrailerItem = async (
  truckRef: string | undefined,
  scale: { widthScale: number; heightScale: number }
): Promise<TrailerItem | null> => {
  if (!truckRef) {
    return null;
  }

  try {
    const rawObj = await loadMendixObject(truckRef);
    const truckData = extractTruckData(rawObj, truckRef);
    if (!truckData) {
      return null;
    }
    return truckSelectionToTrailerItem(truckData, scale);
  } catch (err) {
    console.error("Failed to load TruckSelection:", err);
    return null;
  }
};

/**
 * Load TransportOrder objects and convert them to CargoItem view models.
 */
export const loadCargoItems = async (ordersGuids: string[], scale: { widthScale: number; heightScale: number }): Promise<CargoItem[]> => {
  if (!ordersGuids || ordersGuids.length === 0) {
    return [];
  }

  try {
    const rawObjs = await loadMendixObjects(ordersGuids);
    const ordersData: TransportOrderData[] = rawObjs
      .map((raw, idx) => extractTransportOrderData(raw, ordersGuids[idx]))
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
export const loadPackingPlan = async (truckGuid: string | null, scale: { widthScale: number; heightScale: number }): Promise<CargoItem[]> => {
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
        const transportOrderId = isMxObject(item)
          ? String(
              getObjectGuid(
                item.get("TCSLoadingMeter.PackingPlanItem_TransportOrder") ??
                  item.get("PackingPlanItem_TransportOrder") ??
                  ""
              ) ??
                raw.id ??
                raw.guid ??
                "item"
            )
          : String(raw.TransportOrder ?? raw.transportOrder ?? raw.id ?? raw.guid ?? "item");
        const itemId = transportOrderId.startsWith("cargo-") ? transportOrderId : `cargo-${transportOrderId}`;
        return {
          id: itemId,
          name: String(raw.Name ?? raw.name ?? `Cargo ${raw.id ?? ""}`),
          type: (String(raw.Type ?? raw.type ?? "pallet")
            .toLowerCase()
            .includes("box")
            ? "box"
            : "pallet") as "pallet" | "box",
          x: Number(raw.PositionX ?? raw.positionX ?? raw.x ?? 0),
          y: Number(raw.PositionY ?? raw.positionY ?? raw.y ?? 0),
          width: Number(raw.Width ?? raw.width ?? 1.2),
          height: Number(raw.Height ?? raw.height ?? 0.8),
          rotation: Number(raw.Rotation ?? raw.rotation ?? 0) as 0 | 90 | 180 | 270,
          color: String(
            raw.Color ??
              raw.color ??
              (String(raw.Type ?? raw.type ?? "pallet")
                .toLowerCase()
                .includes("box")
                ? "blue"
                : "orange")
          ),
          heightM:
            raw.HeightMeters !== undefined || raw.heightMeters !== undefined || raw.heightM !== undefined
              ? Number(raw.HeightMeters ?? raw.heightMeters ?? raw.heightM)
              : undefined,
          weightKg:
            raw.WeightKg !== undefined || raw.weightKg !== undefined ? Number(raw.WeightKg ?? raw.weightKg) : undefined,
        };
      }),
    };

    return deserializePlan(planData, scale.widthScale);
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
  state: CanvasState,
  scale: { widthScale: number; heightScale: number },
  onSaveMicroflow?: () => void
): Promise<PackingPlanData> => {
  const plan = serializePlan(state, scale.widthScale);

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
              const orderId = item.id.startsWith("cargo-") ? item.id.replace("cargo-", "") : item.id;
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
              setMxDecimalAttribute(itemObj, "Width", item.width, `PackingPlanItem ${item.id}`);
              setMxDecimalAttribute(itemObj, "Height", item.height, `PackingPlanItem ${item.id}`);
              setMxAttribute(itemObj, "Rotation", item.rotation, `PackingPlanItem ${item.id}`);
              setMxAttribute(itemObj, "Type", item.type, `PackingPlanItem ${item.id}`);
              setMxAttribute(itemObj, "Color", item.color, `PackingPlanItem ${item.id}`);
              setMxDecimalAttribute(itemObj, "HeightMeters", item.heightM ?? 0, `PackingPlanItem ${item.id}`);
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
