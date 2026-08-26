import type { Rotation, Size } from "../types/geometry";
import { ROTATION_STEP } from "../constants/canvas";

export interface AxisScale {
  widthScale: number;
  heightScale: number;
}

export const DEFAULT_AXIS_SCALE: AxisScale = { widthScale: 1, heightScale: 1 };

/**
 * Rotate clockwise 90 degrees
 */
export const rotate90 = (rotation: Rotation): Rotation => {
  return ((rotation + ROTATION_STEP) % 360) as Rotation;
};

/**
 * Check if object is visually vertical
 */
export const isVerticalRotation = (rotation: Rotation): boolean => {
  return rotation === 90 || rotation === 270;
};

// Screen footprint after rotation under possibly non-uniform axis scaling:
// a 90° turn moves each physical extent onto the other axis, so each extent
// must be projected with the scale of its new axis. With the default uniform
// scale this reduces to a plain length/width swap.
export const getRotatedScreenSize = (size: Size, rotation: Rotation, scale: AxisScale = DEFAULT_AXIS_SCALE): Size => {
  if (!isVerticalRotation(rotation)) {
    return size;
  }

  const axisRatio = scale.widthScale / scale.heightScale;

  return {
    length: size.width * axisRatio,
    width: size.length / axisRatio,
  };
};
