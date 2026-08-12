import type { RectLike, Rotation } from "../types/geometry";
import type { CargoItem } from "../viewModels/CargoItem";
import { overlaps, isInsideBounds } from "./geometryRules";

export type ValidationError = "OVERLAP" | "OUT_OF_BOUNDS" | "LM_EXCEEDED" | "HEIGHT_EXCEEDED";

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  /** Per-item error mapping for UI highlighting */
  itemErrors?: Record<string, ValidationError[]>;
}

/**
 * Validate a single item against bounds and other items.
 * Checks for OUT_OF_BOUNDS and OVERLAP errors.
 */
export const validateItem = (
  item: RectLike & Partial<{ rotation: Rotation }>,
  bounds: RectLike,
  others: (RectLike & Partial<{ rotation: Rotation }>)[]
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

/**
 * Validate total load meters (LM) against the trailer's max load meters.
 * LM is the sum of all item lengths along the trailer's length axis.
 *
 * @param items - Cargo items on the canvas (in pixels)
 * @param maxLoadMeters - Maximum allowed load meters
 * @param scale - Pixel-to-meter scale factor
 * @returns ValidationResult with LM_EXCEEDED error if total exceeds max
 */
export const validateLoadMeters = (items: CargoItem[], maxLoadMeters: number, scale: number): ValidationResult => {
  const totalLengthMeters = items.reduce((sum, item) => sum + item.width / scale, 0);

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

/**
 * Validate item heights against the trailer's internal height.
 * Checks if any item's height (in meters) exceeds the trailer's internal height.
 *
 * @param items - Cargo items on the canvas
 * @param internalHeightMeter - Trailer's internal height in meters
 * @returns ValidationResult with HEIGHT_EXCEEDED error if any item is too tall
 */
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

/**
 * Validate all items against bounds, each other, LM, and height.
 * Combines all validation checks into a single result.
 *
 * @param items - Cargo items on the canvas
 * @param bounds - Canvas/trailer bounds (in pixels)
 * @param options - Optional validation parameters
 * @returns Combined ValidationResult
 */
export const validateAll = (
  items: CargoItem[],
  bounds: RectLike,
  options?: {
    maxLoadMeters?: number;
    internalHeightMeter?: number;
    scale?: number;
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
