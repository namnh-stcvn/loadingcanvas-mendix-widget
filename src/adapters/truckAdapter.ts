import type { TruckItem } from "../viewModels/TruckItem";
import type { Truck } from "../models/Truck";
import { meterToPixel } from "../domain/coordinateRules";
import type { AxisScale } from "../domain/rotationRules";
import { TRUCK_CANVAS_HEIGHT, TRUCK_CANVAS_LEFT, TRUCK_CANVAS_TOP, TRUCK_CANVAS_WIDTH } from "../constants/canvas";

export type ScalePair = AxisScale;

export interface TruckSelectionData {
  id: string;
  code?: string;
  truckType?: "DryVan" | "Reefer" | "Flatbed" | "Container" | "Curtainsider";
  maxPayloadKg?: number;
  axleCount?: number;
  internalLengthMeter: number;
  internalWidthMeter: number;
  internalHeightMeter: number;
  maxLoadMeters?: number;
}

// Shared fallback dimensions (meters) for trucks lacking attribute values;
// extractTruckData reuses these so every consumer sees identical defaults.
export const DEFAULT_TRUCK_LENGTH_METER = 13.6;
export const DEFAULT_TRUCK_WIDTH_METER = 2.45;
export const DEFAULT_TRUCK_HEIGHT_METER = 2.7;
export const DEFAULT_TRUCK_MAX_PAYLOAD_KG = 24000;
export const DEFAULT_TRUCK_AXLE_COUNT = 2;

export const truckSelectionToTruckItem = (
  truck: TruckSelectionData,
  scale: ScalePair,
  position: { x: number; y: number } = { x: TRUCK_CANVAS_LEFT, y: TRUCK_CANVAS_TOP }
): TruckItem => {
  return {
    id: truck.id,
    code: truck.code ?? "TRUCK",
    truckType: truck.truckType ?? "DryVan",
    maxPayloadKg: truck.maxPayloadKg ?? 0,
    axleCount: truck.axleCount ?? 2,
    maxLoadMeters: truck.maxLoadMeters ?? truck.internalLengthMeter,
    x: position.x,
    y: position.y,
    length: Math.min(TRUCK_CANVAS_WIDTH, meterToPixel(truck.internalLengthMeter, scale.widthScale)),
    // Frame covers the reserved canvas band so it lines up with drag bounds
    // and the background truck image; cargo keeps its own uniform scale.
    width: TRUCK_CANVAS_HEIGHT,
    rotation: 0,
  };
};

export const truckToTruckItem = (
  truck: Truck,
  scale: ScalePair,
  position: { x: number; y: number } = { x: TRUCK_CANVAS_LEFT, y: TRUCK_CANVAS_TOP }
): TruckItem => {
  return {
    id: truck.id,
    code: truck.code,
    truckType: truck.truckType,
    maxPayloadKg: truck.maxPayloadKg,
    axleCount: truck.axleCount,
    maxLoadMeters: truck.maxLoadMeters ?? truck.internalLengthMeter,
    x: position.x,
    y: position.y,
    length: Math.min(TRUCK_CANVAS_WIDTH, meterToPixel(truck.internalLengthMeter, scale.widthScale)),
    // Frame covers the reserved canvas band so it lines up with drag bounds
    // and the background truck image; cargo keeps its own uniform scale.
    width: TRUCK_CANVAS_HEIGHT,
    rotation: 0,
  };
};

export const computeScale = (truck: TruckSelectionData, padding: number = 0): ScalePair => {
  const lengthM = truck.internalLengthMeter > 0 ? truck.internalLengthMeter : 13.6;
  const widthM = truck.internalWidthMeter > 0 ? truck.internalWidthMeter : 2.45;
  // Single uniform scale keeps true proportions on screen: separate axis scales
  // make a 90°-rotated item change its rendered shape (rectangle -> square).
  // The binding axis is whichever would overflow the canvas first.
  const scale = Math.min(
    Math.max(TRUCK_CANVAS_WIDTH - padding, 100) / lengthM,
    Math.max(TRUCK_CANVAS_HEIGHT - padding, 100) / widthM
  );
  return { widthScale: scale, heightScale: scale };
};
