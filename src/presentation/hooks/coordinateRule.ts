// Converts a browser client coordinate to a canvas-relative coordinate.
// Lives at the hook layer: it depends on the DOM, so it must not sit in domain/.
import type { Point } from "../../core/types/geometry";

export const getCanvasPoint = (canvas: HTMLDivElement | null, clientX: number, clientY: number): Point => {
  if (!canvas) {
    return { x: 0, y: 0 };
  }
  const rect = canvas.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
};
