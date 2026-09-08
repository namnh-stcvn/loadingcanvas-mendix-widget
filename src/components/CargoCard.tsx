import React, { useState, type MouseEvent as ReactMouseEvent } from "react";

import type { CargoItem } from "../viewModels/CargoItem";

import { DEFAULT_AXIS_SCALE, getRotatedScreenSize, type AxisScale } from "../domain/rotationRules";
import { CARGO_LIST_CHIP_COLOR, CARGO_LIST_CHIP_FONT_WEIGHT } from "../constants/cargoList";

import { RotationHandle } from "./RotationHandle";
import { CargoTooltip } from "./CargoTooltip";
import { CargoPopup, POPUP_MAX_WIDTH, POPUP_MARGIN_OFFSET } from "./CargoPopup";

import {
  CARD_ACTIVE_BORDER_WIDTH,
  CARD_BORDER_WIDTH,
  CARD_SELECTED_BORDER_WIDTH,
  CARD_BORDER_COLOR,
  CARD_ACTIVE_BORDER_COLOR,
  CARD_SELECTED_BORDER_COLOR,
  CARD_ERROR_BORDER_COLOR,
} from "../constants/card";

export const computePopupSide = (cardX: number, cardWidth: number, canvasWidth: number): "left" | "right" => {
  const spaceRight = canvasWidth - (cardX + cardWidth);
  return spaceRight >= POPUP_MAX_WIDTH + POPUP_MARGIN_OFFSET ? "right" : "left";
};

interface CargoCardProps {
  item: CargoItem;

  isActive: boolean;

  selectedIds: string[];

  onMouseDown: (e: ReactMouseEvent<HTMLDivElement>) => void;

  onRotate: (itemId: string) => void;

  isPopupOpen: boolean;

  onTogglePopup: () => void;

  canvasWidth: number;

  hasError: boolean;

  number: number;

  scale?: AxisScale;
}

export const CargoCard = React.memo<CargoCardProps>(
  ({
    item,
    isActive,
    selectedIds,
    onMouseDown,
    onRotate,
    isPopupOpen,
    onTogglePopup,
    canvasWidth,
    hasError,
    number,
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

    const popupSide = computePopupSide(item.x, size.length, canvasWidth);

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
          onDoubleClick={onTogglePopup}
          draggable={!item.isLocked}
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", `single:${item.id}`);
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
          <span
            style={{
              fontSize: Math.min(28, Math.min(size.length, size.width) * 0.3),
              color: CARGO_LIST_CHIP_COLOR,
              fontWeight: CARGO_LIST_CHIP_FONT_WEIGHT,
              lineHeight: 1,
            }}>
            {number}
          </span>
        </div>

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
            side={popupSide}
          />
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.x === next.item.x &&
    prev.item.y === next.item.y &&
    prev.item.rotation === next.item.rotation &&
    prev.isActive === next.isActive &&
    prev.isPopupOpen === next.isPopupOpen &&
    prev.hasError === next.hasError &&
    prev.number === next.number &&
    prev.selectedIds.length === next.selectedIds.length &&
    prev.selectedIds.every((id, i) => id === next.selectedIds[i]) &&
    prev.scale?.widthScale === next.scale?.widthScale &&
    prev.scale?.heightScale === next.scale?.heightScale
);
