import { jsx, jsxs } from 'react/jsx-runtime';
import { useMemo, useEffect, useState, useCallback, useRef } from 'react';

// constants for rendering, coordinate, viewport, scale, grid, and rotation
// canvas
const DEFAULT_CANVAS_WIDTH = 1000;
const DEFAULT_CANVAS_HEIGHT = 600;
const CANVAS_BORDER = "2px solid black";
// layout
const DEFAULT_MARGIN = "20px auto";
// overlay
const INFO_PANEL_TOP = 10;
const INFO_PANEL_LEFT = 10;
const INFO_PANEL_Z_INDEX = 1000;
const INFO_PANEL_PADDING = "4px 8px";
const INFO_PANEL_BACKGROUND = "#fff";
const INFO_PANEL_BORDER = "1px solid #ddd";
// grid
const GRID_SIZE = 20;
// rotation
const ROTATION_STEP = 90;
const SNAP_THRESHOLD = 15;

/**
 * Rotate clockwise 90 degrees
 */
const rotate90 = (rotation) => {
    return ((rotation + ROTATION_STEP) % 360);
};
/**
 * Check if object is visually vertical
 */
const isVerticalRotation = (rotation) => {
    return rotation === 90 || rotation === 270;
};
/**
 * Get rendered size after rotation
 */
const getRotatedSize = (size, rotation) => {
    if (isVerticalRotation(rotation)) {
        return {
            width: size.height,
            height: size.width
        };
    }
    return size;
};

const RotationHandle = ({ onMouseDown }) => {
    return (jsx("div", { onMouseDown: onMouseDown, style: {
            position: "absolute",
            top: 4,
            left: "50%",
            transform: "translateX(-50%)",
            width: 16,
            height: 16,
            backgroundColor: "transparent",
            borderRadius: "50%",
            cursor: "grab",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#4a90d9",
            fontSize: 16,
            fontWeight: "bold",
            border: "2px solid #4a90d9",
            boxShadow: "none",
            zIndex: 10
        }, title: "Rotate", children: "\u21BB" }));
};

// card
const CARD_BORDER_WIDTH = 1;
const CARD_SELECTED_BORDER_WIDTH = 3;
const CARD_ACTIVE_BORDER_WIDTH = 3;
const CARD_BORDER_COLOR = "gray";
const CARD_SELECTED_BORDER_COLOR = "blue";
const CARD_ACTIVE_BORDER_COLOR = "red";

const CargoCard = ({ item, isActive, selectedIds, onMouseDown, onRotate, hasError }) => {
    const size = getRotatedSize({
        width: item.width,
        height: item.height
    }, item.rotation);
    const isSelected = selectedIds.includes(item.id);
    const borderColor = hasError ? "#ff4444" : CARD_BORDER_COLOR;
    const border = isActive
        ? `${CARD_ACTIVE_BORDER_WIDTH}px solid ${CARD_ACTIVE_BORDER_COLOR}`
        : isSelected
            ? `${CARD_SELECTED_BORDER_WIDTH}px solid ${CARD_SELECTED_BORDER_COLOR}`
            : `${CARD_BORDER_WIDTH}px solid ${borderColor}`;
    return (jsxs("div", { style: {
            position: "absolute",
            left: item.x,
            top: item.y
        }, children: [jsx("div", { "data-id": item.id, onMouseDown: onMouseDown, style: {
                    width: size.width,
                    height: size.height,
                    backgroundColor: item.color,
                    cursor: item.isLocked ? "not-allowed" : "move",
                    userSelect: "none",
                    border,
                    boxSizing: "border-box"
                } }), jsxs("div", { style: {
                    position: "absolute",
                    top: size.height + 4,
                    left: 0,
                    whiteSpace: "nowrap",
                    fontSize: 12,
                    pointerEvents: "none"
                }, children: [item.name, jsx("br", {}), "id: ", item.id, jsx("br", {}), "pos: (", item.x, ", ", item.y, ")", jsx("br", {}), "size: ", item.width, " \u00D7 ", item.height, jsx("br", {}), "rotation: ", item.rotation, "\u00B0", item.heightM && jsx("br", {}), item.heightM && `height: ${item.heightM}m`, item.weightKg && jsx("br", {}), item.weightKg && `weight: ${item.weightKg}kg`] }), jsx(RotationHandle, { onMouseDown: e => {
                    e.stopPropagation();
                    onRotate(item.id);
                } })] }));
};

// PalletList — debug view showing available cargo items draggable onto canvas
const PalletList = ({ pallets, onAddPallet }) => {
    if (pallets.length === 0) {
        return (jsx("div", { style: {
                position: "absolute",
                bottom: 10,
                left: 10,
                padding: "4px 8px",
                background: "rgba(255, 255, 255, 0.8)",
                border: "1px solid #ddd",
                borderRadius: 4,
                fontSize: 12,
                color: "#666",
            }, children: "No pallets available" }));
    }
    return (jsx("div", { style: {
            position: "absolute",
            bottom: 10,
            left: 10,
            display: "flex",
            gap: 8,
            padding: "8px 12px",
            background: "rgba(255, 255, 255, 0.9)",
            border: "1px solid #ddd",
            borderRadius: 4,
            zIndex: 1000,
        }, children: pallets.map((pallet) => (jsxs("div", { draggable: true, onDragStart: (e) => {
                // Set the pallet ID as drag data
                e.dataTransfer.setData("text/plain", pallet.id);
                e.dataTransfer.effectAllowed = "move";
            }, onClick: () => onAddPallet(pallet), style: {
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "grab",
                userSelect: "none",
            }, title: `Drag ${pallet.name} onto canvas`, children: [jsx("div", { style: {
                        width: 40,
                        height: 40,
                        backgroundColor: pallet.color,
                        border: "2px solid #333",
                        borderRadius: 4,
                        boxSizing: "border-box",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 8,
                        color: "#fff",
                        fontWeight: "bold",
                    }, children: pallet.type === "pallet" ? "📦" : "📦" }), jsx("span", { style: { fontSize: 10, marginTop: 2, color: "#333" }, children: pallet.name }), jsxs("span", { style: { fontSize: 8, color: "#666" }, children: [pallet.width, "\u00D7", pallet.height] })] }, pallet.id))) }));
};

/**
 * GridOverlay — renders a subtle grid pattern on the canvas to visualize
 * the grid snapping. The grid is rendered as a CSS background pattern
 * so it doesn't interfere with drag-and-drop or mouse events.
 */
const GridOverlay = ({ width, height, gridSize = GRID_SIZE }) => {
    // Generate a grid background using a canvas element for crisp lines
    const gridImageUrl = useMemo(() => {
        const canvas = document.createElement("canvas");
        canvas.width = gridSize;
        canvas.height = gridSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return "";
        }
        ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(gridSize, gridSize);
        ctx.moveTo(gridSize, 0);
        ctx.lineTo(0, gridSize);
        ctx.stroke();
        return canvas.toDataURL();
    }, [gridSize]);
    return (jsx("div", { style: {
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height,
            backgroundImage: `url("${gridImageUrl}")`,
            backgroundSize: `${gridSize}px ${gridSize}px`,
            pointerEvents: "none",
            zIndex: 1
        } }));
};

/**
 * Keep a numeric value inside a range
 */
const clamp = (value, min, max) => {
    return Math.max(min, Math.min(value, max));
};

const snapToGrid = (value, gridSize) => {
    if (gridSize <= 0) {
        return value;
    }
    return Math.round(value / gridSize) * gridSize;
};
const snapPosition = (x, y, gridSize) => {
    return {
        x: snapToGrid(x, gridSize),
        y: snapToGrid(y, gridSize)
    };
};

const calculateDragPosition = (item, startPosition, deltaX, deltaY, canvasWidth, canvasHeight, gridSize = GRID_SIZE) => {
    const target = snapPosition(startPosition.x + deltaX, startPosition.y + deltaY, gridSize);
    return {
        ...item,
        x: clamp(target.x, 0, canvasWidth - item.width),
        y: clamp(target.y, 0, canvasHeight - item.height)
    };
};

class DragEngine {
    items;
    collisionEngine;
    snapEngine;
    state = {
        isDragging: false,
        activeId: null,
        startMouse: {
            x: 0,
            y: 0
        },
        startPositions: new Map(),
        startOffsets: new Map()
    };
    constructor(items, collisionEngine, snapEngine) {
        this.items = items;
        this.collisionEngine = collisionEngine ?? null;
        this.snapEngine = snapEngine ?? null;
    }
    startDrag(activeId, selectedIds, mouse) {
        const activeItem = this.items.find(item => item.id === activeId);
        if (!activeItem) {
            return;
        }
        const startPositions = new Map();
        const startOffsets = new Map();
        selectedIds.forEach(id => {
            const item = this.items.find(x => x.id === id);
            if (item) {
                startPositions.set(id, {
                    x: item.x,
                    y: item.y
                });
                // store pointer offset so dragging keeps cursor relative position
                startOffsets.set(id, {
                    x: mouse.x - item.x,
                    y: mouse.y - item.y
                });
            }
        });
        this.state = {
            isDragging: true,
            activeId,
            startMouse: mouse,
            startPositions,
            startOffsets
        };
    }
    move(mouse, canvasWidth, canvasHeight) {
        if (!this.state.isDragging) {
            return this.items;
        }
        const targetItems = this.items.map(item => {
            const offset = this.state.startOffsets.get(item.id);
            if (!offset) {
                return item;
            }
            // compute base position maintaining the initial cursor offset
            const baseX = mouse.x - offset.x;
            const baseY = mouse.y - offset.y;
            const basePosition = calculateDragPosition(item, { x: baseX, y: baseY }, 0, 0, canvasWidth, canvasHeight);
            const startPos = this.state.startPositions.get(item.id) ?? { x: item.x, y: item.y };
            const bounds = { x: 0, y: 0, width: canvasWidth, height: canvasHeight };
            const others = this.items.filter(other => other.id !== item.id);
            let targetPos = { x: basePosition.x, y: basePosition.y };
            // Apply snapping rules if snap engine is active
            if (this.snapEngine) {
                const snapTarget = this.snapEngine.calculateSnapTarget(item, others, targetPos, {
                    bounds
                });
                targetPos = snapTarget.position;
            }
            // Resolve collision overlaps if collision engine is active
            if (this.collisionEngine) {
                targetPos = this.collisionEngine.resolveNonOverlappingPosition(item, targetPos, startPos, others, bounds);
            }
            return { ...item, x: targetPos.x, y: targetPos.y };
        });
        this.items = targetItems;
        return this.items;
    }
    endDrag() {
        // Reset drag status and clear starting positions/offsets
        this.state.isDragging = false;
        this.state.activeId = null;
        this.state.startPositions.clear();
        this.state.startOffsets.clear();
    }
    updateItems(items) {
        this.items = items;
    }
    isDragging() {
        return this.state.isDragging;
    }
}

/**
 * Convert x,y,width,height
 * to bounding rectangle
 */
const getRectangle = (item) => {
    const isVertical = typeof item.rotation === "number" && isVerticalRotation(item.rotation);
    const width = isVertical ? item.height : item.width;
    const height = isVertical ? item.width : item.height;
    return {
        left: item.x,
        top: item.y,
        right: item.x + width,
        bottom: item.y + height
    };
};
/**
 * Check AABB intersection
 */
const isIntersecting = (a, b, eps = 1e-4) => {
    return !(a.right <= b.left + eps || a.left >= b.right - eps || a.bottom <= b.top + eps || a.top >= b.bottom - eps);
};
/**
 * Check overlap between two items
 */
const overlaps = (a, b) => {
    return isIntersecting(getRectangle(a), getRectangle(b));
};
/**
 * Check item inside bounds (account for rotation)
 */
const isInsideBounds = (item, bounds) => {
    const rect = getRectangle(item);
    return (rect.left >= bounds.x &&
        rect.top >= bounds.y &&
        rect.right <= bounds.x + bounds.width &&
        rect.bottom <= bounds.y + bounds.height);
};
const findCollisions = (target, items) => {
    return items.filter(item => {
        if (item === target) {
            return false;
        }
        return overlaps(target, item);
    });
};

class CollisionEngine {
    detectCollisions(item, others) {
        return findCollisions(item, others);
    }
    findValidPositions(item, others, bounds, snapDistance = 0) {
        const itemVis = getRotatedSize({ width: item.width, height: item.height }, item.rotation ?? 0);
        const itemW = itemVis.width;
        const itemH = itemVis.height;
        const xCandidates = new Set();
        xCandidates.add(item.x);
        if (bounds) {
            xCandidates.add(bounds.x);
            xCandidates.add(bounds.x + bounds.width - itemW);
        }
        const yCandidates = new Set();
        yCandidates.add(item.y);
        if (bounds) {
            yCandidates.add(bounds.y);
            yCandidates.add(bounds.y + bounds.height - itemH);
        }
        for (const other of others) {
            const otherVis = getRotatedSize({ width: other.width, height: other.height }, other.rotation ?? 0);
            const otherW = otherVis.width;
            const otherH = otherVis.height;
            // X-axis candidates for item
            xCandidates.add(other.x + otherW + snapDistance);
            xCandidates.add(other.x - itemW - snapDistance);
            xCandidates.add(other.x);
            xCandidates.add(other.x + otherW - itemW);
            // Y-axis candidates for item
            yCandidates.add(other.y + otherH + snapDistance);
            yCandidates.add(other.y - itemH - snapDistance);
            yCandidates.add(other.y);
            yCandidates.add(other.y + otherH - itemH);
        }
        const validPositions = [];
        const visited = new Set();
        for (const x of xCandidates) {
            for (const y of yCandidates) {
                const key = `${Math.round(x * 100)}_${Math.round(y * 100)}`;
                if (visited.has(key)) {
                    continue;
                }
                visited.add(key);
                const candidatePos = { x, y };
                if (this.isValidPosition(item, candidatePos, others, bounds)) {
                    validPositions.push({
                        position: candidatePos,
                        type: "grid",
                        distance: Math.hypot(x - item.x, y - item.y)
                    });
                }
            }
        }
        return validPositions.sort((a, b) => a.distance - b.distance);
    }
    resolveNonOverlappingPosition(item, desiredPos, startPos, others, bounds) {
        const desiredItem = { ...item, x: desiredPos.x, y: desiredPos.y };
        // 1. If desired position does not collide and is inside bounds, return desiredPos
        if (isInsideBounds(desiredItem, bounds) && this.detectCollisions(desiredItem, others).length === 0) {
            return desiredPos;
        }
        // 2. Find valid corner/edge candidate position closest to desiredPos
        const validPositions = this.findValidPositions(desiredItem, others, bounds, 0);
        if (validPositions.length > 0) {
            return validPositions[0].position;
        }
        // 3. Try moving along X axis only
        const xOnlyItem = { ...item, x: desiredPos.x, y: startPos.y };
        if (isInsideBounds(xOnlyItem, bounds) && this.detectCollisions(xOnlyItem, others).length === 0) {
            return { x: desiredPos.x, y: startPos.y };
        }
        // 4. Try moving along Y axis only
        const yOnlyItem = { ...item, x: startPos.x, y: desiredPos.y };
        if (isInsideBounds(yOnlyItem, bounds) && this.detectCollisions(yOnlyItem, others).length === 0) {
            return { x: startPos.x, y: desiredPos.y };
        }
        // 5. Fallback: revert to original start position
        return startPos;
    }
    isValidPosition(item, position, others, bounds) {
        const movedItem = { ...item, x: position.x, y: position.y };
        if (!isInsideBounds(movedItem, bounds)) {
            return false;
        }
        return this.detectCollisions(movedItem, others).length === 0;
    }
}

// Default configuration values
const DEFAULT_SNAP_CONFIG = {
    gridSize: GRID_SIZE,
    threshold: SNAP_THRESHOLD,
};
// Evaluates a snap candidate against the current best candidate
function evaluateCandidate(current, candidate) {
    return candidate.distance < current.distance ? candidate : current;
}
// Creates a snap candidate for a target position
function createCandidate(position, type, targetPos) {
    return {
        position,
        type,
        distance: Math.abs(targetPos - position),
    };
}
// Calculates boundary snap candidates for a single axis
function calculateBoundaryCandidates(targetPos, itemSize, bounds, axis) {
    const boundsStart = axis === "x" ? bounds.x : bounds.y;
    const boundsEnd = axis === "x" ? bounds.x + bounds.width : bounds.y + bounds.height;
    return [
        createCandidate(boundsStart, "boundary", targetPos),
        createCandidate(boundsEnd - itemSize, "boundary", targetPos),
    ];
}
// Calculates edge and alignment snap candidates for a single axis against another item
function calculateItemSnapCandidates(targetPos, itemSize, other, otherSize, axis) {
    const otherStart = axis === "x" ? other.x : other.y;
    const otherEnd = axis === "x" ? other.x + otherSize : other.y + otherSize;
    return [
        createCandidate(otherEnd, "edge", targetPos), // Edge: item touching other's far edge
        createCandidate(otherStart - itemSize, "edge", targetPos), // Edge: item touching other's near edge
        createCandidate(otherStart, "align", targetPos), // Align: item's near edge aligned with other's near edge
        createCandidate(otherEnd - itemSize, "align", targetPos), // Align: item's far edge aligned with other's far edge
    ];
}
// Calculates grid snap candidate for a single axis
function calculateGridCandidate(targetPos, gridSize, threshold) {
    if (gridSize <= 0) {
        return null;
    }
    const gridPos = snapToGrid(targetPos, gridSize);
    const distance = Math.abs(targetPos - gridPos);
    if (distance <= threshold) {
        return createCandidate(gridPos, "grid", targetPos);
    }
    return null;
}
// Finds the best snap candidate from a list of candidates
function findBestCandidate(candidates, threshold, targetPos) {
    const initial = {
        position: targetPos,
        type: "none",
        distance: threshold + 1,
    };
    return candidates.reduce((best, candidate) => evaluateCandidate(best, candidate), initial);
}
class SnapEngine {
    // Calculates the best snap target for an item being dragged
    // Priority: 1. Boundary 2. Edge contact 3. Alignment 4. Grid (fallback)
    calculateSnapTarget(item, others, targetPos, config = {}) {
        const { bounds, gridSize = DEFAULT_SNAP_CONFIG.gridSize, threshold = DEFAULT_SNAP_CONFIG.threshold } = config;
        const itemVis = getRotatedSize({ width: item.width, height: item.height }, item.rotation ?? 0);
        // Collect all X-axis candidates
        const xCandidates = [];
        // 1. Boundary snap candidates
        if (bounds) {
            xCandidates.push(...calculateBoundaryCandidates(targetPos.x, itemVis.width, bounds, "x"));
        }
        // 2. Edge contact & alignment candidates against other items
        for (const other of others) {
            const otherVis = getRotatedSize({ width: other.width, height: other.height }, other.rotation ?? 0);
            xCandidates.push(...calculateItemSnapCandidates(targetPos.x, itemVis.width, other, otherVis.width, "x"));
        }
        // 3. Grid snap fallback (only if no better candidate found)
        const bestX = findBestCandidate(xCandidates, threshold, targetPos.x);
        if (bestX.distance > threshold) {
            const gridCandidate = calculateGridCandidate(targetPos.x, gridSize, threshold);
            if (gridCandidate) {
                xCandidates.push(gridCandidate);
            }
        }
        // Collect all Y-axis candidates
        const yCandidates = [];
        // 1. Boundary snap candidates
        if (bounds) {
            yCandidates.push(...calculateBoundaryCandidates(targetPos.y, itemVis.height, bounds, "y"));
        }
        // 2. Edge contact & alignment candidates against other items
        for (const other of others) {
            const otherVis = getRotatedSize({ width: other.width, height: other.height }, other.rotation ?? 0);
            yCandidates.push(...calculateItemSnapCandidates(targetPos.y, itemVis.height, other, otherVis.height, "y"));
        }
        // 3. Grid snap fallback
        const bestY = findBestCandidate(yCandidates, threshold, targetPos.y);
        if (bestY.distance > threshold) {
            const gridCandidate = calculateGridCandidate(targetPos.y, gridSize, threshold);
            if (gridCandidate) {
                yCandidates.push(gridCandidate);
            }
        }
        // Recalculate best with grid candidates included
        const finalBestX = findBestCandidate(xCandidates, threshold, targetPos.x);
        const finalBestY = findBestCandidate(yCandidates, threshold, targetPos.y);
        const maxDistance = Math.max(finalBestX.distance <= threshold ? finalBestX.distance : 0, finalBestY.distance <= threshold ? finalBestY.distance : 0);
        const resultType = finalBestX.type !== "none" ? finalBestX.type : finalBestY.type !== "none" ? finalBestY.type : "none";
        return {
            position: { x: finalBestX.position, y: finalBestY.position },
            type: resultType,
            distance: maxDistance,
        };
    }
}

// Validate a single item against bounds and other items
const validateItem = (item, bounds, others) => {
    const errors = [];
    if (!isInsideBounds(item, bounds)) {
        errors.push("OUT_OF_BOUNDS");
    }
    const hasOverlap = others.some((other) => overlaps(item, other));
    if (hasOverlap) {
        errors.push("OVERLAP");
    }
    return {
        valid: errors.length === 0,
        errors,
    };
};
// Validate total load meters (LM) against trailer's max load meters
const validateLoadMeters = (items, maxLoadMeters, scale) => {
    const totalLengthMeters = items.reduce((sum, item) => sum + item.width / scale, 0);
    if (totalLengthMeters > maxLoadMeters) {
        return {
            valid: false,
            errors: ["LM_EXCEEDED"],
        };
    }
    return {
        valid: true,
        errors: [],
    };
};
// Validate item heights against trailer's internal height
const validateHeight = (items, internalHeightMeter) => {
    const itemErrors = {};
    let hasError = false;
    for (const item of items) {
        const itemHeight = item.heightM ?? 0;
        if (itemHeight > internalHeightMeter) {
            itemErrors[item.id] = ["HEIGHT_EXCEEDED"];
            hasError = true;
        }
    }
    return {
        valid: !hasError,
        errors: hasError ? ["HEIGHT_EXCEEDED"] : [],
        itemErrors,
    };
};
// Validate all items against bounds, each other, LM, and height
const validateAll = (items, bounds, options) => {
    const allErrors = [];
    const itemErrors = {};
    // 1. Validate each item against bounds and overlaps
    for (const item of items) {
        const others = items.filter((other) => other.id !== item.id);
        const result = validateItem(item, bounds, others);
        if (!result.valid) {
            allErrors.push(...result.errors);
            itemErrors[item.id] = result.errors;
        }
    }
    // 2. Validate load meters
    if (options?.maxLoadMeters && options?.scale) {
        const lmResult = validateLoadMeters(items, options.maxLoadMeters, options.scale);
        if (!lmResult.valid) {
            allErrors.push(...lmResult.errors);
        }
    }
    // 3. Validate height
    if (options?.internalHeightMeter) {
        const heightResult = validateHeight(items, options.internalHeightMeter);
        if (!heightResult.valid) {
            allErrors.push(...heightResult.errors);
            Object.assign(itemErrors, heightResult.itemErrors);
        }
    }
    return {
        valid: allErrors.length === 0,
        errors: allErrors,
        itemErrors,
    };
};

class ValidationEngine {
    validateItems(items, bounds, options) {
        return validateAll(items, bounds, options);
    }
}

const useMouseEvents = ({ dragging, moveItems, handleMouseUp, handleCancel }) => {
    useEffect(() => {
        const handleMove = (e) => {
            if (dragging) {
                moveItems(e);
            }
        };
        if (!dragging) {
            return;
        }
        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("blur", handleCancel);
        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("blur", handleCancel);
        };
    }, [dragging, moveItems, handleMouseUp, handleCancel]);
};

/**
 * Deep-clone a CanvasState using JSON round-trip.
 * Avoids structuredClone (unavailable in Node <17 / older jsdom).
 */
function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
}
class CanvasStateManager {
    state;
    listeners = new Set();
    history = [];
    historyIndex = -1;
    constructor(initialState) {
        this.state = cloneState(initialState);
        this.history = [cloneState(initialState)];
        this.historyIndex = 0;
    }
    getState() {
        return cloneState(this.state);
    }
    setState(nextState) {
        const nextClone = cloneState(nextState);
        this.state = nextClone;
        // Push to history, truncating any redo branch
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(nextClone);
        this.historyIndex = this.history.length - 1;
        this.notifyListeners();
    }
    updateState(update) {
        this.setState(update(this.state));
    }
    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.getState());
        return () => {
            this.listeners.delete(listener);
        };
    }
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.state = cloneState(this.history[this.historyIndex]);
            this.notifyListeners();
        }
    }
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.state = cloneState(this.history[this.historyIndex]);
            this.notifyListeners();
        }
    }
    notifyListeners() {
        for (const listener of this.listeners) {
            listener(this.getState());
        }
    }
}

/**
 * Helper: build validation options from the current canvas state.
 * Passes trailer-specific constraints (max load meters, internal height, scale)
 * to the validation engine for LM and height checks.
 */
const buildValidationOptions = (state) => ({
    maxLoadMeters: state.trailer?.maxLoadMeters,
    internalHeightMeter: state.trailer?.internalHeightMeter,
    scale: state.scale,
});
class CanvasActionDispatcher {
    manager;
    canvasWidth;
    canvasHeight;
    dragEngine;
    validationEngine;
    constructor(manager, options) {
        this.manager = manager;
        this.canvasWidth = options.canvasWidth;
        this.canvasHeight = options.canvasHeight;
        this.dragEngine = options.dragEngine;
        this.validationEngine = options.validationEngine;
    }
    dispatch(action) {
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
                const validation = this.validationEngine.validateItems(items, { x: 0, y: 0, width: this.canvasWidth, height: this.canvasHeight }, buildValidationOptions(state));
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
                    // compute previous visual size and new visual size (without changing model w/h)
                    const prevVis = getRotatedSize({ width: item.width, height: item.height }, item.rotation);
                    const nextVis = getRotatedSize({ width: item.width, height: item.height }, newRotation);
                    // keep center invariant based on visual sizes
                    const centerX = item.x + prevVis.width / 2;
                    const centerY = item.y + prevVis.height / 2;
                    const newX = centerX - nextVis.width / 2;
                    const newY = centerY - nextVis.height / 2;
                    return {
                        ...item,
                        rotation: newRotation,
                        // keep model width/height unchanged; renderer uses getRotatedSize
                        x: Math.max(0, Math.min(newX, this.canvasWidth - nextVis.width)),
                        y: Math.max(0, Math.min(newY, this.canvasHeight - nextVis.height)),
                    };
                });
                this.dragEngine.updateItems(nextCargos);
                const validation = this.validationEngine.validateItems(nextCargos, { x: 0, y: 0, width: this.canvasWidth, height: this.canvasHeight }, buildValidationOptions(state));
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
                const validation = this.validationEngine.validateItems(action.items, { x: 0, y: 0, width: this.canvasWidth, height: this.canvasHeight }, buildValidationOptions(state));
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
        }
    }
}

const useCanvasState = (manager) => {
    // Use a lazy initializer that calls manager.getState() with correct `this` binding
    const [state, setState] = useState(() => manager.getState());
    useEffect(() => {
        const unsubscribe = manager.subscribe(currentState => {
            setState(currentState);
        });
        return unsubscribe;
    }, [manager]);
    return state;
};

const useCanvasActions = (dispatcher) => {
    return {
        startDrag: useCallback((itemId, mouse) => {
            dispatcher.dispatch({ type: "START_DRAG", activeId: itemId, mouse });
        }, [dispatcher]),
        dragMove: useCallback((mouse) => {
            dispatcher.dispatch({ type: "DRAG_MOVE", mouse });
        }, [dispatcher]),
        endDrag: useCallback(() => {
            dispatcher.dispatch({ type: "END_DRAG" });
        }, [dispatcher]),
        rotateItem: useCallback((itemId) => {
            dispatcher.dispatch({ type: "ROTATE", itemId });
        }, [dispatcher]),
        addItem: useCallback((item) => {
            dispatcher.dispatch({ type: "ADD_ITEM", item });
        }, [dispatcher]),
        setItems: useCallback((items) => {
            dispatcher.dispatch({ type: "SET_ITEMS", items });
        }, [dispatcher]),
        deselect: useCallback(() => {
            dispatcher.dispatch({ type: "DESELECT" });
        }, [dispatcher])
    };
};

/**
 * Convert browser coordinate to canvas coordinate.
 */
const getCanvasPoint = (canvas, clientX, clientY) => {
    if (!canvas) {
        return {
            x: 0,
            y: 0
        };
    }
    const rect = canvas.getBoundingClientRect();
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
};
const meterToPixel = (meter, scale) => {
    return meter * scale;
};
const pixelToMeter = (pixel, scale) => {
    return pixel / scale;
};

const createInitialCanvasState = (initialItems, scale, trailer) => ({
    trailer,
    cargos: initialItems,
    selectedIds: [],
    activeItemId: null,
    validation: {
        valid: true,
        errors: [],
    },
    scale,
});
const useTrailerCanvas = ({ initialItems, canvasWidth, canvasHeight, canvasRef, scale = 1, trailer = null, }) => {
    const collisionEngine = useMemo(() => new CollisionEngine(), []);
    const snapEngine = useMemo(() => new SnapEngine(), []);
    const dragEngine = useMemo(() => new DragEngine(initialItems, collisionEngine, snapEngine), [initialItems, collisionEngine, snapEngine]);
    const validationEngine = useMemo(() => new ValidationEngine(), []);
    const stateManager = useMemo(() => new CanvasStateManager(createInitialCanvasState(initialItems, scale, trailer)), [initialItems, scale, trailer]);
    const actionDispatcher = useMemo(() => new CanvasActionDispatcher(stateManager, {
        canvasWidth,
        canvasHeight,
        dragEngine,
        validationEngine,
    }), [canvasWidth, canvasHeight, stateManager, dragEngine, validationEngine]);
    const state = useCanvasState(stateManager);
    const actions = useCanvasActions(actionDispatcher);
    const [dragging, setDragging] = useState(false);
    const handleMouseDown = (e, itemId) => {
        e.stopPropagation();
        const point = getCanvasPoint(canvasRef.current, e.clientX, e.clientY);
        actions.startDrag(itemId, point);
        setDragging(true);
    };
    const handleCanvasMouseDown = (_e) => {
        actions.deselect();
    };
    const dragMove = (e) => {
        const point = getCanvasPoint(canvasRef.current, e.clientX, e.clientY);
        actions.dragMove(point);
    };
    const handleMouseUp = () => {
        actions.endDrag();
        setDragging(false);
    };
    const handleCancel = () => {
        actions.endDrag();
        setDragging(false);
    };
    useMouseEvents({
        dragging,
        moveItems: dragMove,
        handleMouseUp,
        handleCancel,
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
        setItems: actions.setItems,
    };
};

// theme ui, canvas colors
const CANVAS_BACKGROUND_COLOR = "#fafafa";

/**
 * LoadingCanvas — the Mendix Pluggable Widget entry point.
 *
 * This component receives view models from the LoadingCanvasContainer
 * (which resolves Mendix object references via mx.data) and renders the
 * interactive packing canvas.
 *
 * Key responsibilities:
 * - Render the canvas with trailer boundary, cargo items, and info panel
 * - Manage drag-and-drop from the pallet list onto the canvas
 * - Handle rotation, grid snapping, and real-time validation
 * - Display validation status (colors, errors)
 * - Expose save/load callbacks to the container
 */
const LoadingCanvas = (props) => {
    const { viewModel, isLoading } = props;
    const { trailer, palletList, initialCanvasItems, scale, canvasWidth = DEFAULT_CANVAS_WIDTH, canvasHeight = DEFAULT_CANVAS_HEIGHT, onSavePlan, onLoadPlan } = viewModel;
    const canvasRef = useRef(null);
    // --- Canvas state from the hook ---
    const { items, activeItemId, selectedIds, validation, handleMouseDown, handleCanvasMouseDown, handleRotate, addItem, setItems } = useTrailerCanvas({
        initialItems: initialCanvasItems,
        canvasWidth,
        canvasHeight,
        canvasRef: canvasRef,
        scale,
        trailer
    });
    // --- Track which pallets have been added to the canvas ---
    // We track added pallet IDs in a Set. When a pallet is dragged onto the
    // canvas, its ID is added to the set so it disappears from the palette.
    const [addedPalletIds, setAddedPalletIds] = useState(new Set());
    // Available pallets = palletList minus those already added to canvas
    const availablePallets = palletList.filter(p => !addedPalletIds.has(p.id));
    // --- Restore items when loaded from plan ---
    // The useTrailerCanvas hook already handles initialItems changes via its
    // own useEffect, but we also set items directly when a plan is loaded
    // after the initial render to ensure the canvas reflects the saved state.
    useEffect(() => {
        if (initialCanvasItems.length > 0) {
            setItems(initialCanvasItems);
        }
    }, [initialCanvasItems, setItems]);
    // --- Save plan handler ---
    const handleSavePlan = () => {
        onSavePlan(items, scale);
    };
    // --- Load plan handler ---
    const handleLoadPlan = () => {
        onLoadPlan();
    };
    // --- Drag-and-drop from pallet list to canvas ---
    const handlePalletDrop = (e) => {
        e.preventDefault();
        const palletId = e.dataTransfer.getData("text/plain");
        const pallet = availablePallets.find(p => p.id === palletId);
        if (!pallet) {
            return;
        }
        // Calculate drop position relative to canvas
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        // Add the pallet to the canvas at the drop position
        const newItem = { ...pallet, x, y };
        addItem(newItem);
        // Mark as added so it disappears from the pallet list
        setAddedPalletIds(prev => new Set([...prev, palletId]));
    };
    const handlePalletDragOver = (e) => {
        e.preventDefault();
    };
    // --- Get item-specific errors for status display ---
    const getItemErrors = (itemId) => {
        return validation?.itemErrors?.[itemId] ?? [];
    };
    // --- Loading state ---
    if (isLoading) {
        return (jsx("div", { style: {
                position: "relative",
                width: canvasWidth,
                height: canvasHeight,
                margin: DEFAULT_MARGIN,
                overflow: "hidden",
                border: CANVAS_BORDER,
                backgroundColor: CANVAS_BACKGROUND_COLOR,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                color: "#666"
            }, children: "Loading packing plan..." }));
    }
    // --- Render ---
    return (jsxs("div", { ref: canvasRef, onMouseDown: handleCanvasMouseDown, onDrop: handlePalletDrop, onDragOver: handlePalletDragOver, style: {
            position: "relative",
            width: canvasWidth,
            height: canvasHeight,
            margin: DEFAULT_MARGIN,
            overflow: "hidden",
            border: CANVAS_BORDER,
            backgroundColor: CANVAS_BACKGROUND_COLOR
        }, children: [jsx(GridOverlay, { width: canvasWidth, height: canvasHeight, gridSize: GRID_SIZE }), trailer && (jsx("div", { style: {
                    position: "absolute",
                    left: trailer.x,
                    top: trailer.y,
                    width: trailer.width,
                    height: trailer.height,
                    border: "2px dashed #888",
                    boxSizing: "border-box",
                    pointerEvents: "none"
                } })), jsxs("div", { style: {
                    position: "absolute",
                    top: INFO_PANEL_TOP,
                    left: INFO_PANEL_LEFT,
                    zIndex: INFO_PANEL_Z_INDEX,
                    background: INFO_PANEL_BACKGROUND,
                    padding: INFO_PANEL_PADDING,
                    border: INFO_PANEL_BORDER
                }, children: [jsxs("div", { children: ["Active: ", activeItemId ?? "None"] }), jsxs("div", { children: ["Validation:", " ", jsx("span", { style: { color: validation?.valid ? "green" : "red", fontWeight: "bold" }, children: validation?.valid ? "OK" : "Issue" })] }), validation?.errors.length > 0 && (jsx("ul", { style: { margin: 0, paddingLeft: 16 }, children: validation.errors.map(error => (jsx("li", { style: { color: "red", fontSize: 12 }, children: error }, error))) })), jsxs("div", { style: { marginTop: 8 }, children: [jsx("button", { onClick: handleSavePlan, style: { marginRight: 8 }, children: "Save Plan" }), jsx("button", { onClick: handleLoadPlan, children: "Load Plan" })] })] }), jsx(PalletList, { pallets: availablePallets, onAddPallet: (pallet) => {
                    // Add pallet to canvas at a default position
                    const newItem = { ...pallet, x: 50, y: 50 };
                    setAddedPalletIds(prev => new Set([...prev, pallet.id]));
                    addItem(newItem);
                } }), items.map(item => (jsx(CargoCard, { item: item, isActive: activeItemId === item.id, selectedIds: selectedIds, hasError: getItemErrors(item.id).length > 0, onMouseDown: e => handleMouseDown(e, item.id), onRotate: handleRotate }, item.id)))] }));
};

/**
 * Convert a TruckSelection (meters) to a TrailerItem (pixels) using the given scale.
 *
 * @param truck - The TruckSelection data from Mendix
 * @param scale - Pixel-to-meter scale factor
 * @param position - Initial canvas position (pixels)
 * @returns A TrailerItem view model ready for the canvas
 */
const truckSelectionToTrailerItem = (truck, scale, position = { x: 20, y: 20 }) => {
    return {
        id: truck.id,
        code: truck.code ?? "TRAILER",
        trailerType: truck.trailerType ?? "DryVan",
        maxPayloadKg: truck.maxPayloadKg ?? 0,
        axleCount: truck.axleCount ?? 2,
        maxLoadMeters: truck.maxLoadMeters ?? truck.internalLengthMeter,
        internalHeightMeter: truck.internalHeightMeter,
        x: position.x,
        y: position.y,
        width: meterToPixel(truck.internalLengthMeter, scale),
        height: meterToPixel(truck.internalWidthMeter, scale),
        rotation: 0,
    };
};
/**
 * Compute the optimal scale factor so that the trailer fits within the canvas.
 *
 * @param truck - The TruckSelection data
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @param padding - Padding around the trailer (pixels)
 * @returns Scale factor (pixels per meter)
 */
const computeScale = (truck, canvasWidth, canvasHeight, padding = 40) => {
    const lengthM = truck.internalLengthMeter;
    const widthM = truck.internalWidthMeter;
    const availableWidth = canvasWidth - padding;
    const availableHeight = canvasHeight - padding;
    return Math.min(availableWidth / lengthM, availableHeight / widthM);
};

/**
 * Serialize the current canvas state into a packing plan for persistence.
 * Converts all pixel coordinates back to meters.
 */
const serializePlan = (state, scale) => {
    return {
        truckId: state.trailer?.id ?? null,
        items: state.cargos.map(item => ({
            id: item.id,
            name: item.name,
            type: item.type,
            x: pixelToMeter(item.x, scale),
            y: pixelToMeter(item.y, scale),
            width: pixelToMeter(item.width, scale),
            height: pixelToMeter(item.height, scale),
            rotation: item.rotation,
            color: item.color,
            heightM: item.heightM,
            weightKg: item.weightKg
        }))
    };
};
/**
 * Deserialize a packing plan back into CargoItems for the canvas.
 * Converts all meter coordinates to pixels.
 */
const deserializePlan = (plan, scale) => {
    return plan.items.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        x: item.x * scale,
        y: item.y * scale,
        width: item.width * scale,
        height: item.height * scale,
        rotation: item.rotation,
        color: item.color,
        isLocked: false,
        heightM: item.heightM,
        weightKg: item.weightKg
    }));
};

