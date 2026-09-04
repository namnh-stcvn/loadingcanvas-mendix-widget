import type { RectLike, Rotation } from "../types/geometry";
import type { CargoItem } from "../viewModels/CargoItem";
import { overlaps, isInsideBounds } from "./geometryRules";
import { DEFAULT_AXIS_SCALE, getRotatedScreenSize, type AxisScale } from "./rotationRules";

export type ValidationError = "OVERLAP" | "OUT_OF_BOUNDS" | "LM_EXCEEDED";

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  itemErrors?: Record<string, ValidationError[]>; // Per-item error mapping for UI highlighting
}

// Validate a single item against bounds and other items
export const validateItem = (
  item: RectLike & Partial<{ rotation: Rotation }>,
  bounds: RectLike,
  allItems: Array<RectLike & Partial<{ rotation: Rotation }>>,
  excludeIndex: number = -1,
  scale: AxisScale = DEFAULT_AXIS_SCALE
): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!isInsideBounds(item, bounds, scale)) {
    errors.push("OUT_OF_BOUNDS");
  }

  // Check overlaps, skipping the item at excludeIndex
  const hasOverlap = allItems.some((other, idx) => idx !== excludeIndex && overlaps(item, other, scale));

  if (hasOverlap) {
    errors.push("OVERLAP");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// Validate total load meters (LM) against truck's max load meters
export const validateLoadMeters = (
  items: CargoItem[],
  maxLoadMeters: number,
  scale: { widthScale: number; heightScale: number }
): ValidationResult => {
  // Load meters measure the truck length each item occupies along the X axis, so a
  // 90°/270° rotated item contributes its rotated (width) extent, not its raw pixel
  // length. getRotatedScreenSize projects the footprint through the axis scales.
  const totalLengthMeters = items.reduce(
    (sum, item) =>
      sum +
      getRotatedScreenSize({ length: item.length, width: item.width }, item.rotation, scale).length / scale.widthScale,
    0
  );

  if (totalLengthMeters > maxLoadMeters) {
    return {
      valid: false,
      errors: ["LM_EXCEEDED"],
    };
  }

  return {
    valid: true,
    errors: [],
  };
};

// Validate all items against bounds, each other, and LM
export const validateAll = (
  items: CargoItem[],
  bounds: RectLike,
  options?: {
    maxLoadMeters?: number;
    scale?: { widthScale: number; heightScale: number };
  }
): ValidationResult => {
  const allErrors: ValidationError[] = [];
  const itemErrors: Record<string, ValidationError[]> = {};

  // 1. Validate each item against bounds and overlaps
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const result = validateItem(item, bounds, items, i, options?.scale ?? DEFAULT_AXIS_SCALE);
    if (!result.valid) {
      allErrors.push(...result.errors);
      itemErrors[item.id] = result.errors;
    }
  }

  // 2. Validate load meters
  if (options?.maxLoadMeters && options?.scale) {
    const lmResult = validateLoadMeters(items, options.maxLoadMeters, options.scale);
    if (!lmResult.valid) {
      allErrors.push(...lmResult.errors);
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    itemErrors,
  };
};
