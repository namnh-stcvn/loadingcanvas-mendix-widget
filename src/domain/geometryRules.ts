import type { Rectangle, RectLike, Rotation } from "../types/geometry";

import { DEFAULT_AXIS_SCALE, getRotatedScreenSize, type AxisScale } from "./rotationRules";

/**
 * Convert x,y,length,width (accounting for rotation)
 * to bounding rectangle (left, top, right, bottom)
 */
export const getRectangle = (
  item: RectLike & Partial<{ rotation: Rotation }>,
  scale: AxisScale = DEFAULT_AXIS_SCALE
): Rectangle => {
  const rotation = typeof item.rotation === "number" ? item.rotation : 0;
  const visual = getRotatedScreenSize({ length: item.length, width: item.width }, rotation, scale);

  return {
    left: item.x,
    top: item.y,
    right: item.x + visual.length,
    bottom: item.y + visual.width,
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
export const overlaps = (
  a: RectLike & Partial<{ rotation: Rotation }>,
  b: RectLike & Partial<{ rotation: Rotation }>,
  scale: AxisScale = DEFAULT_AXIS_SCALE
): boolean => {
  return isIntersecting(getRectangle(a, scale), getRectangle(b, scale));
};

/**
 * Check item inside bounds (account for rotation)
 */
export const isInsideBounds = (
  item: RectLike & Partial<{ rotation: Rotation }>,
  bounds: RectLike,
  scale: AxisScale = DEFAULT_AXIS_SCALE
): boolean => {
  const rect = getRectangle(item, scale);
  return (
    rect.left >= bounds.x &&
    rect.top >= bounds.y &&
    rect.right <= bounds.x + bounds.length &&
    rect.bottom <= bounds.y + bounds.width
  );
};

export const findCollisions = <T extends RectLike & Partial<{ rotation: Rotation }>>(
  target: T,
  items: T[],
  scale: AxisScale = DEFAULT_AXIS_SCALE
): T[] => {
  return items.filter((item) => {
    if (item === target) {
      return false;
    }

    return overlaps(target, item, scale);
  });
};