/**
 * Convert a PackingUnit (meters) to a CargoItem (pixels) using the given scale.
 *
 * @param packingUnit - The PackingUnit data from Mendix
 * @param scale - Pixel-to-meter scale factor
 * @param position - Initial canvas position (pixels)
 * @returns A CargoItem view model ready for the canvas
 */
const packingUnitToCargoItem = (packingUnit, scale, position = { x: 0, y: 0 }) => {
    const color = packingUnit.packingType === "pallet" ? "orange" : "blue";
    const name = packingUnit.name ?? `Cargo ${packingUnit.id}`;
    return {
        id: `cargo-${packingUnit.id}`,
        name,
        x: position.x,
        y: position.y,
        width: meterToPixel(packingUnit.lengthMeter, scale),
        height: meterToPixel(packingUnit.widthMeter, scale),
        rotation: 0,
        color,
        type: packingUnit.packingType,
        isLocked: false,
        heightM: packingUnit.heightMeter,
        weightKg: packingUnit.weightKg,
    };
};
/**
 * Convert a list of TransportOrders to CargoItems.
 * Each TransportOrder has one PackingUnit.
 */
const transportOrdersToCargoItems = (orders, scale) => {
    return orders.filter((order) => order.packingUnit).map((order) => packingUnitToCargoItem(order.packingUnit, scale));
};

/**
 * Mendix Data Adapter
 *
 * Bridges the React widget to the Mendix Data API (`mx.data`).
 * In a Mendix runtime, `mx.data` is available globally. In the dev environment
 * (Vite), we fall back to JSON parsing for testing.
 *
 * This adapter handles:
 * - Loading TruckSelection → TrailerItem (via trailerAdapter)
 * - Loading TransportOrders → CargoItem[] (via cargoAdapter)
 * - Loading PackingPlan → CargoItem[] (via stateAdapter)
 * - Saving PackingPlan (delete + recreate items)
 */
/**
 * Check if we're running inside a Mendix runtime.
 */
const isMendixRuntime = () => {
    return typeof window !== "undefined" && typeof window.mx !== "undefined";
};
/**
 * Safely access the global `mx` object.
 */
const getMx = () => {
    if (!isMendixRuntime()) {
        return null;
    }
    return window.mx.data;
};
/**
 * Load a single Mendix object by GUID.
 * Falls back to JSON parsing in dev mode.
 */
const loadMendixObject = async (guid) => {
    const mxData = getMx();
    if (mxData) {
        return new Promise((resolve, reject) => {
            mxData.load({
                guid,
                callback: (obj) => resolve(obj),
                error: (err) => reject(err)
            });
        });
    }
    // Dev fallback: assume the guid is actually a JSON string
    try {
        return JSON.parse(guid);
    }
    catch {
        return null;
    }
};
/**
 * Load a list of Mendix objects via XPath.
 * Falls back to JSON parsing in dev mode.
 */
