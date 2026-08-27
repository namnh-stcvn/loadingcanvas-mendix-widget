import { useMemo, useState, type MouseEvent as ReactMouseEvent, type RefObject } from "react";
import type { CargoItem } from "../viewModels/CargoItem";
import type { TruckItem } from "../viewModels/TruckItem";
import { DragEngine } from "../engines/DragEngine";
import { CollisionEngine } from "../engines/CollisionEngine";
import { SnapEngine } from "../engines/SnapEngine";
import { useMouseEvents } from "./useMouseEvents";
import { CanvasStateManager } from "../state/CanvasStateManager";
import { CanvasActionDispatcher } from "../state/CanvasActionDispatcher";
import { useCanvasState } from "./useCanvasState";
import { useCanvasActions } from "./useCanvasActions";
import { getCanvasPoint } from "../domain/coordinateRules";
import type { CanvasState } from "../state/CanvasState";

interface UseTruckCanvasProps {
  initialItems: CargoItem[];
  canvasWidth: number;
  canvasHeight: number;
  canvasRef: RefObject<HTMLDivElement | null>;
  scale?: { widthScale: number; heightScale: number };
  truck?: TruckItem | null;
}

interface UseTruckCanvasResult {
  items: CargoItem[];
  activeItemId: string | null;
  selectedIds: string[];
  validation: { valid: boolean; errors: string[]; itemErrors?: Record<string, string[]> };
  handleMouseDown: (e: ReactMouseEvent, itemId: string) => void;
  handleCanvasMouseDown: (e: ReactMouseEvent<HTMLDivElement>) => void;
  handleRotate: (itemId: string) => void;
  addItem: (item: CargoItem) => void;
  setItems: (items: CargoItem[]) => void;
}

const createInitialCanvasState = (
  initialItems: CargoItem[],
  scale: { widthScale: number; heightScale: number },
  truck: TruckItem | null
): CanvasState => ({
  truck,
  cargos: initialItems,
  selectedIds: [],
  activeItemId: null,
  validation: {
    valid: true,
    errors: [],
  },
  scale,
});

export const useTruckCanvas = ({
  initialItems,
  canvasWidth,
  canvasHeight,
  canvasRef,
  scale = { widthScale: 1, heightScale: 1 },
  truck = null,
}: UseTruckCanvasProps): UseTruckCanvasResult => {
  const collisionEngine = useMemo(() => new CollisionEngine(), []);
  const snapEngine = useMemo(() => new SnapEngine(), []);
  const dragEngine = useMemo(
    () => new DragEngine<CargoItem>(initialItems, collisionEngine, snapEngine),
    [initialItems, collisionEngine, snapEngine]
  );
  const stateManager = useMemo(
    () => new CanvasStateManager(createInitialCanvasState(initialItems, scale, truck)),
    [initialItems, scale, truck]
  );
  const actionDispatcher = useMemo(
    () =>
      new CanvasActionDispatcher(stateManager, {
        canvasWidth,
        canvasHeight,
        dragEngine,
      }),
    [canvasWidth, canvasHeight, stateManager, dragEngine]
  );

  const state = useCanvasState(stateManager);
  const actions = useCanvasActions(actionDispatcher);

  const [dragging, setDragging] = useState(false);

  const handleMouseDown = (e: ReactMouseEvent, itemId: string): void => {
    e.stopPropagation();
    const point = getCanvasPoint(canvasRef.current, e.clientX, e.clientY);
    actions.startDrag(itemId, point);
    setDragging(true);
  };

  const handleCanvasMouseDown = (_e: ReactMouseEvent<HTMLDivElement>): void => {
    actions.deselect();
  };

  const dragMove = (e: MouseEvent): void => {
    const point = getCanvasPoint(canvasRef.current, e.clientX, e.clientY);
    actions.dragMove(point);
  };

  const handleMouseUp = (): void => {
    actions.endDrag();
    setDragging(false);
  };

  const handleCancel = (): void => {
    actions.endDrag();
    setDragging(false);
  };

  useMouseEvents({
    dragging,
    moveItems: dragMove,
    handleMouseUp,
    handleCancel,
  });

  // Manager/dispatcher recreation on [initialItems, scale, truck] is the single
  // restore mechanism: a new dataset identity produces a fresh CanvasStateManager.
  // The dispatcher is also the single owner of dragEngine item-sync; no
  // state-watching effect is needed here.
  return {
    items: state.cargos,
    activeItemId: state.activeItemId,
    selectedIds: state.selectedIds,
    validation: state.validation,
    handleMouseDown,
    handleCanvasMouseDown,
    handleRotate: actions.rotateItem,
    addItem: actions.addItem,
    setItems: actions.setItems,
  };
};
