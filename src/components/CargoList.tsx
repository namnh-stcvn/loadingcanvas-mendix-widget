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
  CARGO_LIST_CHIP_FONT_SIZE,
  CARGO_LIST_CHIP_COLOR,
  CARGO_LIST_CHIP_FONT_WEIGHT,
  CARGO_LIST_NAME_FONT_SIZE,
  CARGO_LIST_NAME_MARGIN_TOP,
  CARGO_LIST_NAME_COLOR,
  CARGO_LIST_Z_INDEX,
} from "../constants/cargoList";

interface CargoListProps {
  availableItems: CargoItem[];
  onAddCargo: (cargo: CargoItem) => void;
  onRemoveCargo?: (baseId: string) => void;
}

export const CargoList = React.memo<CargoListProps>(({ availableItems, onAddCargo, onRemoveCargo }) => {
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

  if (availableItems.length === 0) {
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
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}>
      {availableItems.map((cargo) => (
        <div
          key={cargo.id}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", cargo.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          onClick={() => onAddCargo(cargo)}
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
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: CARGO_LIST_CHIP_FONT_SIZE,
              color: CARGO_LIST_CHIP_COLOR,
              fontWeight: CARGO_LIST_CHIP_FONT_WEIGHT,
            }}>
            {cargo.quantity ?? 1 /*  + "x " + (cargo.type === "pallet" ? "📦" : "🟦") */}
          </div>
          {/* <span
            style={{
              fontSize: CARGO_LIST_NAME_FONT_SIZE,
              marginTop: CARGO_LIST_NAME_MARGIN_TOP,
              color: CARGO_LIST_NAME_COLOR,
            }}>
            {cargo.name}
          </span> */}
        </div>
      ))}
    </div>
  );
});
