import { describe, it, expect, jest } from "@jest/globals";
import { CanvasActionDispatcher } from "../CanvasActionDispatcher";
import { CanvasStateManager } from "../CanvasStateManager";
import { DragEngine } from "../../engines/DragEngine";
import { CollisionEngine } from "../../engines/CollisionEngine";
import { SnapEngine } from "../../engines/SnapEngine";
import { ValidationEngine } from "../../engines/ValidationEngine";
import type { CargoItem } from "../../viewModels/CargoItem";
import type { CanvasState } from "../CanvasState";

describe("CanvasActionDispatcher", () => {
  const canvasWidth = 1000;
  const canvasHeight = 600;

  const createCargoItem = (overrides: Partial<CargoItem> = {}): CargoItem => ({
    id: "item1",
    x: 100,
    y: 100,
    length: 50,
    width: 50,
    rotation: 0,
    name: "Test Item",
    type: "pallet",
    color: "red",
    isLocked: false,
    ...overrides,
  });

  const createInitialState = (cargos: CargoItem[] = [], scale = { widthScale: 1, heightScale: 1 }): CanvasState => ({
    truck: null,
    cargos,
    selectedIds: [],
    activeItemId: null,
    validation: { valid: true, errors: [] },
    scale,
  });

  const createDispatcher = (
    initialCargos: CargoItem[] = [],
    scale = { widthScale: 1, heightScale: 1 }
  ): {
    manager: CanvasStateManager;
    dispatcher: CanvasActionDispatcher;
    dragEngine: DragEngine<CargoItem>;
    validationEngine: ValidationEngine;
  } => {
    const manager = new CanvasStateManager(createInitialState(initialCargos, scale));
    const collisionEngine = new CollisionEngine();
    const snapEngine = new SnapEngine();
    const dragEngine = new DragEngine<CargoItem>(initialCargos, collisionEngine, snapEngine);
    const validationEngine = new ValidationEngine();
    const dispatcher = new CanvasActionDispatcher(manager, {
      canvasWidth,
      canvasHeight,
      dragEngine,
      validationEngine,
    });
    return { manager, dispatcher, dragEngine, validationEngine };
  };

  describe("SELECT", () => {
    it("should update selectedIds", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem()]);
      dispatcher.dispatch({ type: "SELECT", ids: ["item1"] });
      const state = manager.getState();
      expect(state.selectedIds).toEqual(["item1"]);
    });

    it("should set activeItemId when single item selected", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem()]);
      dispatcher.dispatch({ type: "SELECT", ids: ["item1"] });
      const state = manager.getState();
      expect(state.activeItemId).toBe("item1");
    });

    it("should not change activeItemId when multiple items selected", () => {
      const { manager, dispatcher } = createDispatcher([
        createCargoItem({ id: "item1" }),
        createCargoItem({ id: "item2", x: 200 }),
      ]);
      dispatcher.dispatch({ type: "SELECT", ids: ["item1", "item2"] });
      const state = manager.getState();
      expect(state.selectedIds).toEqual(["item1", "item2"]);
      expect(state.activeItemId).toBeNull();
    });
  });

  describe("DESELECT", () => {
    it("should clear selectedIds and activeItemId", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem()]);
      dispatcher.dispatch({ type: "SELECT", ids: ["item1"] });
      dispatcher.dispatch({ type: "DESELECT" });
      const state = manager.getState();
      expect(state.selectedIds).toEqual([]);
      expect(state.activeItemId).toBeNull();
    });
  });

  describe("SET_ACTIVE_ITEM", () => {
    it("should set activeItemId", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem()]);
      dispatcher.dispatch({ type: "SET_ACTIVE_ITEM", id: "item1" });
      const state = manager.getState();
      expect(state.activeItemId).toBe("item1");
    });

    it("should set activeItemId to null", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem()]);
      dispatcher.dispatch({ type: "SET_ACTIVE_ITEM", id: "item1" });
      dispatcher.dispatch({ type: "SET_ACTIVE_ITEM", id: null });
      const state = manager.getState();
      expect(state.activeItemId).toBeNull();
    });
  });

  describe("START_DRAG", () => {
    it("should call dragEngine.startDrag and update state", () => {
      const { manager, dispatcher, dragEngine } = createDispatcher([createCargoItem()]);
      const startDragSpy = jest.spyOn(dragEngine, "startDrag");
      dispatcher.dispatch({ type: "START_DRAG", activeId: "item1", mouse: { x: 120, y: 120 } });
      expect(startDragSpy).toHaveBeenCalledWith("item1", ["item1"], { x: 120, y: 120 });
      const state = manager.getState();
      expect(state.activeItemId).toBe("item1");
      expect(state.selectedIds).toEqual(["item1"]);
    });

    it("should use existing selectedIds if activeId is already selected", () => {
      const { manager, dispatcher } = createDispatcher([
        createCargoItem({ id: "item1" }),
        createCargoItem({ id: "item2", x: 200 }),
      ]);
      dispatcher.dispatch({ type: "SELECT", ids: ["item1", "item2"] });
      dispatcher.dispatch({ type: "START_DRAG", activeId: "item1", mouse: { x: 120, y: 120 } });
      const state = manager.getState();
      expect(state.selectedIds).toEqual(["item1", "item2"]);
      expect(state.activeItemId).toBe("item1");
    });

    it("should set selectedIds to [activeId] if not already selected", () => {
      const { manager, dispatcher } = createDispatcher([
        createCargoItem({ id: "item1" }),
        createCargoItem({ id: "item2", x: 200 }),
      ]);
      dispatcher.dispatch({ type: "START_DRAG", activeId: "item2", mouse: { x: 220, y: 220 } });
      const state = manager.getState();
      expect(state.selectedIds).toEqual(["item2"]);
      expect(state.activeItemId).toBe("item2");
    });
  });

  describe("DRAG_MOVE", () => {
    it("should update cargos and validation in state", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem()]);
      dispatcher.dispatch({ type: "START_DRAG", activeId: "item1", mouse: { x: 120, y: 120 } });
      dispatcher.dispatch({ type: "DRAG_MOVE", mouse: { x: 300, y: 300 } });
      const state = manager.getState();
      expect(state.cargos).toHaveLength(1);
      expect(state.validation).toBeDefined();
    });

    it("should move the active item to new position", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem()]);
      dispatcher.dispatch({ type: "START_DRAG", activeId: "item1", mouse: { x: 120, y: 120 } });
      dispatcher.dispatch({ type: "DRAG_MOVE", mouse: { x: 300, y: 300 } });
      const state = manager.getState();
      const item = state.cargos[0];
      expect(item.x).not.toBe(100);
    });
  });

  describe("END_DRAG", () => {
    it("should call dragEngine.endDrag and clear activeItemId", () => {
      const { manager, dispatcher, dragEngine } = createDispatcher([createCargoItem()]);
      const endDragSpy = jest.spyOn(dragEngine, "endDrag");
      dispatcher.dispatch({ type: "START_DRAG", activeId: "item1", mouse: { x: 120, y: 120 } });
      dispatcher.dispatch({ type: "END_DRAG" });
      expect(endDragSpy).toHaveBeenCalled();
      const state = manager.getState();
      expect(state.activeItemId).toBeNull();
    });

    it("should preserve selectedIds after drag ends", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem()]);
      dispatcher.dispatch({ type: "START_DRAG", activeId: "item1", mouse: { x: 120, y: 120 } });
      dispatcher.dispatch({ type: "END_DRAG" });
      const state = manager.getState();
      expect(state.selectedIds).toEqual(["item1"]);
    });
  });

  describe("ROTATE", () => {
    it("should rotate item 90 degrees clockwise", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem({ rotation: 0 })]);
      dispatcher.dispatch({ type: "ROTATE", itemId: "item1" });
      const state = manager.getState();
      expect(state.cargos[0].rotation).toBe(90);
    });

    it("should rotate 90 to 180", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem({ rotation: 90 })]);
      dispatcher.dispatch({ type: "ROTATE", itemId: "item1" });
      const state = manager.getState();
      expect(state.cargos[0].rotation).toBe(180);
    });

    it("should rotate 270 to 0 (wraps around)", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem({ rotation: 270 })]);
      dispatcher.dispatch({ type: "ROTATE", itemId: "item1" });
      const state = manager.getState();
      expect(state.cargos[0].rotation).toBe(0);
    });

    it("should preserve item center during rotation", () => {
      const { manager, dispatcher } = createDispatcher([
        createCargoItem({ x: 100, y: 100, length: 100, width: 50, rotation: 0 }),
      ]);
      dispatcher.dispatch({ type: "ROTATE", itemId: "item1" });
      const state = manager.getState();
      const item = state.cargos[0];
      // Before: center = (100 + 100/2, 100 + 50/2) = (150, 125)
      // After rotation 90: visual size swaps to (50, 100)
      // New position: center - newSize/2 = (150 - 25, 125 - 50) = (125, 75)
      expect(item.x).toBe(125);
      expect(item.y).toBe(75);
      expect(item.rotation).toBe(90);
    });

    it("should preserve center using scale-correct sizes under non-uniform scale", () => {
      const scale = { widthScale: 1453 / 13.6, heightScale: 297 / 2.45 };
      const { manager, dispatcher } = createDispatcher(
        [createCargoItem({ x: 10, y: 10, length: 0.3 * scale.widthScale, width: 0.2 * scale.heightScale })],
        scale
      );
      dispatcher.dispatch({ type: "ROTATE", itemId: "item1" });
      const item = manager.getState().cargos[0];
      // Center preserved from the base orientation footprint
      const centerX = 10 + (0.3 * scale.widthScale) / 2;
      const centerY = 10 + (0.2 * scale.heightScale) / 2;
      // New rotated footprint projected through the matching axis scales
      const nextL = 0.2 * scale.heightScale * (scale.widthScale / scale.heightScale);
      const nextW = 0.3 * scale.widthScale * (scale.heightScale / scale.widthScale);
      expect(item.rotation).toBe(90);
      expect(item.x).toBeCloseTo(centerX - nextL / 2);
      expect(item.y).toBeCloseTo(centerY - nextW / 2);
    });

    it("should not rotate locked items", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem({ rotation: 0, isLocked: true })]);
      dispatcher.dispatch({ type: "ROTATE", itemId: "item1" });
      const state = manager.getState();
      expect(state.cargos[0].rotation).toBe(0);
    });

    it("should not affect other items during rotation", () => {
      const { manager, dispatcher } = createDispatcher([
        createCargoItem({ id: "item1", rotation: 0 }),
        createCargoItem({ id: "item2", x: 200, rotation: 0 }),
      ]);
      dispatcher.dispatch({ type: "ROTATE", itemId: "item1" });
      const state = manager.getState();
      expect(state.cargos[0].rotation).toBe(90);
      expect(state.cargos[1].rotation).toBe(0);
    });

    it("should clamp position within canvas bounds after rotation", () => {
      const { manager, dispatcher } = createDispatcher([
        createCargoItem({ x: 950, y: 550, length: 100, width: 50, rotation: 0 }),
      ]);
      dispatcher.dispatch({ type: "ROTATE", itemId: "item1" });
      const state = manager.getState();
      const item = state.cargos[0];
      // After rotation: visual size = (50, 100)
      // Clamped: x = min(newX, 1000 - 50) = min(975, 950) = 950
      // y = min(newY, 600 - 100) = min(525, 500) = 500
      expect(item.x).toBeLessThanOrEqual(canvasWidth - 50);
      expect(item.y).toBeLessThanOrEqual(canvasHeight - 100);
    });

    it("should update validation after rotation", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem({ rotation: 0 })]);
      dispatcher.dispatch({ type: "ROTATE", itemId: "item1" });
      const state = manager.getState();
      expect(state.validation).toBeDefined();
    });
  });

  describe("UNDO", () => {
    it("should call manager.undo", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem()]);
      const undoSpy = jest.spyOn(manager, "undo");
      dispatcher.dispatch({ type: "UNDO" });
      expect(undoSpy).toHaveBeenCalled();
    });
  });

  describe("REDO", () => {
    it("should call manager.redo", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem()]);
      const redoSpy = jest.spyOn(manager, "redo");
      dispatcher.dispatch({ type: "REDO" });
      expect(redoSpy).toHaveBeenCalled();
    });
  });
});
