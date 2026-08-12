import { describe, it, expect } from "@jest/globals";
import { rotate90, isVerticalRotation, getRotatedSize } from "../rotationRules";

describe("rotationRules", () => {
  describe("rotate90", () => {
    it("should rotate 0 to 90", () => {
      expect(rotate90(0)).toBe(90);
    });

    it("should rotate 90 to 180", () => {
      expect(rotate90(90)).toBe(180);
    });

    it("should rotate 180 to 270", () => {
      expect(rotate90(180)).toBe(270);
    });

    it("should rotate 270 to 0 (wraps around)", () => {
      expect(rotate90(270)).toBe(0);
    });
  });

  describe("isVerticalRotation", () => {
    it("should return true for 90 degrees", () => {
      expect(isVerticalRotation(90)).toBe(true);
    });

    it("should return true for 270 degrees", () => {
      expect(isVerticalRotation(270)).toBe(true);
    });

    it("should return false for 0 degrees", () => {
      expect(isVerticalRotation(0)).toBe(false);
    });

    it("should return false for 180 degrees", () => {
      expect(isVerticalRotation(180)).toBe(false);
    });
  });

  describe("getRotatedSize", () => {
    const size = { width: 100, height: 50 };

    it("should return original size for 0 degrees", () => {
      expect(getRotatedSize(size, 0)).toEqual({ width: 100, height: 50 });
    });

    it("should swap width and height for 90 degrees", () => {
      expect(getRotatedSize(size, 90)).toEqual({ width: 50, height: 100 });
    });

    it("should return original size for 180 degrees", () => {
      expect(getRotatedSize(size, 180)).toEqual({ width: 100, height: 50 });
    });

    it("should swap width and height for 270 degrees", () => {
      expect(getRotatedSize(size, 270)).toEqual({ width: 50, height: 100 });
    });

    it("should not mutate the original size object", () => {
      const original = { width: 100, height: 50 };
      getRotatedSize(original, 90);
      expect(original).toEqual({ width: 100, height: 50 });
    });

    it("should handle square items (swap has no visible effect)", () => {
      const square = { width: 50, height: 50 };
      expect(getRotatedSize(square, 90)).toEqual({ width: 50, height: 50 });
    });
  });
});
