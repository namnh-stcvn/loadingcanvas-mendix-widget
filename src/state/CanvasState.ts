import type { CargoItem } from "../viewModels/CargoItem";
import type { TruckItem } from "../viewModels/TruckItem";
import type { ValidationResult } from "../domain/validationRules";

// Ownership model (single source of truth per field): this state layer holds
// selection truth (selectedIds / activeItemId); DragState inside DragEngine is
// engine-internal during a gesture only; hook-level flags are React render
// signals derived from dispatcher actions. Only the dispatcher writes fields here.
export interface CanvasState {
  truck: TruckItem | null;
  cargos: CargoItem[];
  selectedIds: string[];
  activeItemId: string | null;
  validation: ValidationResult;
  scale: { widthScale: number; heightScale: number };
}
