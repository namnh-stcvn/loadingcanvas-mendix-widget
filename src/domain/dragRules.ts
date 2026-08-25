import type { Point, RectLike } from "../types/geometry";
import { clamp } from "./boundaryRules";
import { snapPosition } from "./snapRules";
import { GRID_SIZE } from "../constants/canvas";

export const calculateDragPosition = <T extends RectLike>(
  item: T,
  startPosition: Point,
  deltaX: number,
  deltaY: number,
  canvasWidth: number,
  canvasHeight: number,
  gridSize: number = GRID_SIZE
): T => {
  const target = snapPosition(startPosition.x + deltaX, startPosition.y + deltaY, gridSize);

  return {
    ...item,

    x: clamp(target.x, 0, canvasWidth - item.length),

    y: clamp(target.y, 0, canvasHeight - item.width),
  };
};
