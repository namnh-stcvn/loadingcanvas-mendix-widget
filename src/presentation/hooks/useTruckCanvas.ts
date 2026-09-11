import { useCallback, useMemo, useState, type MouseEvent as ReactMouseEvent, type RefObject } from "react";
import type { CargoItem } from "../../core/types/viewModels/CargoItem";
import type { TruckItem } from "../../core/types/viewModels/TruckItem";
import { CanvasController } from "../../state/CanvasController";
import { useCanvasState } from "./useCanvasState";
import { useMouseEvents } from "./useMouseEvents";
import { getCanvasPoint } from "./coordinateRule";

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
  removeItem: (baseId: string) => void;
  cancelDrag: () => void;
}

export const useTruckCanvas = ({
  initialItems,
  canvasWidth,
  canvasHeight,
  canvasRef,
  scale = { widthScale: 1, heightScale: 1 },
  truck = null,
}: UseTruckCanvasProps): UseTruckCanvasResult => {
  // Dataset identity change produces a fresh controller: the single restore
  // mechanism for the whole interaction machine (manager + dispatcher + engines).
  const controller = useMemo(
    () => new CanvasController({ initialItems, canvasWidth, canvasHeight, scale, truck }),
    [initialItems, canvasWidth, canvasHeight, scale, truck]
  );

  const state = useCanvasState(controller.stateManager);
  const [dragging, setDragging] = useState(false);

  const startDrag = useCallback(
    (activeId: string, mouse: { x: number; y: number }): void => {
      controller.startDrag(activeId, mouse);
      setDragging(true);
    },
    [controller]
  );

  const move = useCallback(
    (e: MouseEvent): void => {
      controller.move(getCanvasPoint(canvasRef.current, e.clientX, e.clientY));
    },
    [controller, canvasRef]
  );

  const finish = useCallback((): void => {
    controller.endDrag();
    setDragging(false);
  }, [controller]);

  const cancelDrag = useCallback((): void => {
    setDragging(false);
  }, []);

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent, itemId: string): void => {
      e.stopPropagation();
      startDrag(itemId, getCanvasPoint(canvasRef.current, e.clientX, e.clientY));
    },
    [canvasRef, startDrag]
  );

  const handleCanvasMouseDown = useCallback(
    (_e: ReactMouseEvent<HTMLDivElement>): void => {
      controller.dispatcher.dispatch({ type: "DESELECT" });
    },
    [controller]
  );

  const handleRotate = useCallback((itemId: string): void => controller.rotate(itemId), [controller]);
  const addItem = useCallback((item: CargoItem): void => controller.addItem(item), [controller]);
  const setItems = useCallback((items: CargoItem[]): void => controller.setItems(items), [controller]);
  const removeItem = useCallback((baseId: string): void => controller.removeItem(baseId), [controller]);

  // Stable handlers mean the mouse listeners are attached once per gesture.
  useMouseEvents({ dragging, moveItems: move, handleMouseUp: finish, handleCancel: finish });

  return {
    items: state.cargos,
    activeItemId: state.activeItemId,
    selectedIds: state.selectedIds,
    validation: state.validation,
    handleMouseDown,
    handleCanvasMouseDown,
    handleRotate,
    addItem,
    setItems,
    removeItem,
    cancelDrag,
  };
};
