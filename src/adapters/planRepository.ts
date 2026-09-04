import type { CargoItem } from "../viewModels/CargoItem";
import type { CanvasState } from "../state/CanvasState";
import { deserializePlan, serializePlan, type PackingPlanData } from "./stateAdapter";
import {
  getMx,
  getObjectGuid,
  isMendixRuntime,
  isMxObject,
  setMxAttribute,
  setMxDecimalAttribute,
} from "./mendixRuntime";
import { loadMendixList, loadMendixObjects } from "./mendixLoaders";
import { filterByAssociationGuid } from "./mendixAssociations";
import { toPlainObject } from "./mendixMappers";
import { buildTransportOrderMeta, type TransportOrderMeta } from "./transportOrderMeta";
import { DEFAULT_LENGTH_METER, DEFAULT_WIDTH_METER, packingTypeFromColor } from "./cargoAdapter";
import { fromCargoId, toCargoId } from "../domain/cargoIdentity";
import {
  PACKING_PLAN_ENTITY,
  PACKING_PLAN_ITEM_ASSOCIATIONS,
  PACKING_PLAN_ITEM_ATTRIBUTES,
  PACKING_PLAN_ITEM_ENTITY,
  PACKING_PLAN_ITEM_PACKING_PLAN_ASSOCIATION,
  PACKING_PLAN_ITEM_TRANSPORT_ORDER_ASSOCIATION,
  PACKING_PLAN_ITEM_TRANSPORT_ORDER_ASSOCIATION_FALLBACK,
  PACKING_PLAN_ITEM_XPATH,
  PACKING_PLAN_TRUCK_ASSOCIATIONS,
  PACKING_PLAN_TRUCK_SELECTION_ASSOCIATION,
  PACKING_PLAN_TRUCK_SELECTION_ASSOCIATION_FALLBACK,
  PACKING_PLAN_XPATH,
} from "./mendixSchema";

const findPackingPlan = async (truckGuid: string): Promise<unknown[]> => {
  const plans = await loadMendixList(PACKING_PLAN_XPATH);
  return filterByAssociationGuid(plans, PACKING_PLAN_TRUCK_ASSOCIATIONS, truckGuid);
};

