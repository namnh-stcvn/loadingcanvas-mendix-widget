import type { CargoItem } from "../viewModels/CargoItem";
import { isMendixRuntime, getObjectGuid } from "./mendixRuntime";
import { getReferenceGuids } from "./mendixAssociations";
import { loadMendixObjects } from "./mendixLoaders";
import { toPlainObject, extractTransportOrderData } from "./mendixMappers";
import { applyPackingUnitData, transportOrdersToCargoItems, type TransportOrderData } from "./cargoAdapter";
import { buildTransportOrderMeta } from "./transportOrderMeta";
import {
  PACKING_TYPE_ENUM_ATTRIBUTE,
  PACKING_UNIT_PACKING_TYPE_ASSOCIATIONS,
  TRANSPORT_ORDER_PACKING_UNIT_ASSOCIATIONS,
} from "./mendixSchema";

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
        const enumValue = toPlainObject(typeObj)[PACKING_TYPE_ENUM_ATTRIBUTE];
        if (enumValue !== undefined && enumValue !== null) {
          typeValueByGuid.set(typeGuid, String(enumValue));
        }
      }
    }

    // Load TransportOrderNo + Product/Company names metadata for tooltip and popup
    const metaByOrderGuid = await buildTransportOrderMeta(rawObjs);

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
        const meta = orderGuid ? metaByOrderGuid.get(orderGuid) : undefined;
        return applyPackingUnitData(order, unitPlain, packingTypeValue, meta);
      })
      .filter((d): d is TransportOrderData => d !== null);

    return transportOrdersToCargoItems(ordersData, scale);
  } catch (err) {
    console.error("Failed to load TransportOrders:", err);
    return [];
  }
};
