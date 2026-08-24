import type { RectLike, Rotation } from "../types/geometry";
import type { CargoItem } from "../viewModels/CargoItem";
import { overlaps, isInsideBounds } from "./geometryRules";

export type ValidationError = "OVERLAP" | "OUT_OF_BOUNDS" | "LM_EXCEEDED" | "HEIGHT_EXCEEDED";

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  itemErrors?: Record<string, ValidationError[]>; // Per-item error mapping for UI highlighting
}

// Validate a single item against bounds and other items
export const validateItem = (
  item: RectLike & Partial<{ rotation: Rotation }>,
  bounds: RectLike,
  others: Array<RectLike & Partial<{ rotation: Rotation }>>
): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!isInsideBounds(item, bounds)) {
    errors.push("OUT_OF_BOUNDS");
  }

  const hasOverlap = others.some((other) => overlaps(item, other));

  if (hasOverlap) {
    errors.push("OVERLAP");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// Validate total load meters (LM) against trailer's max load meters
export const validateLoadMeters = (
  items: CargoItem[],
  maxLoadMeters: number,
  scale: { widthScale: number; heightScale: number }
): ValidationResult => {
  const totalLengthMeters = items.reduce((sum, item) => sum + item.width / scale.widthScale, 0);

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

// Validate item heights against trailer's internal height
export const validateHeight = (items: CargoItem[], internalHeightMeter: number): ValidationResult => {
  const itemErrors: Record<string, ValidationError[]> = {};
  let hasError = false;

  for (const item of items) {
    const itemHeight = item.heightM ?? 0;
    if (itemHeight > internalHeightMeter) {
      itemErrors[item.id] = ["HEIGHT_EXCEEDED"];
      hasError = true;
    }
  }

  return {
    valid: !hasError,
    errors: hasError ? ["HEIGHT_EXCEEDED"] : [],
    itemErrors,
  };
};

// Validate all items against bounds, each other, LM, and height
export const validateAll = (
  items: CargoItem[],
  bounds: RectLike,
  options?: {
    maxLoadMeters?: number;
    internalHeightMeter?: number;
    scale?: { widthScale: number; heightScale: number };
  }
): ValidationResult => {
  const allErrors: ValidationError[] = [];
  const itemErrors: Record<string, ValidationError[]> = {};

  // 1. Validate each item against bounds and overlaps
  for (const item of items) {
    const others = items.filter((other) => other.id !== item.id);
    const result = validateItem(item, bounds, others);
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

  // 3. Validate height
  if (options?.internalHeightMeter) {
    const heightResult = validateHeight(items, options.internalHeightMeter);
    if (!heightResult.valid) {
      allErrors.push(...heightResult.errors);
      Object.assign(itemErrors, heightResult.itemErrors);
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    itemErrors,
  };
};
