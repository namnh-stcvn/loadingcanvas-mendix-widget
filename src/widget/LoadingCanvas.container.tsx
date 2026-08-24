import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { LoadingCanvas } from "./LoadingCanvas";
import type { LoadingCanvasProps, LoadingCanvasViewModelProps } from "./LoadingCanvas.properties";
import {
  getObjectGuid,
  loadTrailerAndScale,
  loadCargoItems,
  loadPackingPlan,
  savePackingPlan,
} from "../adapters/mendixDataAdapter";
import type { CargoItem } from "../viewModels/CargoItem";
import type { TrailerItem } from "../viewModels/TrailerItem";
import type { CanvasState } from "../state/CanvasState";
import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from "../constants/canvas";

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
 */
export const LoadingCanvasContainer = (props: LoadingCanvasProps): ReactElement => {
  const {
    truckSelection: truckSelectionRef,
    transportOrders: transportOrdersRef,
    canvasWidth = DEFAULT_CANVAS_WIDTH,
    canvasHeight = DEFAULT_CANVAS_HEIGHT,
    onSavePlan: onSavePlanCallback,
    onLoadPlan: onLoadPlanCallback,
  } = props;

  // Handle datasource from Mendix - extract first item
  const truckSelection = Array.isArray(truckSelectionRef) ? truckSelectionRef[0] : truckSelectionRef;
  const truckGuidKey = getObjectGuid(truckSelection) ?? "";
  const transportOrderGuids = transportOrdersRef ?? [];
  const transportOrdersKey = transportOrderGuids.join("|");

  // --- State for loaded data ---
  const [trailerItem, setTrailerItem] = useState<TrailerItem | null>(null);
  const [palletList, setPalletList] = useState<CargoItem[]>([]);
  const [initialCanvasItems, setInitialCanvasItems] = useState<CargoItem[]>([]);
  const [scale, setScale] = useState({widthScale:1,heightScale:1});
  const [truckGuid, setTruckGuid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- Load truck data and compute scale ---
  useEffect(() => {
    let cancelled = false;
    const loadTruck = async (): Promise<void> => {
      if (!truckGuidKey) {
        if (cancelled) return;
        setTrailerItem(null);
        setTruckGuid(null);
        setScale({widthScale:1,heightScale:1});
        setIsLoading(false);
        return;
      }

      try {
        const result = await loadTrailerAndScale(truckGuidKey);
        if (cancelled) return;
        setTrailerItem(result.trailer);
        setTruckGuid(result.truckGuid);
        setScale(result.scale);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load truck data:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadTruck();
    return () => {
      cancelled = true;
    };
  }, [truckGuidKey, canvasWidth, canvasHeight]);

  // --- Load transport orders (pallet list) ---
  useEffect(() => {
    let cancelled = false;
    const loadOrders = async (): Promise<void> => {
      if (transportOrderGuids.length === 0 || scale.widthScale === 1) {
        setPalletList([]);
        return;
      }

      try {
        const items = await loadCargoItems(transportOrderGuids, scale);
        if (cancelled) return;
        setPalletList(items);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load transport orders:", err);
      }
    };

    loadOrders();
    return () => {
      cancelled = true;
    };
  }, [transportOrdersKey, scale]);

  // --- Load saved packing plan ---
  useEffect(() => {
    let cancelled = false;
    const loadPlan = async (): Promise<void> => {
      if (!truckGuid || scale.widthScale === 1) {
        return;
      }

      try {
        const savedItems = await loadPackingPlan(truckGuid, scale);
        if (cancelled) return;
        setInitialCanvasItems(savedItems);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load packing plan:", err);
      }
    };

    loadPlan();
    return () => {
      cancelled = true;
    };
  }, [truckGuid, scale]);

  // --- Save plan handler ---
  const handleSavePlan = useCallback(
    async (items: CargoItem[], currentScale: {widthScale:number;heightScale:number}) => {
      if (!truckGuid) {
        return;
      }

      const state: CanvasState = {
        trailer: trailerItem,
        cargos: items,
        selectedIds: [],
        activeItemId: null,
        validation: { valid: true, errors: [] },
        scale: currentScale,
      };

      await savePackingPlan(truckGuid, state, currentScale, onSavePlanCallback);
      // Items stay in canvas state - no need to reload from DB
    },
    [truckGuid, trailerItem, onSavePlanCallback]
  );

  // --- Load plan handler ---
  const handleLoadPlan = useCallback(async () => {
    if (!truckGuid || scale.widthScale === 1 && scale.heightScale === 1) {
      return;
    }

    try {
      const savedItems = await loadPackingPlan(truckGuid, scale);
      setInitialCanvasItems(savedItems);
      onLoadPlanCallback?.();
    } catch (err) {
      console.error("Failed to load packing plan:", err);
      return;
    }
  }, [truckGuid, scale, onLoadPlanCallback]);

  // --- Build view model props ---
  const viewModel: LoadingCanvasViewModelProps = useMemo(
    () => ({
      trailer: trailerItem,
      palletList,
      initialCanvasItems,
      scale,
      canvasWidth,
      canvasHeight,
      onSavePlan: handleSavePlan,
      onLoadPlan: handleLoadPlan,
    }),
    [trailerItem, palletList, initialCanvasItems, scale, canvasWidth, canvasHeight, handleSavePlan, handleLoadPlan]
  );

  return <LoadingCanvas viewModel={viewModel} isLoading={isLoading} />;
};

export default LoadingCanvasContainer;
