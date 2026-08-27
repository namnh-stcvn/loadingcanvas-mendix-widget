import type { FC } from "react";
import type { CargoItem } from "../viewModels/CargoItem";

interface CargoListProps {
  availableItems: CargoItem[]; // Cargo items available to drag onto canvas
  onAddCargo: (cargo: CargoItem) => void; // Called when cargo is dragged onto canvas
}

// CargoList — debug view showing available cargo items draggable onto canvas
export const CargoList: FC<CargoListProps> = ({ availableItems, onAddCargo }) => {
  if (availableItems.length === 0) {
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
        No cargo items available
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
      {availableItems.map((cargo) => (
        <div
          key={cargo.id}
          draggable
          onDragStart={(e) => {
            // Set the cargo ID as drag data
            e.dataTransfer.setData("text/plain", cargo.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          onClick={() => onAddCargo(cargo)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            cursor: "grab",
            userSelect: "none",
          }}
          title={`Drag ${cargo.name} onto canvas`}>
          <div
            style={{
              width: 40,
              height: 40,
              backgroundColor: cargo.color,
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
            {cargo.type === "pallet" ? "📦" : "🟦"}
          </div>
          <span style={{ fontSize: 10, marginTop: 2, color: "#333" }}>{cargo.name}</span>
          {/* <span style={{ fontSize: 8, color: "#666" }}>
            {cargo.length.toFixed(2)}×{cargo.width.toFixed(2)}
          </span> */}
        </div>
      ))}
    </div>
  );
};
