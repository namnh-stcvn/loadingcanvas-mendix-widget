import { useEffect, useRef, useState, type DragEvent, type ReactElement, type RefObject } from "react";
import type { CargoItem } from "./viewModels/CargoItem";
import { CargoCard } from "./components/CargoCard";
import { PalletList } from "./components/PalletList";
import { GridOverlay } from "./components/GridOverlay";
import { useTrailerCanvas } from "./hooks/useTrailerCanvas";
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
} from "./constants/canvas";
import { CANVAS_BACKGROUND_COLOR } from "./constants/theme";
import { LoadingCanvasWidgetProps } from "./widget/LoadingCanvas.properties";

export const LoadingCanvas = (props: LoadingCanvasWidgetProps): ReactElement => {
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
  const { items, activeItemId, selectedIds, validation, handleMouseDown, handleRotate, addItem, setItems } =
    useTrailerCanvas({
      initialItems: initialCanvasItems,
      canvasWidth,
      canvasHeight,
      canvasRef: canvasRef as RefObject<HTMLDivElement>,
      scale,
      trailer,
    });

  const [addedPalletIds, setAddedPalletIds] = useState<Set<string>>(new Set());

  // Available pallets = palletList minus those added to canvas
  const availablePallets = palletList.filter((p) => !addedPalletIds.has(p.id));

  // --- Click to add pallet ---
  const handleAddPallet = (pallet: CargoItem): void => {
    const centerX = canvasWidth / 2 - pallet.width / 2;
    const centerY = canvasHeight / 2 - pallet.height / 2;
    const newItem = { ...pallet, x: centerX, y: centerY };
    addItem(newItem);
    setAddedPalletIds((prev) => new Set([...prev, pallet.id]));
  };

  useEffect(() => {
    if (initialCanvasItems?.length > 0) {
      setItems(initialCanvasItems);
    }
  }, [initialCanvasItems, setItems]);

  const handleSavePlan = (): void => {
    if (onSavePlan) {
      onSavePlan(items, scale);
    }
  };

  const handleLoadPlan = (): void => {
    if (onLoadPlan) {
      onLoadPlan();
    }
  };

  const handlePalletDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const palletId = e.dataTransfer.getData("text/plain");
    const pallet = availablePallets.find((p) => p.id === palletId);
    if (!pallet) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    addItem({ ...pallet, x, y });
    setAddedPalletIds((prev) => new Set([...prev, palletId]));
  };

  const handlePalletDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
  };

  if (isLoading) {
    return (
      <div
        style={{
          width: canvasWidth,
          height: canvasHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: CANVAS_BACKGROUND_COLOR,
          border: CANVAS_BORDER,
        }}>
        Loading...
      </div>
    );
  }

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
      }}>
      <PalletList pallets={availablePallets} onAddPallet={handleAddPallet} />
      <div
        ref={canvasRef}
        onDrop={handlePalletDrop}
        onDragOver={handlePalletDragOver}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}>
        <GridOverlay width={canvasWidth} height={canvasHeight} gridSize={GRID_SIZE} />
        {items.map((item) => {
          let hasError = false;
          if (validation && validation.itemErrors && item.id in validation.itemErrors) {
            hasError = validation.itemErrors[item.id].length > 0;
          }
          return (
            <CargoCard
              key={item.id}
              item={item}
              isActive={activeItemId === item.id}
              selectedIds={selectedIds}
              onMouseDown={(e) => handleMouseDown(e, item.id)}
              onRotate={() => handleRotate(item.id)}
              hasError={hasError}
            />
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          top: INFO_PANEL_TOP,
          left: INFO_PANEL_LEFT,
          zIndex: INFO_PANEL_Z_INDEX,
          padding: INFO_PANEL_PADDING,
          backgroundColor: INFO_PANEL_BACKGROUND,
          border: INFO_PANEL_BORDER,
        }}>
        {/* Info panel content */}
        <button onClick={handleSavePlan}>Save Plan</button>
        <button onClick={handleLoadPlan}>Load Plan</button>
        {validation && validation.valid ? "Valid" : "Invalid"}
      </div>
    </div>
  );
};
