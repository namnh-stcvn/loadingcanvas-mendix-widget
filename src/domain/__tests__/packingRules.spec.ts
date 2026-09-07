import { describe, it, expect } from "@jest/globals";
import { autoLoadCargoUnits, expandCargoByQuantity, packCargoIntoBounds } from "../packingRules";
import { fromCargoId } from "../cargoIdentity";
import type { CargoItem } from "../../viewModels/CargoItem";
import type { RectLike } from "../../types/geometry";

const makeCargo = (id: string, length: number, width: number): CargoItem => ({
  id,
  name: id,
  x: 0,
  y: 0,
  length,
  width,
  rotation: 0,
  type: "pallet",
  color: "orange",
  isLocked: false,
});

const TRUCK: RectLike = { x: 0, y: 0, length: 200, width: 100 };

const rectsOverlap = (a: RectLike, b: RectLike): boolean => {
  return !(a.x + a.length <= b.x || b.x + b.length <= a.x || a.y + a.width <= b.y || b.y + b.width <= a.y);
};

const isInside = (rect: RectLike, bounds: RectLike): boolean => {
  return (
    rect.x >= bounds.x &&
    rect.y >= bounds.y &&
    rect.x + rect.length <= bounds.x + bounds.length &&
    rect.y + rect.width <= bounds.y + bounds.width
  );
};

describe("packCargoIntoBounds", () => {
  it("returns empty result for empty input", () => {
    const result = packCargoIntoBounds([], TRUCK);
    expect(result.placed).toEqual([]);
    expect(result.unplaced).toEqual([]);
  });

  it("places all fitting items without overlap inside bounds", () => {
    const items = [makeCargo("A", 120, 60), makeCargo("B", 80, 40), makeCargo("C", 40, 40)];

    const { placed, unplaced } = packCargoIntoBounds(items, TRUCK);

    expect(unplaced).toEqual([]);
    expect(placed.map((item) => item.id)).toEqual(["A", "B", "C"]);

    const rects: RectLike[] = placed.map(({ x, y, length, width }) => ({ x, y, length, width }));
    for (let i = 0; i < rects.length; i++) {
      expect(isInside(rects[i], TRUCK)).toBe(true);
      for (let j = i + 1; j < rects.length; j++) {
        expect(rectsOverlap(rects[i], rects[j])).toBe(false);
      }
    }
  });

  it("places the largest item at the bounds origin regardless of input order", () => {
    const items = [makeCargo("C", 40, 40), makeCargo("B", 80, 40), makeCargo("A", 120, 60)];

    const { placed } = packCargoIntoBounds(items, TRUCK);
    const largest = placed.find((item) => item.id === "A");

    expect(largest).toBeDefined();
    expect(largest!.x).toBe(0);
    expect(largest!.y).toBe(0);
  });

  it("keeps items that cannot fit anywhere in unplaced", () => {
    const items = [makeCargo("huge", 300, 500), makeCargo("small", 40, 40)];

    const { placed, unplaced } = packCargoIntoBounds(items, TRUCK);

    expect(placed.map((item) => item.id)).toEqual(["small"]);
    expect(unplaced.map((item) => item.id)).toEqual(["huge"]);
  });

  it("uses 90° rotation to fit an item that does not fit in its original orientation", () => {
    const narrowTruck: RectLike = { x: 0, y: 0, length: 130, width: 200 };
    const wideItem = makeCargo("wide", 140, 50);

    const withoutRotation = packCargoIntoBounds([wideItem], narrowTruck, undefined, {
      allowRotation: false,
    });
    expect(withoutRotation.unplaced.map((item) => item.id)).toEqual(["wide"]);

    const withRotation = packCargoIntoBounds([wideItem], narrowTruck);
    expect(withRotation.placed).toHaveLength(1);
    expect(withRotation.placed[0].rotation).toBe(90);
    expect(
      isInside({ x: withRotation.placed[0].x, y: withRotation.placed[0].y, length: 50, width: 140 }, narrowTruck)
    ).toBe(true);
  });

  it("keeps later placements correct after a rotated item is packed", () => {
    // Regression: occupied rects used to store `rotation`, so geometryRules
    // applied the swap a second time and corrupted every later overlap check.
    const tallBounds: RectLike = { x: 0, y: 0, length: 200, width: 300 };
    const longItem = makeCargo("long", 250, 50); // only fits rotated (50×250)
    const smallItem = makeCargo("small", 60, 60);

    const { placed, unplaced } = packCargoIntoBounds([longItem, smallItem], tallBounds);

    expect(unplaced).toEqual([]);
    expect(placed.find((item) => item.id === "long")!.rotation).toBe(90);

    const longRect: RectLike = { x: placed[0].x, y: placed[0].y, length: 50, width: 250 };
    const smallRect: RectLike = { x: placed[1].x, y: placed[1].y, length: 60, width: 60 };
    expect(isInside(longRect, tallBounds)).toBe(true);
    expect(isInside(smallRect, tallBounds)).toBe(true);
    expect(rectsOverlap(longRect, smallRect)).toBe(false);
  });

  it("hugs a non-grid-aligned truck border and packs realistic pallets", () => {
    // Real runtime values: truck frame at (333, 152), scale ≈ 106.84 px/m
    // for a 13.6 m truck, seven 1.2 × 0.8 m pallets.
    const truckFrame: RectLike = { x: 333, y: 152, length: 1453, width: 297 };
    const scale = { widthScale: 106.84, heightScale: 106.84 };
    const items = Array.from({ length: 7 }, (_, i) => makeCargo(`pallet-${i}`, 1.2 * 106.84, 0.8 * 106.84));

    const { placed, unplaced } = packCargoIntoBounds(items, truckFrame, scale);

    expect(unplaced).toEqual([]);

    const first = placed.find((item) => item.id === "pallet-0")!;
    expect(first.x).toBe(333);
    expect(first.y).toBe(152);

    const rects: RectLike[] = placed.map(({ x, y, length, width }) => ({ x, y, length, width }));
    for (let i = 0; i < rects.length; i++) {
      expect(isInside(rects[i], truckFrame)).toBe(true);
      for (let j = i + 1; j < rects.length; j++) {
        expect(rectsOverlap(rects[i], rects[j])).toBe(false);
      }
    }

    // Uniform pallets form one tight shelf: same top edge, zero gap between neighbours.
    const inRow = placed.slice().sort((a, b) => a.x - b.x);
    expect(inRow.every((item) => item.y === 152)).toBe(true);
    for (let i = 1; i < inRow.length; i++) {
      expect(inRow[i].x - inRow[i - 1].x).toBeCloseTo(inRow[i - 1].length, 6);
    }
  });

  it("places items flush edge-to-edge horizontally and vertically", () => {
    const wideBounds: RectLike = { x: 0, y: 0, length: 300, width: 100 };
    const { placed: row } = packCargoIntoBounds([makeCargo("h1", 120, 60), makeCargo("h2", 120, 60)], wideBounds);

    expect(row).toHaveLength(2);
    expect(row[1].y).toBe(row[0].y);
    expect(row[1].x - row[0].x).toBeCloseTo(row[0].length, 6);

    // Narrow bounds force a second and third shelf; each new row starts
    // exactly at the bottom edge of the item above (no vertical gap).
    const tallBounds: RectLike = { x: 0, y: 0, length: 150, width: 260 };
    const { placed: stack } = packCargoIntoBounds(
      [makeCargo("v1", 100, 80), makeCargo("v2", 100, 80), makeCargo("v3", 100, 80)],
      tallBounds
    );

    expect(stack.map((item) => item.y)).toEqual([0, 80, 160]);
    expect(stack.every((item) => item.x === 0)).toBe(true);
  });

  it("preserves cargo identity fields while recomputing position", () => {
    const cargo = makeCargo("A", 120, 60);
    cargo.name = "Pallet EU";
    cargo.weightKg = 350;

    const { placed } = packCargoIntoBounds([cargo], TRUCK);
    const packed = placed[0];

    expect(packed.id).toBe("A");
    expect(packed.name).toBe("Pallet EU");
    expect(packed.weightKg).toBe(350);
    expect(packed.length).toBe(120);
    expect(packed.width).toBe(60);
  });
});

