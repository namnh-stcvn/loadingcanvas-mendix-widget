import { describe, it, expect } from "@jest/globals";
import {
  applyPackingUnitData,
  cargoItemToPackingUnitData,
  getCargoItemRect,
  packingTypeFromColor,
  packingUnitToCargoItem,
  resolvePackingType,
  transportOrdersToCargoItems,
} from "../cargoAdapter";
import type { CargoItem } from "../../viewModels/CargoItem";

describe("cargoAdapter", () => {
  const scale = { widthScale: 50, heightScale: 50 };

  describe("packingUnitToCargoItem", () => {
    it("should convert a pallet packing unit to a CargoItem", () => {
      const packingUnit = {
        id: "pu-1",
        name: "Pallet A",
        lengthMeter: 1.2,
        widthMeter: 0.8,
        heightMeter: 1.6,
        packingType: "pallet" as const,
        weightKg: 500,
      };
      const result = packingUnitToCargoItem(packingUnit, scale);
      expect(result.id).toBe("cargo-pu-1");
      expect(result.name).toBe("Pallet A");
      expect(result.width).toBe(60); // 1.2 * 50
      expect(result.height).toBe(40); // 0.8 * 50
      expect(result.color).toBe("orange");
      expect(result.type).toBe("pallet");
      expect(result.heightM).toBe(1.6);
      expect(result.weightKg).toBe(500);
      expect(result.rotation).toBe(0);
      expect(result.isLocked).toBe(false);
    });

    it("should convert a box packing unit to a CargoItem with blue color", () => {
      const packingUnit = {
        id: "pu-2",
        name: "Box B",
        lengthMeter: 1.0,
        widthMeter: 1.0,
        heightMeter: 2.0,
        packingType: "box" as const,
        weightKg: 300,
      };
      const result = packingUnitToCargoItem(packingUnit, scale);
      expect(result.color).toBe("blue");
      expect(result.type).toBe("box");
    });

    it("should use default position when not provided", () => {
      const packingUnit = {
        id: "pu-1",
        name: "Pallet A",
        lengthMeter: 1.2,
        widthMeter: 0.8,
        heightMeter: 1.6,
        packingType: "pallet" as const,
      };
      const result = packingUnitToCargoItem(packingUnit, scale);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it("should use provided position", () => {
      const packingUnit = {
        id: "pu-1",
        name: "Pallet A",
        lengthMeter: 1.2,
        widthMeter: 0.8,
        heightMeter: 1.6,
        packingType: "pallet" as const,
      };
      const result = packingUnitToCargoItem(packingUnit, scale, { x: 100, y: 200 });
      expect(result.x).toBe(100);
      expect(result.y).toBe(200);
    });

    it("should use default name when not provided", () => {
      const packingUnit = {
        id: "pu-1",
        lengthMeter: 1.2,
        widthMeter: 0.8,
        heightMeter: 1.6,
        packingType: "pallet" as const,
      };
      const result = packingUnitToCargoItem(packingUnit, scale);
      expect(result.name).toBe("Cargo pu-1");
    });
  });

  describe("transportOrdersToCargoItems", () => {
    it("should convert a list of transport orders to cargo items", () => {
      const orders = [
        {
          id: "order-1",
          name: "Pallet A",
          packingUnit: {
            id: "pu-1",
            name: "Pallet A",
            lengthMeter: 1.2,
            widthMeter: 0.8,
            heightMeter: 1.6,
            packingType: "pallet" as const,
            weightKg: 500,
          },
        },
        {
          id: "order-2",
          name: "Box B",
          packingUnit: {
            id: "pu-2",
            name: "Box B",
            lengthMeter: 1.0,
            widthMeter: 1.0,
            heightMeter: 2.0,
            packingType: "box" as const,
            weightKg: 300,
          },
        },
      ];
      const result = transportOrdersToCargoItems(orders, scale);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("cargo-pu-1");
      expect(result[1].id).toBe("cargo-pu-2");
    });

    it("should filter out orders without packing units", () => {
      const orders = [
        { id: "order-1", name: "No Packing Unit" },
        {
          id: "order-2",
          name: "Pallet A",
          packingUnit: {
            id: "pu-1",
            name: "Pallet A",
            lengthMeter: 1.2,
            widthMeter: 0.8,
            heightMeter: 1.6,
            packingType: "pallet" as const,
          },
        },
      ];
      const result = transportOrdersToCargoItems(orders, scale);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("cargo-pu-1");
    });

    it("should return empty array for empty input", () => {
      const result = transportOrdersToCargoItems([], scale);
      expect(result).toEqual([]);
    });
  });

  describe("cargoItemToPackingUnitData", () => {
    it("should serialize a CargoItem back to PackingUnitData", () => {
      const item: CargoItem = {
        id: "cargo-pu-1",
        name: "Pallet A",
        x: 100,
        y: 200,
        width: 60,
        height: 40,
        rotation: 0,
        color: "orange",
        type: "pallet",
        isLocked: false,
        heightM: 1.6,
        weightKg: 500,
      };
      const result = cargoItemToPackingUnitData(item, scale.widthScale);
      expect(result.id).toBe("pu-1");
      expect(result.name).toBe("Pallet A");
      expect(result.lengthMeter).toBe(1.2); // 60 / 50
      expect(result.widthMeter).toBe(0.8); // 40 / 50
      expect(result.heightMeter).toBe(1.6);
      expect(result.packingType).toBe("pallet");
      expect(result.weightKg).toBe(500);
    });
  });

  describe("getCargoItemRect", () => {
    it("should return the visual rectangle for a non-rotated item", () => {
      const item: CargoItem = {
        id: "cargo-1",
        name: "Test",
        x: 100,
        y: 200,
        width: 60,
        height: 40,
        rotation: 0,
        color: "red",
        type: "pallet",
        isLocked: false,
      };
      const rect = getCargoItemRect(item);
      expect(rect).toEqual({ x: 100, y: 200, width: 60, height: 40 });
    });

    it("should swap width/height for a 90-degree rotated item", () => {
      const item: CargoItem = {
        id: "cargo-1",
        name: "Test",
        x: 100,
        y: 200,
        width: 60,
        height: 40,
        rotation: 90,
        color: "red",
        type: "pallet",
        isLocked: false,
      };
      const rect = getCargoItemRect(item);
      expect(rect).toEqual({ x: 100, y: 200, width: 40, height: 60 });
    });
  });

  describe("packingTypeFromColor", () => {
    it("should map blue to box", () => {
      expect(packingTypeFromColor("blue")).toBe("box");
      expect(packingTypeFromColor("Blue")).toBe("box");
    });

    it("should map other or missing colors to pallet", () => {
      expect(packingTypeFromColor("orange")).toBe("pallet");
      expect(packingTypeFromColor(undefined)).toBe("pallet");
    });
  });

  describe("resolvePackingType", () => {
    it("should detect box enum values case-insensitively", () => {
      expect(resolvePackingType("Box")).toBe("box");
      expect(resolvePackingType("PALLET")).toBe("pallet");
      expect(resolvePackingType(undefined)).toBe("pallet");
    });
  });

  describe("applyPackingUnitData", () => {
    const baseOrder = {
      id: "order-1",
      name: "Cargo order-1",
      packingUnit: {
        id: "order-1",
        lengthMeter: 1.2,
        widthMeter: 0.8,
        heightMeter: 1.6,
        packingType: "pallet" as const,
        weightKg: 500,
      },
    };

    it("should return the order unchanged when no PackingUnit is linked", () => {
      const result = applyPackingUnitData(baseOrder, null, "Box");
      expect(result).toBe(baseOrder);
    });

    it("should override name, dimensions and packing type from the associated PackingUnit", () => {
      const result = applyPackingUnitData(
        baseOrder,
        { Name: "EU Pallet", Length: 1.4, Width: 1.0, Height: 2.0 },
        "Box"
      );
      expect(result.name).toBe("EU Pallet");
      expect(result.packingUnit?.name).toBe("EU Pallet");
      expect(result.packingUnit?.lengthMeter).toBe(1.4);
      expect(result.packingUnit?.widthMeter).toBe(1.0);
      expect(result.packingUnit?.heightMeter).toBe(2.0);
      expect(result.packingUnit?.packingType).toBe("box");
      // Ids stay based on the TransportOrder so the save flow can restore the association.
      expect(result.id).toBe("order-1");
      expect(result.packingUnit?.id).toBe("order-1");
    });

    it("should keep existing values when the PackingUnit lacks them and prefer its weight", () => {
      const result = applyPackingUnitData(baseOrder, { WeightKg: 750 }, null);
      expect(result.name).toBe("Cargo order-1");
      expect(result.packingUnit?.lengthMeter).toBe(1.2);
      expect(result.packingUnit?.weightKg).toBe(750);
      expect(result.packingUnit?.packingType).toBe("pallet");
    });
  });
});
