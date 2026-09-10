import type { FC } from "react";

interface CargoTooltipProps {
  transportOrderNo?: string;
  productName?: string;
}

export const CargoTooltip: FC<CargoTooltipProps> = ({ transportOrderNo, productName }) => {
  if (!transportOrderNo && !productName) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        // Hangs below the card so it never covers the RotationHandle on the
        // card's top edge; pointerEvents: none keeps card hover/drag intact.
        top: "100%",
        marginTop: 8,
        right: "-8px",
        minWidth: 180,
        maxWidth: 280,
        padding: "8px 12px",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        color: "#fff",
        borderRadius: 6,
        fontSize: 12,
        fontFamily: "system-ui, -apple-system, sans-serif",
        lineHeight: 1.4,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        zIndex: 1000,
        pointerEvents: "none",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        overflow: "hidden",
      }}>
      {transportOrderNo && <div style={{ marginBottom: productName ? 4 : 0 }}>Order: {transportOrderNo}</div>}
      {productName && <div>Product: {productName}</div>}
    </div>
  );
};
