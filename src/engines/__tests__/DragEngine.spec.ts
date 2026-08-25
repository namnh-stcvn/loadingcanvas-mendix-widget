import { describe, it, expect } from "@jest/globals";
import { DragEngine } from "../DragEngine";
import { CollisionEngine } from "../CollisionEngine";
import { SnapEngine } from "../SnapEngine";
import type { RectLike, Rotation } from "../../types/geometry";

interface TestItem extends RectLike {
  id: string;
  rotation: Rotation;
}

describe("DragEngine", () => {
  const canvasHeight = 600;

  const createItems = (): TestItem[] => [
    { id: "item1", x: 100, y: 100, length: 50, width: 50, rotation: 0 },
    { id: "item2", x: 200, y: 200, length: 50, width: 50, rotation: 0 },
  ];

  describe("constructor", () => {
    it("should initialize with provided items", () => {
      const items = createItems();
      const engine = new DragEngine(items);
      expect(engine.isDragging()).toBe(false);
    });

    it("should accept optional collision and snap engines", () => {
      const items = createItems();
      const collisionEngine = new CollisionEngine();
      const snapEngine = new SnapEngine();
      const engine = new DragEngine(items, collisionEngine, snapEngine);
      expect(engine.isDragging()).toBe(false);
    });
  });

  describe("startDrag", () => {
    it("should set isDragging to true", () => {
      const engine = new DragEngine(createItems());
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      expect(engine.isDragging()).toBe(true);
    });

    it("should do nothing when activeId does not exist in items", () => {
      const engine = new DragEngine(createItems());
      engine.startDrag("nonexistent", ["nonexistent"], { x: 120, y: 120 });
      expect(engine.isDragging()).toBe(false);
    });

    it("should record start positions for all selected items", () => {
      const engine = new DragEngine(createItems());
      engine.startDrag("item1", ["item1", "item2"], { x: 120, y: 120 });
      // After startDrag, move should use the recorded positions
      const result = engine.move({ x: 200, y: 200 }, canvasHeight, canvasHeight);
      // item1 should have moved from (100,100) to near (200,200)
      const item1 = result.find((i) => i.id === "item1");
      expect(item1).toBeDefined();
      expect(item1!.x).not.toBe(100);
    });

    it("should record pointer offset for cursor-relative dragging", () => {
      const engine = new DragEngine(createItems());
      // Mouse at (120, 120), item1 at (100, 100) Ã¢â€ â€™ offset = (20, 20)
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      // Move mouse to (200, 200) Ã¢â€ â€™ base position = (200-20, 200-20) = (180, 180)
      const result = engine.move({ x: 200, y: 200 }, canvasHeight, canvasHeight);
      const item1 = result.find((i) => i.id === "item1");
      // 180 snapped to grid 20 Ã¢â€ â€™ 180
      expect(item1!.x).toBe(180);
      expect(item1!.y).toBe(180);
    });
  });

  describe("move", () => {
    it("should return current items when not dragging", () => {
      const engine = new DragEngine(createItems());
      const result = engine.move({ x: 200, y: 200 }, canvasHeight, canvasHeight);
      expect(result).toEqual(createItems());
    });

    it("should update item positions based on mouse movement", () => {
      const engine = new DragEngine(createItems());
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      const result = engine.move({ x: 300, y: 300 }, canvasHeight, canvasHeight);
      const item1 = result.find((i) => i.id === "item1");
      // base = (300-20, 300-20) = (280, 280), snapped to grid 20 Ã¢â€ â€™ 280
      expect(item1!.x).toBe(280);
      expect(item1!.y).toBe(280);
    });

    it("should not move items that are not in the selected set", () => {
      const engine = new DragEngine(createItems());
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      const result = engine.move({ x: 300, y: 300 }, canvasHeight, canvasHeight);
      const item2 = result.find((i) => i.id === "item2");
      expect(item2!.x).toBe(200);
      expect(item2!.y).toBe(200);
    });

    it("should apply grid snapping during move", () => {
      const engine = new DragEngine(createItems());
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      // Move to (215, 215) Ã¢â€ â€™ base = (195, 195) Ã¢â€ â€™ snapped to 200
      const result = engine.move({ x: 215, y: 215 }, canvasHeight, canvasHeight);
      const item1 = result.find((i) => i.id === "item1");
      expect(item1!.x).toBe(200);
      expect(item1!.y).toBe(200);
    });

    it("should clamp position within canvas bounds", () => {
      const engine = new DragEngine(createItems());
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      // Move far beyond canvas
      const result = engine.move({ x: 5000, y: 5000 }, canvasHeight, canvasHeight);
      const item1 = result.find((i) => i.id === "item1");
      expect(item1!.x).toBeLessThanOrEqual(canvasHeight - item1!.length);
      expect(item1!.y).toBeLessThanOrEqual(canvasHeight - item1!.width);
    });

    it("should work without collision and snap engines", () => {
      const engine = new DragEngine(createItems());
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      const result = engine.move({ x: 300, y: 300 }, canvasHeight, canvasHeight);
      const item1 = result.find((i) => i.id === "item1");
      expect(item1!.x).toBe(280);
      expect(item1!.y).toBe(280);
    });

    it("should work with collision engine", () => {
      const collisionEngine = new CollisionEngine();
      const engine = new DragEngine(createItems(), collisionEngine);
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      // Move item1 to overlap with item2
      const result = engine.move({ x: 220, y: 220 }, canvasHeight, canvasHeight);
      const item1 = result.find((i) => i.id === "item1");
      // Collision engine should resolve non-overlapping position
      const item2 = result.find((i) => i.id === "item2");
      // item1 should not overlap item2
      const item1Rect = { x: item1!.x, y: item1!.y, length: item1!.length, width: item1!.width };
      const item2Rect = { x: item2!.x, y: item2!.y, length: item2!.length, width: item2!.width };
      // They should not overlap (with some tolerance)
      const overlaps =
        item1Rect.x < item2Rect.x + item2Rect.length &&
        item1Rect.x + item1Rect.length > item2Rect.x &&
        item1Rect.y < item2Rect.y + item2Rect.width &&
        item1Rect.y + item1Rect.width > item2Rect.y;
      expect(overlaps).toBe(false);
    });

    it("should work with snap engine", () => {
      const snapEngine = new SnapEngine();
      const engine = new DragEngine(createItems(), undefined, snapEngine);
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      const result = engine.move({ x: 300, y: 300 }, canvasHeight, canvasHeight);
      const item1 = result.find((i) => i.id === "item1");
      expect(item1).toBeDefined();
    });
  });

  describe("endDrag", () => {
    it("should set isDragging to false", () => {
      const engine = new DragEngine(createItems());
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      expect(engine.isDragging()).toBe(true);
      engine.endDrag();
      expect(engine.isDragging()).toBe(false);
    });

    it("should clear start positions and offsets", () => {
      const engine = new DragEngine(createItems());
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      engine.endDrag();
      // After endDrag, move should return items unchanged
      const result = engine.move({ x: 500, y: 500 }, canvasHeight, canvasHeight);
      expect(result).toEqual(createItems());
    });
  });

  describe("updateItems", () => {
    it("should sync internal items with external state", () => {
      const engine = new DragEngine(createItems());
      const newItems: TestItem[] = [{ id: "item3", x: 300, y: 300, length: 50, width: 50, rotation: 0 }];
      engine.updateItems(newItems);
      // Start drag on item3
      engine.startDrag("item3", ["item3"], { x: 320, y: 320 });
      const result = engine.move({ x: 400, y: 400 }, canvasHeight, canvasHeight);
      const item3 = result.find((i) => i.id === "item3");
      expect(item3).toBeDefined();
      expect(item3!.x).not.toBe(300);
    });
  });
});
