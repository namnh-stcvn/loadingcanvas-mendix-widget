import type { TruckItem } from "../viewModels/TruckItem";
import type { Truck } from "../models/Truck";
import { meterToPixel } from "../domain/coordinateRules";
import { TRUCK_CANVAS_HEIGHT, TRUCK_CANVAS_LEFT, TRUCK_CANVAS_TOP, TRUCK_CANVAS_WIDTH } from "../constants/canvas";

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

export interface ScalePair {
  widthScale: number;
  heightScale: number;
}

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
    width: Math.min(TRUCK_CANVAS_HEIGHT, meterToPixel(truck.internalWidthMeter, scale.heightScale)),
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
    width: Math.min(TRUCK_CANVAS_HEIGHT, meterToPixel(truck.internalWidthMeter, scale.heightScale)),
    rotation: 0,
  };
};

export const computeScale = (truck: TruckSelectionData, padding: number = 0): ScalePair => {
  const lengthM = truck.internalLengthMeter > 0 ? truck.internalLengthMeter : 13.6;
  const widthM = truck.internalWidthMeter > 0 ? truck.internalWidthMeter : 2.45;
  const widthScale = Math.max(TRUCK_CANVAS_WIDTH - padding, 100) / lengthM;
  const heightScale = Math.max(TRUCK_CANVAS_HEIGHT - padding, 100) / widthM;
  return { widthScale, heightScale };
};
