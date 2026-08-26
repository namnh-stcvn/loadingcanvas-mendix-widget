import { useEffect, useRef, useState, type DragEvent, type ReactElement, type RefObject } from "react";
import { CargoCard } from "../components/CargoCard";
import { CargoList } from "../components/CargoList";
import { GridOverlay } from "../components/GridOverlay";
import { packCargoIntoBounds } from "../domain/packingRules";
import { useTruckCanvas } from "../hooks/useTruckCanvas";
import {
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  CANVAS_BORDER,
  DEFAULT_MARGIN,
  INFO_PANEL_TOP,
  INFO_PANEL_RIGHT,
  INFO_PANEL_Z_INDEX,
  INFO_PANEL_PADDING,
  INFO_PANEL_BACKGROUND,
  INFO_PANEL_BORDER,
  GRID_SIZE,
} from "../constants/canvas";
import { CANVAS_BACKGROUND_COLOR } from "../constants/theme";
import truckBackground from "../assets/Truck_horizontal.png";
import type { CargoItem } from "../viewModels/CargoItem";
import type { LoadingCanvasWidgetProps } from "./LoadingCanvas.properties";

/**
 * LoadingCanvas — the Mendix Pluggable Widget entry point.
 *
 * This component receives view models from the LoadingCanvasContainer
 * (which resolves Mendix object references via mx.data) and renders the
 * interactive packing canvas.
 *
 * Key responsibilities:
 * - Render the canvas with truck boundary, cargo items, and info panel
 * - Manage drag-and-drop from the cargo list onto the canvas
 * - Handle rotation, grid snapping, and real-time validation
 * - Display validation status (colors, errors)
 * - Expose save/load callbacks to the container
 */
export const LoadingCanvas = (props: LoadingCanvasWidgetProps): ReactElement => {
  const { viewModel, isLoading } = props;
  const {
    truck,
    availableCargo,
    initialCanvasItems,
    scale,
    canvasWidth = DEFAULT_CANVAS_WIDTH,
    canvasHeight = DEFAULT_CANVAS_HEIGHT,
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
  // Normalize IDs by removing "cargo-" prefix for comparison.
  const normalizeId = (id: string) => (id.startsWith("cargo-") ? id.replace("cargo-", "") : id);
  const availableCargoItems = availableCargo.filter((p) => !items.some((i) => normalizeId(i.id) === normalizeId(p.id)));

  // --- Restore items when loaded from plan ---
  // The useTruckCanvas hook already handles initialItems changes via its
  // own useEffect, but we also set items directly when a plan is loaded
  // after the initial render to ensure the canvas reflects the saved state.
  useEffect(() => {
    if (initialCanvasItems.length > 0) {
      setItems(initialCanvasItems);
    }
  }, [initialCanvasItems, setItems]);

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
    const { placed, unplaced } = packCargoIntoBounds([...items, ...availableCargoItems], bounds, scale);
    setItems(placed);
    setAutoLoadUnplaced(unplaced.length);
  };

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

    // Add the pallet to the canvas at the drop position
    const newItem = { ...pallet, x, y };
    addItem(newItem);
  };

  const handlePalletDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
  };

  // --- Get item-specific errors for status display ---
  const getItemErrors = (itemId: string): string[] => {
    return validation?.itemErrors?.[itemId] ?? [];
  };

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
          fontSize: 16,
          color: "#666",
        }}>
        Loading packing plan...
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
        backgroundSize: "100% auto",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}>
      {/* Grid overlay */}
      <GridOverlay width={canvasWidth} height={canvasHeight} gridSize={GRID_SIZE} />

      {/* Truck boundary */}
      {truck && (
        <div
          style={{
            position: "absolute",
            left: truck.x,
            top: truck.y,
            width: truck.length,
            height: truck.width,
            border: "2px dashed #888",
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
              <li key={error} style={{ color: "red", fontSize: 12 }}>
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
          <button onClick={handleAutoLoad} disabled={items.length === 0 && availableCargoItems.length === 0}>
            Auto Load
          </button>
        </div>
        {autoLoadUnplaced > 0 && <div style={{ color: "red", fontSize: 12 }}>{autoLoadUnplaced} item(s) did not fit</div>}
      </div>

      {/* Cargo list (debug view) */}
      <CargoList
        availableItems={availableCargoItems}
        onAddCargo={(cargo: CargoItem) => {
          // Add cargo to canvas at a default position
          const newItem = { ...cargo, x: 50, y: 50 };
          addItem(newItem);
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

export default LoadingCanvas;
