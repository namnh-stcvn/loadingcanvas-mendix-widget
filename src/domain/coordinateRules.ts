import type { Point } from "../types/geometry";

/**
 * Convert browser coordinate to canvas coordinate.
 */
export const getCanvasPoint = (canvas: HTMLDivElement | null, clientX: number, clientY: number): Point => {
  if (!canvas) {
    return {
      x: 0,
      y: 0,
    };
  }

  const rect = canvas.getBoundingClientRect();

  return {
    x: clientX - rect.left,

    y: clientY - rect.top,
  };
};

export const meterToPixel = (meter: number, scale: number): number => {
  return meter * scale;
};

export const pixelToMeter = (pixel: number, scale: number): number => {
  return pixel / scale;
};