const loadMendixList = async (xpath) => {
    const mxData = getMx();
    if (mxData) {
        return new Promise((resolve, reject) => {
            mxData.list({
                xpath,
                callback: (items) => resolve(items),
                error: (err) => reject(err)
            });
        });
    }
    // Dev fallback: assume xpath is actually a JSON string
    try {
        const parsed = JSON.parse(xpath);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
};
/**
 * Load the TruckSelection object and convert it to a TrailerItem view model.
 *
 * In Mendix, the TruckSelection object reference is passed as a string GUID.
 * We resolve it via mx.data.load, then traverse the reference chain:
 *   TruckSelection → ResourceInstance → Resource → TechnicalDetails
 * to get the trailer dimensions.
 *
 * @param truckRef - TruckSelection object reference (GUID or JSON string in dev)
 * @param scale - Pixel-to-meter scale factor
 * @returns TrailerItem view model, or null if not available
 */
const loadTrailerItem = async (truckRef, scale) => {
    if (!truckRef) {
        return null;
    }
    try {
        const truckData = (await loadMendixObject(truckRef));
        if (!truckData) {
            return null;
        }
        return truckSelectionToTrailerItem(truckData, scale);
    }
    catch (err) {
        console.error("Failed to load TruckSelection:", err);
        return null;
    }
};
/**
 * Load TransportOrder objects and convert them to CargoItem view models.
 *
 * In Mendix, the TransportOrder list is passed as a string reference.
 * We resolve it via mx.data.list, then traverse:
 *   TransportOrder → PackingUnit → PackingType
 * to get cargo dimensions.
 *
 * @param ordersRef - TransportOrder list reference (GUID or JSON string in dev)
 * @param scale - Pixel-to-meter scale factor
 * @returns Array of CargoItem view models
 */
const loadCargoItems = async (ordersGuids, scale) => {
    if (!ordersGuids || ordersGuids.length === 0) {
        return [];
    }
    try {
        const ordersData = await Promise.all(ordersGuids.map(guid => loadMendixObject(guid)));
        return transportOrdersToCargoItems(ordersData, scale);
    }
    catch (err) {
        console.error("Failed to load TransportOrders:", err);
        return [];
    }
};
/**
 * Load a saved PackingPlan for the given TruckSelection.
 *
 * The PackingPlan entity is a new entity in TCSLoadingMeter:
 *   PackingPlan (1 per TruckSelection)
 *     └─ PackingPlanItem (1-* per plan)
 *
 * @param truckGuid - The TruckSelection GUID
 * @param scale - Pixel-to-meter scale factor
 * @returns Array of CargoItem view models restored from the plan
 */
const loadPackingPlan = async (truckGuid, scale) => {
    if (!truckGuid) {
        return [];
    }
    try {
        // XPath to find the PackingPlan for this truck
        const xpath = `//TCSLoadingMeter.PackingPlan[TruckSelection = '${truckGuid}']`;
        const plans = await loadMendixList(xpath);
        if (plans.length === 0) {
            return [];
        }
        // Get the first (and only) plan
        const planObj = plans[0];
        if (!planObj) {
            return [];
        }
        // Load plan items
        const itemsXPath = `//TCSLoadingMeter.PackingPlanItem[PackingPlan = '${planObj.guid}']`;
        const planItems = await loadMendixList(itemsXPath);
        // Convert to PackingPlanData and deserialize
        const planData = {
            truckId: truckGuid,
            items: planItems.map(item => {
                const raw = item;
                return {
                    id: raw.id,
                    name: raw.name,
                    type: raw.type ?? "pallet",
                    x: Number(raw.x),
                    y: Number(raw.y),
                    width: Number(raw.width),
                    height: Number(raw.height),
                    rotation: Number(raw.rotation),
                    color: raw.color ?? "gray",
                    heightM: raw.heightM ? Number(raw.heightM) : undefined,
                    weightKg: raw.weightKg ? Number(raw.weightKg) : undefined
                };
            })
        };
        return deserializePlan(planData, scale);
    }
    catch (err) {
        console.error("Failed to load PackingPlan:", err);
        return [];
    }
};
/**
 * Save the current canvas state as a PackingPlan.
 *
 * Per the requirements:
 * - Only 1 packing plan per truck (no versioning)
 * - On save: delete existing plan items + recreate
 *
 * @param truckGuid - The TruckSelection GUID
 * @param state - Current canvas state
 * @param scale - Pixel-to-meter scale factor
 * @param onSaveMicroflow - Optional Mendix microflow callback
 * @returns The serialized plan data
 */
const savePackingPlan = async (truckGuid, state, scale, onSaveMicroflow) => {
    const plan = serializePlan(state, scale);
    if (isMendixRuntime()) {
        try {
            // Step 1: Find existing PackingPlan for this truck
            const xpath = `//TCSLoadingMeter.PackingPlan[TruckSelection = '${truckGuid}']`;
            const plans = await loadMendixList(xpath);
            let planGuid = null;
            if (plans.length > 0) {
                // Step 2a: Plan exists — delete all existing items
                const existingPlan = plans[0];
                planGuid = existingPlan.guid;
                const itemsXPath = `//TCSLoadingMeter.PackingPlanItem[PackingPlan = '${planGuid}']`;
                const existingItems = await loadMendixList(itemsXPath);
                // Delete each item
                const mxData = getMx();
                for (const item of existingItems) {
                    const itemObj = item;
                    await new Promise((resolve, reject) => {
                        mxData.remove({
                            guid: itemObj.guid,
                            callback: () => resolve(),
                            error: (err) => reject(err)
                        });
                    });
                }
            }
            else {
                // Step 2b: No plan exists — create one
                const mxData = getMx();
                const newPlan = await new Promise((resolve, reject) => {
                    mxData.create({
                        params: {
                            entity: "TCSLoadingMeter.PackingPlan",
                            values: {
                                TruckSelection: truckGuid
                            }
                        },
                        callback: (obj) => resolve(obj),
                        error: (err) => reject(err)
                    });
                });
                planGuid = newPlan.guid;
            }
            // Step 3: Create new plan items
            const mxData = getMx();
            for (const item of plan.items) {
                await new Promise((resolve, reject) => {
                    mxData.create({
                        params: {
                            entity: "TCSLoadingMeter.PackingPlanItem",
                            values: {
                                PackingPlan: planGuid,
                                TransportOrder: item.id.startsWith("cargo-") ? item.id.replace("cargo-", "") : item.id,
                                PositionX: item.x,
                                PositionY: item.y,
                                Width: item.width,
                                Height: item.height,
                                Rotation: item.rotation,
                                Color: item.color,
                                HeightMeters: item.heightM ?? 0,
                                WeightKg: item.weightKg ?? 0
                            }
                        },
                        callback: () => resolve(),
                        error: (err) => reject(err)
                    });
                });
            }
            // Commit the plan
            await new Promise((resolve, reject) => {
                mxData.commit({
                    callback: () => resolve(),
                    error: (err) => reject(err)
                });
            });
        }
        catch (err) {
            console.error("Failed to save PackingPlan:", err);
        }
    }
    // Dev fallback: localStorage
    localStorage.setItem("loadingCanvasPlan", JSON.stringify(plan));
    // Trigger Mendix microflow callback if provided
    if (onSaveMicroflow) {
        onSaveMicroflow();
    }
    return plan;
};

/**
 * LoadingCanvasContainer — the Mendix widget container.
 *
 * This component sits between Mendix and the LoadingCanvas widget.
 * It is responsible for:
 * - Receiving raw Mendix object references (GUID strings)
 * - Resolving them to full objects via the Mendix Data API (mx.data)
 * - Converting them to view models using adapters
 * - Passing the view models and callbacks to the LoadingCanvas widget
 * - Handling save/load plan via Mendix microflows and the PackingPlan entity
 *
 * In a real Mendix project, the object references are resolved via mx.data.
 * In the dev environment (Vite), the references are JSON strings that are
 * parsed directly.
 */
const LoadingCanvasContainer = (props) => {
    const { trucks: trucksRef, transportOrders: transportOrdersRef, canvasWidth = 1000, canvasHeight = 600, onSavePlan: onSavePlanCallback, onLoadPlan: onLoadPlanCallback, } = props;
    // --- State for loaded data ---
    const [trailerItem, setTrailerItem] = useState(null);
    const [palletList, setPalletList] = useState([]);
    const [initialCanvasItems, setInitialCanvasItems] = useState([]);
    const [scale, setScale] = useState(1);
    const [truckGuid, setTruckGuid] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    // --- Load truck data and compute scale ---
    // We need the truck data to compute the scale, but we also need the scale
    // to convert truck data to a TrailerItem. So we first load the raw truck data,
    // compute the scale, then convert to a TrailerItem.
    useEffect(() => {
        const loadTruck = async () => {
            if (!trucksRef) {
                setTrailerItem(null);
                setTruckGuid(null);
                setScale(1);
                setIsLoading(false);
                return;
            }
            try {
                // Load the raw truck data to compute scale
                const rawTruck = await loadMendixObjectRaw(trucksRef);
                if (rawTruck) {
                    setTruckGuid(rawTruck.id ?? null);
                    // Compute scale from truck dimensions
                    const computedScale = computeScale(rawTruck, canvasWidth, canvasHeight);
                    setScale(computedScale);
                    // Convert to TrailerItem
                    const trailer = await loadTrailerItem(trucksRef, computedScale);
                    setTrailerItem(trailer);
                }
            }
            catch (err) {
                console.error("Failed to load truck data:", err);
            }
        };
        loadTruck();
    }, [trucksRef, canvasWidth, canvasHeight]);
    // --- Load transport orders (pallet list) ---
    useEffect(() => {
        const loadOrders = async () => {
            if (!transportOrdersRef || transportOrdersRef.length === 0 || scale === 1) {
                return;
            }
            try {
                const items = await loadCargoItems(transportOrdersRef, scale);
                setPalletList(items);
            }
            catch (err) {
                console.error("Failed to load transport orders:", err);
            }
        };
        loadOrders();
    }, [transportOrdersRef, scale]);
    // --- Load saved packing plan ---
    useEffect(() => {
        const loadPlan = async () => {
            if (!truckGuid || scale === 1) {
                setIsLoading(false);
                return;
            }
            try {
                const savedItems = await loadPackingPlan(truckGuid, scale);
                setInitialCanvasItems(savedItems);
            }
            catch (err) {
                console.error("Failed to load packing plan:", err);
            }
            finally {
                setIsLoading(false);
            }
        };
        loadPlan();
    }, [truckGuid, scale]);
    // --- Save plan handler — called by the widget with current items and scale ---
    const handleSavePlan = useCallback(async (items, currentScale) => {
        if (!truckGuid) {
            return;
        }
        // Build a minimal CanvasState for serialization
        const state = {
            trailer: trailerItem,
            cargos: items,
            selectedIds: [],
            activeItemId: null,
            validation: { valid: true, errors: [] },
            scale: currentScale,
        };
        await savePackingPlan(truckGuid, state, currentScale, onSavePlanCallback);
    }, [truckGuid, trailerItem, onSavePlanCallback]);
    // --- Load plan handler ---
    const handleLoadPlan = useCallback(() => {
        if (onLoadPlanCallback) {
            onLoadPlanCallback();
        }
    }, [onLoadPlanCallback]);
    // --- Build view model props for the widget ---
    const viewModel = useMemo(() => ({
        trailer: trailerItem,
        palletList,
        initialCanvasItems,
        scale,
        canvasWidth,
        canvasHeight,
        onSavePlan: handleSavePlan,
        onLoadPlan: handleLoadPlan,
    }), [trailerItem, palletList, initialCanvasItems, scale, canvasWidth, canvasHeight, handleSavePlan, handleLoadPlan]);
    return jsx(LoadingCanvas, { viewModel: viewModel, isLoading: isLoading });
};
/**
 * Load raw truck data (for scale computation).
 * In Mendix, this uses mx.data.load. In dev, it parses JSON.
 */
const loadMendixObjectRaw = async (ref) => {
    // Try mx.data first
    if (typeof window !== "undefined" && window.mx) {
        const mxData = window.mx.data;
        return new Promise((resolve, reject) => {
            mxData.load({
                guid: ref,
                callback: (obj) => resolve(obj),
                error: (err) => reject(err),
            });
        });
    }
    // Dev fallback: parse JSON
    try {
        return JSON.parse(ref);
    }
    catch {
        return null;
    }
};

export { LoadingCanvasContainer };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9hZGluZ0NhbnZhcy5tanMiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9jb25zdGFudHMvY2FudmFzLnRzIiwiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2RvbWFpbi9yb3RhdGlvblJ1bGVzLnRzIiwiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2NvbXBvbmVudHMvUm90YXRpb25IYW5kbGUudHN4IiwiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2NvbnN0YW50cy9jYXJkLnRzIiwiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2NvbXBvbmVudHMvQ2FyZ29DYXJkLnRzeCIsIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9jb21wb25lbnRzL1BhbGxldExpc3QudHN4IiwiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2NvbXBvbmVudHMvR3JpZE92ZXJsYXkudHN4IiwiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2RvbWFpbi9ib3VuZGFyeVJ1bGVzLnRzIiwiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2RvbWFpbi9zbmFwUnVsZXMudHMiLCIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvZG9tYWluL2RyYWdSdWxlcy50cyIsIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9lbmdpbmVzL0RyYWdFbmdpbmUudHMiLCIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvZG9tYWluL2dlb21ldHJ5UnVsZXMudHMiLCIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvZW5naW5lcy9Db2xsaXNpb25FbmdpbmUudHMiLCIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvZW5naW5lcy9TbmFwRW5naW5lLnRzIiwiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2RvbWFpbi92YWxpZGF0aW9uUnVsZXMudHMiLCIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvZW5naW5lcy9WYWxpZGF0aW9uRW5naW5lLnRzIiwiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2hvb2tzL3VzZU1vdXNlRXZlbnRzLnRzIiwiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL3N0YXRlL0NhbnZhc1N0YXRlTWFuYWdlci50cyIsIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9zdGF0ZS9DYW52YXNBY3Rpb25EaXNwYXRjaGVyLnRzIiwiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2hvb2tzL3VzZUNhbnZhc1N0YXRlLnRzIiwiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2hvb2tzL3VzZUNhbnZhc0FjdGlvbnMudHMiLCIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvZG9tYWluL2Nvb3JkaW5hdGVSdWxlcy50cyIsIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9ob29rcy91c2VUcmFpbGVyQ2FudmFzLnRzIiwiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2NvbnN0YW50cy90aGVtZS50cyIsIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy93aWRnZXQvTG9hZGluZ0NhbnZhcy50c3giLCIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYWRhcHRlcnMvdHJhaWxlckFkYXB0ZXIudHMiLCIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYWRhcHRlcnMvc3RhdGVBZGFwdGVyLnRzIiwiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2FkYXB0ZXJzL2NhcmdvQWRhcHRlci50cyIsIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9hZGFwdGVycy9tZW5kaXhEYXRhQWRhcHRlci50cyIsIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy93aWRnZXQvTG9hZGluZ0NhbnZhcy5jb250YWluZXIudHN4Il0sInNvdXJjZXNDb250ZW50IjpbIi8vIGNvbnN0YW50cyBmb3IgcmVuZGVyaW5nLCBjb29yZGluYXRlLCB2aWV3cG9ydCwgc2NhbGUsIGdyaWQsIGFuZCByb3RhdGlvblxuLy8gY2FudmFzXG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX0NBTlZBU19XSURUSCA9IDEwMDA7XG5leHBvcnQgY29uc3QgREVGQVVMVF9DQU5WQVNfSEVJR0hUID0gNjAwO1xuZXhwb3J0IGNvbnN0IENBTlZBU19CT1JERVIgPSBcIjJweCBzb2xpZCBibGFja1wiO1xuXG4vLyBsYXlvdXRcblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfTUFSR0lOID0gXCIyMHB4IGF1dG9cIjtcblxuLy8gb3ZlcmxheVxuXG5leHBvcnQgY29uc3QgSU5GT19QQU5FTF9UT1AgPSAxMDtcbmV4cG9ydCBjb25zdCBJTkZPX1BBTkVMX0xFRlQgPSAxMDtcbmV4cG9ydCBjb25zdCBJTkZPX1BBTkVMX1pfSU5ERVggPSAxMDAwO1xuZXhwb3J0IGNvbnN0IElORk9fUEFORUxfUEFERElORyA9IFwiNHB4IDhweFwiO1xuZXhwb3J0IGNvbnN0IElORk9fUEFORUxfQkFDS0dST1VORCA9IFwiI2ZmZlwiO1xuZXhwb3J0IGNvbnN0IElORk9fUEFORUxfQk9SREVSID0gXCIxcHggc29saWQgI2RkZFwiO1xuXG4vLyBncmlkXG5cbmV4cG9ydCBjb25zdCBHUklEX1NJWkUgPSAyMDtcblxuLy8gcm90YXRpb25cblxuZXhwb3J0IGNvbnN0IFJPVEFUSU9OX1NURVAgPSA5MDtcblxuZXhwb3J0IGNvbnN0IFNOQVBfVEhSRVNIT0xEID0gMTU7XG4iLCJpbXBvcnQgdHlwZSB7IFJvdGF0aW9uLCBTaXplIH0gZnJvbSBcIi4uL3R5cGVzL2dlb21ldHJ5XCI7XG5pbXBvcnQgeyBST1RBVElPTl9TVEVQIH0gZnJvbSBcIi4uL2NvbnN0YW50cy9jYW52YXNcIjtcblxuLyoqXG4gKiBSb3RhdGUgY2xvY2t3aXNlIDkwIGRlZ3JlZXNcbiAqL1xuZXhwb3J0IGNvbnN0IHJvdGF0ZTkwID0gKHJvdGF0aW9uOiBSb3RhdGlvbik6IFJvdGF0aW9uID0+IHtcbiAgICByZXR1cm4gKChyb3RhdGlvbiArIFJPVEFUSU9OX1NURVApICUgMzYwKSBhcyBSb3RhdGlvbjtcbn07XG5cbi8qKlxuICogQ2hlY2sgaWYgb2JqZWN0IGlzIHZpc3VhbGx5IHZlcnRpY2FsXG4gKi9cbmV4cG9ydCBjb25zdCBpc1ZlcnRpY2FsUm90YXRpb24gPSAocm90YXRpb246IFJvdGF0aW9uKTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuIHJvdGF0aW9uID09PSA5MCB8fCByb3RhdGlvbiA9PT0gMjcwO1xufTtcblxuLyoqXG4gKiBHZXQgcmVuZGVyZWQgc2l6ZSBhZnRlciByb3RhdGlvblxuICovXG5leHBvcnQgY29uc3QgZ2V0Um90YXRlZFNpemUgPSAoc2l6ZTogU2l6ZSwgcm90YXRpb246IFJvdGF0aW9uKTogU2l6ZSA9PiB7XG4gICAgaWYgKGlzVmVydGljYWxSb3RhdGlvbihyb3RhdGlvbikpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHdpZHRoOiBzaXplLmhlaWdodCxcbiAgICAgICAgICAgIGhlaWdodDogc2l6ZS53aWR0aFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBzaXplO1xufTtcbiIsImltcG9ydCB0eXBlIHsgRkMsIE1vdXNlRXZlbnQgfSBmcm9tIFwicmVhY3RcIjtcblxuaW50ZXJmYWNlIFJvdGF0aW9uSGFuZGxlUHJvcHMge1xuICAgIG9uTW91c2VEb3duOiAoZTogTW91c2VFdmVudDxIVE1MRGl2RWxlbWVudD4pID0+IHZvaWQ7XG59XG5cbmV4cG9ydCBjb25zdCBSb3RhdGlvbkhhbmRsZTogRkM8Um90YXRpb25IYW5kbGVQcm9wcz4gPSAoeyBvbk1vdXNlRG93biB9KSA9PiB7XG4gICAgcmV0dXJuIChcbiAgICAgICAgPGRpdlxuICAgICAgICAgICAgb25Nb3VzZURvd249e29uTW91c2VEb3dufVxuICAgICAgICAgICAgc3R5bGU9e3tcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICAgICAgICAgIHRvcDogNCxcbiAgICAgICAgICAgICAgICBsZWZ0OiBcIjUwJVwiLFxuICAgICAgICAgICAgICAgIHRyYW5zZm9ybTogXCJ0cmFuc2xhdGVYKC01MCUpXCIsXG4gICAgICAgICAgICAgICAgd2lkdGg6IDE2LFxuICAgICAgICAgICAgICAgIGhlaWdodDogMTYsXG4gICAgICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBcInRyYW5zcGFyZW50XCIsXG4gICAgICAgICAgICAgICAgYm9yZGVyUmFkaXVzOiBcIjUwJVwiLFxuICAgICAgICAgICAgICAgIGN1cnNvcjogXCJncmFiXCIsXG4gICAgICAgICAgICAgICAgZGlzcGxheTogXCJmbGV4XCIsXG4gICAgICAgICAgICAgICAgYWxpZ25JdGVtczogXCJjZW50ZXJcIixcbiAgICAgICAgICAgICAgICBqdXN0aWZ5Q29udGVudDogXCJjZW50ZXJcIixcbiAgICAgICAgICAgICAgICBjb2xvcjogXCIjNGE5MGQ5XCIsXG4gICAgICAgICAgICAgICAgZm9udFNpemU6IDE2LFxuICAgICAgICAgICAgICAgIGZvbnRXZWlnaHQ6IFwiYm9sZFwiLFxuICAgICAgICAgICAgICAgIGJvcmRlcjogXCIycHggc29saWQgIzRhOTBkOVwiLFxuICAgICAgICAgICAgICAgIGJveFNoYWRvdzogXCJub25lXCIsXG4gICAgICAgICAgICAgICAgekluZGV4OiAxMFxuICAgICAgICAgICAgfX1cbiAgICAgICAgICAgIHRpdGxlPVwiUm90YXRlXCJcbiAgICAgICAgPlxuICAgICAgICAgICAg4oa7XG4gICAgICAgIDwvZGl2PlxuICAgICk7XG59O1xuIiwiLy8gY2FyZFxuXG5leHBvcnQgY29uc3QgQ0FSRF9CT1JERVJfV0lEVEggPSAxO1xuXG5leHBvcnQgY29uc3QgQ0FSRF9TRUxFQ1RFRF9CT1JERVJfV0lEVEggPSAzO1xuXG5leHBvcnQgY29uc3QgQ0FSRF9BQ1RJVkVfQk9SREVSX1dJRFRIID0gMztcblxuZXhwb3J0IGNvbnN0IENBUkRfQk9SREVSX0NPTE9SID0gXCJncmF5XCI7XG5cbmV4cG9ydCBjb25zdCBDQVJEX1NFTEVDVEVEX0JPUkRFUl9DT0xPUiA9IFwiYmx1ZVwiO1xuXG5leHBvcnQgY29uc3QgQ0FSRF9BQ1RJVkVfQk9SREVSX0NPTE9SID0gXCJyZWRcIjtcbiIsImltcG9ydCBSZWFjdCBmcm9tIFwicmVhY3RcIjtcblxuaW1wb3J0IHR5cGUgeyBDYXJnb0l0ZW0gfSBmcm9tIFwiLi4vdmlld01vZGVscy9DYXJnb0l0ZW1cIjtcblxuaW1wb3J0IHsgZ2V0Um90YXRlZFNpemUgfSBmcm9tIFwiLi4vZG9tYWluL3JvdGF0aW9uUnVsZXNcIjtcblxuaW1wb3J0IHsgUm90YXRpb25IYW5kbGUgfSBmcm9tIFwiLi9Sb3RhdGlvbkhhbmRsZVwiO1xuXG5pbXBvcnQge1xuICAgIENBUkRfQUNUSVZFX0JPUkRFUl9XSURUSCxcbiAgICBDQVJEX0JPUkRFUl9XSURUSCxcbiAgICBDQVJEX1NFTEVDVEVEX0JPUkRFUl9XSURUSCxcbiAgICBDQVJEX0JPUkRFUl9DT0xPUixcbiAgICBDQVJEX0FDVElWRV9CT1JERVJfQ09MT1IsXG4gICAgQ0FSRF9TRUxFQ1RFRF9CT1JERVJfQ09MT1Jcbn0gZnJvbSBcIi4uL2NvbnN0YW50cy9jYXJkXCI7XG5cbmludGVyZmFjZSBDYXJnb0NhcmRQcm9wcyB7XG4gICAgaXRlbTogQ2FyZ29JdGVtO1xuXG4gICAgaXNBY3RpdmU6IGJvb2xlYW47XG5cbiAgICBzZWxlY3RlZElkczogc3RyaW5nW107XG5cbiAgICBvbk1vdXNlRG93bjogKGU6IFJlYWN0Lk1vdXNlRXZlbnQ8SFRNTERpdkVsZW1lbnQ+KSA9PiB2b2lkO1xuXG4gICAgb25Sb3RhdGU6IChpdGVtSWQ6IHN0cmluZykgPT4gdm9pZDtcblxuICAgIGhhc0Vycm9yOiBib29sZWFuO1xufVxuXG5leHBvcnQgY29uc3QgQ2FyZ29DYXJkOiBSZWFjdC5GQzxDYXJnb0NhcmRQcm9wcz4gPSAoe1xuICAgIGl0ZW0sXG4gICAgaXNBY3RpdmUsXG4gICAgc2VsZWN0ZWRJZHMsXG4gICAgb25Nb3VzZURvd24sXG4gICAgb25Sb3RhdGUsXG4gICAgaGFzRXJyb3Jcbn0pID0+IHtcbiAgICBjb25zdCBzaXplID0gZ2V0Um90YXRlZFNpemUoXG4gICAgICAgIHtcbiAgICAgICAgICAgIHdpZHRoOiBpdGVtLndpZHRoLFxuICAgICAgICAgICAgaGVpZ2h0OiBpdGVtLmhlaWdodFxuICAgICAgICB9LFxuICAgICAgICBpdGVtLnJvdGF0aW9uXG4gICAgKTtcblxuICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBzZWxlY3RlZElkcy5pbmNsdWRlcyhpdGVtLmlkKTtcblxuICAgIGNvbnN0IGJvcmRlckNvbG9yID0gaGFzRXJyb3IgPyBcIiNmZjQ0NDRcIiA6IENBUkRfQk9SREVSX0NPTE9SO1xuXG4gICAgY29uc3QgYm9yZGVyID0gaXNBY3RpdmVcbiAgICAgICAgPyBgJHtDQVJEX0FDVElWRV9CT1JERVJfV0lEVEh9cHggc29saWQgJHtDQVJEX0FDVElWRV9CT1JERVJfQ09MT1J9YFxuICAgICAgICA6IGlzU2VsZWN0ZWRcbiAgICAgICAgPyBgJHtDQVJEX1NFTEVDVEVEX0JPUkRFUl9XSURUSH1weCBzb2xpZCAke0NBUkRfU0VMRUNURURfQk9SREVSX0NPTE9SfWBcbiAgICAgICAgOiBgJHtDQVJEX0JPUkRFUl9XSURUSH1weCBzb2xpZCAke2JvcmRlckNvbG9yfWA7XG5cbiAgICByZXR1cm4gKFxuICAgICAgICA8ZGl2XG4gICAgICAgICAgICBzdHlsZT17e1xuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBcImFic29sdXRlXCIsXG5cbiAgICAgICAgICAgICAgICBsZWZ0OiBpdGVtLngsXG5cbiAgICAgICAgICAgICAgICB0b3A6IGl0ZW0ueVxuICAgICAgICAgICAgfX1cbiAgICAgICAgPlxuICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgIGRhdGEtaWQ9e2l0ZW0uaWR9XG4gICAgICAgICAgICAgICAgb25Nb3VzZURvd249e29uTW91c2VEb3dufVxuICAgICAgICAgICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiBzaXplLndpZHRoLFxuXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogc2l6ZS5oZWlnaHQsXG5cbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBpdGVtLmNvbG9yLFxuXG4gICAgICAgICAgICAgICAgICAgIGN1cnNvcjogaXRlbS5pc0xvY2tlZCA/IFwibm90LWFsbG93ZWRcIiA6IFwibW92ZVwiLFxuXG4gICAgICAgICAgICAgICAgICAgIHVzZXJTZWxlY3Q6IFwibm9uZVwiLFxuXG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcixcblxuICAgICAgICAgICAgICAgICAgICBib3hTaXppbmc6IFwiYm9yZGVyLWJveFwiXG4gICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgIC8+XG5cbiAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICBzdHlsZT17e1xuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuXG4gICAgICAgICAgICAgICAgICAgIHRvcDogc2l6ZS5oZWlnaHQgKyA0LFxuXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IDAsXG5cbiAgICAgICAgICAgICAgICAgICAgd2hpdGVTcGFjZTogXCJub3dyYXBcIixcblxuICAgICAgICAgICAgICAgICAgICBmb250U2l6ZTogMTIsXG5cbiAgICAgICAgICAgICAgICAgICAgcG9pbnRlckV2ZW50czogXCJub25lXCJcbiAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIHtpdGVtLm5hbWV9XG4gICAgICAgICAgICAgICAgPGJyIC8+XG4gICAgICAgICAgICAgICAgaWQ6IHtpdGVtLmlkfVxuICAgICAgICAgICAgICAgIDxiciAvPlxuICAgICAgICAgICAgICAgIHBvczogKHtpdGVtLnh9LCB7aXRlbS55fSlcbiAgICAgICAgICAgICAgICA8YnIgLz5cbiAgICAgICAgICAgICAgICBzaXplOiB7aXRlbS53aWR0aH0gw5cge2l0ZW0uaGVpZ2h0fVxuICAgICAgICAgICAgICAgIDxiciAvPlxuICAgICAgICAgICAgICAgIHJvdGF0aW9uOiB7aXRlbS5yb3RhdGlvbn3CsHtpdGVtLmhlaWdodE0gJiYgPGJyIC8+fVxuICAgICAgICAgICAgICAgIHtpdGVtLmhlaWdodE0gJiYgYGhlaWdodDogJHtpdGVtLmhlaWdodE19bWB9XG4gICAgICAgICAgICAgICAge2l0ZW0ud2VpZ2h0S2cgJiYgPGJyIC8+fVxuICAgICAgICAgICAgICAgIHtpdGVtLndlaWdodEtnICYmIGB3ZWlnaHQ6ICR7aXRlbS53ZWlnaHRLZ31rZ2B9XG4gICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgPFJvdGF0aW9uSGFuZGxlXG4gICAgICAgICAgICAgICAgb25Nb3VzZURvd249e2UgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICBvblJvdGF0ZShpdGVtLmlkKTtcbiAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgLz5cbiAgICAgICAgPC9kaXY+XG4gICAgKTtcbn07XG4iLCJpbXBvcnQgdHlwZSB7IEZDIH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgdHlwZSB7IENhcmdvSXRlbSB9IGZyb20gXCIuLi92aWV3TW9kZWxzL0NhcmdvSXRlbVwiO1xuXG5pbnRlcmZhY2UgUGFsbGV0TGlzdFByb3BzIHtcbiAgcGFsbGV0czogQ2FyZ29JdGVtW107IC8vIENhcmdvIGl0ZW1zIGF2YWlsYWJsZSB0byBkcmFnIG9udG8gY2FudmFzXG4gIG9uQWRkUGFsbGV0OiAocGFsbGV0OiBDYXJnb0l0ZW0pID0+IHZvaWQ7IC8vIENhbGxlZCB3aGVuIHBhbGxldCBpcyBkcmFnZ2VkIG9udG8gY2FudmFzXG59XG5cbi8vIFBhbGxldExpc3Qg4oCUIGRlYnVnIHZpZXcgc2hvd2luZyBhdmFpbGFibGUgY2FyZ28gaXRlbXMgZHJhZ2dhYmxlIG9udG8gY2FudmFzXG5leHBvcnQgY29uc3QgUGFsbGV0TGlzdDogRkM8UGFsbGV0TGlzdFByb3BzPiA9ICh7IHBhbGxldHMsIG9uQWRkUGFsbGV0IH0pID0+IHtcbiAgaWYgKHBhbGxldHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIDxkaXZcbiAgICAgICAgc3R5bGU9e3tcbiAgICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICAgIGJvdHRvbTogMTAsXG4gICAgICAgICAgbGVmdDogMTAsXG4gICAgICAgICAgcGFkZGluZzogXCI0cHggOHB4XCIsXG4gICAgICAgICAgYmFja2dyb3VuZDogXCJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuOClcIixcbiAgICAgICAgICBib3JkZXI6IFwiMXB4IHNvbGlkICNkZGRcIixcbiAgICAgICAgICBib3JkZXJSYWRpdXM6IDQsXG4gICAgICAgICAgZm9udFNpemU6IDEyLFxuICAgICAgICAgIGNvbG9yOiBcIiM2NjZcIixcbiAgICAgICAgfX0+XG4gICAgICAgIE5vIHBhbGxldHMgYXZhaWxhYmxlXG4gICAgICA8L2Rpdj5cbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2XG4gICAgICBzdHlsZT17e1xuICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICBib3R0b206IDEwLFxuICAgICAgICBsZWZ0OiAxMCxcbiAgICAgICAgZGlzcGxheTogXCJmbGV4XCIsXG4gICAgICAgIGdhcDogOCxcbiAgICAgICAgcGFkZGluZzogXCI4cHggMTJweFwiLFxuICAgICAgICBiYWNrZ3JvdW5kOiBcInJnYmEoMjU1LCAyNTUsIDI1NSwgMC45KVwiLFxuICAgICAgICBib3JkZXI6IFwiMXB4IHNvbGlkICNkZGRcIixcbiAgICAgICAgYm9yZGVyUmFkaXVzOiA0LFxuICAgICAgICB6SW5kZXg6IDEwMDAsXG4gICAgICB9fT5cbiAgICAgIHtwYWxsZXRzLm1hcCgocGFsbGV0KSA9PiAoXG4gICAgICAgIDxkaXZcbiAgICAgICAgICBrZXk9e3BhbGxldC5pZH1cbiAgICAgICAgICBkcmFnZ2FibGVcbiAgICAgICAgICBvbkRyYWdTdGFydD17KGUpID0+IHtcbiAgICAgICAgICAgIC8vIFNldCB0aGUgcGFsbGV0IElEIGFzIGRyYWcgZGF0YVxuICAgICAgICAgICAgZS5kYXRhVHJhbnNmZXIuc2V0RGF0YShcInRleHQvcGxhaW5cIiwgcGFsbGV0LmlkKTtcbiAgICAgICAgICAgIGUuZGF0YVRyYW5zZmVyLmVmZmVjdEFsbG93ZWQgPSBcIm1vdmVcIjtcbiAgICAgICAgICB9fVxuICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG9uQWRkUGFsbGV0KHBhbGxldCl9XG4gICAgICAgICAgc3R5bGU9e3tcbiAgICAgICAgICAgIGRpc3BsYXk6IFwiZmxleFwiLFxuICAgICAgICAgICAgZmxleERpcmVjdGlvbjogXCJjb2x1bW5cIixcbiAgICAgICAgICAgIGFsaWduSXRlbXM6IFwiY2VudGVyXCIsXG4gICAgICAgICAgICBjdXJzb3I6IFwiZ3JhYlwiLFxuICAgICAgICAgICAgdXNlclNlbGVjdDogXCJub25lXCIsXG4gICAgICAgICAgfX1cbiAgICAgICAgICB0aXRsZT17YERyYWcgJHtwYWxsZXQubmFtZX0gb250byBjYW52YXNgfT5cbiAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICBzdHlsZT17e1xuICAgICAgICAgICAgICB3aWR0aDogNDAsXG4gICAgICAgICAgICAgIGhlaWdodDogNDAsXG4gICAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogcGFsbGV0LmNvbG9yLFxuICAgICAgICAgICAgICBib3JkZXI6IFwiMnB4IHNvbGlkICMzMzNcIixcbiAgICAgICAgICAgICAgYm9yZGVyUmFkaXVzOiA0LFxuICAgICAgICAgICAgICBib3hTaXppbmc6IFwiYm9yZGVyLWJveFwiLFxuICAgICAgICAgICAgICBkaXNwbGF5OiBcImZsZXhcIixcbiAgICAgICAgICAgICAgYWxpZ25JdGVtczogXCJjZW50ZXJcIixcbiAgICAgICAgICAgICAganVzdGlmeUNvbnRlbnQ6IFwiY2VudGVyXCIsXG4gICAgICAgICAgICAgIGZvbnRTaXplOiA4LFxuICAgICAgICAgICAgICBjb2xvcjogXCIjZmZmXCIsXG4gICAgICAgICAgICAgIGZvbnRXZWlnaHQ6IFwiYm9sZFwiLFxuICAgICAgICAgICAgfX0+XG4gICAgICAgICAgICB7cGFsbGV0LnR5cGUgPT09IFwicGFsbGV0XCIgPyBcIvCfk6ZcIiA6IFwi8J+TplwifVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxzcGFuIHN0eWxlPXt7IGZvbnRTaXplOiAxMCwgbWFyZ2luVG9wOiAyLCBjb2xvcjogXCIjMzMzXCIgfX0+e3BhbGxldC5uYW1lfTwvc3Bhbj5cbiAgICAgICAgICA8c3BhbiBzdHlsZT17eyBmb250U2l6ZTogOCwgY29sb3I6IFwiIzY2NlwiIH19PlxuICAgICAgICAgICAge3BhbGxldC53aWR0aH3Dl3twYWxsZXQuaGVpZ2h0fVxuICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICApKX1cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG4iLCJpbXBvcnQgeyB1c2VNZW1vLCB0eXBlIEZDIH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgeyBHUklEX1NJWkUgfSBmcm9tIFwiLi4vY29uc3RhbnRzL2NhbnZhc1wiO1xuXG5pbnRlcmZhY2UgR3JpZE92ZXJsYXlQcm9wcyB7XG4gICAgd2lkdGg6IG51bWJlcjtcbiAgICBoZWlnaHQ6IG51bWJlcjtcbiAgICBncmlkU2l6ZT86IG51bWJlcjtcbn1cblxuLyoqXG4gKiBHcmlkT3ZlcmxheSDigJQgcmVuZGVycyBhIHN1YnRsZSBncmlkIHBhdHRlcm4gb24gdGhlIGNhbnZhcyB0byB2aXN1YWxpemVcbiAqIHRoZSBncmlkIHNuYXBwaW5nLiBUaGUgZ3JpZCBpcyByZW5kZXJlZCBhcyBhIENTUyBiYWNrZ3JvdW5kIHBhdHRlcm5cbiAqIHNvIGl0IGRvZXNuJ3QgaW50ZXJmZXJlIHdpdGggZHJhZy1hbmQtZHJvcCBvciBtb3VzZSBldmVudHMuXG4gKi9cbmV4cG9ydCBjb25zdCBHcmlkT3ZlcmxheTogRkM8R3JpZE92ZXJsYXlQcm9wcz4gPSAoeyB3aWR0aCwgaGVpZ2h0LCBncmlkU2l6ZSA9IEdSSURfU0laRSB9KSA9PiB7XG4gICAgLy8gR2VuZXJhdGUgYSBncmlkIGJhY2tncm91bmQgdXNpbmcgYSBjYW52YXMgZWxlbWVudCBmb3IgY3Jpc3AgbGluZXNcbiAgICBjb25zdCBncmlkSW1hZ2VVcmwgPSB1c2VNZW1vKCgpID0+IHtcbiAgICAgICAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcbiAgICAgICAgY2FudmFzLndpZHRoID0gZ3JpZFNpemU7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSBncmlkU2l6ZTtcbiAgICAgICAgY29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICAgICAgaWYgKCFjdHgpIHtcbiAgICAgICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgICB9XG5cbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDAsIDAsIDAsIDAuMDUpXCI7XG4gICAgICAgIGN0eC5saW5lV2lkdGggPSAxO1xuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICAgIGN0eC5tb3ZlVG8oMCwgMCk7XG4gICAgICAgIGN0eC5saW5lVG8oZ3JpZFNpemUsIGdyaWRTaXplKTtcbiAgICAgICAgY3R4Lm1vdmVUbyhncmlkU2l6ZSwgMCk7XG4gICAgICAgIGN0eC5saW5lVG8oMCwgZ3JpZFNpemUpO1xuICAgICAgICBjdHguc3Ryb2tlKCk7XG5cbiAgICAgICAgcmV0dXJuIGNhbnZhcy50b0RhdGFVUkwoKTtcbiAgICB9LCBbZ3JpZFNpemVdKTtcblxuICAgIHJldHVybiAoXG4gICAgICAgIDxkaXZcbiAgICAgICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgICAgICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcbiAgICAgICAgICAgICAgICB0b3A6IDAsXG4gICAgICAgICAgICAgICAgbGVmdDogMCxcbiAgICAgICAgICAgICAgICB3aWR0aCxcbiAgICAgICAgICAgICAgICBoZWlnaHQsXG4gICAgICAgICAgICAgICAgYmFja2dyb3VuZEltYWdlOiBgdXJsKFwiJHtncmlkSW1hZ2VVcmx9XCIpYCxcbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kU2l6ZTogYCR7Z3JpZFNpemV9cHggJHtncmlkU2l6ZX1weGAsXG4gICAgICAgICAgICAgICAgcG9pbnRlckV2ZW50czogXCJub25lXCIsXG4gICAgICAgICAgICAgICAgekluZGV4OiAxXG4gICAgICAgICAgICB9fVxuICAgICAgICAvPlxuICAgICk7XG59O1xuIiwiLyoqXG4gKiBLZWVwIGEgbnVtZXJpYyB2YWx1ZSBpbnNpZGUgYSByYW5nZVxuICovXG5leHBvcnQgY29uc3QgY2xhbXAgPSAodmFsdWU6IG51bWJlciwgbWluOiBudW1iZXIsIG1heDogbnVtYmVyKTogbnVtYmVyID0+IHtcbiAgICByZXR1cm4gTWF0aC5tYXgobWluLCBNYXRoLm1pbih2YWx1ZSwgbWF4KSk7XG59O1xuIiwiZXhwb3J0IGNvbnN0IHNuYXBUb0dyaWQgPSAodmFsdWU6IG51bWJlciwgZ3JpZFNpemU6IG51bWJlcik6IG51bWJlciA9PiB7XG4gICAgaWYgKGdyaWRTaXplIDw9IDApIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIHJldHVybiBNYXRoLnJvdW5kKHZhbHVlIC8gZ3JpZFNpemUpICogZ3JpZFNpemU7XG59O1xuXG5leHBvcnQgY29uc3Qgc25hcFBvc2l0aW9uID0gKHg6IG51bWJlciwgeTogbnVtYmVyLCBncmlkU2l6ZTogbnVtYmVyKTogeyB4OiBudW1iZXI7IHk6IG51bWJlciB9ID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgICB4OiBzbmFwVG9HcmlkKHgsIGdyaWRTaXplKSxcbiAgICAgICAgeTogc25hcFRvR3JpZCh5LCBncmlkU2l6ZSlcbiAgICB9O1xufTtcbiIsImltcG9ydCB0eXBlIHsgUG9pbnQsIFJlY3RMaWtlIH0gZnJvbSBcIi4uL3R5cGVzL2dlb21ldHJ5XCI7XG5pbXBvcnQgeyBjbGFtcCB9IGZyb20gXCIuL2JvdW5kYXJ5UnVsZXNcIjtcbmltcG9ydCB7IHNuYXBQb3NpdGlvbiB9IGZyb20gXCIuL3NuYXBSdWxlc1wiO1xuaW1wb3J0IHsgR1JJRF9TSVpFIH0gZnJvbSBcIi4uL2NvbnN0YW50cy9jYW52YXNcIjtcblxuZXhwb3J0IGNvbnN0IGNhbGN1bGF0ZURyYWdQb3NpdGlvbiA9IDxUIGV4dGVuZHMgUmVjdExpa2U+KFxuICAgIGl0ZW06IFQsXG4gICAgc3RhcnRQb3NpdGlvbjogUG9pbnQsXG4gICAgZGVsdGFYOiBudW1iZXIsXG4gICAgZGVsdGFZOiBudW1iZXIsXG4gICAgY2FudmFzV2lkdGg6IG51bWJlcixcbiAgICBjYW52YXNIZWlnaHQ6IG51bWJlcixcbiAgICBncmlkU2l6ZTogbnVtYmVyID0gR1JJRF9TSVpFXG4pOiBUID0+IHtcbiAgICBjb25zdCB0YXJnZXQgPSBzbmFwUG9zaXRpb24oc3RhcnRQb3NpdGlvbi54ICsgZGVsdGFYLCBzdGFydFBvc2l0aW9uLnkgKyBkZWx0YVksIGdyaWRTaXplKTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIC4uLml0ZW0sXG5cbiAgICAgICAgeDogY2xhbXAodGFyZ2V0LngsIDAsIGNhbnZhc1dpZHRoIC0gaXRlbS53aWR0aCksXG5cbiAgICAgICAgeTogY2xhbXAodGFyZ2V0LnksIDAsIGNhbnZhc0hlaWdodCAtIGl0ZW0uaGVpZ2h0KVxuICAgIH07XG59O1xuIiwiaW1wb3J0IHR5cGUgeyBQb2ludCwgUmVjdExpa2UsIFJvdGF0aW9uIH0gZnJvbSBcIi4uL3R5cGVzL2dlb21ldHJ5XCI7XG5pbXBvcnQgdHlwZSB7IERyYWdTdGF0ZSB9IGZyb20gXCIuLi9zdGF0ZS9EcmFnU3RhdGVcIjtcbmltcG9ydCB0eXBlIHsgQ29sbGlzaW9uRW5naW5lIH0gZnJvbSBcIi4vQ29sbGlzaW9uRW5naW5lXCI7XG5pbXBvcnQgdHlwZSB7IFNuYXBFbmdpbmUgfSBmcm9tIFwiLi9TbmFwRW5naW5lXCI7XG5pbXBvcnQgeyBjYWxjdWxhdGVEcmFnUG9zaXRpb24gfSBmcm9tIFwiLi4vZG9tYWluL2RyYWdSdWxlc1wiO1xuXG5leHBvcnQgY2xhc3MgRHJhZ0VuZ2luZTxcbiAgICBUIGV4dGVuZHMgUmVjdExpa2UgJiB7XG4gICAgICAgIGlkOiBzdHJpbmc7XG4gICAgICAgIHJvdGF0aW9uOiBSb3RhdGlvbjtcbiAgICB9XG4+IHtcbiAgICBwcml2YXRlIGl0ZW1zOiBUW107XG4gICAgcHJpdmF0ZSBjb2xsaXNpb25FbmdpbmU6IENvbGxpc2lvbkVuZ2luZSB8IG51bGw7XG4gICAgcHJpdmF0ZSBzbmFwRW5naW5lOiBTbmFwRW5naW5lIHwgbnVsbDtcblxuICAgIHByaXZhdGUgc3RhdGU6IERyYWdTdGF0ZSA9IHtcbiAgICAgICAgaXNEcmFnZ2luZzogZmFsc2UsXG4gICAgICAgIGFjdGl2ZUlkOiBudWxsLFxuICAgICAgICBzdGFydE1vdXNlOiB7XG4gICAgICAgICAgICB4OiAwLFxuICAgICAgICAgICAgeTogMFxuICAgICAgICB9LFxuICAgICAgICBzdGFydFBvc2l0aW9uczogbmV3IE1hcCgpLFxuICAgICAgICBzdGFydE9mZnNldHM6IG5ldyBNYXAoKVxuICAgIH07XG5cbiAgICBjb25zdHJ1Y3RvcihpdGVtczogVFtdLCBjb2xsaXNpb25FbmdpbmU/OiBDb2xsaXNpb25FbmdpbmUsIHNuYXBFbmdpbmU/OiBTbmFwRW5naW5lKSB7XG4gICAgICAgIHRoaXMuaXRlbXMgPSBpdGVtcztcbiAgICAgICAgdGhpcy5jb2xsaXNpb25FbmdpbmUgPSBjb2xsaXNpb25FbmdpbmUgPz8gbnVsbDtcbiAgICAgICAgdGhpcy5zbmFwRW5naW5lID0gc25hcEVuZ2luZSA/PyBudWxsO1xuICAgIH1cblxuICAgIHN0YXJ0RHJhZyhhY3RpdmVJZDogc3RyaW5nLCBzZWxlY3RlZElkczogc3RyaW5nW10sIG1vdXNlOiBQb2ludCk6IHZvaWQge1xuICAgICAgICBjb25zdCBhY3RpdmVJdGVtID0gdGhpcy5pdGVtcy5maW5kKGl0ZW0gPT4gaXRlbS5pZCA9PT0gYWN0aXZlSWQpO1xuICAgICAgICBpZiAoIWFjdGl2ZUl0ZW0pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN0YXJ0UG9zaXRpb25zID0gbmV3IE1hcDxzdHJpbmcsIFBvaW50PigpO1xuICAgICAgICBjb25zdCBzdGFydE9mZnNldHMgPSBuZXcgTWFwPHN0cmluZywgUG9pbnQ+KCk7XG5cbiAgICAgICAgc2VsZWN0ZWRJZHMuZm9yRWFjaChpZCA9PiB7XG4gICAgICAgICAgICBjb25zdCBpdGVtID0gdGhpcy5pdGVtcy5maW5kKHggPT4geC5pZCA9PT0gaWQpO1xuICAgICAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICBzdGFydFBvc2l0aW9ucy5zZXQoaWQsIHtcbiAgICAgICAgICAgICAgICAgICAgeDogaXRlbS54LFxuICAgICAgICAgICAgICAgICAgICB5OiBpdGVtLnlcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAvLyBzdG9yZSBwb2ludGVyIG9mZnNldCBzbyBkcmFnZ2luZyBrZWVwcyBjdXJzb3IgcmVsYXRpdmUgcG9zaXRpb25cbiAgICAgICAgICAgICAgICBzdGFydE9mZnNldHMuc2V0KGlkLCB7XG4gICAgICAgICAgICAgICAgICAgIHg6IG1vdXNlLnggLSBpdGVtLngsXG4gICAgICAgICAgICAgICAgICAgIHk6IG1vdXNlLnkgLSBpdGVtLnlcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgICAgICAgIGlzRHJhZ2dpbmc6IHRydWUsXG4gICAgICAgICAgICBhY3RpdmVJZCxcbiAgICAgICAgICAgIHN0YXJ0TW91c2U6IG1vdXNlLFxuICAgICAgICAgICAgc3RhcnRQb3NpdGlvbnMsXG4gICAgICAgICAgICBzdGFydE9mZnNldHNcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBtb3ZlKG1vdXNlOiBQb2ludCwgY2FudmFzV2lkdGg6IG51bWJlciwgY2FudmFzSGVpZ2h0OiBudW1iZXIpOiBUW10ge1xuICAgICAgICBpZiAoIXRoaXMuc3RhdGUuaXNEcmFnZ2luZykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXRlbXM7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB0YXJnZXRJdGVtcyA9IHRoaXMuaXRlbXMubWFwKGl0ZW0gPT4ge1xuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0gdGhpcy5zdGF0ZS5zdGFydE9mZnNldHMuZ2V0KGl0ZW0uaWQpO1xuICAgICAgICAgICAgaWYgKCFvZmZzZXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaXRlbTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gY29tcHV0ZSBiYXNlIHBvc2l0aW9uIG1haW50YWluaW5nIHRoZSBpbml0aWFsIGN1cnNvciBvZmZzZXRcbiAgICAgICAgICAgIGNvbnN0IGJhc2VYID0gbW91c2UueCAtIG9mZnNldC54O1xuICAgICAgICAgICAgY29uc3QgYmFzZVkgPSBtb3VzZS55IC0gb2Zmc2V0Lnk7XG5cbiAgICAgICAgICAgIGNvbnN0IGJhc2VQb3NpdGlvbiA9IGNhbGN1bGF0ZURyYWdQb3NpdGlvbihpdGVtLCB7IHg6IGJhc2VYLCB5OiBiYXNlWSB9LCAwLCAwLCBjYW52YXNXaWR0aCwgY2FudmFzSGVpZ2h0KTtcblxuICAgICAgICAgICAgY29uc3Qgc3RhcnRQb3MgPSB0aGlzLnN0YXRlLnN0YXJ0UG9zaXRpb25zLmdldChpdGVtLmlkKSA/PyB7IHg6IGl0ZW0ueCwgeTogaXRlbS55IH07XG4gICAgICAgICAgICBjb25zdCBib3VuZHMgPSB7IHg6IDAsIHk6IDAsIHdpZHRoOiBjYW52YXNXaWR0aCwgaGVpZ2h0OiBjYW52YXNIZWlnaHQgfTtcbiAgICAgICAgICAgIGNvbnN0IG90aGVycyA9IHRoaXMuaXRlbXMuZmlsdGVyKG90aGVyID0+IG90aGVyLmlkICE9PSBpdGVtLmlkKTtcblxuICAgICAgICAgICAgbGV0IHRhcmdldFBvcyA9IHsgeDogYmFzZVBvc2l0aW9uLngsIHk6IGJhc2VQb3NpdGlvbi55IH07XG5cbiAgICAgICAgICAgIC8vIEFwcGx5IHNuYXBwaW5nIHJ1bGVzIGlmIHNuYXAgZW5naW5lIGlzIGFjdGl2ZVxuICAgICAgICAgICAgaWYgKHRoaXMuc25hcEVuZ2luZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNuYXBUYXJnZXQgPSB0aGlzLnNuYXBFbmdpbmUuY2FsY3VsYXRlU25hcFRhcmdldChpdGVtLCBvdGhlcnMsIHRhcmdldFBvcywge1xuICAgICAgICAgICAgICAgICAgICBib3VuZHNcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0YXJnZXRQb3MgPSBzbmFwVGFyZ2V0LnBvc2l0aW9uO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZXNvbHZlIGNvbGxpc2lvbiBvdmVybGFwcyBpZiBjb2xsaXNpb24gZW5naW5lIGlzIGFjdGl2ZVxuICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlzaW9uRW5naW5lKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0UG9zID0gdGhpcy5jb2xsaXNpb25FbmdpbmUucmVzb2x2ZU5vbk92ZXJsYXBwaW5nUG9zaXRpb24oXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0sXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldFBvcyxcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRQb3MsXG4gICAgICAgICAgICAgICAgICAgIG90aGVycyxcbiAgICAgICAgICAgICAgICAgICAgYm91bmRzXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHsgLi4uaXRlbSwgeDogdGFyZ2V0UG9zLngsIHk6IHRhcmdldFBvcy55IH0gYXMgVDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5pdGVtcyA9IHRhcmdldEl0ZW1zO1xuICAgICAgICByZXR1cm4gdGhpcy5pdGVtcztcbiAgICB9XG5cbiAgICBlbmREcmFnKCk6IHZvaWQge1xuICAgICAgICAvLyBSZXNldCBkcmFnIHN0YXR1cyBhbmQgY2xlYXIgc3RhcnRpbmcgcG9zaXRpb25zL29mZnNldHNcbiAgICAgICAgdGhpcy5zdGF0ZS5pc0RyYWdnaW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMuc3RhdGUuYWN0aXZlSWQgPSBudWxsO1xuICAgICAgICB0aGlzLnN0YXRlLnN0YXJ0UG9zaXRpb25zLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuc3RhdGUuc3RhcnRPZmZzZXRzLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgdXBkYXRlSXRlbXMoaXRlbXM6IFRbXSk6IHZvaWQge1xuICAgICAgICB0aGlzLml0ZW1zID0gaXRlbXM7XG4gICAgfVxuXG4gICAgaXNEcmFnZ2luZygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RhdGUuaXNEcmFnZ2luZztcbiAgICB9XG59XG4iLCJpbXBvcnQgdHlwZSB7IFJlY3RhbmdsZSwgUmVjdExpa2UsIFJvdGF0aW9uIH0gZnJvbSBcIi4uL3R5cGVzL2dlb21ldHJ5XCI7XG5cbmltcG9ydCB7IGlzVmVydGljYWxSb3RhdGlvbiB9IGZyb20gXCIuL3JvdGF0aW9uUnVsZXNcIjtcblxuLyoqXG4gKiBDb252ZXJ0IHgseSx3aWR0aCxoZWlnaHRcbiAqIHRvIGJvdW5kaW5nIHJlY3RhbmdsZVxuICovXG5leHBvcnQgY29uc3QgZ2V0UmVjdGFuZ2xlID0gKGl0ZW06IFJlY3RMaWtlICYgUGFydGlhbDx7IHJvdGF0aW9uOiBSb3RhdGlvbiB9Pik6IFJlY3RhbmdsZSA9PiB7XG4gICAgY29uc3QgaXNWZXJ0aWNhbCA9IHR5cGVvZiBpdGVtLnJvdGF0aW9uID09PSBcIm51bWJlclwiICYmIGlzVmVydGljYWxSb3RhdGlvbihpdGVtLnJvdGF0aW9uIGFzIFJvdGF0aW9uKTtcbiAgICBjb25zdCB3aWR0aCA9IGlzVmVydGljYWwgPyBpdGVtLmhlaWdodCA6IGl0ZW0ud2lkdGg7XG4gICAgY29uc3QgaGVpZ2h0ID0gaXNWZXJ0aWNhbCA/IGl0ZW0ud2lkdGggOiBpdGVtLmhlaWdodDtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6IGl0ZW0ueCxcbiAgICAgICAgdG9wOiBpdGVtLnksXG4gICAgICAgIHJpZ2h0OiBpdGVtLnggKyB3aWR0aCxcbiAgICAgICAgYm90dG9tOiBpdGVtLnkgKyBoZWlnaHRcbiAgICB9O1xufTtcblxuLyoqXG4gKiBDaGVjayBBQUJCIGludGVyc2VjdGlvblxuICovXG5leHBvcnQgY29uc3QgaXNJbnRlcnNlY3RpbmcgPSAoYTogUmVjdGFuZ2xlLCBiOiBSZWN0YW5nbGUsIGVwczogbnVtYmVyID0gMWUtNCk6IGJvb2xlYW4gPT4ge1xuICAgIHJldHVybiAhKGEucmlnaHQgPD0gYi5sZWZ0ICsgZXBzIHx8IGEubGVmdCA+PSBiLnJpZ2h0IC0gZXBzIHx8IGEuYm90dG9tIDw9IGIudG9wICsgZXBzIHx8IGEudG9wID49IGIuYm90dG9tIC0gZXBzKTtcbn07XG5cbi8qKlxuICogQ2hlY2sgb3ZlcmxhcCBiZXR3ZWVuIHR3byBpdGVtc1xuICovXG5leHBvcnQgY29uc3Qgb3ZlcmxhcHMgPSAoYTogUmVjdExpa2UsIGI6IFJlY3RMaWtlKTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuIGlzSW50ZXJzZWN0aW5nKGdldFJlY3RhbmdsZShhKSwgZ2V0UmVjdGFuZ2xlKGIpKTtcbn07XG5cbi8qKlxuICogQ2hlY2sgaXRlbSBpbnNpZGUgYm91bmRzIChhY2NvdW50IGZvciByb3RhdGlvbilcbiAqL1xuZXhwb3J0IGNvbnN0IGlzSW5zaWRlQm91bmRzID0gKGl0ZW06IFJlY3RMaWtlICYgUGFydGlhbDx7IHJvdGF0aW9uOiBSb3RhdGlvbiB9PiwgYm91bmRzOiBSZWN0TGlrZSk6IGJvb2xlYW4gPT4ge1xuICAgIGNvbnN0IHJlY3QgPSBnZXRSZWN0YW5nbGUoaXRlbSk7XG4gICAgcmV0dXJuIChcbiAgICAgICAgcmVjdC5sZWZ0ID49IGJvdW5kcy54ICYmXG4gICAgICAgIHJlY3QudG9wID49IGJvdW5kcy55ICYmXG4gICAgICAgIHJlY3QucmlnaHQgPD0gYm91bmRzLnggKyBib3VuZHMud2lkdGggJiZcbiAgICAgICAgcmVjdC5ib3R0b20gPD0gYm91bmRzLnkgKyBib3VuZHMuaGVpZ2h0XG4gICAgKTtcbn07XG5cbmV4cG9ydCBjb25zdCBmaW5kQ29sbGlzaW9ucyA9IDxUIGV4dGVuZHMgUmVjdExpa2U+KHRhcmdldDogVCwgaXRlbXM6IFRbXSk6IFRbXSA9PiB7XG4gICAgcmV0dXJuIGl0ZW1zLmZpbHRlcihpdGVtID0+IHtcbiAgICAgICAgaWYgKGl0ZW0gPT09IHRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG92ZXJsYXBzKHRhcmdldCwgaXRlbSk7XG4gICAgfSk7XG59O1xuIiwiaW1wb3J0IHR5cGUgeyBQb2ludCwgUmVjdExpa2UsIFJvdGF0aW9uIH0gZnJvbSBcIi4uL3R5cGVzL2dlb21ldHJ5XCI7XG5pbXBvcnQgeyBmaW5kQ29sbGlzaW9ucywgaXNJbnNpZGVCb3VuZHMgfSBmcm9tIFwiLi4vZG9tYWluL2dlb21ldHJ5UnVsZXNcIjtcbmltcG9ydCB7IGdldFJvdGF0ZWRTaXplIH0gZnJvbSBcIi4uL2RvbWFpbi9yb3RhdGlvblJ1bGVzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVmFsaWRQb3NpdGlvbiB7XG4gICAgcG9zaXRpb246IFBvaW50O1xuICAgIHR5cGU6IFwic25hcF9sZWZ0XCIgfCBcInNuYXBfcmlnaHRcIiB8IFwic25hcF90b3BcIiB8IFwic25hcF9ib3R0b21cIiB8IFwiZ3JpZFwiO1xuICAgIGRpc3RhbmNlOiBudW1iZXI7XG59XG5cbmV4cG9ydCBjbGFzcyBDb2xsaXNpb25FbmdpbmUge1xuICAgIGRldGVjdENvbGxpc2lvbnM8VCBleHRlbmRzIFJlY3RMaWtlPihpdGVtOiBULCBvdGhlcnM6IFRbXSk6IFRbXSB7XG4gICAgICAgIHJldHVybiBmaW5kQ29sbGlzaW9ucyhpdGVtLCBvdGhlcnMpO1xuICAgIH1cblxuICAgIGZpbmRWYWxpZFBvc2l0aW9uczxUIGV4dGVuZHMgUmVjdExpa2UgJiB7IHJvdGF0aW9uPzogUm90YXRpb24gfT4oXG4gICAgICAgIGl0ZW06IFQsXG4gICAgICAgIG90aGVyczogVFtdLFxuICAgICAgICBib3VuZHM6IFJlY3RMaWtlLFxuICAgICAgICBzbmFwRGlzdGFuY2U6IG51bWJlciA9IDBcbiAgICApOiBWYWxpZFBvc2l0aW9uW10ge1xuICAgICAgICBjb25zdCBpdGVtVmlzID0gZ2V0Um90YXRlZFNpemUoeyB3aWR0aDogaXRlbS53aWR0aCwgaGVpZ2h0OiBpdGVtLmhlaWdodCB9LCBpdGVtLnJvdGF0aW9uID8/IDApO1xuICAgICAgICBjb25zdCBpdGVtVyA9IGl0ZW1WaXMud2lkdGg7XG4gICAgICAgIGNvbnN0IGl0ZW1IID0gaXRlbVZpcy5oZWlnaHQ7XG5cbiAgICAgICAgY29uc3QgeENhbmRpZGF0ZXMgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICAgICAgeENhbmRpZGF0ZXMuYWRkKGl0ZW0ueCk7XG4gICAgICAgIGlmIChib3VuZHMpIHtcbiAgICAgICAgICAgIHhDYW5kaWRhdGVzLmFkZChib3VuZHMueCk7XG4gICAgICAgICAgICB4Q2FuZGlkYXRlcy5hZGQoYm91bmRzLnggKyBib3VuZHMud2lkdGggLSBpdGVtVyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB5Q2FuZGlkYXRlcyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgICAgICB5Q2FuZGlkYXRlcy5hZGQoaXRlbS55KTtcbiAgICAgICAgaWYgKGJvdW5kcykge1xuICAgICAgICAgICAgeUNhbmRpZGF0ZXMuYWRkKGJvdW5kcy55KTtcbiAgICAgICAgICAgIHlDYW5kaWRhdGVzLmFkZChib3VuZHMueSArIGJvdW5kcy5oZWlnaHQgLSBpdGVtSCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IG90aGVyIG9mIG90aGVycykge1xuICAgICAgICAgICAgY29uc3Qgb3RoZXJWaXMgPSBnZXRSb3RhdGVkU2l6ZSh7IHdpZHRoOiBvdGhlci53aWR0aCwgaGVpZ2h0OiBvdGhlci5oZWlnaHQgfSwgb3RoZXIucm90YXRpb24gPz8gMCk7XG4gICAgICAgICAgICBjb25zdCBvdGhlclcgPSBvdGhlclZpcy53aWR0aDtcbiAgICAgICAgICAgIGNvbnN0IG90aGVySCA9IG90aGVyVmlzLmhlaWdodDtcblxuICAgICAgICAgICAgLy8gWC1heGlzIGNhbmRpZGF0ZXMgZm9yIGl0ZW1cbiAgICAgICAgICAgIHhDYW5kaWRhdGVzLmFkZChvdGhlci54ICsgb3RoZXJXICsgc25hcERpc3RhbmNlKTtcbiAgICAgICAgICAgIHhDYW5kaWRhdGVzLmFkZChvdGhlci54IC0gaXRlbVcgLSBzbmFwRGlzdGFuY2UpO1xuICAgICAgICAgICAgeENhbmRpZGF0ZXMuYWRkKG90aGVyLngpO1xuICAgICAgICAgICAgeENhbmRpZGF0ZXMuYWRkKG90aGVyLnggKyBvdGhlclcgLSBpdGVtVyk7XG5cbiAgICAgICAgICAgIC8vIFktYXhpcyBjYW5kaWRhdGVzIGZvciBpdGVtXG4gICAgICAgICAgICB5Q2FuZGlkYXRlcy5hZGQob3RoZXIueSArIG90aGVySCArIHNuYXBEaXN0YW5jZSk7XG4gICAgICAgICAgICB5Q2FuZGlkYXRlcy5hZGQob3RoZXIueSAtIGl0ZW1IIC0gc25hcERpc3RhbmNlKTtcbiAgICAgICAgICAgIHlDYW5kaWRhdGVzLmFkZChvdGhlci55KTtcbiAgICAgICAgICAgIHlDYW5kaWRhdGVzLmFkZChvdGhlci55ICsgb3RoZXJIIC0gaXRlbUgpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdmFsaWRQb3NpdGlvbnM6IFZhbGlkUG9zaXRpb25bXSA9IFtdO1xuICAgICAgICBjb25zdCB2aXNpdGVkID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgICAgICAgZm9yIChjb25zdCB4IG9mIHhDYW5kaWRhdGVzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHkgb2YgeUNhbmRpZGF0ZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBrZXkgPSBgJHtNYXRoLnJvdW5kKHggKiAxMDApfV8ke01hdGgucm91bmQoeSAqIDEwMCl9YDtcbiAgICAgICAgICAgICAgICBpZiAodmlzaXRlZC5oYXMoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmlzaXRlZC5hZGQoa2V5KTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGNhbmRpZGF0ZVBvcyA9IHsgeCwgeSB9O1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzVmFsaWRQb3NpdGlvbihpdGVtLCBjYW5kaWRhdGVQb3MsIG90aGVycywgYm91bmRzKSkge1xuICAgICAgICAgICAgICAgICAgICB2YWxpZFBvc2l0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBjYW5kaWRhdGVQb3MsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImdyaWRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc3RhbmNlOiBNYXRoLmh5cG90KHggLSBpdGVtLngsIHkgLSBpdGVtLnkpXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB2YWxpZFBvc2l0aW9ucy5zb3J0KChhLCBiKSA9PiBhLmRpc3RhbmNlIC0gYi5kaXN0YW5jZSk7XG4gICAgfVxuXG4gICAgcmVzb2x2ZU5vbk92ZXJsYXBwaW5nUG9zaXRpb248VCBleHRlbmRzIFJlY3RMaWtlICYgeyByb3RhdGlvbj86IFJvdGF0aW9uIH0+KFxuICAgICAgICBpdGVtOiBULFxuICAgICAgICBkZXNpcmVkUG9zOiBQb2ludCxcbiAgICAgICAgc3RhcnRQb3M6IFBvaW50LFxuICAgICAgICBvdGhlcnM6IFRbXSxcbiAgICAgICAgYm91bmRzOiBSZWN0TGlrZVxuICAgICk6IFBvaW50IHtcbiAgICAgICAgY29uc3QgZGVzaXJlZEl0ZW0gPSB7IC4uLml0ZW0sIHg6IGRlc2lyZWRQb3MueCwgeTogZGVzaXJlZFBvcy55IH07XG5cbiAgICAgICAgLy8gMS4gSWYgZGVzaXJlZCBwb3NpdGlvbiBkb2VzIG5vdCBjb2xsaWRlIGFuZCBpcyBpbnNpZGUgYm91bmRzLCByZXR1cm4gZGVzaXJlZFBvc1xuICAgICAgICBpZiAoaXNJbnNpZGVCb3VuZHMoZGVzaXJlZEl0ZW0sIGJvdW5kcykgJiYgdGhpcy5kZXRlY3RDb2xsaXNpb25zKGRlc2lyZWRJdGVtLCBvdGhlcnMpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGRlc2lyZWRQb3M7XG4gICAgICAgIH1cblxuICAgICAgICAvLyAyLiBGaW5kIHZhbGlkIGNvcm5lci9lZGdlIGNhbmRpZGF0ZSBwb3NpdGlvbiBjbG9zZXN0IHRvIGRlc2lyZWRQb3NcbiAgICAgICAgY29uc3QgdmFsaWRQb3NpdGlvbnMgPSB0aGlzLmZpbmRWYWxpZFBvc2l0aW9ucyhkZXNpcmVkSXRlbSwgb3RoZXJzLCBib3VuZHMsIDApO1xuICAgICAgICBpZiAodmFsaWRQb3NpdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbGlkUG9zaXRpb25zWzBdLnBvc2l0aW9uO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gMy4gVHJ5IG1vdmluZyBhbG9uZyBYIGF4aXMgb25seVxuICAgICAgICBjb25zdCB4T25seUl0ZW0gPSB7IC4uLml0ZW0sIHg6IGRlc2lyZWRQb3MueCwgeTogc3RhcnRQb3MueSB9O1xuICAgICAgICBpZiAoaXNJbnNpZGVCb3VuZHMoeE9ubHlJdGVtLCBib3VuZHMpICYmIHRoaXMuZGV0ZWN0Q29sbGlzaW9ucyh4T25seUl0ZW0sIG90aGVycykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4geyB4OiBkZXNpcmVkUG9zLngsIHk6IHN0YXJ0UG9zLnkgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIDQuIFRyeSBtb3ZpbmcgYWxvbmcgWSBheGlzIG9ubHlcbiAgICAgICAgY29uc3QgeU9ubHlJdGVtID0geyAuLi5pdGVtLCB4OiBzdGFydFBvcy54LCB5OiBkZXNpcmVkUG9zLnkgfTtcbiAgICAgICAgaWYgKGlzSW5zaWRlQm91bmRzKHlPbmx5SXRlbSwgYm91bmRzKSAmJiB0aGlzLmRldGVjdENvbGxpc2lvbnMoeU9ubHlJdGVtLCBvdGhlcnMpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgeDogc3RhcnRQb3MueCwgeTogZGVzaXJlZFBvcy55IH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyA1LiBGYWxsYmFjazogcmV2ZXJ0IHRvIG9yaWdpbmFsIHN0YXJ0IHBvc2l0aW9uXG4gICAgICAgIHJldHVybiBzdGFydFBvcztcbiAgICB9XG5cbiAgICBwcml2YXRlIGlzVmFsaWRQb3NpdGlvbjxUIGV4dGVuZHMgUmVjdExpa2U+KGl0ZW06IFQsIHBvc2l0aW9uOiBQb2ludCwgb3RoZXJzOiBUW10sIGJvdW5kczogUmVjdExpa2UpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgbW92ZWRJdGVtID0geyAuLi5pdGVtLCB4OiBwb3NpdGlvbi54LCB5OiBwb3NpdGlvbi55IH07XG5cbiAgICAgICAgaWYgKCFpc0luc2lkZUJvdW5kcyhtb3ZlZEl0ZW0sIGJvdW5kcykpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLmRldGVjdENvbGxpc2lvbnMobW92ZWRJdGVtLCBvdGhlcnMpLmxlbmd0aCA9PT0gMDtcbiAgICB9XG59XG4iLCJpbXBvcnQgdHlwZSB7IFBvaW50LCBSb3RhdGlvbiwgUmVjdExpa2UgfSBmcm9tIFwiLi4vdHlwZXMvZ2VvbWV0cnlcIjtcbmltcG9ydCB7IHNuYXBUb0dyaWQgfSBmcm9tIFwiLi4vZG9tYWluL3NuYXBSdWxlc1wiO1xuaW1wb3J0IHsgZ2V0Um90YXRlZFNpemUgfSBmcm9tIFwiLi4vZG9tYWluL3JvdGF0aW9uUnVsZXNcIjtcbmltcG9ydCB7IEdSSURfU0laRSwgU05BUF9USFJFU0hPTEQgfSBmcm9tIFwiLi4vY29uc3RhbnRzL2NhbnZhc1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNuYXBUYXJnZXQge1xuICBwb3NpdGlvbjogUG9pbnQ7XG4gIHJvdGF0aW9uPzogUm90YXRpb247XG4gIHR5cGU6IFwiZWRnZVwiIHwgXCJhbGlnblwiIHwgXCJib3VuZGFyeVwiIHwgXCJncmlkXCIgfCBcImFuZ2xlXCIgfCBcIm5vbmVcIjtcbiAgZGlzdGFuY2U6IG51bWJlcjtcbn1cblxuLy8gQ29uZmlndXJhdGlvbiBmb3Igc25hcCBjYWxjdWxhdGlvbnNcbmV4cG9ydCBpbnRlcmZhY2UgU25hcENvbmZpZyB7XG4gIGJvdW5kcz86IFJlY3RMaWtlOyAvLyBCb3VuZGluZyByZWN0YW5nbGUgZm9yIGJvdW5kYXJ5IHNuYXBwaW5nXG4gIGdyaWRTaXplOiBudW1iZXI7IC8vIEdyaWQgc2l6ZSBmb3IgZ3JpZCBzbmFwcGluZyAoMCBkaXNhYmxlcylcbiAgdGhyZXNob2xkOiBudW1iZXI7IC8vIE1heGltdW0gZGlzdGFuY2UgdG8gc25hcCAocGl4ZWxzKVxufVxuXG4vLyBJbnRlcm5hbCByZXByZXNlbnRhdGlvbiBvZiBhIHNuYXAgY2FuZGlkYXRlIGFsb25nIGEgc2luZ2xlIGF4aXNcbmludGVyZmFjZSBTbmFwQ2FuZGlkYXRlIHtcbiAgcG9zaXRpb246IG51bWJlcjtcbiAgdHlwZTogU25hcFRhcmdldFtcInR5cGVcIl07XG4gIGRpc3RhbmNlOiBudW1iZXI7XG59XG5cbi8vIERlZmF1bHQgY29uZmlndXJhdGlvbiB2YWx1ZXNcbmNvbnN0IERFRkFVTFRfU05BUF9DT05GSUc6IFNuYXBDb25maWcgPSB7XG4gIGdyaWRTaXplOiBHUklEX1NJWkUsXG4gIHRocmVzaG9sZDogU05BUF9USFJFU0hPTEQsXG59O1xuXG4vLyBFdmFsdWF0ZXMgYSBzbmFwIGNhbmRpZGF0ZSBhZ2FpbnN0IHRoZSBjdXJyZW50IGJlc3QgY2FuZGlkYXRlXG5mdW5jdGlvbiBldmFsdWF0ZUNhbmRpZGF0ZShjdXJyZW50OiBTbmFwQ2FuZGlkYXRlLCBjYW5kaWRhdGU6IFNuYXBDYW5kaWRhdGUpOiBTbmFwQ2FuZGlkYXRlIHtcbiAgcmV0dXJuIGNhbmRpZGF0ZS5kaXN0YW5jZSA8IGN1cnJlbnQuZGlzdGFuY2UgPyBjYW5kaWRhdGUgOiBjdXJyZW50O1xufVxuXG4vLyBDcmVhdGVzIGEgc25hcCBjYW5kaWRhdGUgZm9yIGEgdGFyZ2V0IHBvc2l0aW9uXG5mdW5jdGlvbiBjcmVhdGVDYW5kaWRhdGUocG9zaXRpb246IG51bWJlciwgdHlwZTogU25hcFRhcmdldFtcInR5cGVcIl0sIHRhcmdldFBvczogbnVtYmVyKTogU25hcENhbmRpZGF0ZSB7XG4gIHJldHVybiB7XG4gICAgcG9zaXRpb24sXG4gICAgdHlwZSxcbiAgICBkaXN0YW5jZTogTWF0aC5hYnModGFyZ2V0UG9zIC0gcG9zaXRpb24pLFxuICB9O1xufVxuXG4vLyBDYWxjdWxhdGVzIGJvdW5kYXJ5IHNuYXAgY2FuZGlkYXRlcyBmb3IgYSBzaW5nbGUgYXhpc1xuZnVuY3Rpb24gY2FsY3VsYXRlQm91bmRhcnlDYW5kaWRhdGVzKFxuICB0YXJnZXRQb3M6IG51bWJlcixcbiAgaXRlbVNpemU6IG51bWJlcixcbiAgYm91bmRzOiBSZWN0TGlrZSxcbiAgYXhpczogXCJ4XCIgfCBcInlcIlxuKTogU25hcENhbmRpZGF0ZVtdIHtcbiAgY29uc3QgYm91bmRzU3RhcnQgPSBheGlzID09PSBcInhcIiA/IGJvdW5kcy54IDogYm91bmRzLnk7XG4gIGNvbnN0IGJvdW5kc0VuZCA9IGF4aXMgPT09IFwieFwiID8gYm91bmRzLnggKyBib3VuZHMud2lkdGggOiBib3VuZHMueSArIGJvdW5kcy5oZWlnaHQ7XG5cbiAgcmV0dXJuIFtcbiAgICBjcmVhdGVDYW5kaWRhdGUoYm91bmRzU3RhcnQsIFwiYm91bmRhcnlcIiwgdGFyZ2V0UG9zKSxcbiAgICBjcmVhdGVDYW5kaWRhdGUoYm91bmRzRW5kIC0gaXRlbVNpemUsIFwiYm91bmRhcnlcIiwgdGFyZ2V0UG9zKSxcbiAgXTtcbn1cblxuLy8gQ2FsY3VsYXRlcyBlZGdlIGFuZCBhbGlnbm1lbnQgc25hcCBjYW5kaWRhdGVzIGZvciBhIHNpbmdsZSBheGlzIGFnYWluc3QgYW5vdGhlciBpdGVtXG5mdW5jdGlvbiBjYWxjdWxhdGVJdGVtU25hcENhbmRpZGF0ZXMoXG4gIHRhcmdldFBvczogbnVtYmVyLFxuICBpdGVtU2l6ZTogbnVtYmVyLFxuICBvdGhlcjogUmVjdExpa2UsXG4gIG90aGVyU2l6ZTogbnVtYmVyLFxuICBheGlzOiBcInhcIiB8IFwieVwiXG4pOiBTbmFwQ2FuZGlkYXRlW10ge1xuICBjb25zdCBvdGhlclN0YXJ0ID0gYXhpcyA9PT0gXCJ4XCIgPyBvdGhlci54IDogb3RoZXIueTtcbiAgY29uc3Qgb3RoZXJFbmQgPSBheGlzID09PSBcInhcIiA/IG90aGVyLnggKyBvdGhlclNpemUgOiBvdGhlci55ICsgb3RoZXJTaXplO1xuXG4gIHJldHVybiBbXG4gICAgY3JlYXRlQ2FuZGlkYXRlKG90aGVyRW5kLCBcImVkZ2VcIiwgdGFyZ2V0UG9zKSwgLy8gRWRnZTogaXRlbSB0b3VjaGluZyBvdGhlcidzIGZhciBlZGdlXG4gICAgY3JlYXRlQ2FuZGlkYXRlKG90aGVyU3RhcnQgLSBpdGVtU2l6ZSwgXCJlZGdlXCIsIHRhcmdldFBvcyksIC8vIEVkZ2U6IGl0ZW0gdG91Y2hpbmcgb3RoZXIncyBuZWFyIGVkZ2VcbiAgICBjcmVhdGVDYW5kaWRhdGUob3RoZXJTdGFydCwgXCJhbGlnblwiLCB0YXJnZXRQb3MpLCAvLyBBbGlnbjogaXRlbSdzIG5lYXIgZWRnZSBhbGlnbmVkIHdpdGggb3RoZXIncyBuZWFyIGVkZ2VcbiAgICBjcmVhdGVDYW5kaWRhdGUob3RoZXJFbmQgLSBpdGVtU2l6ZSwgXCJhbGlnblwiLCB0YXJnZXRQb3MpLCAvLyBBbGlnbjogaXRlbSdzIGZhciBlZGdlIGFsaWduZWQgd2l0aCBvdGhlcidzIGZhciBlZGdlXG4gIF07XG59XG5cbi8vIENhbGN1bGF0ZXMgZ3JpZCBzbmFwIGNhbmRpZGF0ZSBmb3IgYSBzaW5nbGUgYXhpc1xuZnVuY3Rpb24gY2FsY3VsYXRlR3JpZENhbmRpZGF0ZSh0YXJnZXRQb3M6IG51bWJlciwgZ3JpZFNpemU6IG51bWJlciwgdGhyZXNob2xkOiBudW1iZXIpOiBTbmFwQ2FuZGlkYXRlIHwgbnVsbCB7XG4gIGlmIChncmlkU2l6ZSA8PSAwKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCBncmlkUG9zID0gc25hcFRvR3JpZCh0YXJnZXRQb3MsIGdyaWRTaXplKTtcbiAgY29uc3QgZGlzdGFuY2UgPSBNYXRoLmFicyh0YXJnZXRQb3MgLSBncmlkUG9zKTtcblxuICBpZiAoZGlzdGFuY2UgPD0gdGhyZXNob2xkKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUNhbmRpZGF0ZShncmlkUG9zLCBcImdyaWRcIiwgdGFyZ2V0UG9zKTtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG4vLyBGaW5kcyB0aGUgYmVzdCBzbmFwIGNhbmRpZGF0ZSBmcm9tIGEgbGlzdCBvZiBjYW5kaWRhdGVzXG5mdW5jdGlvbiBmaW5kQmVzdENhbmRpZGF0ZShjYW5kaWRhdGVzOiBTbmFwQ2FuZGlkYXRlW10sIHRocmVzaG9sZDogbnVtYmVyLCB0YXJnZXRQb3M6IG51bWJlcik6IFNuYXBDYW5kaWRhdGUge1xuICBjb25zdCBpbml0aWFsOiBTbmFwQ2FuZGlkYXRlID0ge1xuICAgIHBvc2l0aW9uOiB0YXJnZXRQb3MsXG4gICAgdHlwZTogXCJub25lXCIsXG4gICAgZGlzdGFuY2U6IHRocmVzaG9sZCArIDEsXG4gIH07XG5cbiAgcmV0dXJuIGNhbmRpZGF0ZXMucmVkdWNlKChiZXN0LCBjYW5kaWRhdGUpID0+IGV2YWx1YXRlQ2FuZGlkYXRlKGJlc3QsIGNhbmRpZGF0ZSksIGluaXRpYWwpO1xufVxuXG5leHBvcnQgY2xhc3MgU25hcEVuZ2luZSB7XG4gIC8vIENhbGN1bGF0ZXMgdGhlIGJlc3Qgc25hcCB0YXJnZXQgZm9yIGFuIGl0ZW0gYmVpbmcgZHJhZ2dlZFxuICAvLyBQcmlvcml0eTogMS4gQm91bmRhcnkgMi4gRWRnZSBjb250YWN0IDMuIEFsaWdubWVudCA0LiBHcmlkIChmYWxsYmFjaylcbiAgY2FsY3VsYXRlU25hcFRhcmdldDxUIGV4dGVuZHMgUmVjdExpa2UgJiB7IHJvdGF0aW9uPzogUm90YXRpb24gfT4oXG4gICAgaXRlbTogVCxcbiAgICBvdGhlcnM6IFRbXSxcbiAgICB0YXJnZXRQb3M6IFBvaW50LFxuICAgIGNvbmZpZzogUGFydGlhbDxTbmFwQ29uZmlnPiA9IHt9XG4gICk6IFNuYXBUYXJnZXQge1xuICAgIGNvbnN0IHsgYm91bmRzLCBncmlkU2l6ZSA9IERFRkFVTFRfU05BUF9DT05GSUcuZ3JpZFNpemUsIHRocmVzaG9sZCA9IERFRkFVTFRfU05BUF9DT05GSUcudGhyZXNob2xkIH0gPSBjb25maWc7XG5cbiAgICBjb25zdCBpdGVtVmlzID0gZ2V0Um90YXRlZFNpemUoeyB3aWR0aDogaXRlbS53aWR0aCwgaGVpZ2h0OiBpdGVtLmhlaWdodCB9LCBpdGVtLnJvdGF0aW9uID8/IDApO1xuXG4gICAgLy8gQ29sbGVjdCBhbGwgWC1heGlzIGNhbmRpZGF0ZXNcbiAgICBjb25zdCB4Q2FuZGlkYXRlczogU25hcENhbmRpZGF0ZVtdID0gW107XG5cbiAgICAvLyAxLiBCb3VuZGFyeSBzbmFwIGNhbmRpZGF0ZXNcbiAgICBpZiAoYm91bmRzKSB7XG4gICAgICB4Q2FuZGlkYXRlcy5wdXNoKC4uLmNhbGN1bGF0ZUJvdW5kYXJ5Q2FuZGlkYXRlcyh0YXJnZXRQb3MueCwgaXRlbVZpcy53aWR0aCwgYm91bmRzLCBcInhcIikpO1xuICAgIH1cblxuICAgIC8vIDIuIEVkZ2UgY29udGFjdCAmIGFsaWdubWVudCBjYW5kaWRhdGVzIGFnYWluc3Qgb3RoZXIgaXRlbXNcbiAgICBmb3IgKGNvbnN0IG90aGVyIG9mIG90aGVycykge1xuICAgICAgY29uc3Qgb3RoZXJWaXMgPSBnZXRSb3RhdGVkU2l6ZSh7IHdpZHRoOiBvdGhlci53aWR0aCwgaGVpZ2h0OiBvdGhlci5oZWlnaHQgfSwgb3RoZXIucm90YXRpb24gPz8gMCk7XG5cbiAgICAgIHhDYW5kaWRhdGVzLnB1c2goLi4uY2FsY3VsYXRlSXRlbVNuYXBDYW5kaWRhdGVzKHRhcmdldFBvcy54LCBpdGVtVmlzLndpZHRoLCBvdGhlciwgb3RoZXJWaXMud2lkdGgsIFwieFwiKSk7XG4gICAgfVxuXG4gICAgLy8gMy4gR3JpZCBzbmFwIGZhbGxiYWNrIChvbmx5IGlmIG5vIGJldHRlciBjYW5kaWRhdGUgZm91bmQpXG4gICAgY29uc3QgYmVzdFggPSBmaW5kQmVzdENhbmRpZGF0ZSh4Q2FuZGlkYXRlcywgdGhyZXNob2xkLCB0YXJnZXRQb3MueCk7XG4gICAgaWYgKGJlc3RYLmRpc3RhbmNlID4gdGhyZXNob2xkKSB7XG4gICAgICBjb25zdCBncmlkQ2FuZGlkYXRlID0gY2FsY3VsYXRlR3JpZENhbmRpZGF0ZSh0YXJnZXRQb3MueCwgZ3JpZFNpemUsIHRocmVzaG9sZCk7XG4gICAgICBpZiAoZ3JpZENhbmRpZGF0ZSkge1xuICAgICAgICB4Q2FuZGlkYXRlcy5wdXNoKGdyaWRDYW5kaWRhdGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENvbGxlY3QgYWxsIFktYXhpcyBjYW5kaWRhdGVzXG4gICAgY29uc3QgeUNhbmRpZGF0ZXM6IFNuYXBDYW5kaWRhdGVbXSA9IFtdO1xuXG4gICAgLy8gMS4gQm91bmRhcnkgc25hcCBjYW5kaWRhdGVzXG4gICAgaWYgKGJvdW5kcykge1xuICAgICAgeUNhbmRpZGF0ZXMucHVzaCguLi5jYWxjdWxhdGVCb3VuZGFyeUNhbmRpZGF0ZXModGFyZ2V0UG9zLnksIGl0ZW1WaXMuaGVpZ2h0LCBib3VuZHMsIFwieVwiKSk7XG4gICAgfVxuXG4gICAgLy8gMi4gRWRnZSBjb250YWN0ICYgYWxpZ25tZW50IGNhbmRpZGF0ZXMgYWdhaW5zdCBvdGhlciBpdGVtc1xuICAgIGZvciAoY29uc3Qgb3RoZXIgb2Ygb3RoZXJzKSB7XG4gICAgICBjb25zdCBvdGhlclZpcyA9IGdldFJvdGF0ZWRTaXplKHsgd2lkdGg6IG90aGVyLndpZHRoLCBoZWlnaHQ6IG90aGVyLmhlaWdodCB9LCBvdGhlci5yb3RhdGlvbiA/PyAwKTtcblxuICAgICAgeUNhbmRpZGF0ZXMucHVzaCguLi5jYWxjdWxhdGVJdGVtU25hcENhbmRpZGF0ZXModGFyZ2V0UG9zLnksIGl0ZW1WaXMuaGVpZ2h0LCBvdGhlciwgb3RoZXJWaXMuaGVpZ2h0LCBcInlcIikpO1xuICAgIH1cblxuICAgIC8vIDMuIEdyaWQgc25hcCBmYWxsYmFja1xuICAgIGNvbnN0IGJlc3RZID0gZmluZEJlc3RDYW5kaWRhdGUoeUNhbmRpZGF0ZXMsIHRocmVzaG9sZCwgdGFyZ2V0UG9zLnkpO1xuICAgIGlmIChiZXN0WS5kaXN0YW5jZSA+IHRocmVzaG9sZCkge1xuICAgICAgY29uc3QgZ3JpZENhbmRpZGF0ZSA9IGNhbGN1bGF0ZUdyaWRDYW5kaWRhdGUodGFyZ2V0UG9zLnksIGdyaWRTaXplLCB0aHJlc2hvbGQpO1xuICAgICAgaWYgKGdyaWRDYW5kaWRhdGUpIHtcbiAgICAgICAgeUNhbmRpZGF0ZXMucHVzaChncmlkQ2FuZGlkYXRlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSZWNhbGN1bGF0ZSBiZXN0IHdpdGggZ3JpZCBjYW5kaWRhdGVzIGluY2x1ZGVkXG4gICAgY29uc3QgZmluYWxCZXN0WCA9IGZpbmRCZXN0Q2FuZGlkYXRlKHhDYW5kaWRhdGVzLCB0aHJlc2hvbGQsIHRhcmdldFBvcy54KTtcbiAgICBjb25zdCBmaW5hbEJlc3RZID0gZmluZEJlc3RDYW5kaWRhdGUoeUNhbmRpZGF0ZXMsIHRocmVzaG9sZCwgdGFyZ2V0UG9zLnkpO1xuXG4gICAgY29uc3QgbWF4RGlzdGFuY2UgPSBNYXRoLm1heChcbiAgICAgIGZpbmFsQmVzdFguZGlzdGFuY2UgPD0gdGhyZXNob2xkID8gZmluYWxCZXN0WC5kaXN0YW5jZSA6IDAsXG4gICAgICBmaW5hbEJlc3RZLmRpc3RhbmNlIDw9IHRocmVzaG9sZCA/IGZpbmFsQmVzdFkuZGlzdGFuY2UgOiAwXG4gICAgKTtcblxuICAgIGNvbnN0IHJlc3VsdFR5cGUgPVxuICAgICAgZmluYWxCZXN0WC50eXBlICE9PSBcIm5vbmVcIiA/IGZpbmFsQmVzdFgudHlwZSA6IGZpbmFsQmVzdFkudHlwZSAhPT0gXCJub25lXCIgPyBmaW5hbEJlc3RZLnR5cGUgOiBcIm5vbmVcIjtcblxuICAgIHJldHVybiB7XG4gICAgICBwb3NpdGlvbjogeyB4OiBmaW5hbEJlc3RYLnBvc2l0aW9uLCB5OiBmaW5hbEJlc3RZLnBvc2l0aW9uIH0sXG4gICAgICB0eXBlOiByZXN1bHRUeXBlLFxuICAgICAgZGlzdGFuY2U6IG1heERpc3RhbmNlLFxuICAgIH07XG4gIH1cbn1cbiIsImltcG9ydCB0eXBlIHsgUmVjdExpa2UsIFJvdGF0aW9uIH0gZnJvbSBcIi4uL3R5cGVzL2dlb21ldHJ5XCI7XG5pbXBvcnQgdHlwZSB7IENhcmdvSXRlbSB9IGZyb20gXCIuLi92aWV3TW9kZWxzL0NhcmdvSXRlbVwiO1xuaW1wb3J0IHsgb3ZlcmxhcHMsIGlzSW5zaWRlQm91bmRzIH0gZnJvbSBcIi4vZ2VvbWV0cnlSdWxlc1wiO1xuXG5leHBvcnQgdHlwZSBWYWxpZGF0aW9uRXJyb3IgPSBcIk9WRVJMQVBcIiB8IFwiT1VUX09GX0JPVU5EU1wiIHwgXCJMTV9FWENFRURFRFwiIHwgXCJIRUlHSFRfRVhDRUVERURcIjtcblxuZXhwb3J0IGludGVyZmFjZSBWYWxpZGF0aW9uUmVzdWx0IHtcbiAgdmFsaWQ6IGJvb2xlYW47XG4gIGVycm9yczogVmFsaWRhdGlvbkVycm9yW107XG4gIGl0ZW1FcnJvcnM/OiBSZWNvcmQ8c3RyaW5nLCBWYWxpZGF0aW9uRXJyb3JbXT47IC8vIFBlci1pdGVtIGVycm9yIG1hcHBpbmcgZm9yIFVJIGhpZ2hsaWdodGluZ1xufVxuXG4vLyBWYWxpZGF0ZSBhIHNpbmdsZSBpdGVtIGFnYWluc3QgYm91bmRzIGFuZCBvdGhlciBpdGVtc1xuZXhwb3J0IGNvbnN0IHZhbGlkYXRlSXRlbSA9IChcbiAgaXRlbTogUmVjdExpa2UgJiBQYXJ0aWFsPHsgcm90YXRpb246IFJvdGF0aW9uIH0+LFxuICBib3VuZHM6IFJlY3RMaWtlLFxuICBvdGhlcnM6IEFycmF5PFJlY3RMaWtlICYgUGFydGlhbDx7IHJvdGF0aW9uOiBSb3RhdGlvbiB9Pj5cbik6IFZhbGlkYXRpb25SZXN1bHQgPT4ge1xuICBjb25zdCBlcnJvcnM6IFZhbGlkYXRpb25FcnJvcltdID0gW107XG5cbiAgaWYgKCFpc0luc2lkZUJvdW5kcyhpdGVtLCBib3VuZHMpKSB7XG4gICAgZXJyb3JzLnB1c2goXCJPVVRfT0ZfQk9VTkRTXCIpO1xuICB9XG5cbiAgY29uc3QgaGFzT3ZlcmxhcCA9IG90aGVycy5zb21lKChvdGhlcikgPT4gb3ZlcmxhcHMoaXRlbSwgb3RoZXIpKTtcblxuICBpZiAoaGFzT3ZlcmxhcCkge1xuICAgIGVycm9ycy5wdXNoKFwiT1ZFUkxBUFwiKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgdmFsaWQ6IGVycm9ycy5sZW5ndGggPT09IDAsXG4gICAgZXJyb3JzLFxuICB9O1xufTtcblxuLy8gVmFsaWRhdGUgdG90YWwgbG9hZCBtZXRlcnMgKExNKSBhZ2FpbnN0IHRyYWlsZXIncyBtYXggbG9hZCBtZXRlcnNcbmV4cG9ydCBjb25zdCB2YWxpZGF0ZUxvYWRNZXRlcnMgPSAoaXRlbXM6IENhcmdvSXRlbVtdLCBtYXhMb2FkTWV0ZXJzOiBudW1iZXIsIHNjYWxlOiBudW1iZXIpOiBWYWxpZGF0aW9uUmVzdWx0ID0+IHtcbiAgY29uc3QgdG90YWxMZW5ndGhNZXRlcnMgPSBpdGVtcy5yZWR1Y2UoKHN1bSwgaXRlbSkgPT4gc3VtICsgaXRlbS53aWR0aCAvIHNjYWxlLCAwKTtcblxuICBpZiAodG90YWxMZW5ndGhNZXRlcnMgPiBtYXhMb2FkTWV0ZXJzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZhbGlkOiBmYWxzZSxcbiAgICAgIGVycm9yczogW1wiTE1fRVhDRUVERURcIl0sXG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgdmFsaWQ6IHRydWUsXG4gICAgZXJyb3JzOiBbXSxcbiAgfTtcbn07XG5cbi8vIFZhbGlkYXRlIGl0ZW0gaGVpZ2h0cyBhZ2FpbnN0IHRyYWlsZXIncyBpbnRlcm5hbCBoZWlnaHRcbmV4cG9ydCBjb25zdCB2YWxpZGF0ZUhlaWdodCA9IChpdGVtczogQ2FyZ29JdGVtW10sIGludGVybmFsSGVpZ2h0TWV0ZXI6IG51bWJlcik6IFZhbGlkYXRpb25SZXN1bHQgPT4ge1xuICBjb25zdCBpdGVtRXJyb3JzOiBSZWNvcmQ8c3RyaW5nLCBWYWxpZGF0aW9uRXJyb3JbXT4gPSB7fTtcbiAgbGV0IGhhc0Vycm9yID0gZmFsc2U7XG5cbiAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XG4gICAgY29uc3QgaXRlbUhlaWdodCA9IGl0ZW0uaGVpZ2h0TSA/PyAwO1xuICAgIGlmIChpdGVtSGVpZ2h0ID4gaW50ZXJuYWxIZWlnaHRNZXRlcikge1xuICAgICAgaXRlbUVycm9yc1tpdGVtLmlkXSA9IFtcIkhFSUdIVF9FWENFRURFRFwiXTtcbiAgICAgIGhhc0Vycm9yID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHZhbGlkOiAhaGFzRXJyb3IsXG4gICAgZXJyb3JzOiBoYXNFcnJvciA/IFtcIkhFSUdIVF9FWENFRURFRFwiXSA6IFtdLFxuICAgIGl0ZW1FcnJvcnMsXG4gIH07XG59O1xuXG4vLyBWYWxpZGF0ZSBhbGwgaXRlbXMgYWdhaW5zdCBib3VuZHMsIGVhY2ggb3RoZXIsIExNLCBhbmQgaGVpZ2h0XG5leHBvcnQgY29uc3QgdmFsaWRhdGVBbGwgPSAoXG4gIGl0ZW1zOiBDYXJnb0l0ZW1bXSxcbiAgYm91bmRzOiBSZWN0TGlrZSxcbiAgb3B0aW9ucz86IHtcbiAgICBtYXhMb2FkTWV0ZXJzPzogbnVtYmVyO1xuICAgIGludGVybmFsSGVpZ2h0TWV0ZXI/OiBudW1iZXI7XG4gICAgc2NhbGU/OiBudW1iZXI7XG4gIH1cbik6IFZhbGlkYXRpb25SZXN1bHQgPT4ge1xuICBjb25zdCBhbGxFcnJvcnM6IFZhbGlkYXRpb25FcnJvcltdID0gW107XG4gIGNvbnN0IGl0ZW1FcnJvcnM6IFJlY29yZDxzdHJpbmcsIFZhbGlkYXRpb25FcnJvcltdPiA9IHt9O1xuXG4gIC8vIDEuIFZhbGlkYXRlIGVhY2ggaXRlbSBhZ2FpbnN0IGJvdW5kcyBhbmQgb3ZlcmxhcHNcbiAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XG4gICAgY29uc3Qgb3RoZXJzID0gaXRlbXMuZmlsdGVyKChvdGhlcikgPT4gb3RoZXIuaWQgIT09IGl0ZW0uaWQpO1xuICAgIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRlSXRlbShpdGVtLCBib3VuZHMsIG90aGVycyk7XG4gICAgaWYgKCFyZXN1bHQudmFsaWQpIHtcbiAgICAgIGFsbEVycm9ycy5wdXNoKC4uLnJlc3VsdC5lcnJvcnMpO1xuICAgICAgaXRlbUVycm9yc1tpdGVtLmlkXSA9IHJlc3VsdC5lcnJvcnM7XG4gICAgfVxuICB9XG5cbiAgLy8gMi4gVmFsaWRhdGUgbG9hZCBtZXRlcnNcbiAgaWYgKG9wdGlvbnM/Lm1heExvYWRNZXRlcnMgJiYgb3B0aW9ucz8uc2NhbGUpIHtcbiAgICBjb25zdCBsbVJlc3VsdCA9IHZhbGlkYXRlTG9hZE1ldGVycyhpdGVtcywgb3B0aW9ucy5tYXhMb2FkTWV0ZXJzLCBvcHRpb25zLnNjYWxlKTtcbiAgICBpZiAoIWxtUmVzdWx0LnZhbGlkKSB7XG4gICAgICBhbGxFcnJvcnMucHVzaCguLi5sbVJlc3VsdC5lcnJvcnMpO1xuICAgIH1cbiAgfVxuXG4gIC8vIDMuIFZhbGlkYXRlIGhlaWdodFxuICBpZiAob3B0aW9ucz8uaW50ZXJuYWxIZWlnaHRNZXRlcikge1xuICAgIGNvbnN0IGhlaWdodFJlc3VsdCA9IHZhbGlkYXRlSGVpZ2h0KGl0ZW1zLCBvcHRpb25zLmludGVybmFsSGVpZ2h0TWV0ZXIpO1xuICAgIGlmICghaGVpZ2h0UmVzdWx0LnZhbGlkKSB7XG4gICAgICBhbGxFcnJvcnMucHVzaCguLi5oZWlnaHRSZXN1bHQuZXJyb3JzKTtcbiAgICAgIE9iamVjdC5hc3NpZ24oaXRlbUVycm9ycywgaGVpZ2h0UmVzdWx0Lml0ZW1FcnJvcnMpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgdmFsaWQ6IGFsbEVycm9ycy5sZW5ndGggPT09IDAsXG4gICAgZXJyb3JzOiBhbGxFcnJvcnMsXG4gICAgaXRlbUVycm9ycyxcbiAgfTtcbn07XG4iLCJpbXBvcnQgdHlwZSB7IENhcmdvSXRlbSB9IGZyb20gXCIuLi92aWV3TW9kZWxzL0NhcmdvSXRlbVwiO1xuaW1wb3J0IHR5cGUgeyBSZWN0TGlrZSB9IGZyb20gXCIuLi90eXBlcy9nZW9tZXRyeVwiO1xuaW1wb3J0IHsgdmFsaWRhdGVBbGwsIHR5cGUgVmFsaWRhdGlvblJlc3VsdCB9IGZyb20gXCIuLi9kb21haW4vdmFsaWRhdGlvblJ1bGVzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVmFsaWRhdGlvbk9wdGlvbnMge1xuICAgIG1heExvYWRNZXRlcnM/OiBudW1iZXI7XG4gICAgaW50ZXJuYWxIZWlnaHRNZXRlcj86IG51bWJlcjtcbiAgICBzY2FsZT86IG51bWJlcjtcbn1cblxuZXhwb3J0IGNsYXNzIFZhbGlkYXRpb25FbmdpbmUge1xuICAgIHZhbGlkYXRlSXRlbXMoaXRlbXM6IENhcmdvSXRlbVtdLCBib3VuZHM6IFJlY3RMaWtlLCBvcHRpb25zPzogVmFsaWRhdGlvbk9wdGlvbnMpOiBWYWxpZGF0aW9uUmVzdWx0IHtcbiAgICAgICAgcmV0dXJuIHZhbGlkYXRlQWxsKGl0ZW1zLCBib3VuZHMsIG9wdGlvbnMpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IHVzZUVmZmVjdCB9IGZyb20gXCJyZWFjdFwiO1xuXG5pbnRlcmZhY2UgVXNlTW91c2VFdmVudHNQcm9wcyB7XG4gICAgZHJhZ2dpbmc6IGJvb2xlYW47XG4gICAgbW92ZUl0ZW1zOiAoZTogTW91c2VFdmVudCkgPT4gdm9pZDtcbiAgICBoYW5kbGVNb3VzZVVwOiAoKSA9PiB2b2lkO1xuICAgIGhhbmRsZUNhbmNlbDogKCkgPT4gdm9pZDtcbn1cblxuZXhwb3J0IGNvbnN0IHVzZU1vdXNlRXZlbnRzID0gKHsgZHJhZ2dpbmcsIG1vdmVJdGVtcywgaGFuZGxlTW91c2VVcCwgaGFuZGxlQ2FuY2VsIH06IFVzZU1vdXNlRXZlbnRzUHJvcHMpOiB2b2lkID0+IHtcbiAgICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgICAgICBjb25zdCBoYW5kbGVNb3ZlID0gKGU6IE1vdXNlRXZlbnQpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIGlmIChkcmFnZ2luZykge1xuICAgICAgICAgICAgICAgIG1vdmVJdGVtcyhlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoIWRyYWdnaW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBoYW5kbGVNb3ZlKTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsIGhhbmRsZU1vdXNlVXApO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgaGFuZGxlQ2FuY2VsKTtcblxuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgaGFuZGxlTW92ZSk7XG4gICAgICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgaGFuZGxlTW91c2VVcCk7XG4gICAgICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgaGFuZGxlQ2FuY2VsKTtcbiAgICAgICAgfTtcbiAgICB9LCBbZHJhZ2dpbmcsIG1vdmVJdGVtcywgaGFuZGxlTW91c2VVcCwgaGFuZGxlQ2FuY2VsXSk7XG59O1xuIiwiaW1wb3J0IHR5cGUgeyBDYW52YXNTdGF0ZSB9IGZyb20gXCIuL0NhbnZhc1N0YXRlXCI7XG5pbXBvcnQgdHlwZSB7IFN0YXRlTGlzdGVuZXIgfSBmcm9tIFwiLi9DYW52YXNTdGF0ZUxpc3RlbmVyXCI7XG5cbi8qKlxuICogRGVlcC1jbG9uZSBhIENhbnZhc1N0YXRlIHVzaW5nIEpTT04gcm91bmQtdHJpcC5cbiAqIEF2b2lkcyBzdHJ1Y3R1cmVkQ2xvbmUgKHVuYXZhaWxhYmxlIGluIE5vZGUgPDE3IC8gb2xkZXIganNkb20pLlxuICovXG5mdW5jdGlvbiBjbG9uZVN0YXRlKHN0YXRlOiBDYW52YXNTdGF0ZSk6IENhbnZhc1N0YXRlIHtcbiAgcmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc3RhdGUpKSBhcyBDYW52YXNTdGF0ZTtcbn1cblxuZXhwb3J0IGNsYXNzIENhbnZhc1N0YXRlTWFuYWdlciB7XG4gIHByaXZhdGUgc3RhdGU6IENhbnZhc1N0YXRlO1xuICBwcml2YXRlIGxpc3RlbmVyczogU2V0PFN0YXRlTGlzdGVuZXI+ID0gbmV3IFNldCgpO1xuICBwcml2YXRlIGhpc3Rvcnk6IENhbnZhc1N0YXRlW10gPSBbXTtcbiAgcHJpdmF0ZSBoaXN0b3J5SW5kZXggPSAtMTtcblxuICBjb25zdHJ1Y3Rvcihpbml0aWFsU3RhdGU6IENhbnZhc1N0YXRlKSB7XG4gICAgdGhpcy5zdGF0ZSA9IGNsb25lU3RhdGUoaW5pdGlhbFN0YXRlKTtcbiAgICB0aGlzLmhpc3RvcnkgPSBbY2xvbmVTdGF0ZShpbml0aWFsU3RhdGUpXTtcbiAgICB0aGlzLmhpc3RvcnlJbmRleCA9IDA7XG4gIH1cblxuICBnZXRTdGF0ZSgpOiBDYW52YXNTdGF0ZSB7XG4gICAgcmV0dXJuIGNsb25lU3RhdGUodGhpcy5zdGF0ZSk7XG4gIH1cblxuICBzZXRTdGF0ZShuZXh0U3RhdGU6IENhbnZhc1N0YXRlKTogdm9pZCB7XG4gICAgY29uc3QgbmV4dENsb25lID0gY2xvbmVTdGF0ZShuZXh0U3RhdGUpO1xuICAgIHRoaXMuc3RhdGUgPSBuZXh0Q2xvbmU7XG4gICAgLy8gUHVzaCB0byBoaXN0b3J5LCB0cnVuY2F0aW5nIGFueSByZWRvIGJyYW5jaFxuICAgIHRoaXMuaGlzdG9yeSA9IHRoaXMuaGlzdG9yeS5zbGljZSgwLCB0aGlzLmhpc3RvcnlJbmRleCArIDEpO1xuICAgIHRoaXMuaGlzdG9yeS5wdXNoKG5leHRDbG9uZSk7XG4gICAgdGhpcy5oaXN0b3J5SW5kZXggPSB0aGlzLmhpc3RvcnkubGVuZ3RoIC0gMTtcbiAgICB0aGlzLm5vdGlmeUxpc3RlbmVycygpO1xuICB9XG5cbiAgdXBkYXRlU3RhdGUodXBkYXRlOiAoc3RhdGU6IENhbnZhc1N0YXRlKSA9PiBDYW52YXNTdGF0ZSk6IHZvaWQge1xuICAgIHRoaXMuc2V0U3RhdGUodXBkYXRlKHRoaXMuc3RhdGUpKTtcbiAgfVxuXG4gIHN1YnNjcmliZShsaXN0ZW5lcjogU3RhdGVMaXN0ZW5lcik6ICgpID0+IHZvaWQge1xuICAgIHRoaXMubGlzdGVuZXJzLmFkZChsaXN0ZW5lcik7XG4gICAgbGlzdGVuZXIodGhpcy5nZXRTdGF0ZSgpKTtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgdGhpcy5saXN0ZW5lcnMuZGVsZXRlKGxpc3RlbmVyKTtcbiAgICB9O1xuICB9XG5cbiAgdW5kbygpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oaXN0b3J5SW5kZXggPiAwKSB7XG4gICAgICB0aGlzLmhpc3RvcnlJbmRleC0tO1xuICAgICAgdGhpcy5zdGF0ZSA9IGNsb25lU3RhdGUodGhpcy5oaXN0b3J5W3RoaXMuaGlzdG9yeUluZGV4XSk7XG4gICAgICB0aGlzLm5vdGlmeUxpc3RlbmVycygpO1xuICAgIH1cbiAgfVxuXG4gIHJlZG8oKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuaGlzdG9yeUluZGV4IDwgdGhpcy5oaXN0b3J5Lmxlbmd0aCAtIDEpIHtcbiAgICAgIHRoaXMuaGlzdG9yeUluZGV4Kys7XG4gICAgICB0aGlzLnN0YXRlID0gY2xvbmVTdGF0ZSh0aGlzLmhpc3RvcnlbdGhpcy5oaXN0b3J5SW5kZXhdKTtcbiAgICAgIHRoaXMubm90aWZ5TGlzdGVuZXJzKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBub3RpZnlMaXN0ZW5lcnMoKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBsaXN0ZW5lciBvZiB0aGlzLmxpc3RlbmVycykge1xuICAgICAgbGlzdGVuZXIodGhpcy5nZXRTdGF0ZSgpKTtcbiAgICB9XG4gIH1cbn1cbiIsImltcG9ydCB0eXBlIHsgUG9pbnQgfSBmcm9tIFwiLi4vdHlwZXMvZ2VvbWV0cnlcIjtcbmltcG9ydCB0eXBlIHsgQ2FyZ29JdGVtIH0gZnJvbSBcIi4uL3ZpZXdNb2RlbHMvQ2FyZ29JdGVtXCI7XG5pbXBvcnQgdHlwZSB7IENhbnZhc1N0YXRlTWFuYWdlciB9IGZyb20gXCIuL0NhbnZhc1N0YXRlTWFuYWdlclwiO1xuaW1wb3J0IHsgcm90YXRlOTAsIGdldFJvdGF0ZWRTaXplIH0gZnJvbSBcIi4uL2RvbWFpbi9yb3RhdGlvblJ1bGVzXCI7XG5pbXBvcnQgeyBEcmFnRW5naW5lIH0gZnJvbSBcIi4uL2VuZ2luZXMvRHJhZ0VuZ2luZVwiO1xuaW1wb3J0IHsgVmFsaWRhdGlvbkVuZ2luZSB9IGZyb20gXCIuLi9lbmdpbmVzL1ZhbGlkYXRpb25FbmdpbmVcIjtcblxuZXhwb3J0IHR5cGUgQ2FudmFzQWN0aW9uID1cbiAgfCB7IHR5cGU6IFwiU0VMRUNUXCI7IGlkczogc3RyaW5nW10gfVxuICB8IHsgdHlwZTogXCJERVNFTEVDVFwiIH1cbiAgfCB7IHR5cGU6IFwiU0VUX0FDVElWRV9JVEVNXCI7IGlkOiBzdHJpbmcgfCBudWxsIH1cbiAgfCB7IHR5cGU6IFwiU1RBUlRfRFJBR1wiOyBhY3RpdmVJZDogc3RyaW5nOyBtb3VzZTogUG9pbnQgfVxuICB8IHsgdHlwZTogXCJEUkFHX01PVkVcIjsgbW91c2U6IFBvaW50IH1cbiAgfCB7IHR5cGU6IFwiRU5EX0RSQUdcIiB9XG4gIHwgeyB0eXBlOiBcIlJPVEFURVwiOyBpdGVtSWQ6IHN0cmluZyB9XG4gIHwgeyB0eXBlOiBcIkFERF9JVEVNXCI7IGl0ZW06IENhcmdvSXRlbSB9XG4gIHwgeyB0eXBlOiBcIlNFVF9JVEVNU1wiOyBpdGVtczogQ2FyZ29JdGVtW10gfVxuICB8IHsgdHlwZTogXCJVTkRPXCIgfVxuICB8IHsgdHlwZTogXCJSRURPXCIgfTtcblxuaW50ZXJmYWNlIENhbnZhc0FjdGlvbkRpc3BhdGNoZXJPcHRpb25zIHtcbiAgY2FudmFzV2lkdGg6IG51bWJlcjtcbiAgY2FudmFzSGVpZ2h0OiBudW1iZXI7XG4gIGRyYWdFbmdpbmU6IERyYWdFbmdpbmU8Q2FyZ29JdGVtPjtcbiAgdmFsaWRhdGlvbkVuZ2luZTogVmFsaWRhdGlvbkVuZ2luZTtcbn1cblxuLyoqXG4gKiBIZWxwZXI6IGJ1aWxkIHZhbGlkYXRpb24gb3B0aW9ucyBmcm9tIHRoZSBjdXJyZW50IGNhbnZhcyBzdGF0ZS5cbiAqIFBhc3NlcyB0cmFpbGVyLXNwZWNpZmljIGNvbnN0cmFpbnRzIChtYXggbG9hZCBtZXRlcnMsIGludGVybmFsIGhlaWdodCwgc2NhbGUpXG4gKiB0byB0aGUgdmFsaWRhdGlvbiBlbmdpbmUgZm9yIExNIGFuZCBoZWlnaHQgY2hlY2tzLlxuICovXG5jb25zdCBidWlsZFZhbGlkYXRpb25PcHRpb25zID0gKHN0YXRlOiB7XG4gIHRyYWlsZXI/OiB7IG1heExvYWRNZXRlcnM/OiBudW1iZXI7IGludGVybmFsSGVpZ2h0TWV0ZXI/OiBudW1iZXIgfSB8IG51bGw7XG4gIHNjYWxlOiBudW1iZXI7XG59KTogeyBtYXhMb2FkTWV0ZXJzPzogbnVtYmVyOyBpbnRlcm5hbEhlaWdodE1ldGVyPzogbnVtYmVyOyBzY2FsZTogbnVtYmVyIH0gPT4gKHtcbiAgbWF4TG9hZE1ldGVyczogc3RhdGUudHJhaWxlcj8ubWF4TG9hZE1ldGVycyxcbiAgaW50ZXJuYWxIZWlnaHRNZXRlcjogc3RhdGUudHJhaWxlcj8uaW50ZXJuYWxIZWlnaHRNZXRlcixcbiAgc2NhbGU6IHN0YXRlLnNjYWxlLFxufSk7XG5cbmV4cG9ydCBjbGFzcyBDYW52YXNBY3Rpb25EaXNwYXRjaGVyIHtcbiAgcHJpdmF0ZSBtYW5hZ2VyOiBDYW52YXNTdGF0ZU1hbmFnZXI7XG4gIHByaXZhdGUgY2FudmFzV2lkdGg6IG51bWJlcjtcbiAgcHJpdmF0ZSBjYW52YXNIZWlnaHQ6IG51bWJlcjtcbiAgcHJpdmF0ZSBkcmFnRW5naW5lOiBEcmFnRW5naW5lPENhcmdvSXRlbT47XG4gIHByaXZhdGUgdmFsaWRhdGlvbkVuZ2luZTogVmFsaWRhdGlvbkVuZ2luZTtcblxuICBjb25zdHJ1Y3RvcihtYW5hZ2VyOiBDYW52YXNTdGF0ZU1hbmFnZXIsIG9wdGlvbnM6IENhbnZhc0FjdGlvbkRpc3BhdGNoZXJPcHRpb25zKSB7XG4gICAgdGhpcy5tYW5hZ2VyID0gbWFuYWdlcjtcbiAgICB0aGlzLmNhbnZhc1dpZHRoID0gb3B0aW9ucy5jYW52YXNXaWR0aDtcbiAgICB0aGlzLmNhbnZhc0hlaWdodCA9IG9wdGlvbnMuY2FudmFzSGVpZ2h0O1xuICAgIHRoaXMuZHJhZ0VuZ2luZSA9IG9wdGlvbnMuZHJhZ0VuZ2luZTtcbiAgICB0aGlzLnZhbGlkYXRpb25FbmdpbmUgPSBvcHRpb25zLnZhbGlkYXRpb25FbmdpbmU7XG4gIH1cblxuICBkaXNwYXRjaChhY3Rpb246IENhbnZhc0FjdGlvbik6IHZvaWQge1xuICAgIGNvbnN0IHN0YXRlID0gdGhpcy5tYW5hZ2VyLmdldFN0YXRlKCk7XG5cbiAgICBzd2l0Y2ggKGFjdGlvbi50eXBlKSB7XG4gICAgICBjYXNlIFwiU0VMRUNUXCI6XG4gICAgICAgIHRoaXMubWFuYWdlci51cGRhdGVTdGF0ZSgoY3VycmVudCkgPT4gKHtcbiAgICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICAgIHNlbGVjdGVkSWRzOiBhY3Rpb24uaWRzLFxuICAgICAgICAgIGFjdGl2ZUl0ZW1JZDogYWN0aW9uLmlkcy5sZW5ndGggPT09IDEgPyBhY3Rpb24uaWRzWzBdIDogY3VycmVudC5hY3RpdmVJdGVtSWQsXG4gICAgICAgIH0pKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgXCJERVNFTEVDVFwiOlxuICAgICAgICB0aGlzLm1hbmFnZXIudXBkYXRlU3RhdGUoKGN1cnJlbnQpID0+ICh7XG4gICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICBzZWxlY3RlZElkczogW10sXG4gICAgICAgICAgYWN0aXZlSXRlbUlkOiBudWxsLFxuICAgICAgICB9KSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFwiU0VUX0FDVElWRV9JVEVNXCI6XG4gICAgICAgIHRoaXMubWFuYWdlci51cGRhdGVTdGF0ZSgoY3VycmVudCkgPT4gKHtcbiAgICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICAgIGFjdGl2ZUl0ZW1JZDogYWN0aW9uLmlkLFxuICAgICAgICB9KSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFwiU1RBUlRfRFJBR1wiOiB7XG4gICAgICAgIHRoaXMuZHJhZ0VuZ2luZS51cGRhdGVJdGVtcyhzdGF0ZS5jYXJnb3MpO1xuICAgICAgICBjb25zdCBzZWxlY3RlZElkcyA9IHN0YXRlLnNlbGVjdGVkSWRzLmluY2x1ZGVzKGFjdGlvbi5hY3RpdmVJZCkgPyBzdGF0ZS5zZWxlY3RlZElkcyA6IFthY3Rpb24uYWN0aXZlSWRdO1xuICAgICAgICB0aGlzLmRyYWdFbmdpbmUuc3RhcnREcmFnKGFjdGlvbi5hY3RpdmVJZCwgc2VsZWN0ZWRJZHMsIGFjdGlvbi5tb3VzZSk7XG4gICAgICAgIHRoaXMubWFuYWdlci51cGRhdGVTdGF0ZSgoY3VycmVudCkgPT4gKHtcbiAgICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICAgIHNlbGVjdGVkSWRzLFxuICAgICAgICAgIGFjdGl2ZUl0ZW1JZDogYWN0aW9uLmFjdGl2ZUlkLFxuICAgICAgICB9KSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBjYXNlIFwiRFJBR19NT1ZFXCI6IHtcbiAgICAgICAgY29uc3QgaXRlbXMgPSB0aGlzLmRyYWdFbmdpbmUubW92ZShhY3Rpb24ubW91c2UsIHRoaXMuY2FudmFzV2lkdGgsIHRoaXMuY2FudmFzSGVpZ2h0KTtcbiAgICAgICAgdGhpcy5kcmFnRW5naW5lLnVwZGF0ZUl0ZW1zKGl0ZW1zKTtcbiAgICAgICAgY29uc3QgdmFsaWRhdGlvbiA9IHRoaXMudmFsaWRhdGlvbkVuZ2luZS52YWxpZGF0ZUl0ZW1zKFxuICAgICAgICAgIGl0ZW1zLFxuICAgICAgICAgIHsgeDogMCwgeTogMCwgd2lkdGg6IHRoaXMuY2FudmFzV2lkdGgsIGhlaWdodDogdGhpcy5jYW52YXNIZWlnaHQgfSxcbiAgICAgICAgICBidWlsZFZhbGlkYXRpb25PcHRpb25zKHN0YXRlKVxuICAgICAgICApO1xuXG4gICAgICAgIHRoaXMubWFuYWdlci51cGRhdGVTdGF0ZSgoY3VycmVudCkgPT4gKHtcbiAgICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICAgIGNhcmdvczogaXRlbXMsXG4gICAgICAgICAgdmFsaWRhdGlvbixcbiAgICAgICAgfSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgY2FzZSBcIkVORF9EUkFHXCI6IHtcbiAgICAgICAgdGhpcy5kcmFnRW5naW5lLmVuZERyYWcoKTtcbiAgICAgICAgY29uc3Qgc3RhdGVBZnRlckRyYWcgPSB0aGlzLm1hbmFnZXIuZ2V0U3RhdGUoKTtcbiAgICAgICAgdGhpcy5tYW5hZ2VyLnVwZGF0ZVN0YXRlKChjdXJyZW50KSA9PiAoe1xuICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgYWN0aXZlSXRlbUlkOiBudWxsLFxuICAgICAgICAgIHNlbGVjdGVkSWRzOiBzdGF0ZUFmdGVyRHJhZy5zZWxlY3RlZElkcyxcbiAgICAgICAgfSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgY2FzZSBcIlJPVEFURVwiOiB7XG4gICAgICAgIGNvbnN0IG5leHRDYXJnb3MgPSBzdGF0ZS5jYXJnb3MubWFwKChpdGVtKSA9PiB7XG4gICAgICAgICAgaWYgKGl0ZW0uaWQgIT09IGFjdGlvbi5pdGVtSWQgfHwgaXRlbS5pc0xvY2tlZCkge1xuICAgICAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgbmV3Um90YXRpb24gPSByb3RhdGU5MChpdGVtLnJvdGF0aW9uKTtcblxuICAgICAgICAgIC8vIGNvbXB1dGUgcHJldmlvdXMgdmlzdWFsIHNpemUgYW5kIG5ldyB2aXN1YWwgc2l6ZSAod2l0aG91dCBjaGFuZ2luZyBtb2RlbCB3L2gpXG4gICAgICAgICAgY29uc3QgcHJldlZpcyA9IGdldFJvdGF0ZWRTaXplKHsgd2lkdGg6IGl0ZW0ud2lkdGgsIGhlaWdodDogaXRlbS5oZWlnaHQgfSwgaXRlbS5yb3RhdGlvbik7XG4gICAgICAgICAgY29uc3QgbmV4dFZpcyA9IGdldFJvdGF0ZWRTaXplKHsgd2lkdGg6IGl0ZW0ud2lkdGgsIGhlaWdodDogaXRlbS5oZWlnaHQgfSwgbmV3Um90YXRpb24pO1xuXG4gICAgICAgICAgLy8ga2VlcCBjZW50ZXIgaW52YXJpYW50IGJhc2VkIG9uIHZpc3VhbCBzaXplc1xuICAgICAgICAgIGNvbnN0IGNlbnRlclggPSBpdGVtLnggKyBwcmV2VmlzLndpZHRoIC8gMjtcbiAgICAgICAgICBjb25zdCBjZW50ZXJZID0gaXRlbS55ICsgcHJldlZpcy5oZWlnaHQgLyAyO1xuXG4gICAgICAgICAgY29uc3QgbmV3WCA9IGNlbnRlclggLSBuZXh0VmlzLndpZHRoIC8gMjtcbiAgICAgICAgICBjb25zdCBuZXdZID0gY2VudGVyWSAtIG5leHRWaXMuaGVpZ2h0IC8gMjtcblxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAuLi5pdGVtLFxuICAgICAgICAgICAgcm90YXRpb246IG5ld1JvdGF0aW9uLFxuICAgICAgICAgICAgLy8ga2VlcCBtb2RlbCB3aWR0aC9oZWlnaHQgdW5jaGFuZ2VkOyByZW5kZXJlciB1c2VzIGdldFJvdGF0ZWRTaXplXG4gICAgICAgICAgICB4OiBNYXRoLm1heCgwLCBNYXRoLm1pbihuZXdYLCB0aGlzLmNhbnZhc1dpZHRoIC0gbmV4dFZpcy53aWR0aCkpLFxuICAgICAgICAgICAgeTogTWF0aC5tYXgoMCwgTWF0aC5taW4obmV3WSwgdGhpcy5jYW52YXNIZWlnaHQgLSBuZXh0VmlzLmhlaWdodCkpLFxuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuZHJhZ0VuZ2luZS51cGRhdGVJdGVtcyhuZXh0Q2FyZ29zKTtcbiAgICAgICAgY29uc3QgdmFsaWRhdGlvbiA9IHRoaXMudmFsaWRhdGlvbkVuZ2luZS52YWxpZGF0ZUl0ZW1zKFxuICAgICAgICAgIG5leHRDYXJnb3MsXG4gICAgICAgICAgeyB4OiAwLCB5OiAwLCB3aWR0aDogdGhpcy5jYW52YXNXaWR0aCwgaGVpZ2h0OiB0aGlzLmNhbnZhc0hlaWdodCB9LFxuICAgICAgICAgIGJ1aWxkVmFsaWRhdGlvbk9wdGlvbnMoc3RhdGUpXG4gICAgICAgICk7XG5cbiAgICAgICAgdGhpcy5tYW5hZ2VyLnVwZGF0ZVN0YXRlKChjdXJyZW50KSA9PiAoe1xuICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgY2FyZ29zOiBuZXh0Q2FyZ29zLFxuICAgICAgICAgIHZhbGlkYXRpb24sXG4gICAgICAgIH0pKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgXCJBRERfSVRFTVwiOiB7XG4gICAgICAgIGNvbnN0IG5ld0l0ZW0gPSB7IC4uLmFjdGlvbi5pdGVtIH07XG4gICAgICAgIHRoaXMubWFuYWdlci51cGRhdGVTdGF0ZSgoY3VycmVudCkgPT4gKHtcbiAgICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICAgIGNhcmdvczogWy4uLmN1cnJlbnQuY2FyZ29zLCBuZXdJdGVtXSxcbiAgICAgICAgfSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgY2FzZSBcIlNFVF9JVEVNU1wiOiB7XG4gICAgICAgIHRoaXMuZHJhZ0VuZ2luZS51cGRhdGVJdGVtcyhhY3Rpb24uaXRlbXMpO1xuICAgICAgICBjb25zdCB2YWxpZGF0aW9uID0gdGhpcy52YWxpZGF0aW9uRW5naW5lLnZhbGlkYXRlSXRlbXMoXG4gICAgICAgICAgYWN0aW9uLml0ZW1zLFxuICAgICAgICAgIHsgeDogMCwgeTogMCwgd2lkdGg6IHRoaXMuY2FudmFzV2lkdGgsIGhlaWdodDogdGhpcy5jYW52YXNIZWlnaHQgfSxcbiAgICAgICAgICBidWlsZFZhbGlkYXRpb25PcHRpb25zKHN0YXRlKVxuICAgICAgICApO1xuICAgICAgICB0aGlzLm1hbmFnZXIudXBkYXRlU3RhdGUoKGN1cnJlbnQpID0+ICh7XG4gICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICBjYXJnb3M6IGFjdGlvbi5pdGVtcyxcbiAgICAgICAgICB2YWxpZGF0aW9uLFxuICAgICAgICB9KSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBjYXNlIFwiVU5ET1wiOiB7XG4gICAgICAgIHRoaXMubWFuYWdlci51bmRvKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBjYXNlIFwiUkVET1wiOiB7XG4gICAgICAgIHRoaXMubWFuYWdlci5yZWRvKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cbn1cbiIsImltcG9ydCB7IHVzZUVmZmVjdCwgdXNlU3RhdGUgfSBmcm9tIFwicmVhY3RcIjtcbmltcG9ydCB0eXBlIHsgQ2FudmFzU3RhdGVNYW5hZ2VyIH0gZnJvbSBcIi4uL3N0YXRlL0NhbnZhc1N0YXRlTWFuYWdlclwiO1xuaW1wb3J0IHR5cGUgeyBDYW52YXNTdGF0ZSB9IGZyb20gXCIuLi9zdGF0ZS9DYW52YXNTdGF0ZVwiO1xuXG5leHBvcnQgY29uc3QgdXNlQ2FudmFzU3RhdGUgPSAobWFuYWdlcjogQ2FudmFzU3RhdGVNYW5hZ2VyKTogQ2FudmFzU3RhdGUgPT4ge1xuICAgIC8vIFVzZSBhIGxhenkgaW5pdGlhbGl6ZXIgdGhhdCBjYWxscyBtYW5hZ2VyLmdldFN0YXRlKCkgd2l0aCBjb3JyZWN0IGB0aGlzYCBiaW5kaW5nXG4gICAgY29uc3QgW3N0YXRlLCBzZXRTdGF0ZV0gPSB1c2VTdGF0ZTxDYW52YXNTdGF0ZT4oKCkgPT4gbWFuYWdlci5nZXRTdGF0ZSgpKTtcblxuICAgIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgICAgIGNvbnN0IHVuc3Vic2NyaWJlID0gbWFuYWdlci5zdWJzY3JpYmUoY3VycmVudFN0YXRlID0+IHtcbiAgICAgICAgICAgIHNldFN0YXRlKGN1cnJlbnRTdGF0ZSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdW5zdWJzY3JpYmU7XG4gICAgfSwgW21hbmFnZXJdKTtcblxuICAgIHJldHVybiBzdGF0ZTtcbn07XG4iLCJpbXBvcnQgeyB1c2VDYWxsYmFjayB9IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHR5cGUgeyBDYW52YXNBY3Rpb25EaXNwYXRjaGVyIH0gZnJvbSBcIi4uL3N0YXRlL0NhbnZhc0FjdGlvbkRpc3BhdGNoZXJcIjtcbmltcG9ydCB0eXBlIHsgQ2FyZ29JdGVtIH0gZnJvbSBcIi4uL3ZpZXdNb2RlbHMvQ2FyZ29JdGVtXCI7XG5pbXBvcnQgdHlwZSB7IFBvaW50IH0gZnJvbSBcIi4uL3R5cGVzL2dlb21ldHJ5XCI7XG5cbmV4cG9ydCBjb25zdCB1c2VDYW52YXNBY3Rpb25zID0gKFxuICAgIGRpc3BhdGNoZXI6IENhbnZhc0FjdGlvbkRpc3BhdGNoZXJcbik6IHtcbiAgICBzdGFydERyYWc6IChpdGVtSWQ6IHN0cmluZywgbW91c2U6IFBvaW50KSA9PiB2b2lkO1xuICAgIGRyYWdNb3ZlOiAobW91c2U6IFBvaW50KSA9PiB2b2lkO1xuICAgIGVuZERyYWc6ICgpID0+IHZvaWQ7XG4gICAgcm90YXRlSXRlbTogKGl0ZW1JZDogc3RyaW5nKSA9PiB2b2lkO1xuICAgIGFkZEl0ZW06IChpdGVtOiBDYXJnb0l0ZW0pID0+IHZvaWQ7XG4gICAgc2V0SXRlbXM6IChpdGVtczogQ2FyZ29JdGVtW10pID0+IHZvaWQ7XG4gICAgZGVzZWxlY3Q6ICgpID0+IHZvaWQ7XG59ID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgICBzdGFydERyYWc6IHVzZUNhbGxiYWNrKFxuICAgICAgICAgICAgKGl0ZW1JZDogc3RyaW5nLCBtb3VzZTogUG9pbnQpID0+IHtcbiAgICAgICAgICAgICAgICBkaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogXCJTVEFSVF9EUkFHXCIsIGFjdGl2ZUlkOiBpdGVtSWQsIG1vdXNlIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFtkaXNwYXRjaGVyXVxuICAgICAgICApLFxuICAgICAgICBkcmFnTW92ZTogdXNlQ2FsbGJhY2soXG4gICAgICAgICAgICAobW91c2U6IFBvaW50KSA9PiB7XG4gICAgICAgICAgICAgICAgZGlzcGF0Y2hlci5kaXNwYXRjaCh7IHR5cGU6IFwiRFJBR19NT1ZFXCIsIG1vdXNlIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFtkaXNwYXRjaGVyXVxuICAgICAgICApLFxuICAgICAgICBlbmREcmFnOiB1c2VDYWxsYmFjaygoKSA9PiB7XG4gICAgICAgICAgICBkaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogXCJFTkRfRFJBR1wiIH0pO1xuICAgICAgICB9LCBbZGlzcGF0Y2hlcl0pLFxuICAgICAgICByb3RhdGVJdGVtOiB1c2VDYWxsYmFjayhcbiAgICAgICAgICAgIChpdGVtSWQ6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgIGRpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBcIlJPVEFURVwiLCBpdGVtSWQgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW2Rpc3BhdGNoZXJdXG4gICAgICAgICksXG4gICAgICAgIGFkZEl0ZW06IHVzZUNhbGxiYWNrKFxuICAgICAgICAgICAgKGl0ZW06IENhcmdvSXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgIGRpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBcIkFERF9JVEVNXCIsIGl0ZW0gfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW2Rpc3BhdGNoZXJdXG4gICAgICAgICksXG4gICAgICAgIHNldEl0ZW1zOiB1c2VDYWxsYmFjayhcbiAgICAgICAgICAgIChpdGVtczogQ2FyZ29JdGVtW10pID0+IHtcbiAgICAgICAgICAgICAgICBkaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogXCJTRVRfSVRFTVNcIiwgaXRlbXMgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW2Rpc3BhdGNoZXJdXG4gICAgICAgICksXG4gICAgICAgIGRlc2VsZWN0OiB1c2VDYWxsYmFjaygoKSA9PiB7XG4gICAgICAgICAgICBkaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogXCJERVNFTEVDVFwiIH0pO1xuICAgICAgICB9LCBbZGlzcGF0Y2hlcl0pXG4gICAgfTtcbn07XG4iLCJpbXBvcnQgdHlwZSB7IFBvaW50IH0gZnJvbSBcIi4uL3R5cGVzL2dlb21ldHJ5XCI7XG5cbi8qKlxuICogQ29udmVydCBicm93c2VyIGNvb3JkaW5hdGUgdG8gY2FudmFzIGNvb3JkaW5hdGUuXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRDYW52YXNQb2ludCA9IChjYW52YXM6IEhUTUxEaXZFbGVtZW50IHwgbnVsbCwgY2xpZW50WDogbnVtYmVyLCBjbGllbnRZOiBudW1iZXIpOiBQb2ludCA9PiB7XG4gICAgaWYgKCFjYW52YXMpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IDAsXG4gICAgICAgICAgICB5OiAwXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgY29uc3QgcmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHg6IGNsaWVudFggLSByZWN0LmxlZnQsXG5cbiAgICAgICAgeTogY2xpZW50WSAtIHJlY3QudG9wXG4gICAgfTtcbn07XG5cbmV4cG9ydCBjb25zdCBtZXRlclRvUGl4ZWwgPSAobWV0ZXI6IG51bWJlciwgc2NhbGU6IG51bWJlcik6IG51bWJlciA9PiB7XG4gICAgcmV0dXJuIG1ldGVyICogc2NhbGU7XG59O1xuXG5leHBvcnQgY29uc3QgcGl4ZWxUb01ldGVyID0gKHBpeGVsOiBudW1iZXIsIHNjYWxlOiBudW1iZXIpOiBudW1iZXIgPT4ge1xuICAgIHJldHVybiBwaXhlbCAvIHNjYWxlO1xufTtcbiIsImltcG9ydCB7IHVzZUVmZmVjdCwgdXNlTWVtbywgdXNlU3RhdGUsIHR5cGUgTW91c2VFdmVudCBhcyBSZWFjdE1vdXNlRXZlbnQsIHR5cGUgUmVmT2JqZWN0IH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgdHlwZSB7IENhcmdvSXRlbSB9IGZyb20gXCIuLi92aWV3TW9kZWxzL0NhcmdvSXRlbVwiO1xuaW1wb3J0IHR5cGUgeyBUcmFpbGVySXRlbSB9IGZyb20gXCIuLi92aWV3TW9kZWxzL1RyYWlsZXJJdGVtXCI7XG5pbXBvcnQgeyBEcmFnRW5naW5lIH0gZnJvbSBcIi4uL2VuZ2luZXMvRHJhZ0VuZ2luZVwiO1xuaW1wb3J0IHsgQ29sbGlzaW9uRW5naW5lIH0gZnJvbSBcIi4uL2VuZ2luZXMvQ29sbGlzaW9uRW5naW5lXCI7XG5pbXBvcnQgeyBTbmFwRW5naW5lIH0gZnJvbSBcIi4uL2VuZ2luZXMvU25hcEVuZ2luZVwiO1xuaW1wb3J0IHsgVmFsaWRhdGlvbkVuZ2luZSB9IGZyb20gXCIuLi9lbmdpbmVzL1ZhbGlkYXRpb25FbmdpbmVcIjtcbmltcG9ydCB7IHVzZU1vdXNlRXZlbnRzIH0gZnJvbSBcIi4vdXNlTW91c2VFdmVudHNcIjtcbmltcG9ydCB7IENhbnZhc1N0YXRlTWFuYWdlciB9IGZyb20gXCIuLi9zdGF0ZS9DYW52YXNTdGF0ZU1hbmFnZXJcIjtcbmltcG9ydCB7IENhbnZhc0FjdGlvbkRpc3BhdGNoZXIgfSBmcm9tIFwiLi4vc3RhdGUvQ2FudmFzQWN0aW9uRGlzcGF0Y2hlclwiO1xuaW1wb3J0IHsgdXNlQ2FudmFzU3RhdGUgfSBmcm9tIFwiLi91c2VDYW52YXNTdGF0ZVwiO1xuaW1wb3J0IHsgdXNlQ2FudmFzQWN0aW9ucyB9IGZyb20gXCIuL3VzZUNhbnZhc0FjdGlvbnNcIjtcbmltcG9ydCB7IGdldENhbnZhc1BvaW50IH0gZnJvbSBcIi4uL2RvbWFpbi9jb29yZGluYXRlUnVsZXNcIjtcbmltcG9ydCB0eXBlIHsgQ2FudmFzU3RhdGUgfSBmcm9tIFwiLi4vc3RhdGUvQ2FudmFzU3RhdGVcIjtcblxuaW50ZXJmYWNlIFVzZVRyYWlsZXJDYW52YXNQcm9wcyB7XG4gIGluaXRpYWxJdGVtczogQ2FyZ29JdGVtW107XG4gIGNhbnZhc1dpZHRoOiBudW1iZXI7XG4gIGNhbnZhc0hlaWdodDogbnVtYmVyO1xuICBjYW52YXNSZWY6IFJlZk9iamVjdDxIVE1MRGl2RWxlbWVudCB8IG51bGw+O1xuICBzY2FsZT86IG51bWJlcjtcbiAgdHJhaWxlcj86IFRyYWlsZXJJdGVtIHwgbnVsbDtcbn1cblxuaW50ZXJmYWNlIFVzZVRyYWlsZXJDYW52YXNSZXN1bHQge1xuICBpdGVtczogQ2FyZ29JdGVtW107XG4gIGFjdGl2ZUl0ZW1JZDogc3RyaW5nIHwgbnVsbDtcbiAgc2VsZWN0ZWRJZHM6IHN0cmluZ1tdO1xuICB2YWxpZGF0aW9uOiB7IHZhbGlkOiBib29sZWFuOyBlcnJvcnM6IHN0cmluZ1tdOyBpdGVtRXJyb3JzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nW10+IH07XG4gIGhhbmRsZU1vdXNlRG93bjogKGU6IFJlYWN0TW91c2VFdmVudCwgaXRlbUlkOiBzdHJpbmcpID0+IHZvaWQ7XG4gIGhhbmRsZUNhbnZhc01vdXNlRG93bjogKGU6IFJlYWN0TW91c2VFdmVudDxIVE1MRGl2RWxlbWVudD4pID0+IHZvaWQ7XG4gIGhhbmRsZVJvdGF0ZTogKGl0ZW1JZDogc3RyaW5nKSA9PiB2b2lkO1xuICBhZGRJdGVtOiAoaXRlbTogQ2FyZ29JdGVtKSA9PiB2b2lkO1xuICBzZXRJdGVtczogKGl0ZW1zOiBDYXJnb0l0ZW1bXSkgPT4gdm9pZDtcbn1cblxuY29uc3QgY3JlYXRlSW5pdGlhbENhbnZhc1N0YXRlID0gKFxuICBpbml0aWFsSXRlbXM6IENhcmdvSXRlbVtdLFxuICBzY2FsZTogbnVtYmVyLFxuICB0cmFpbGVyOiBUcmFpbGVySXRlbSB8IG51bGxcbik6IENhbnZhc1N0YXRlID0+ICh7XG4gIHRyYWlsZXIsXG4gIGNhcmdvczogaW5pdGlhbEl0ZW1zLFxuICBzZWxlY3RlZElkczogW10sXG4gIGFjdGl2ZUl0ZW1JZDogbnVsbCxcbiAgdmFsaWRhdGlvbjoge1xuICAgIHZhbGlkOiB0cnVlLFxuICAgIGVycm9yczogW10sXG4gIH0sXG4gIHNjYWxlLFxufSk7XG5cbmV4cG9ydCBjb25zdCB1c2VUcmFpbGVyQ2FudmFzID0gKHtcbiAgaW5pdGlhbEl0ZW1zLFxuICBjYW52YXNXaWR0aCxcbiAgY2FudmFzSGVpZ2h0LFxuICBjYW52YXNSZWYsXG4gIHNjYWxlID0gMSxcbiAgdHJhaWxlciA9IG51bGwsXG59OiBVc2VUcmFpbGVyQ2FudmFzUHJvcHMpOiBVc2VUcmFpbGVyQ2FudmFzUmVzdWx0ID0+IHtcbiAgY29uc3QgY29sbGlzaW9uRW5naW5lID0gdXNlTWVtbygoKSA9PiBuZXcgQ29sbGlzaW9uRW5naW5lKCksIFtdKTtcbiAgY29uc3Qgc25hcEVuZ2luZSA9IHVzZU1lbW8oKCkgPT4gbmV3IFNuYXBFbmdpbmUoKSwgW10pO1xuICBjb25zdCBkcmFnRW5naW5lID0gdXNlTWVtbyhcbiAgICAoKSA9PiBuZXcgRHJhZ0VuZ2luZTxDYXJnb0l0ZW0+KGluaXRpYWxJdGVtcywgY29sbGlzaW9uRW5naW5lLCBzbmFwRW5naW5lKSxcbiAgICBbaW5pdGlhbEl0ZW1zLCBjb2xsaXNpb25FbmdpbmUsIHNuYXBFbmdpbmVdXG4gICk7XG4gIGNvbnN0IHZhbGlkYXRpb25FbmdpbmUgPSB1c2VNZW1vKCgpID0+IG5ldyBWYWxpZGF0aW9uRW5naW5lKCksIFtdKTtcbiAgY29uc3Qgc3RhdGVNYW5hZ2VyID0gdXNlTWVtbyhcbiAgICAoKSA9PiBuZXcgQ2FudmFzU3RhdGVNYW5hZ2VyKGNyZWF0ZUluaXRpYWxDYW52YXNTdGF0ZShpbml0aWFsSXRlbXMsIHNjYWxlLCB0cmFpbGVyKSksXG4gICAgW2luaXRpYWxJdGVtcywgc2NhbGUsIHRyYWlsZXJdXG4gICk7XG4gIGNvbnN0IGFjdGlvbkRpc3BhdGNoZXIgPSB1c2VNZW1vKFxuICAgICgpID0+XG4gICAgICBuZXcgQ2FudmFzQWN0aW9uRGlzcGF0Y2hlcihzdGF0ZU1hbmFnZXIsIHtcbiAgICAgICAgY2FudmFzV2lkdGgsXG4gICAgICAgIGNhbnZhc0hlaWdodCxcbiAgICAgICAgZHJhZ0VuZ2luZSxcbiAgICAgICAgdmFsaWRhdGlvbkVuZ2luZSxcbiAgICAgIH0pLFxuICAgIFtjYW52YXNXaWR0aCwgY2FudmFzSGVpZ2h0LCBzdGF0ZU1hbmFnZXIsIGRyYWdFbmdpbmUsIHZhbGlkYXRpb25FbmdpbmVdXG4gICk7XG5cbiAgY29uc3Qgc3RhdGUgPSB1c2VDYW52YXNTdGF0ZShzdGF0ZU1hbmFnZXIpO1xuICBjb25zdCBhY3Rpb25zID0gdXNlQ2FudmFzQWN0aW9ucyhhY3Rpb25EaXNwYXRjaGVyKTtcblxuICBjb25zdCBbZHJhZ2dpbmcsIHNldERyYWdnaW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcblxuICBjb25zdCBoYW5kbGVNb3VzZURvd24gPSAoZTogUmVhY3RNb3VzZUV2ZW50LCBpdGVtSWQ6IHN0cmluZyk6IHZvaWQgPT4ge1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgY29uc3QgcG9pbnQgPSBnZXRDYW52YXNQb2ludChjYW52YXNSZWYuY3VycmVudCwgZS5jbGllbnRYLCBlLmNsaWVudFkpO1xuICAgIGFjdGlvbnMuc3RhcnREcmFnKGl0ZW1JZCwgcG9pbnQpO1xuICAgIHNldERyYWdnaW5nKHRydWUpO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZUNhbnZhc01vdXNlRG93biA9IChfZTogUmVhY3RNb3VzZUV2ZW50PEhUTUxEaXZFbGVtZW50Pik6IHZvaWQgPT4ge1xuICAgIGFjdGlvbnMuZGVzZWxlY3QoKTtcbiAgfTtcblxuICBjb25zdCBkcmFnTW92ZSA9IChlOiBNb3VzZUV2ZW50KTogdm9pZCA9PiB7XG4gICAgY29uc3QgcG9pbnQgPSBnZXRDYW52YXNQb2ludChjYW52YXNSZWYuY3VycmVudCwgZS5jbGllbnRYLCBlLmNsaWVudFkpO1xuICAgIGFjdGlvbnMuZHJhZ01vdmUocG9pbnQpO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZU1vdXNlVXAgPSAoKTogdm9pZCA9PiB7XG4gICAgYWN0aW9ucy5lbmREcmFnKCk7XG4gICAgc2V0RHJhZ2dpbmcoZmFsc2UpO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZUNhbmNlbCA9ICgpOiB2b2lkID0+IHtcbiAgICBhY3Rpb25zLmVuZERyYWcoKTtcbiAgICBzZXREcmFnZ2luZyhmYWxzZSk7XG4gIH07XG5cbiAgdXNlTW91c2VFdmVudHMoe1xuICAgIGRyYWdnaW5nLFxuICAgIG1vdmVJdGVtczogZHJhZ01vdmUsXG4gICAgaGFuZGxlTW91c2VVcCxcbiAgICBoYW5kbGVDYW5jZWwsXG4gIH0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgZHJhZ0VuZ2luZS51cGRhdGVJdGVtcyhzdGF0ZS5jYXJnb3MpO1xuICB9LCBbc3RhdGUuY2FyZ29zLCBkcmFnRW5naW5lXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoc3RhdGVNYW5hZ2VyLmdldFN0YXRlKCkuY2FyZ29zLmxlbmd0aCAhPT0gaW5pdGlhbEl0ZW1zLmxlbmd0aCkge1xuICAgICAgc3RhdGVNYW5hZ2VyLnNldFN0YXRlKGNyZWF0ZUluaXRpYWxDYW52YXNTdGF0ZShpbml0aWFsSXRlbXMsIHNjYWxlLCB0cmFpbGVyKSk7XG4gICAgfVxuICB9LCBbaW5pdGlhbEl0ZW1zLCBzdGF0ZU1hbmFnZXIsIHNjYWxlLCB0cmFpbGVyXSk7XG5cbiAgcmV0dXJuIHtcbiAgICBpdGVtczogc3RhdGUuY2FyZ29zLFxuICAgIGFjdGl2ZUl0ZW1JZDogc3RhdGUuYWN0aXZlSXRlbUlkLFxuICAgIHNlbGVjdGVkSWRzOiBzdGF0ZS5zZWxlY3RlZElkcyxcbiAgICB2YWxpZGF0aW9uOiBzdGF0ZS52YWxpZGF0aW9uLFxuICAgIGhhbmRsZU1vdXNlRG93bixcbiAgICBoYW5kbGVDYW52YXNNb3VzZURvd24sXG4gICAgaGFuZGxlUm90YXRlOiBhY3Rpb25zLnJvdGF0ZUl0ZW0sXG4gICAgYWRkSXRlbTogYWN0aW9ucy5hZGRJdGVtLFxuICAgIHNldEl0ZW1zOiBhY3Rpb25zLnNldEl0ZW1zLFxuICB9O1xufTtcbiIsIi8vIHRoZW1lIHVpLCBjYW52YXMgY29sb3JzXG5cbmV4cG9ydCBjb25zdCBDQU5WQVNfQkFDS0dST1VORF9DT0xPUiA9IFwiI2ZhZmFmYVwiO1xuIiwiaW1wb3J0IHsgdXNlRWZmZWN0LCB1c2VSZWYsIHVzZVN0YXRlLCB0eXBlIERyYWdFdmVudCwgdHlwZSBSZWFjdEVsZW1lbnQsIHR5cGUgUmVmT2JqZWN0IH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgeyBDYXJnb0NhcmQgfSBmcm9tIFwiLi4vY29tcG9uZW50cy9DYXJnb0NhcmRcIjtcbmltcG9ydCB7IFBhbGxldExpc3QgfSBmcm9tIFwiLi4vY29tcG9uZW50cy9QYWxsZXRMaXN0XCI7XG5pbXBvcnQgeyBHcmlkT3ZlcmxheSB9IGZyb20gXCIuLi9jb21wb25lbnRzL0dyaWRPdmVybGF5XCI7XG5pbXBvcnQgeyB1c2VUcmFpbGVyQ2FudmFzIH0gZnJvbSBcIi4uL2hvb2tzL3VzZVRyYWlsZXJDYW52YXNcIjtcbmltcG9ydCB7XG4gICAgREVGQVVMVF9DQU5WQVNfV0lEVEgsXG4gICAgREVGQVVMVF9DQU5WQVNfSEVJR0hULFxuICAgIENBTlZBU19CT1JERVIsXG4gICAgREVGQVVMVF9NQVJHSU4sXG4gICAgSU5GT19QQU5FTF9UT1AsXG4gICAgSU5GT19QQU5FTF9MRUZULFxuICAgIElORk9fUEFORUxfWl9JTkRFWCxcbiAgICBJTkZPX1BBTkVMX1BBRERJTkcsXG4gICAgSU5GT19QQU5FTF9CQUNLR1JPVU5ELFxuICAgIElORk9fUEFORUxfQk9SREVSLFxuICAgIEdSSURfU0laRVxufSBmcm9tIFwiLi4vY29uc3RhbnRzL2NhbnZhc1wiO1xuaW1wb3J0IHsgQ0FOVkFTX0JBQ0tHUk9VTkRfQ09MT1IgfSBmcm9tIFwiLi4vY29uc3RhbnRzL3RoZW1lXCI7XG5pbXBvcnQgdHlwZSB7IENhcmdvSXRlbSB9IGZyb20gXCIuLi92aWV3TW9kZWxzL0NhcmdvSXRlbVwiO1xuaW1wb3J0IHR5cGUgeyBMb2FkaW5nQ2FudmFzV2lkZ2V0UHJvcHMgfSBmcm9tIFwiLi9Mb2FkaW5nQ2FudmFzLnByb3BlcnRpZXNcIjtcblxuLyoqXG4gKiBMb2FkaW5nQ2FudmFzIOKAlCB0aGUgTWVuZGl4IFBsdWdnYWJsZSBXaWRnZXQgZW50cnkgcG9pbnQuXG4gKlxuICogVGhpcyBjb21wb25lbnQgcmVjZWl2ZXMgdmlldyBtb2RlbHMgZnJvbSB0aGUgTG9hZGluZ0NhbnZhc0NvbnRhaW5lclxuICogKHdoaWNoIHJlc29sdmVzIE1lbmRpeCBvYmplY3QgcmVmZXJlbmNlcyB2aWEgbXguZGF0YSkgYW5kIHJlbmRlcnMgdGhlXG4gKiBpbnRlcmFjdGl2ZSBwYWNraW5nIGNhbnZhcy5cbiAqXG4gKiBLZXkgcmVzcG9uc2liaWxpdGllczpcbiAqIC0gUmVuZGVyIHRoZSBjYW52YXMgd2l0aCB0cmFpbGVyIGJvdW5kYXJ5LCBjYXJnbyBpdGVtcywgYW5kIGluZm8gcGFuZWxcbiAqIC0gTWFuYWdlIGRyYWctYW5kLWRyb3AgZnJvbSB0aGUgcGFsbGV0IGxpc3Qgb250byB0aGUgY2FudmFzXG4gKiAtIEhhbmRsZSByb3RhdGlvbiwgZ3JpZCBzbmFwcGluZywgYW5kIHJlYWwtdGltZSB2YWxpZGF0aW9uXG4gKiAtIERpc3BsYXkgdmFsaWRhdGlvbiBzdGF0dXMgKGNvbG9ycywgZXJyb3JzKVxuICogLSBFeHBvc2Ugc2F2ZS9sb2FkIGNhbGxiYWNrcyB0byB0aGUgY29udGFpbmVyXG4gKi9cbmV4cG9ydCBjb25zdCBMb2FkaW5nQ2FudmFzID0gKHByb3BzOiBMb2FkaW5nQ2FudmFzV2lkZ2V0UHJvcHMpOiBSZWFjdEVsZW1lbnQgPT4ge1xuICAgIGNvbnN0IHsgdmlld01vZGVsLCBpc0xvYWRpbmcgfSA9IHByb3BzO1xuICAgIGNvbnN0IHtcbiAgICAgICAgdHJhaWxlcixcbiAgICAgICAgcGFsbGV0TGlzdCxcbiAgICAgICAgaW5pdGlhbENhbnZhc0l0ZW1zLFxuICAgICAgICBzY2FsZSxcbiAgICAgICAgY2FudmFzV2lkdGggPSBERUZBVUxUX0NBTlZBU19XSURUSCxcbiAgICAgICAgY2FudmFzSGVpZ2h0ID0gREVGQVVMVF9DQU5WQVNfSEVJR0hULFxuICAgICAgICBvblNhdmVQbGFuLFxuICAgICAgICBvbkxvYWRQbGFuXG4gICAgfSA9IHZpZXdNb2RlbDtcblxuICAgIGNvbnN0IGNhbnZhc1JlZiA9IHVzZVJlZjxIVE1MRGl2RWxlbWVudCB8IG51bGw+KG51bGwpO1xuXG4gICAgLy8gLS0tIENhbnZhcyBzdGF0ZSBmcm9tIHRoZSBob29rIC0tLVxuICAgIGNvbnN0IHtcbiAgICAgICAgaXRlbXMsXG4gICAgICAgIGFjdGl2ZUl0ZW1JZCxcbiAgICAgICAgc2VsZWN0ZWRJZHMsXG4gICAgICAgIHZhbGlkYXRpb24sXG4gICAgICAgIGhhbmRsZU1vdXNlRG93bixcbiAgICAgICAgaGFuZGxlQ2FudmFzTW91c2VEb3duLFxuICAgICAgICBoYW5kbGVSb3RhdGUsXG4gICAgICAgIGFkZEl0ZW0sXG4gICAgICAgIHNldEl0ZW1zXG4gICAgfSA9IHVzZVRyYWlsZXJDYW52YXMoe1xuICAgICAgICBpbml0aWFsSXRlbXM6IGluaXRpYWxDYW52YXNJdGVtcyxcbiAgICAgICAgY2FudmFzV2lkdGgsXG4gICAgICAgIGNhbnZhc0hlaWdodCxcbiAgICAgICAgY2FudmFzUmVmOiBjYW52YXNSZWYgYXMgUmVmT2JqZWN0PEhUTUxEaXZFbGVtZW50IHwgbnVsbD4sXG4gICAgICAgIHNjYWxlLFxuICAgICAgICB0cmFpbGVyXG4gICAgfSk7XG5cbiAgICAvLyAtLS0gVHJhY2sgd2hpY2ggcGFsbGV0cyBoYXZlIGJlZW4gYWRkZWQgdG8gdGhlIGNhbnZhcyAtLS1cbiAgICAvLyBXZSB0cmFjayBhZGRlZCBwYWxsZXQgSURzIGluIGEgU2V0LiBXaGVuIGEgcGFsbGV0IGlzIGRyYWdnZWQgb250byB0aGVcbiAgICAvLyBjYW52YXMsIGl0cyBJRCBpcyBhZGRlZCB0byB0aGUgc2V0IHNvIGl0IGRpc2FwcGVhcnMgZnJvbSB0aGUgcGFsZXR0ZS5cbiAgICBjb25zdCBbYWRkZWRQYWxsZXRJZHMsIHNldEFkZGVkUGFsbGV0SWRzXSA9IHVzZVN0YXRlPFNldDxzdHJpbmc+PihuZXcgU2V0KCkpO1xuXG4gICAgLy8gQXZhaWxhYmxlIHBhbGxldHMgPSBwYWxsZXRMaXN0IG1pbnVzIHRob3NlIGFscmVhZHkgYWRkZWQgdG8gY2FudmFzXG4gICAgY29uc3QgYXZhaWxhYmxlUGFsbGV0cyA9IHBhbGxldExpc3QuZmlsdGVyKHAgPT4gIWFkZGVkUGFsbGV0SWRzLmhhcyhwLmlkKSk7XG5cbiAgICAvLyAtLS0gUmVzdG9yZSBpdGVtcyB3aGVuIGxvYWRlZCBmcm9tIHBsYW4gLS0tXG4gICAgLy8gVGhlIHVzZVRyYWlsZXJDYW52YXMgaG9vayBhbHJlYWR5IGhhbmRsZXMgaW5pdGlhbEl0ZW1zIGNoYW5nZXMgdmlhIGl0c1xuICAgIC8vIG93biB1c2VFZmZlY3QsIGJ1dCB3ZSBhbHNvIHNldCBpdGVtcyBkaXJlY3RseSB3aGVuIGEgcGxhbiBpcyBsb2FkZWRcbiAgICAvLyBhZnRlciB0aGUgaW5pdGlhbCByZW5kZXIgdG8gZW5zdXJlIHRoZSBjYW52YXMgcmVmbGVjdHMgdGhlIHNhdmVkIHN0YXRlLlxuICAgIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgICAgIGlmIChpbml0aWFsQ2FudmFzSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgc2V0SXRlbXMoaW5pdGlhbENhbnZhc0l0ZW1zKTtcbiAgICAgICAgfVxuICAgIH0sIFtpbml0aWFsQ2FudmFzSXRlbXMsIHNldEl0ZW1zXSk7XG5cbiAgICAvLyAtLS0gU2F2ZSBwbGFuIGhhbmRsZXIgLS0tXG4gICAgY29uc3QgaGFuZGxlU2F2ZVBsYW4gPSAoKTogdm9pZCA9PiB7XG4gICAgICAgIG9uU2F2ZVBsYW4oaXRlbXMsIHNjYWxlKTtcbiAgICB9O1xuXG4gICAgLy8gLS0tIExvYWQgcGxhbiBoYW5kbGVyIC0tLVxuICAgIGNvbnN0IGhhbmRsZUxvYWRQbGFuID0gKCk6IHZvaWQgPT4ge1xuICAgICAgICBvbkxvYWRQbGFuKCk7XG4gICAgfTtcblxuICAgIC8vIC0tLSBEcmFnLWFuZC1kcm9wIGZyb20gcGFsbGV0IGxpc3QgdG8gY2FudmFzIC0tLVxuICAgIGNvbnN0IGhhbmRsZVBhbGxldERyb3AgPSAoZTogRHJhZ0V2ZW50PEhUTUxEaXZFbGVtZW50Pik6IHZvaWQgPT4ge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0IHBhbGxldElkID0gZS5kYXRhVHJhbnNmZXIuZ2V0RGF0YShcInRleHQvcGxhaW5cIik7XG4gICAgICAgIGNvbnN0IHBhbGxldCA9IGF2YWlsYWJsZVBhbGxldHMuZmluZChwID0+IHAuaWQgPT09IHBhbGxldElkKTtcbiAgICAgICAgaWYgKCFwYWxsZXQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBkcm9wIHBvc2l0aW9uIHJlbGF0aXZlIHRvIGNhbnZhc1xuICAgICAgICBjb25zdCBjYW52YXMgPSBjYW52YXNSZWYuY3VycmVudDtcbiAgICAgICAgaWYgKCFjYW52YXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIGNvbnN0IHggPSBlLmNsaWVudFggLSByZWN0LmxlZnQ7XG4gICAgICAgIGNvbnN0IHkgPSBlLmNsaWVudFkgLSByZWN0LnRvcDtcblxuICAgICAgICAvLyBBZGQgdGhlIHBhbGxldCB0byB0aGUgY2FudmFzIGF0IHRoZSBkcm9wIHBvc2l0aW9uXG4gICAgICAgIGNvbnN0IG5ld0l0ZW0gPSB7IC4uLnBhbGxldCwgeCwgeSB9O1xuICAgICAgICBhZGRJdGVtKG5ld0l0ZW0pO1xuXG4gICAgICAgIC8vIE1hcmsgYXMgYWRkZWQgc28gaXQgZGlzYXBwZWFycyBmcm9tIHRoZSBwYWxsZXQgbGlzdFxuICAgICAgICBzZXRBZGRlZFBhbGxldElkcyhwcmV2ID0+IG5ldyBTZXQoWy4uLnByZXYsIHBhbGxldElkXSkpO1xuICAgIH07XG5cbiAgICBjb25zdCBoYW5kbGVQYWxsZXREcmFnT3ZlciA9IChlOiBEcmFnRXZlbnQ8SFRNTERpdkVsZW1lbnQ+KTogdm9pZCA9PiB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9O1xuXG4gICAgLy8gLS0tIEdldCBpdGVtLXNwZWNpZmljIGVycm9ycyBmb3Igc3RhdHVzIGRpc3BsYXkgLS0tXG4gICAgY29uc3QgZ2V0SXRlbUVycm9ycyA9IChpdGVtSWQ6IHN0cmluZyk6IHN0cmluZ1tdID0+IHtcbiAgICAgICAgcmV0dXJuIHZhbGlkYXRpb24/Lml0ZW1FcnJvcnM/LltpdGVtSWRdID8/IFtdO1xuICAgIH07XG5cbiAgICAvLyAtLS0gTG9hZGluZyBzdGF0ZSAtLS1cbiAgICBpZiAoaXNMb2FkaW5nKSB7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgc3R5bGU9e3tcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IFwicmVsYXRpdmVcIixcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGNhbnZhc1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IGNhbnZhc0hlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgbWFyZ2luOiBERUZBVUxUX01BUkdJTixcbiAgICAgICAgICAgICAgICAgICAgb3ZlcmZsb3c6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcjogQ0FOVkFTX0JPUkRFUixcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBDQU5WQVNfQkFDS0dST1VORF9DT0xPUixcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheTogXCJmbGV4XCIsXG4gICAgICAgICAgICAgICAgICAgIGFsaWduSXRlbXM6IFwiY2VudGVyXCIsXG4gICAgICAgICAgICAgICAgICAgIGp1c3RpZnlDb250ZW50OiBcImNlbnRlclwiLFxuICAgICAgICAgICAgICAgICAgICBmb250U2l6ZTogMTYsXG4gICAgICAgICAgICAgICAgICAgIGNvbG9yOiBcIiM2NjZcIlxuICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgTG9hZGluZyBwYWNraW5nIHBsYW4uLi5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICApO1xuICAgIH1cblxuICAgIC8vIC0tLSBSZW5kZXIgLS0tXG4gICAgcmV0dXJuIChcbiAgICAgICAgPGRpdlxuICAgICAgICAgICAgcmVmPXtjYW52YXNSZWZ9XG4gICAgICAgICAgICBvbk1vdXNlRG93bj17aGFuZGxlQ2FudmFzTW91c2VEb3dufVxuICAgICAgICAgICAgb25Ecm9wPXtoYW5kbGVQYWxsZXREcm9wfVxuICAgICAgICAgICAgb25EcmFnT3Zlcj17aGFuZGxlUGFsbGV0RHJhZ092ZXJ9XG4gICAgICAgICAgICBzdHlsZT17e1xuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBcInJlbGF0aXZlXCIsXG4gICAgICAgICAgICAgICAgd2lkdGg6IGNhbnZhc1dpZHRoLFxuICAgICAgICAgICAgICAgIGhlaWdodDogY2FudmFzSGVpZ2h0LFxuICAgICAgICAgICAgICAgIG1hcmdpbjogREVGQVVMVF9NQVJHSU4sXG4gICAgICAgICAgICAgICAgb3ZlcmZsb3c6IFwiaGlkZGVuXCIsXG4gICAgICAgICAgICAgICAgYm9yZGVyOiBDQU5WQVNfQk9SREVSLFxuICAgICAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogQ0FOVkFTX0JBQ0tHUk9VTkRfQ09MT1JcbiAgICAgICAgICAgIH19XG4gICAgICAgID5cbiAgICAgICAgICAgIHsvKiBHcmlkIG92ZXJsYXkgKi99XG4gICAgICAgICAgICA8R3JpZE92ZXJsYXkgd2lkdGg9e2NhbnZhc1dpZHRofSBoZWlnaHQ9e2NhbnZhc0hlaWdodH0gZ3JpZFNpemU9e0dSSURfU0laRX0gLz5cblxuICAgICAgICAgICAgey8qIFRyYWlsZXIgYm91bmRhcnkgKi99XG4gICAgICAgICAgICB7dHJhaWxlciAmJiAoXG4gICAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgICAgICBzdHlsZT17e1xuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQ6IHRyYWlsZXIueCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvcDogdHJhaWxlci55LFxuICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHRyYWlsZXIud2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHRyYWlsZXIuaGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgYm9yZGVyOiBcIjJweCBkYXNoZWQgIzg4OFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgYm94U2l6aW5nOiBcImJvcmRlci1ib3hcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50ZXJFdmVudHM6IFwibm9uZVwiXG4gICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICl9XG5cbiAgICAgICAgICAgIHsvKiBJbmZvIHBhbmVsIG92ZXJsYXkgKi99XG4gICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgc3R5bGU9e3tcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcbiAgICAgICAgICAgICAgICAgICAgdG9wOiBJTkZPX1BBTkVMX1RPUCxcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogSU5GT19QQU5FTF9MRUZULFxuICAgICAgICAgICAgICAgICAgICB6SW5kZXg6IElORk9fUEFORUxfWl9JTkRFWCxcbiAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZDogSU5GT19QQU5FTF9CQUNLR1JPVU5ELFxuICAgICAgICAgICAgICAgICAgICBwYWRkaW5nOiBJTkZPX1BBTkVMX1BBRERJTkcsXG4gICAgICAgICAgICAgICAgICAgIGJvcmRlcjogSU5GT19QQU5FTF9CT1JERVJcbiAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIDxkaXY+QWN0aXZlOiB7YWN0aXZlSXRlbUlkID8/IFwiTm9uZVwifTwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgIFZhbGlkYXRpb246e1wiIFwifVxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBzdHlsZT17eyBjb2xvcjogdmFsaWRhdGlvbj8udmFsaWQgPyBcImdyZWVuXCIgOiBcInJlZFwiLCBmb250V2VpZ2h0OiBcImJvbGRcIiB9fT5cbiAgICAgICAgICAgICAgICAgICAgICAgIHt2YWxpZGF0aW9uPy52YWxpZCA/IFwiT0tcIiA6IFwiSXNzdWVcIn1cbiAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIHt2YWxpZGF0aW9uPy5lcnJvcnMubGVuZ3RoID4gMCAmJiAoXG4gICAgICAgICAgICAgICAgICAgIDx1bCBzdHlsZT17eyBtYXJnaW46IDAsIHBhZGRpbmdMZWZ0OiAxNiB9fT5cbiAgICAgICAgICAgICAgICAgICAgICAgIHt2YWxpZGF0aW9uLmVycm9ycy5tYXAoZXJyb3IgPT4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsaSBrZXk9e2Vycm9yfSBzdHlsZT17eyBjb2xvcjogXCJyZWRcIiwgZm9udFNpemU6IDEyIH19PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7ZXJyb3J9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9saT5cbiAgICAgICAgICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICAgICAgICA8L3VsPlxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgPGRpdiBzdHlsZT17eyBtYXJnaW5Ub3A6IDggfX0+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17aGFuZGxlU2F2ZVBsYW59IHN0eWxlPXt7IG1hcmdpblJpZ2h0OiA4IH19PlxuICAgICAgICAgICAgICAgICAgICAgICAgU2F2ZSBQbGFuXG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9e2hhbmRsZUxvYWRQbGFufT5Mb2FkIFBsYW48L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICB7LyogUGFsbGV0IGxpc3QgKGRlYnVnIHZpZXcpICovfVxuICAgICAgICAgICAgPFBhbGxldExpc3RcbiAgICAgICAgICAgICAgICBwYWxsZXRzPXthdmFpbGFibGVQYWxsZXRzfVxuICAgICAgICAgICAgICAgIG9uQWRkUGFsbGV0PXsocGFsbGV0OiBDYXJnb0l0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHBhbGxldCB0byBjYW52YXMgYXQgYSBkZWZhdWx0IHBvc2l0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0l0ZW0gPSB7IC4uLnBhbGxldCwgeDogNTAsIHk6IDUwIH07XG4gICAgICAgICAgICAgICAgICAgIHNldEFkZGVkUGFsbGV0SWRzKHByZXYgPT4gbmV3IFNldChbLi4ucHJldiwgcGFsbGV0LmlkXSkpO1xuICAgICAgICAgICAgICAgICAgICBhZGRJdGVtKG5ld0l0ZW0pO1xuICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAvPlxuXG4gICAgICAgICAgICB7LyogQ2FyZ28gY2FyZHMgb24gY2FudmFzICovfVxuICAgICAgICAgICAge2l0ZW1zLm1hcChpdGVtID0+IChcbiAgICAgICAgICAgICAgICA8Q2FyZ29DYXJkXG4gICAgICAgICAgICAgICAgICAgIGtleT17aXRlbS5pZH1cbiAgICAgICAgICAgICAgICAgICAgaXRlbT17aXRlbX1cbiAgICAgICAgICAgICAgICAgICAgaXNBY3RpdmU9e2FjdGl2ZUl0ZW1JZCA9PT0gaXRlbS5pZH1cbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWRJZHM9e3NlbGVjdGVkSWRzfVxuICAgICAgICAgICAgICAgICAgICBoYXNFcnJvcj17Z2V0SXRlbUVycm9ycyhpdGVtLmlkKS5sZW5ndGggPiAwfVxuICAgICAgICAgICAgICAgICAgICBvbk1vdXNlRG93bj17ZSA9PiBoYW5kbGVNb3VzZURvd24oZSwgaXRlbS5pZCl9XG4gICAgICAgICAgICAgICAgICAgIG9uUm90YXRlPXtoYW5kbGVSb3RhdGV9XG4gICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICkpfVxuICAgICAgICA8L2Rpdj5cbiAgICApO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgTG9hZGluZ0NhbnZhcztcbiIsImltcG9ydCB0eXBlIHsgVHJhaWxlckl0ZW0gfSBmcm9tIFwiLi4vdmlld01vZGVscy9UcmFpbGVySXRlbVwiO1xuaW1wb3J0IHR5cGUgeyBUcmFpbGVyIH0gZnJvbSBcIi4uL21vZGVscy9UcmFpbGVyXCI7XG5pbXBvcnQgeyBtZXRlclRvUGl4ZWwgfSBmcm9tIFwiLi4vZG9tYWluL2Nvb3JkaW5hdGVSdWxlc1wiO1xuXG4vKipcbiAqIFNoYXBlIG9mIFRydWNrU2VsZWN0aW9uIGRhdGEgYXMgaXQgYXJyaXZlcyBmcm9tIE1lbmRpeC5cbiAqIFRydWNrU2VsZWN0aW9uIOKGkiBSZXNvdXJjZUluc3RhbmNlIOKGkiBSZXNvdXJjZSDihpIgVGVjaG5pY2FsRGV0YWlsc1xuICovXG5leHBvcnQgaW50ZXJmYWNlIFRydWNrU2VsZWN0aW9uRGF0YSB7XG4gIGlkOiBzdHJpbmc7XG4gIGNvZGU/OiBzdHJpbmc7XG4gIHRyYWlsZXJUeXBlPzogXCJEcnlWYW5cIiB8IFwiUmVlZmVyXCIgfCBcIkZsYXRiZWRcIiB8IFwiQ29udGFpbmVyXCIgfCBcIkN1cnRhaW5zaWRlclwiO1xuICBtYXhQYXlsb2FkS2c/OiBudW1iZXI7XG4gIGF4bGVDb3VudD86IG51bWJlcjtcbiAgaW50ZXJuYWxMZW5ndGhNZXRlcjogbnVtYmVyO1xuICBpbnRlcm5hbFdpZHRoTWV0ZXI6IG51bWJlcjtcbiAgaW50ZXJuYWxIZWlnaHRNZXRlcjogbnVtYmVyO1xuICBtYXhMb2FkTWV0ZXJzPzogbnVtYmVyO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSBUcnVja1NlbGVjdGlvbiAobWV0ZXJzKSB0byBhIFRyYWlsZXJJdGVtIChwaXhlbHMpIHVzaW5nIHRoZSBnaXZlbiBzY2FsZS5cbiAqXG4gKiBAcGFyYW0gdHJ1Y2sgLSBUaGUgVHJ1Y2tTZWxlY3Rpb24gZGF0YSBmcm9tIE1lbmRpeFxuICogQHBhcmFtIHNjYWxlIC0gUGl4ZWwtdG8tbWV0ZXIgc2NhbGUgZmFjdG9yXG4gKiBAcGFyYW0gcG9zaXRpb24gLSBJbml0aWFsIGNhbnZhcyBwb3NpdGlvbiAocGl4ZWxzKVxuICogQHJldHVybnMgQSBUcmFpbGVySXRlbSB2aWV3IG1vZGVsIHJlYWR5IGZvciB0aGUgY2FudmFzXG4gKi9cbmV4cG9ydCBjb25zdCB0cnVja1NlbGVjdGlvblRvVHJhaWxlckl0ZW0gPSAoXG4gIHRydWNrOiBUcnVja1NlbGVjdGlvbkRhdGEsXG4gIHNjYWxlOiBudW1iZXIsXG4gIHBvc2l0aW9uOiB7IHg6IG51bWJlcjsgeTogbnVtYmVyIH0gPSB7IHg6IDIwLCB5OiAyMCB9XG4pOiBUcmFpbGVySXRlbSA9PiB7XG4gIHJldHVybiB7XG4gICAgaWQ6IHRydWNrLmlkLFxuICAgIGNvZGU6IHRydWNrLmNvZGUgPz8gXCJUUkFJTEVSXCIsXG4gICAgdHJhaWxlclR5cGU6IHRydWNrLnRyYWlsZXJUeXBlID8/IFwiRHJ5VmFuXCIsXG4gICAgbWF4UGF5bG9hZEtnOiB0cnVjay5tYXhQYXlsb2FkS2cgPz8gMCxcbiAgICBheGxlQ291bnQ6IHRydWNrLmF4bGVDb3VudCA/PyAyLFxuICAgIG1heExvYWRNZXRlcnM6IHRydWNrLm1heExvYWRNZXRlcnMgPz8gdHJ1Y2suaW50ZXJuYWxMZW5ndGhNZXRlcixcbiAgICBpbnRlcm5hbEhlaWdodE1ldGVyOiB0cnVjay5pbnRlcm5hbEhlaWdodE1ldGVyLFxuICAgIHg6IHBvc2l0aW9uLngsXG4gICAgeTogcG9zaXRpb24ueSxcbiAgICB3aWR0aDogbWV0ZXJUb1BpeGVsKHRydWNrLmludGVybmFsTGVuZ3RoTWV0ZXIsIHNjYWxlKSxcbiAgICBoZWlnaHQ6IG1ldGVyVG9QaXhlbCh0cnVjay5pbnRlcm5hbFdpZHRoTWV0ZXIsIHNjYWxlKSxcbiAgICByb3RhdGlvbjogMCxcbiAgfTtcbn07XG5cbi8qKlxuICogQ29udmVydCBhIFRyYWlsZXIgYnVzaW5lc3MgbW9kZWwgKG1ldGVycykgdG8gYSBUcmFpbGVySXRlbSAocGl4ZWxzKSB1c2luZyB0aGUgZ2l2ZW4gc2NhbGUuXG4gKlxuICogQHBhcmFtIHRyYWlsZXIgLSBUaGUgVHJhaWxlciBidXNpbmVzcyBtb2RlbFxuICogQHBhcmFtIHNjYWxlIC0gUGl4ZWwtdG8tbWV0ZXIgc2NhbGUgZmFjdG9yXG4gKiBAcGFyYW0gcG9zaXRpb24gLSBJbml0aWFsIGNhbnZhcyBwb3NpdGlvbiAocGl4ZWxzKVxuICogQHJldHVybnMgQSBUcmFpbGVySXRlbSB2aWV3IG1vZGVsIHJlYWR5IGZvciB0aGUgY2FudmFzXG4gKi9cbmV4cG9ydCBjb25zdCB0cmFpbGVyVG9UcmFpbGVySXRlbSA9IChcbiAgdHJhaWxlcjogVHJhaWxlcixcbiAgc2NhbGU6IG51bWJlcixcbiAgcG9zaXRpb246IHsgeDogbnVtYmVyOyB5OiBudW1iZXIgfSA9IHsgeDogMjAsIHk6IDIwIH1cbik6IFRyYWlsZXJJdGVtID0+IHtcbiAgcmV0dXJuIHtcbiAgICBpZDogdHJhaWxlci5pZCxcbiAgICBjb2RlOiB0cmFpbGVyLmNvZGUsXG4gICAgdHJhaWxlclR5cGU6IHRyYWlsZXIudHJhaWxlclR5cGUsXG4gICAgbWF4UGF5bG9hZEtnOiB0cmFpbGVyLm1heFBheWxvYWRLZyxcbiAgICBheGxlQ291bnQ6IHRyYWlsZXIuYXhsZUNvdW50LFxuICAgIG1heExvYWRNZXRlcnM6IHRyYWlsZXIubWF4TG9hZE1ldGVycyA/PyB0cmFpbGVyLmludGVybmFsTGVuZ3RoTWV0ZXIsXG4gICAgaW50ZXJuYWxIZWlnaHRNZXRlcjogdHJhaWxlci5pbnRlcm5hbEhlaWdodE1ldGVyLFxuICAgIHg6IHBvc2l0aW9uLngsXG4gICAgeTogcG9zaXRpb24ueSxcbiAgICB3aWR0aDogbWV0ZXJUb1BpeGVsKHRyYWlsZXIuaW50ZXJuYWxMZW5ndGhNZXRlciwgc2NhbGUpLFxuICAgIGhlaWdodDogbWV0ZXJUb1BpeGVsKHRyYWlsZXIuaW50ZXJuYWxXaWR0aE1ldGVyLCBzY2FsZSksXG4gICAgcm90YXRpb246IDAsXG4gIH07XG59O1xuXG4vKipcbiAqIENvbXB1dGUgdGhlIG9wdGltYWwgc2NhbGUgZmFjdG9yIHNvIHRoYXQgdGhlIHRyYWlsZXIgZml0cyB3aXRoaW4gdGhlIGNhbnZhcy5cbiAqXG4gKiBAcGFyYW0gdHJ1Y2sgLSBUaGUgVHJ1Y2tTZWxlY3Rpb24gZGF0YVxuICogQHBhcmFtIGNhbnZhc1dpZHRoIC0gQ2FudmFzIHdpZHRoIGluIHBpeGVsc1xuICogQHBhcmFtIGNhbnZhc0hlaWdodCAtIENhbnZhcyBoZWlnaHQgaW4gcGl4ZWxzXG4gKiBAcGFyYW0gcGFkZGluZyAtIFBhZGRpbmcgYXJvdW5kIHRoZSB0cmFpbGVyIChwaXhlbHMpXG4gKiBAcmV0dXJucyBTY2FsZSBmYWN0b3IgKHBpeGVscyBwZXIgbWV0ZXIpXG4gKi9cbmV4cG9ydCBjb25zdCBjb21wdXRlU2NhbGUgPSAoXG4gIHRydWNrOiBUcnVja1NlbGVjdGlvbkRhdGEsXG4gIGNhbnZhc1dpZHRoOiBudW1iZXIsXG4gIGNhbnZhc0hlaWdodDogbnVtYmVyLFxuICBwYWRkaW5nOiBudW1iZXIgPSA0MFxuKTogbnVtYmVyID0+IHtcbiAgY29uc3QgbGVuZ3RoTSA9IHRydWNrLmludGVybmFsTGVuZ3RoTWV0ZXI7XG4gIGNvbnN0IHdpZHRoTSA9IHRydWNrLmludGVybmFsV2lkdGhNZXRlcjtcbiAgY29uc3QgYXZhaWxhYmxlV2lkdGggPSBjYW52YXNXaWR0aCAtIHBhZGRpbmc7XG4gIGNvbnN0IGF2YWlsYWJsZUhlaWdodCA9IGNhbnZhc0hlaWdodCAtIHBhZGRpbmc7XG4gIHJldHVybiBNYXRoLm1pbihhdmFpbGFibGVXaWR0aCAvIGxlbmd0aE0sIGF2YWlsYWJsZUhlaWdodCAvIHdpZHRoTSk7XG59O1xuIiwiaW1wb3J0IHR5cGUgeyBDYXJnb0l0ZW0gfSBmcm9tIFwiLi4vdmlld01vZGVscy9DYXJnb0l0ZW1cIjtcbmltcG9ydCB0eXBlIHsgQ2FudmFzU3RhdGUgfSBmcm9tIFwiLi4vc3RhdGUvQ2FudmFzU3RhdGVcIjtcbmltcG9ydCB7IHBpeGVsVG9NZXRlciB9IGZyb20gXCIuLi9kb21haW4vY29vcmRpbmF0ZVJ1bGVzXCI7XG5cbi8qKlxuICogU2hhcGUgb2YgYSBzYXZlZCBwYWNraW5nIHBsYW4gaXRlbSAocGVyc2lzdGVkIHRvIE1lbmRpeCkuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2luZ1BsYW5JdGVtRGF0YSB7XG4gICAgaWQ6IHN0cmluZztcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgdHlwZTogXCJwYWxsZXRcIiB8IFwiYm94XCI7XG4gICAgeDogbnVtYmVyOyAvLyBtZXRlcnNcbiAgICB5OiBudW1iZXI7IC8vIG1ldGVyc1xuICAgIHdpZHRoOiBudW1iZXI7IC8vIG1ldGVyc1xuICAgIGhlaWdodDogbnVtYmVyOyAvLyBtZXRlcnNcbiAgICByb3RhdGlvbjogbnVtYmVyO1xuICAgIGNvbG9yOiBzdHJpbmc7XG4gICAgaGVpZ2h0TT86IG51bWJlcjtcbiAgICB3ZWlnaHRLZz86IG51bWJlcjtcbn1cblxuLyoqXG4gKiBTaGFwZSBvZiBhIHNhdmVkIHBhY2tpbmcgcGxhbiAocGVyc2lzdGVkIHRvIE1lbmRpeCkuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2luZ1BsYW5EYXRhIHtcbiAgICB0cnVja0lkOiBzdHJpbmcgfCBudWxsO1xuICAgIGl0ZW1zOiBQYWNraW5nUGxhbkl0ZW1EYXRhW107XG59XG5cbi8qKlxuICogU2VyaWFsaXplIHRoZSBjdXJyZW50IGNhbnZhcyBzdGF0ZSBpbnRvIGEgcGFja2luZyBwbGFuIGZvciBwZXJzaXN0ZW5jZS5cbiAqIENvbnZlcnRzIGFsbCBwaXhlbCBjb29yZGluYXRlcyBiYWNrIHRvIG1ldGVycy5cbiAqL1xuZXhwb3J0IGNvbnN0IHNlcmlhbGl6ZVBsYW4gPSAoc3RhdGU6IENhbnZhc1N0YXRlLCBzY2FsZTogbnVtYmVyKTogUGFja2luZ1BsYW5EYXRhID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgICB0cnVja0lkOiBzdGF0ZS50cmFpbGVyPy5pZCA/PyBudWxsLFxuICAgICAgICBpdGVtczogc3RhdGUuY2FyZ29zLm1hcChpdGVtID0+ICh7XG4gICAgICAgICAgICBpZDogaXRlbS5pZCxcbiAgICAgICAgICAgIG5hbWU6IGl0ZW0ubmFtZSxcbiAgICAgICAgICAgIHR5cGU6IGl0ZW0udHlwZSxcbiAgICAgICAgICAgIHg6IHBpeGVsVG9NZXRlcihpdGVtLngsIHNjYWxlKSxcbiAgICAgICAgICAgIHk6IHBpeGVsVG9NZXRlcihpdGVtLnksIHNjYWxlKSxcbiAgICAgICAgICAgIHdpZHRoOiBwaXhlbFRvTWV0ZXIoaXRlbS53aWR0aCwgc2NhbGUpLFxuICAgICAgICAgICAgaGVpZ2h0OiBwaXhlbFRvTWV0ZXIoaXRlbS5oZWlnaHQsIHNjYWxlKSxcbiAgICAgICAgICAgIHJvdGF0aW9uOiBpdGVtLnJvdGF0aW9uLFxuICAgICAgICAgICAgY29sb3I6IGl0ZW0uY29sb3IsXG4gICAgICAgICAgICBoZWlnaHRNOiBpdGVtLmhlaWdodE0sXG4gICAgICAgICAgICB3ZWlnaHRLZzogaXRlbS53ZWlnaHRLZ1xuICAgICAgICB9KSlcbiAgICB9O1xufTtcblxuLyoqXG4gKiBEZXNlcmlhbGl6ZSBhIHBhY2tpbmcgcGxhbiBiYWNrIGludG8gQ2FyZ29JdGVtcyBmb3IgdGhlIGNhbnZhcy5cbiAqIENvbnZlcnRzIGFsbCBtZXRlciBjb29yZGluYXRlcyB0byBwaXhlbHMuXG4gKi9cbmV4cG9ydCBjb25zdCBkZXNlcmlhbGl6ZVBsYW4gPSAocGxhbjogUGFja2luZ1BsYW5EYXRhLCBzY2FsZTogbnVtYmVyKTogQ2FyZ29JdGVtW10gPT4ge1xuICAgIHJldHVybiBwbGFuLml0ZW1zLm1hcChpdGVtID0+ICh7XG4gICAgICAgIGlkOiBpdGVtLmlkLFxuICAgICAgICBuYW1lOiBpdGVtLm5hbWUsXG4gICAgICAgIHR5cGU6IGl0ZW0udHlwZSxcbiAgICAgICAgeDogaXRlbS54ICogc2NhbGUsXG4gICAgICAgIHk6IGl0ZW0ueSAqIHNjYWxlLFxuICAgICAgICB3aWR0aDogaXRlbS53aWR0aCAqIHNjYWxlLFxuICAgICAgICBoZWlnaHQ6IGl0ZW0uaGVpZ2h0ICogc2NhbGUsXG4gICAgICAgIHJvdGF0aW9uOiBpdGVtLnJvdGF0aW9uIGFzIDAgfCA5MCB8IDE4MCB8IDI3MCxcbiAgICAgICAgY29sb3I6IGl0ZW0uY29sb3IsXG4gICAgICAgIGlzTG9ja2VkOiBmYWxzZSxcbiAgICAgICAgaGVpZ2h0TTogaXRlbS5oZWlnaHRNLFxuICAgICAgICB3ZWlnaHRLZzogaXRlbS53ZWlnaHRLZ1xuICAgIH0pKTtcbn07XG4iLCJpbXBvcnQgdHlwZSB7IENhcmdvSXRlbSB9IGZyb20gXCIuLi92aWV3TW9kZWxzL0NhcmdvSXRlbVwiO1xuaW1wb3J0IHsgbWV0ZXJUb1BpeGVsIH0gZnJvbSBcIi4uL2RvbWFpbi9jb29yZGluYXRlUnVsZXNcIjtcblxuLyoqXG4gKiBTaGFwZSBvZiBhIFBhY2tpbmdVbml0IGFzIGl0IGFycml2ZXMgZnJvbSBNZW5kaXguXG4gKiBQYWNraW5nVW5pdCBoYXM6IExlbmd0aCwgV2lkdGgsIEhlaWdodCAoaW4gbWV0ZXJzKS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYWNraW5nVW5pdERhdGEge1xuICBpZDogc3RyaW5nO1xuICBuYW1lPzogc3RyaW5nO1xuICBsZW5ndGhNZXRlcjogbnVtYmVyO1xuICB3aWR0aE1ldGVyOiBudW1iZXI7XG4gIGhlaWdodE1ldGVyOiBudW1iZXI7XG4gIHBhY2tpbmdUeXBlOiBcInBhbGxldFwiIHwgXCJib3hcIjtcbiAgd2VpZ2h0S2c/OiBudW1iZXI7XG59XG5cbi8qKlxuICogU2hhcGUgb2YgYSBUcmFuc3BvcnRPcmRlciBhcyBpdCBhcnJpdmVzIGZyb20gTWVuZGl4LlxuICogVHJhbnNwb3J0T3JkZXIgKDEtKikg4oaSIFBhY2tpbmdVbml0XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHJhbnNwb3J0T3JkZXJEYXRhIHtcbiAgaWQ6IHN0cmluZztcbiAgbmFtZT86IHN0cmluZztcbiAgcGFja2luZ1VuaXQ/OiBQYWNraW5nVW5pdERhdGE7XG59XG5cbi8qKlxuICogQ29udmVydCBhIFBhY2tpbmdVbml0IChtZXRlcnMpIHRvIGEgQ2FyZ29JdGVtIChwaXhlbHMpIHVzaW5nIHRoZSBnaXZlbiBzY2FsZS5cbiAqXG4gKiBAcGFyYW0gcGFja2luZ1VuaXQgLSBUaGUgUGFja2luZ1VuaXQgZGF0YSBmcm9tIE1lbmRpeFxuICogQHBhcmFtIHNjYWxlIC0gUGl4ZWwtdG8tbWV0ZXIgc2NhbGUgZmFjdG9yXG4gKiBAcGFyYW0gcG9zaXRpb24gLSBJbml0aWFsIGNhbnZhcyBwb3NpdGlvbiAocGl4ZWxzKVxuICogQHJldHVybnMgQSBDYXJnb0l0ZW0gdmlldyBtb2RlbCByZWFkeSBmb3IgdGhlIGNhbnZhc1xuICovXG5leHBvcnQgY29uc3QgcGFja2luZ1VuaXRUb0NhcmdvSXRlbSA9IChcbiAgcGFja2luZ1VuaXQ6IFBhY2tpbmdVbml0RGF0YSxcbiAgc2NhbGU6IG51bWJlcixcbiAgcG9zaXRpb246IHsgeDogbnVtYmVyOyB5OiBudW1iZXIgfSA9IHsgeDogMCwgeTogMCB9XG4pOiBDYXJnb0l0ZW0gPT4ge1xuICBjb25zdCBjb2xvciA9IHBhY2tpbmdVbml0LnBhY2tpbmdUeXBlID09PSBcInBhbGxldFwiID8gXCJvcmFuZ2VcIiA6IFwiYmx1ZVwiO1xuICBjb25zdCBuYW1lID0gcGFja2luZ1VuaXQubmFtZSA/PyBgQ2FyZ28gJHtwYWNraW5nVW5pdC5pZH1gO1xuXG4gIHJldHVybiB7XG4gICAgaWQ6IGBjYXJnby0ke3BhY2tpbmdVbml0LmlkfWAsXG4gICAgbmFtZSxcbiAgICB4OiBwb3NpdGlvbi54LFxuICAgIHk6IHBvc2l0aW9uLnksXG4gICAgd2lkdGg6IG1ldGVyVG9QaXhlbChwYWNraW5nVW5pdC5sZW5ndGhNZXRlciwgc2NhbGUpLFxuICAgIGhlaWdodDogbWV0ZXJUb1BpeGVsKHBhY2tpbmdVbml0LndpZHRoTWV0ZXIsIHNjYWxlKSxcbiAgICByb3RhdGlvbjogMCxcbiAgICBjb2xvcixcbiAgICB0eXBlOiBwYWNraW5nVW5pdC5wYWNraW5nVHlwZSxcbiAgICBpc0xvY2tlZDogZmFsc2UsXG4gICAgaGVpZ2h0TTogcGFja2luZ1VuaXQuaGVpZ2h0TWV0ZXIsXG4gICAgd2VpZ2h0S2c6IHBhY2tpbmdVbml0LndlaWdodEtnLFxuICB9O1xufTtcblxuLyoqXG4gKiBDb252ZXJ0IGEgbGlzdCBvZiBUcmFuc3BvcnRPcmRlcnMgdG8gQ2FyZ29JdGVtcy5cbiAqIEVhY2ggVHJhbnNwb3J0T3JkZXIgaGFzIG9uZSBQYWNraW5nVW5pdC5cbiAqL1xuZXhwb3J0IGNvbnN0IHRyYW5zcG9ydE9yZGVyc1RvQ2FyZ29JdGVtcyA9IChvcmRlcnM6IFRyYW5zcG9ydE9yZGVyRGF0YVtdLCBzY2FsZTogbnVtYmVyKTogQ2FyZ29JdGVtW10gPT4ge1xuICByZXR1cm4gb3JkZXJzLmZpbHRlcigob3JkZXIpID0+IG9yZGVyLnBhY2tpbmdVbml0KS5tYXAoKG9yZGVyKSA9PiBwYWNraW5nVW5pdFRvQ2FyZ29JdGVtKG9yZGVyLnBhY2tpbmdVbml0ISwgc2NhbGUpKTtcbn07XG5cbi8qKlxuICogU2VyaWFsaXplIGEgQ2FyZ29JdGVtIGJhY2sgdG8gbWV0ZXItYmFzZWQgZGF0YSBmb3IgcGVyc2lzdGVuY2UuXG4gKi9cbmV4cG9ydCBjb25zdCBjYXJnb0l0ZW1Ub1BhY2tpbmdVbml0RGF0YSA9IChpdGVtOiBDYXJnb0l0ZW0sIHNjYWxlOiBudW1iZXIpOiBQYWNraW5nVW5pdERhdGEgPT4ge1xuICByZXR1cm4ge1xuICAgIGlkOiBpdGVtLmlkLnJlcGxhY2UoXCJjYXJnby1cIiwgXCJcIiksXG4gICAgbmFtZTogaXRlbS5uYW1lLFxuICAgIGxlbmd0aE1ldGVyOiBwaXhlbFRvTWV0ZXIoaXRlbS53aWR0aCwgc2NhbGUpLFxuICAgIHdpZHRoTWV0ZXI6IHBpeGVsVG9NZXRlcihpdGVtLmhlaWdodCwgc2NhbGUpLFxuICAgIGhlaWdodE1ldGVyOiBpdGVtLmhlaWdodE0gPz8gMCxcbiAgICBwYWNraW5nVHlwZTogaXRlbS50eXBlLFxuICAgIHdlaWdodEtnOiBpdGVtLndlaWdodEtnLFxuICB9O1xufTtcblxuLyoqXG4gKiBIZWxwZXI6IGNvbnZlcnQgcGl4ZWwgdG8gbWV0ZXIgKGludmVyc2Ugb2YgbWV0ZXJUb1BpeGVsKS5cbiAqL1xuY29uc3QgcGl4ZWxUb01ldGVyID0gKHBpeGVsOiBudW1iZXIsIHNjYWxlOiBudW1iZXIpOiBudW1iZXIgPT4ge1xuICByZXR1cm4gcGl4ZWwgLyBzY2FsZTtcbn07XG5cbi8qKlxuICogR2V0IHRoZSB2aXN1YWwgYm91bmRpbmcgcmVjdGFuZ2xlIG9mIGEgQ2FyZ29JdGVtLCBhY2NvdW50aW5nIGZvciByb3RhdGlvbi5cbiAqIEZvciA5MC1kZWdyZWUgcm90YXRpb24sIHdpZHRoIGFuZCBoZWlnaHQgYXJlIHN3YXBwZWQuXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRDYXJnb0l0ZW1SZWN0ID0gKGl0ZW06IENhcmdvSXRlbSk6IHsgeDogbnVtYmVyOyB5OiBudW1iZXI7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyIH0gPT4ge1xuICBpZiAoaXRlbS5yb3RhdGlvbiA9PT0gOTAgfHwgaXRlbS5yb3RhdGlvbiA9PT0gMjcwKSB7XG4gICAgcmV0dXJuIHsgeDogaXRlbS54LCB5OiBpdGVtLnksIHdpZHRoOiBpdGVtLmhlaWdodCwgaGVpZ2h0OiBpdGVtLndpZHRoIH07XG4gIH1cbiAgcmV0dXJuIHsgeDogaXRlbS54LCB5OiBpdGVtLnksIHdpZHRoOiBpdGVtLndpZHRoLCBoZWlnaHQ6IGl0ZW0uaGVpZ2h0IH07XG59O1xuIiwiLyoqXG4gKiBNZW5kaXggRGF0YSBBZGFwdGVyXG4gKlxuICogQnJpZGdlcyB0aGUgUmVhY3Qgd2lkZ2V0IHRvIHRoZSBNZW5kaXggRGF0YSBBUEkgKGBteC5kYXRhYCkuXG4gKiBJbiBhIE1lbmRpeCBydW50aW1lLCBgbXguZGF0YWAgaXMgYXZhaWxhYmxlIGdsb2JhbGx5LiBJbiB0aGUgZGV2IGVudmlyb25tZW50XG4gKiAoVml0ZSksIHdlIGZhbGwgYmFjayB0byBKU09OIHBhcnNpbmcgZm9yIHRlc3RpbmcuXG4gKlxuICogVGhpcyBhZGFwdGVyIGhhbmRsZXM6XG4gKiAtIExvYWRpbmcgVHJ1Y2tTZWxlY3Rpb24g4oaSIFRyYWlsZXJJdGVtICh2aWEgdHJhaWxlckFkYXB0ZXIpXG4gKiAtIExvYWRpbmcgVHJhbnNwb3J0T3JkZXJzIOKGkiBDYXJnb0l0ZW1bXSAodmlhIGNhcmdvQWRhcHRlcilcbiAqIC0gTG9hZGluZyBQYWNraW5nUGxhbiDihpIgQ2FyZ29JdGVtW10gKHZpYSBzdGF0ZUFkYXB0ZXIpXG4gKiAtIFNhdmluZyBQYWNraW5nUGxhbiAoZGVsZXRlICsgcmVjcmVhdGUgaXRlbXMpXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBDYXJnb0l0ZW0gfSBmcm9tIFwiLi4vdmlld01vZGVscy9DYXJnb0l0ZW1cIjtcbmltcG9ydCB0eXBlIHsgVHJhaWxlckl0ZW0gfSBmcm9tIFwiLi4vdmlld01vZGVscy9UcmFpbGVySXRlbVwiO1xuaW1wb3J0IHsgZGVzZXJpYWxpemVQbGFuLCBzZXJpYWxpemVQbGFuLCB0eXBlIFBhY2tpbmdQbGFuRGF0YSwgdHlwZSBQYWNraW5nUGxhbkl0ZW1EYXRhIH0gZnJvbSBcIi4vc3RhdGVBZGFwdGVyXCI7XG5pbXBvcnQgeyB0cnVja1NlbGVjdGlvblRvVHJhaWxlckl0ZW0sIHR5cGUgVHJ1Y2tTZWxlY3Rpb25EYXRhIH0gZnJvbSBcIi4vdHJhaWxlckFkYXB0ZXJcIjtcbmltcG9ydCB7IHRyYW5zcG9ydE9yZGVyc1RvQ2FyZ29JdGVtcywgdHlwZSBUcmFuc3BvcnRPcmRlckRhdGEgfSBmcm9tIFwiLi9jYXJnb0FkYXB0ZXJcIjtcbmltcG9ydCB0eXBlIHsgQ2FudmFzU3RhdGUgfSBmcm9tIFwiLi4vc3RhdGUvQ2FudmFzU3RhdGVcIjtcblxuLyoqXG4gKiBDaGVjayBpZiB3ZSdyZSBydW5uaW5nIGluc2lkZSBhIE1lbmRpeCBydW50aW1lLlxuICovXG5jb25zdCBpc01lbmRpeFJ1bnRpbWUgPSAoKTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuIHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiYgdHlwZW9mICh3aW5kb3cgYXMgdW5rbm93biBhcyB7IG14PzogdW5rbm93biB9KS5teCAhPT0gXCJ1bmRlZmluZWRcIjtcbn07XG5cbi8qKlxuICogU2FmZWx5IGFjY2VzcyB0aGUgZ2xvYmFsIGBteGAgb2JqZWN0LlxuICovXG5jb25zdCBnZXRNeCA9ICgpOiBXaW5kb3dbXCJteFwiXVtcImRhdGFcIl0gfCBudWxsID0+IHtcbiAgICBpZiAoIWlzTWVuZGl4UnVudGltZSgpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gd2luZG93Lm14LmRhdGE7XG59O1xuXG4vKipcbiAqIExvYWQgYSBzaW5nbGUgTWVuZGl4IG9iamVjdCBieSBHVUlELlxuICogRmFsbHMgYmFjayB0byBKU09OIHBhcnNpbmcgaW4gZGV2IG1vZGUuXG4gKi9cbmV4cG9ydCBjb25zdCBsb2FkTWVuZGl4T2JqZWN0ID0gYXN5bmMgKGd1aWQ6IHN0cmluZyk6IFByb21pc2U8dW5rbm93bj4gPT4ge1xuICAgIGNvbnN0IG14RGF0YSA9IGdldE14KCk7XG4gICAgaWYgKG14RGF0YSkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgbXhEYXRhLmxvYWQoe1xuICAgICAgICAgICAgICAgIGd1aWQsXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IChvYmo6IHVua25vd24pID0+IHJlc29sdmUob2JqKSxcbiAgICAgICAgICAgICAgICBlcnJvcjogKGVycjogRXJyb3IpID0+IHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vIERldiBmYWxsYmFjazogYXNzdW1lIHRoZSBndWlkIGlzIGFjdHVhbGx5IGEgSlNPTiBzdHJpbmdcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShndWlkKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufTtcblxuLyoqXG4gKiBMb2FkIGEgbGlzdCBvZiBNZW5kaXggb2JqZWN0cyB2aWEgWFBhdGguXG4gKiBGYWxscyBiYWNrIHRvIEpTT04gcGFyc2luZyBpbiBkZXYgbW9kZS5cbiAqL1xuZXhwb3J0IGNvbnN0IGxvYWRNZW5kaXhMaXN0ID0gYXN5bmMgKHhwYXRoOiBzdHJpbmcpOiBQcm9taXNlPHVua25vd25bXT4gPT4ge1xuICAgIGNvbnN0IG14RGF0YSA9IGdldE14KCk7XG4gICAgaWYgKG14RGF0YSkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgbXhEYXRhLmxpc3Qoe1xuICAgICAgICAgICAgICAgIHhwYXRoLFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoaXRlbXM6IHVua25vd25bXSkgPT4gcmVzb2x2ZShpdGVtcyksXG4gICAgICAgICAgICAgICAgZXJyb3I6IChlcnI6IEVycm9yKSA9PiByZWplY3QoZXJyKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBEZXYgZmFsbGJhY2s6IGFzc3VtZSB4cGF0aCBpcyBhY3R1YWxseSBhIEpTT04gc3RyaW5nXG4gICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZSh4cGF0aCk7XG4gICAgICAgIHJldHVybiBBcnJheS5pc0FycmF5KHBhcnNlZCkgPyBwYXJzZWQgOiBbXTtcbiAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbn07XG5cbi8qKlxuICogRXhlY3V0ZSBhIE1lbmRpeCBtaWNyb2Zsb3cgYWN0aW9uLlxuICogRmFsbHMgYmFjayB0byBhIG5vLW9wIGluIGRldiBtb2RlLlxuICovXG5leHBvcnQgY29uc3QgZXhlY3V0ZU1lbmRpeEFjdGlvbiA9IGFzeW5jIChhY3Rpb25JZDogc3RyaW5nLCBwYXJhbXM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge30pOiBQcm9taXNlPHVua25vd24+ID0+IHtcbiAgICBjb25zdCBteERhdGEgPSBnZXRNeCgpO1xuICAgIGlmIChteERhdGEpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIG14RGF0YS5hY3Rpb24oe1xuICAgICAgICAgICAgICAgIHBhcmFtczogeyBhY3Rpb25JZCwgLi4ucGFyYW1zIH0sXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IChyZXN1bHQ6IHVua25vd24pID0+IHJlc29sdmUocmVzdWx0KSxcbiAgICAgICAgICAgICAgICBlcnJvcjogKGVycjogRXJyb3IpID0+IHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vIERldiBmYWxsYmFjazogbm8tb3BcbiAgICByZXR1cm4gbnVsbDtcbn07XG5cbi8qKlxuICogTG9hZCB0aGUgVHJ1Y2tTZWxlY3Rpb24gb2JqZWN0IGFuZCBjb252ZXJ0IGl0IHRvIGEgVHJhaWxlckl0ZW0gdmlldyBtb2RlbC5cbiAqXG4gKiBJbiBNZW5kaXgsIHRoZSBUcnVja1NlbGVjdGlvbiBvYmplY3QgcmVmZXJlbmNlIGlzIHBhc3NlZCBhcyBhIHN0cmluZyBHVUlELlxuICogV2UgcmVzb2x2ZSBpdCB2aWEgbXguZGF0YS5sb2FkLCB0aGVuIHRyYXZlcnNlIHRoZSByZWZlcmVuY2UgY2hhaW46XG4gKiAgIFRydWNrU2VsZWN0aW9uIOKGkiBSZXNvdXJjZUluc3RhbmNlIOKGkiBSZXNvdXJjZSDihpIgVGVjaG5pY2FsRGV0YWlsc1xuICogdG8gZ2V0IHRoZSB0cmFpbGVyIGRpbWVuc2lvbnMuXG4gKlxuICogQHBhcmFtIHRydWNrUmVmIC0gVHJ1Y2tTZWxlY3Rpb24gb2JqZWN0IHJlZmVyZW5jZSAoR1VJRCBvciBKU09OIHN0cmluZyBpbiBkZXYpXG4gKiBAcGFyYW0gc2NhbGUgLSBQaXhlbC10by1tZXRlciBzY2FsZSBmYWN0b3JcbiAqIEByZXR1cm5zIFRyYWlsZXJJdGVtIHZpZXcgbW9kZWwsIG9yIG51bGwgaWYgbm90IGF2YWlsYWJsZVxuICovXG5leHBvcnQgY29uc3QgbG9hZFRyYWlsZXJJdGVtID0gYXN5bmMgKHRydWNrUmVmOiBzdHJpbmcgfCB1bmRlZmluZWQsIHNjYWxlOiBudW1iZXIpOiBQcm9taXNlPFRyYWlsZXJJdGVtIHwgbnVsbD4gPT4ge1xuICAgIGlmICghdHJ1Y2tSZWYpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgICAgY29uc3QgdHJ1Y2tEYXRhID0gKGF3YWl0IGxvYWRNZW5kaXhPYmplY3QodHJ1Y2tSZWYpKSBhcyBUcnVja1NlbGVjdGlvbkRhdGEgfCBudWxsO1xuICAgICAgICBpZiAoIXRydWNrRGF0YSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWNrU2VsZWN0aW9uVG9UcmFpbGVySXRlbSh0cnVja0RhdGEsIHNjYWxlKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBsb2FkIFRydWNrU2VsZWN0aW9uOlwiLCBlcnIpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59O1xuXG4vKipcbiAqIExvYWQgVHJhbnNwb3J0T3JkZXIgb2JqZWN0cyBhbmQgY29udmVydCB0aGVtIHRvIENhcmdvSXRlbSB2aWV3IG1vZGVscy5cbiAqXG4gKiBJbiBNZW5kaXgsIHRoZSBUcmFuc3BvcnRPcmRlciBsaXN0IGlzIHBhc3NlZCBhcyBhIHN0cmluZyByZWZlcmVuY2UuXG4gKiBXZSByZXNvbHZlIGl0IHZpYSBteC5kYXRhLmxpc3QsIHRoZW4gdHJhdmVyc2U6XG4gKiAgIFRyYW5zcG9ydE9yZGVyIOKGkiBQYWNraW5nVW5pdCDihpIgUGFja2luZ1R5cGVcbiAqIHRvIGdldCBjYXJnbyBkaW1lbnNpb25zLlxuICpcbiAqIEBwYXJhbSBvcmRlcnNSZWYgLSBUcmFuc3BvcnRPcmRlciBsaXN0IHJlZmVyZW5jZSAoR1VJRCBvciBKU09OIHN0cmluZyBpbiBkZXYpXG4gKiBAcGFyYW0gc2NhbGUgLSBQaXhlbC10by1tZXRlciBzY2FsZSBmYWN0b3JcbiAqIEByZXR1cm5zIEFycmF5IG9mIENhcmdvSXRlbSB2aWV3IG1vZGVsc1xuICovXG5leHBvcnQgY29uc3QgbG9hZENhcmdvSXRlbXMgPSBhc3luYyAob3JkZXJzR3VpZHM6IHN0cmluZ1tdLCBzY2FsZTogbnVtYmVyKTogUHJvbWlzZTxDYXJnb0l0ZW1bXT4gPT4ge1xuICAgIGlmICghb3JkZXJzR3VpZHMgfHwgb3JkZXJzR3VpZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgICBjb25zdCBvcmRlcnNEYXRhID0gYXdhaXQgUHJvbWlzZS5hbGwob3JkZXJzR3VpZHMubWFwKGd1aWQgPT4gbG9hZE1lbmRpeE9iamVjdChndWlkKSkpO1xuICAgICAgICByZXR1cm4gdHJhbnNwb3J0T3JkZXJzVG9DYXJnb0l0ZW1zKG9yZGVyc0RhdGEgYXMgVHJhbnNwb3J0T3JkZXJEYXRhW10sIHNjYWxlKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBsb2FkIFRyYW5zcG9ydE9yZGVyczpcIiwgZXJyKTtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbn07XG5cbi8qKlxuICogTG9hZCBhIHNhdmVkIFBhY2tpbmdQbGFuIGZvciB0aGUgZ2l2ZW4gVHJ1Y2tTZWxlY3Rpb24uXG4gKlxuICogVGhlIFBhY2tpbmdQbGFuIGVudGl0eSBpcyBhIG5ldyBlbnRpdHkgaW4gVENTTG9hZGluZ01ldGVyOlxuICogICBQYWNraW5nUGxhbiAoMSBwZXIgVHJ1Y2tTZWxlY3Rpb24pXG4gKiAgICAg4pSU4pSAIFBhY2tpbmdQbGFuSXRlbSAoMS0qIHBlciBwbGFuKVxuICpcbiAqIEBwYXJhbSB0cnVja0d1aWQgLSBUaGUgVHJ1Y2tTZWxlY3Rpb24gR1VJRFxuICogQHBhcmFtIHNjYWxlIC0gUGl4ZWwtdG8tbWV0ZXIgc2NhbGUgZmFjdG9yXG4gKiBAcmV0dXJucyBBcnJheSBvZiBDYXJnb0l0ZW0gdmlldyBtb2RlbHMgcmVzdG9yZWQgZnJvbSB0aGUgcGxhblxuICovXG5leHBvcnQgY29uc3QgbG9hZFBhY2tpbmdQbGFuID0gYXN5bmMgKHRydWNrR3VpZDogc3RyaW5nIHwgbnVsbCwgc2NhbGU6IG51bWJlcik6IFByb21pc2U8Q2FyZ29JdGVtW10+ID0+IHtcbiAgICBpZiAoIXRydWNrR3VpZCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgICAgLy8gWFBhdGggdG8gZmluZCB0aGUgUGFja2luZ1BsYW4gZm9yIHRoaXMgdHJ1Y2tcbiAgICAgICAgY29uc3QgeHBhdGggPSBgLy9UQ1NMb2FkaW5nTWV0ZXIuUGFja2luZ1BsYW5bVHJ1Y2tTZWxlY3Rpb24gPSAnJHt0cnVja0d1aWR9J11gO1xuICAgICAgICBjb25zdCBwbGFucyA9IGF3YWl0IGxvYWRNZW5kaXhMaXN0KHhwYXRoKTtcblxuICAgICAgICBpZiAocGxhbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgdGhlIGZpcnN0IChhbmQgb25seSkgcGxhblxuICAgICAgICBjb25zdCBwbGFuT2JqID0gcGxhbnNbMF0gYXMgeyBndWlkOiBzdHJpbmc7IGl0ZW1zPzogdW5rbm93bltdIH07XG4gICAgICAgIGlmICghcGxhbk9iaikge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTG9hZCBwbGFuIGl0ZW1zXG4gICAgICAgIGNvbnN0IGl0ZW1zWFBhdGggPSBgLy9UQ1NMb2FkaW5nTWV0ZXIuUGFja2luZ1BsYW5JdGVtW1BhY2tpbmdQbGFuID0gJyR7cGxhbk9iai5ndWlkfSddYDtcbiAgICAgICAgY29uc3QgcGxhbkl0ZW1zID0gYXdhaXQgbG9hZE1lbmRpeExpc3QoaXRlbXNYUGF0aCk7XG5cbiAgICAgICAgLy8gQ29udmVydCB0byBQYWNraW5nUGxhbkRhdGEgYW5kIGRlc2VyaWFsaXplXG4gICAgICAgIGNvbnN0IHBsYW5EYXRhOiBQYWNraW5nUGxhbkRhdGEgPSB7XG4gICAgICAgICAgICB0cnVja0lkOiB0cnVja0d1aWQsXG4gICAgICAgICAgICBpdGVtczogcGxhbkl0ZW1zLm1hcChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByYXcgPSBpdGVtIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiByYXcuaWQgYXMgc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiByYXcubmFtZSBhcyBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IChyYXcudHlwZSBhcyBcInBhbGxldFwiIHwgXCJib3hcIikgPz8gXCJwYWxsZXRcIixcbiAgICAgICAgICAgICAgICAgICAgeDogTnVtYmVyKHJhdy54KSxcbiAgICAgICAgICAgICAgICAgICAgeTogTnVtYmVyKHJhdy55KSxcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IE51bWJlcihyYXcud2lkdGgpLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IE51bWJlcihyYXcuaGVpZ2h0KSxcbiAgICAgICAgICAgICAgICAgICAgcm90YXRpb246IE51bWJlcihyYXcucm90YXRpb24pIGFzIDAgfCA5MCB8IDE4MCB8IDI3MCxcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IChyYXcuY29sb3IgYXMgc3RyaW5nKSA/PyBcImdyYXlcIixcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0TTogcmF3LmhlaWdodE0gPyBOdW1iZXIocmF3LmhlaWdodE0pIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICB3ZWlnaHRLZzogcmF3LndlaWdodEtnID8gTnVtYmVyKHJhdy53ZWlnaHRLZykgOiB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICB9IGFzIFBhY2tpbmdQbGFuSXRlbURhdGE7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBkZXNlcmlhbGl6ZVBsYW4ocGxhbkRhdGEsIHNjYWxlKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBsb2FkIFBhY2tpbmdQbGFuOlwiLCBlcnIpO1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxufTtcblxuLyoqXG4gKiBTYXZlIHRoZSBjdXJyZW50IGNhbnZhcyBzdGF0ZSBhcyBhIFBhY2tpbmdQbGFuLlxuICpcbiAqIFBlciB0aGUgcmVxdWlyZW1lbnRzOlxuICogLSBPbmx5IDEgcGFja2luZyBwbGFuIHBlciB0cnVjayAobm8gdmVyc2lvbmluZylcbiAqIC0gT24gc2F2ZTogZGVsZXRlIGV4aXN0aW5nIHBsYW4gaXRlbXMgKyByZWNyZWF0ZVxuICpcbiAqIEBwYXJhbSB0cnVja0d1aWQgLSBUaGUgVHJ1Y2tTZWxlY3Rpb24gR1VJRFxuICogQHBhcmFtIHN0YXRlIC0gQ3VycmVudCBjYW52YXMgc3RhdGVcbiAqIEBwYXJhbSBzY2FsZSAtIFBpeGVsLXRvLW1ldGVyIHNjYWxlIGZhY3RvclxuICogQHBhcmFtIG9uU2F2ZU1pY3JvZmxvdyAtIE9wdGlvbmFsIE1lbmRpeCBtaWNyb2Zsb3cgY2FsbGJhY2tcbiAqIEByZXR1cm5zIFRoZSBzZXJpYWxpemVkIHBsYW4gZGF0YVxuICovXG5leHBvcnQgY29uc3Qgc2F2ZVBhY2tpbmdQbGFuID0gYXN5bmMgKFxuICAgIHRydWNrR3VpZDogc3RyaW5nIHwgbnVsbCxcbiAgICBzdGF0ZTogQ2FudmFzU3RhdGUsXG4gICAgc2NhbGU6IG51bWJlcixcbiAgICBvblNhdmVNaWNyb2Zsb3c/OiAoKSA9PiB2b2lkXG4pOiBQcm9taXNlPFBhY2tpbmdQbGFuRGF0YT4gPT4ge1xuICAgIGNvbnN0IHBsYW4gPSBzZXJpYWxpemVQbGFuKHN0YXRlLCBzY2FsZSk7XG5cbiAgICBpZiAoaXNNZW5kaXhSdW50aW1lKCkpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFN0ZXAgMTogRmluZCBleGlzdGluZyBQYWNraW5nUGxhbiBmb3IgdGhpcyB0cnVja1xuICAgICAgICAgICAgY29uc3QgeHBhdGggPSBgLy9UQ1NMb2FkaW5nTWV0ZXIuUGFja2luZ1BsYW5bVHJ1Y2tTZWxlY3Rpb24gPSAnJHt0cnVja0d1aWR9J11gO1xuICAgICAgICAgICAgY29uc3QgcGxhbnMgPSBhd2FpdCBsb2FkTWVuZGl4TGlzdCh4cGF0aCk7XG5cbiAgICAgICAgICAgIGxldCBwbGFuR3VpZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cbiAgICAgICAgICAgIGlmIChwbGFucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gU3RlcCAyYTogUGxhbiBleGlzdHMg4oCUIGRlbGV0ZSBhbGwgZXhpc3RpbmcgaXRlbXNcbiAgICAgICAgICAgICAgICBjb25zdCBleGlzdGluZ1BsYW4gPSBwbGFuc1swXSBhcyB7IGd1aWQ6IHN0cmluZyB9O1xuICAgICAgICAgICAgICAgIHBsYW5HdWlkID0gZXhpc3RpbmdQbGFuLmd1aWQ7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtc1hQYXRoID0gYC8vVENTTG9hZGluZ01ldGVyLlBhY2tpbmdQbGFuSXRlbVtQYWNraW5nUGxhbiA9ICcke3BsYW5HdWlkfSddYDtcbiAgICAgICAgICAgICAgICBjb25zdCBleGlzdGluZ0l0ZW1zID0gYXdhaXQgbG9hZE1lbmRpeExpc3QoaXRlbXNYUGF0aCk7XG5cbiAgICAgICAgICAgICAgICAvLyBEZWxldGUgZWFjaCBpdGVtXG4gICAgICAgICAgICAgICAgY29uc3QgbXhEYXRhID0gZ2V0TXgoKSE7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGV4aXN0aW5nSXRlbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbU9iaiA9IGl0ZW0gYXMgeyBndWlkOiBzdHJpbmcgfTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbXhEYXRhLnJlbW92ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ3VpZDogaXRlbU9iai5ndWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiByZXNvbHZlKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IChlcnI6IEVycm9yKSA9PiByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gU3RlcCAyYjogTm8gcGxhbiBleGlzdHMg4oCUIGNyZWF0ZSBvbmVcbiAgICAgICAgICAgICAgICBjb25zdCBteERhdGEgPSBnZXRNeCgpITtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdQbGFuID0gYXdhaXQgbmV3IFByb21pc2U8dW5rbm93bj4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBteERhdGEuY3JlYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eTogXCJUQ1NMb2FkaW5nTWV0ZXIuUGFja2luZ1BsYW5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVHJ1Y2tTZWxlY3Rpb246IHRydWNrR3VpZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogKG9iajogdW5rbm93bikgPT4gcmVzb2x2ZShvYmopLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IChlcnI6IEVycm9yKSA9PiByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBwbGFuR3VpZCA9IChuZXdQbGFuIGFzIHsgZ3VpZDogc3RyaW5nIH0pLmd1aWQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFN0ZXAgMzogQ3JlYXRlIG5ldyBwbGFuIGl0ZW1zXG4gICAgICAgICAgICBjb25zdCBteERhdGEgPSBnZXRNeCgpITtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBwbGFuLml0ZW1zKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBteERhdGEuY3JlYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eTogXCJUQ1NMb2FkaW5nTWV0ZXIuUGFja2luZ1BsYW5JdGVtXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBhY2tpbmdQbGFuOiBwbGFuR3VpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVHJhbnNwb3J0T3JkZXI6IGl0ZW0uaWQuc3RhcnRzV2l0aChcImNhcmdvLVwiKSA/IGl0ZW0uaWQucmVwbGFjZShcImNhcmdvLVwiLCBcIlwiKSA6IGl0ZW0uaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBvc2l0aW9uWDogaXRlbS54LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBQb3NpdGlvblk6IGl0ZW0ueSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgV2lkdGg6IGl0ZW0ud2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEhlaWdodDogaXRlbS5oZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFJvdGF0aW9uOiBpdGVtLnJvdGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBDb2xvcjogaXRlbS5jb2xvcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSGVpZ2h0TWV0ZXJzOiBpdGVtLmhlaWdodE0gPz8gMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgV2VpZ2h0S2c6IGl0ZW0ud2VpZ2h0S2cgPz8gMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gcmVzb2x2ZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IChlcnI6IEVycm9yKSA9PiByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ29tbWl0IHRoZSBwbGFuXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgbXhEYXRhLmNvbW1pdCh7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiByZXNvbHZlKCksXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiAoZXJyOiBFcnJvcikgPT4gcmVqZWN0KGVycilcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gc2F2ZSBQYWNraW5nUGxhbjpcIiwgZXJyKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIERldiBmYWxsYmFjazogbG9jYWxTdG9yYWdlXG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJsb2FkaW5nQ2FudmFzUGxhblwiLCBKU09OLnN0cmluZ2lmeShwbGFuKSk7XG5cbiAgICAvLyBUcmlnZ2VyIE1lbmRpeCBtaWNyb2Zsb3cgY2FsbGJhY2sgaWYgcHJvdmlkZWRcbiAgICBpZiAob25TYXZlTWljcm9mbG93KSB7XG4gICAgICAgIG9uU2F2ZU1pY3JvZmxvdygpO1xuICAgIH1cblxuICAgIHJldHVybiBwbGFuO1xufTtcbiIsImltcG9ydCB7IHVzZUNhbGxiYWNrLCB1c2VFZmZlY3QsIHVzZU1lbW8sIHVzZVN0YXRlLCB0eXBlIFJlYWN0RWxlbWVudCB9IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHsgTG9hZGluZ0NhbnZhcyB9IGZyb20gXCIuL0xvYWRpbmdDYW52YXNcIjtcbmltcG9ydCB0eXBlIHsgTG9hZGluZ0NhbnZhc1Byb3BzLCBMb2FkaW5nQ2FudmFzVmlld01vZGVsUHJvcHMgfSBmcm9tIFwiLi9Mb2FkaW5nQ2FudmFzLnByb3BlcnRpZXNcIjtcbmltcG9ydCB7IGNvbXB1dGVTY2FsZSwgdHlwZSBUcnVja1NlbGVjdGlvbkRhdGEgfSBmcm9tIFwiLi4vYWRhcHRlcnMvdHJhaWxlckFkYXB0ZXJcIjtcbmltcG9ydCB7IGxvYWRUcmFpbGVySXRlbSwgbG9hZENhcmdvSXRlbXMsIGxvYWRQYWNraW5nUGxhbiwgc2F2ZVBhY2tpbmdQbGFuIH0gZnJvbSBcIi4uL2FkYXB0ZXJzL21lbmRpeERhdGFBZGFwdGVyXCI7XG5pbXBvcnQgdHlwZSB7IENhcmdvSXRlbSB9IGZyb20gXCIuLi92aWV3TW9kZWxzL0NhcmdvSXRlbVwiO1xuaW1wb3J0IHR5cGUgeyBUcmFpbGVySXRlbSB9IGZyb20gXCIuLi92aWV3TW9kZWxzL1RyYWlsZXJJdGVtXCI7XG5pbXBvcnQgdHlwZSB7IENhbnZhc1N0YXRlIH0gZnJvbSBcIi4uL3N0YXRlL0NhbnZhc1N0YXRlXCI7XG5cbi8qKlxuICogTG9hZGluZ0NhbnZhc0NvbnRhaW5lciDigJQgdGhlIE1lbmRpeCB3aWRnZXQgY29udGFpbmVyLlxuICpcbiAqIFRoaXMgY29tcG9uZW50IHNpdHMgYmV0d2VlbiBNZW5kaXggYW5kIHRoZSBMb2FkaW5nQ2FudmFzIHdpZGdldC5cbiAqIEl0IGlzIHJlc3BvbnNpYmxlIGZvcjpcbiAqIC0gUmVjZWl2aW5nIHJhdyBNZW5kaXggb2JqZWN0IHJlZmVyZW5jZXMgKEdVSUQgc3RyaW5ncylcbiAqIC0gUmVzb2x2aW5nIHRoZW0gdG8gZnVsbCBvYmplY3RzIHZpYSB0aGUgTWVuZGl4IERhdGEgQVBJIChteC5kYXRhKVxuICogLSBDb252ZXJ0aW5nIHRoZW0gdG8gdmlldyBtb2RlbHMgdXNpbmcgYWRhcHRlcnNcbiAqIC0gUGFzc2luZyB0aGUgdmlldyBtb2RlbHMgYW5kIGNhbGxiYWNrcyB0byB0aGUgTG9hZGluZ0NhbnZhcyB3aWRnZXRcbiAqIC0gSGFuZGxpbmcgc2F2ZS9sb2FkIHBsYW4gdmlhIE1lbmRpeCBtaWNyb2Zsb3dzIGFuZCB0aGUgUGFja2luZ1BsYW4gZW50aXR5XG4gKlxuICogSW4gYSByZWFsIE1lbmRpeCBwcm9qZWN0LCB0aGUgb2JqZWN0IHJlZmVyZW5jZXMgYXJlIHJlc29sdmVkIHZpYSBteC5kYXRhLlxuICogSW4gdGhlIGRldiBlbnZpcm9ubWVudCAoVml0ZSksIHRoZSByZWZlcmVuY2VzIGFyZSBKU09OIHN0cmluZ3MgdGhhdCBhcmVcbiAqIHBhcnNlZCBkaXJlY3RseS5cbiAqL1xuZXhwb3J0IGNvbnN0IExvYWRpbmdDYW52YXNDb250YWluZXIgPSAocHJvcHM6IExvYWRpbmdDYW52YXNQcm9wcyk6IFJlYWN0RWxlbWVudCA9PiB7XG4gIGNvbnN0IHtcbiAgICB0cnVja3M6IHRydWNrc1JlZixcbiAgICB0cmFuc3BvcnRPcmRlcnM6IHRyYW5zcG9ydE9yZGVyc1JlZixcbiAgICBjYW52YXNXaWR0aCA9IDEwMDAsXG4gICAgY2FudmFzSGVpZ2h0ID0gNjAwLFxuICAgIG9uU2F2ZVBsYW46IG9uU2F2ZVBsYW5DYWxsYmFjayxcbiAgICBvbkxvYWRQbGFuOiBvbkxvYWRQbGFuQ2FsbGJhY2ssXG4gIH0gPSBwcm9wcztcblxuICAvLyAtLS0gU3RhdGUgZm9yIGxvYWRlZCBkYXRhIC0tLVxuICBjb25zdCBbdHJhaWxlckl0ZW0sIHNldFRyYWlsZXJJdGVtXSA9IHVzZVN0YXRlPFRyYWlsZXJJdGVtIHwgbnVsbD4obnVsbCk7XG4gIGNvbnN0IFtwYWxsZXRMaXN0LCBzZXRQYWxsZXRMaXN0XSA9IHVzZVN0YXRlPENhcmdvSXRlbVtdPihbXSk7XG4gIGNvbnN0IFtpbml0aWFsQ2FudmFzSXRlbXMsIHNldEluaXRpYWxDYW52YXNJdGVtc10gPSB1c2VTdGF0ZTxDYXJnb0l0ZW1bXT4oW10pO1xuICBjb25zdCBbc2NhbGUsIHNldFNjYWxlXSA9IHVzZVN0YXRlKDEpO1xuICBjb25zdCBbdHJ1Y2tHdWlkLCBzZXRUcnVja0d1aWRdID0gdXNlU3RhdGU8c3RyaW5nIHwgbnVsbD4obnVsbCk7XG4gIGNvbnN0IFtpc0xvYWRpbmcsIHNldElzTG9hZGluZ10gPSB1c2VTdGF0ZSh0cnVlKTtcblxuICAvLyAtLS0gTG9hZCB0cnVjayBkYXRhIGFuZCBjb21wdXRlIHNjYWxlIC0tLVxuICAvLyBXZSBuZWVkIHRoZSB0cnVjayBkYXRhIHRvIGNvbXB1dGUgdGhlIHNjYWxlLCBidXQgd2UgYWxzbyBuZWVkIHRoZSBzY2FsZVxuICAvLyB0byBjb252ZXJ0IHRydWNrIGRhdGEgdG8gYSBUcmFpbGVySXRlbS4gU28gd2UgZmlyc3QgbG9hZCB0aGUgcmF3IHRydWNrIGRhdGEsXG4gIC8vIGNvbXB1dGUgdGhlIHNjYWxlLCB0aGVuIGNvbnZlcnQgdG8gYSBUcmFpbGVySXRlbS5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBsb2FkVHJ1Y2sgPSBhc3luYyAoKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICBpZiAoIXRydWNrc1JlZikge1xuICAgICAgICBzZXRUcmFpbGVySXRlbShudWxsKTtcbiAgICAgICAgc2V0VHJ1Y2tHdWlkKG51bGwpO1xuICAgICAgICBzZXRTY2FsZSgxKTtcbiAgICAgICAgc2V0SXNMb2FkaW5nKGZhbHNlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0cnkge1xuICAgICAgICAvLyBMb2FkIHRoZSByYXcgdHJ1Y2sgZGF0YSB0byBjb21wdXRlIHNjYWxlXG4gICAgICAgIGNvbnN0IHJhd1RydWNrID0gYXdhaXQgbG9hZE1lbmRpeE9iamVjdFJhdyh0cnVja3NSZWYpO1xuICAgICAgICBpZiAocmF3VHJ1Y2spIHtcbiAgICAgICAgICBzZXRUcnVja0d1aWQocmF3VHJ1Y2suaWQgPz8gbnVsbCk7XG5cbiAgICAgICAgICAvLyBDb21wdXRlIHNjYWxlIGZyb20gdHJ1Y2sgZGltZW5zaW9uc1xuICAgICAgICAgIGNvbnN0IGNvbXB1dGVkU2NhbGUgPSBjb21wdXRlU2NhbGUocmF3VHJ1Y2ssIGNhbnZhc1dpZHRoLCBjYW52YXNIZWlnaHQpO1xuICAgICAgICAgIHNldFNjYWxlKGNvbXB1dGVkU2NhbGUpO1xuXG4gICAgICAgICAgLy8gQ29udmVydCB0byBUcmFpbGVySXRlbVxuICAgICAgICAgIGNvbnN0IHRyYWlsZXIgPSBhd2FpdCBsb2FkVHJhaWxlckl0ZW0odHJ1Y2tzUmVmLCBjb21wdXRlZFNjYWxlKTtcbiAgICAgICAgICBzZXRUcmFpbGVySXRlbSh0cmFpbGVyKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gbG9hZCB0cnVjayBkYXRhOlwiLCBlcnIpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBsb2FkVHJ1Y2soKTtcbiAgfSwgW3RydWNrc1JlZiwgY2FudmFzV2lkdGgsIGNhbnZhc0hlaWdodF0pO1xuXG4gIC8vIC0tLSBMb2FkIHRyYW5zcG9ydCBvcmRlcnMgKHBhbGxldCBsaXN0KSAtLS1cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBsb2FkT3JkZXJzID0gYXN5bmMgKCk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgaWYgKCF0cmFuc3BvcnRPcmRlcnNSZWYgfHwgdHJhbnNwb3J0T3JkZXJzUmVmLmxlbmd0aCA9PT0gMCB8fCBzY2FsZSA9PT0gMSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gYXdhaXQgbG9hZENhcmdvSXRlbXModHJhbnNwb3J0T3JkZXJzUmVmLCBzY2FsZSk7XG4gICAgICAgIHNldFBhbGxldExpc3QoaXRlbXMpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gbG9hZCB0cmFuc3BvcnQgb3JkZXJzOlwiLCBlcnIpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBsb2FkT3JkZXJzKCk7XG4gIH0sIFt0cmFuc3BvcnRPcmRlcnNSZWYsIHNjYWxlXSk7XG5cbiAgLy8gLS0tIExvYWQgc2F2ZWQgcGFja2luZyBwbGFuIC0tLVxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IGxvYWRQbGFuID0gYXN5bmMgKCk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgaWYgKCF0cnVja0d1aWQgfHwgc2NhbGUgPT09IDEpIHtcbiAgICAgICAgc2V0SXNMb2FkaW5nKGZhbHNlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBzYXZlZEl0ZW1zID0gYXdhaXQgbG9hZFBhY2tpbmdQbGFuKHRydWNrR3VpZCwgc2NhbGUpO1xuICAgICAgICBzZXRJbml0aWFsQ2FudmFzSXRlbXMoc2F2ZWRJdGVtcyk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBsb2FkIHBhY2tpbmcgcGxhbjpcIiwgZXJyKTtcbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIHNldElzTG9hZGluZyhmYWxzZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGxvYWRQbGFuKCk7XG4gIH0sIFt0cnVja0d1aWQsIHNjYWxlXSk7XG5cbiAgLy8gLS0tIFNhdmUgcGxhbiBoYW5kbGVyIOKAlCBjYWxsZWQgYnkgdGhlIHdpZGdldCB3aXRoIGN1cnJlbnQgaXRlbXMgYW5kIHNjYWxlIC0tLVxuICBjb25zdCBoYW5kbGVTYXZlUGxhbiA9IHVzZUNhbGxiYWNrKFxuICAgIGFzeW5jIChpdGVtczogQ2FyZ29JdGVtW10sIGN1cnJlbnRTY2FsZTogbnVtYmVyKSA9PiB7XG4gICAgICBpZiAoIXRydWNrR3VpZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIEJ1aWxkIGEgbWluaW1hbCBDYW52YXNTdGF0ZSBmb3Igc2VyaWFsaXphdGlvblxuICAgICAgY29uc3Qgc3RhdGU6IENhbnZhc1N0YXRlID0ge1xuICAgICAgICB0cmFpbGVyOiB0cmFpbGVySXRlbSxcbiAgICAgICAgY2FyZ29zOiBpdGVtcyxcbiAgICAgICAgc2VsZWN0ZWRJZHM6IFtdLFxuICAgICAgICBhY3RpdmVJdGVtSWQ6IG51bGwsXG4gICAgICAgIHZhbGlkYXRpb246IHsgdmFsaWQ6IHRydWUsIGVycm9yczogW10gfSxcbiAgICAgICAgc2NhbGU6IGN1cnJlbnRTY2FsZSxcbiAgICAgIH07XG5cbiAgICAgIGF3YWl0IHNhdmVQYWNraW5nUGxhbih0cnVja0d1aWQsIHN0YXRlLCBjdXJyZW50U2NhbGUsIG9uU2F2ZVBsYW5DYWxsYmFjayk7XG4gICAgfSxcbiAgICBbdHJ1Y2tHdWlkLCB0cmFpbGVySXRlbSwgb25TYXZlUGxhbkNhbGxiYWNrXVxuICApO1xuXG4gIC8vIC0tLSBMb2FkIHBsYW4gaGFuZGxlciAtLS1cbiAgY29uc3QgaGFuZGxlTG9hZFBsYW4gPSB1c2VDYWxsYmFjaygoKSA9PiB7XG4gICAgaWYgKG9uTG9hZFBsYW5DYWxsYmFjaykge1xuICAgICAgb25Mb2FkUGxhbkNhbGxiYWNrKCk7XG4gICAgfVxuICB9LCBbb25Mb2FkUGxhbkNhbGxiYWNrXSk7XG5cbiAgLy8gLS0tIEJ1aWxkIHZpZXcgbW9kZWwgcHJvcHMgZm9yIHRoZSB3aWRnZXQgLS0tXG4gIGNvbnN0IHZpZXdNb2RlbDogTG9hZGluZ0NhbnZhc1ZpZXdNb2RlbFByb3BzID0gdXNlTWVtbyhcbiAgICAoKSA9PiAoe1xuICAgICAgdHJhaWxlcjogdHJhaWxlckl0ZW0sXG4gICAgICBwYWxsZXRMaXN0LFxuICAgICAgaW5pdGlhbENhbnZhc0l0ZW1zLFxuICAgICAgc2NhbGUsXG4gICAgICBjYW52YXNXaWR0aCxcbiAgICAgIGNhbnZhc0hlaWdodCxcbiAgICAgIG9uU2F2ZVBsYW46IGhhbmRsZVNhdmVQbGFuLFxuICAgICAgb25Mb2FkUGxhbjogaGFuZGxlTG9hZFBsYW4sXG4gICAgfSksXG4gICAgW3RyYWlsZXJJdGVtLCBwYWxsZXRMaXN0LCBpbml0aWFsQ2FudmFzSXRlbXMsIHNjYWxlLCBjYW52YXNXaWR0aCwgY2FudmFzSGVpZ2h0LCBoYW5kbGVTYXZlUGxhbiwgaGFuZGxlTG9hZFBsYW5dXG4gICk7XG5cbiAgcmV0dXJuIDxMb2FkaW5nQ2FudmFzIHZpZXdNb2RlbD17dmlld01vZGVsfSBpc0xvYWRpbmc9e2lzTG9hZGluZ30gLz47XG59O1xuXG4vKipcbiAqIExvYWQgcmF3IHRydWNrIGRhdGEgKGZvciBzY2FsZSBjb21wdXRhdGlvbikuXG4gKiBJbiBNZW5kaXgsIHRoaXMgdXNlcyBteC5kYXRhLmxvYWQuIEluIGRldiwgaXQgcGFyc2VzIEpTT04uXG4gKi9cbmNvbnN0IGxvYWRNZW5kaXhPYmplY3RSYXcgPSBhc3luYyAocmVmOiBzdHJpbmcpOiBQcm9taXNlPFRydWNrU2VsZWN0aW9uRGF0YSB8IG51bGw+ID0+IHtcbiAgLy8gVHJ5IG14LmRhdGEgZmlyc3RcbiAgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiYgKHdpbmRvdyBhcyB1bmtub3duIGFzIHsgbXg/OiB1bmtub3duIH0pLm14KSB7XG4gICAgY29uc3QgbXhEYXRhID0gKHdpbmRvdyBhcyB1bmtub3duIGFzIHsgbXg6IHsgZGF0YTogdW5rbm93biB9IH0pLm14LmRhdGEgYXMge1xuICAgICAgbG9hZDogKG9wdHM6IHsgZ3VpZDogc3RyaW5nOyBjYWxsYmFjazogKG9iajogdW5rbm93bikgPT4gdm9pZDsgZXJyb3I/OiAoZTogRXJyb3IpID0+IHZvaWQgfSkgPT4gdm9pZDtcbiAgICB9O1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBteERhdGEubG9hZCh7XG4gICAgICAgIGd1aWQ6IHJlZixcbiAgICAgICAgY2FsbGJhY2s6IChvYmo6IHVua25vd24pID0+IHJlc29sdmUob2JqIGFzIFRydWNrU2VsZWN0aW9uRGF0YSksXG4gICAgICAgIGVycm9yOiAoZXJyOiBFcnJvcikgPT4gcmVqZWN0KGVyciksXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICAvLyBEZXYgZmFsbGJhY2s6IHBhcnNlIEpTT05cbiAgdHJ5IHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShyZWYpIGFzIFRydWNrU2VsZWN0aW9uRGF0YTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IExvYWRpbmdDYW52YXNDb250YWluZXI7XG4iXSwibmFtZXMiOlsiX2pzeCIsIl9qc3hzIl0sIm1hcHBpbmdzIjoiOzs7QUFBQTtBQUNBO0FBRU8sTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUM7QUFDbEMsTUFBTSxxQkFBcUIsR0FBRyxHQUFHLENBQUM7QUFDbEMsTUFBTSxhQUFhLEdBQUcsaUJBQWlCLENBQUM7QUFFL0M7QUFFTyxNQUFNLGNBQWMsR0FBRyxXQUFXLENBQUM7QUFFMUM7QUFFTyxNQUFNLGNBQWMsR0FBRyxFQUFFLENBQUM7QUFDMUIsTUFBTSxlQUFlLEdBQUcsRUFBRSxDQUFDO0FBQzNCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDO0FBQ2hDLE1BQU0sa0JBQWtCLEdBQUcsU0FBUyxDQUFDO0FBQ3JDLE1BQU0scUJBQXFCLEdBQUcsTUFBTSxDQUFDO0FBQ3JDLE1BQU0saUJBQWlCLEdBQUcsZ0JBQWdCLENBQUM7QUFFbEQ7QUFFTyxNQUFNLFNBQVMsR0FBRyxFQUFFLENBQUM7QUFFNUI7QUFFTyxNQUFNLGFBQWEsR0FBRyxFQUFFLENBQUM7QUFFekIsTUFBTSxjQUFjLEdBQUcsRUFBRTs7QUN6QmhDOztBQUVHO0FBQ0ksTUFBTSxRQUFRLEdBQUcsQ0FBQyxRQUFrQixLQUFjO0lBQ3JELFFBQVEsQ0FBQyxRQUFRLEdBQUcsYUFBYSxJQUFJLEdBQUcsRUFBYztBQUMxRCxDQUFDLENBQUM7QUFFRjs7QUFFRztBQUNJLE1B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
