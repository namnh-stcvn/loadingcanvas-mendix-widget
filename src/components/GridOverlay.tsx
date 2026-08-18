import { useMemo, type FC } from "react";
import { GRID_SIZE } from "../constants/canvas";

interface GridOverlayProps {
  width: number;
  height: number;
  gridSize?: number;
}

/**
 * GridOverlay — renders a subtle grid pattern on the canvas to visualize
 * the grid snapping. The grid is rendered as a CSS background pattern
 * so it doesn't interfere with drag-and-drop or mouse events.
 */
export const GridOverlay: FC<GridOverlayProps> = ({ width, height, gridSize = GRID_SIZE }) => {
  // Generate a grid background using a canvas element for crisp lines
  const gridImageUrl = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = gridSize;
    canvas.height = gridSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return "";
    }

    ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(gridSize, gridSize);
    ctx.moveTo(gridSize, 0);
    ctx.lineTo(0, gridSize);
    ctx.stroke();

    return canvas.toDataURL();
  }, [gridSize]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        backgroundImage: `url("${gridImageUrl}")`,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
};
