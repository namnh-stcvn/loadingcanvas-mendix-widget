import type { TrailerItem } from "../viewModels/TrailerItem";
import type { Trailer } from "../models/Trailer";
import { meterToPixel } from "../domain/coordinateRules";
import {
  TRAILER_CANVAS_HEIGHT,
  TRAILER_CANVAS_LEFT,
  TRAILER_CANVAS_TOP,
  TRAILER_CANVAS_WIDTH,
} from "../constants/canvas";

export interface TruckSelectionData {
  id: string;
  code?: string;
  trailerType?: "DryVan" | "Reefer" | "Flatbed" | "Container" | "Curtainsider";
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

export const truckSelectionToTrailerItem = (
  truck: TruckSelectionData,
  scale: ScalePair,
  position: { x: number; y: number } = { x: TRAILER_CANVAS_LEFT, y: TRAILER_CANVAS_TOP }
): TrailerItem => {
  return {
    id: truck.id,
    code: truck.code ?? "TRAILER",
    trailerType: truck.trailerType ?? "DryVan",
    maxPayloadKg: truck.maxPayloadKg ?? 0,
    axleCount: truck.axleCount ?? 2,
    maxLoadMeters: truck.maxLoadMeters ?? truck.internalLengthMeter,
    x: position.x,
    y: position.y,
    length: Math.min(TRAILER_CANVAS_WIDTH, meterToPixel(truck.internalLengthMeter, scale.widthScale)),
    width: Math.min(TRAILER_CANVAS_HEIGHT, meterToPixel(truck.internalWidthMeter, scale.heightScale)),
    rotation: 0,
  };
};

export const trailerToTrailerItem = (
  trailer: Trailer,
  scale: ScalePair,
  position: { x: number; y: number } = { x: TRAILER_CANVAS_LEFT, y: TRAILER_CANVAS_TOP }
): TrailerItem => {
  return {
    id: trailer.id,
    code: trailer.code,
    trailerType: trailer.trailerType,
    maxPayloadKg: trailer.maxPayloadKg,
    axleCount: trailer.axleCount,
    maxLoadMeters: trailer.maxLoadMeters ?? trailer.internalLengthMeter,
    x: position.x,
    y: position.y,
    length: Math.min(TRAILER_CANVAS_WIDTH, meterToPixel(trailer.internalLengthMeter, scale.widthScale)),
    width: Math.min(TRAILER_CANVAS_HEIGHT, meterToPixel(trailer.internalWidthMeter, scale.heightScale)),
    rotation: 0,
  };
};

export const computeScale = (truck: TruckSelectionData, padding: number = 0): ScalePair => {
  const lengthM = truck.internalLengthMeter > 0 ? truck.internalLengthMeter : 13.6;
  const widthM = truck.internalWidthMeter > 0 ? truck.internalWidthMeter : 2.45;
  const widthScale = Math.max(TRAILER_CANVAS_WIDTH - padding, 100) / lengthM;
  const heightScale = Math.max(TRAILER_CANVAS_HEIGHT - padding, 100) / widthM;
  return { widthScale, heightScale };
};
