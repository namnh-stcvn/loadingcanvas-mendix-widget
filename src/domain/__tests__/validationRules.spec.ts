import { describe, it, expect } from "@jest/globals";
import { validateItem, type ValidationResult } from "../validationRules";

describe("validationRules", () => {
  const bounds = { x: 0, y: 0, width: 1000, height: 600 };

  describe("validateItem", () => {
    it("should return valid when item is inside bounds and no overlaps", () => {
      const item = { x: 100, y: 100, width: 50, height: 50 };
      const others: (typeof item)[] = [];
      const result = validateItem(item, bounds, others);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    it("should return OUT_OF_BOUNDS when item exceeds right boundary", () => {
      const item = { x: 980, y: 100, width: 50, height: 50 };
      const result = validateItem(item, bounds, []);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OUT_OF_BOUNDS");
    });

    it("should return OUT_OF_BOUNDS when item exceeds bottom boundary", () => {
      const item = { x: 100, y: 580, width: 50, height: 50 };
      const result = validateItem(item, bounds, []);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OUT_OF_BOUNDS");
    });

    it("should return OUT_OF_BOUNDS when item is outside left boundary", () => {
      const item = { x: -10, y: 100, width: 50, height: 50 };
      const result = validateItem(item, bounds, []);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OUT_OF_BOUNDS");
    });

    it("should return OUT_OF_BOUNDS when item is outside top boundary", () => {
      const item = { x: 100, y: -10, width: 50, height: 50 };
      const result = validateItem(item, bounds, []);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OUT_OF_BOUNDS");
    });

    it("should return OVERLAP when item overlaps another item", () => {
      const item = { x: 100, y: 100, width: 50, height: 50 };
      const others = [{ x: 120, y: 120, width: 50, height: 50 }];
      const result = validateItem(item, bounds, others);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OVERLAP");
    });

    it("should return both OUT_OF_BOUNDS and OVERLAP when both conditions are met", () => {
      const item = { x: 980, y: 580, width: 50, height: 50 };
      const others = [{ x: 990, y: 590, width: 50, height: 50 }];
      const result = validateItem(item, bounds, others);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OUT_OF_BOUNDS");
      expect(result.errors).toContain("OVERLAP");
    });

    it("should return valid when item is at the edge of bounds", () => {
      const item = { x: 0, y: 0, width: 1000, height: 600 };
      const result = validateItem(item, bounds, []);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    it("should return valid when item touches but does not overlap another item", () => {
      const item = { x: 0, y: 0, width: 50, height: 50 };
      const others = [{ x: 50, y: 0, width: 50, height: 50 }];
      const result = validateItem(item, bounds, others);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    it("should account for rotation when checking bounds", () => {
      const item = { x: 950, y: 0, width: 100, height: 10, rotation: 90 as const };
      // Rotated: width=10, height=100 â†’ right=960 (ok), bottom=100 (ok)
      const result = validateItem(item, bounds, []);
      expect(result).toEqual({ valid: true, errors: [] });
    });

    it("should account for rotation when checking overlap", () => {
      const item = { x: 0, y: 0, width: 100, height: 10, rotation: 90 as const };
      const others = [{ x: 0, y: 0, width: 10, height: 100 }];
      // Rotated item: 10 wide, 100 tall â€” overlaps with other
      const result = validateItem(item, bounds, others);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OVERLAP");
    });

    it("should handle empty others array", () => {
      const item = { x: 100, y: 100, width: 50, height: 50 };
      const result = validateItem(item, bounds, []);
      expect(result).toEqual({ valid: true, errors: [] });
    });
  });
});
