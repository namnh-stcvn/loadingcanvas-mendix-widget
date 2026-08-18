import type { CargoItem } from "../viewModels/CargoItem";
import type { CanvasState } from "../state/CanvasState";
import { pixelToMeter } from "../domain/coordinateRules";

/**
 * Shape of a saved packing plan item (persisted to Mendix).
 */
export interface PackingPlanItemData {
  id: string;
  name: string;
  type: "pallet" | "box";
  x: number; // meters
  y: number; // meters
  width: number; // meters
  height: number; // meters
  rotation: number;
  color: string;
  heightM?: number;
  weightKg?: number;
}

/**
 * Shape of a saved packing plan (persisted to Mendix).
 */
export interface PackingPlanData {
  truckId: string | null;
  items: PackingPlanItemData[];
}

/**
 * Serialize the current canvas state into a packing plan for persistence.
 * Converts all pixel coordinates back to meters.
 */
export const serializePlan = (state: CanvasState, scale: number): PackingPlanData => {
  return {
    truckId: state.trailer?.id ?? null,
    items: state.cargos.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      x: pixelToMeter(item.x, scale),
      y: pixelToMeter(item.y, scale),
      width: pixelToMeter(item.width, scale),
      height: pixelToMeter(item.height, scale),
      rotation: item.rotation,
      color: item.color,
      heightM: item.heightM,
      weightKg: item.weightKg,
    })),
  };
};

/**
 * Deserialize a packing plan back into CargoItems for the canvas.
 * Converts all meter coordinates to pixels.
 */
export const deserializePlan = (plan: PackingPlanData, scale: number): CargoItem[] => {
  return plan.items.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type,
    x: item.x * scale,
    y: item.y * scale,
    width: item.width * scale,
    height: item.height * scale,
    rotation: item.rotation as 0 | 90 | 180 | 270,
    color: item.color,
    isLocked: false,
    heightM: item.heightM,
    weightKg: item.weightKg,
  }));
};
