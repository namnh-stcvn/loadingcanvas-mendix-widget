import type { CargoItem } from "../viewModels/CargoItem";
import type { TruckItem } from "../viewModels/TruckItem";
import type { MxObject } from "../types/mx";

export interface LoadingCanvasProps {
  truckSelection?: Array<MxObject | string | { guid?: string; id?: string }>;
  transportOrders?: string[];
  session?: Array<MxObject | string | { guid?: string; id?: string }>;
  canvasWidth: number;
  canvasHeight: number;
  onSavePlan?: () => void;
  onLoadPlan?: () => void;
}

export interface LoadingCanvasViewModelProps {
  truck: TruckItem | null;
  availableCargo: CargoItem[];
  initialCanvasItems: CargoItem[];
  scale: { widthScale: number; heightScale: number };
  canvasWidth: number;
  canvasHeight: number;
  onSavePlan: (items: CargoItem[], scale: { widthScale: number; heightScale: number }) => void;
  onLoadPlan: () => void;
}

export interface LoadingCanvasWidgetProps {
  viewModel: LoadingCanvasViewModelProps;
  isLoading: boolean;
}
