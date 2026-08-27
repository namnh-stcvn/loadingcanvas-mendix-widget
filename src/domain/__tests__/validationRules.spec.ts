import { describe, it, expect } from "@jest/globals";
import { validateItem, validateLoadMeters, validateAll } from "../validationRules";
import type { CargoItem } from "../../viewModels/CargoItem";

describe("validationRules", () => {
  const bounds = { x: 0, y: 0, length: 1000, width: 600 };

  describe("validateItem", () => {
    it("should return valid when item is inside bounds and no overlaps", () => {
      const item = { x: 100, y: 100, length: 50, width: 50 };
      const others: Array<typeof item> = [];
      const result = validateItem(item, bounds, others);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    it("should return OUT_OF_BOUNDS when item exceeds right boundary", () => {
      const item = { x: 980, y: 100, length: 50, width: 50 };
      const result = validateItem(item, bounds, []);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OUT_OF_BOUNDS");
    });

    it("should return OUT_OF_BOUNDS when item exceeds bottom boundary", () => {
      const item = { x: 100, y: 580, length: 50, width: 50 };
      const result = validateItem(item, bounds, []);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OUT_OF_BOUNDS");
    });

    it("should return OUT_OF_BOUNDS when item is outside left boundary", () => {
      const item = { x: -10, y: 100, length: 50, width: 50 };
      const result = validateItem(item, bounds, []);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OUT_OF_BOUNDS");
    });

    it("should return OUT_OF_BOUNDS when item is outside top boundary", () => {
      const item = { x: 100, y: -10, length: 50, width: 50 };
      const result = validateItem(item, bounds, []);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OUT_OF_BOUNDS");
    });

    it("should return OVERLAP when item overlaps another item", () => {
      const item = { x: 100, y: 100, length: 50, width: 50 };
      const others = [{ x: 120, y: 120, length: 50, width: 50 }];
      const result = validateItem(item, bounds, others);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OVERLAP");
    });

    it("should return both OUT_OF_BOUNDS and OVERLAP when both conditions are met", () => {
      const item = { x: 980, y: 580, length: 50, width: 50 };
      const others = [{ x: 990, y: 590, length: 50, width: 50 }];
      const result = validateItem(item, bounds, others);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OUT_OF_BOUNDS");
      expect(result.errors).toContain("OVERLAP");
    });

    it("should return valid when item is at the edge of bounds", () => {
      const item = { x: 0, y: 0, length: 1000, width: 600 };
      const result = validateItem(item, bounds, []);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    it("should return valid when item touches but does not overlap another item", () => {
      const item = { x: 0, y: 0, length: 50, width: 50 };
      const others = [{ x: 50, y: 0, length: 50, width: 50 }];
      const result = validateItem(item, bounds, others);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    it("should account for rotation when checking bounds", () => {
      const item = { x: 950, y: 0, length: 100, width: 10, rotation: 90 as const };
      // Rotated: length=10, width=100 â†’ right=960 (ok), bottom=100 (ok)
      const result = validateItem(item, bounds, []);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    it("should account for rotation when checking overlap", () => {
      const item = { x: 0, y: 0, length: 100, width: 10, rotation: 90 as const };
      const others = [{ x: 0, y: 0, length: 10, width: 100 }];
      // Rotated item: 10 long, 100 wide â€” overlaps with other
      const result = validateItem(item, bounds, others);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OVERLAP");
    });

    it("should handle empty others array", () => {
      const item = { x: 100, y: 100, length: 50, width: 50 };
      const result = validateItem(item, bounds, []);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    it("should account for non-uniform scale when checking rotated bounds", () => {
      const scale = { widthScale: 2, heightScale: 1 };
      const item = { x: 0, y: 0, length: 80, width: 60, rotation: 90 as const };
      // Scale-correct footprint: X = 60*(2/1)=120, Y = 80*(1/2)=40 -> fits height 50.
      // A naive pixel swap would give 60x80 and wrongly report OUT_OF_BOUNDS.
      const result = validateItem(item, { x: 0, y: 0, length: 200, width: 50 }, [], scale);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    it("should account for non-uniform scale when checking rotated overlap", () => {
      const scale = { widthScale: 2, heightScale: 1 };
      const item = { x: 0, y: 0, length: 80, width: 60, rotation: 90 as const };
      // Scale-correct footprint 120x40 overlaps an item starting at x=110
      const others = [{ x: 110, y: 0, length: 20, width: 40 }];
      const result = validateItem(item, bounds, others, scale);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OVERLAP");
    });
  });

  const makeCargo = (id: string, x: number, y: number, length: number, width: number): CargoItem => ({
    id,
    name: id,
    type: "pallet",
    color: "#888888",
    isLocked: false,
    x,
    y,
    length,
    width,
    rotation: 0,
  });

  describe("validateLoadMeters", () => {
    const scale = { widthScale: 100, heightScale: 50 };

    it("should return valid when total load meters are within the limit", () => {
      const items = [makeCargo("a", 0, 0, 1200, 50), makeCargo("b", 500, 0, 800, 50)];
      expect(validateLoadMeters(items, 20, scale)).toEqual({ valid: true, errors: [] });
    });

    it("should return LM_EXCEEDED when total load meters exceed the limit", () => {
      const items = [makeCargo("a", 0, 0, 1300, 50), makeCargo("b", 500, 0, 900, 50)];
      const result = validateLoadMeters(items, 20, scale);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(["LM_EXCEEDED"]);
    });

    it("should treat hitting the limit exactly as valid", () => {
      const items = [makeCargo("a", 0, 0, 2000, 50)];
      expect(validateLoadMeters(items, 20, scale)).toEqual({ valid: true, errors: [] });
    });

    it("should return valid for an empty item list", () => {
      expect(validateLoadMeters([], 10, scale)).toEqual({ valid: true, errors: [] });
    });
  });

  describe("validateAll", () => {
    const fullScale = { widthScale: 100, heightScale: 50 };
    const wideBounds = { x: 0, y: 0, length: 200, width: 200 };

    it("should aggregate geometric errors and per-item error mapping", () => {
      const items = [makeCargo("a", -5, 120, 40, 40), makeCargo("b", 10, 10, 40, 40), makeCargo("c", 30, 30, 40, 40)];
      const result = validateAll(items, wideBounds);
      expect(result.valid).toBe(false);
      expect(result.itemErrors?.a).toContain("OUT_OF_BOUNDS");
      expect(result.itemErrors?.b).toContain("OVERLAP");
      expect(result.itemErrors?.c).toContain("OVERLAP");
      expect(result.errors).toContain("OUT_OF_BOUNDS");
      expect(result.errors.filter((e) => e === "OVERLAP")).toHaveLength(2);
    });

    it("should be valid for a clean configuration within bounds, no overlaps, LM ok", () => {
      const items = [makeCargo("a", 0, 0, 60, 40), makeCargo("b", 120, 0, 60, 40)];
      const result = validateAll(items, wideBounds, {
        maxLoadMeters: 20,
        scale: fullScale,
      });
      expect(result).toEqual({ valid: true, errors: [], itemErrors: {} });
    });

    it("should skip the LM check when maxLoadMeters is not provided", () => {
      const items = [makeCargo("a", 0, 0, 150, 40)];
      const result = validateAll(items, wideBounds, { scale: fullScale });
      expect(result).toEqual({ valid: true, errors: [], itemErrors: {} });
    });

    it("should skip the LM check when scale is not provided", () => {
      const items = [makeCargo("a", 0, 0, 150, 40)];
      const result = validateAll(items, wideBounds, { maxLoadMeters: 10 });
      expect(result).toEqual({ valid: true, errors: [], itemErrors: {} });
    });

    it("should report LM_EXCEEDED once for otherwise-clean items over the limit", () => {
      const items = [makeCargo("a", 0, 0, 130, 40), makeCargo("b", 0, 80, 90, 40)];
      const result = validateAll(items, wideBounds, {
        maxLoadMeters: 1,
        scale: fullScale,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(["LM_EXCEEDED"]);
      expect(result.itemErrors).toEqual({});
    });
  });
});
