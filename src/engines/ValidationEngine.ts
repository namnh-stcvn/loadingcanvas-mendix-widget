import type { CargoItem } from "../viewModels/CargoItem";
import type { RectLike } from "../types/geometry";
import { validateAll, type ValidationResult } from "../domain/validationRules";

export interface ValidationOptions {
  maxLoadMeters?: number;
  scale?: { widthScale: number; heightScale: number };
}

export class ValidationEngine {
  validateItems(items: CargoItem[], bounds: RectLike, options?: ValidationOptions): ValidationResult {
    return validateAll(items, bounds, options);
  }
}
