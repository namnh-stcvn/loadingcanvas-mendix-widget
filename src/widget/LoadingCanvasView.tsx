import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactElement, type RefObject } from "react";
import { CargoCard } from "../components/CargoCard";
import { CargoList } from "../components/CargoList";
import { GridOverlay } from "../components/GridOverlay";
import { autoLoadCargoUnits, packCargoIntoBounds } from "../domain/packingRules";
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
import { fromCargoId, getCargoInstanceIndex } from "../domain/cargoIdentity";
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

  // Exact instance indices already on canvas per transport order (Map<baseId, Set<index>>).
  // Keeping the exact indices (not just a count) preserves per-unit id/number stability.
  const placedInstances = useMemo(() => {
    const placed = new Map<string, Set<number>>();
    for (const item of items) {
      const baseId = fromCargoId(item.id);
      const set = placed.get(baseId) ?? new Set<number>();
      set.add(getCargoInstanceIndex(item.id));
      placed.set(baseId, set);
    }
    return placed;
  }, [items]);

  // Cumulative numbering offset per transport order, computed once from the full
  // availableCargo list so numbers never shift when a previous order is fully placed.
  const numberStart = useMemo(() => {
    const start = new Map<string, number>();
    let offset = 0;
    for (const cargo of availableCargo) {
      start.set(fromCargoId(cargo.id), offset);
      offset += cargo.quantity ?? 1;
    }
    return start;
  }, [availableCargo]);

  // Available cargo = availableCargo minus those fully placed on canvas.
  const availableCargoItems = useMemo(() => {
    return availableCargo.filter((p) => {
      const baseId = fromCargoId(p.id);
      return (placedInstances.get(baseId)?.size ?? 0) < (p.quantity ?? 1);
    });
  }, [availableCargo, placedInstances]);

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

    const expandedItems = autoLoadCargoUnits(items, availableCargoItems, placedInstances);
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

  // Only one cargo info popup is open at a time; double-clicking another card
  // moves the popup to it, double-clicking the same card closes it.
  const [popupItemId, setPopupItemId] = useState<string | null>(null);
  const handleTogglePopup = (itemId: string): void => {
    setPopupItemId((current) => (current === itemId ? null : itemId));
  };

  // A changed item count invalidates the previous verification result.
  useEffect(() => {
    setVerifyResult(null);
  }, [items.length]);

  // --- Drag-and-drop from cargo list to canvas ---
  const handlePalletDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const rawId = e.dataTransfer.getData("text/plain");
    const isSingle = rawId.startsWith("single:");
    // Payload is the full chip id (cargo-<orderGuid>-<instanceIndex>), so the dropped
    // item keeps the exact number shown on the chip.
    const chipId = isSingle ? rawId.slice("single:".length) : rawId;
    const pallet = availableCargoItems.find((p) => fromCargoId(p.id) === fromCargoId(chipId));
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

    const quantity = isSingle ? 1 : (pallet.quantity ?? 1);
    for (let i = 0; i < quantity; i++) {
      const newItem = {
        ...pallet,
        x: x + i * 20,
        y: y + i * 20,
        // Single drops keep the chip's exact id; bulk drops generate instance ids.
        id: isSingle ? chipId : `${pallet.id}-${i}`,
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
  // Image pinned at canvas (0,0). The frame + cargo shift by sceneOffset so they
  // stay aligned with the image's loading band. Purely visual — data coords (and
  // therefore drag/collision math) are unchanged.
  const truckBackdrop = useMemo(() => {
    if (!truck || truck.length <= 0) {
      return { backgroundSize: "100% auto" as const, sceneOffset: { x: 0, y: 0 } };
    }
    const k = truck.length / TRUCK_BACKGROUND_LOAD_WIDTH;
    const width = Math.round(TRUCK_BACKGROUND_IMAGE_WIDTH * k);
    const left = Math.round(truck.x - TRUCK_BACKGROUND_LOAD_X * k);
    const top = Math.round(truck.y - TRUCK_BACKGROUND_LOAD_Y * k);
    return {
      backgroundSize: `${width}px 344px` as const,
      sceneOffset: { x: -left, y: -top },
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
        backgroundSize: truckBackdrop.backgroundSize,
        backgroundPosition: "0px 0px",
        backgroundRepeat: "no-repeat",
      }}>
      {/* Grid overlay */}
      <GridOverlay width={canvasWidth} height={canvasHeight} gridSize={GRID_SIZE} />

      {/* Truck boundary + cargo shift with the backdrop image (visual only) */}
      <div style={{ transform: `translate(${truckBackdrop.sceneOffset.x}px, ${truckBackdrop.sceneOffset.y}px)` }}>
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
      </div>

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
        placedInstances={placedInstances}
        numberStart={numberStart}
        onAddCargo={(cargo: CargoItem) => {
          addItem({
            ...cargo,
            x: DEFAULT_ADD_POSITION_X,
            y: DEFAULT_ADD_POSITION_Y,
          });
        }}
        onRemoveCargo={(baseId: string) => {
          removeItem(baseId);
        }}
      />

      {/* Cargo cards on canvas — same visual shift as the truck frame */}
      <div style={{ transform: `translate(${truckBackdrop.sceneOffset.x}px, ${truckBackdrop.sceneOffset.y}px)` }}>
        {items.map((item) => (
          <CargoCard
            key={item.id}
            item={item}
            number={(numberStart.get(fromCargoId(item.id)) ?? 0) + getCargoInstanceIndex(item.id) + 1}
            isActive={activeItemId === item.id}
            selectedIds={selectedIds}
            hasError={getItemErrors(item.id).length > 0}
            scale={scale}
            onMouseDown={(e) => handleMouseDown(e, item.id)}
            onRotate={handleRotate}
            isPopupOpen={popupItemId === item.id}
            onTogglePopup={() => handleTogglePopup(item.id)}
            canvasWidth={canvasWidth}
          />
        ))}
      </div>
    </div>
  );
};

export default LoadingCanvasView;
