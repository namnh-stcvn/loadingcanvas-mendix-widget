import type { RectLike, Rotation } from "../types/geometry";
import type { CargoItem } from "../viewModels/CargoItem";
import { overlaps, isInsideBounds } from "./geometryRules";
import { DEFAULT_AXIS_SCALE, type AxisScale } from "./rotationRules";

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
  others: Array<RectLike & Partial<{ rotation: Rotation }>>,
  scale: AxisScale = DEFAULT_AXIS_SCALE
): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!isInsideBounds(item, bounds, scale)) {
    errors.push("OUT_OF_BOUNDS");
  }

  const hasOverlap = others.some((other) => overlaps(item, other, scale));

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
  const totalLengthMeters = items.reduce((sum, item) => sum + item.length / scale.widthScale, 0);

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
  for (const item of items) {
    const others = items.filter((other) => other.id !== item.id);
    const result = validateItem(item, bounds, others, options?.scale ?? DEFAULT_AXIS_SCALE);
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
