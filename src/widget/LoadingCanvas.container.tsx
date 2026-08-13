import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { LoadingCanvas } from "./LoadingCanvas";
import type { LoadingCanvasProps, LoadingCanvasViewModelProps } from "./LoadingCanvas.properties";
import { computeScale, type TruckSelectionData } from "../adapters/trailerAdapter";
import { loadTrailerItem, loadCargoItems, loadPackingPlan, savePackingPlan } from "../adapters/mendixDataAdapter";
import type { CargoItem } from "../viewModels/CargoItem";
import type { TrailerItem } from "../viewModels/TrailerItem";
import type { CanvasState } from "../state/CanvasState";

/**
 * LoadingCanvasContainer — the Mendix widget container.
 *
 * This component sits between Mendix and the LoadingCanvas widget.
 * It is responsible for:
 * - Receiving raw Mendix object references (GUID strings)
 * - Resolving them to full objects via the Mendix Data API (mx.data)
 * - Converting them to view models using adapters
 * - Passing the view models and callbacks to the LoadingCanvas widget
 * - Handling save/load plan via Mendix microflows and the PackingPlan entity
 *
 * In a real Mendix project, the object references are resolved via mx.data.
 * In the dev environment (Vite), the references are JSON strings that are
 * parsed directly.
 */
export const LoadingCanvasContainer = (props: LoadingCanvasProps): ReactElement => {
    const {
        trucks: trucksRef,
        transportOrders: transportOrdersRef,
        canvasWidth = 1000,
        canvasHeight = 600,
        onSavePlan: onSavePlanCallback,
        onLoadPlan: onLoadPlanCallback
    } = props;

    // --- State for loaded data ---
    const [trailerItem, setTrailerItem] = useState<TrailerItem | null>(null);
    const [palletList, setPalletList] = useState<CargoItem[]>([]);
    const [initialCanvasItems, setInitialCanvasItems] = useState<CargoItem[]>([]);
    const [scale, setScale] = useState(1);
    const [truckGuid, setTruckGuid] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // --- Load truck data and compute scale ---
    // We need the truck data to compute the scale, but we also need the scale
    // to convert truck data to a TrailerItem. So we first load the raw truck data,
    // compute the scale, then convert to a TrailerItem.
    useEffect(() => {
        const loadTruck = async (): Promise<void> => {
            if (!trucksRef) {
                setTrailerItem(null);
                setTruckGuid(null);
                setScale(1);
                setIsLoading(false);
                return;
            }

            try {
                // Load the raw truck data to compute scale
                const rawTruck = await loadMendixObjectRaw(trucksRef);
                if (rawTruck) {
                    setTruckGuid(rawTruck.id ?? null);

                    // Compute scale from truck dimensions
                    const computedScale = computeScale(rawTruck, canvasWidth, canvasHeight);
                    setScale(computedScale);

                    // Convert to TrailerItem
                    const trailer = await loadTrailerItem(trucksRef, computedScale);
                    setTrailerItem(trailer);
                }
            } catch (err) {
                console.error("Failed to load truck data:", err);
            }
        };

        loadTruck();
    }, [trucksRef, canvasWidth, canvasHeight]);

    // --- Load transport orders (pallet list) ---
    useEffect(() => {
        const loadOrders = async (): Promise<void> => {
            if (!transportOrdersRef || transportOrdersRef.length === 0 || scale === 1) {
                return;
            }

            try {
                const items = await loadCargoItems(transportOrdersRef, scale);
                setPalletList(items);
            } catch (err) {
                console.error("Failed to load transport orders:", err);
            }
        };

        loadOrders();
    }, [transportOrdersRef, scale]);

    // --- Load saved packing plan ---
    useEffect(() => {
        const loadPlan = async (): Promise<void> => {
            if (!truckGuid || scale === 1) {
                setIsLoading(false);
                return;
            }

            try {
                const savedItems = await loadPackingPlan(truckGuid, scale);
                setInitialCanvasItems(savedItems);
            } catch (err) {
                console.error("Failed to load packing plan:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadPlan();
    }, [truckGuid, scale]);

    // --- Save plan handler — called by the widget with current items and scale ---
    const handleSavePlan = useCallback(
        async (items: CargoItem[], currentScale: number) => {
            if (!truckGuid) {
                return;
            }

            // Build a minimal CanvasState for serialization
            const state: CanvasState = {
                trailer: trailerItem,
                cargos: items,
                selectedIds: [],
                activeItemId: null,
                validation: { valid: true, errors: [] },
                scale: currentScale,
                offsetX: 0,
                offsetY: 0
            };

            await savePackingPlan(truckGuid, state, currentScale, onSavePlanCallback);
        },
        [truckGuid, trailerItem, onSavePlanCallback]
    );

    // --- Load plan handler ---
    const handleLoadPlan = useCallback(() => {
        if (onLoadPlanCallback) {
            onLoadPlanCallback();
        }
    }, [onLoadPlanCallback]);

    // --- Build view model props for the widget ---
    const viewModel: LoadingCanvasViewModelProps = useMemo(
        () => ({
            trailer: trailerItem,
            palletList,
            initialCanvasItems,
            scale,
            canvasWidth,
            canvasHeight,
            onSavePlan: handleSavePlan,
            onLoadPlan: handleLoadPlan
        }),
        [trailerItem, palletList, initialCanvasItems, scale, canvasWidth, canvasHeight, handleSavePlan, handleLoadPlan]
    );

    return <LoadingCanvas viewModel={viewModel} isLoading={isLoading} />;
};

/**
 * Load raw truck data (for scale computation).
 * In Mendix, this uses mx.data.load. In dev, it parses JSON.
 */
const loadMendixObjectRaw = async (ref: string): Promise<TruckSelectionData | null> => {
    // Try mx.data first
    if (typeof window !== "undefined" && (window as unknown as { mx?: unknown }).mx) {
        const mxData = (window as unknown as { mx: { data: unknown } }).mx.data as {
            load: (opts: { guid: string; callback: (obj: unknown) => void; error?: (e: Error) => void }) => void;
        };
        return new Promise((resolve, reject) => {
            mxData.load({
                guid: ref,
                callback: (obj: unknown) => resolve(obj as TruckSelectionData),
                error: (err: Error) => reject(err)
            });
        });
    }
    // Dev fallback: parse JSON
    try {
        return JSON.parse(ref) as TruckSelectionData;
    } catch {
        return null;
    }
};

export default LoadingCanvasContainer;
