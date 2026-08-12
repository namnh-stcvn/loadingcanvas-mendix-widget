import { useEffect } from "react";

interface UseMouseEventsProps {
  dragging: boolean;
  moveItems: (e: MouseEvent) => void;
  handleMouseUp: () => void;
  handleCancel: () => void;
}

export const useMouseEvents = ({ dragging, moveItems, handleMouseUp, handleCancel }: UseMouseEventsProps) => {
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (dragging) {
        moveItems(e);
      }
    };

    if (!dragging) {
      return;
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("blur", handleCancel);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("blur", handleCancel);
    };
  }, [dragging, moveItems, handleMouseUp, handleCancel]);
};
