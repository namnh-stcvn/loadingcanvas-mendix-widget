/**
 * Mendix Data Adapter
 *
 * Bridges the React widget to the Mendix Data API (`mx.data`).
 * In a Mendix runtime, `mx.data` is available globally. In the dev environment
 * (Vite), we fall back to JSON parsing for testing.
 *
 * This adapter handles:
 * - Loading TruckSelection → TrailerItem (via trailerAdapter)
 * - Loading TransportOrders → CargoItem[] (via cargoAdapter)
 * - Loading PackingPlan → CargoItem[] (via stateAdapter)
 * - Saving PackingPlan (delete + recreate items)
 */

import type { CargoItem } from "../viewModels/CargoItem";
import type { TrailerItem } from "../viewModels/TrailerItem";
import { deserializePlan, serializePlan, type PackingPlanData, type PackingPlanItemData } from "./stateAdapter";
import { truckSelectionToTrailerItem, type TruckSelectionData } from "./trailerAdapter";
import { transportOrdersToCargoItems, type TransportOrderData } from "./cargoAdapter";
import type { CanvasState } from "../state/CanvasState";

/**
 * Check if we're running inside a Mendix runtime.
 */
const isMendixRuntime = (): boolean => {
    return typeof window !== "undefined" && typeof (window as unknown as { mx?: unknown }).mx !== "undefined";
};

/**
 * Safely access the global `mx` object.
 */
const getMx = (): Window["mx"]["data"] | null => {
    if (!isMendixRuntime()) {
        return null;
    }
    return window.mx.data;
};

/**
 * Load a single Mendix object by GUID.
 * Falls back to JSON parsing in dev mode.
 */
export const loadMendixObject = async (guid: string): Promise<unknown> => {
    const mxData = getMx();
    if (mxData) {
        return new Promise((resolve, reject) => {
            mxData.load({
                guid,
                callback: (obj: unknown) => resolve(obj),
                error: (err: Error) => reject(err)
            });
        });
    }
    // Dev fallback: assume the guid is actually a JSON string
    try {
        return JSON.parse(guid);
    } catch {
        return null;
    }
};

/**
 * Load a list of Mendix objects via XPath.
 * Falls back to JSON parsing in dev mode.
 */
export const loadMendixList = async (xpath: string): Promise<unknown[]> => {
    const mxData = getMx();
    if (mxData) {
        return new Promise((resolve, reject) => {
            mxData.list({
                xpath,
                callback: (items: unknown[]) => resolve(items),
                error: (err: Error) => reject(err)
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
                error: (err: Error) => reject(err)
            });
        });
    }
    // Dev fallback: no-op
    return null;
};

/**
 * Load the TruckSelection object and convert it to a TrailerItem view model.
 *
 * In Mendix, the TruckSelection object reference is passed as a string GUID.
 * We resolve it via mx.data.load, then traverse the reference chain:
 *   TruckSelection → ResourceInstance → Resource → TechnicalDetails
 * to get the trailer dimensions.
 *
 * @param truckRef - TruckSelection object reference (GUID or JSON string in dev)
 * @param scale - Pixel-to-meter scale factor
 * @returns TrailerItem view model, or null if not available
 */
