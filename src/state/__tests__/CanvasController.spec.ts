import { describe, it, expect, jest } from "@jest/globals";
import { CanvasController, type CanvasControllerOptions } from "../CanvasController";
import type { CargoItem } from "../../core/types/viewModels/CargoItem";
import type { TruckItem } from "../../core/types/viewModels/TruckItem";

const createCargoItem = (id: string, overrides: Partial<CargoItem> = {}): CargoItem => ({
  id,
  name: `Cargo ${id}`,
  type: "pallet",
  x: 0,
  y: 0,
  length: 60,
  width: 40,
  rotation: 0,
  color: "orange",
  isLocked: false,
  lengthM: 1.2,
  widthM: 0.8,
  weightKg: 500,
  ...overrides,
});

const createTruckItem = (): TruckItem => ({
  id: "truck-1",
  code: "TRUCK-001",
  truckType: "DryVan",
  maxPayloadKg: 20000,
  axleCount: 2,
  maxLoadMeters: 12,
  x: 20,
  y: 20,
  length: 600,
  width: 125,
  rotation: 0,
});

const createController = (options: Partial<CanvasControllerOptions> = {}): CanvasController =>
  new CanvasController({
    initialItems: [],
    canvasWidth: 1000,
    canvasHeight: 600,
    scale: { widthScale: 50, heightScale: 50 },
    truck: null,
    ...options,
  });

describe("CanvasController", () => {
  it("reflects options in the initial state", () => {
    const truck = createTruckItem();
    const controller = createController({ truck, initialItems: [createCargoItem("cargo-1")] });

    const state = controller.getState();
    expect(state.truck).toEqual(truck);
    expect(state.cargos).toHaveLength(1);
    expect(state.selectedIds).toEqual([]);
    expect(state.activeItemId).toBeNull();
    expect(state.validation.valid).toBe(true);
    expect(state.scale).toEqual({ widthScale: 50, heightScale: 50 });
  });

  it("subscribes and reflects addItem in state", () => {
    const controller = createController();
    const listener = jest.fn();
    const unsubscribe = controller.subscribe(listener);

    controller.addItem(createCargoItem("cargo-1"));

    expect(controller.getState().cargos.map((c) => c.id)).toEqual(["cargo-1"]);
    expect(listener).toHaveBeenCalled();

    unsubscribe();
  });

  it("addItem resolves to a non-overlapping position when desired spot is occupied", () => {
    const controller = createController({ truck: createTruckItem() });
    controller.addItem(createCargoItem("cargo-1", { x: 100, y: 100 }));

    const first = controller.getState().cargos[0];
    expect(first.x).toBe(100);
    expect(first.y).toBe(100);

    // Add second item at the same position — must be moved elsewhere
    controller.addItem(createCargoItem("cargo-2", { x: 100, y: 100 }));

    const second = controller.getState().cargos[1];
    const dx = Math.abs(second.x - first.x);
    const dy = Math.abs(second.y - first.y);
    const itemsOverlap = dx < first.length && dy < first.width;
    expect(itemsOverlap).toBe(false);
  });

  it("setItems replaces the cargo list", () => {
    const controller = createController();
    controller.setItems([createCargoItem("cargo-1"), createCargoItem("cargo-2")]);

    const state = controller.getState();
    expect(state.cargos.map((c) => c.id)).toEqual(["cargo-1", "cargo-2"]);
  });

  it("removeItem removes all items sharing the base id", () => {
    const controller = createController({
      initialItems: [
        createCargoItem("cargo-1"),
        createCargoItem("cargo-2"),
        createCargoItem("cargo-2-1", { name: "second instance" }),
      ],
    });

    controller.removeItem("2");

    expect(controller.getState().cargos.map((c) => c.id)).toEqual(["cargo-1"]);
  });

  it("undo/redo round-trips the last committed change", () => {
    const controller = createController();
    controller.setItems([createCargoItem("cargo-1")]);
    controller.addItem(createCargoItem("cargo-2"));

    expect(controller.getState().cargos).toHaveLength(2);

    controller.undo();
    expect(controller.getState().cargos).toHaveLength(1);

    controller.redo();
    expect(controller.getState().cargos).toHaveLength(2);
  });

  it("does not rotate a locked item", () => {
    const controller = createController({ initialItems: [createCargoItem("cargo-1", { isLocked: true })] });

    controller.rotate("cargo-1");

    expect(controller.getState().cargos[0].rotation).toBe(0);
  });

  it("exposes the wired engines for gesture flows", () => {
    const controller = createController();
    expect(controller.stateManager).toBeDefined();
    expect(controller.dispatcher).toBeDefined();
    expect(controller.dragEngine).toBeDefined();
    expect(controller.collisionEngine).toBeDefined();
    expect(controller.snapEngine).toBeDefined();
  });
});
