import { isMendixRuntime, getObjectGuid } from "./mendixRuntime";
import { getReferenceGuids } from "./mendixAssociations";
import { loadMendixObjects } from "./mendixLoaders";
import { toPlainObject } from "./mendixMappers";
import { TRANSPORT_ORDER_PRODUCT_ASSOCIATIONS } from "./mendixSchema";

export interface TransportOrderMeta {
  transportOrderNo?: string;
  productName?: string;
}

// Builds TransportOrderNo + Product Name metadata keyed by TransportOrder GUID.
// Product references are read from already-loaded order objects; Product objects
// are batch-loaded once for every referenced GUID.
export const buildTransportOrderMeta = async (rawOrders: unknown[]): Promise<Map<string, TransportOrderMeta>> => {
  const metaByOrderGuid = new Map<string, TransportOrderMeta>();
  const productGuidsByOrderGuid = new Map<string, string[]>();
  const ordersWithoutProduct: string[] = [];

  for (const raw of rawOrders) {
    const orderGuid = getObjectGuid(raw);
    if (!orderGuid) {
      continue;
    }
    const plain = toPlainObject(raw);
    const transportOrderNo = String(plain.TransportOrderNo ?? plain.transportOrderNo ?? "").trim();
    const productGuids = getReferenceGuids(raw, TRANSPORT_ORDER_PRODUCT_ASSOCIATIONS);
    if (productGuids.length > 0) {
      productGuidsByOrderGuid.set(orderGuid, productGuids);
    } else if (isMendixRuntime()) {
      // Silent empty would hide a Domain Model association-name mismatch; surface
      // the tried candidates so the console shows exactly what was attempted.
      ordersWithoutProduct.push(orderGuid);
    }
    metaByOrderGuid.set(orderGuid, { transportOrderNo: transportOrderNo || undefined });
  }

  if (ordersWithoutProduct.length > 0 && isMendixRuntime()) {
    console.warn(
      `buildTransportOrderMeta: ${ordersWithoutProduct.length}/${rawOrders.length} TransportOrders have no readable Product reference (tried: ${TRANSPORT_ORDER_PRODUCT_ASSOCIATIONS.join(
        ", "
      )}); Product name will be missing in tooltips`
    );
  }

  const productNamesByGuid = new Map<string, string>();
  const allProductGuids = [...new Set([...productGuidsByOrderGuid.values()].flat())];
  if (allProductGuids.length > 0) {
    const productObjects = await loadMendixObjects(allProductGuids);
    for (const productObj of productObjects) {
      const productGuid = getObjectGuid(productObj);
      if (!productGuid) {
        continue;
      }
      const productPlain = toPlainObject(productObj);
      const name = String(productPlain.Name ?? productPlain.name ?? "").trim();
      if (name) {
        productNamesByGuid.set(productGuid, name);
      } else if (isMendixRuntime()) {
        console.warn(`buildTransportOrderMeta: Product ${productGuid} loaded but has no readable Name attribute`);
      }
    }
  }

  for (const [orderGuid, productGuids] of productGuidsByOrderGuid) {
    const meta = metaByOrderGuid.get(orderGuid) ?? {};
    const productName = productGuids.map((guid) => productNamesByGuid.get(guid)).find(Boolean);
    metaByOrderGuid.set(orderGuid, { ...meta, productName });
  }

  return metaByOrderGuid;
};
