import { describe, it, expect } from "@jest/globals";
import { truckSelectionToTrailerItem, trailerToTrailerItem, computeScale } from "../trailerAdapter";
import type { Trailer } from "../../models/Trailer";
import {
  TRAILER_CANVAS_WIDTH,
  TRAILER_CANVAS_HEIGHT,
  TRAILER_CANVAS_LEFT,
  TRAILER_CANVAS_TOP,
} from "../../constants/canvas";

describe("trailerAdapter", () => {
  const scale = { widthScale: 50, heightScale: 50 };

  describe("truckSelectionToTrailerItem", () => {
    it("should convert TruckSelectionData to TrailerItem", () => {
      const truck = {
        id: "truck-1",
        code: "TRUCK-001",
        trailerType: "DryVan" as const,
        maxPayloadKg: 20000,
        axleCount: 2,
        internalLengthMeter: 12,
        internalWidthMeter: 2.5,
        internalHeightMeter: 2.5,
        maxLoadMeters: 12,
      };
      const result = truckSelectionToTrailerItem(truck, scale);
      expect(result.id).toBe("truck-1");
      expect(result.code).toBe("TRUCK-001");
      expect(result.trailerType).toBe("DryVan");
      expect(result.maxPayloadKg).toBe(20000);
      expect(result.axleCount).toBe(2);
      expect(result.maxLoadMeters).toBe(12);
      expect(result.length).toBe(600); // 12 * 50
      expect(result.width).toBe(125); // 2.5 * 50
      expect(result.x).toBe(TRAILER_CANVAS_LEFT);
      expect(result.y).toBe(TRAILER_CANVAS_TOP);
      expect(result.rotation).toBe(0);
    });

    it("should use default values when optional fields are missing", () => {
      const truck = {
        id: "truck-2",
        internalLengthMeter: 10,
        internalWidthMeter: 2.5,
        internalHeightMeter: 2.5,
      };
      const result = truckSelectionToTrailerItem(truck, scale);
      expect(result.code).toBe("TRAILER");
      expect(result.trailerType).toBe("DryVan");
      expect(result.maxPayloadKg).toBe(0);
      expect(result.axleCount).toBe(2);
      expect(result.maxLoadMeters).toBe(10);
    });

    it("should use custom position when provided", () => {
      const truck = {
        id: "truck-1",
        internalLengthMeter: 12,
        internalWidthMeter: 2.5,
        internalHeightMeter: 2.5,
      };
      const result = truckSelectionToTrailerItem(truck, scale, { x: 50, y: 50 });
      expect(result.x).toBe(50);
      expect(result.y).toBe(50);
    });
  });

  describe("trailerToTrailerItem", () => {
    it("should convert Trailer business model to TrailerItem", () => {
      const trailer: Trailer = {
        id: "trailer-1",
        code: "TRAILER-001",
        internalLengthMeter: 12,
        internalWidthMeter: 2.5,
        internalHeightMeter: 2.5,
        maxPayloadKg: 20000,
        axleCount: 2,
        trailerType: "DryVan",
        maxLoadMeters: 12,
      };
      const result = trailerToTrailerItem(trailer, scale);
      expect(result.id).toBe("trailer-1");
      expect(result.code).toBe("TRAILER-001");
      expect(result.length).toBe(600);
      expect(result.width).toBe(125);
    });
  });

  describe("computeScale", () => {
    const truck = {
      id: "truck-1",
      internalLengthMeter: 12,
      internalWidthMeter: 2.5,
      internalHeightMeter: 2.5,
    };

    it("should compute a separate axis scale per dimension from the trailer canvas size", () => {
      const scale = computeScale(truck);
      expect(scale.widthScale).toBeCloseTo(TRAILER_CANVAS_WIDTH / 12);
      expect(scale.heightScale).toBeCloseTo(TRAILER_CANVAS_HEIGHT / 2.5);
    });

    it("should subtract padding before dividing", () => {
      const scale = computeScale(truck, 100);
      expect(scale.widthScale).toBeCloseTo((TRAILER_CANVAS_WIDTH - 100) / 12);
      expect(scale.heightScale).toBeCloseTo((TRAILER_CANVAS_HEIGHT - 100) / 2.5);
    });

    it("should never return a scale below the 100px-per-meter floor", () => {
      const scale = computeScale(truck, 250);
      // TRAILER_CANVAS_HEIGHT - 250 = 47 -> clamped up to 100
      expect(scale.widthScale).toBeCloseTo((TRAILER_CANVAS_WIDTH - 250) / 12);
      expect(scale.heightScale).toBeCloseTo(100 / 2.5);
    });

    it("should fall back to default trailer dimensions when values are not positive", () => {
      const scale = computeScale({
        id: "truck-2",
        internalLengthMeter: 0,
        internalWidthMeter: -3,
        internalHeightMeter: 2.5,
      });
      expect(scale.widthScale).toBeCloseTo(TRAILER_CANVAS_WIDTH / 13.6);
      expect(scale.heightScale).toBeCloseTo(TRAILER_CANVAS_HEIGHT / 2.45);
    });
  });
});
