import React from "react";

import type { CargoItem } from "../viewModels/CargoItem";

import { getRotatedSize } from "../domain/rotationRules";

import { RotationHandle } from "./RotationHandle";

import {
    CARD_ACTIVE_BORDER_WIDTH,
    CARD_BORDER_WIDTH,
    CARD_SELECTED_BORDER_WIDTH,
    CARD_BORDER_COLOR,
    CARD_ACTIVE_BORDER_COLOR,
    CARD_SELECTED_BORDER_COLOR
} from "../constants/card";

interface CargoCardProps {
    item: CargoItem;

    isActive: boolean;

    selectedIds: string[];

    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;

    onRotate: (itemId: string) => void;

    hasError: boolean;
}

export const CargoCard: React.FC<CargoCardProps> = ({
    item,
    isActive,
    selectedIds,
    onMouseDown,
    onRotate,
    hasError
}) => {
    const size = getRotatedSize(
        {
            width: item.width,
            height: item.height
        },
        item.rotation
    );

    const isSelected = selectedIds.includes(item.id);

    const borderColor = hasError ? "#ff4444" : CARD_BORDER_COLOR;

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

                top: item.y
            }}
        >
            <div
                data-id={item.id}
                onMouseDown={onMouseDown}
                style={{
                    width: size.width,

                    height: size.height,

                    backgroundColor: item.color,

                    cursor: item.isLocked ? "not-allowed" : "move",

                    userSelect: "none",

                    border,

                    boxSizing: "border-box"
                }}
            />

            <div
                style={{
                    position: "absolute",

                    top: size.height + 4,

                    left: 0,

                    whiteSpace: "nowrap",

                    fontSize: 12,

                    pointerEvents: "none"
                }}
            >
                {item.name}
                <br />
                id: {item.id}
                <br />
                pos: ({item.x}, {item.y})
                <br />
                size: {item.width} × {item.height}
                <br />
                rotation: {item.rotation}°{item.heightM && <br />}
                {item.heightM && `height: ${item.heightM}m`}
                {item.weightKg && <br />}
                {item.weightKg && `weight: ${item.weightKg}kg`}
            </div>

            <RotationHandle
                onMouseDown={e => {
                    e.stopPropagation();
                    onRotate(item.id);
                }}
            />
        </div>
    );
};