describe("expandCargoByQuantity / autoLoadCargoUnits (Auto Load idempotence)", () => {
  const order = (id: string, quantity: number): CargoItem => ({ ...makeCargo(id, 120, 60), quantity });

  it("expands a raw list entry into one instance per quantity unit", () => {
    const expanded = expandCargoByQuantity([order("cargo-G", 3)]);

    expect(expanded.map((i) => i.id)).toEqual(["cargo-G-0", "cargo-G-1", "cargo-G-2"]);
  });

  it("passes canvas instances through unchanged when the list is empty", () => {
    const onCanvas = [
      makeCargo("cargo-G-0", 120, 60),
      makeCargo("cargo-G-1", 120, 60),
      makeCargo("cargo-G-2", 120, 60),
    ];

    expect(autoLoadCargoUnits(onCanvas, []).map((i) => i.id)).toEqual(["cargo-G-0", "cargo-G-1", "cargo-G-2"]);
  });

  it("keeps the same unit set on repeated Auto Load runs (no duplication)", () => {
    const firstRun = autoLoadCargoUnits([], [order("cargo-G", 2), order("cargo-H", 1)]);
    const idsAfterFirst = firstRun.map((i) => i.id);

    // Second run: the canvas carries firstRun instances, the list is re-derived empty.
    const secondRun = autoLoadCargoUnits(firstRun, []);

    expect(secondRun.map((i) => i.id)).toEqual(idsAfterFirst);
  });

  it("produces ids that still resolve to the base order GUID (list stays empty)", () => {
    const expandedIds = autoLoadCargoUnits([], [order("cargo-G", 3)]).map((i) => fromCargoId(i.id));

    expect(new Set(expandedIds)).toEqual(new Set(["G"]));
  });
});
