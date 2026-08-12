import type { Rectangle, RectLike, Rotation } from "../types/geometry";

import { isVerticalRotation } from "./rotationRules";

/**
 * Convert x,y,width,height
 * to bounding rectangle
 */
export const getRectangle = (item: RectLike & Partial<{ rotation: Rotation }>): Rectangle => {
  const isVertical = typeof item.rotation === "number" && isVerticalRotation(item.rotation as Rotation);
  const width = isVertical ? item.height : item.width;
  const height = isVertical ? item.width : item.height;

  return {
    left: item.x,
    top: item.y,
    right: item.x + width,
    bottom: item.y + height,
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
    rect.right <= bounds.x + bounds.width &&
    rect.bottom <= bounds.y + bounds.height
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
