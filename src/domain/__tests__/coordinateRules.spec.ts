import { describe, it, expect } from "@jest/globals";
import { getCanvasPoint, meterToPixel, pixelToMeter } from "../coordinateRules";

describe("coordinateRules", () => {
  describe("getCanvasPoint", () => {
    it("should return {0,0} when canvas is null", () => {
      const result = getCanvasPoint(null, 100, 200);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it("should convert client coordinates to canvas-relative coordinates", () => {
      const canvas = document.createElement("div");
      // Mock getBoundingClientRect
      canvas.getBoundingClientRect = () => ({
        left: 100,
        top: 50,
        right: 1100,
        bottom: 650,
        width: 1000,
        height: 600,
        x: 100,
        y: 50,
        toJSON: () => {},
      });

      const result = getCanvasPoint(canvas, 250, 300);
      expect(result).toEqual({ x: 150, y: 250 });
    });

    it("should return client coordinates when canvas is at origin", () => {
      const canvas = document.createElement("div");
      canvas.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        right: 1000,
        bottom: 600,
        width: 1000,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      const result = getCanvasPoint(canvas, 500, 300);
      expect(result).toEqual({ x: 500, y: 300 });
    });

    it("should handle negative client coordinates", () => {
      const canvas = document.createElement("div");
      canvas.getBoundingClientRect = () => ({
        left: 100,
        top: 100,
        right: 1100,
        bottom: 700,
        width: 1000,
        height: 600,
        x: 100,
        y: 100,
        toJSON: () => {},
      });

      const result = getCanvasPoint(canvas, 50, 80);
      expect(result).toEqual({ x: -50, y: -20 });
    });
  });

  describe("meterToPixel", () => {
    it("should convert meters to pixels with scale 1", () => {
      expect(meterToPixel(5, 1)).toBe(5);
    });

    it("should convert meters to pixels with scale 20", () => {
      expect(meterToPixel(5, 20)).toBe(100);
    });

    it("should handle zero meters", () => {
      expect(meterToPixel(0, 20)).toBe(0);
    });

    it("should handle fractional meters", () => {
      expect(meterToPixel(2.5, 20)).toBe(50);
    });
  });

  describe("pixelToMeter", () => {
    it("should convert pixels to meters with scale 1", () => {
      expect(pixelToMeter(5, 1)).toBe(5);
    });

    it(" should convert pixels to meters with scale 20", () => {
      expect(pixelToMeter(100, 20)).toBe(5);
    });

    it("should handle zero pixels", () => {
      expect(pixelToMeter(0, 20)).toBe(0);
    });

    it("should be the inverse of meterToPixel", () => {
      const meters = 3.5;
      const scale = 20;
      const pixels = meterToPixel(meters, scale);
      expect(pixelToMeter(pixels, scale)).toBeCloseTo(meters);
    });
  });
});
