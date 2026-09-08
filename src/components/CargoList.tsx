import React, { useCallback, type DragEvent } from "react";
import type { CargoItem } from "../viewModels/CargoItem";
import { fromCargoId } from "../domain/cargoIdentity";

import {
  CARGO_LIST_PANEL_BOTTOM,
  CARGO_LIST_PANEL_LEFT,
  CARGO_LIST_PANEL_PADDING,
  CARGO_LIST_PANEL_PADDING_LIST,
  CARGO_LIST_PANEL_BG_EMPTY,
  CARGO_LIST_PANEL_BG_LIST,
  CARGO_LIST_PANEL_BORDER,
  CARGO_LIST_PANEL_BORDER_RADIUS,
  CARGO_LIST_PANEL_FONT_SIZE,
  CARGO_LIST_PANEL_COLOR,
  CARGO_LIST_PANEL_GAP,
  CARGO_LIST_CHIP_WIDTH,
  CARGO_LIST_CHIP_HEIGHT,
  CARGO_LIST_CHIP_BORDER,
  CARGO_LIST_CHIP_BORDER_RADIUS,
  CARGO_LIST_Z_INDEX,
} from "../constants/cargoList";

const SINGLE_DRAG_PREFIX = "single:";

interface CargoListProps {
  availableItems: CargoItem[];
  onAddCargo: (cargo: CargoItem) => void;
  onRemoveCargo?: (baseId: string) => void;
  placedCounts: Map<string, number>;
}

export const CargoList = React.memo<CargoListProps>(({ availableItems, onAddCargo, onRemoveCargo, placedCounts }) => {
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const baseId = e.dataTransfer.getData("text/plain");
      if (baseId && onRemoveCargo) {
        onRemoveCargo(fromCargoId(baseId));
      }
    },
    [onRemoveCargo]
  );

  const expandedItems: { cargo: CargoItem; instanceIndex: number }[] = [];
  for (const cargo of availableItems) {
    const quantity = cargo.quantity ?? 1;
    const placed = placedCounts.get(fromCargoId(cargo.id)) ?? 0;
    const remaining = Math.max(0, quantity - placed);
    for (let i = 0; i < remaining; i++) {
      expandedItems.push({ cargo, instanceIndex: i });
    }
  }

  if (expandedItems.length === 0) {
    return (
      <div
        style={{
          position: "absolute",
          bottom: CARGO_LIST_PANEL_BOTTOM,
          left: CARGO_LIST_PANEL_LEFT,
          padding: CARGO_LIST_PANEL_PADDING,
          background: CARGO_LIST_PANEL_BG_EMPTY,
          border: CARGO_LIST_PANEL_BORDER,
          borderRadius: CARGO_LIST_PANEL_BORDER_RADIUS,
          fontSize: CARGO_LIST_PANEL_FONT_SIZE,
          color: CARGO_LIST_PANEL_COLOR,
        }}>
        No cargo items available
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: CARGO_LIST_PANEL_BOTTOM,
        left: CARGO_LIST_PANEL_LEFT,
        display: "flex",
        gap: CARGO_LIST_PANEL_GAP,
        padding: CARGO_LIST_PANEL_PADDING_LIST,
        background: CARGO_LIST_PANEL_BG_LIST,
        border: CARGO_LIST_PANEL_BORDER,
        borderRadius: CARGO_LIST_PANEL_BORDER_RADIUS,
        zIndex: CARGO_LIST_Z_INDEX,
        flexWrap: "wrap",
        maxWidth: "90%",
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}>
      {expandedItems.map(({ cargo, instanceIndex }) => (
        <div
          key={`${cargo.id}-${instanceIndex}`}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", `${SINGLE_DRAG_PREFIX}${cargo.id}`);
            e.dataTransfer.effectAllowed = "move";
          }}
          onClick={() => onAddCargo({ ...cargo, quantity: 1 })}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            cursor: "grab",
            userSelect: "none",
          }}
          title={"Drag " + cargo.name + " onto canvas"}>
          <div
            style={{
              width: CARGO_LIST_CHIP_WIDTH,
              height: CARGO_LIST_CHIP_HEIGHT,
              backgroundColor: cargo.color,
              border: CARGO_LIST_CHIP_BORDER,
              borderRadius: CARGO_LIST_CHIP_BORDER_RADIUS,
              boxSizing: "border-box",
            }}
          />
        </div>
      ))}
    </div>
  );
});
