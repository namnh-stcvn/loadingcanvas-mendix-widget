import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent, type RefObject } from "react";
import type { CargoItem } from "../viewModels/CargoItem";
import type { TrailerItem } from "../viewModels/TrailerItem";
import { DragEngine } from "../engines/DragEngine";
import { CollisionEngine } from "../engines/CollisionEngine";
import { SnapEngine } from "../engines/SnapEngine";
import { ValidationEngine } from "../engines/ValidationEngine";
import { useMouseEvents } from "./useMouseEvents";
import { CanvasStateManager } from "../state/CanvasStateManager";
import { CanvasActionDispatcher } from "../state/CanvasActionDispatcher";
import { useCanvasState } from "./useCanvasState";
import { useCanvasActions } from "./useCanvasActions";
import { getCanvasPoint } from "../domain/coordinateRules";
import type { CanvasState } from "../state/CanvasState";

interface UseTrailerCanvasProps {
    initialItems: CargoItem[];
    canvasWidth: number;
    canvasHeight: number;
    canvasRef: RefObject<HTMLDivElement | null>;
    scale?: number;
    trailer?: TrailerItem | null;
}

interface UseTrailerCanvasResult {
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
    scale: number,
    trailer: TrailerItem | null
): CanvasState => ({
    trailer,
    cargos: initialItems,
    selectedIds: [],
    activeItemId: null,
    validation: {
        valid: true,
        errors: []
    },
    scale,
    offsetX: 0,
    offsetY: 0
});

export const useTrailerCanvas = ({
    initialItems,
    canvasWidth,
    canvasHeight,
    canvasRef,
    scale = 1,
    trailer = null
}: UseTrailerCanvasProps): UseTrailerCanvasResult => {
    const collisionEngine = useMemo(() => new CollisionEngine(), []);
    const snapEngine = useMemo(() => new SnapEngine(), []);
    const dragEngine = useMemo(
        () => new DragEngine<CargoItem>(initialItems, collisionEngine, snapEngine),
        [initialItems, collisionEngine, snapEngine]
    );
    const validationEngine = useMemo(() => new ValidationEngine(), []);
    const stateManager = useMemo(
        () => new CanvasStateManager(createInitialCanvasState(initialItems, scale, trailer)),
        [initialItems, scale, trailer]
    );
    const actionDispatcher = useMemo(
        () =>
            new CanvasActionDispatcher(stateManager, {
                canvasWidth,
                canvasHeight,
                dragEngine,
                validationEngine
            }),
        [canvasWidth, canvasHeight, stateManager, dragEngine, validationEngine]
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
        handleCancel
    });

    useEffect(() => {
        dragEngine.updateItems(state.cargos);
    }, [state.cargos, dragEngine]);

    useEffect(() => {
        if (stateManager.getState().cargos.length !== initialItems.length) {
            stateManager.setState(createInitialCanvasState(initialItems, scale, trailer));
        }
    }, [initialItems, stateManager, scale, trailer]);

    return {
        items: state.cargos,
        activeItemId: state.activeItemId,
        selectedIds: state.selectedIds,
        validation: state.validation,
        handleMouseDown,
        handleCanvasMouseDown,
        handleRotate: actions.rotateItem,
        addItem: actions.addItem,
        setItems: actions.setItems
    };
};
