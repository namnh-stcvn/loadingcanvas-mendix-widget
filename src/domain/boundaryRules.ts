import type { RectLike } from "../types/geometry";
import { TRUCK_CANVAS_LEFT, TRUCK_CANVAS_TOP, TRUCK_CANVAS_WIDTH, TRUCK_CANVAS_HEIGHT } from "../constants/canvas";
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(value, max));
};

// Single authority for interaction bounds. Truck bounds intentionally mirror
// DragEngine's collision band so validation and collision share identical limits.
export const getCanvasBounds = (canvasWidth: number, canvasHeight: number): RectLike => ({
  x: 0,
  y: 0,
  length: canvasWidth,
  width: canvasHeight,
});

export const getTruckBounds = (): RectLike => ({
  x: TRUCK_CANVAS_LEFT,
  y: TRUCK_CANVAS_TOP,
  length: TRUCK_CANVAS_WIDTH,
  width: TRUCK_CANVAS_HEIGHT,
});
