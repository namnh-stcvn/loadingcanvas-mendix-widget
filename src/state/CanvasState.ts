import type { CargoItem } from "../viewModels/CargoItem";
import type { TrailerItem } from "../viewModels/TrailerItem";
import type { ValidationResult } from "../domain/validationRules";

export interface CanvasState {
  trailer: TrailerItem | null;
  cargos: CargoItem[];
  selectedIds: string[];
  activeItemId: string | null;
  validation: ValidationResult;
  scale: number;
}