const findPackingPlanItems = async (planGuid: string): Promise<unknown[]> => {
  const items = await loadMendixList(PACKING_PLAN_ITEM_XPATH);
  return filterByAssociationGuid(items, PACKING_PLAN_ITEM_ASSOCIATIONS, planGuid);
};

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

    // First pass: resolve the TransportOrder association per item so the meta
    // (TransportOrderNo / Product Name for the tooltip) can be batch-loaded.
    const resolvedItems = planItems.map((item) => {
      const raw = toPlainObject(item);
      // Association not in getAttributes(); read by mxObject.get()
      let transportOrderId: string | null = null;
      if (isMxObject(item)) {
        try {
          transportOrderId =
            getObjectGuid(item.get(PACKING_PLAN_ITEM_TRANSPORT_ORDER_ASSOCIATION)) ??
            getObjectGuid(item.get(PACKING_PLAN_ITEM_TRANSPORT_ORDER_ASSOCIATION_FALLBACK)) ??
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
          `loadPackingPlan: PackingPlanItem ${rawItemId} has no readable TransportOrder association (tried ${PACKING_PLAN_ITEM_TRANSPORT_ORDER_ASSOCIATION}); falling back to "${rawItemId}"`
        );
      }
      return { raw, transportOrderId };
    });

    // Load TransportOrderNo + Product/Company names for every resolved TransportOrder.
    const metaByOrderGuid = new Map<string, TransportOrderMeta>();
    const resolvedOrderGuids = [
      ...new Set(resolvedItems.map((r) => r.transportOrderId).filter((g): g is string => !!g)),
    ];
    if (resolvedOrderGuids.length > 0) {
      try {
        const rawOrders = await loadMendixObjects(resolvedOrderGuids);
        for (const [guid, meta] of await buildTransportOrderMeta(rawOrders)) {
          metaByOrderGuid.set(guid, meta);
        }
      } catch (err) {
        // Meta only feeds the tooltip; a failed load must not break plan restore.
        console.warn("loadPackingPlan: failed to load TransportOrder meta for tooltips", err);
      }
    }

    const planData: PackingPlanData = {
      truckId: truckGuid,
      items: resolvedItems.map(({ raw, transportOrderId }) => {
        const resolvedOrderId = transportOrderId ?? String(raw.id ?? raw.guid ?? "item");
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

    const restoredItems = deserializePlan(planData, scale);

    // Attach tooltip/popup meta (TransportOrderNo / Product / Company names) to the restored items.
    return restoredItems.map((item) => {
      const meta = metaForItem(item.id, resolvedItems, metaByOrderGuid);
      return meta ? { ...item, ...meta } : item;
    });
  } catch (err) {
    console.error("Failed to load PackingPlan:", err);
    return [];
  }
};

// Maps a restored cargo item back to its TransportOrder meta via the resolved
// association GUID recorded during the first pass (item id keeps the "cargo-"
// prefix and may carry an instance suffix, so match through fromCargoId).
const metaForItem = (
  itemId: string,
  resolvedItems: { raw: Record<string, unknown>; transportOrderId: string | null }[],
  metaByOrderGuid: Map<string, TransportOrderMeta>
): TransportOrderMeta | undefined => {
  const baseId = fromCargoId(itemId);
  const match = resolvedItems.find((r) => {
    const resolvedOrderId = r.transportOrderId ?? String(r.raw.id ?? r.raw.guid ?? "item");
    return toCargoId(resolvedOrderId) === baseId || resolvedOrderId === baseId;
  });
  if (!match?.transportOrderId) {
    return undefined;
  }
  return metaByOrderGuid.get(match.transportOrderId);
};

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
          entity: PACKING_PLAN_ENTITY,
          callback: (obj: unknown) => {
            try {
              if (truckGuid) {
                try {
                  setMxAttribute(obj, PACKING_PLAN_TRUCK_SELECTION_ASSOCIATION, truckGuid, "PackingPlan");
                } catch (firstError) {
                  try {
                    setMxAttribute(obj, PACKING_PLAN_TRUCK_SELECTION_ASSOCIATION_FALLBACK, truckGuid, "PackingPlan");
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
          entity: PACKING_PLAN_ITEM_ENTITY,
          callback: (itemObj: unknown) => {
            try {
              const orderId = fromCargoId(item.id);
              setMxAttribute(
                itemObj,
                PACKING_PLAN_ITEM_PACKING_PLAN_ASSOCIATION,
                planGuid,
                `PackingPlanItem ${item.id}`
              );

              // Set TransportOrder association following the same pattern as PackingPlanItem_PackingPlan.
              // Use the module-prefixed Domain Model name.
              setMxAttribute(
                itemObj,
                PACKING_PLAN_ITEM_TRANSPORT_ORDER_ASSOCIATION,
                orderId,
                `PackingPlanItem ${item.id}`
              );
              setMxDecimalAttribute(
                itemObj,
                PACKING_PLAN_ITEM_ATTRIBUTES.positionX,
                item.x,
                `PackingPlanItem ${item.id}`
              );
              setMxDecimalAttribute(
                itemObj,
                PACKING_PLAN_ITEM_ATTRIBUTES.positionY,
                item.y,
                `PackingPlanItem ${item.id}`
              );
              setMxDecimalAttribute(
                itemObj,
                PACKING_PLAN_ITEM_ATTRIBUTES.length,
                item.length,
                `PackingPlanItem ${item.id}`
              );
              setMxDecimalAttribute(
                itemObj,
                PACKING_PLAN_ITEM_ATTRIBUTES.width,
                item.width,
                `PackingPlanItem ${item.id}`
              );
              // Height is a required column; the 2D canvas has no Z value so store 0.
              setMxDecimalAttribute(itemObj, PACKING_PLAN_ITEM_ATTRIBUTES.height, 0, `PackingPlanItem ${item.id}`);
              setMxAttribute(
                itemObj,
                PACKING_PLAN_ITEM_ATTRIBUTES.rotation,
                item.rotation,
                `PackingPlanItem ${item.id}`
              );
              setMxAttribute(itemObj, PACKING_PLAN_ITEM_ATTRIBUTES.color, item.color, `PackingPlanItem ${item.id}`);
              setMxDecimalAttribute(
                itemObj,
                PACKING_PLAN_ITEM_ATTRIBUTES.lengthMeters,
                item.lengthM ?? 0,
                `PackingPlanItem ${item.id}`
              );
              setMxDecimalAttribute(
                itemObj,
                PACKING_PLAN_ITEM_ATTRIBUTES.widthMeters,
                item.widthM ?? 0,
                `PackingPlanItem ${item.id}`
              );
              setMxDecimalAttribute(
                itemObj,
                PACKING_PLAN_ITEM_ATTRIBUTES.weightKg,
                item.weightKg ?? 0,
                `PackingPlanItem ${item.id}`
              );
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
