import type { FC, MouseEvent } from "react";

interface RotationHandleProps {
  onMouseDown: (e: MouseEvent<HTMLDivElement>) => void;
}

export const RotationHandle: FC<RotationHandleProps> = ({ onMouseDown }) => {
  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        top: 4,
        left: "50%",
        transform: "translateX(-50%)",
        width: 16,
        height: 16,
        backgroundColor: "transparent",
        borderRadius: "50%",
        cursor: "grab",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#4a90d9",
        fontSize: 16,
        fontWeight: "bold",
        border: "2px solid #4a90d9",
        boxShadow: "none",
        zIndex: 10,
      }}
      title="Rotate">
      ↻
    </div>
  );
};
