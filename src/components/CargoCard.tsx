import React from "react";

import type { CargoItem } from "../viewModels/CargoItem";

import { DEFAULT_AXIS_SCALE, getRotatedScreenSize, type AxisScale } from "../domain/rotationRules";

import { RotationHandle } from "./RotationHandle";

import {
  CARD_ACTIVE_BORDER_WIDTH,
  CARD_BORDER_WIDTH,
  CARD_SELECTED_BORDER_WIDTH,
  CARD_BORDER_COLOR,
  CARD_ACTIVE_BORDER_COLOR,
  CARD_SELECTED_BORDER_COLOR,
  CARD_ERROR_BORDER_COLOR,
} from "../constants/card";

interface CargoCardProps {
  item: CargoItem;

  isActive: boolean;

  selectedIds: string[];

  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;

  onRotate: (itemId: string) => void;

  hasError: boolean;

  scale?: AxisScale;
}

export const CargoCard: React.FC<CargoCardProps> = ({
  item,
  isActive,
  selectedIds,
  onMouseDown,
  onRotate,
  hasError,
  scale = DEFAULT_AXIS_SCALE,
}) => {
  const size = getRotatedScreenSize(
    {
      length: item.length,
      width: item.width,
    },
    item.rotation,
    scale
  );

  const isSelected = selectedIds.includes(item.id);

  const borderColor = hasError ? CARD_ERROR_BORDER_COLOR : CARD_BORDER_COLOR;

  const border = isActive
    ? `${CARD_ACTIVE_BORDER_WIDTH}px solid ${CARD_ACTIVE_BORDER_COLOR}`
    : isSelected
      ? `${CARD_SELECTED_BORDER_WIDTH}px solid ${CARD_SELECTED_BORDER_COLOR}`
      : `${CARD_BORDER_WIDTH}px solid ${borderColor}`;

  return (
    <div
      style={{
        position: "absolute",

        left: item.x,

        top: item.y,
      }}>
      <div
        data-id={item.id}
        onMouseDown={onMouseDown}
        style={{
          width: size.length,

          height: size.width,

          backgroundColor: item.color,

          cursor: item.isLocked ? "not-allowed" : "move",

          userSelect: "none",

          border,

          boxSizing: "border-box",
        }}
      />

      {/* <div
        style={{
          position: "absolute",

          top: size.width + 4,

          left: 0,

          whiteSpace: "nowrap",

          fontSize: 12,

          pointerEvents: "none",
        }}>
        {item.name}
        <br />
        id: {item.id}
        <br />
        pos: ({item.x}, {item.y})
        <br />
        size: {item.length.toFixed(2)} × {item.width.toFixed(2)}
        <br />
        rotation: {item.rotation}°{item.lengthM && <br />}
        {item.lengthM && `length: ${item.lengthM}m`}
        {item.widthM && <br />}
        {item.widthM && `width: ${item.widthM}m`}
      </div>
 */}
      <RotationHandle
        onMouseDown={(e) => {
          e.stopPropagation();
          onRotate(item.id);
        }}
      />
    </div>
  );
};
