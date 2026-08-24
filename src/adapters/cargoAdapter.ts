import type { CargoItem } from "../viewModels/CargoItem";
import { meterToPixel } from "../domain/coordinateRules";

/**
 * Shape of a PackingUnit as it arrives from Mendix.
 * PackingUnit has: Length, Width, Height (in meters).
 */
export interface PackingUnitData {
  id: string;
  name?: string;
  lengthMeter: number;
  widthMeter: number;
  heightMeter: number;
  packingType: "pallet" | "box";
  weightKg?: number;
}

/**
 * Shape of a TransportOrder as it arrives from Mendix.
 * TransportOrder (1-*) → PackingUnit
 */
export interface TransportOrderData {
  id: string;
  name?: string;
  packingUnit?: PackingUnitData;
}

/**
 * Convert a PackingUnit (meters) to a CargoItem (pixels) using the given scale.
 *
 * @param packingUnit - The PackingUnit data from Mendix
 * @param scale - Pixel-to-meter scale factor
 * @param position - Initial canvas position (pixels)
 * @returns A CargoItem view model ready for the canvas
 */
export const packingUnitToCargoItem = (
  packingUnit: PackingUnitData,
  scale: { widthScale: number; heightScale: number },
  position: { x: number; y: number } = { x: 0, y: 0 }
): CargoItem => {
  const color = packingUnit.packingType === "pallet" ? "orange" : "blue";
  const name = packingUnit.name ?? `Cargo ${packingUnit.id}`;

  return {
    id: `cargo-${packingUnit.id}`,
    name,
    x: position.x,
    y: position.y,
    width: meterToPixel(packingUnit.lengthMeter, scale.widthScale),
    height: meterToPixel(packingUnit.widthMeter, scale.heightScale),
    rotation: 0,
    color,
    type: packingUnit.packingType,
    isLocked: false,
    heightM: packingUnit.heightMeter,
    weightKg: packingUnit.weightKg,
  };
};

/**
 * Convert a list of TransportOrders to CargoItems.
 * Each TransportOrder has one PackingUnit.
 */
export const transportOrdersToCargoItems = (
  orders: TransportOrderData[],
  scale: { widthScale: number; heightScale: number }
): CargoItem[] => {
  return orders.filter((order) => order.packingUnit).map((order) => packingUnitToCargoItem(order.packingUnit!, scale));
};

/**
 * Serialize a CargoItem back to meter-based data for persistence.
 */
export const cargoItemToPackingUnitData = (item: CargoItem, scale: number): PackingUnitData => {
  return {
    id: item.id.replace("cargo-", ""),
    name: item.name,
    lengthMeter: pixelToMeter(item.width, scale),
    widthMeter: pixelToMeter(item.height, scale),
    heightMeter: item.heightM ?? 0,
    packingType: item.type,
    weightKg: item.weightKg,
  };
};

/**
 * Helper: convert pixel to meter (inverse of meterToPixel).
 */
const pixelToMeter = (pixel: number, scale: number): number => {
  return pixel / scale;
};

/**
 * Get the visual bounding rectangle of a CargoItem, accounting for rotation.
 * For 90-degree rotation, width and height are swapped.
 */
export const getCargoItemRect = (item: CargoItem): { x: number; y: number; width: number; height: number } => {
  if (item.rotation === 90 || item.rotation === 270) {
    return { x: item.x, y: item.y, width: item.height, height: item.width };
  }
  return { x: item.x, y: item.y, width: item.width, height: item.height };
};
