import { describe, it, expect } from "@jest/globals";
import {
    packingUnitToCargoItem,
    transportOrdersToCargoItems,
    cargoItemToPackingUnitData,
    getCargoItemRect
} from "../cargoAdapter";
import type { CargoItem } from "../../viewModels/CargoItem";

describe("cargoAdapter", () => {
    const scale = 50;

    describe("packingUnitToCargoItem", () => {
        it("should convert a pallet packing unit to a CargoItem", () => {
            const packingUnit = {
                id: "pu-1",
                name: "Pallet A",
                lengthMeter: 1.2,
                widthMeter: 0.8,
                heightMeter: 1.6,
                packingType: "pallet" as const,
                weightKg: 500
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
                weightKg: 300
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
                packingType: "pallet" as const
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
                packingType: "pallet" as const
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
                packingType: "pallet" as const
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
                        weightKg: 500
                    }
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
                        weightKg: 300
                    }
                }
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
                        packingType: "pallet" as const
                    }
                }
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
                weightKg: 500
            };
            const result = cargoItemToPackingUnitData(item, scale);
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
                isLocked: false
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
                isLocked: false
            };
            const rect = getCargoItemRect(item);
            expect(rect).toEqual({ x: 100, y: 200, width: 40, height: 60 });
        });
    });
});
