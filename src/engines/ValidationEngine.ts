import type { CargoItem } from "../viewModels/CargoItem";
import type { RectLike } from "../types/geometry";
import { validateAll, type ValidationResult } from "../domain/validationRules";

export interface ValidationOptions {
  maxLoadMeters?: number;
  internalHeightMeter?: number;
  scale?: number;
}

export class ValidationEngine {
  public validateItems(items: CargoItem[], bounds: RectLike, options?: ValidationOptions): ValidationResult {
    return validateAll(items, bounds, options);
  }
}
