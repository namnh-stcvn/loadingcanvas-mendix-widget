import type { FC } from "react";
import type { CargoItem } from "../viewModels/CargoItem";

interface PalletListProps {
  pallets: CargoItem[]; // Cargo items available to drag onto canvas
  onAddPallet: (pallet: CargoItem) => void; // Called when pallet is dragged onto canvas
}

// PalletList — debug view showing available cargo items draggable onto canvas
export const PalletList: FC<PalletListProps> = ({ pallets, onAddPallet }) => {
  if (pallets.length === 0) {
    return (
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 10,
          padding: "4px 8px",
          background: "rgba(255, 255, 255, 0.8)",
          border: "1px solid #ddd",
          borderRadius: 4,
          fontSize: 12,
          color: "#666",
        }}>
        No pallets available
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: 10,
        left: 10,
        display: "flex",
        gap: 8,
        padding: "8px 12px",
        background: "rgba(255, 255, 255, 0.9)",
        border: "1px solid #ddd",
        borderRadius: 4,
        zIndex: 1000,
      }}>
      {pallets.map((pallet) => (
        <div
          key={pallet.id}
          draggable
          onDragStart={(e) => {
            // Set the pallet ID as drag data
            e.dataTransfer.setData("text/plain", pallet.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          onClick={() => onAddPallet(pallet)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            cursor: "grab",
            userSelect: "none",
          }}
          title={`Drag ${pallet.name} onto canvas`}>
          <div
            style={{
              width: 40,
              height: 40,
              backgroundColor: pallet.color,
              border: "2px solid #333",
              borderRadius: 4,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 8,
              color: "#fff",
              fontWeight: "bold",
            }}>
            {pallet.type === "pallet" ? "📦" : "📦"}
          </div>
          <span style={{ fontSize: 10, marginTop: 2, color: "#333" }}>{pallet.name}</span>
          <span style={{ fontSize: 8, color: "#666" }}>
            {pallet.length}×{pallet.width}
          </span>
        </div>
      ))}
    </div>
  );
};
