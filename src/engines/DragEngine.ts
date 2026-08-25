import type { Point, RectLike, Rotation } from "../types/geometry";
import type { DragState } from "../state/DragState";
import type { CollisionEngine } from "./CollisionEngine";
import type { SnapEngine } from "./SnapEngine";
import { calculateDragPosition } from "../domain/dragRules";
import { TRUCK_CANVAS_LEFT, TRUCK_CANVAS_TOP, TRUCK_CANVAS_WIDTH, TRUCK_CANVAS_HEIGHT } from "../constants/canvas";

export class DragEngine<
  T extends RectLike & {
    id: string;
    rotation: Rotation;
  },
> {
  private items: T[];
  private collisionEngine: CollisionEngine | null;
  private snapEngine: SnapEngine | null;

  private state: DragState = {
    isDragging: false,
    activeId: null,
    startMouse: {
      x: 0,
      y: 0,
    },
    startPositions: new Map(),
    startOffsets: new Map(),
  };

  constructor(items: T[], collisionEngine?: CollisionEngine, snapEngine?: SnapEngine) {
    this.items = items;
    this.collisionEngine = collisionEngine ?? null;
    this.snapEngine = snapEngine ?? null;
  }

  startDrag(activeId: string, selectedIds: string[], mouse: Point): void {
    const activeItem = this.items.find((item) => item.id === activeId);
    if (!activeItem) {
      return;
    }

    const startPositions = new Map<string, Point>();
    const startOffsets = new Map<string, Point>();

    selectedIds.forEach((id) => {
      const item = this.items.find((x) => x.id === id);
      if (item) {
        startPositions.set(id, {
          x: item.x,
          y: item.y,
        });
        // store pointer offset so dragging keeps cursor relative position
        startOffsets.set(id, {
          x: mouse.x - item.x,
          y: mouse.y - item.y,
        });
      }
    });

    this.state = {
      isDragging: true,
      activeId,
      startMouse: mouse,
      startPositions,
      startOffsets,
    };
  }

  move(mouse: Point, canvasWidth: number, canvasHeight: number): T[] {
    if (!this.state.isDragging) {
      return this.items;
    }

    const targetItems = this.items.map((item) => {
      const offset = this.state.startOffsets.get(item.id);
      if (!offset) {
        return item;
      }

      // compute base position maintaining the initial cursor offset
      const baseX = mouse.x - offset.x;
      const baseY = mouse.y - offset.y;

      const basePosition = calculateDragPosition(item, { x: baseX, y: baseY }, 0, 0, canvasWidth, canvasHeight);

      const startPos = this.state.startPositions.get(item.id) ?? { x: item.x, y: item.y };
      const bounds = {
        x: TRUCK_CANVAS_LEFT,
        y: TRUCK_CANVAS_TOP,
        length: TRUCK_CANVAS_WIDTH,
        width: TRUCK_CANVAS_HEIGHT,
      };
      const others = this.items.filter((other) => other.id !== item.id);

      let targetPos = { x: basePosition.x, y: basePosition.y };

      // Apply snapping rules if snap engine is active
      if (this.snapEngine) {
        const snapTarget = this.snapEngine.calculateSnapTarget(item, others, targetPos, {
          bounds,
        });
        targetPos = snapTarget.position;
      }

      // Resolve collision overlaps if collision engine is active
      if (this.collisionEngine) {
        targetPos = this.collisionEngine.resolveNonOverlappingPosition(item, targetPos, startPos, others, bounds);
      }

      return { ...item, x: targetPos.x, y: targetPos.y } as T;
    });

    this.items = targetItems;
    return this.items;
  }

  endDrag(): void {
    // Reset drag status and clear starting positions/offsets
    this.state.isDragging = false;
    this.state.activeId = null;
    this.state.startPositions.clear();
    this.state.startOffsets.clear();
  }

  updateItems(items: T[]): void {
    this.items = items;
  }

  isDragging(): boolean {
    return this.state.isDragging;
  }
}
