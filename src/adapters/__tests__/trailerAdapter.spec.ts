import { describe, it, expect } from "@jest/globals";
import { truckSelectionToTrailerItem, trailerToTrailerItem, computeScale } from "../trailerAdapter";
import type { Trailer } from "../../models/Trailer";

describe("trailerAdapter", () => {
  const scale = 50;

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
      expect(result.internalHeightMeter).toBe(2.5);
      expect(result.width).toBe(600); // 12 * 50
      expect(result.height).toBe(125); // 2.5 * 50
      expect(result.x).toBe(20);
      expect(result.y).toBe(20);
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
      expect(result.width).toBe(600);
      expect(result.height).toBe(125);
    });
  });

  describe("computeScale", () => {
    it("should compute scale to fit trailer within canvas", () => {
      const truck = {
        id: "truck-1",
        internalLengthMeter: 12,
        internalWidthMeter: 2.5,
        internalHeightMeter: 2.5,
      };
      const scale = computeScale(truck, 1000, 600);
      // availableWidth = 1000 - 40 = 960, availableHeight = 600 - 40 = 560
      // scale = min(960/12, 560/2.5) = min(80, 224) = 80
      expect(scale).toBe(80);
    });

    it("should use custom padding", () => {
      const truck = {
        id: "truck-1",
        internalLengthMeter: 12,
        internalWidthMeter: 2.5,
        internalHeightMeter: 2.5,
      };
      const scale = computeScale(truck, 1000, 600, 100);
      // availableWidth = 1000 - 100 = 900, availableHeight = 600 - 100 = 500
      // scale = min(900/12, 500/2.5) = min(75, 200) = 75
      expect(scale).toBe(75);
    });

    it("should handle square trailer", () => {
      const truck = {
        id: "truck-1",
        internalLengthMeter: 10,
        internalWidthMeter: 10,
        internalHeightMeter: 2.5,
      };
      const scale = computeScale(truck, 500, 500);
      // availableWidth = 500 - 40 = 460, availableHeight = 500 - 40 = 460
      // scale = min(460/10, 460/10) = 46
      expect(scale).toBe(46);
    });
  });
});
