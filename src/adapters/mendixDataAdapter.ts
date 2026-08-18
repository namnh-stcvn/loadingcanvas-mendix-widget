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
import type { MxData } from "../types/mx";

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
 * Extract plain JavaScript key-value pairs from either an MxObject or a plain JS object.
 */
export const toPlainObject = (obj: unknown): Record<string, unknown> => {
  if (!obj || typeof obj !== "object") {
    return {};
  }
  const anyObj = obj as Record<string, unknown>;

  // Check if it's a Mendix MxObject (has .get() method)
  if (typeof anyObj.get === "function") {
    const result: Record<string, unknown> = {};
    const guid =
      typeof anyObj.getGuid === "function"
        ? (anyObj.getGuid as () => string)()
        : typeof anyObj.getGUID === "function"
          ? (anyObj.getGUID as () => string)()
          : (anyObj.guid as string);

    if (guid) {
      result.id = guid;
      result.guid = guid;
    }

    if (typeof anyObj.getAttributes === "function") {
      const attrs = (anyObj.getAttributes as () => string[])();
      for (const attr of attrs) {
        let val = (anyObj.get as (attr: string) => unknown)(attr);
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
  scale: number;
  truckGuid: string | null;
}

/**
 * Load TruckSelection once, calculate scale, and convert to TrailerItem.
 */
export const loadTrailerAndScale = async (
  truckRef: string | undefined,
  canvasWidth: number,
  canvasHeight: number
): Promise<LoadedTrailerResult> => {
  if (!truckRef) {
    return { trailer: null, scale: 1, truckGuid: null };
  }

  try {
    const rawObj = await loadMendixObject(truckRef);
    const truckData = extractTruckData(rawObj, truckRef);
    if (!truckData) {
      return { trailer: null, scale: 1, truckGuid: null };
    }
    const scale = computeScale(truckData, canvasWidth, canvasHeight);
    const trailer = truckSelectionToTrailerItem(truckData, scale);
    return { trailer, scale, truckGuid: truckData.id };
  } catch (err) {
    console.error("Failed to load TruckSelection:", err);
    return { trailer: null, scale: 1, truckGuid: null };
  }
};

/**
 * Load the TruckSelection object and convert it to a TrailerItem view model.
 */
export const loadTrailerItem = async (truckRef: string | undefined, scale: number): Promise<TrailerItem | null> => {
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
export const loadCargoItems = async (ordersGuids: string[], scale: number): Promise<CargoItem[]> => {
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

/**
 * Find PackingPlan for a given truck GUID by attempting valid Mendix association XPath queries.
 */
const findPackingPlan = async (truckGuid: string): Promise<unknown[]> => {
  const candidateXPaths = [
    `//TCSLoadingMeter.PackingPlan[TCSLoadingMeter.PackingPlan_TruckSelection = '${truckGuid}']`,
    `//TCSLoadingMeter.PackingPlan[TCSLoadingMeter.TruckSelection = '${truckGuid}']`,
    `//TCSLoadingMeter.PackingPlan[TCSTransportModule.TruckSelection_PackingPlan = '${truckGuid}']`,
    `//TCSLoadingMeter.PackingPlan[TCSTransportModule.PackingPlan_TruckSelection = '${truckGuid}']`,
    `//TCSLoadingMeter.PackingPlan[TruckSelection = '${truckGuid}']`,
  ];

  for (const xpath of candidateXPaths) {
    try {
      const results = await loadMendixList(xpath);
      if (results && results.length > 0) {
        return results;
      }
    } catch {
      // Continue trying next candidate XPath format
    }
  }
  return [];
};

/**
 * Find PackingPlanItems for a given plan GUID by attempting valid Mendix association XPath queries.
 */
const findPackingPlanItems = async (planGuid: string): Promise<unknown[]> => {
  const candidateXPaths = [
    `//TCSLoadingMeter.PackingPlanItem[TCSLoadingMeter.PackingPlanItem_PackingPlan = '${planGuid}']`,
    `//TCSLoadingMeter.PackingPlanItem[TCSLoadingMeter.PackingPlan = '${planGuid}']`,
    `//TCSLoadingMeter.PackingPlanItem[PackingPlan = '${planGuid}']`,
  ];

  for (const xpath of candidateXPaths) {
    try {
      const results = await loadMendixList(xpath);
      if (results && results.length > 0) {
        return results;
      }
    } catch {
      // Continue trying next candidate XPath format
    }
  }
  return [];
};

/**
 * Load a saved PackingPlan for the given TruckSelection.
 */
export const loadPackingPlan = async (truckGuid: string | null, scale: number): Promise<CargoItem[]> => {
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
        return {
          id: String(raw.TransportOrder ?? raw.transportOrder ?? raw.id ?? raw.guid ?? "item"),
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
          color: String(raw.Color ?? raw.color ?? "gray"),
          heightM:
            raw.HeightMeters !== undefined || raw.heightMeters !== undefined || raw.heightM !== undefined
              ? Number(raw.HeightMeters ?? raw.heightMeters ?? raw.heightM)
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
  state: CanvasState,
  scale: number,
  onSaveMicroflow?: () => void
): Promise<PackingPlanData> => {
  const plan = serializePlan(state, scale);

  if (isMendixRuntime()) {
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
              const anyObj = obj as Record<string, unknown>;
              if (truckGuid && typeof anyObj?.set === "function") {
                const setSafe = anyObj.set as (attr: string, val: unknown) => void;
                try {
                  setSafe("TruckSelection", truckGuid);
                } catch {
                  /* ignore */
                }
                try {
                  setSafe("TCSLoadingMeter.PackingPlan_TruckSelection", truckGuid);
                } catch {
                  /* ignore */
                }
              }
              resolve(obj);
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
              const anyObj = itemObj as Record<string, unknown>;
              const orderId = item.id.startsWith("cargo-") ? item.id.replace("cargo-", "") : item.id;
              if (typeof anyObj?.set === "function") {
                const setSafe = (name: string, val: unknown) => {
                  try {
                    (anyObj.set as (attr: string, v: unknown) => void)(name, val);
                  } catch {
                    /* ignore */
                  }
                };
                setSafe("PackingPlan", planGuid);
                setSafe("TCSLoadingMeter.PackingPlanItem_PackingPlan", planGuid);
                setSafe("TransportOrder", orderId);
                setSafe("TCSLoadingMeter.PackingPlanItem_TransportOrder", orderId);
                setSafe("PositionX", item.x);
                setSafe("PositionY", item.y);
                setSafe("Width", item.width);
                setSafe("Height", item.height);
                setSafe("Rotation", item.rotation);
                setSafe("Color", item.color);
                setSafe("HeightMeters", item.heightM ?? 0);
                setSafe("WeightKg", item.weightKg ?? 0);
              }
              createdItems.push(itemObj);
              resolve();
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
    }
  }

  // Fallback: localStorage
  try {
    localStorage.setItem("loadingCanvasPlan", JSON.stringify(plan));
  } catch {
    /* ignore */
  }

  if (onSaveMicroflow) {
    onSaveMicroflow();
  }

  return plan;
};
