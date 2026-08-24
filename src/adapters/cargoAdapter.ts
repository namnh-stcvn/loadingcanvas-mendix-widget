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

const readPositiveNumber = (plain: Record<string, unknown>, keys: string[]): number | undefined => {
  for (const key of keys) {
    const value = plain[key];
    if (value === undefined || value === null) {
      continue;
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
};

const readNonEmptyString = (plain: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = plain[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return undefined;
};

export const resolvePackingType = (value: unknown): "pallet" | "box" => {
  return String(value ?? "")
    .toLowerCase()
    .includes("box")
    ? "box"
    : "pallet";
};

export const packingTypeFromColor = (color: string | undefined): "pallet" | "box" => {
  return typeof color === "string" && color.toLowerCase().includes("blue") ? "box" : "pallet";
};

// Merges the associated PackingUnit values (Name/Length/Width/Height/packing type) into the
// TransportOrder data. The CargoItem id stays based on the TransportOrder GUID so the save
// flow can restore the TransportOrder association correctly.
export const applyPackingUnitData = (
  order: TransportOrderData,
  unitPlain: Record<string, unknown> | null,
  packingTypeValue?: string | null
): TransportOrderData => {
  if (!unitPlain) {
    return order;
  }

  const current = order.packingUnit;
  const unitName = readNonEmptyString(unitPlain, ["Name", "name"]);

  return {
    ...order,
    name: unitName ?? order.name,
    packingUnit: {
      id: current?.id ?? order.id,
      name: unitName ?? current?.name,
      lengthMeter: readPositiveNumber(unitPlain, ["Length", "length"]) ?? current?.lengthMeter ?? 1.2,
      widthMeter: readPositiveNumber(unitPlain, ["Width", "width"]) ?? current?.widthMeter ?? 0.8,
      heightMeter: readPositiveNumber(unitPlain, ["Height", "height"]) ?? current?.heightMeter ?? 1.6,
      packingType: resolvePackingType(packingTypeValue),
      weightKg:
        readPositiveNumber(unitPlain, ["WeightKg", "weightKg", "GrossWeight", "grossWeight"]) ?? current?.weightKg,
    },
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
