import { describe, it, expect } from "@jest/globals";
import { validateItem, validateLoadMeters, validateAll } from "../validationRules";
import type { CargoItem } from "../../../core/types/viewModels/CargoItem";

describe("validationRules", () => {
  const bounds = { x: 0, y: 0, length: 1000, width: 600 };

  describe("validateItem", () => {
    it("should return valid when item is inside bounds and no overlaps", () => {
      const item = { x: 100, y: 100, length: 50, width: 50 };
      const result = validateItem(item, bounds, [], -1);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    it("should return OUT_OF_BOUNDS when item exceeds right boundary", () => {
      const item = { x: 980, y: 100, length: 50, width: 50 };
      const result = validateItem(item, bounds, [], -1);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OUT_OF_BOUNDS");
    });

    it("should return OUT_OF_BOUNDS when item exceeds bottom boundary", () => {
      const item = { x: 100, y: 580, length: 50, width: 50 };
      const result = validateItem(item, bounds, [], -1);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OUT_OF_BOUNDS");
    });

    it("should return OUT_OF_BOUNDS when item is outside left boundary", () => {
      const item = { x: -10, y: 100, length: 50, width: 50 };
      const result = validateItem(item, bounds, [], -1);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OUT_OF_BOUNDS");
    });

    it("should return OUT_OF_BOUNDS when item is outside top boundary", () => {
      const item = { x: 100, y: -10, length: 50, width: 50 };
      const result = validateItem(item, bounds, [], -1);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OUT_OF_BOUNDS");
    });

    it("should return OVERLAP when item overlaps another item", () => {
      const item = { x: 100, y: 100, length: 50, width: 50 };
      const others = [{ x: 120, y: 120, length: 50, width: 50 }];
      const allItems = [item, ...others];
      const result = validateItem(item, bounds, allItems, 0);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OVERLAP");
    });

    it("should return both OUT_OF_BOUNDS and OVERLAP when both conditions are met", () => {
      const item = { x: 980, y: 580, length: 50, width: 50 };
      const others = [{ x: 990, y: 590, length: 50, width: 50 }];
      const allItems = [item, ...others];
      const result = validateItem(item, bounds, allItems, 0);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OUT_OF_BOUNDS");
      expect(result.errors).toContain("OVERLAP");
    });

    it("should return valid when item is at the edge of bounds", () => {
      const item = { x: 0, y: 0, length: 1000, width: 600 };
      const result = validateItem(item, bounds, [], -1);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    it("should return valid when item touches but does not overlap another item", () => {
      const item = { x: 0, y: 0, length: 50, width: 50 };
      const others = [{ x: 50, y: 0, length: 50, width: 50 }];
      const allItems = [item, ...others];
      const result = validateItem(item, bounds, allItems, 0);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    it("should account for rotation when checking bounds", () => {
      const item = { x: 950, y: 0, length: 100, width: 10, rotation: 90 as const };
      // Rotated: length=10, width=100 -> right=960 (ok), bottom=100 (ok)
      const result = validateItem(item, bounds, [], -1);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    it("should account for rotation when checking overlaps", () => {
      const item = { x: 0, y: 0, length: 100, width: 10, rotation: 90 as const };
      // Rotated: length=10, width=100
      const others = [{ x: 5, y: 0, length: 10, width: 100 }];
      const allItems = [item, ...others];
      const result = validateItem(item, bounds, allItems, 0);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OVERLAP");
    });

    it("should use the axis scale to project the rotated footprint", () => {
      const scale = { widthScale: 2, heightScale: 1 };
      const item = { x: 0, y: 0, length: 80, width: 60, rotation: 90 as const };
      // Scale-correct footprint: 120x40 -> overlaps an item starting at x=110
      const others = [{ x: 110, y: 0, length: 20, width: 40 }];
      const allItems = [item, ...others];
      const result = validateItem(item, bounds, allItems, 0, scale);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OVERLAP");
    });
  });

  describe("validateLoadMeters", () => {
    const scale = { widthScale: 100, heightScale: 100 };
    const makeCargo = (
      id: string,
      x: number,
      y: number,
      length: number,
      width: number,
      rotation: 0 | 90 | 180 | 270 = 0
    ): CargoItem => ({
      id,
      name: id,
      x,
      y,
      length,
      width,
      rotation,
      type: "pallet",
      color: "orange",
      isLocked: false,
    });

    it("should return valid when total length is within limit", () => {
      const items = [makeCargo("a", 0, 0, 100, 50), makeCargo("b", 100, 0, 100, 50)];
      expect(validateLoadMeters(items, 20, scale)).toEqual({ valid: true, errors: [] });
    });

    it("should return LM_EXCEEDED when total length exceeds limit", () => {
      const items = [makeCargo("a", 0, 0, 100, 50), makeCargo("b", 100, 0, 100, 50)];
      // 2 x 100px at 100 px/m = 2m total; 1.5m limit is exceeded
      expect(validateLoadMeters(items, 1.5, scale)).toEqual({ valid: false, errors: ["LM_EXCEEDED"] });
    });

    it("should return valid for an empty item list", () => {
      expect(validateLoadMeters([], 10, scale)).toEqual({ valid: true, errors: [] });
    });

    it("should count only the rotated X-extent for a 90 degree item", () => {
      const uniform = { widthScale: 100, heightScale: 100 };
      const rotated = makeCargo("a", 0, 0, 120, 80, 90);
      expect(validateLoadMeters([rotated], 1, uniform)).toEqual({ valid: true, errors: [] });
      expect(validateLoadMeters([rotated], 0.79, uniform)).toEqual({
        valid: false,
        errors: ["LM_EXCEEDED"],
      });
    });

    it("should count the rotated X-extent for a 270 degree item", () => {
      const uniform = { widthScale: 100, heightScale: 100 };
      const rotated = makeCargo("a", 0, 0, 120, 80, 270);
      expect(validateLoadMeters([rotated], 1, uniform)).toEqual({ valid: true, errors: [] });
      expect(validateLoadMeters([rotated], 0.79, uniform)).toEqual({
        valid: false,
        errors: ["LM_EXCEEDED"],
      });
    });

    it("should sum the rotated X-extents of multiple rotated items correctly", () => {
      const uniform = { widthScale: 100, heightScale: 100 };
      const items = [makeCargo("a", 0, 0, 120, 80, 90), makeCargo("b", 200, 0, 120, 80, 90)];
      expect(validateLoadMeters(items, 1.6, uniform)).toEqual({ valid: true, errors: [] });
      expect(validateLoadMeters(items, 1.59, uniform)).toEqual({
        valid: false,
        errors: ["LM_EXCEEDED"],
      });
    });
  });

  describe("validateAll", () => {
    const fullScale = { widthScale: 100, heightScale: 50 };
    const wideBounds = { x: 0, y: 0, length: 200, width: 200 };
    const makeCargo = (
      id: string,
      x: number,
      y: number,
      length: number,
      width: number,
      rotation: 0 | 90 | 180 | 270 = 0
    ): CargoItem => ({
      id,
      name: id,
      x,
      y,
      length,
      width,
      rotation,
      type: "pallet",
      color: "orange",
      isLocked: false,
    });

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
