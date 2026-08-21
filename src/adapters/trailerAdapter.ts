import type { TrailerItem } from "../viewModels/TrailerItem";
import type { Trailer } from "../models/Trailer";
import { meterToPixel } from "../domain/coordinateRules";

/**
 * Shape of TruckSelection data as it arrives from Mendix.
 * TruckSelection → ResourceInstance → Resource → TechnicalDetails
 */
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

/**
 * Convert a TruckSelection (meters) to a TrailerItem (pixels) using the given scale.
 *
 * @param truck - The TruckSelection data from Mendix
 * @param scale - Pixel-to-meter scale factor
 * @param position - Initial canvas position (pixels)
 * @returns A TrailerItem view model ready for the canvas
 */
export const truckSelectionToTrailerItem = (
  truck: TruckSelectionData,
  scale: number,
  position: { x: number; y: number } = { x: 20, y: 20 }
): TrailerItem => {
  return {
    id: truck.id,
    code: truck.code ?? "TRAILER",
    trailerType: truck.trailerType ?? "DryVan",
    maxPayloadKg: truck.maxPayloadKg ?? 0,
    axleCount: truck.axleCount ?? 2,
    maxLoadMeters: truck.maxLoadMeters ?? truck.internalLengthMeter,
    internalHeightMeter: truck.internalHeightMeter,
    x: position.x,
    y: position.y,
    width: meterToPixel(truck.internalLengthMeter, scale),
    height: meterToPixel(truck.internalWidthMeter, scale),
    rotation: 0,
  };
};

/**
 * Convert a Trailer business model (meters) to a TrailerItem (pixels) using the given scale.
 *
 * @param trailer - The Trailer business model
 * @param scale - Pixel-to-meter scale factor
 * @param position - Initial canvas position (pixels)
 * @returns A TrailerItem view model ready for the canvas
 */
export const trailerToTrailerItem = (
  trailer: Trailer,
  scale: number,
  position: { x: number; y: number } = { x: 333, y: 152 }
): TrailerItem => {
  return {
    id: trailer.id,
    code: trailer.code,
    trailerType: trailer.trailerType,
    maxPayloadKg: trailer.maxPayloadKg,
    axleCount: trailer.axleCount,
    maxLoadMeters: trailer.maxLoadMeters ?? trailer.internalLengthMeter,
    internalHeightMeter: trailer.internalHeightMeter,
    x: position.x,
    y: position.y,
    width: meterToPixel(trailer.internalLengthMeter, scale),
    height: meterToPixel(trailer.internalWidthMeter, scale),
    rotation: 0,
  };
};

/**
 * Compute the optimal scale factor so that the trailer fits within the canvas.
 *
 * @param truck - The TruckSelection data
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @param padding - Padding around the trailer (pixels)
 * @returns Scale factor (pixels per meter)
 */
export const computeScale = (
  truck: TruckSelectionData,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 40
): number => {
  const lengthM = truck.internalLengthMeter > 0 ? truck.internalLengthMeter : 13.6;
  const widthM = truck.internalWidthMeter > 0 ? truck.internalWidthMeter : 2.45;
  const availableWidth = Math.max(canvasWidth - padding, 100);
  const availableHeight = Math.max(canvasHeight - padding, 100);
  return Math.min(availableWidth / lengthM, availableHeight / widthM);
};
