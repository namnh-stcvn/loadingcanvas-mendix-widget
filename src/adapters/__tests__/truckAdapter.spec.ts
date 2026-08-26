import { describe, it, expect } from "@jest/globals";
import { truckSelectionToTruckItem, truckToTruckItem, computeScale } from "../truckAdapter";
import type { Truck } from "../../models/Truck";
import { getRotatedScreenSize } from "../../domain/rotationRules";
import { TRUCK_CANVAS_WIDTH, TRUCK_CANVAS_HEIGHT, TRUCK_CANVAS_LEFT, TRUCK_CANVAS_TOP } from "../../constants/canvas";

describe("truckAdapter", () => {
  const scale = { widthScale: 50, heightScale: 50 };

  describe("truckSelectionToTruckItem", () => {
    it("should convert TruckSelectionData to TruckItem", () => {
      const truck = {
        id: "truck-1",
        code: "TRUCK-001",
        truckType: "DryVan" as const,
        maxPayloadKg: 20000,
        axleCount: 2,
        internalLengthMeter: 12,
        internalWidthMeter: 2.5,
        internalHeightMeter: 2.5,
        maxLoadMeters: 12,
      };
      const result = truckSelectionToTruckItem(truck, scale);
      expect(result.id).toBe("truck-1");
      expect(result.code).toBe("TRUCK-001");
      expect(result.truckType).toBe("DryVan");
      expect(result.maxPayloadKg).toBe(20000);
      expect(result.axleCount).toBe(2);
      expect(result.maxLoadMeters).toBe(12);
      expect(result.length).toBe(600); // 12 * 50
      expect(result.width).toBe(TRUCK_CANVAS_HEIGHT); // frame pinned to canvas band
      expect(result.x).toBe(TRUCK_CANVAS_LEFT);
      expect(result.y).toBe(TRUCK_CANVAS_TOP);
      expect(result.rotation).toBe(0);
    });

    it("should use default values when optional fields are missing", () => {
      const truck = {
        id: "truck-2",
        internalLengthMeter: 10,
        internalWidthMeter: 2.5,
        internalHeightMeter: 2.5,
      };
      const result = truckSelectionToTruckItem(truck, scale);
      expect(result.code).toBe("TRUCK");
      expect(result.truckType).toBe("DryVan");
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
      const result = truckSelectionToTruckItem(truck, scale, { x: 50, y: 50 });
      expect(result.x).toBe(50);
      expect(result.y).toBe(50);
    });
  });

  describe("truckToTruckItem", () => {
    it("should convert Truck business model to TruckItem", () => {
      const truck: Truck = {
        id: "truck-1",
        code: "TRUCK-001",
        internalLengthMeter: 12,
        internalWidthMeter: 2.5,
        internalHeightMeter: 2.5,
        maxPayloadKg: 20000,
        axleCount: 2,
        truckType: "DryVan",
        maxLoadMeters: 12,
      };
      const result = truckToTruckItem(truck, scale);
      expect(result.id).toBe("truck-1");
      expect(result.code).toBe("TRUCK-001");
      expect(result.length).toBe(600);
      expect(result.width).toBe(TRUCK_CANVAS_HEIGHT); // frame pinned to canvas band
    });
  });

  describe("computeScale", () => {
    const truck = {
      id: "truck-1",
      internalLengthMeter: 12,
      internalWidthMeter: 2.5,
      internalHeightMeter: 2.5,
    };

    it("should compute a single uniform scale that fits both dimensions", () => {
      const scale = computeScale(truck);
      // Height binds: 297/2.5 < 1453/12
      expect(scale.widthScale).toBeCloseTo(TRUCK_CANVAS_HEIGHT / 2.5);
      expect(scale.heightScale).toBeCloseTo(TRUCK_CANVAS_HEIGHT / 2.5);
      expect(scale.widthScale).toBe(scale.heightScale);
    });

    it("should subtract padding before dividing", () => {
      const scale = computeScale(truck, 100);
      expect(scale.widthScale).toBeCloseTo((TRUCK_CANVAS_HEIGHT - 100) / 2.5);
      expect(scale.heightScale).toBeCloseTo((TRUCK_CANVAS_HEIGHT - 100) / 2.5);
    });

    it("should clamp available pixels to the 100px floor before dividing", () => {
      const scale = computeScale(truck, 250);
      // Available px: max(1453-250,100)=1203 and max(297-250,100)=100; height binds
      expect(scale.widthScale).toBeCloseTo(100 / 2.5);
      expect(scale.heightScale).toBeCloseTo(100 / 2.5);
    });

    it("should fall back to default truck dimensions when values are not positive", () => {
      const scale = computeScale({
        id: "truck-2",
        internalLengthMeter: 0,
        internalWidthMeter: -3,
        internalHeightMeter: 2.5,
      });
      // Width binds for the default 13.6m x 2.45m truck
      expect(scale.widthScale).toBeCloseTo(TRUCK_CANVAS_WIDTH / 13.6);
      expect(scale.heightScale).toBeCloseTo(TRUCK_CANVAS_WIDTH / 13.6);
    });

    it("should keep a rotated item's rendered shape consistent (regression)", () => {
      // Europallet 1m x 1.2m in the default 13.6m x 2.45m truck must stay a
      // rectangle after a 90-degree rotation instead of turning into a square.
      const scale = computeScale({
        id: "truck-1",
        internalLengthMeter: 13.6,
        internalWidthMeter: 2.45,
        internalHeightMeter: 2.5,
      });
      const pallet = { length: 1 * scale.widthScale, width: 1.2 * scale.heightScale };

      const rotated = getRotatedScreenSize(pallet, 90, scale);

      expect(rotated.length).toBeCloseTo(pallet.width);
      expect(rotated.width).toBeCloseTo(pallet.length);
      // Real proportions survive the projection: 1.2m along X, 1m along Y
      expect(rotated.length / scale.widthScale).toBeCloseTo(1.2);
      expect(rotated.width / scale.heightScale).toBeCloseTo(1);
    });
  });
});
