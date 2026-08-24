import type { CargoItem } from "../viewModels/CargoItem";
import type { TrailerItem } from "../viewModels/TrailerItem";
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
  trailer: TrailerItem | null;
  palletList: CargoItem[];
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
