// Property definitions for the LoadingCanvas widget
import type { CargoItem } from "../viewModels/CargoItem";
import type { TrailerItem } from "../viewModels/TrailerItem";
import type { MxObject } from "../types/mx";

// Mendix-facing props interface — what the container receives after resolving values to GUIDs
export interface LoadingCanvasProps {
  truckSelection?: Array<MxObject | string | { guid?: string; id?: string }>;
  transportOrders?: string[]; // TransportOrder GUID list from Mendix
  session?: Array<MxObject | string | { guid?: string; id?: string }>;
  canvasWidth: number;
  canvasHeight: number;
  onSavePlan?: () => void;
  onLoadPlan?: () => void;
}

// View-model props interface — what the container passes to the LoadingCanvas widget
export interface LoadingCanvasViewModelProps {
  trailer: TrailerItem | null; // Resolved trailer view model (or null if no truck selected)
  palletList: CargoItem[]; // Cargo items available to drag (from TransportOrders)
  initialCanvasItems: CargoItem[]; // Cargo items restored from saved packing plan
  scale: number; // Pixel-to-meter scale factor
  canvasWidth: number;
  canvasHeight: number;
  onSavePlan: (items: CargoItem[], scale: number) => void;
  onLoadPlan: () => void;
}

// Internal widget props — what LoadingCanvas receives from the container
export interface LoadingCanvasWidgetProps {
  viewModel: LoadingCanvasViewModelProps;
  isLoading: boolean; // Whether the widget is still loading data from Mendix
}
