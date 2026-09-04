import React, { useState } from "react";

import type { CargoItem } from "../viewModels/CargoItem";

import { DEFAULT_AXIS_SCALE, getRotatedScreenSize, type AxisScale } from "../domain/rotationRules";
import { fromCargoId } from "../domain/cargoIdentity";

import { RotationHandle } from "./RotationHandle";
import { CargoTooltip } from "./CargoTooltip";
import { CargoPopup } from "./CargoPopup";

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

  const [isHovered, setIsHovered] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  return (
    <div
      style={{
        position: "absolute",

        left: item.x,

        top: item.y,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}>
      <div
        data-id={item.id}
        onMouseDown={onMouseDown}
        onClick={() => setIsPopupOpen((v) => !v)}
        draggable={!item.isLocked}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", fromCargoId(item.id));
          e.dataTransfer.effectAllowed = "move";
        }}
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
      {isHovered && !isPopupOpen && (
        <>
          {!item.isLocked && (
            <RotationHandle
              onMouseDown={(e) => {
                e.stopPropagation();
                onRotate(item.id);
              }}
            />
          )}
          <CargoTooltip transportOrderNo={item.transportOrderNo} productName={item.productName} />
        </>
      )}
      {isPopupOpen && (
        <CargoPopup
          transportOrderNo={item.transportOrderNo}
          productName={item.productName}
          producerName={item.producerName}
          companyFromName={item.companyFromName}
          companyToName={item.companyToName}
        />
      )}
    </div>
  );
};
