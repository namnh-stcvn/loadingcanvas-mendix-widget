import type { Rotation, Size } from "../types/geometry";
import { ROTATION_STEP } from "../constants/canvas";

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

/**
 * Get rendered size after rotation
 */
export const getRotatedSize = (size: Size, rotation: Rotation): Size => {
    if (isVerticalRotation(rotation)) {
        return {
            width: size.height,
            height: size.width
        };
    }

    return size;
};