export const loadTrailerItem = async (truckRef: string | undefined, scale: number): Promise<TrailerItem | null> => {
    if (!truckRef) {
        return null;
    }

    try {
        const truckData = (await loadMendixObject(truckRef)) as TruckSelectionData | null;
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
 *
 * In Mendix, the TransportOrder list is passed as a string reference.
 * We resolve it via mx.data.list, then traverse:
 *   TransportOrder → PackingUnit → PackingType
 * to get cargo dimensions.
 *
 * @param ordersRef - TransportOrder list reference (GUID or JSON string in dev)
 * @param scale - Pixel-to-meter scale factor
 * @returns Array of CargoItem view models
 */
export const loadCargoItems = async (ordersGuids: string[], scale: number): Promise<CargoItem[]> => {
    if (!ordersGuids || ordersGuids.length === 0) {
        return [];
    }

    try {
        const ordersData = await Promise.all(ordersGuids.map(guid => loadMendixObject(guid)));
        return transportOrdersToCargoItems(ordersData as TransportOrderData[], scale);
    } catch (err) {
        console.error("Failed to load TransportOrders:", err);
        return [];
    }
};

/**
 * Load a saved PackingPlan for the given TruckSelection.
 *
 * The PackingPlan entity is a new entity in TCSLoadingMeter:
 *   PackingPlan (1 per TruckSelection)
 *     └─ PackingPlanItem (1-* per plan)
 *
 * @param truckGuid - The TruckSelection GUID
 * @param scale - Pixel-to-meter scale factor
 * @returns Array of CargoItem view models restored from the plan
 */
export const loadPackingPlan = async (truckGuid: string | null, scale: number): Promise<CargoItem[]> => {
    if (!truckGuid) {
        return [];
    }

    try {
        // XPath to find the PackingPlan for this truck
        const xpath = `//TCSLoadingMeter.PackingPlan[TruckSelection = '${truckGuid}']`;
        const plans = await loadMendixList(xpath);

        if (plans.length === 0) {
            return [];
        }

        // Get the first (and only) plan
        const planObj = plans[0] as { guid: string; items?: unknown[] };
        if (!planObj) {
            return [];
        }

        // Load plan items
        const itemsXPath = `//TCSLoadingMeter.PackingPlanItem[PackingPlan = '${planObj.guid}']`;
        const planItems = await loadMendixList(itemsXPath);

        // Convert to PackingPlanData and deserialize
        const planData: PackingPlanData = {
            truckId: truckGuid,
            items: planItems.map(item => {
                const raw = item as Record<string, unknown>;
                return {
                    id: raw.id as string,
                    name: raw.name as string,
                    type: (raw.type as "pallet" | "box") ?? "pallet",
                    x: Number(raw.x),
                    y: Number(raw.y),
                    width: Number(raw.width),
                    height: Number(raw.height),
                    rotation: Number(raw.rotation) as 0 | 90 | 180 | 270,
                    color: (raw.color as string) ?? "gray",
                    heightM: raw.heightM ? Number(raw.heightM) : undefined,
                    weightKg: raw.weightKg ? Number(raw.weightKg) : undefined
                } as PackingPlanItemData;
            })
        };

        return deserializePlan(planData, scale);
    } catch (err) {
        console.error("Failed to load PackingPlan:", err);
        return [];
    }
};

/**
 * Save the current canvas state as a PackingPlan.
 *
 * Per the requirements:
 * - Only 1 packing plan per truck (no versioning)
 * - On save: delete existing plan items + recreate
 *
 * @param truckGuid - The TruckSelection GUID
 * @param state - Current canvas state
 * @param scale - Pixel-to-meter scale factor
 * @param onSaveMicroflow - Optional Mendix microflow callback
 * @returns The serialized plan data
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
            // Step 1: Find existing PackingPlan for this truck
            const xpath = `//TCSLoadingMeter.PackingPlan[TruckSelection = '${truckGuid}']`;
            const plans = await loadMendixList(xpath);

            let planGuid: string | null = null;

            if (plans.length > 0) {
                // Step 2a: Plan exists — delete all existing items
                const existingPlan = plans[0] as { guid: string };
                planGuid = existingPlan.guid;

                const itemsXPath = `//TCSLoadingMeter.PackingPlanItem[PackingPlan = '${planGuid}']`;
                const existingItems = await loadMendixList(itemsXPath);

                // Delete each item
                const mxData = getMx()!;
                for (const item of existingItems) {
                    const itemObj = item as { guid: string };
                    await new Promise<void>((resolve, reject) => {
                        mxData.remove({
                            guid: itemObj.guid,
                            callback: () => resolve(),
                            error: (err: Error) => reject(err)
                        });
                    });
                }
            } else {
                // Step 2b: No plan exists — create one
                const mxData = getMx()!;
                const newPlan = await new Promise<unknown>((resolve, reject) => {
                    mxData.create({
                        params: {
                            entity: "TCSLoadingMeter.PackingPlan",
                            values: {
                                TruckSelection: truckGuid
                            }
                        },
                        callback: (obj: unknown) => resolve(obj),
                        error: (err: Error) => reject(err)
                    });
                });
                planGuid = (newPlan as { guid: string }).guid;
            }

            // Step 3: Create new plan items
            const mxData = getMx()!;
            for (const item of plan.items) {
                await new Promise<void>((resolve, reject) => {
                    mxData.create({
                        params: {
                            entity: "TCSLoadingMeter.PackingPlanItem",
                            values: {
                                PackingPlan: planGuid,
                                TransportOrder: item.id.startsWith("cargo-") ? item.id.replace("cargo-", "") : item.id,
                                PositionX: item.x,
                                PositionY: item.y,
                                Width: item.width,
                                Height: item.height,
                                Rotation: item.rotation,
                                Color: item.color,
                                HeightMeters: item.heightM ?? 0,
                                WeightKg: item.weightKg ?? 0
                            }
                        },
                        callback: () => resolve(),
                        error: (err: Error) => reject(err)
                    });
                });
            }

            // Commit the plan
            await new Promise<void>((resolve, reject) => {
                mxData.commit({
                    callback: () => resolve(),
                    error: (err: Error) => reject(err)
                });
            });
        } catch (err) {
            console.error("Failed to save PackingPlan:", err);
        }
    }

    // Dev fallback: localStorage
    localStorage.setItem("loadingCanvasPlan", JSON.stringify(plan));

    // Trigger Mendix microflow callback if provided
    if (onSaveMicroflow) {
        onSaveMicroflow();
    }

    return plan;
};
