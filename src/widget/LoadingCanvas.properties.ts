/**
 * Property definitions for the LoadingCanvas widget.
 *
 * The Mendix engine generates props from `LoadingCanvas.xml`. Object references
 * arrive as `ReferenceValue`/`ListValue` (from the `mendix` package); the entry
 * component (`LoadingCanvas.tsx`) extracts GUIDs and passes them to the container
 * as plain strings/string arrays. The container then resolves full objects via
 * the Mendix Data API (`window.mx.data`).
 */

import type { CargoItem } from "../viewModels/CargoItem";
import type { TrailerItem } from "../viewModels/TrailerItem";

/**
 * Mendix-facing props interface — what the container receives after the entry
 * component has resolved reference values to GUIDs.
 */
export interface LoadingCanvasProps {
    /** TruckSelection object GUID string from Mendix */
    trucks?: string;
    /** TransportOrder object GUID list from Mendix */
    transportOrders?: string[];
    /** Session object GUID string from Mendix */
    session?: string;
    /** Canvas width in pixels */
    canvasWidth: number;
    /** Canvas height in pixels */
    canvasHeight: number;
    /** Callback when user saves the packing plan */
    onSavePlan?: () => void;
    /** Callback when the widget loads the packing plan */
    onLoadPlan?: () => void;
}

/**
 * View-model props interface — what the container passes to the LoadingCanvas widget.
 * The container resolves Mendix object references into view models before
 * passing them to the widget, keeping the widget pure and framework-agnostic.
 */
export interface LoadingCanvasViewModelProps {
    /** Resolved trailer view model (or null if no truck selected) */
    trailer: TrailerItem | null;
    /** Cargo items available to drag onto the canvas (from TransportOrders) */
    palletList: CargoItem[];
    /** Cargo items restored from a saved packing plan */
    initialCanvasItems: CargoItem[];
    /** Pixel-to-meter scale factor */
    scale: number;
    /** Canvas width in pixels */
    canvasWidth: number;
    /** Canvas height in pixels */
    canvasHeight: number;
    /** Callback when user saves the packing plan — receives current canvas items and scale */
    onSavePlan: (items: CargoItem[], scale: number) => void;
    /** Callback when the widget loads the packing plan */
    onLoadPlan: () => void;
}

/**
 * Internal widget props — what LoadingCanvas receives from the container.
 */
export interface LoadingCanvasWidgetProps {
    /** View model data resolved by the container */
    viewModel: LoadingCanvasViewModelProps;
    /** Whether the widget is still loading data from Mendix */
    isLoading: boolean;
}
