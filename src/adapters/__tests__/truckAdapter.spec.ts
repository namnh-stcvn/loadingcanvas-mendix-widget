import { describe, it, expect } from "@jest/globals";
import { truckSelectionToTruckItem, truckToTruckItem, computeScale } from "../truckAdapter";
import type { Truck } from "../../models/Truck";
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
      expect(result.width).toBe(125); // 2.5 * 50
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

    it("should compute a separate axis scale per dimension from the truck canvas size", () => {
      const scale = computeScale(truck);
      expect(scale.widthScale).toBeCloseTo(TRUCK_CANVAS_WIDTH / 12);
      expect(scale.heightScale).toBeCloseTo(TRUCK_CANVAS_HEIGHT / 2.5);
    });

    it("should subtract padding before dividing", () => {
      const scale = computeScale(truck, 100);
      expect(scale.widthScale).toBeCloseTo((TRUCK_CANVAS_WIDTH - 100) / 12);
      expect(scale.heightScale).toBeCloseTo((TRUCK_CANVAS_HEIGHT - 100) / 2.5);
    });

    it("should never return a scale below the 100px-per-meter floor", () => {
      const scale = computeScale(truck, 250);
      // TRUCK_CANVAS_HEIGHT - 250 = 47 -> clamped up to 100
      expect(scale.widthScale).toBeCloseTo((TRUCK_CANVAS_WIDTH - 250) / 12);
      expect(scale.heightScale).toBeCloseTo(100 / 2.5);
    });

    it("should fall back to default truck dimensions when values are not positive", () => {
      const scale = computeScale({
        id: "truck-2",
        internalLengthMeter: 0,
        internalWidthMeter: -3,
        internalHeightMeter: 2.5,
      });
      expect(scale.widthScale).toBeCloseTo(TRUCK_CANVAS_WIDTH / 13.6);
      expect(scale.heightScale).toBeCloseTo(TRUCK_CANVAS_HEIGHT / 2.45);
    });
  });
});
