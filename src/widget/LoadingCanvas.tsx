import { useEffect, useRef, useState, type RefObject } from "react";
import { CargoCard } from "../components/CargoCard";
import { PalletList } from "../components/PalletList";
import { GridOverlay } from "../components/GridOverlay";
import { useTrailerCanvas } from "../hooks/useTrailerCanvas";
import {
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  CANVAS_BORDER,
  DEFAULT_MARGIN,
  INFO_PANEL_TOP,
  INFO_PANEL_LEFT,
  INFO_PANEL_Z_INDEX,
  INFO_PANEL_PADDING,
  INFO_PANEL_BACKGROUND,
  INFO_PANEL_BORDER,
  GRID_SIZE,
} from "../constants/canvas";
import { CANVAS_BACKGROUND_COLOR } from "../constants/theme";
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
 * - Render the canvas with trailer boundary, cargo items, and info panel
 * - Manage drag-and-drop from the pallet list onto the canvas
 * - Handle rotation, grid snapping, and real-time validation
 * - Display validation status (colors, errors)
 * - Expose save/load callbacks to the container
 */
export const LoadingCanvas = (props: LoadingCanvasWidgetProps) => {
  const { viewModel, isLoading } = props;
  const {
    trailer,
    palletList,
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
  } = useTrailerCanvas({
    initialItems: initialCanvasItems,
    canvasWidth,
    canvasHeight,
    canvasRef: canvasRef as RefObject<HTMLDivElement | null>,
    scale,
    trailer,
  });

  // --- Track which pallets have been added to the canvas ---
  // We track added pallet IDs in a Set. When a pallet is dragged onto the
  // canvas, its ID is added to the set so it disappears from the palette.
  const [addedPalletIds, setAddedPalletIds] = useState<Set<string>>(new Set());

  // Available pallets = palletList minus those already added to canvas
  const availablePallets = palletList.filter((p) => !addedPalletIds.has(p.id));

  // --- Restore items when loaded from plan ---
  // The useTrailerCanvas hook already handles initialItems changes via its
  // own useEffect, but we also set items directly when a plan is loaded
  // after the initial render to ensure the canvas reflects the saved state.
  useEffect(() => {
    if (initialCanvasItems.length > 0) {
      setItems(initialCanvasItems);
    }
  }, [initialCanvasItems, setItems]);

  // --- Save plan handler ---
  const handleSavePlan = () => {
    onSavePlan(items, scale);
  };

  // --- Load plan handler ---
  const handleLoadPlan = () => {
    onLoadPlan();
  };

  // --- Drag-and-drop from pallet list to canvas ---
  const handlePalletDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const palletId = e.dataTransfer.getData("text/plain");
    const pallet = availablePallets.find((p) => p.id === palletId);
    if (!pallet) return;

    // Calculate drop position relative to canvas
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Add the pallet to the canvas at the drop position
    const newItem = { ...pallet, x, y };
    addItem(newItem);

    // Mark as added so it disappears from the pallet list
    setAddedPalletIds((prev) => new Set([...prev, palletId]));
  };

  const handlePalletDragOver = (e: React.DragEvent<HTMLDivElement>) => {
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
      }}>
      {/* Grid overlay */}
      <GridOverlay width={canvasWidth} height={canvasHeight} gridSize={GRID_SIZE} />

      {/* Trailer boundary */}
      {trailer && (
        <div
          style={{
            position: "absolute",
            left: trailer.x,
            top: trailer.y,
            width: trailer.width,
            height: trailer.height,
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
          left: INFO_PANEL_LEFT,
          zIndex: INFO_PANEL_Z_INDEX,
          background: INFO_PANEL_BACKGROUND,
          padding: INFO_PANEL_PADDING,
          border: INFO_PANEL_BORDER,
        }}>
        <div>Active: {activeItemId ?? "None"}</div>
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
        )}
        <div style={{ marginTop: 8 }}>
          <button onClick={handleSavePlan} style={{ marginRight: 8 }}>
            Save Plan
          </button>
          <button onClick={handleLoadPlan}>Load Plan</button>
        </div>
      </div>

      {/* Pallet list (debug view) */}
      <PalletList
        pallets={availablePallets}
        onAddPallet={(pallet: CargoItem) => {
          // Add pallet to canvas at a default position
          const newItem = { ...pallet, x: 50, y: 50 };
          setAddedPalletIds((prev) => new Set([...prev, pallet.id]));
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
          onMouseDown={(e) => handleMouseDown(e, item.id)}
          onRotate={handleRotate}
        />
      ))}
    </div>
  );
};

export default LoadingCanvas;
