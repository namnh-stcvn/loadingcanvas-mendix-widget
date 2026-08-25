import type { Rectangle, RectLike, Rotation } from "../types/geometry";

import { isVerticalRotation } from "./rotationRules";

/**
 * Convert x,y,length,width (accounting for rotation)
 * to bounding rectangle (left, top, right, bottom)
 */
export const getRectangle = (item: RectLike & Partial<{ rotation: Rotation }>): Rectangle => {
  const isVertical = typeof item.rotation === "number" && isVerticalRotation(item.rotation as Rotation);
  const length = isVertical ? item.width : item.length;
  const width = isVertical ? item.length : item.width;

  return {
    left: item.x,
    top: item.y,
    right: item.x + length,
    bottom: item.y + width,
  };
};

/**
 * Check AABB intersection
 */
export const isIntersecting = (a: Rectangle, b: Rectangle, eps: number = 1e-4): boolean => {
  return !(a.right <= b.left + eps || a.left >= b.right - eps || a.bottom <= b.top + eps || a.top >= b.bottom - eps);
};

/**
 * Check overlap between two items
 */
export const overlaps = (a: RectLike, b: RectLike): boolean => {
  return isIntersecting(getRectangle(a), getRectangle(b));
};

/**
 * Check item inside bounds (account for rotation)
 */
export const isInsideBounds = (item: RectLike & Partial<{ rotation: Rotation }>, bounds: RectLike): boolean => {
  const rect = getRectangle(item);
  return (
    rect.left >= bounds.x &&
    rect.top >= bounds.y &&
    rect.right <= bounds.x + bounds.length &&
    rect.bottom <= bounds.y + bounds.width
  );
};

export const findCollisions = <T extends RectLike>(target: T, items: T[]): T[] => {
  return items.filter((item) => {
    if (item === target) {
      return false;
    }

    return overlaps(target, item);
  });
};
