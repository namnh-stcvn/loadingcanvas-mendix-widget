import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactElement, type RefObject } from "react";
import { CargoCard } from "../components/CargoCard";
import { CargoList } from "../components/CargoList";
import { GridOverlay } from "../components/GridOverlay";
import { packCargoIntoBounds } from "../domain/packingRules";
import { useTruckCanvas } from "../hooks/useTruckCanvas";
import {
  CANVAS_BORDER,
  DEFAULT_MARGIN,
  INFO_PANEL_TOP,
  INFO_PANEL_RIGHT,
  INFO_PANEL_Z_INDEX,
  INFO_PANEL_PADDING,
  INFO_PANEL_BACKGROUND,
  INFO_PANEL_BORDER,
  GRID_SIZE,
  TRUCK_FRAME_BORDER,
  DEFAULT_ADD_POSITION_X,
  DEFAULT_ADD_POSITION_Y,
  TRUCK_BACKGROUND_IMAGE_WIDTH,
  TRUCK_BACKGROUND_LOAD_X,
  TRUCK_BACKGROUND_LOAD_Y,
  TRUCK_BACKGROUND_LOAD_WIDTH,
} from "../constants/canvas";
import {
  CANVAS_BACKGROUND_COLOR,
  ERROR_TEXT_COLOR,
  SAVE_ERROR_COLOR,
  EMPTY_STATE_COLOR,
  EMPTY_STATE_FONT_SIZE,
} from "../constants/theme";
import { fromCargoId } from "../domain/cargoIdentity";
import truckBackground from "../assets/Truck_horizontal.png";
import type { CargoItem } from "../viewModels/CargoItem";
import type { LoadingCanvasViewProps } from "./LoadingCanvas.properties";

/**
 * LoadingCanvasView — pure React canvas renderer.
 *
 * This component receives view models from the LoadingCanvasContainer
 * (which resolves Mendix object references via mx.data) and renders the
 * interactive packing canvas. It is not the Mendix build entry point;
 * that role belongs to src/LoadingCanvas.tsx.
 *
 * Key responsibilities:
 * - Render the canvas with truck boundary, cargo items, and info panel
 * - Manage drag-and-drop from the cargo list onto the canvas
 * - Handle rotation, grid snapping, and real-time validation
 * - Display validation status (colors, errors)
 * - Expose save/load callbacks to the container
 */
