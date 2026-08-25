import type { Point } from "../types/geometry";
import type { CargoItem } from "../viewModels/CargoItem";
import type { CanvasStateManager } from "./CanvasStateManager";
import { rotate90, getRotatedSize } from "../domain/rotationRules";
import { DragEngine } from "../engines/DragEngine";
import { ValidationEngine } from "../engines/ValidationEngine";

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
  | { type: "UNDO" }
  | { type: "REDO" };

interface CanvasActionDispatcherOptions {
  canvasWidth: number;
  canvasHeight: number;
  dragEngine: DragEngine<CargoItem>;
  validationEngine: ValidationEngine;
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
  private validationEngine: ValidationEngine;

  constructor(manager: CanvasStateManager, options: CanvasActionDispatcherOptions) {
    this.manager = manager;
    this.canvasWidth = options.canvasWidth;
    this.canvasHeight = options.canvasHeight;
    this.dragEngine = options.dragEngine;
    this.validationEngine = options.validationEngine;
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
        const items = this.dragEngine.move(action.mouse, this.canvasWidth, this.canvasHeight);
        this.dragEngine.updateItems(items);
        const validation = this.validationEngine.validateItems(
          items,
          { x: 0, y: 0, length: this.canvasWidth, width: this.canvasHeight },
          buildValidationOptions(state)
        );

        this.manager.updateState((current) => ({
          ...current,
          cargos: items,
          validation,
        }));
        break;
      }

      case "END_DRAG": {
        this.dragEngine.endDrag();
        const stateAfterDrag = this.manager.getState();
        this.manager.updateState((current) => ({
          ...current,
          activeItemId: null,
          selectedIds: stateAfterDrag.selectedIds,
        }));
        break;
      }

      case "ROTATE": {
        const nextCargos = state.cargos.map((item) => {
          if (item.id !== action.itemId || item.isLocked) {
            return item;
          }

          const newRotation = rotate90(item.rotation);

          // compute previous visual size and new visual size (without changing model l/w)
          const prevVis = getRotatedSize({ length: item.length, width: item.width }, item.rotation);
          const nextVis = getRotatedSize({ length: item.length, width: item.width }, newRotation);

          // keep center invariant based on visual sizes
          const centerX = item.x + prevVis.length / 2;
          const centerY = item.y + prevVis.width / 2;

          const newX = centerX - nextVis.length / 2;
          const newY = centerY - nextVis.width / 2;

          return {
            ...item,
            rotation: newRotation,
            // keep model length/width unchanged; renderer uses getRotatedSize
            x: Math.max(0, Math.min(newX, this.canvasWidth - nextVis.length)),
            y: Math.max(0, Math.min(newY, this.canvasHeight - nextVis.width)),
          };
        });

        this.dragEngine.updateItems(nextCargos);
        const validation = this.validationEngine.validateItems(
          nextCargos,
          { x: 0, y: 0, length: this.canvasWidth, width: this.canvasHeight },
          buildValidationOptions(state)
        );

        this.manager.updateState((current) => ({
          ...current,
          cargos: nextCargos,
          validation,
        }));
        break;
      }

      case "ADD_ITEM": {
        const newItem = { ...action.item };
        this.manager.updateState((current) => ({
          ...current,
          cargos: [...current.cargos, newItem],
        }));
        break;
      }

      case "SET_ITEMS": {
        this.dragEngine.updateItems(action.items);
        const validation = this.validationEngine.validateItems(
          action.items,
          { x: 0, y: 0, length: this.canvasWidth, width: this.canvasHeight },
          buildValidationOptions(state)
        );
        this.manager.updateState((current) => ({
          ...current,
          cargos: action.items,
          validation,
        }));
        break;
      }

      case "UNDO": {
        this.manager.undo();
        break;
      }

      case "REDO": {
        this.manager.redo();
        break;
      }

      default:
        break;
    }
  }
}
