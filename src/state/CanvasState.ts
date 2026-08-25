import type { CargoItem } from "../viewModels/CargoItem";
import type { TruckItem } from "../viewModels/TruckItem";
import type { ValidationResult } from "../domain/validationRules";

export interface CanvasState {
  truck: TruckItem | null;
  cargos: CargoItem[];
  selectedIds: string[];
  activeItemId: string | null;
  validation: ValidationResult;
  scale: { widthScale: number; heightScale: number };
}