export const LoadingCanvasView = (props: LoadingCanvasViewProps): ReactElement => {
  const { viewModel, isLoading } = props;
  const {
    truck,
    availableCargo,
    initialCanvasItems,
    scale,
    canvasWidth,
    canvasHeight,
    saveError,
    onSavePlan,
    onLoadPlan,
  } = viewModel;

  const canvasRef = useRef<HTMLDivElement | null>(null);

  // --- Canvas state from the hook ---
  const {
    items,
    activeItemId,
    selectedIds,
    validation,
    handleMouseDown,
    handleCanvasMouseDown,
    handleRotate,
    addItem,
    setItems,
    removeItem,
  } = useTruckCanvas({
    initialItems: initialCanvasItems,
    canvasWidth,
    canvasHeight,
    canvasRef: canvasRef as RefObject<HTMLDivElement | null>,
    scale,
    truck,
  });

  // Available cargo = availableCargo minus those already on the canvas.
  // Derived from canvas items (single source of truth), so the list always
  // reflects reality after drag-in, plan load, or canvas reset.
  const availableCargoItems = useMemo(() => {
    const canvasIds = new Set(items.map((i) => fromCargoId(i.id)));
    return availableCargo.filter((p) => !canvasIds.has(fromCargoId(p.id)));
  }, [availableCargo, items]);

  // --- Save plan handler ---
  const handleSavePlan = (): void => {
    onSavePlan(items, scale);
  };

  // --- Load plan handler ---
  const handleLoadPlan = (): void => {
    onLoadPlan();
  };

  // --- Auto Load handler: repack every cargo (on canvas + still in list) into the truck ---
  const [autoLoadUnplaced, setAutoLoadUnplaced] = useState(0);
  const handleAutoLoad = (): void => {
    const bounds = truck ?? { x: 0, y: 0, length: canvasWidth, width: canvasHeight };

    // Expand cargo items by quantity (each transport order contributes N cargo items)
    const expandByQuantity = (cargo: CargoItem[]): CargoItem[] => {
      const expanded: CargoItem[] = [];
      for (const item of cargo) {
        const quantity = item.quantity ?? 1;
        for (let i = 0; i < quantity; i++) {
          expanded.push({
            ...item,
            // Generate unique IDs for each instance but keep same baseId for grouping
            id: `${item.id}-${i}`,
          });
        }
      }
      return expanded;
    };

    const allItems = [...items, ...availableCargoItems];
    const expandedItems = expandByQuantity(allItems);
    const { placed, unplaced } = packCargoIntoBounds(expandedItems, bounds, scale);
    setItems(placed);
    setAutoLoadUnplaced(unplaced.length);
  };

  // --- Verify handler: checks that every cargo of the exercise was loaded onto the truck ---
  // Expected count = total TransportOrders given to the widget (availableCargo),
  // so verification passes only when the cargo list has been emptied onto the canvas.
  const [verifyResult, setVerifyResult] = useState<{ placed: number; expected: number } | null>(null);
  const handleVerify = (): void => {
    setVerifyResult({ placed: items.length, expected: availableCargo.length });
  };

  // A changed item count invalidates the previous verification result.
  useEffect(() => {
    setVerifyResult(null);
  }, [items.length]);

  // --- Drag-and-drop from cargo list to canvas ---
  const handlePalletDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const palletId = e.dataTransfer.getData("text/plain");
    const pallet = availableCargoItems.find((p) => p.id === palletId);
    if (!pallet) {
      return;
    }

    // Calculate drop position relative to canvas
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Add cargo to canvas at drop position, creating multiple items based on quantity
    const quantity = pallet.quantity ?? 1;
    for (let i = 0; i < quantity; i++) {
      // Offset each item slightly so they don't overlap exactly
      const newItem = {
        ...pallet,
        x: x + i * 20,
        y: y + i * 20,
        // Generate unique IDs for each item but keep same baseId for grouping
        id: `${pallet.id}-${i}`,
      };
      addItem(newItem);
    }
  };

  const handlePalletDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
  };

  // --- Get item-specific errors for status display ---
  const getItemErrors = (itemId: string): string[] => {
    return validation?.itemErrors?.[itemId] ?? [];
  };

  // --- Truck backdrop style: scale the image so its loading-area rectangle
  // (TRUCK_BACKGROUND_LOAD_*) lands exactly on the proportional truck frame. The
  // frame length = truck.length px represents the truck's internal loading width;
  // the image's loading area is TRUCK_BACKGROUND_LOAD_WIDTH raw px, so the image
  // must be displayed at truck.length / LOAD_WIDTH × its natural size, positioned
  // so that LOAD_X/LOAD_Y image px map onto the frame's top-left corner.
  const truckBackdropStyle = useMemo(() => {
    if (!truck || truck.length <= 0) {
      return {
        backgroundSize: "100% auto" as const,
        backgroundPosition: "center" as const,
      };
    }
    const k = truck.length / TRUCK_BACKGROUND_LOAD_WIDTH;
    const width = Math.round(TRUCK_BACKGROUND_IMAGE_WIDTH * k);
    const left = Math.round(truck.x - TRUCK_BACKGROUND_LOAD_X * k);
    const top = Math.round(truck.y - TRUCK_BACKGROUND_LOAD_Y * k);
    return {
      backgroundSize: `${width}px 344px` as const,
      backgroundPosition: `${left}px ${top}px` as const,
    };
  }, [truck]);

  // --- Loading state ---
  if (isLoading) {
    return (
      <div
        style={{
          position: "relative",
          width: canvasWidth,
          height: canvasHeight,
          margin: DEFAULT_MARGIN,
          overflow: "hidden",
          border: CANVAS_BORDER,
          backgroundColor: CANVAS_BACKGROUND_COLOR,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: EMPTY_STATE_FONT_SIZE,
          color: EMPTY_STATE_COLOR,
        }}>
        Loading...
      </div>
    );
  }

  // --- Render ---
  return (
    <div
      ref={canvasRef}
      onMouseDown={handleCanvasMouseDown}
      onDrop={handlePalletDrop}
      onDragOver={handlePalletDragOver}
      style={{
        position: "relative",
        width: canvasWidth,
        height: canvasHeight,
        margin: DEFAULT_MARGIN,
        overflow: "hidden",
        border: CANVAS_BORDER,
        backgroundColor: CANVAS_BACKGROUND_COLOR,
        backgroundImage: `url(${truckBackground})`,
        backgroundSize: truckBackdropStyle.backgroundSize,
        backgroundPosition: truckBackdropStyle.backgroundPosition,
        backgroundRepeat: "no-repeat",
      }}>
      {/* Grid overlay */}
      <GridOverlay width={canvasWidth} height={canvasHeight} gridSize={GRID_SIZE} />

      {/* Truck boundary (loading area) */}
      {truck && (
        <div
          style={{
            position: "absolute",
            left: truck.x,
            top: truck.y,
            width: truck.length,
            height: truck.width,
            border: TRUCK_FRAME_BORDER,
            boxSizing: "border-box",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Info panel overlay */}
      <div
        style={{
          position: "absolute",
          top: INFO_PANEL_TOP,
          right: INFO_PANEL_RIGHT,
          zIndex: INFO_PANEL_Z_INDEX,
          background: INFO_PANEL_BACKGROUND,
          padding: INFO_PANEL_PADDING,
          border: INFO_PANEL_BORDER,
        }}>
        {/* <div>Active: {activeItemId ?? "None"}</div>
        <div>
          Validation:{" "}
          <span style={{ color: validation?.valid ? "green" : "red", fontWeight: "bold" }}>
            {validation?.valid ? "OK" : "Issue"}
          </span>
        </div>
        {validation?.errors.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {validation.errors.map((error) => (
              <li key={error} style={{ color: ERROR_TEXT_COLOR, fontSize: 12 }}>
                {error}
              </li>
            ))}
          </ul>
        )} */}
        <div style={{ marginTop: 8 }}>
          <button onClick={handleSavePlan} style={{ marginRight: 8 }}>
            Save Plan
          </button>
          <button onClick={handleLoadPlan} style={{ marginRight: 8 }}>
            Load Plan
          </button>
          <button
            onClick={handleAutoLoad}
            style={{ marginRight: 8 }}
            disabled={items.length === 0 && availableCargoItems.length === 0}>
            Auto Load
          </button>
          <button
            onClick={handleVerify}
            disabled={availableCargo.length === 0}
            style={
              verifyResult
                ? {
                    backgroundColor: verifyResult.placed === verifyResult.expected ? "green" : "red",
                    color: "#fff",
                  }
                : undefined
            }>
            Verify
          </button>
        </div>
        {autoLoadUnplaced > 0 && (
          <div style={{ color: ERROR_TEXT_COLOR, fontSize: 12 }}>{autoLoadUnplaced} item(s) did not fit</div>
        )}
        {saveError && (
          <div style={{ color: SAVE_ERROR_COLOR, fontSize: 12, maxWidth: 260 }} title={saveError}>
            Save failed: {saveError}
          </div>
        )}
      </div>

      {/* Cargo list (debug view) */}
      <CargoList
        availableItems={availableCargoItems}
        onAddCargo={(cargo: CargoItem) => {
          // Add cargo to canvas at a default position, creating multiple items based on quantity
          const quantity = cargo.quantity ?? 1;
          for (let i = 0; i < quantity; i++) {
            // Offset each item slightly so they don't overlap exactly
            const newItem = {
              ...cargo,
              x: DEFAULT_ADD_POSITION_X + i * 20,
              y: DEFAULT_ADD_POSITION_Y + i * 20,
              // Generate unique IDs for each item but keep same baseId for grouping
              id: `${cargo.id}-${i}`,
            };
            addItem(newItem);
          }
        }}
        onRemoveCargo={(baseId: string) => {
          removeItem(baseId);
        }}
      />

      {/* Cargo cards on canvas */}
      {items.map((item) => (
        <CargoCard
          key={item.id}
          item={item}
          isActive={activeItemId === item.id}
          selectedIds={selectedIds}
          hasError={getItemErrors(item.id).length > 0}
          scale={scale}
          onMouseDown={(e) => handleMouseDown(e, item.id)}
          onRotate={handleRotate}
        />
      ))}
    </div>
  );
};

export default LoadingCanvasView;
