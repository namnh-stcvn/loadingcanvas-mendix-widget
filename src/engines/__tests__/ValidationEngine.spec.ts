import { describe, it, expect } from "@jest/globals";
import { ValidationEngine } from "../ValidationEngine";
import type { CargoItem } from "../../viewModels/CargoItem";

describe("ValidationEngine", () => {
  const bounds = { x: 0, y: 0, width: 1000, height: 600 };

  const createCargoItem = (overrides: Partial<CargoItem> = {}): CargoItem => ({
    id: "item1",
    x: 100,
    y: 100,
    width: 50,
    height: 50,
    rotation: 0,
    name: "Test Item",
    type: "pallet",
    color: "red",
    isLocked: false,
    ...overrides,
  });

  describe("validateItems", () => {
    it("should return valid when all items are within bounds and non-overlapping", () => {
      const engine = new ValidationEngine();
      const items = [
        createCargoItem({ id: "item1", x: 100, y: 100 }),
        createCargoItem({ id: "item2", x: 200, y: 200 }),
      ];
      const result = engine.validateItems(items, bounds);
      expect(result).toEqual({ valid: true, errors: [], itemErrors: {} });
    });

    it("should return invalid when an item is out of bounds", () => {
      const engine = new ValidationEngine();
      const items = [createCargoItem({ id: "item1", x: 980, y: 100 })];
      const result = engine.validateItems(items, bounds);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OUT_OF_BOUNDS");
    });

    it("should return invalid when items overlap", () => {
      const engine = new ValidationEngine();
      const items = [
        createCargoItem({ id: "item1", x: 100, y: 100 }),
        createCargoItem({ id: "item2", x: 120, y: 120 }),
      ];
      const result = engine.validateItems(items, bounds);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OVERLAP");
    });

    it("should return the first invalid result", () => {
      const engine = new ValidationEngine();
      const items = [
        createCargoItem({ id: "item1", x: 100, y: 100 }),
        createCargoItem({ id: "item2", x: 980, y: 100 }),
        createCargoItem({ id: "item3", x: 500, y: 500 }),
      ];
      const result = engine.validateItems(items, bounds);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OUT_OF_BOUNDS");
    });

    it("should return valid when items list is empty", () => {
      const engine = new ValidationEngine();
      const result = engine.validateItems([], bounds);
      expect(result).toEqual({ valid: true, errors: [], itemErrors: {} });
    });

    it("should return valid when single item is within bounds", () => {
      const engine = new ValidationEngine();
      const items = [createCargoItem({ id: "item1", x: 100, y: 100 })];
      const result = engine.validateItems(items, bounds);
      expect(result).toEqual({ valid: true, errors: [], itemErrors: {} });
    });

    it("should account for rotation when validating bounds", () => {
      const engine = new ValidationEngine();
      const items = [createCargoItem({ id: "item1", x: 950, y: 0, width: 100, height: 10, rotation: 90 })];
      const result = engine.validateItems(items, bounds);
      expect(result).toEqual({ valid: true, errors: [], itemErrors: {} });
    });

    it("should detect overlap with rotated items", () => {
      const engine = new ValidationEngine();
      const items = [
        createCargoItem({ id: "item1", x: 0, y: 0, width: 100, height: 10, rotation: 90 }),
        createCargoItem({ id: "item2", x: 0, y: 0, width: 10, height: 100 }),
      ];
      const result = engine.validateItems(items, bounds);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OVERLAP");
    });
  });
});
