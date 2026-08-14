// Property definitions for the LoadingCanvas widget
import type { CargoItem } from "../viewModels/CargoItem";
import type { TrailerItem } from "../viewModels/TrailerItem";

// Mendix-facing props interface — what the container receives after resolving reference values to GUIDs
export interface LoadingCanvasProps {
  trucks?: string; // TruckSelection object GUID from Mendix
  transportOrders?: string[]; // TransportOrder object GUID list from Mendix
  session?: string; // Session object GUID from Mendix
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
  isLoading: boolean; // Whether widget is still loading data from Mendix
}
