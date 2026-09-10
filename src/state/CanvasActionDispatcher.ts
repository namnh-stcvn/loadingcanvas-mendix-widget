import type { Point } from "../core/types/geometry";
import type { CargoItem } from "../core/types/viewModels/CargoItem";
import type { CanvasStateManager } from "./CanvasStateManager";
import { getCanvasBounds, getTruckBoundsFromItem } from "../domain/rules/boundaryRules";
import { validateAll } from "../domain/rules/validationRules";
import { DragEngine } from "../domain/engines/DragEngine";
import { fromCargoId } from "../core/utils/cargoId";

export type CanvasAction =
  | { type: "SELECT"; ids: string[] }
  | { type: "DESELECT" }
  | { type: "SET_ACTIVE_ITEM"; id: string | null }
  | { type: "START_DRAG"; activeId: string; mouse: Point }
  | { type: "DRAG_MOVE"; mouse: Point }
  | { type: "END_DRAG" }
  | { type: "ROTATE"; itemId: string }
  | { type: "ADD_ITEM"; item: CargoItem }
  | { type: "SET_ITEMS"; items: CargoItem[] }
  | { type: "REMOVE_ITEM"; baseId: string }
  | { type: "UNDO" }
  | { type: "REDO" };

interface CanvasActionDispatcherOptions {
  canvasWidth: number;
  canvasHeight: number;
  dragEngine: DragEngine<CargoItem>;
}

/**
 * Helper: build validation options from the current canvas state.
 * Passes truck-specific constraints (max load meters, scale)
 * to the validation engine for LM checks.
 */
const buildValidationOptions = (state: {
  truck?: { maxLoadMeters?: number } | null;
  scale: { widthScale: number; heightScale: number };
}): { maxLoadMeters?: number; scale: { widthScale: number; heightScale: number } } => ({
  maxLoadMeters: state.truck?.maxLoadMeters,
  scale: state.scale,
});

export class CanvasActionDispatcher {
  private manager: CanvasStateManager;
  private canvasWidth: number;
  private canvasHeight: number;
  private dragEngine: DragEngine<CargoItem>;

  constructor(manager: CanvasStateManager, options: CanvasActionDispatcherOptions) {
    this.manager = manager;
    this.canvasWidth = options.canvasWidth;
    this.canvasHeight = options.canvasHeight;
    this.dragEngine = options.dragEngine;
  }

  dispatch(action: CanvasAction): void {
    const state = this.manager.getState();

    switch (action.type) {
      case "SELECT":
        this.manager.updateState((current) => ({
          ...current,
          selectedIds: action.ids,
          activeItemId: action.ids.length === 1 ? action.ids[0] : current.activeItemId,
        }));
        break;

      case "DESELECT":
        this.manager.updateState((current) => ({
          ...current,
          selectedIds: [],
          activeItemId: null,
        }));
        break;

      case "SET_ACTIVE_ITEM":
        this.manager.updateState((current) => ({
          ...current,
          activeItemId: action.id,
        }));
        break;

      case "START_DRAG": {
        this.dragEngine.updateItems(state.cargos);
        const selectedIds = state.selectedIds.includes(action.activeId) ? state.selectedIds : [action.activeId];
        this.dragEngine.startDrag(action.activeId, selectedIds, action.mouse);
        this.manager.updateState((current) => ({
          ...current,
          selectedIds,
          activeItemId: action.activeId,
        }));
        break;
      }

      case "DRAG_MOVE": {
        const items = this.dragEngine.move(
          action.mouse,
          this.canvasWidth,
          this.canvasHeight,
          state.scale,
          getTruckBoundsFromItem(state.truck)
        );
        // Note: dragEngine.move() already mutates this.items internally,
        // so no additional updateItems() call is needed here.
        // Transient gesture feedback stays relative to the whole canvas;
        // settled layouts (ROTATE/SET_ITEMS/END_DRAG) are held to the truck band.
        const validation = validateAll(
          items,
          getCanvasBounds(this.canvasWidth, this.canvasHeight),
          buildValidationOptions(state)
        );

        // Per-frame movement skips undo history; granularity is per gesture.
        this.manager.updateStateTransient((current) => ({
          ...current,
          cargos: items,
          validation,
        }));
        break;
      }

      case "END_DRAG": {
        this.dragEngine.endDrag();
        // Settled layouts are held to the truck band (BR-22): the gesture-time
        // canvas-relative feedback must not hide out-of-band results after release.
        const settled = this.manager.getState();
        const validation = validateAll(
          settled.cargos,
          getTruckBoundsFromItem(settled.truck),
          buildValidationOptions(settled)
        );
        this.manager.updateState((current) => ({
          ...current,
          activeItemId: null,
          validation,
        }));
        break;
      }

      case "ROTATE": {
        // Locked items keep their pose; others resolve collision-free inside the truck band (BR-22).
        const target = state.cargos.find((item) => item.id === action.itemId);
        if (!target || target.isLocked) {
          break;
        }

        const nextCargos = this.dragEngine.rotateItem(action.itemId, getTruckBoundsFromItem(state.truck), state.scale);
        this.dragEngine.updateItems(nextCargos);
        const validation = validateAll(nextCargos, getTruckBoundsFromItem(state.truck), buildValidationOptions(state));

        this.manager.updateState((current) => ({
          ...current,
          cargos: nextCargos,
          validation,
        }));
        break;
      }

      case "ADD_ITEM": {
        // Single sync owner: the dispatcher keeps dragEngine items in step here,
        // so no external compensating effect is needed. New placements are
        // validated like any other settled layout (band-relative, BR-22-visible).
        const newItem = { ...action.item };
        const updatedCargos = [...state.cargos, newItem];
        this.dragEngine.updateItems(updatedCargos);
        const validation = validateAll(
          updatedCargos,
          getTruckBoundsFromItem(state.truck),
          buildValidationOptions(state)
        );
        this.manager.updateState((current) => ({
          ...current,
          cargos: updatedCargos,
          validation,
        }));
        break;
      }

      case "SET_ITEMS": {
        this.dragEngine.updateItems(action.items);
        const validation = validateAll(
          action.items,
          getTruckBoundsFromItem(state.truck),
          buildValidationOptions(state)
        );
        this.manager.updateState((current) => ({
          ...current,
          cargos: action.items,
          validation,
        }));
        break;
      }

      case "REMOVE_ITEM": {
        // Remove ALL items that belong to the same transport order (same baseId)
        // Items on canvas have IDs like "cargo-<transportOrderGuid>"
        // We use fromCargoId to extract the base transport order GUID
        const remainingCargos = state.cargos.filter((item) => fromCargoId(item.id) !== action.baseId);
        this.dragEngine.updateItems(remainingCargos);
        const validation = validateAll(
          remainingCargos,
          getTruckBoundsFromItem(state.truck),
          buildValidationOptions(state)
        );
        this.manager.updateState((current) => ({
          ...current,
          cargos: remainingCargos,
          validation,
        }));
        break;
      }

      case "UNDO": {
        this.manager.undo();
        this.dragEngine.updateItems(this.manager.getState().cargos);
        break;
      }

      case "REDO": {
        this.manager.redo();
        this.dragEngine.updateItems(this.manager.getState().cargos);
        break;
      }

      default:
        break;
    }
  }
}
