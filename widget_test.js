define(['exports', 'react/jsx-runtime', 'react'], (function (exports, jsxRuntime, react) { 'use strict';

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
        return (jsxRuntime.jsx("div", { onMouseDown: onMouseDown, style: {
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
        return (jsxRuntime.jsxs("div", { style: {
                position: "absolute",
                left: item.x,
                top: item.y
            }, children: [jsxRuntime.jsx("div", { "data-id": item.id, onMouseDown: onMouseDown, style: {
                        width: size.width,
                        height: size.height,
                        backgroundColor: item.color,
                        cursor: item.isLocked ? "not-allowed" : "move",
                        userSelect: "none",
                        border,
                        boxSizing: "border-box"
                    } }), jsxRuntime.jsxs("div", { style: {
                        position: "absolute",
                        top: size.height + 4,
                        left: 0,
                        whiteSpace: "nowrap",
                        fontSize: 12,
                        pointerEvents: "none"
                    }, children: [item.name, jsxRuntime.jsx("br", {}), "id: ", item.id, jsxRuntime.jsx("br", {}), "pos: (", item.x, ", ", item.y, ")", jsxRuntime.jsx("br", {}), "size: ", item.width, " \u00D7 ", item.height, jsxRuntime.jsx("br", {}), "rotation: ", item.rotation, "\u00B0", item.heightM && jsxRuntime.jsx("br", {}), item.heightM && `height: ${item.heightM}m`, item.weightKg && jsxRuntime.jsx("br", {}), item.weightKg && `weight: ${item.weightKg}kg`] }), jsxRuntime.jsx(RotationHandle, { onMouseDown: e => {
                        e.stopPropagation();
                        onRotate(item.id);
                    } })] }));
    };

    // PalletList — debug view showing available cargo items draggable onto canvas
    const PalletList = ({ pallets, onAddPallet }) => {
        if (pallets.length === 0) {
            return (jsxRuntime.jsx("div", { style: {
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
        return (jsxRuntime.jsx("div", { style: {
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
            }, children: pallets.map((pallet) => (jsxRuntime.jsxs("div", { draggable: true, onDragStart: (e) => {
                    // Set the pallet ID as drag data
                    e.dataTransfer.setData("text/plain", pallet.id);
                    e.dataTransfer.effectAllowed = "move";
                }, onClick: () => onAddPallet(pallet), style: {
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: "grab",
                    userSelect: "none",
                }, title: `Drag ${pallet.name} onto canvas`, children: [jsxRuntime.jsx("div", { style: {
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
                        }, children: pallet.type === "pallet" ? "📦" : "📦" }), jsxRuntime.jsx("span", { style: { fontSize: 10, marginTop: 2, color: "#333" }, children: pallet.name }), jsxRuntime.jsxs("span", { style: { fontSize: 8, color: "#666" }, children: [pallet.width, "\u00D7", pallet.height] })] }, pallet.id))) }));
    };

    /**
     * GridOverlay — renders a subtle grid pattern on the canvas to visualize
     * the grid snapping. The grid is rendered as a CSS background pattern
     * so it doesn't interfere with drag-and-drop or mouse events.
     */
    const GridOverlay = ({ width, height, gridSize = GRID_SIZE }) => {
        // Generate a grid background using a canvas element for crisp lines
        const gridImageUrl = react.useMemo(() => {
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
        return (jsxRuntime.jsx("div", { style: {
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
        react.useEffect(() => {
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
        const [state, setState] = react.useState(() => manager.getState());
        react.useEffect(() => {
            const unsubscribe = manager.subscribe(currentState => {
                setState(currentState);
            });
            return unsubscribe;
        }, [manager]);
        return state;
    };

    const useCanvasActions = (dispatcher) => {
        return {
            startDrag: react.useCallback((itemId, mouse) => {
                dispatcher.dispatch({ type: "START_DRAG", activeId: itemId, mouse });
            }, [dispatcher]),
            dragMove: react.useCallback((mouse) => {
                dispatcher.dispatch({ type: "DRAG_MOVE", mouse });
            }, [dispatcher]),
            endDrag: react.useCallback(() => {
                dispatcher.dispatch({ type: "END_DRAG" });
            }, [dispatcher]),
            rotateItem: react.useCallback((itemId) => {
                dispatcher.dispatch({ type: "ROTATE", itemId });
            }, [dispatcher]),
            addItem: react.useCallback((item) => {
                dispatcher.dispatch({ type: "ADD_ITEM", item });
            }, [dispatcher]),
            setItems: react.useCallback((items) => {
                dispatcher.dispatch({ type: "SET_ITEMS", items });
            }, [dispatcher]),
            deselect: react.useCallback(() => {
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
        const collisionEngine = react.useMemo(() => new CollisionEngine(), []);
        const snapEngine = react.useMemo(() => new SnapEngine(), []);
        const dragEngine = react.useMemo(() => new DragEngine(initialItems, collisionEngine, snapEngine), [initialItems, collisionEngine, snapEngine]);
        const validationEngine = react.useMemo(() => new ValidationEngine(), []);
        const stateManager = react.useMemo(() => new CanvasStateManager(createInitialCanvasState(initialItems, scale, trailer)), [initialItems, scale, trailer]);
        const actionDispatcher = react.useMemo(() => new CanvasActionDispatcher(stateManager, {
            canvasWidth,
            canvasHeight,
            dragEngine,
            validationEngine,
        }), [canvasWidth, canvasHeight, stateManager, dragEngine, validationEngine]);
        const state = useCanvasState(stateManager);
        const actions = useCanvasActions(actionDispatcher);
        const [dragging, setDragging] = react.useState(false);
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
        react.useEffect(() => {
            dragEngine.updateItems(state.cargos);
        }, [state.cargos, dragEngine]);
        react.useEffect(() => {
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
        const canvasRef = react.useRef(null);
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
        const [addedPalletIds, setAddedPalletIds] = react.useState(new Set());
        // Available pallets = palletList minus those already added to canvas
        const availablePallets = palletList.filter(p => !addedPalletIds.has(p.id));
        // --- Restore items when loaded from plan ---
        // The useTrailerCanvas hook already handles initialItems changes via its
        // own useEffect, but we also set items directly when a plan is loaded
        // after the initial render to ensure the canvas reflects the saved state.
        react.useEffect(() => {
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
            return (jsxRuntime.jsx("div", { style: {
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
        return (jsxRuntime.jsxs("div", { ref: canvasRef, onMouseDown: handleCanvasMouseDown, onDrop: handlePalletDrop, onDragOver: handlePalletDragOver, style: {
                position: "relative",
                width: canvasWidth,
                height: canvasHeight,
                margin: DEFAULT_MARGIN,
                overflow: "hidden",
                border: CANVAS_BORDER,
                backgroundColor: CANVAS_BACKGROUND_COLOR
            }, children: [jsxRuntime.jsx(GridOverlay, { width: canvasWidth, height: canvasHeight, gridSize: GRID_SIZE }), trailer && (jsxRuntime.jsx("div", { style: {
                        position: "absolute",
                        left: trailer.x,
                        top: trailer.y,
                        width: trailer.width,
                        height: trailer.height,
                        border: "2px dashed #888",
                        boxSizing: "border-box",
                        pointerEvents: "none"
                    } })), jsxRuntime.jsxs("div", { style: {
                        position: "absolute",
                        top: INFO_PANEL_TOP,
                        left: INFO_PANEL_LEFT,
                        zIndex: INFO_PANEL_Z_INDEX,
                        background: INFO_PANEL_BACKGROUND,
                        padding: INFO_PANEL_PADDING,
                        border: INFO_PANEL_BORDER
                    }, children: [jsxRuntime.jsxs("div", { children: ["Active: ", activeItemId ?? "None"] }), jsxRuntime.jsxs("div", { children: ["Validation:", " ", jsxRuntime.jsx("span", { style: { color: validation?.valid ? "green" : "red", fontWeight: "bold" }, children: validation?.valid ? "OK" : "Issue" })] }), validation?.errors.length > 0 && (jsxRuntime.jsx("ul", { style: { margin: 0, paddingLeft: 16 }, children: validation.errors.map(error => (jsxRuntime.jsx("li", { style: { color: "red", fontSize: 12 }, children: error }, error))) })), jsxRuntime.jsxs("div", { style: { marginTop: 8 }, children: [jsxRuntime.jsx("button", { onClick: handleSavePlan, style: { marginRight: 8 }, children: "Save Plan" }), jsxRuntime.jsx("button", { onClick: handleLoadPlan, children: "Load Plan" })] })] }), jsxRuntime.jsx(PalletList, { pallets: availablePallets, onAddPallet: (pallet) => {
                        // Add pallet to canvas at a default position
                        const newItem = { ...pallet, x: 50, y: 50 };
                        setAddedPalletIds(prev => new Set([...prev, pallet.id]));
                        addItem(newItem);
                    } }), items.map(item => (jsxRuntime.jsx(CargoCard, { item: item, isActive: activeItemId === item.id, selectedIds: selectedIds, hasError: getItemErrors(item.id).length > 0, onMouseDown: e => handleMouseDown(e, item.id), onRotate: handleRotate }, item.id)))] }));
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
        const [trailerItem, setTrailerItem] = react.useState(null);
        const [palletList, setPalletList] = react.useState([]);
        const [initialCanvasItems, setInitialCanvasItems] = react.useState([]);
        const [scale, setScale] = react.useState(1);
        const [truckGuid, setTruckGuid] = react.useState(null);
        const [isLoading, setIsLoading] = react.useState(true);
        // --- Load truck data and compute scale ---
        // We need the truck data to compute the scale, but we also need the scale
        // to convert truck data to a TrailerItem. So we first load the raw truck data,
        // compute the scale, then convert to a TrailerItem.
        react.useEffect(() => {
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
        react.useEffect(() => {
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
        react.useEffect(() => {
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
        const handleSavePlan = react.useCallback(async (items, currentScale) => {
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
        const handleLoadPlan = react.useCallback(() => {
            if (onLoadPlanCallback) {
                onLoadPlanCallback();
            }
        }, [onLoadPlanCallback]);
        // --- Build view model props for the widget ---
        const viewModel = react.useMemo(() => ({
            trailer: trailerItem,
            palletList,
            initialCanvasItems,
            scale,
            canvasWidth,
            canvasHeight,
            onSavePlan: handleSavePlan,
            onLoadPlan: handleLoadPlan,
        }), [trailerItem, palletList, initialCanvasItems, scale, canvasWidth, canvasHeight, handleSavePlan, handleLoadPlan]);
        return jsxRuntime.jsx(LoadingCanvas, { viewModel: viewModel, isLoading: isLoading });
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

    exports.LoadingCanvasContainer = LoadingCanvasContainer;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9hZGluZ0NhbnZhcy5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL2NvbnN0YW50cy9jYW52YXMudHMiLCIuLi8uLi8uLi8uLi8uLi9zcmMvZG9tYWluL3JvdGF0aW9uUnVsZXMudHMiLCIuLi8uLi8uLi8uLi8uLi9zcmMvY29tcG9uZW50cy9Sb3RhdGlvbkhhbmRsZS50c3giLCIuLi8uLi8uLi8uLi8uLi9zcmMvY29uc3RhbnRzL2NhcmQudHMiLCIuLi8uLi8uLi8uLi8uLi9zcmMvY29tcG9uZW50cy9DYXJnb0NhcmQudHN4IiwiLi4vLi4vLi4vLi4vLi4vc3JjL2NvbXBvbmVudHMvUGFsbGV0TGlzdC50c3giLCIuLi8uLi8uLi8uLi8uLi9zcmMvY29tcG9uZW50cy9HcmlkT3ZlcmxheS50c3giLCIuLi8uLi8uLi8uLi8uLi9zcmMvZG9tYWluL2JvdW5kYXJ5UnVsZXMudHMiLCIuLi8uLi8uLi8uLi8uLi9zcmMvZG9tYWluL3NuYXBSdWxlcy50cyIsIi4uLy4uLy4uLy4uLy4uL3NyYy9kb21haW4vZHJhZ1J1bGVzLnRzIiwiLi4vLi4vLi4vLi4vLi4vc3JjL2VuZ2luZXMvRHJhZ0VuZ2luZS50cyIsIi4uLy4uLy4uLy4uLy4uL3NyYy9kb21haW4vZ2VvbWV0cnlSdWxlcy50cyIsIi4uLy4uLy4uLy4uLy4uL3NyYy9lbmdpbmVzL0NvbGxpc2lvbkVuZ2luZS50cyIsIi4uLy4uLy4uLy4uLy4uL3NyYy9lbmdpbmVzL1NuYXBFbmdpbmUudHMiLCIuLi8uLi8uLi8uLi8uLi9zcmMvZG9tYWluL3ZhbGlkYXRpb25SdWxlcy50cyIsIi4uLy4uLy4uLy4uLy4uL3NyYy9lbmdpbmVzL1ZhbGlkYXRpb25FbmdpbmUudHMiLCIuLi8uLi8uLi8uLi8uLi9zcmMvaG9va3MvdXNlTW91c2VFdmVudHMudHMiLCIuLi8uLi8uLi8uLi8uLi9zcmMvc3RhdGUvQ2FudmFzU3RhdGVNYW5hZ2VyLnRzIiwiLi4vLi4vLi4vLi4vLi4vc3JjL3N0YXRlL0NhbnZhc0FjdGlvbkRpc3BhdGNoZXIudHMiLCIuLi8uLi8uLi8uLi8uLi9zcmMvaG9va3MvdXNlQ2FudmFzU3RhdGUudHMiLCIuLi8uLi8uLi8uLi8uLi9zcmMvaG9va3MvdXNlQ2FudmFzQWN0aW9ucy50cyIsIi4uLy4uLy4uLy4uLy4uL3NyYy9kb21haW4vY29vcmRpbmF0ZVJ1bGVzLnRzIiwiLi4vLi4vLi4vLi4vLi4vc3JjL2hvb2tzL3VzZVRyYWlsZXJDYW52YXMudHMiLCIuLi8uLi8uLi8uLi8uLi9zcmMvY29uc3RhbnRzL3RoZW1lLnRzIiwiLi4vLi4vLi4vLi4vLi4vc3JjL3dpZGdldC9Mb2FkaW5nQ2FudmFzLnRzeCIsIi4uLy4uLy4uLy4uLy4uL3NyYy9hZGFwdGVycy90cmFpbGVyQWRhcHRlci50cyIsIi4uLy4uLy4uLy4uLy4uL3NyYy9hZGFwdGVycy9zdGF0ZUFkYXB0ZXIudHMiLCIuLi8uLi8uLi8uLi8uLi9zcmMvYWRhcHRlcnMvY2FyZ29BZGFwdGVyLnRzIiwiLi4vLi4vLi4vLi4vLi4vc3JjL2FkYXB0ZXJzL21lbmRpeERhdGFBZGFwdGVyLnRzIiwiLi4vLi4vLi4vLi4vLi4vc3JjL3dpZGdldC9Mb2FkaW5nQ2FudmFzLmNvbnRhaW5lci50c3giXSwic291cmNlc0NvbnRlbnQiOlsiLy8gY29uc3RhbnRzIGZvciByZW5kZXJpbmcsIGNvb3JkaW5hdGUsIHZpZXdwb3J0LCBzY2FsZSwgZ3JpZCwgYW5kIHJvdGF0aW9uXG4vLyBjYW52YXNcblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfQ0FOVkFTX1dJRFRIID0gMTAwMDtcbmV4cG9ydCBjb25zdCBERUZBVUxUX0NBTlZBU19IRUlHSFQgPSA2MDA7XG5leHBvcnQgY29uc3QgQ0FOVkFTX0JPUkRFUiA9IFwiMnB4IHNvbGlkIGJsYWNrXCI7XG5cbi8vIGxheW91dFxuXG5leHBvcnQgY29uc3QgREVGQVVMVF9NQVJHSU4gPSBcIjIwcHggYXV0b1wiO1xuXG4vLyBvdmVybGF5XG5cbmV4cG9ydCBjb25zdCBJTkZPX1BBTkVMX1RPUCA9IDEwO1xuZXhwb3J0IGNvbnN0IElORk9fUEFORUxfTEVGVCA9IDEwO1xuZXhwb3J0IGNvbnN0IElORk9fUEFORUxfWl9JTkRFWCA9IDEwMDA7XG5leHBvcnQgY29uc3QgSU5GT19QQU5FTF9QQURESU5HID0gXCI0cHggOHB4XCI7XG5leHBvcnQgY29uc3QgSU5GT19QQU5FTF9CQUNLR1JPVU5EID0gXCIjZmZmXCI7XG5leHBvcnQgY29uc3QgSU5GT19QQU5FTF9CT1JERVIgPSBcIjFweCBzb2xpZCAjZGRkXCI7XG5cbi8vIGdyaWRcblxuZXhwb3J0IGNvbnN0IEdSSURfU0laRSA9IDIwO1xuXG4vLyByb3RhdGlvblxuXG5leHBvcnQgY29uc3QgUk9UQVRJT05fU1RFUCA9IDkwO1xuXG5leHBvcnQgY29uc3QgU05BUF9USFJFU0hPTEQgPSAxNTtcbiIsImltcG9ydCB0eXBlIHsgUm90YXRpb24sIFNpemUgfSBmcm9tIFwiLi4vdHlwZXMvZ2VvbWV0cnlcIjtcbmltcG9ydCB7IFJPVEFUSU9OX1NURVAgfSBmcm9tIFwiLi4vY29uc3RhbnRzL2NhbnZhc1wiO1xuXG4vKipcbiAqIFJvdGF0ZSBjbG9ja3dpc2UgOTAgZGVncmVlc1xuICovXG5leHBvcnQgY29uc3Qgcm90YXRlOTAgPSAocm90YXRpb246IFJvdGF0aW9uKTogUm90YXRpb24gPT4ge1xuICAgIHJldHVybiAoKHJvdGF0aW9uICsgUk9UQVRJT05fU1RFUCkgJSAzNjApIGFzIFJvdGF0aW9uO1xufTtcblxuLyoqXG4gKiBDaGVjayBpZiBvYmplY3QgaXMgdmlzdWFsbHkgdmVydGljYWxcbiAqL1xuZXhwb3J0IGNvbnN0IGlzVmVydGljYWxSb3RhdGlvbiA9IChyb3RhdGlvbjogUm90YXRpb24pOiBib29sZWFuID0+IHtcbiAgICByZXR1cm4gcm90YXRpb24gPT09IDkwIHx8IHJvdGF0aW9uID09PSAyNzA7XG59O1xuXG4vKipcbiAqIEdldCByZW5kZXJlZCBzaXplIGFmdGVyIHJvdGF0aW9uXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRSb3RhdGVkU2l6ZSA9IChzaXplOiBTaXplLCByb3RhdGlvbjogUm90YXRpb24pOiBTaXplID0+IHtcbiAgICBpZiAoaXNWZXJ0aWNhbFJvdGF0aW9uKHJvdGF0aW9uKSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgd2lkdGg6IHNpemUuaGVpZ2h0LFxuICAgICAgICAgICAgaGVpZ2h0OiBzaXplLndpZHRoXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHNpemU7XG59O1xuIiwiaW1wb3J0IHR5cGUgeyBGQywgTW91c2VFdmVudCB9IGZyb20gXCJyZWFjdFwiO1xuXG5pbnRlcmZhY2UgUm90YXRpb25IYW5kbGVQcm9wcyB7XG4gICAgb25Nb3VzZURvd246IChlOiBNb3VzZUV2ZW50PEhUTUxEaXZFbGVtZW50PikgPT4gdm9pZDtcbn1cblxuZXhwb3J0IGNvbnN0IFJvdGF0aW9uSGFuZGxlOiBGQzxSb3RhdGlvbkhhbmRsZVByb3BzPiA9ICh7IG9uTW91c2VEb3duIH0pID0+IHtcbiAgICByZXR1cm4gKFxuICAgICAgICA8ZGl2XG4gICAgICAgICAgICBvbk1vdXNlRG93bj17b25Nb3VzZURvd259XG4gICAgICAgICAgICBzdHlsZT17e1xuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBcImFic29sdXRlXCIsXG4gICAgICAgICAgICAgICAgdG9wOiA0LFxuICAgICAgICAgICAgICAgIGxlZnQ6IFwiNTAlXCIsXG4gICAgICAgICAgICAgICAgdHJhbnNmb3JtOiBcInRyYW5zbGF0ZVgoLTUwJSlcIixcbiAgICAgICAgICAgICAgICB3aWR0aDogMTYsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiAxNixcbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IFwidHJhbnNwYXJlbnRcIixcbiAgICAgICAgICAgICAgICBib3JkZXJSYWRpdXM6IFwiNTAlXCIsXG4gICAgICAgICAgICAgICAgY3Vyc29yOiBcImdyYWJcIixcbiAgICAgICAgICAgICAgICBkaXNwbGF5OiBcImZsZXhcIixcbiAgICAgICAgICAgICAgICBhbGlnbkl0ZW1zOiBcImNlbnRlclwiLFxuICAgICAgICAgICAgICAgIGp1c3RpZnlDb250ZW50OiBcImNlbnRlclwiLFxuICAgICAgICAgICAgICAgIGNvbG9yOiBcIiM0YTkwZDlcIixcbiAgICAgICAgICAgICAgICBmb250U2l6ZTogMTYsXG4gICAgICAgICAgICAgICAgZm9udFdlaWdodDogXCJib2xkXCIsXG4gICAgICAgICAgICAgICAgYm9yZGVyOiBcIjJweCBzb2xpZCAjNGE5MGQ5XCIsXG4gICAgICAgICAgICAgICAgYm94U2hhZG93OiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICB6SW5kZXg6IDEwXG4gICAgICAgICAgICB9fVxuICAgICAgICAgICAgdGl0bGU9XCJSb3RhdGVcIlxuICAgICAgICA+XG4gICAgICAgICAgICDihrtcbiAgICAgICAgPC9kaXY+XG4gICAgKTtcbn07XG4iLCIvLyBjYXJkXG5cbmV4cG9ydCBjb25zdCBDQVJEX0JPUkRFUl9XSURUSCA9IDE7XG5cbmV4cG9ydCBjb25zdCBDQVJEX1NFTEVDVEVEX0JPUkRFUl9XSURUSCA9IDM7XG5cbmV4cG9ydCBjb25zdCBDQVJEX0FDVElWRV9CT1JERVJfV0lEVEggPSAzO1xuXG5leHBvcnQgY29uc3QgQ0FSRF9CT1JERVJfQ09MT1IgPSBcImdyYXlcIjtcblxuZXhwb3J0IGNvbnN0IENBUkRfU0VMRUNURURfQk9SREVSX0NPTE9SID0gXCJibHVlXCI7XG5cbmV4cG9ydCBjb25zdCBDQVJEX0FDVElWRV9CT1JERVJfQ09MT1IgPSBcInJlZFwiO1xuIiwiaW1wb3J0IFJlYWN0IGZyb20gXCJyZWFjdFwiO1xuXG5pbXBvcnQgdHlwZSB7IENhcmdvSXRlbSB9IGZyb20gXCIuLi92aWV3TW9kZWxzL0NhcmdvSXRlbVwiO1xuXG5pbXBvcnQgeyBnZXRSb3RhdGVkU2l6ZSB9IGZyb20gXCIuLi9kb21haW4vcm90YXRpb25SdWxlc1wiO1xuXG5pbXBvcnQgeyBSb3RhdGlvbkhhbmRsZSB9IGZyb20gXCIuL1JvdGF0aW9uSGFuZGxlXCI7XG5cbmltcG9ydCB7XG4gICAgQ0FSRF9BQ1RJVkVfQk9SREVSX1dJRFRILFxuICAgIENBUkRfQk9SREVSX1dJRFRILFxuICAgIENBUkRfU0VMRUNURURfQk9SREVSX1dJRFRILFxuICAgIENBUkRfQk9SREVSX0NPTE9SLFxuICAgIENBUkRfQUNUSVZFX0JPUkRFUl9DT0xPUixcbiAgICBDQVJEX1NFTEVDVEVEX0JPUkRFUl9DT0xPUlxufSBmcm9tIFwiLi4vY29uc3RhbnRzL2NhcmRcIjtcblxuaW50ZXJmYWNlIENhcmdvQ2FyZFByb3BzIHtcbiAgICBpdGVtOiBDYXJnb0l0ZW07XG5cbiAgICBpc0FjdGl2ZTogYm9vbGVhbjtcblxuICAgIHNlbGVjdGVkSWRzOiBzdHJpbmdbXTtcblxuICAgIG9uTW91c2VEb3duOiAoZTogUmVhY3QuTW91c2VFdmVudDxIVE1MRGl2RWxlbWVudD4pID0+IHZvaWQ7XG5cbiAgICBvblJvdGF0ZTogKGl0ZW1JZDogc3RyaW5nKSA9PiB2b2lkO1xuXG4gICAgaGFzRXJyb3I6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjb25zdCBDYXJnb0NhcmQ6IFJlYWN0LkZDPENhcmdvQ2FyZFByb3BzPiA9ICh7XG4gICAgaXRlbSxcbiAgICBpc0FjdGl2ZSxcbiAgICBzZWxlY3RlZElkcyxcbiAgICBvbk1vdXNlRG93bixcbiAgICBvblJvdGF0ZSxcbiAgICBoYXNFcnJvclxufSkgPT4ge1xuICAgIGNvbnN0IHNpemUgPSBnZXRSb3RhdGVkU2l6ZShcbiAgICAgICAge1xuICAgICAgICAgICAgd2lkdGg6IGl0ZW0ud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQ6IGl0ZW0uaGVpZ2h0XG4gICAgICAgIH0sXG4gICAgICAgIGl0ZW0ucm90YXRpb25cbiAgICApO1xuXG4gICAgY29uc3QgaXNTZWxlY3RlZCA9IHNlbGVjdGVkSWRzLmluY2x1ZGVzKGl0ZW0uaWQpO1xuXG4gICAgY29uc3QgYm9yZGVyQ29sb3IgPSBoYXNFcnJvciA/IFwiI2ZmNDQ0NFwiIDogQ0FSRF9CT1JERVJfQ09MT1I7XG5cbiAgICBjb25zdCBib3JkZXIgPSBpc0FjdGl2ZVxuICAgICAgICA/IGAke0NBUkRfQUNUSVZFX0JPUkRFUl9XSURUSH1weCBzb2xpZCAke0NBUkRfQUNUSVZFX0JPUkRFUl9DT0xPUn1gXG4gICAgICAgIDogaXNTZWxlY3RlZFxuICAgICAgICA/IGAke0NBUkRfU0VMRUNURURfQk9SREVSX1dJRFRIfXB4IHNvbGlkICR7Q0FSRF9TRUxFQ1RFRF9CT1JERVJfQ09MT1J9YFxuICAgICAgICA6IGAke0NBUkRfQk9SREVSX1dJRFRIfXB4IHNvbGlkICR7Ym9yZGVyQ29sb3J9YDtcblxuICAgIHJldHVybiAoXG4gICAgICAgIDxkaXZcbiAgICAgICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgICAgICAgcG9zaXRpb246IFwiYWJzb2x1dGVcIixcblxuICAgICAgICAgICAgICAgIGxlZnQ6IGl0ZW0ueCxcblxuICAgICAgICAgICAgICAgIHRvcDogaXRlbS55XG4gICAgICAgICAgICB9fVxuICAgICAgICA+XG4gICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgZGF0YS1pZD17aXRlbS5pZH1cbiAgICAgICAgICAgICAgICBvbk1vdXNlRG93bj17b25Nb3VzZURvd259XG4gICAgICAgICAgICAgICAgc3R5bGU9e3tcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHNpemUud2lkdGgsXG5cbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBzaXplLmhlaWdodCxcblxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IGl0ZW0uY29sb3IsXG5cbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yOiBpdGVtLmlzTG9ja2VkID8gXCJub3QtYWxsb3dlZFwiIDogXCJtb3ZlXCIsXG5cbiAgICAgICAgICAgICAgICAgICAgdXNlclNlbGVjdDogXCJub25lXCIsXG5cbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyLFxuXG4gICAgICAgICAgICAgICAgICAgIGJveFNpemluZzogXCJib3JkZXItYm94XCJcbiAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgLz5cblxuICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBcImFic29sdXRlXCIsXG5cbiAgICAgICAgICAgICAgICAgICAgdG9wOiBzaXplLmhlaWdodCArIDQsXG5cbiAgICAgICAgICAgICAgICAgICAgbGVmdDogMCxcblxuICAgICAgICAgICAgICAgICAgICB3aGl0ZVNwYWNlOiBcIm5vd3JhcFwiLFxuXG4gICAgICAgICAgICAgICAgICAgIGZvbnRTaXplOiAxMixcblxuICAgICAgICAgICAgICAgICAgICBwb2ludGVyRXZlbnRzOiBcIm5vbmVcIlxuICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAge2l0ZW0ubmFtZX1cbiAgICAgICAgICAgICAgICA8YnIgLz5cbiAgICAgICAgICAgICAgICBpZDoge2l0ZW0uaWR9XG4gICAgICAgICAgICAgICAgPGJyIC8+XG4gICAgICAgICAgICAgICAgcG9zOiAoe2l0ZW0ueH0sIHtpdGVtLnl9KVxuICAgICAgICAgICAgICAgIDxiciAvPlxuICAgICAgICAgICAgICAgIHNpemU6IHtpdGVtLndpZHRofSDDlyB7aXRlbS5oZWlnaHR9XG4gICAgICAgICAgICAgICAgPGJyIC8+XG4gICAgICAgICAgICAgICAgcm90YXRpb246IHtpdGVtLnJvdGF0aW9ufcKwe2l0ZW0uaGVpZ2h0TSAmJiA8YnIgLz59XG4gICAgICAgICAgICAgICAge2l0ZW0uaGVpZ2h0TSAmJiBgaGVpZ2h0OiAke2l0ZW0uaGVpZ2h0TX1tYH1cbiAgICAgICAgICAgICAgICB7aXRlbS53ZWlnaHRLZyAmJiA8YnIgLz59XG4gICAgICAgICAgICAgICAge2l0ZW0ud2VpZ2h0S2cgJiYgYHdlaWdodDogJHtpdGVtLndlaWdodEtnfWtnYH1cbiAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICA8Um90YXRpb25IYW5kbGVcbiAgICAgICAgICAgICAgICBvbk1vdXNlRG93bj17ZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIG9uUm90YXRlKGl0ZW0uaWQpO1xuICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAvPlxuICAgICAgICA8L2Rpdj5cbiAgICApO1xufTtcbiIsImltcG9ydCB0eXBlIHsgRkMgfSBmcm9tIFwicmVhY3RcIjtcbmltcG9ydCB0eXBlIHsgQ2FyZ29JdGVtIH0gZnJvbSBcIi4uL3ZpZXdNb2RlbHMvQ2FyZ29JdGVtXCI7XG5cbmludGVyZmFjZSBQYWxsZXRMaXN0UHJvcHMge1xuICBwYWxsZXRzOiBDYXJnb0l0ZW1bXTsgLy8gQ2FyZ28gaXRlbXMgYXZhaWxhYmxlIHRvIGRyYWcgb250byBjYW52YXNcbiAgb25BZGRQYWxsZXQ6IChwYWxsZXQ6IENhcmdvSXRlbSkgPT4gdm9pZDsgLy8gQ2FsbGVkIHdoZW4gcGFsbGV0IGlzIGRyYWdnZWQgb250byBjYW52YXNcbn1cblxuLy8gUGFsbGV0TGlzdCDigJQgZGVidWcgdmlldyBzaG93aW5nIGF2YWlsYWJsZSBjYXJnbyBpdGVtcyBkcmFnZ2FibGUgb250byBjYW52YXNcbmV4cG9ydCBjb25zdCBQYWxsZXRMaXN0OiBGQzxQYWxsZXRMaXN0UHJvcHM+ID0gKHsgcGFsbGV0cywgb25BZGRQYWxsZXQgfSkgPT4ge1xuICBpZiAocGFsbGV0cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gKFxuICAgICAgPGRpdlxuICAgICAgICBzdHlsZT17e1xuICAgICAgICAgIHBvc2l0aW9uOiBcImFic29sdXRlXCIsXG4gICAgICAgICAgYm90dG9tOiAxMCxcbiAgICAgICAgICBsZWZ0OiAxMCxcbiAgICAgICAgICBwYWRkaW5nOiBcIjRweCA4cHhcIixcbiAgICAgICAgICBiYWNrZ3JvdW5kOiBcInJnYmEoMjU1LCAyNTUsIDI1NSwgMC44KVwiLFxuICAgICAgICAgIGJvcmRlcjogXCIxcHggc29saWQgI2RkZFwiLFxuICAgICAgICAgIGJvcmRlclJhZGl1czogNCxcbiAgICAgICAgICBmb250U2l6ZTogMTIsXG4gICAgICAgICAgY29sb3I6IFwiIzY2NlwiLFxuICAgICAgICB9fT5cbiAgICAgICAgTm8gcGFsbGV0cyBhdmFpbGFibGVcbiAgICAgIDwvZGl2PlxuICAgICk7XG4gIH1cblxuICByZXR1cm4gKFxuICAgIDxkaXZcbiAgICAgIHN0eWxlPXt7XG4gICAgICAgIHBvc2l0aW9uOiBcImFic29sdXRlXCIsXG4gICAgICAgIGJvdHRvbTogMTAsXG4gICAgICAgIGxlZnQ6IDEwLFxuICAgICAgICBkaXNwbGF5OiBcImZsZXhcIixcbiAgICAgICAgZ2FwOiA4LFxuICAgICAgICBwYWRkaW5nOiBcIjhweCAxMnB4XCIsXG4gICAgICAgIGJhY2tncm91bmQ6IFwicmdiYSgyNTUsIDI1NSwgMjU1LCAwLjkpXCIsXG4gICAgICAgIGJvcmRlcjogXCIxcHggc29saWQgI2RkZFwiLFxuICAgICAgICBib3JkZXJSYWRpdXM6IDQsXG4gICAgICAgIHpJbmRleDogMTAwMCxcbiAgICAgIH19PlxuICAgICAge3BhbGxldHMubWFwKChwYWxsZXQpID0+IChcbiAgICAgICAgPGRpdlxuICAgICAgICAgIGtleT17cGFsbGV0LmlkfVxuICAgICAgICAgIGRyYWdnYWJsZVxuICAgICAgICAgIG9uRHJhZ1N0YXJ0PXsoZSkgPT4ge1xuICAgICAgICAgICAgLy8gU2V0IHRoZSBwYWxsZXQgSUQgYXMgZHJhZyBkYXRhXG4gICAgICAgICAgICBlLmRhdGFUcmFuc2Zlci5zZXREYXRhKFwidGV4dC9wbGFpblwiLCBwYWxsZXQuaWQpO1xuICAgICAgICAgICAgZS5kYXRhVHJhbnNmZXIuZWZmZWN0QWxsb3dlZCA9IFwibW92ZVwiO1xuICAgICAgICAgIH19XG4gICAgICAgICAgb25DbGljaz17KCkgPT4gb25BZGRQYWxsZXQocGFsbGV0KX1cbiAgICAgICAgICBzdHlsZT17e1xuICAgICAgICAgICAgZGlzcGxheTogXCJmbGV4XCIsXG4gICAgICAgICAgICBmbGV4RGlyZWN0aW9uOiBcImNvbHVtblwiLFxuICAgICAgICAgICAgYWxpZ25JdGVtczogXCJjZW50ZXJcIixcbiAgICAgICAgICAgIGN1cnNvcjogXCJncmFiXCIsXG4gICAgICAgICAgICB1c2VyU2VsZWN0OiBcIm5vbmVcIixcbiAgICAgICAgICB9fVxuICAgICAgICAgIHRpdGxlPXtgRHJhZyAke3BhbGxldC5uYW1lfSBvbnRvIGNhbnZhc2B9PlxuICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgICAgIHdpZHRoOiA0MCxcbiAgICAgICAgICAgICAgaGVpZ2h0OiA0MCxcbiAgICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBwYWxsZXQuY29sb3IsXG4gICAgICAgICAgICAgIGJvcmRlcjogXCIycHggc29saWQgIzMzM1wiLFxuICAgICAgICAgICAgICBib3JkZXJSYWRpdXM6IDQsXG4gICAgICAgICAgICAgIGJveFNpemluZzogXCJib3JkZXItYm94XCIsXG4gICAgICAgICAgICAgIGRpc3BsYXk6IFwiZmxleFwiLFxuICAgICAgICAgICAgICBhbGlnbkl0ZW1zOiBcImNlbnRlclwiLFxuICAgICAgICAgICAgICBqdXN0aWZ5Q29udGVudDogXCJjZW50ZXJcIixcbiAgICAgICAgICAgICAgZm9udFNpemU6IDgsXG4gICAgICAgICAgICAgIGNvbG9yOiBcIiNmZmZcIixcbiAgICAgICAgICAgICAgZm9udFdlaWdodDogXCJib2xkXCIsXG4gICAgICAgICAgICB9fT5cbiAgICAgICAgICAgIHtwYWxsZXQudHlwZSA9PT0gXCJwYWxsZXRcIiA/IFwi8J+TplwiIDogXCLwn5OmXCJ9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPHNwYW4gc3R5bGU9e3sgZm9udFNpemU6IDEwLCBtYXJnaW5Ub3A6IDIsIGNvbG9yOiBcIiMzMzNcIiB9fT57cGFsbGV0Lm5hbWV9PC9zcGFuPlxuICAgICAgICAgIDxzcGFuIHN0eWxlPXt7IGZvbnRTaXplOiA4LCBjb2xvcjogXCIjNjY2XCIgfX0+XG4gICAgICAgICAgICB7cGFsbGV0LndpZHRofcOXe3BhbGxldC5oZWlnaHR9XG4gICAgICAgICAgPC9zcGFuPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICkpfVxuICAgIDwvZGl2PlxuICApO1xufTtcbiIsImltcG9ydCB7IHVzZU1lbW8sIHR5cGUgRkMgfSBmcm9tIFwicmVhY3RcIjtcbmltcG9ydCB7IEdSSURfU0laRSB9IGZyb20gXCIuLi9jb25zdGFudHMvY2FudmFzXCI7XG5cbmludGVyZmFjZSBHcmlkT3ZlcmxheVByb3BzIHtcbiAgICB3aWR0aDogbnVtYmVyO1xuICAgIGhlaWdodDogbnVtYmVyO1xuICAgIGdyaWRTaXplPzogbnVtYmVyO1xufVxuXG4vKipcbiAqIEdyaWRPdmVybGF5IOKAlCByZW5kZXJzIGEgc3VidGxlIGdyaWQgcGF0dGVybiBvbiB0aGUgY2FudmFzIHRvIHZpc3VhbGl6ZVxuICogdGhlIGdyaWQgc25hcHBpbmcuIFRoZSBncmlkIGlzIHJlbmRlcmVkIGFzIGEgQ1NTIGJhY2tncm91bmQgcGF0dGVyblxuICogc28gaXQgZG9lc24ndCBpbnRlcmZlcmUgd2l0aCBkcmFnLWFuZC1kcm9wIG9yIG1vdXNlIGV2ZW50cy5cbiAqL1xuZXhwb3J0IGNvbnN0IEdyaWRPdmVybGF5OiBGQzxHcmlkT3ZlcmxheVByb3BzPiA9ICh7IHdpZHRoLCBoZWlnaHQsIGdyaWRTaXplID0gR1JJRF9TSVpFIH0pID0+IHtcbiAgICAvLyBHZW5lcmF0ZSBhIGdyaWQgYmFja2dyb3VuZCB1c2luZyBhIGNhbnZhcyBlbGVtZW50IGZvciBjcmlzcCBsaW5lc1xuICAgIGNvbnN0IGdyaWRJbWFnZVVybCA9IHVzZU1lbW8oKCkgPT4ge1xuICAgICAgICBjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO1xuICAgICAgICBjYW52YXMud2lkdGggPSBncmlkU2l6ZTtcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IGdyaWRTaXplO1xuICAgICAgICBjb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuICAgICAgICBpZiAoIWN0eCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgIH1cblxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMCwgMCwgMCwgMC4wNSlcIjtcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDE7XG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgY3R4Lm1vdmVUbygwLCAwKTtcbiAgICAgICAgY3R4LmxpbmVUbyhncmlkU2l6ZSwgZ3JpZFNpemUpO1xuICAgICAgICBjdHgubW92ZVRvKGdyaWRTaXplLCAwKTtcbiAgICAgICAgY3R4LmxpbmVUbygwLCBncmlkU2l6ZSk7XG4gICAgICAgIGN0eC5zdHJva2UoKTtcblxuICAgICAgICByZXR1cm4gY2FudmFzLnRvRGF0YVVSTCgpO1xuICAgIH0sIFtncmlkU2l6ZV0pO1xuXG4gICAgcmV0dXJuIChcbiAgICAgICAgPGRpdlxuICAgICAgICAgICAgc3R5bGU9e3tcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICAgICAgICAgIHRvcDogMCxcbiAgICAgICAgICAgICAgICBsZWZ0OiAwLFxuICAgICAgICAgICAgICAgIHdpZHRoLFxuICAgICAgICAgICAgICAgIGhlaWdodCxcbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kSW1hZ2U6IGB1cmwoXCIke2dyaWRJbWFnZVVybH1cIilgLFxuICAgICAgICAgICAgICAgIGJhY2tncm91bmRTaXplOiBgJHtncmlkU2l6ZX1weCAke2dyaWRTaXplfXB4YCxcbiAgICAgICAgICAgICAgICBwb2ludGVyRXZlbnRzOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICB6SW5kZXg6IDFcbiAgICAgICAgICAgIH19XG4gICAgICAgIC8+XG4gICAgKTtcbn07XG4iLCIvKipcbiAqIEtlZXAgYSBudW1lcmljIHZhbHVlIGluc2lkZSBhIHJhbmdlXG4gKi9cbmV4cG9ydCBjb25zdCBjbGFtcCA9ICh2YWx1ZTogbnVtYmVyLCBtaW46IG51bWJlciwgbWF4OiBudW1iZXIpOiBudW1iZXIgPT4ge1xuICAgIHJldHVybiBNYXRoLm1heChtaW4sIE1hdGgubWluKHZhbHVlLCBtYXgpKTtcbn07XG4iLCJleHBvcnQgY29uc3Qgc25hcFRvR3JpZCA9ICh2YWx1ZTogbnVtYmVyLCBncmlkU2l6ZTogbnVtYmVyKTogbnVtYmVyID0+IHtcbiAgICBpZiAoZ3JpZFNpemUgPD0gMCkge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIE1hdGgucm91bmQodmFsdWUgLyBncmlkU2l6ZSkgKiBncmlkU2l6ZTtcbn07XG5cbmV4cG9ydCBjb25zdCBzbmFwUG9zaXRpb24gPSAoeDogbnVtYmVyLCB5OiBudW1iZXIsIGdyaWRTaXplOiBudW1iZXIpOiB7IHg6IG51bWJlcjsgeTogbnVtYmVyIH0gPT4ge1xuICAgIHJldHVybiB7XG4gICAgICAgIHg6IHNuYXBUb0dyaWQoeCwgZ3JpZFNpemUpLFxuICAgICAgICB5OiBzbmFwVG9HcmlkKHksIGdyaWRTaXplKVxuICAgIH07XG59O1xuIiwiaW1wb3J0IHR5cGUgeyBQb2ludCwgUmVjdExpa2UgfSBmcm9tIFwiLi4vdHlwZXMvZ2VvbWV0cnlcIjtcbmltcG9ydCB7IGNsYW1wIH0gZnJvbSBcIi4vYm91bmRhcnlSdWxlc1wiO1xuaW1wb3J0IHsgc25hcFBvc2l0aW9uIH0gZnJvbSBcIi4vc25hcFJ1bGVzXCI7XG5pbXBvcnQgeyBHUklEX1NJWkUgfSBmcm9tIFwiLi4vY29uc3RhbnRzL2NhbnZhc1wiO1xuXG5leHBvcnQgY29uc3QgY2FsY3VsYXRlRHJhZ1Bvc2l0aW9uID0gPFQgZXh0ZW5kcyBSZWN0TGlrZT4oXG4gICAgaXRlbTogVCxcbiAgICBzdGFydFBvc2l0aW9uOiBQb2ludCxcbiAgICBkZWx0YVg6IG51bWJlcixcbiAgICBkZWx0YVk6IG51bWJlcixcbiAgICBjYW52YXNXaWR0aDogbnVtYmVyLFxuICAgIGNhbnZhc0hlaWdodDogbnVtYmVyLFxuICAgIGdyaWRTaXplOiBudW1iZXIgPSBHUklEX1NJWkVcbik6IFQgPT4ge1xuICAgIGNvbnN0IHRhcmdldCA9IHNuYXBQb3NpdGlvbihzdGFydFBvc2l0aW9uLnggKyBkZWx0YVgsIHN0YXJ0UG9zaXRpb24ueSArIGRlbHRhWSwgZ3JpZFNpemUpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgLi4uaXRlbSxcblxuICAgICAgICB4OiBjbGFtcCh0YXJnZXQueCwgMCwgY2FudmFzV2lkdGggLSBpdGVtLndpZHRoKSxcblxuICAgICAgICB5OiBjbGFtcCh0YXJnZXQueSwgMCwgY2FudmFzSGVpZ2h0IC0gaXRlbS5oZWlnaHQpXG4gICAgfTtcbn07XG4iLCJpbXBvcnQgdHlwZSB7IFBvaW50LCBSZWN0TGlrZSwgUm90YXRpb24gfSBmcm9tIFwiLi4vdHlwZXMvZ2VvbWV0cnlcIjtcbmltcG9ydCB0eXBlIHsgRHJhZ1N0YXRlIH0gZnJvbSBcIi4uL3N0YXRlL0RyYWdTdGF0ZVwiO1xuaW1wb3J0IHR5cGUgeyBDb2xsaXNpb25FbmdpbmUgfSBmcm9tIFwiLi9Db2xsaXNpb25FbmdpbmVcIjtcbmltcG9ydCB0eXBlIHsgU25hcEVuZ2luZSB9IGZyb20gXCIuL1NuYXBFbmdpbmVcIjtcbmltcG9ydCB7IGNhbGN1bGF0ZURyYWdQb3NpdGlvbiB9IGZyb20gXCIuLi9kb21haW4vZHJhZ1J1bGVzXCI7XG5cbmV4cG9ydCBjbGFzcyBEcmFnRW5naW5lPFxuICAgIFQgZXh0ZW5kcyBSZWN0TGlrZSAmIHtcbiAgICAgICAgaWQ6IHN0cmluZztcbiAgICAgICAgcm90YXRpb246IFJvdGF0aW9uO1xuICAgIH1cbj4ge1xuICAgIHByaXZhdGUgaXRlbXM6IFRbXTtcbiAgICBwcml2YXRlIGNvbGxpc2lvbkVuZ2luZTogQ29sbGlzaW9uRW5naW5lIHwgbnVsbDtcbiAgICBwcml2YXRlIHNuYXBFbmdpbmU6IFNuYXBFbmdpbmUgfCBudWxsO1xuXG4gICAgcHJpdmF0ZSBzdGF0ZTogRHJhZ1N0YXRlID0ge1xuICAgICAgICBpc0RyYWdnaW5nOiBmYWxzZSxcbiAgICAgICAgYWN0aXZlSWQ6IG51bGwsXG4gICAgICAgIHN0YXJ0TW91c2U6IHtcbiAgICAgICAgICAgIHg6IDAsXG4gICAgICAgICAgICB5OiAwXG4gICAgICAgIH0sXG4gICAgICAgIHN0YXJ0UG9zaXRpb25zOiBuZXcgTWFwKCksXG4gICAgICAgIHN0YXJ0T2Zmc2V0czogbmV3IE1hcCgpXG4gICAgfTtcblxuICAgIGNvbnN0cnVjdG9yKGl0ZW1zOiBUW10sIGNvbGxpc2lvbkVuZ2luZT86IENvbGxpc2lvbkVuZ2luZSwgc25hcEVuZ2luZT86IFNuYXBFbmdpbmUpIHtcbiAgICAgICAgdGhpcy5pdGVtcyA9IGl0ZW1zO1xuICAgICAgICB0aGlzLmNvbGxpc2lvbkVuZ2luZSA9IGNvbGxpc2lvbkVuZ2luZSA/PyBudWxsO1xuICAgICAgICB0aGlzLnNuYXBFbmdpbmUgPSBzbmFwRW5naW5lID8/IG51bGw7XG4gICAgfVxuXG4gICAgc3RhcnREcmFnKGFjdGl2ZUlkOiBzdHJpbmcsIHNlbGVjdGVkSWRzOiBzdHJpbmdbXSwgbW91c2U6IFBvaW50KTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGFjdGl2ZUl0ZW0gPSB0aGlzLml0ZW1zLmZpbmQoaXRlbSA9PiBpdGVtLmlkID09PSBhY3RpdmVJZCk7XG4gICAgICAgIGlmICghYWN0aXZlSXRlbSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3RhcnRQb3NpdGlvbnMgPSBuZXcgTWFwPHN0cmluZywgUG9pbnQ+KCk7XG4gICAgICAgIGNvbnN0IHN0YXJ0T2Zmc2V0cyA9IG5ldyBNYXA8c3RyaW5nLCBQb2ludD4oKTtcblxuICAgICAgICBzZWxlY3RlZElkcy5mb3JFYWNoKGlkID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSB0aGlzLml0ZW1zLmZpbmQoeCA9PiB4LmlkID09PSBpZCk7XG4gICAgICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgICAgICAgIHN0YXJ0UG9zaXRpb25zLnNldChpZCwge1xuICAgICAgICAgICAgICAgICAgICB4OiBpdGVtLngsXG4gICAgICAgICAgICAgICAgICAgIHk6IGl0ZW0ueVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIHN0b3JlIHBvaW50ZXIgb2Zmc2V0IHNvIGRyYWdnaW5nIGtlZXBzIGN1cnNvciByZWxhdGl2ZSBwb3NpdGlvblxuICAgICAgICAgICAgICAgIHN0YXJ0T2Zmc2V0cy5zZXQoaWQsIHtcbiAgICAgICAgICAgICAgICAgICAgeDogbW91c2UueCAtIGl0ZW0ueCxcbiAgICAgICAgICAgICAgICAgICAgeTogbW91c2UueSAtIGl0ZW0ueVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgICAgICAgaXNEcmFnZ2luZzogdHJ1ZSxcbiAgICAgICAgICAgIGFjdGl2ZUlkLFxuICAgICAgICAgICAgc3RhcnRNb3VzZTogbW91c2UsXG4gICAgICAgICAgICBzdGFydFBvc2l0aW9ucyxcbiAgICAgICAgICAgIHN0YXJ0T2Zmc2V0c1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIG1vdmUobW91c2U6IFBvaW50LCBjYW52YXNXaWR0aDogbnVtYmVyLCBjYW52YXNIZWlnaHQ6IG51bWJlcik6IFRbXSB7XG4gICAgICAgIGlmICghdGhpcy5zdGF0ZS5pc0RyYWdnaW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtcztcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHRhcmdldEl0ZW1zID0gdGhpcy5pdGVtcy5tYXAoaXRlbSA9PiB7XG4gICAgICAgICAgICBjb25zdCBvZmZzZXQgPSB0aGlzLnN0YXRlLnN0YXJ0T2Zmc2V0cy5nZXQoaXRlbS5pZCk7XG4gICAgICAgICAgICBpZiAoIW9mZnNldCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBjb21wdXRlIGJhc2UgcG9zaXRpb24gbWFpbnRhaW5pbmcgdGhlIGluaXRpYWwgY3Vyc29yIG9mZnNldFxuICAgICAgICAgICAgY29uc3QgYmFzZVggPSBtb3VzZS54IC0gb2Zmc2V0Lng7XG4gICAgICAgICAgICBjb25zdCBiYXNlWSA9IG1vdXNlLnkgLSBvZmZzZXQueTtcblxuICAgICAgICAgICAgY29uc3QgYmFzZVBvc2l0aW9uID0gY2FsY3VsYXRlRHJhZ1Bvc2l0aW9uKGl0ZW0sIHsgeDogYmFzZVgsIHk6IGJhc2VZIH0sIDAsIDAsIGNhbnZhc1dpZHRoLCBjYW52YXNIZWlnaHQpO1xuXG4gICAgICAgICAgICBjb25zdCBzdGFydFBvcyA9IHRoaXMuc3RhdGUuc3RhcnRQb3NpdGlvbnMuZ2V0KGl0ZW0uaWQpID8/IHsgeDogaXRlbS54LCB5OiBpdGVtLnkgfTtcbiAgICAgICAgICAgIGNvbnN0IGJvdW5kcyA9IHsgeDogMCwgeTogMCwgd2lkdGg6IGNhbnZhc1dpZHRoLCBoZWlnaHQ6IGNhbnZhc0hlaWdodCB9O1xuICAgICAgICAgICAgY29uc3Qgb3RoZXJzID0gdGhpcy5pdGVtcy5maWx0ZXIob3RoZXIgPT4gb3RoZXIuaWQgIT09IGl0ZW0uaWQpO1xuXG4gICAgICAgICAgICBsZXQgdGFyZ2V0UG9zID0geyB4OiBiYXNlUG9zaXRpb24ueCwgeTogYmFzZVBvc2l0aW9uLnkgfTtcblxuICAgICAgICAgICAgLy8gQXBwbHkgc25hcHBpbmcgcnVsZXMgaWYgc25hcCBlbmdpbmUgaXMgYWN0aXZlXG4gICAgICAgICAgICBpZiAodGhpcy5zbmFwRW5naW5lKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc25hcFRhcmdldCA9IHRoaXMuc25hcEVuZ2luZS5jYWxjdWxhdGVTbmFwVGFyZ2V0KGl0ZW0sIG90aGVycywgdGFyZ2V0UG9zLCB7XG4gICAgICAgICAgICAgICAgICAgIGJvdW5kc1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRhcmdldFBvcyA9IHNuYXBUYXJnZXQucG9zaXRpb247XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlc29sdmUgY29sbGlzaW9uIG92ZXJsYXBzIGlmIGNvbGxpc2lvbiBlbmdpbmUgaXMgYWN0aXZlXG4gICAgICAgICAgICBpZiAodGhpcy5jb2xsaXNpb25FbmdpbmUpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRQb3MgPSB0aGlzLmNvbGxpc2lvbkVuZ2luZS5yZXNvbHZlTm9uT3ZlcmxhcHBpbmdQb3NpdGlvbihcbiAgICAgICAgICAgICAgICAgICAgaXRlbSxcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0UG9zLFxuICAgICAgICAgICAgICAgICAgICBzdGFydFBvcyxcbiAgICAgICAgICAgICAgICAgICAgb3RoZXJzLFxuICAgICAgICAgICAgICAgICAgICBib3VuZHNcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4geyAuLi5pdGVtLCB4OiB0YXJnZXRQb3MueCwgeTogdGFyZ2V0UG9zLnkgfSBhcyBUO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLml0ZW1zID0gdGFyZ2V0SXRlbXM7XG4gICAgICAgIHJldHVybiB0aGlzLml0ZW1zO1xuICAgIH1cblxuICAgIGVuZERyYWcoKTogdm9pZCB7XG4gICAgICAgIC8vIFJlc2V0IGRyYWcgc3RhdHVzIGFuZCBjbGVhciBzdGFydGluZyBwb3NpdGlvbnMvb2Zmc2V0c1xuICAgICAgICB0aGlzLnN0YXRlLmlzRHJhZ2dpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5zdGF0ZS5hY3RpdmVJZCA9IG51bGw7XG4gICAgICAgIHRoaXMuc3RhdGUuc3RhcnRQb3NpdGlvbnMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5zdGF0ZS5zdGFydE9mZnNldHMuY2xlYXIoKTtcbiAgICB9XG5cbiAgICB1cGRhdGVJdGVtcyhpdGVtczogVFtdKTogdm9pZCB7XG4gICAgICAgIHRoaXMuaXRlbXMgPSBpdGVtcztcbiAgICB9XG5cbiAgICBpc0RyYWdnaW5nKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5zdGF0ZS5pc0RyYWdnaW5nO1xuICAgIH1cbn1cbiIsImltcG9ydCB0eXBlIHsgUmVjdGFuZ2xlLCBSZWN0TGlrZSwgUm90YXRpb24gfSBmcm9tIFwiLi4vdHlwZXMvZ2VvbWV0cnlcIjtcblxuaW1wb3J0IHsgaXNWZXJ0aWNhbFJvdGF0aW9uIH0gZnJvbSBcIi4vcm90YXRpb25SdWxlc1wiO1xuXG4vKipcbiAqIENvbnZlcnQgeCx5LHdpZHRoLGhlaWdodFxuICogdG8gYm91bmRpbmcgcmVjdGFuZ2xlXG4gKi9cbmV4cG9ydCBjb25zdCBnZXRSZWN0YW5nbGUgPSAoaXRlbTogUmVjdExpa2UgJiBQYXJ0aWFsPHsgcm90YXRpb246IFJvdGF0aW9uIH0+KTogUmVjdGFuZ2xlID0+IHtcbiAgICBjb25zdCBpc1ZlcnRpY2FsID0gdHlwZW9mIGl0ZW0ucm90YXRpb24gPT09IFwibnVtYmVyXCIgJiYgaXNWZXJ0aWNhbFJvdGF0aW9uKGl0ZW0ucm90YXRpb24gYXMgUm90YXRpb24pO1xuICAgIGNvbnN0IHdpZHRoID0gaXNWZXJ0aWNhbCA/IGl0ZW0uaGVpZ2h0IDogaXRlbS53aWR0aDtcbiAgICBjb25zdCBoZWlnaHQgPSBpc1ZlcnRpY2FsID8gaXRlbS53aWR0aCA6IGl0ZW0uaGVpZ2h0O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogaXRlbS54LFxuICAgICAgICB0b3A6IGl0ZW0ueSxcbiAgICAgICAgcmlnaHQ6IGl0ZW0ueCArIHdpZHRoLFxuICAgICAgICBib3R0b206IGl0ZW0ueSArIGhlaWdodFxuICAgIH07XG59O1xuXG4vKipcbiAqIENoZWNrIEFBQkIgaW50ZXJzZWN0aW9uXG4gKi9cbmV4cG9ydCBjb25zdCBpc0ludGVyc2VjdGluZyA9IChhOiBSZWN0YW5nbGUsIGI6IFJlY3RhbmdsZSwgZXBzOiBudW1iZXIgPSAxZS00KTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuICEoYS5yaWdodCA8PSBiLmxlZnQgKyBlcHMgfHwgYS5sZWZ0ID49IGIucmlnaHQgLSBlcHMgfHwgYS5ib3R0b20gPD0gYi50b3AgKyBlcHMgfHwgYS50b3AgPj0gYi5ib3R0b20gLSBlcHMpO1xufTtcblxuLyoqXG4gKiBDaGVjayBvdmVybGFwIGJldHdlZW4gdHdvIGl0ZW1zXG4gKi9cbmV4cG9ydCBjb25zdCBvdmVybGFwcyA9IChhOiBSZWN0TGlrZSwgYjogUmVjdExpa2UpOiBib29sZWFuID0+IHtcbiAgICByZXR1cm4gaXNJbnRlcnNlY3RpbmcoZ2V0UmVjdGFuZ2xlKGEpLCBnZXRSZWN0YW5nbGUoYikpO1xufTtcblxuLyoqXG4gKiBDaGVjayBpdGVtIGluc2lkZSBib3VuZHMgKGFjY291bnQgZm9yIHJvdGF0aW9uKVxuICovXG5leHBvcnQgY29uc3QgaXNJbnNpZGVCb3VuZHMgPSAoaXRlbTogUmVjdExpa2UgJiBQYXJ0aWFsPHsgcm90YXRpb246IFJvdGF0aW9uIH0+LCBib3VuZHM6IFJlY3RMaWtlKTogYm9vbGVhbiA9PiB7XG4gICAgY29uc3QgcmVjdCA9IGdldFJlY3RhbmdsZShpdGVtKTtcbiAgICByZXR1cm4gKFxuICAgICAgICByZWN0LmxlZnQgPj0gYm91bmRzLnggJiZcbiAgICAgICAgcmVjdC50b3AgPj0gYm91bmRzLnkgJiZcbiAgICAgICAgcmVjdC5yaWdodCA8PSBib3VuZHMueCArIGJvdW5kcy53aWR0aCAmJlxuICAgICAgICByZWN0LmJvdHRvbSA8PSBib3VuZHMueSArIGJvdW5kcy5oZWlnaHRcbiAgICApO1xufTtcblxuZXhwb3J0IGNvbnN0IGZpbmRDb2xsaXNpb25zID0gPFQgZXh0ZW5kcyBSZWN0TGlrZT4odGFyZ2V0OiBULCBpdGVtczogVFtdKTogVFtdID0+IHtcbiAgICByZXR1cm4gaXRlbXMuZmlsdGVyKGl0ZW0gPT4ge1xuICAgICAgICBpZiAoaXRlbSA9PT0gdGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gb3ZlcmxhcHModGFyZ2V0LCBpdGVtKTtcbiAgICB9KTtcbn07XG4iLCJpbXBvcnQgdHlwZSB7IFBvaW50LCBSZWN0TGlrZSwgUm90YXRpb24gfSBmcm9tIFwiLi4vdHlwZXMvZ2VvbWV0cnlcIjtcbmltcG9ydCB7IGZpbmRDb2xsaXNpb25zLCBpc0luc2lkZUJvdW5kcyB9IGZyb20gXCIuLi9kb21haW4vZ2VvbWV0cnlSdWxlc1wiO1xuaW1wb3J0IHsgZ2V0Um90YXRlZFNpemUgfSBmcm9tIFwiLi4vZG9tYWluL3JvdGF0aW9uUnVsZXNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBWYWxpZFBvc2l0aW9uIHtcbiAgICBwb3NpdGlvbjogUG9pbnQ7XG4gICAgdHlwZTogXCJzbmFwX2xlZnRcIiB8IFwic25hcF9yaWdodFwiIHwgXCJzbmFwX3RvcFwiIHwgXCJzbmFwX2JvdHRvbVwiIHwgXCJncmlkXCI7XG4gICAgZGlzdGFuY2U6IG51bWJlcjtcbn1cblxuZXhwb3J0IGNsYXNzIENvbGxpc2lvbkVuZ2luZSB7XG4gICAgZGV0ZWN0Q29sbGlzaW9uczxUIGV4dGVuZHMgUmVjdExpa2U+KGl0ZW06IFQsIG90aGVyczogVFtdKTogVFtdIHtcbiAgICAgICAgcmV0dXJuIGZpbmRDb2xsaXNpb25zKGl0ZW0sIG90aGVycyk7XG4gICAgfVxuXG4gICAgZmluZFZhbGlkUG9zaXRpb25zPFQgZXh0ZW5kcyBSZWN0TGlrZSAmIHsgcm90YXRpb24/OiBSb3RhdGlvbiB9PihcbiAgICAgICAgaXRlbTogVCxcbiAgICAgICAgb3RoZXJzOiBUW10sXG4gICAgICAgIGJvdW5kczogUmVjdExpa2UsXG4gICAgICAgIHNuYXBEaXN0YW5jZTogbnVtYmVyID0gMFxuICAgICk6IFZhbGlkUG9zaXRpb25bXSB7XG4gICAgICAgIGNvbnN0IGl0ZW1WaXMgPSBnZXRSb3RhdGVkU2l6ZSh7IHdpZHRoOiBpdGVtLndpZHRoLCBoZWlnaHQ6IGl0ZW0uaGVpZ2h0IH0sIGl0ZW0ucm90YXRpb24gPz8gMCk7XG4gICAgICAgIGNvbnN0IGl0ZW1XID0gaXRlbVZpcy53aWR0aDtcbiAgICAgICAgY29uc3QgaXRlbUggPSBpdGVtVmlzLmhlaWdodDtcblxuICAgICAgICBjb25zdCB4Q2FuZGlkYXRlcyA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgICAgICB4Q2FuZGlkYXRlcy5hZGQoaXRlbS54KTtcbiAgICAgICAgaWYgKGJvdW5kcykge1xuICAgICAgICAgICAgeENhbmRpZGF0ZXMuYWRkKGJvdW5kcy54KTtcbiAgICAgICAgICAgIHhDYW5kaWRhdGVzLmFkZChib3VuZHMueCArIGJvdW5kcy53aWR0aCAtIGl0ZW1XKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHlDYW5kaWRhdGVzID0gbmV3IFNldDxudW1iZXI+KCk7XG4gICAgICAgIHlDYW5kaWRhdGVzLmFkZChpdGVtLnkpO1xuICAgICAgICBpZiAoYm91bmRzKSB7XG4gICAgICAgICAgICB5Q2FuZGlkYXRlcy5hZGQoYm91bmRzLnkpO1xuICAgICAgICAgICAgeUNhbmRpZGF0ZXMuYWRkKGJvdW5kcy55ICsgYm91bmRzLmhlaWdodCAtIGl0ZW1IKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3Qgb3RoZXIgb2Ygb3RoZXJzKSB7XG4gICAgICAgICAgICBjb25zdCBvdGhlclZpcyA9IGdldFJvdGF0ZWRTaXplKHsgd2lkdGg6IG90aGVyLndpZHRoLCBoZWlnaHQ6IG90aGVyLmhlaWdodCB9LCBvdGhlci5yb3RhdGlvbiA/PyAwKTtcbiAgICAgICAgICAgIGNvbnN0IG90aGVyVyA9IG90aGVyVmlzLndpZHRoO1xuICAgICAgICAgICAgY29uc3Qgb3RoZXJIID0gb3RoZXJWaXMuaGVpZ2h0O1xuXG4gICAgICAgICAgICAvLyBYLWF4aXMgY2FuZGlkYXRlcyBmb3IgaXRlbVxuICAgICAgICAgICAgeENhbmRpZGF0ZXMuYWRkKG90aGVyLnggKyBvdGhlclcgKyBzbmFwRGlzdGFuY2UpO1xuICAgICAgICAgICAgeENhbmRpZGF0ZXMuYWRkKG90aGVyLnggLSBpdGVtVyAtIHNuYXBEaXN0YW5jZSk7XG4gICAgICAgICAgICB4Q2FuZGlkYXRlcy5hZGQob3RoZXIueCk7XG4gICAgICAgICAgICB4Q2FuZGlkYXRlcy5hZGQob3RoZXIueCArIG90aGVyVyAtIGl0ZW1XKTtcblxuICAgICAgICAgICAgLy8gWS1heGlzIGNhbmRpZGF0ZXMgZm9yIGl0ZW1cbiAgICAgICAgICAgIHlDYW5kaWRhdGVzLmFkZChvdGhlci55ICsgb3RoZXJIICsgc25hcERpc3RhbmNlKTtcbiAgICAgICAgICAgIHlDYW5kaWRhdGVzLmFkZChvdGhlci55IC0gaXRlbUggLSBzbmFwRGlzdGFuY2UpO1xuICAgICAgICAgICAgeUNhbmRpZGF0ZXMuYWRkKG90aGVyLnkpO1xuICAgICAgICAgICAgeUNhbmRpZGF0ZXMuYWRkKG90aGVyLnkgKyBvdGhlckggLSBpdGVtSCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB2YWxpZFBvc2l0aW9uczogVmFsaWRQb3NpdGlvbltdID0gW107XG4gICAgICAgIGNvbnN0IHZpc2l0ZWQgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAgICAgICBmb3IgKGNvbnN0IHggb2YgeENhbmRpZGF0ZXMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgeSBvZiB5Q2FuZGlkYXRlcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGAke01hdGgucm91bmQoeCAqIDEwMCl9XyR7TWF0aC5yb3VuZCh5ICogMTAwKX1gO1xuICAgICAgICAgICAgICAgIGlmICh2aXNpdGVkLmhhcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2aXNpdGVkLmFkZChrZXkpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgY2FuZGlkYXRlUG9zID0geyB4LCB5IH07XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNWYWxpZFBvc2l0aW9uKGl0ZW0sIGNhbmRpZGF0ZVBvcywgb3RoZXJzLCBib3VuZHMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbGlkUG9zaXRpb25zLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IGNhbmRpZGF0ZVBvcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiZ3JpZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzdGFuY2U6IE1hdGguaHlwb3QoeCAtIGl0ZW0ueCwgeSAtIGl0ZW0ueSlcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHZhbGlkUG9zaXRpb25zLnNvcnQoKGEsIGIpID0+IGEuZGlzdGFuY2UgLSBiLmRpc3RhbmNlKTtcbiAgICB9XG5cbiAgICByZXNvbHZlTm9uT3ZlcmxhcHBpbmdQb3NpdGlvbjxUIGV4dGVuZHMgUmVjdExpa2UgJiB7IHJvdGF0aW9uPzogUm90YXRpb24gfT4oXG4gICAgICAgIGl0ZW06IFQsXG4gICAgICAgIGRlc2lyZWRQb3M6IFBvaW50LFxuICAgICAgICBzdGFydFBvczogUG9pbnQsXG4gICAgICAgIG90aGVyczogVFtdLFxuICAgICAgICBib3VuZHM6IFJlY3RMaWtlXG4gICAgKTogUG9pbnQge1xuICAgICAgICBjb25zdCBkZXNpcmVkSXRlbSA9IHsgLi4uaXRlbSwgeDogZGVzaXJlZFBvcy54LCB5OiBkZXNpcmVkUG9zLnkgfTtcblxuICAgICAgICAvLyAxLiBJZiBkZXNpcmVkIHBvc2l0aW9uIGRvZXMgbm90IGNvbGxpZGUgYW5kIGlzIGluc2lkZSBib3VuZHMsIHJldHVybiBkZXNpcmVkUG9zXG4gICAgICAgIGlmIChpc0luc2lkZUJvdW5kcyhkZXNpcmVkSXRlbSwgYm91bmRzKSAmJiB0aGlzLmRldGVjdENvbGxpc2lvbnMoZGVzaXJlZEl0ZW0sIG90aGVycykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gZGVzaXJlZFBvcztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIDIuIEZpbmQgdmFsaWQgY29ybmVyL2VkZ2UgY2FuZGlkYXRlIHBvc2l0aW9uIGNsb3Nlc3QgdG8gZGVzaXJlZFBvc1xuICAgICAgICBjb25zdCB2YWxpZFBvc2l0aW9ucyA9IHRoaXMuZmluZFZhbGlkUG9zaXRpb25zKGRlc2lyZWRJdGVtLCBvdGhlcnMsIGJvdW5kcywgMCk7XG4gICAgICAgIGlmICh2YWxpZFBvc2l0aW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsaWRQb3NpdGlvbnNbMF0ucG9zaXRpb247XG4gICAgICAgIH1cblxuICAgICAgICAvLyAzLiBUcnkgbW92aW5nIGFsb25nIFggYXhpcyBvbmx5XG4gICAgICAgIGNvbnN0IHhPbmx5SXRlbSA9IHsgLi4uaXRlbSwgeDogZGVzaXJlZFBvcy54LCB5OiBzdGFydFBvcy55IH07XG4gICAgICAgIGlmIChpc0luc2lkZUJvdW5kcyh4T25seUl0ZW0sIGJvdW5kcykgJiYgdGhpcy5kZXRlY3RDb2xsaXNpb25zKHhPbmx5SXRlbSwgb3RoZXJzKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiB7IHg6IGRlc2lyZWRQb3MueCwgeTogc3RhcnRQb3MueSB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gNC4gVHJ5IG1vdmluZyBhbG9uZyBZIGF4aXMgb25seVxuICAgICAgICBjb25zdCB5T25seUl0ZW0gPSB7IC4uLml0ZW0sIHg6IHN0YXJ0UG9zLngsIHk6IGRlc2lyZWRQb3MueSB9O1xuICAgICAgICBpZiAoaXNJbnNpZGVCb3VuZHMoeU9ubHlJdGVtLCBib3VuZHMpICYmIHRoaXMuZGV0ZWN0Q29sbGlzaW9ucyh5T25seUl0ZW0sIG90aGVycykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4geyB4OiBzdGFydFBvcy54LCB5OiBkZXNpcmVkUG9zLnkgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIDUuIEZhbGxiYWNrOiByZXZlcnQgdG8gb3JpZ2luYWwgc3RhcnQgcG9zaXRpb25cbiAgICAgICAgcmV0dXJuIHN0YXJ0UG9zO1xuICAgIH1cblxuICAgIHByaXZhdGUgaXNWYWxpZFBvc2l0aW9uPFQgZXh0ZW5kcyBSZWN0TGlrZT4oaXRlbTogVCwgcG9zaXRpb246IFBvaW50LCBvdGhlcnM6IFRbXSwgYm91bmRzOiBSZWN0TGlrZSk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBtb3ZlZEl0ZW0gPSB7IC4uLml0ZW0sIHg6IHBvc2l0aW9uLngsIHk6IHBvc2l0aW9uLnkgfTtcblxuICAgICAgICBpZiAoIWlzSW5zaWRlQm91bmRzKG1vdmVkSXRlbSwgYm91bmRzKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuZGV0ZWN0Q29sbGlzaW9ucyhtb3ZlZEl0ZW0sIG90aGVycykubGVuZ3RoID09PSAwO1xuICAgIH1cbn1cbiIsImltcG9ydCB0eXBlIHsgUG9pbnQsIFJvdGF0aW9uLCBSZWN0TGlrZSB9IGZyb20gXCIuLi90eXBlcy9nZW9tZXRyeVwiO1xuaW1wb3J0IHsgc25hcFRvR3JpZCB9IGZyb20gXCIuLi9kb21haW4vc25hcFJ1bGVzXCI7XG5pbXBvcnQgeyBnZXRSb3RhdGVkU2l6ZSB9IGZyb20gXCIuLi9kb21haW4vcm90YXRpb25SdWxlc1wiO1xuaW1wb3J0IHsgR1JJRF9TSVpFLCBTTkFQX1RIUkVTSE9MRCB9IGZyb20gXCIuLi9jb25zdGFudHMvY2FudmFzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU25hcFRhcmdldCB7XG4gIHBvc2l0aW9uOiBQb2ludDtcbiAgcm90YXRpb24/OiBSb3RhdGlvbjtcbiAgdHlwZTogXCJlZGdlXCIgfCBcImFsaWduXCIgfCBcImJvdW5kYXJ5XCIgfCBcImdyaWRcIiB8IFwiYW5nbGVcIiB8IFwibm9uZVwiO1xuICBkaXN0YW5jZTogbnVtYmVyO1xufVxuXG4vLyBDb25maWd1cmF0aW9uIGZvciBzbmFwIGNhbGN1bGF0aW9uc1xuZXhwb3J0IGludGVyZmFjZSBTbmFwQ29uZmlnIHtcbiAgYm91bmRzPzogUmVjdExpa2U7IC8vIEJvdW5kaW5nIHJlY3RhbmdsZSBmb3IgYm91bmRhcnkgc25hcHBpbmdcbiAgZ3JpZFNpemU6IG51bWJlcjsgLy8gR3JpZCBzaXplIGZvciBncmlkIHNuYXBwaW5nICgwIGRpc2FibGVzKVxuICB0aHJlc2hvbGQ6IG51bWJlcjsgLy8gTWF4aW11bSBkaXN0YW5jZSB0byBzbmFwIChwaXhlbHMpXG59XG5cbi8vIEludGVybmFsIHJlcHJlc2VudGF0aW9uIG9mIGEgc25hcCBjYW5kaWRhdGUgYWxvbmcgYSBzaW5nbGUgYXhpc1xuaW50ZXJmYWNlIFNuYXBDYW5kaWRhdGUge1xuICBwb3NpdGlvbjogbnVtYmVyO1xuICB0eXBlOiBTbmFwVGFyZ2V0W1widHlwZVwiXTtcbiAgZGlzdGFuY2U6IG51bWJlcjtcbn1cblxuLy8gRGVmYXVsdCBjb25maWd1cmF0aW9uIHZhbHVlc1xuY29uc3QgREVGQVVMVF9TTkFQX0NPTkZJRzogU25hcENvbmZpZyA9IHtcbiAgZ3JpZFNpemU6IEdSSURfU0laRSxcbiAgdGhyZXNob2xkOiBTTkFQX1RIUkVTSE9MRCxcbn07XG5cbi8vIEV2YWx1YXRlcyBhIHNuYXAgY2FuZGlkYXRlIGFnYWluc3QgdGhlIGN1cnJlbnQgYmVzdCBjYW5kaWRhdGVcbmZ1bmN0aW9uIGV2YWx1YXRlQ2FuZGlkYXRlKGN1cnJlbnQ6IFNuYXBDYW5kaWRhdGUsIGNhbmRpZGF0ZTogU25hcENhbmRpZGF0ZSk6IFNuYXBDYW5kaWRhdGUge1xuICByZXR1cm4gY2FuZGlkYXRlLmRpc3RhbmNlIDwgY3VycmVudC5kaXN0YW5jZSA/IGNhbmRpZGF0ZSA6IGN1cnJlbnQ7XG59XG5cbi8vIENyZWF0ZXMgYSBzbmFwIGNhbmRpZGF0ZSBmb3IgYSB0YXJnZXQgcG9zaXRpb25cbmZ1bmN0aW9uIGNyZWF0ZUNhbmRpZGF0ZShwb3NpdGlvbjogbnVtYmVyLCB0eXBlOiBTbmFwVGFyZ2V0W1widHlwZVwiXSwgdGFyZ2V0UG9zOiBudW1iZXIpOiBTbmFwQ2FuZGlkYXRlIHtcbiAgcmV0dXJuIHtcbiAgICBwb3NpdGlvbixcbiAgICB0eXBlLFxuICAgIGRpc3RhbmNlOiBNYXRoLmFicyh0YXJnZXRQb3MgLSBwb3NpdGlvbiksXG4gIH07XG59XG5cbi8vIENhbGN1bGF0ZXMgYm91bmRhcnkgc25hcCBjYW5kaWRhdGVzIGZvciBhIHNpbmdsZSBheGlzXG5mdW5jdGlvbiBjYWxjdWxhdGVCb3VuZGFyeUNhbmRpZGF0ZXMoXG4gIHRhcmdldFBvczogbnVtYmVyLFxuICBpdGVtU2l6ZTogbnVtYmVyLFxuICBib3VuZHM6IFJlY3RMaWtlLFxuICBheGlzOiBcInhcIiB8IFwieVwiXG4pOiBTbmFwQ2FuZGlkYXRlW10ge1xuICBjb25zdCBib3VuZHNTdGFydCA9IGF4aXMgPT09IFwieFwiID8gYm91bmRzLnggOiBib3VuZHMueTtcbiAgY29uc3QgYm91bmRzRW5kID0gYXhpcyA9PT0gXCJ4XCIgPyBib3VuZHMueCArIGJvdW5kcy53aWR0aCA6IGJvdW5kcy55ICsgYm91bmRzLmhlaWdodDtcblxuICByZXR1cm4gW1xuICAgIGNyZWF0ZUNhbmRpZGF0ZShib3VuZHNTdGFydCwgXCJib3VuZGFyeVwiLCB0YXJnZXRQb3MpLFxuICAgIGNyZWF0ZUNhbmRpZGF0ZShib3VuZHNFbmQgLSBpdGVtU2l6ZSwgXCJib3VuZGFyeVwiLCB0YXJnZXRQb3MpLFxuICBdO1xufVxuXG4vLyBDYWxjdWxhdGVzIGVkZ2UgYW5kIGFsaWdubWVudCBzbmFwIGNhbmRpZGF0ZXMgZm9yIGEgc2luZ2xlIGF4aXMgYWdhaW5zdCBhbm90aGVyIGl0ZW1cbmZ1bmN0aW9uIGNhbGN1bGF0ZUl0ZW1TbmFwQ2FuZGlkYXRlcyhcbiAgdGFyZ2V0UG9zOiBudW1iZXIsXG4gIGl0ZW1TaXplOiBudW1iZXIsXG4gIG90aGVyOiBSZWN0TGlrZSxcbiAgb3RoZXJTaXplOiBudW1iZXIsXG4gIGF4aXM6IFwieFwiIHwgXCJ5XCJcbik6IFNuYXBDYW5kaWRhdGVbXSB7XG4gIGNvbnN0IG90aGVyU3RhcnQgPSBheGlzID09PSBcInhcIiA/IG90aGVyLnggOiBvdGhlci55O1xuICBjb25zdCBvdGhlckVuZCA9IGF4aXMgPT09IFwieFwiID8gb3RoZXIueCArIG90aGVyU2l6ZSA6IG90aGVyLnkgKyBvdGhlclNpemU7XG5cbiAgcmV0dXJuIFtcbiAgICBjcmVhdGVDYW5kaWRhdGUob3RoZXJFbmQsIFwiZWRnZVwiLCB0YXJnZXRQb3MpLCAvLyBFZGdlOiBpdGVtIHRvdWNoaW5nIG90aGVyJ3MgZmFyIGVkZ2VcbiAgICBjcmVhdGVDYW5kaWRhdGUob3RoZXJTdGFydCAtIGl0ZW1TaXplLCBcImVkZ2VcIiwgdGFyZ2V0UG9zKSwgLy8gRWRnZTogaXRlbSB0b3VjaGluZyBvdGhlcidzIG5lYXIgZWRnZVxuICAgIGNyZWF0ZUNhbmRpZGF0ZShvdGhlclN0YXJ0LCBcImFsaWduXCIsIHRhcmdldFBvcyksIC8vIEFsaWduOiBpdGVtJ3MgbmVhciBlZGdlIGFsaWduZWQgd2l0aCBvdGhlcidzIG5lYXIgZWRnZVxuICAgIGNyZWF0ZUNhbmRpZGF0ZShvdGhlckVuZCAtIGl0ZW1TaXplLCBcImFsaWduXCIsIHRhcmdldFBvcyksIC8vIEFsaWduOiBpdGVtJ3MgZmFyIGVkZ2UgYWxpZ25lZCB3aXRoIG90aGVyJ3MgZmFyIGVkZ2VcbiAgXTtcbn1cblxuLy8gQ2FsY3VsYXRlcyBncmlkIHNuYXAgY2FuZGlkYXRlIGZvciBhIHNpbmdsZSBheGlzXG5mdW5jdGlvbiBjYWxjdWxhdGVHcmlkQ2FuZGlkYXRlKHRhcmdldFBvczogbnVtYmVyLCBncmlkU2l6ZTogbnVtYmVyLCB0aHJlc2hvbGQ6IG51bWJlcik6IFNuYXBDYW5kaWRhdGUgfCBudWxsIHtcbiAgaWYgKGdyaWRTaXplIDw9IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnN0IGdyaWRQb3MgPSBzbmFwVG9HcmlkKHRhcmdldFBvcywgZ3JpZFNpemUpO1xuICBjb25zdCBkaXN0YW5jZSA9IE1hdGguYWJzKHRhcmdldFBvcyAtIGdyaWRQb3MpO1xuXG4gIGlmIChkaXN0YW5jZSA8PSB0aHJlc2hvbGQpIHtcbiAgICByZXR1cm4gY3JlYXRlQ2FuZGlkYXRlKGdyaWRQb3MsIFwiZ3JpZFwiLCB0YXJnZXRQb3MpO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8vIEZpbmRzIHRoZSBiZXN0IHNuYXAgY2FuZGlkYXRlIGZyb20gYSBsaXN0IG9mIGNhbmRpZGF0ZXNcbmZ1bmN0aW9uIGZpbmRCZXN0Q2FuZGlkYXRlKGNhbmRpZGF0ZXM6IFNuYXBDYW5kaWRhdGVbXSwgdGhyZXNob2xkOiBudW1iZXIsIHRhcmdldFBvczogbnVtYmVyKTogU25hcENhbmRpZGF0ZSB7XG4gIGNvbnN0IGluaXRpYWw6IFNuYXBDYW5kaWRhdGUgPSB7XG4gICAgcG9zaXRpb246IHRhcmdldFBvcyxcbiAgICB0eXBlOiBcIm5vbmVcIixcbiAgICBkaXN0YW5jZTogdGhyZXNob2xkICsgMSxcbiAgfTtcblxuICByZXR1cm4gY2FuZGlkYXRlcy5yZWR1Y2UoKGJlc3QsIGNhbmRpZGF0ZSkgPT4gZXZhbHVhdGVDYW5kaWRhdGUoYmVzdCwgY2FuZGlkYXRlKSwgaW5pdGlhbCk7XG59XG5cbmV4cG9ydCBjbGFzcyBTbmFwRW5naW5lIHtcbiAgLy8gQ2FsY3VsYXRlcyB0aGUgYmVzdCBzbmFwIHRhcmdldCBmb3IgYW4gaXRlbSBiZWluZyBkcmFnZ2VkXG4gIC8vIFByaW9yaXR5OiAxLiBCb3VuZGFyeSAyLiBFZGdlIGNvbnRhY3QgMy4gQWxpZ25tZW50IDQuIEdyaWQgKGZhbGxiYWNrKVxuICBjYWxjdWxhdGVTbmFwVGFyZ2V0PFQgZXh0ZW5kcyBSZWN0TGlrZSAmIHsgcm90YXRpb24/OiBSb3RhdGlvbiB9PihcbiAgICBpdGVtOiBULFxuICAgIG90aGVyczogVFtdLFxuICAgIHRhcmdldFBvczogUG9pbnQsXG4gICAgY29uZmlnOiBQYXJ0aWFsPFNuYXBDb25maWc+ID0ge31cbiAgKTogU25hcFRhcmdldCB7XG4gICAgY29uc3QgeyBib3VuZHMsIGdyaWRTaXplID0gREVGQVVMVF9TTkFQX0NPTkZJRy5ncmlkU2l6ZSwgdGhyZXNob2xkID0gREVGQVVMVF9TTkFQX0NPTkZJRy50aHJlc2hvbGQgfSA9IGNvbmZpZztcblxuICAgIGNvbnN0IGl0ZW1WaXMgPSBnZXRSb3RhdGVkU2l6ZSh7IHdpZHRoOiBpdGVtLndpZHRoLCBoZWlnaHQ6IGl0ZW0uaGVpZ2h0IH0sIGl0ZW0ucm90YXRpb24gPz8gMCk7XG5cbiAgICAvLyBDb2xsZWN0IGFsbCBYLWF4aXMgY2FuZGlkYXRlc1xuICAgIGNvbnN0IHhDYW5kaWRhdGVzOiBTbmFwQ2FuZGlkYXRlW10gPSBbXTtcblxuICAgIC8vIDEuIEJvdW5kYXJ5IHNuYXAgY2FuZGlkYXRlc1xuICAgIGlmIChib3VuZHMpIHtcbiAgICAgIHhDYW5kaWRhdGVzLnB1c2goLi4uY2FsY3VsYXRlQm91bmRhcnlDYW5kaWRhdGVzKHRhcmdldFBvcy54LCBpdGVtVmlzLndpZHRoLCBib3VuZHMsIFwieFwiKSk7XG4gICAgfVxuXG4gICAgLy8gMi4gRWRnZSBjb250YWN0ICYgYWxpZ25tZW50IGNhbmRpZGF0ZXMgYWdhaW5zdCBvdGhlciBpdGVtc1xuICAgIGZvciAoY29uc3Qgb3RoZXIgb2Ygb3RoZXJzKSB7XG4gICAgICBjb25zdCBvdGhlclZpcyA9IGdldFJvdGF0ZWRTaXplKHsgd2lkdGg6IG90aGVyLndpZHRoLCBoZWlnaHQ6IG90aGVyLmhlaWdodCB9LCBvdGhlci5yb3RhdGlvbiA/PyAwKTtcblxuICAgICAgeENhbmRpZGF0ZXMucHVzaCguLi5jYWxjdWxhdGVJdGVtU25hcENhbmRpZGF0ZXModGFyZ2V0UG9zLngsIGl0ZW1WaXMud2lkdGgsIG90aGVyLCBvdGhlclZpcy53aWR0aCwgXCJ4XCIpKTtcbiAgICB9XG5cbiAgICAvLyAzLiBHcmlkIHNuYXAgZmFsbGJhY2sgKG9ubHkgaWYgbm8gYmV0dGVyIGNhbmRpZGF0ZSBmb3VuZClcbiAgICBjb25zdCBiZXN0WCA9IGZpbmRCZXN0Q2FuZGlkYXRlKHhDYW5kaWRhdGVzLCB0aHJlc2hvbGQsIHRhcmdldFBvcy54KTtcbiAgICBpZiAoYmVzdFguZGlzdGFuY2UgPiB0aHJlc2hvbGQpIHtcbiAgICAgIGNvbnN0IGdyaWRDYW5kaWRhdGUgPSBjYWxjdWxhdGVHcmlkQ2FuZGlkYXRlKHRhcmdldFBvcy54LCBncmlkU2l6ZSwgdGhyZXNob2xkKTtcbiAgICAgIGlmIChncmlkQ2FuZGlkYXRlKSB7XG4gICAgICAgIHhDYW5kaWRhdGVzLnB1c2goZ3JpZENhbmRpZGF0ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ29sbGVjdCBhbGwgWS1heGlzIGNhbmRpZGF0ZXNcbiAgICBjb25zdCB5Q2FuZGlkYXRlczogU25hcENhbmRpZGF0ZVtdID0gW107XG5cbiAgICAvLyAxLiBCb3VuZGFyeSBzbmFwIGNhbmRpZGF0ZXNcbiAgICBpZiAoYm91bmRzKSB7XG4gICAgICB5Q2FuZGlkYXRlcy5wdXNoKC4uLmNhbGN1bGF0ZUJvdW5kYXJ5Q2FuZGlkYXRlcyh0YXJnZXRQb3MueSwgaXRlbVZpcy5oZWlnaHQsIGJvdW5kcywgXCJ5XCIpKTtcbiAgICB9XG5cbiAgICAvLyAyLiBFZGdlIGNvbnRhY3QgJiBhbGlnbm1lbnQgY2FuZGlkYXRlcyBhZ2FpbnN0IG90aGVyIGl0ZW1zXG4gICAgZm9yIChjb25zdCBvdGhlciBvZiBvdGhlcnMpIHtcbiAgICAgIGNvbnN0IG90aGVyVmlzID0gZ2V0Um90YXRlZFNpemUoeyB3aWR0aDogb3RoZXIud2lkdGgsIGhlaWdodDogb3RoZXIuaGVpZ2h0IH0sIG90aGVyLnJvdGF0aW9uID8/IDApO1xuXG4gICAgICB5Q2FuZGlkYXRlcy5wdXNoKC4uLmNhbGN1bGF0ZUl0ZW1TbmFwQ2FuZGlkYXRlcyh0YXJnZXRQb3MueSwgaXRlbVZpcy5oZWlnaHQsIG90aGVyLCBvdGhlclZpcy5oZWlnaHQsIFwieVwiKSk7XG4gICAgfVxuXG4gICAgLy8gMy4gR3JpZCBzbmFwIGZhbGxiYWNrXG4gICAgY29uc3QgYmVzdFkgPSBmaW5kQmVzdENhbmRpZGF0ZSh5Q2FuZGlkYXRlcywgdGhyZXNob2xkLCB0YXJnZXRQb3MueSk7XG4gICAgaWYgKGJlc3RZLmRpc3RhbmNlID4gdGhyZXNob2xkKSB7XG4gICAgICBjb25zdCBncmlkQ2FuZGlkYXRlID0gY2FsY3VsYXRlR3JpZENhbmRpZGF0ZSh0YXJnZXRQb3MueSwgZ3JpZFNpemUsIHRocmVzaG9sZCk7XG4gICAgICBpZiAoZ3JpZENhbmRpZGF0ZSkge1xuICAgICAgICB5Q2FuZGlkYXRlcy5wdXNoKGdyaWRDYW5kaWRhdGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJlY2FsY3VsYXRlIGJlc3Qgd2l0aCBncmlkIGNhbmRpZGF0ZXMgaW5jbHVkZWRcbiAgICBjb25zdCBmaW5hbEJlc3RYID0gZmluZEJlc3RDYW5kaWRhdGUoeENhbmRpZGF0ZXMsIHRocmVzaG9sZCwgdGFyZ2V0UG9zLngpO1xuICAgIGNvbnN0IGZpbmFsQmVzdFkgPSBmaW5kQmVzdENhbmRpZGF0ZSh5Q2FuZGlkYXRlcywgdGhyZXNob2xkLCB0YXJnZXRQb3MueSk7XG5cbiAgICBjb25zdCBtYXhEaXN0YW5jZSA9IE1hdGgubWF4KFxuICAgICAgZmluYWxCZXN0WC5kaXN0YW5jZSA8PSB0aHJlc2hvbGQgPyBmaW5hbEJlc3RYLmRpc3RhbmNlIDogMCxcbiAgICAgIGZpbmFsQmVzdFkuZGlzdGFuY2UgPD0gdGhyZXNob2xkID8gZmluYWxCZXN0WS5kaXN0YW5jZSA6IDBcbiAgICApO1xuXG4gICAgY29uc3QgcmVzdWx0VHlwZSA9XG4gICAgICBmaW5hbEJlc3RYLnR5cGUgIT09IFwibm9uZVwiID8gZmluYWxCZXN0WC50eXBlIDogZmluYWxCZXN0WS50eXBlICE9PSBcIm5vbmVcIiA/IGZpbmFsQmVzdFkudHlwZSA6IFwibm9uZVwiO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHBvc2l0aW9uOiB7IHg6IGZpbmFsQmVzdFgucG9zaXRpb24sIHk6IGZpbmFsQmVzdFkucG9zaXRpb24gfSxcbiAgICAgIHR5cGU6IHJlc3VsdFR5cGUsXG4gICAgICBkaXN0YW5jZTogbWF4RGlzdGFuY2UsXG4gICAgfTtcbiAgfVxufVxuIiwiaW1wb3J0IHR5cGUgeyBSZWN0TGlrZSwgUm90YXRpb24gfSBmcm9tIFwiLi4vdHlwZXMvZ2VvbWV0cnlcIjtcbmltcG9ydCB0eXBlIHsgQ2FyZ29JdGVtIH0gZnJvbSBcIi4uL3ZpZXdNb2RlbHMvQ2FyZ29JdGVtXCI7XG5pbXBvcnQgeyBvdmVybGFwcywgaXNJbnNpZGVCb3VuZHMgfSBmcm9tIFwiLi9nZW9tZXRyeVJ1bGVzXCI7XG5cbmV4cG9ydCB0eXBlIFZhbGlkYXRpb25FcnJvciA9IFwiT1ZFUkxBUFwiIHwgXCJPVVRfT0ZfQk9VTkRTXCIgfCBcIkxNX0VYQ0VFREVEXCIgfCBcIkhFSUdIVF9FWENFRURFRFwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFZhbGlkYXRpb25SZXN1bHQge1xuICB2YWxpZDogYm9vbGVhbjtcbiAgZXJyb3JzOiBWYWxpZGF0aW9uRXJyb3JbXTtcbiAgaXRlbUVycm9ycz86IFJlY29yZDxzdHJpbmcsIFZhbGlkYXRpb25FcnJvcltdPjsgLy8gUGVyLWl0ZW0gZXJyb3IgbWFwcGluZyBmb3IgVUkgaGlnaGxpZ2h0aW5nXG59XG5cbi8vIFZhbGlkYXRlIGEgc2luZ2xlIGl0ZW0gYWdhaW5zdCBib3VuZHMgYW5kIG90aGVyIGl0ZW1zXG5leHBvcnQgY29uc3QgdmFsaWRhdGVJdGVtID0gKFxuICBpdGVtOiBSZWN0TGlrZSAmIFBhcnRpYWw8eyByb3RhdGlvbjogUm90YXRpb24gfT4sXG4gIGJvdW5kczogUmVjdExpa2UsXG4gIG90aGVyczogQXJyYXk8UmVjdExpa2UgJiBQYXJ0aWFsPHsgcm90YXRpb246IFJvdGF0aW9uIH0+PlxuKTogVmFsaWRhdGlvblJlc3VsdCA9PiB7XG4gIGNvbnN0IGVycm9yczogVmFsaWRhdGlvbkVycm9yW10gPSBbXTtcblxuICBpZiAoIWlzSW5zaWRlQm91bmRzKGl0ZW0sIGJvdW5kcykpIHtcbiAgICBlcnJvcnMucHVzaChcIk9VVF9PRl9CT1VORFNcIik7XG4gIH1cblxuICBjb25zdCBoYXNPdmVybGFwID0gb3RoZXJzLnNvbWUoKG90aGVyKSA9PiBvdmVybGFwcyhpdGVtLCBvdGhlcikpO1xuXG4gIGlmIChoYXNPdmVybGFwKSB7XG4gICAgZXJyb3JzLnB1c2goXCJPVkVSTEFQXCIpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICB2YWxpZDogZXJyb3JzLmxlbmd0aCA9PT0gMCxcbiAgICBlcnJvcnMsXG4gIH07XG59O1xuXG4vLyBWYWxpZGF0ZSB0b3RhbCBsb2FkIG1ldGVycyAoTE0pIGFnYWluc3QgdHJhaWxlcidzIG1heCBsb2FkIG1ldGVyc1xuZXhwb3J0IGNvbnN0IHZhbGlkYXRlTG9hZE1ldGVycyA9IChpdGVtczogQ2FyZ29JdGVtW10sIG1heExvYWRNZXRlcnM6IG51bWJlciwgc2NhbGU6IG51bWJlcik6IFZhbGlkYXRpb25SZXN1bHQgPT4ge1xuICBjb25zdCB0b3RhbExlbmd0aE1ldGVycyA9IGl0ZW1zLnJlZHVjZSgoc3VtLCBpdGVtKSA9PiBzdW0gKyBpdGVtLndpZHRoIC8gc2NhbGUsIDApO1xuXG4gIGlmICh0b3RhbExlbmd0aE1ldGVycyA+IG1heExvYWRNZXRlcnMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdmFsaWQ6IGZhbHNlLFxuICAgICAgZXJyb3JzOiBbXCJMTV9FWENFRURFRFwiXSxcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICB2YWxpZDogdHJ1ZSxcbiAgICBlcnJvcnM6IFtdLFxuICB9O1xufTtcblxuLy8gVmFsaWRhdGUgaXRlbSBoZWlnaHRzIGFnYWluc3QgdHJhaWxlcidzIGludGVybmFsIGhlaWdodFxuZXhwb3J0IGNvbnN0IHZhbGlkYXRlSGVpZ2h0ID0gKGl0ZW1zOiBDYXJnb0l0ZW1bXSwgaW50ZXJuYWxIZWlnaHRNZXRlcjogbnVtYmVyKTogVmFsaWRhdGlvblJlc3VsdCA9PiB7XG4gIGNvbnN0IGl0ZW1FcnJvcnM6IFJlY29yZDxzdHJpbmcsIFZhbGlkYXRpb25FcnJvcltdPiA9IHt9O1xuICBsZXQgaGFzRXJyb3IgPSBmYWxzZTtcblxuICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICBjb25zdCBpdGVtSGVpZ2h0ID0gaXRlbS5oZWlnaHRNID8/IDA7XG4gICAgaWYgKGl0ZW1IZWlnaHQgPiBpbnRlcm5hbEhlaWdodE1ldGVyKSB7XG4gICAgICBpdGVtRXJyb3JzW2l0ZW0uaWRdID0gW1wiSEVJR0hUX0VYQ0VFREVEXCJdO1xuICAgICAgaGFzRXJyb3IgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgdmFsaWQ6ICFoYXNFcnJvcixcbiAgICBlcnJvcnM6IGhhc0Vycm9yID8gW1wiSEVJR0hUX0VYQ0VFREVEXCJdIDogW10sXG4gICAgaXRlbUVycm9ycyxcbiAgfTtcbn07XG5cbi8vIFZhbGlkYXRlIGFsbCBpdGVtcyBhZ2FpbnN0IGJvdW5kcywgZWFjaCBvdGhlciwgTE0sIGFuZCBoZWlnaHRcbmV4cG9ydCBjb25zdCB2YWxpZGF0ZUFsbCA9IChcbiAgaXRlbXM6IENhcmdvSXRlbVtdLFxuICBib3VuZHM6IFJlY3RMaWtlLFxuICBvcHRpb25zPzoge1xuICAgIG1heExvYWRNZXRlcnM/OiBudW1iZXI7XG4gICAgaW50ZXJuYWxIZWlnaHRNZXRlcj86IG51bWJlcjtcbiAgICBzY2FsZT86IG51bWJlcjtcbiAgfVxuKTogVmFsaWRhdGlvblJlc3VsdCA9PiB7XG4gIGNvbnN0IGFsbEVycm9yczogVmFsaWRhdGlvbkVycm9yW10gPSBbXTtcbiAgY29uc3QgaXRlbUVycm9yczogUmVjb3JkPHN0cmluZywgVmFsaWRhdGlvbkVycm9yW10+ID0ge307XG5cbiAgLy8gMS4gVmFsaWRhdGUgZWFjaCBpdGVtIGFnYWluc3QgYm91bmRzIGFuZCBvdmVybGFwc1xuICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICBjb25zdCBvdGhlcnMgPSBpdGVtcy5maWx0ZXIoKG90aGVyKSA9PiBvdGhlci5pZCAhPT0gaXRlbS5pZCk7XG4gICAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVJdGVtKGl0ZW0sIGJvdW5kcywgb3RoZXJzKTtcbiAgICBpZiAoIXJlc3VsdC52YWxpZCkge1xuICAgICAgYWxsRXJyb3JzLnB1c2goLi4ucmVzdWx0LmVycm9ycyk7XG4gICAgICBpdGVtRXJyb3JzW2l0ZW0uaWRdID0gcmVzdWx0LmVycm9ycztcbiAgICB9XG4gIH1cblxuICAvLyAyLiBWYWxpZGF0ZSBsb2FkIG1ldGVyc1xuICBpZiAob3B0aW9ucz8ubWF4TG9hZE1ldGVycyAmJiBvcHRpb25zPy5zY2FsZSkge1xuICAgIGNvbnN0IGxtUmVzdWx0ID0gdmFsaWRhdGVMb2FkTWV0ZXJzKGl0ZW1zLCBvcHRpb25zLm1heExvYWRNZXRlcnMsIG9wdGlvbnMuc2NhbGUpO1xuICAgIGlmICghbG1SZXN1bHQudmFsaWQpIHtcbiAgICAgIGFsbEVycm9ycy5wdXNoKC4uLmxtUmVzdWx0LmVycm9ycyk7XG4gICAgfVxuICB9XG5cbiAgLy8gMy4gVmFsaWRhdGUgaGVpZ2h0XG4gIGlmIChvcHRpb25zPy5pbnRlcm5hbEhlaWdodE1ldGVyKSB7XG4gICAgY29uc3QgaGVpZ2h0UmVzdWx0ID0gdmFsaWRhdGVIZWlnaHQoaXRlbXMsIG9wdGlvbnMuaW50ZXJuYWxIZWlnaHRNZXRlcik7XG4gICAgaWYgKCFoZWlnaHRSZXN1bHQudmFsaWQpIHtcbiAgICAgIGFsbEVycm9ycy5wdXNoKC4uLmhlaWdodFJlc3VsdC5lcnJvcnMpO1xuICAgICAgT2JqZWN0LmFzc2lnbihpdGVtRXJyb3JzLCBoZWlnaHRSZXN1bHQuaXRlbUVycm9ycyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICB2YWxpZDogYWxsRXJyb3JzLmxlbmd0aCA9PT0gMCxcbiAgICBlcnJvcnM6IGFsbEVycm9ycyxcbiAgICBpdGVtRXJyb3JzLFxuICB9O1xufTtcbiIsImltcG9ydCB0eXBlIHsgQ2FyZ29JdGVtIH0gZnJvbSBcIi4uL3ZpZXdNb2RlbHMvQ2FyZ29JdGVtXCI7XG5pbXBvcnQgdHlwZSB7IFJlY3RMaWtlIH0gZnJvbSBcIi4uL3R5cGVzL2dlb21ldHJ5XCI7XG5pbXBvcnQgeyB2YWxpZGF0ZUFsbCwgdHlwZSBWYWxpZGF0aW9uUmVzdWx0IH0gZnJvbSBcIi4uL2RvbWFpbi92YWxpZGF0aW9uUnVsZXNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBWYWxpZGF0aW9uT3B0aW9ucyB7XG4gICAgbWF4TG9hZE1ldGVycz86IG51bWJlcjtcbiAgICBpbnRlcm5hbEhlaWdodE1ldGVyPzogbnVtYmVyO1xuICAgIHNjYWxlPzogbnVtYmVyO1xufVxuXG5leHBvcnQgY2xhc3MgVmFsaWRhdGlvbkVuZ2luZSB7XG4gICAgdmFsaWRhdGVJdGVtcyhpdGVtczogQ2FyZ29JdGVtW10sIGJvdW5kczogUmVjdExpa2UsIG9wdGlvbnM/OiBWYWxpZGF0aW9uT3B0aW9ucyk6IFZhbGlkYXRpb25SZXN1bHQge1xuICAgICAgICByZXR1cm4gdmFsaWRhdGVBbGwoaXRlbXMsIGJvdW5kcywgb3B0aW9ucyk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgdXNlRWZmZWN0IH0gZnJvbSBcInJlYWN0XCI7XG5cbmludGVyZmFjZSBVc2VNb3VzZUV2ZW50c1Byb3BzIHtcbiAgICBkcmFnZ2luZzogYm9vbGVhbjtcbiAgICBtb3ZlSXRlbXM6IChlOiBNb3VzZUV2ZW50KSA9PiB2b2lkO1xuICAgIGhhbmRsZU1vdXNlVXA6ICgpID0+IHZvaWQ7XG4gICAgaGFuZGxlQ2FuY2VsOiAoKSA9PiB2b2lkO1xufVxuXG5leHBvcnQgY29uc3QgdXNlTW91c2VFdmVudHMgPSAoeyBkcmFnZ2luZywgbW92ZUl0ZW1zLCBoYW5kbGVNb3VzZVVwLCBoYW5kbGVDYW5jZWwgfTogVXNlTW91c2VFdmVudHNQcm9wcyk6IHZvaWQgPT4ge1xuICAgIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgICAgIGNvbnN0IGhhbmRsZU1vdmUgPSAoZTogTW91c2VFdmVudCk6IHZvaWQgPT4ge1xuICAgICAgICAgICAgaWYgKGRyYWdnaW5nKSB7XG4gICAgICAgICAgICAgICAgbW92ZUl0ZW1zKGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICghZHJhZ2dpbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIGhhbmRsZU1vdmUpO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgaGFuZGxlTW91c2VVcCk7XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCBoYW5kbGVDYW5jZWwpO1xuXG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBoYW5kbGVNb3ZlKTtcbiAgICAgICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCBoYW5kbGVNb3VzZVVwKTtcbiAgICAgICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwiYmx1clwiLCBoYW5kbGVDYW5jZWwpO1xuICAgICAgICB9O1xuICAgIH0sIFtkcmFnZ2luZywgbW92ZUl0ZW1zLCBoYW5kbGVNb3VzZVVwLCBoYW5kbGVDYW5jZWxdKTtcbn07XG4iLCJpbXBvcnQgdHlwZSB7IENhbnZhc1N0YXRlIH0gZnJvbSBcIi4vQ2FudmFzU3RhdGVcIjtcbmltcG9ydCB0eXBlIHsgU3RhdGVMaXN0ZW5lciB9IGZyb20gXCIuL0NhbnZhc1N0YXRlTGlzdGVuZXJcIjtcblxuLyoqXG4gKiBEZWVwLWNsb25lIGEgQ2FudmFzU3RhdGUgdXNpbmcgSlNPTiByb3VuZC10cmlwLlxuICogQXZvaWRzIHN0cnVjdHVyZWRDbG9uZSAodW5hdmFpbGFibGUgaW4gTm9kZSA8MTcgLyBvbGRlciBqc2RvbSkuXG4gKi9cbmZ1bmN0aW9uIGNsb25lU3RhdGUoc3RhdGU6IENhbnZhc1N0YXRlKTogQ2FudmFzU3RhdGUge1xuICByZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzdGF0ZSkpIGFzIENhbnZhc1N0YXRlO1xufVxuXG5leHBvcnQgY2xhc3MgQ2FudmFzU3RhdGVNYW5hZ2VyIHtcbiAgcHJpdmF0ZSBzdGF0ZTogQ2FudmFzU3RhdGU7XG4gIHByaXZhdGUgbGlzdGVuZXJzOiBTZXQ8U3RhdGVMaXN0ZW5lcj4gPSBuZXcgU2V0KCk7XG4gIHByaXZhdGUgaGlzdG9yeTogQ2FudmFzU3RhdGVbXSA9IFtdO1xuICBwcml2YXRlIGhpc3RvcnlJbmRleCA9IC0xO1xuXG4gIGNvbnN0cnVjdG9yKGluaXRpYWxTdGF0ZTogQ2FudmFzU3RhdGUpIHtcbiAgICB0aGlzLnN0YXRlID0gY2xvbmVTdGF0ZShpbml0aWFsU3RhdGUpO1xuICAgIHRoaXMuaGlzdG9yeSA9IFtjbG9uZVN0YXRlKGluaXRpYWxTdGF0ZSldO1xuICAgIHRoaXMuaGlzdG9yeUluZGV4ID0gMDtcbiAgfVxuXG4gIGdldFN0YXRlKCk6IENhbnZhc1N0YXRlIHtcbiAgICByZXR1cm4gY2xvbmVTdGF0ZSh0aGlzLnN0YXRlKTtcbiAgfVxuXG4gIHNldFN0YXRlKG5leHRTdGF0ZTogQ2FudmFzU3RhdGUpOiB2b2lkIHtcbiAgICBjb25zdCBuZXh0Q2xvbmUgPSBjbG9uZVN0YXRlKG5leHRTdGF0ZSk7XG4gICAgdGhpcy5zdGF0ZSA9IG5leHRDbG9uZTtcbiAgICAvLyBQdXNoIHRvIGhpc3RvcnksIHRydW5jYXRpbmcgYW55IHJlZG8gYnJhbmNoXG4gICAgdGhpcy5oaXN0b3J5ID0gdGhpcy5oaXN0b3J5LnNsaWNlKDAsIHRoaXMuaGlzdG9yeUluZGV4ICsgMSk7XG4gICAgdGhpcy5oaXN0b3J5LnB1c2gobmV4dENsb25lKTtcbiAgICB0aGlzLmhpc3RvcnlJbmRleCA9IHRoaXMuaGlzdG9yeS5sZW5ndGggLSAxO1xuICAgIHRoaXMubm90aWZ5TGlzdGVuZXJzKCk7XG4gIH1cblxuICB1cGRhdGVTdGF0ZSh1cGRhdGU6IChzdGF0ZTogQ2FudmFzU3RhdGUpID0+IENhbnZhc1N0YXRlKTogdm9pZCB7XG4gICAgdGhpcy5zZXRTdGF0ZSh1cGRhdGUodGhpcy5zdGF0ZSkpO1xuICB9XG5cbiAgc3Vic2NyaWJlKGxpc3RlbmVyOiBTdGF0ZUxpc3RlbmVyKTogKCkgPT4gdm9pZCB7XG4gICAgdGhpcy5saXN0ZW5lcnMuYWRkKGxpc3RlbmVyKTtcbiAgICBsaXN0ZW5lcih0aGlzLmdldFN0YXRlKCkpO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICB0aGlzLmxpc3RlbmVycy5kZWxldGUobGlzdGVuZXIpO1xuICAgIH07XG4gIH1cblxuICB1bmRvKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmhpc3RvcnlJbmRleCA+IDApIHtcbiAgICAgIHRoaXMuaGlzdG9yeUluZGV4LS07XG4gICAgICB0aGlzLnN0YXRlID0gY2xvbmVTdGF0ZSh0aGlzLmhpc3RvcnlbdGhpcy5oaXN0b3J5SW5kZXhdKTtcbiAgICAgIHRoaXMubm90aWZ5TGlzdGVuZXJzKCk7XG4gICAgfVxuICB9XG5cbiAgcmVkbygpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5oaXN0b3J5SW5kZXggPCB0aGlzLmhpc3RvcnkubGVuZ3RoIC0gMSkge1xuICAgICAgdGhpcy5oaXN0b3J5SW5kZXgrKztcbiAgICAgIHRoaXMuc3RhdGUgPSBjbG9uZVN0YXRlKHRoaXMuaGlzdG9yeVt0aGlzLmhpc3RvcnlJbmRleF0pO1xuICAgICAgdGhpcy5ub3RpZnlMaXN0ZW5lcnMoKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIG5vdGlmeUxpc3RlbmVycygpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGxpc3RlbmVyIG9mIHRoaXMubGlzdGVuZXJzKSB7XG4gICAgICBsaXN0ZW5lcih0aGlzLmdldFN0YXRlKCkpO1xuICAgIH1cbiAgfVxufVxuIiwiaW1wb3J0IHR5cGUgeyBQb2ludCB9IGZyb20gXCIuLi90eXBlcy9nZW9tZXRyeVwiO1xuaW1wb3J0IHR5cGUgeyBDYXJnb0l0ZW0gfSBmcm9tIFwiLi4vdmlld01vZGVscy9DYXJnb0l0ZW1cIjtcbmltcG9ydCB0eXBlIHsgQ2FudmFzU3RhdGVNYW5hZ2VyIH0gZnJvbSBcIi4vQ2FudmFzU3RhdGVNYW5hZ2VyXCI7XG5pbXBvcnQgeyByb3RhdGU5MCwgZ2V0Um90YXRlZFNpemUgfSBmcm9tIFwiLi4vZG9tYWluL3JvdGF0aW9uUnVsZXNcIjtcbmltcG9ydCB7IERyYWdFbmdpbmUgfSBmcm9tIFwiLi4vZW5naW5lcy9EcmFnRW5naW5lXCI7XG5pbXBvcnQgeyBWYWxpZGF0aW9uRW5naW5lIH0gZnJvbSBcIi4uL2VuZ2luZXMvVmFsaWRhdGlvbkVuZ2luZVwiO1xuXG5leHBvcnQgdHlwZSBDYW52YXNBY3Rpb24gPVxuICB8IHsgdHlwZTogXCJTRUxFQ1RcIjsgaWRzOiBzdHJpbmdbXSB9XG4gIHwgeyB0eXBlOiBcIkRFU0VMRUNUXCIgfVxuICB8IHsgdHlwZTogXCJTRVRfQUNUSVZFX0lURU1cIjsgaWQ6IHN0cmluZyB8IG51bGwgfVxuICB8IHsgdHlwZTogXCJTVEFSVF9EUkFHXCI7IGFjdGl2ZUlkOiBzdHJpbmc7IG1vdXNlOiBQb2ludCB9XG4gIHwgeyB0eXBlOiBcIkRSQUdfTU9WRVwiOyBtb3VzZTogUG9pbnQgfVxuICB8IHsgdHlwZTogXCJFTkRfRFJBR1wiIH1cbiAgfCB7IHR5cGU6IFwiUk9UQVRFXCI7IGl0ZW1JZDogc3RyaW5nIH1cbiAgfCB7IHR5cGU6IFwiQUREX0lURU1cIjsgaXRlbTogQ2FyZ29JdGVtIH1cbiAgfCB7IHR5cGU6IFwiU0VUX0lURU1TXCI7IGl0ZW1zOiBDYXJnb0l0ZW1bXSB9XG4gIHwgeyB0eXBlOiBcIlVORE9cIiB9XG4gIHwgeyB0eXBlOiBcIlJFRE9cIiB9O1xuXG5pbnRlcmZhY2UgQ2FudmFzQWN0aW9uRGlzcGF0Y2hlck9wdGlvbnMge1xuICBjYW52YXNXaWR0aDogbnVtYmVyO1xuICBjYW52YXNIZWlnaHQ6IG51bWJlcjtcbiAgZHJhZ0VuZ2luZTogRHJhZ0VuZ2luZTxDYXJnb0l0ZW0+O1xuICB2YWxpZGF0aW9uRW5naW5lOiBWYWxpZGF0aW9uRW5naW5lO1xufVxuXG4vKipcbiAqIEhlbHBlcjogYnVpbGQgdmFsaWRhdGlvbiBvcHRpb25zIGZyb20gdGhlIGN1cnJlbnQgY2FudmFzIHN0YXRlLlxuICogUGFzc2VzIHRyYWlsZXItc3BlY2lmaWMgY29uc3RyYWludHMgKG1heCBsb2FkIG1ldGVycywgaW50ZXJuYWwgaGVpZ2h0LCBzY2FsZSlcbiAqIHRvIHRoZSB2YWxpZGF0aW9uIGVuZ2luZSBmb3IgTE0gYW5kIGhlaWdodCBjaGVja3MuXG4gKi9cbmNvbnN0IGJ1aWxkVmFsaWRhdGlvbk9wdGlvbnMgPSAoc3RhdGU6IHtcbiAgdHJhaWxlcj86IHsgbWF4TG9hZE1ldGVycz86IG51bWJlcjsgaW50ZXJuYWxIZWlnaHRNZXRlcj86IG51bWJlciB9IHwgbnVsbDtcbiAgc2NhbGU6IG51bWJlcjtcbn0pOiB7IG1heExvYWRNZXRlcnM/OiBudW1iZXI7IGludGVybmFsSGVpZ2h0TWV0ZXI/OiBudW1iZXI7IHNjYWxlOiBudW1iZXIgfSA9PiAoe1xuICBtYXhMb2FkTWV0ZXJzOiBzdGF0ZS50cmFpbGVyPy5tYXhMb2FkTWV0ZXJzLFxuICBpbnRlcm5hbEhlaWdodE1ldGVyOiBzdGF0ZS50cmFpbGVyPy5pbnRlcm5hbEhlaWdodE1ldGVyLFxuICBzY2FsZTogc3RhdGUuc2NhbGUsXG59KTtcblxuZXhwb3J0IGNsYXNzIENhbnZhc0FjdGlvbkRpc3BhdGNoZXIge1xuICBwcml2YXRlIG1hbmFnZXI6IENhbnZhc1N0YXRlTWFuYWdlcjtcbiAgcHJpdmF0ZSBjYW52YXNXaWR0aDogbnVtYmVyO1xuICBwcml2YXRlIGNhbnZhc0hlaWdodDogbnVtYmVyO1xuICBwcml2YXRlIGRyYWdFbmdpbmU6IERyYWdFbmdpbmU8Q2FyZ29JdGVtPjtcbiAgcHJpdmF0ZSB2YWxpZGF0aW9uRW5naW5lOiBWYWxpZGF0aW9uRW5naW5lO1xuXG4gIGNvbnN0cnVjdG9yKG1hbmFnZXI6IENhbnZhc1N0YXRlTWFuYWdlciwgb3B0aW9uczogQ2FudmFzQWN0aW9uRGlzcGF0Y2hlck9wdGlvbnMpIHtcbiAgICB0aGlzLm1hbmFnZXIgPSBtYW5hZ2VyO1xuICAgIHRoaXMuY2FudmFzV2lkdGggPSBvcHRpb25zLmNhbnZhc1dpZHRoO1xuICAgIHRoaXMuY2FudmFzSGVpZ2h0ID0gb3B0aW9ucy5jYW52YXNIZWlnaHQ7XG4gICAgdGhpcy5kcmFnRW5naW5lID0gb3B0aW9ucy5kcmFnRW5naW5lO1xuICAgIHRoaXMudmFsaWRhdGlvbkVuZ2luZSA9IG9wdGlvbnMudmFsaWRhdGlvbkVuZ2luZTtcbiAgfVxuXG4gIGRpc3BhdGNoKGFjdGlvbjogQ2FudmFzQWN0aW9uKTogdm9pZCB7XG4gICAgY29uc3Qgc3RhdGUgPSB0aGlzLm1hbmFnZXIuZ2V0U3RhdGUoKTtcblxuICAgIHN3aXRjaCAoYWN0aW9uLnR5cGUpIHtcbiAgICAgIGNhc2UgXCJTRUxFQ1RcIjpcbiAgICAgICAgdGhpcy5tYW5hZ2VyLnVwZGF0ZVN0YXRlKChjdXJyZW50KSA9PiAoe1xuICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgc2VsZWN0ZWRJZHM6IGFjdGlvbi5pZHMsXG4gICAgICAgICAgYWN0aXZlSXRlbUlkOiBhY3Rpb24uaWRzLmxlbmd0aCA9PT0gMSA/IGFjdGlvbi5pZHNbMF0gOiBjdXJyZW50LmFjdGl2ZUl0ZW1JZCxcbiAgICAgICAgfSkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBcIkRFU0VMRUNUXCI6XG4gICAgICAgIHRoaXMubWFuYWdlci51cGRhdGVTdGF0ZSgoY3VycmVudCkgPT4gKHtcbiAgICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICAgIHNlbGVjdGVkSWRzOiBbXSxcbiAgICAgICAgICBhY3RpdmVJdGVtSWQ6IG51bGwsXG4gICAgICAgIH0pKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgXCJTRVRfQUNUSVZFX0lURU1cIjpcbiAgICAgICAgdGhpcy5tYW5hZ2VyLnVwZGF0ZVN0YXRlKChjdXJyZW50KSA9PiAoe1xuICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgYWN0aXZlSXRlbUlkOiBhY3Rpb24uaWQsXG4gICAgICAgIH0pKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgXCJTVEFSVF9EUkFHXCI6IHtcbiAgICAgICAgdGhpcy5kcmFnRW5naW5lLnVwZGF0ZUl0ZW1zKHN0YXRlLmNhcmdvcyk7XG4gICAgICAgIGNvbnN0IHNlbGVjdGVkSWRzID0gc3RhdGUuc2VsZWN0ZWRJZHMuaW5jbHVkZXMoYWN0aW9uLmFjdGl2ZUlkKSA/IHN0YXRlLnNlbGVjdGVkSWRzIDogW2FjdGlvbi5hY3RpdmVJZF07XG4gICAgICAgIHRoaXMuZHJhZ0VuZ2luZS5zdGFydERyYWcoYWN0aW9uLmFjdGl2ZUlkLCBzZWxlY3RlZElkcywgYWN0aW9uLm1vdXNlKTtcbiAgICAgICAgdGhpcy5tYW5hZ2VyLnVwZGF0ZVN0YXRlKChjdXJyZW50KSA9PiAoe1xuICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgc2VsZWN0ZWRJZHMsXG4gICAgICAgICAgYWN0aXZlSXRlbUlkOiBhY3Rpb24uYWN0aXZlSWQsXG4gICAgICAgIH0pKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgXCJEUkFHX01PVkVcIjoge1xuICAgICAgICBjb25zdCBpdGVtcyA9IHRoaXMuZHJhZ0VuZ2luZS5tb3ZlKGFjdGlvbi5tb3VzZSwgdGhpcy5jYW52YXNXaWR0aCwgdGhpcy5jYW52YXNIZWlnaHQpO1xuICAgICAgICB0aGlzLmRyYWdFbmdpbmUudXBkYXRlSXRlbXMoaXRlbXMpO1xuICAgICAgICBjb25zdCB2YWxpZGF0aW9uID0gdGhpcy52YWxpZGF0aW9uRW5naW5lLnZhbGlkYXRlSXRlbXMoXG4gICAgICAgICAgaXRlbXMsXG4gICAgICAgICAgeyB4OiAwLCB5OiAwLCB3aWR0aDogdGhpcy5jYW52YXNXaWR0aCwgaGVpZ2h0OiB0aGlzLmNhbnZhc0hlaWdodCB9LFxuICAgICAgICAgIGJ1aWxkVmFsaWRhdGlvbk9wdGlvbnMoc3RhdGUpXG4gICAgICAgICk7XG5cbiAgICAgICAgdGhpcy5tYW5hZ2VyLnVwZGF0ZVN0YXRlKChjdXJyZW50KSA9PiAoe1xuICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgY2FyZ29zOiBpdGVtcyxcbiAgICAgICAgICB2YWxpZGF0aW9uLFxuICAgICAgICB9KSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBjYXNlIFwiRU5EX0RSQUdcIjoge1xuICAgICAgICB0aGlzLmRyYWdFbmdpbmUuZW5kRHJhZygpO1xuICAgICAgICBjb25zdCBzdGF0ZUFmdGVyRHJhZyA9IHRoaXMubWFuYWdlci5nZXRTdGF0ZSgpO1xuICAgICAgICB0aGlzLm1hbmFnZXIudXBkYXRlU3RhdGUoKGN1cnJlbnQpID0+ICh7XG4gICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICBhY3RpdmVJdGVtSWQ6IG51bGwsXG4gICAgICAgICAgc2VsZWN0ZWRJZHM6IHN0YXRlQWZ0ZXJEcmFnLnNlbGVjdGVkSWRzLFxuICAgICAgICB9KSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBjYXNlIFwiUk9UQVRFXCI6IHtcbiAgICAgICAgY29uc3QgbmV4dENhcmdvcyA9IHN0YXRlLmNhcmdvcy5tYXAoKGl0ZW0pID0+IHtcbiAgICAgICAgICBpZiAoaXRlbS5pZCAhPT0gYWN0aW9uLml0ZW1JZCB8fCBpdGVtLmlzTG9ja2VkKSB7XG4gICAgICAgICAgICByZXR1cm4gaXRlbTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBuZXdSb3RhdGlvbiA9IHJvdGF0ZTkwKGl0ZW0ucm90YXRpb24pO1xuXG4gICAgICAgICAgLy8gY29tcHV0ZSBwcmV2aW91cyB2aXN1YWwgc2l6ZSBhbmQgbmV3IHZpc3VhbCBzaXplICh3aXRob3V0IGNoYW5naW5nIG1vZGVsIHcvaClcbiAgICAgICAgICBjb25zdCBwcmV2VmlzID0gZ2V0Um90YXRlZFNpemUoeyB3aWR0aDogaXRlbS53aWR0aCwgaGVpZ2h0OiBpdGVtLmhlaWdodCB9LCBpdGVtLnJvdGF0aW9uKTtcbiAgICAgICAgICBjb25zdCBuZXh0VmlzID0gZ2V0Um90YXRlZFNpemUoeyB3aWR0aDogaXRlbS53aWR0aCwgaGVpZ2h0OiBpdGVtLmhlaWdodCB9LCBuZXdSb3RhdGlvbik7XG5cbiAgICAgICAgICAvLyBrZWVwIGNlbnRlciBpbnZhcmlhbnQgYmFzZWQgb24gdmlzdWFsIHNpemVzXG4gICAgICAgICAgY29uc3QgY2VudGVyWCA9IGl0ZW0ueCArIHByZXZWaXMud2lkdGggLyAyO1xuICAgICAgICAgIGNvbnN0IGNlbnRlclkgPSBpdGVtLnkgKyBwcmV2VmlzLmhlaWdodCAvIDI7XG5cbiAgICAgICAgICBjb25zdCBuZXdYID0gY2VudGVyWCAtIG5leHRWaXMud2lkdGggLyAyO1xuICAgICAgICAgIGNvbnN0IG5ld1kgPSBjZW50ZXJZIC0gbmV4dFZpcy5oZWlnaHQgLyAyO1xuXG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIC4uLml0ZW0sXG4gICAgICAgICAgICByb3RhdGlvbjogbmV3Um90YXRpb24sXG4gICAgICAgICAgICAvLyBrZWVwIG1vZGVsIHdpZHRoL2hlaWdodCB1bmNoYW5nZWQ7IHJlbmRlcmVyIHVzZXMgZ2V0Um90YXRlZFNpemVcbiAgICAgICAgICAgIHg6IE1hdGgubWF4KDAsIE1hdGgubWluKG5ld1gsIHRoaXMuY2FudmFzV2lkdGggLSBuZXh0VmlzLndpZHRoKSksXG4gICAgICAgICAgICB5OiBNYXRoLm1heCgwLCBNYXRoLm1pbihuZXdZLCB0aGlzLmNhbnZhc0hlaWdodCAtIG5leHRWaXMuaGVpZ2h0KSksXG4gICAgICAgICAgfTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5kcmFnRW5naW5lLnVwZGF0ZUl0ZW1zKG5leHRDYXJnb3MpO1xuICAgICAgICBjb25zdCB2YWxpZGF0aW9uID0gdGhpcy52YWxpZGF0aW9uRW5naW5lLnZhbGlkYXRlSXRlbXMoXG4gICAgICAgICAgbmV4dENhcmdvcyxcbiAgICAgICAgICB7IHg6IDAsIHk6IDAsIHdpZHRoOiB0aGlzLmNhbnZhc1dpZHRoLCBoZWlnaHQ6IHRoaXMuY2FudmFzSGVpZ2h0IH0sXG4gICAgICAgICAgYnVpbGRWYWxpZGF0aW9uT3B0aW9ucyhzdGF0ZSlcbiAgICAgICAgKTtcblxuICAgICAgICB0aGlzLm1hbmFnZXIudXBkYXRlU3RhdGUoKGN1cnJlbnQpID0+ICh7XG4gICAgICAgICAgLi4uY3VycmVudCxcbiAgICAgICAgICBjYXJnb3M6IG5leHRDYXJnb3MsXG4gICAgICAgICAgdmFsaWRhdGlvbixcbiAgICAgICAgfSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgY2FzZSBcIkFERF9JVEVNXCI6IHtcbiAgICAgICAgY29uc3QgbmV3SXRlbSA9IHsgLi4uYWN0aW9uLml0ZW0gfTtcbiAgICAgICAgdGhpcy5tYW5hZ2VyLnVwZGF0ZVN0YXRlKChjdXJyZW50KSA9PiAoe1xuICAgICAgICAgIC4uLmN1cnJlbnQsXG4gICAgICAgICAgY2FyZ29zOiBbLi4uY3VycmVudC5jYXJnb3MsIG5ld0l0ZW1dLFxuICAgICAgICB9KSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBjYXNlIFwiU0VUX0lURU1TXCI6IHtcbiAgICAgICAgdGhpcy5kcmFnRW5naW5lLnVwZGF0ZUl0ZW1zKGFjdGlvbi5pdGVtcyk7XG4gICAgICAgIGNvbnN0IHZhbGlkYXRpb24gPSB0aGlzLnZhbGlkYXRpb25FbmdpbmUudmFsaWRhdGVJdGVtcyhcbiAgICAgICAgICBhY3Rpb24uaXRlbXMsXG4gICAgICAgICAgeyB4OiAwLCB5OiAwLCB3aWR0aDogdGhpcy5jYW52YXNXaWR0aCwgaGVpZ2h0OiB0aGlzLmNhbnZhc0hlaWdodCB9LFxuICAgICAgICAgIGJ1aWxkVmFsaWRhdGlvbk9wdGlvbnMoc3RhdGUpXG4gICAgICAgICk7XG4gICAgICAgIHRoaXMubWFuYWdlci51cGRhdGVTdGF0ZSgoY3VycmVudCkgPT4gKHtcbiAgICAgICAgICAuLi5jdXJyZW50LFxuICAgICAgICAgIGNhcmdvczogYWN0aW9uLml0ZW1zLFxuICAgICAgICAgIHZhbGlkYXRpb24sXG4gICAgICAgIH0pKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgXCJVTkRPXCI6IHtcbiAgICAgICAgdGhpcy5tYW5hZ2VyLnVuZG8oKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgXCJSRURPXCI6IHtcbiAgICAgICAgdGhpcy5tYW5hZ2VyLnJlZG8oKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxufVxuIiwiaW1wb3J0IHsgdXNlRWZmZWN0LCB1c2VTdGF0ZSB9IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHR5cGUgeyBDYW52YXNTdGF0ZU1hbmFnZXIgfSBmcm9tIFwiLi4vc3RhdGUvQ2FudmFzU3RhdGVNYW5hZ2VyXCI7XG5pbXBvcnQgdHlwZSB7IENhbnZhc1N0YXRlIH0gZnJvbSBcIi4uL3N0YXRlL0NhbnZhc1N0YXRlXCI7XG5cbmV4cG9ydCBjb25zdCB1c2VDYW52YXNTdGF0ZSA9IChtYW5hZ2VyOiBDYW52YXNTdGF0ZU1hbmFnZXIpOiBDYW52YXNTdGF0ZSA9PiB7XG4gICAgLy8gVXNlIGEgbGF6eSBpbml0aWFsaXplciB0aGF0IGNhbGxzIG1hbmFnZXIuZ2V0U3RhdGUoKSB3aXRoIGNvcnJlY3QgYHRoaXNgIGJpbmRpbmdcbiAgICBjb25zdCBbc3RhdGUsIHNldFN0YXRlXSA9IHVzZVN0YXRlPENhbnZhc1N0YXRlPigoKSA9PiBtYW5hZ2VyLmdldFN0YXRlKCkpO1xuXG4gICAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICAgICAgY29uc3QgdW5zdWJzY3JpYmUgPSBtYW5hZ2VyLnN1YnNjcmliZShjdXJyZW50U3RhdGUgPT4ge1xuICAgICAgICAgICAgc2V0U3RhdGUoY3VycmVudFN0YXRlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB1bnN1YnNjcmliZTtcbiAgICB9LCBbbWFuYWdlcl0pO1xuXG4gICAgcmV0dXJuIHN0YXRlO1xufTtcbiIsImltcG9ydCB7IHVzZUNhbGxiYWNrIH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgdHlwZSB7IENhbnZhc0FjdGlvbkRpc3BhdGNoZXIgfSBmcm9tIFwiLi4vc3RhdGUvQ2FudmFzQWN0aW9uRGlzcGF0Y2hlclwiO1xuaW1wb3J0IHR5cGUgeyBDYXJnb0l0ZW0gfSBmcm9tIFwiLi4vdmlld01vZGVscy9DYXJnb0l0ZW1cIjtcbmltcG9ydCB0eXBlIHsgUG9pbnQgfSBmcm9tIFwiLi4vdHlwZXMvZ2VvbWV0cnlcIjtcblxuZXhwb3J0IGNvbnN0IHVzZUNhbnZhc0FjdGlvbnMgPSAoXG4gICAgZGlzcGF0Y2hlcjogQ2FudmFzQWN0aW9uRGlzcGF0Y2hlclxuKToge1xuICAgIHN0YXJ0RHJhZzogKGl0ZW1JZDogc3RyaW5nLCBtb3VzZTogUG9pbnQpID0+IHZvaWQ7XG4gICAgZHJhZ01vdmU6IChtb3VzZTogUG9pbnQpID0+IHZvaWQ7XG4gICAgZW5kRHJhZzogKCkgPT4gdm9pZDtcbiAgICByb3RhdGVJdGVtOiAoaXRlbUlkOiBzdHJpbmcpID0+IHZvaWQ7XG4gICAgYWRkSXRlbTogKGl0ZW06IENhcmdvSXRlbSkgPT4gdm9pZDtcbiAgICBzZXRJdGVtczogKGl0ZW1zOiBDYXJnb0l0ZW1bXSkgPT4gdm9pZDtcbiAgICBkZXNlbGVjdDogKCkgPT4gdm9pZDtcbn0gPT4ge1xuICAgIHJldHVybiB7XG4gICAgICAgIHN0YXJ0RHJhZzogdXNlQ2FsbGJhY2soXG4gICAgICAgICAgICAoaXRlbUlkOiBzdHJpbmcsIG1vdXNlOiBQb2ludCkgPT4ge1xuICAgICAgICAgICAgICAgIGRpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBcIlNUQVJUX0RSQUdcIiwgYWN0aXZlSWQ6IGl0ZW1JZCwgbW91c2UgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW2Rpc3BhdGNoZXJdXG4gICAgICAgICksXG4gICAgICAgIGRyYWdNb3ZlOiB1c2VDYWxsYmFjayhcbiAgICAgICAgICAgIChtb3VzZTogUG9pbnQpID0+IHtcbiAgICAgICAgICAgICAgICBkaXNwYXRjaGVyLmRpc3BhdGNoKHsgdHlwZTogXCJEUkFHX01PVkVcIiwgbW91c2UgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgW2Rpc3BhdGNoZXJdXG4gICAgICAgICksXG4gICAgICAgIGVuZERyYWc6IHVzZUNhbGxiYWNrKCgpID0+IHtcbiAgICAgICAgICAgIGRpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBcIkVORF9EUkFHXCIgfSk7XG4gICAgICAgIH0sIFtkaXNwYXRjaGVyXSksXG4gICAgICAgIHJvdGF0ZUl0ZW06IHVzZUNhbGxiYWNrKFxuICAgICAgICAgICAgKGl0ZW1JZDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgZGlzcGF0Y2hlci5kaXNwYXRjaCh7IHR5cGU6IFwiUk9UQVRFXCIsIGl0ZW1JZCB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBbZGlzcGF0Y2hlcl1cbiAgICAgICAgKSxcbiAgICAgICAgYWRkSXRlbTogdXNlQ2FsbGJhY2soXG4gICAgICAgICAgICAoaXRlbTogQ2FyZ29JdGVtKSA9PiB7XG4gICAgICAgICAgICAgICAgZGlzcGF0Y2hlci5kaXNwYXRjaCh7IHR5cGU6IFwiQUREX0lURU1cIiwgaXRlbSB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBbZGlzcGF0Y2hlcl1cbiAgICAgICAgKSxcbiAgICAgICAgc2V0SXRlbXM6IHVzZUNhbGxiYWNrKFxuICAgICAgICAgICAgKGl0ZW1zOiBDYXJnb0l0ZW1bXSkgPT4ge1xuICAgICAgICAgICAgICAgIGRpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBcIlNFVF9JVEVNU1wiLCBpdGVtcyB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBbZGlzcGF0Y2hlcl1cbiAgICAgICAgKSxcbiAgICAgICAgZGVzZWxlY3Q6IHVzZUNhbGxiYWNrKCgpID0+IHtcbiAgICAgICAgICAgIGRpc3BhdGNoZXIuZGlzcGF0Y2goeyB0eXBlOiBcIkRFU0VMRUNUXCIgfSk7XG4gICAgICAgIH0sIFtkaXNwYXRjaGVyXSlcbiAgICB9O1xufTtcbiIsImltcG9ydCB0eXBlIHsgUG9pbnQgfSBmcm9tIFwiLi4vdHlwZXMvZ2VvbWV0cnlcIjtcblxuLyoqXG4gKiBDb252ZXJ0IGJyb3dzZXIgY29vcmRpbmF0ZSB0byBjYW52YXMgY29vcmRpbmF0ZS5cbiAqL1xuZXhwb3J0IGNvbnN0IGdldENhbnZhc1BvaW50ID0gKGNhbnZhczogSFRNTERpdkVsZW1lbnQgfCBudWxsLCBjbGllbnRYOiBudW1iZXIsIGNsaWVudFk6IG51bWJlcik6IFBvaW50ID0+IHtcbiAgICBpZiAoIWNhbnZhcykge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogMCxcbiAgICAgICAgICAgIHk6IDBcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBjb25zdCByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgeDogY2xpZW50WCAtIHJlY3QubGVmdCxcblxuICAgICAgICB5OiBjbGllbnRZIC0gcmVjdC50b3BcbiAgICB9O1xufTtcblxuZXhwb3J0IGNvbnN0IG1ldGVyVG9QaXhlbCA9IChtZXRlcjogbnVtYmVyLCBzY2FsZTogbnVtYmVyKTogbnVtYmVyID0+IHtcbiAgICByZXR1cm4gbWV0ZXIgKiBzY2FsZTtcbn07XG5cbmV4cG9ydCBjb25zdCBwaXhlbFRvTWV0ZXIgPSAocGl4ZWw6IG51bWJlciwgc2NhbGU6IG51bWJlcik6IG51bWJlciA9PiB7XG4gICAgcmV0dXJuIHBpeGVsIC8gc2NhbGU7XG59O1xuIiwiaW1wb3J0IHsgdXNlRWZmZWN0LCB1c2VNZW1vLCB1c2VTdGF0ZSwgdHlwZSBNb3VzZUV2ZW50IGFzIFJlYWN0TW91c2VFdmVudCwgdHlwZSBSZWZPYmplY3QgfSBmcm9tIFwicmVhY3RcIjtcbmltcG9ydCB0eXBlIHsgQ2FyZ29JdGVtIH0gZnJvbSBcIi4uL3ZpZXdNb2RlbHMvQ2FyZ29JdGVtXCI7XG5pbXBvcnQgdHlwZSB7IFRyYWlsZXJJdGVtIH0gZnJvbSBcIi4uL3ZpZXdNb2RlbHMvVHJhaWxlckl0ZW1cIjtcbmltcG9ydCB7IERyYWdFbmdpbmUgfSBmcm9tIFwiLi4vZW5naW5lcy9EcmFnRW5naW5lXCI7XG5pbXBvcnQgeyBDb2xsaXNpb25FbmdpbmUgfSBmcm9tIFwiLi4vZW5naW5lcy9Db2xsaXNpb25FbmdpbmVcIjtcbmltcG9ydCB7IFNuYXBFbmdpbmUgfSBmcm9tIFwiLi4vZW5naW5lcy9TbmFwRW5naW5lXCI7XG5pbXBvcnQgeyBWYWxpZGF0aW9uRW5naW5lIH0gZnJvbSBcIi4uL2VuZ2luZXMvVmFsaWRhdGlvbkVuZ2luZVwiO1xuaW1wb3J0IHsgdXNlTW91c2VFdmVudHMgfSBmcm9tIFwiLi91c2VNb3VzZUV2ZW50c1wiO1xuaW1wb3J0IHsgQ2FudmFzU3RhdGVNYW5hZ2VyIH0gZnJvbSBcIi4uL3N0YXRlL0NhbnZhc1N0YXRlTWFuYWdlclwiO1xuaW1wb3J0IHsgQ2FudmFzQWN0aW9uRGlzcGF0Y2hlciB9IGZyb20gXCIuLi9zdGF0ZS9DYW52YXNBY3Rpb25EaXNwYXRjaGVyXCI7XG5pbXBvcnQgeyB1c2VDYW52YXNTdGF0ZSB9IGZyb20gXCIuL3VzZUNhbnZhc1N0YXRlXCI7XG5pbXBvcnQgeyB1c2VDYW52YXNBY3Rpb25zIH0gZnJvbSBcIi4vdXNlQ2FudmFzQWN0aW9uc1wiO1xuaW1wb3J0IHsgZ2V0Q2FudmFzUG9pbnQgfSBmcm9tIFwiLi4vZG9tYWluL2Nvb3JkaW5hdGVSdWxlc1wiO1xuaW1wb3J0IHR5cGUgeyBDYW52YXNTdGF0ZSB9IGZyb20gXCIuLi9zdGF0ZS9DYW52YXNTdGF0ZVwiO1xuXG5pbnRlcmZhY2UgVXNlVHJhaWxlckNhbnZhc1Byb3BzIHtcbiAgaW5pdGlhbEl0ZW1zOiBDYXJnb0l0ZW1bXTtcbiAgY2FudmFzV2lkdGg6IG51bWJlcjtcbiAgY2FudmFzSGVpZ2h0OiBudW1iZXI7XG4gIGNhbnZhc1JlZjogUmVmT2JqZWN0PEhUTUxEaXZFbGVtZW50IHwgbnVsbD47XG4gIHNjYWxlPzogbnVtYmVyO1xuICB0cmFpbGVyPzogVHJhaWxlckl0ZW0gfCBudWxsO1xufVxuXG5pbnRlcmZhY2UgVXNlVHJhaWxlckNhbnZhc1Jlc3VsdCB7XG4gIGl0ZW1zOiBDYXJnb0l0ZW1bXTtcbiAgYWN0aXZlSXRlbUlkOiBzdHJpbmcgfCBudWxsO1xuICBzZWxlY3RlZElkczogc3RyaW5nW107XG4gIHZhbGlkYXRpb246IHsgdmFsaWQ6IGJvb2xlYW47IGVycm9yczogc3RyaW5nW107IGl0ZW1FcnJvcnM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT4gfTtcbiAgaGFuZGxlTW91c2VEb3duOiAoZTogUmVhY3RNb3VzZUV2ZW50LCBpdGVtSWQ6IHN0cmluZykgPT4gdm9pZDtcbiAgaGFuZGxlQ2FudmFzTW91c2VEb3duOiAoZTogUmVhY3RNb3VzZUV2ZW50PEhUTUxEaXZFbGVtZW50PikgPT4gdm9pZDtcbiAgaGFuZGxlUm90YXRlOiAoaXRlbUlkOiBzdHJpbmcpID0+IHZvaWQ7XG4gIGFkZEl0ZW06IChpdGVtOiBDYXJnb0l0ZW0pID0+IHZvaWQ7XG4gIHNldEl0ZW1zOiAoaXRlbXM6IENhcmdvSXRlbVtdKSA9PiB2b2lkO1xufVxuXG5jb25zdCBjcmVhdGVJbml0aWFsQ2FudmFzU3RhdGUgPSAoXG4gIGluaXRpYWxJdGVtczogQ2FyZ29JdGVtW10sXG4gIHNjYWxlOiBudW1iZXIsXG4gIHRyYWlsZXI6IFRyYWlsZXJJdGVtIHwgbnVsbFxuKTogQ2FudmFzU3RhdGUgPT4gKHtcbiAgdHJhaWxlcixcbiAgY2FyZ29zOiBpbml0aWFsSXRlbXMsXG4gIHNlbGVjdGVkSWRzOiBbXSxcbiAgYWN0aXZlSXRlbUlkOiBudWxsLFxuICB2YWxpZGF0aW9uOiB7XG4gICAgdmFsaWQ6IHRydWUsXG4gICAgZXJyb3JzOiBbXSxcbiAgfSxcbiAgc2NhbGUsXG59KTtcblxuZXhwb3J0IGNvbnN0IHVzZVRyYWlsZXJDYW52YXMgPSAoe1xuICBpbml0aWFsSXRlbXMsXG4gIGNhbnZhc1dpZHRoLFxuICBjYW52YXNIZWlnaHQsXG4gIGNhbnZhc1JlZixcbiAgc2NhbGUgPSAxLFxuICB0cmFpbGVyID0gbnVsbCxcbn06IFVzZVRyYWlsZXJDYW52YXNQcm9wcyk6IFVzZVRyYWlsZXJDYW52YXNSZXN1bHQgPT4ge1xuICBjb25zdCBjb2xsaXNpb25FbmdpbmUgPSB1c2VNZW1vKCgpID0+IG5ldyBDb2xsaXNpb25FbmdpbmUoKSwgW10pO1xuICBjb25zdCBzbmFwRW5naW5lID0gdXNlTWVtbygoKSA9PiBuZXcgU25hcEVuZ2luZSgpLCBbXSk7XG4gIGNvbnN0IGRyYWdFbmdpbmUgPSB1c2VNZW1vKFxuICAgICgpID0+IG5ldyBEcmFnRW5naW5lPENhcmdvSXRlbT4oaW5pdGlhbEl0ZW1zLCBjb2xsaXNpb25FbmdpbmUsIHNuYXBFbmdpbmUpLFxuICAgIFtpbml0aWFsSXRlbXMsIGNvbGxpc2lvbkVuZ2luZSwgc25hcEVuZ2luZV1cbiAgKTtcbiAgY29uc3QgdmFsaWRhdGlvbkVuZ2luZSA9IHVzZU1lbW8oKCkgPT4gbmV3IFZhbGlkYXRpb25FbmdpbmUoKSwgW10pO1xuICBjb25zdCBzdGF0ZU1hbmFnZXIgPSB1c2VNZW1vKFxuICAgICgpID0+IG5ldyBDYW52YXNTdGF0ZU1hbmFnZXIoY3JlYXRlSW5pdGlhbENhbnZhc1N0YXRlKGluaXRpYWxJdGVtcywgc2NhbGUsIHRyYWlsZXIpKSxcbiAgICBbaW5pdGlhbEl0ZW1zLCBzY2FsZSwgdHJhaWxlcl1cbiAgKTtcbiAgY29uc3QgYWN0aW9uRGlzcGF0Y2hlciA9IHVzZU1lbW8oXG4gICAgKCkgPT5cbiAgICAgIG5ldyBDYW52YXNBY3Rpb25EaXNwYXRjaGVyKHN0YXRlTWFuYWdlciwge1xuICAgICAgICBjYW52YXNXaWR0aCxcbiAgICAgICAgY2FudmFzSGVpZ2h0LFxuICAgICAgICBkcmFnRW5naW5lLFxuICAgICAgICB2YWxpZGF0aW9uRW5naW5lLFxuICAgICAgfSksXG4gICAgW2NhbnZhc1dpZHRoLCBjYW52YXNIZWlnaHQsIHN0YXRlTWFuYWdlciwgZHJhZ0VuZ2luZSwgdmFsaWRhdGlvbkVuZ2luZV1cbiAgKTtcblxuICBjb25zdCBzdGF0ZSA9IHVzZUNhbnZhc1N0YXRlKHN0YXRlTWFuYWdlcik7XG4gIGNvbnN0IGFjdGlvbnMgPSB1c2VDYW52YXNBY3Rpb25zKGFjdGlvbkRpc3BhdGNoZXIpO1xuXG4gIGNvbnN0IFtkcmFnZ2luZywgc2V0RHJhZ2dpbmddID0gdXNlU3RhdGUoZmFsc2UpO1xuXG4gIGNvbnN0IGhhbmRsZU1vdXNlRG93biA9IChlOiBSZWFjdE1vdXNlRXZlbnQsIGl0ZW1JZDogc3RyaW5nKTogdm9pZCA9PiB7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBjb25zdCBwb2ludCA9IGdldENhbnZhc1BvaW50KGNhbnZhc1JlZi5jdXJyZW50LCBlLmNsaWVudFgsIGUuY2xpZW50WSk7XG4gICAgYWN0aW9ucy5zdGFydERyYWcoaXRlbUlkLCBwb2ludCk7XG4gICAgc2V0RHJhZ2dpbmcodHJ1ZSk7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlQ2FudmFzTW91c2VEb3duID0gKF9lOiBSZWFjdE1vdXNlRXZlbnQ8SFRNTERpdkVsZW1lbnQ+KTogdm9pZCA9PiB7XG4gICAgYWN0aW9ucy5kZXNlbGVjdCgpO1xuICB9O1xuXG4gIGNvbnN0IGRyYWdNb3ZlID0gKGU6IE1vdXNlRXZlbnQpOiB2b2lkID0+IHtcbiAgICBjb25zdCBwb2ludCA9IGdldENhbnZhc1BvaW50KGNhbnZhc1JlZi5jdXJyZW50LCBlLmNsaWVudFgsIGUuY2xpZW50WSk7XG4gICAgYWN0aW9ucy5kcmFnTW92ZShwb2ludCk7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlTW91c2VVcCA9ICgpOiB2b2lkID0+IHtcbiAgICBhY3Rpb25zLmVuZERyYWcoKTtcbiAgICBzZXREcmFnZ2luZyhmYWxzZSk7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlQ2FuY2VsID0gKCk6IHZvaWQgPT4ge1xuICAgIGFjdGlvbnMuZW5kRHJhZygpO1xuICAgIHNldERyYWdnaW5nKGZhbHNlKTtcbiAgfTtcblxuICB1c2VNb3VzZUV2ZW50cyh7XG4gICAgZHJhZ2dpbmcsXG4gICAgbW92ZUl0ZW1zOiBkcmFnTW92ZSxcbiAgICBoYW5kbGVNb3VzZVVwLFxuICAgIGhhbmRsZUNhbmNlbCxcbiAgfSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBkcmFnRW5naW5lLnVwZGF0ZUl0ZW1zKHN0YXRlLmNhcmdvcyk7XG4gIH0sIFtzdGF0ZS5jYXJnb3MsIGRyYWdFbmdpbmVdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmIChzdGF0ZU1hbmFnZXIuZ2V0U3RhdGUoKS5jYXJnb3MubGVuZ3RoICE9PSBpbml0aWFsSXRlbXMubGVuZ3RoKSB7XG4gICAgICBzdGF0ZU1hbmFnZXIuc2V0U3RhdGUoY3JlYXRlSW5pdGlhbENhbnZhc1N0YXRlKGluaXRpYWxJdGVtcywgc2NhbGUsIHRyYWlsZXIpKTtcbiAgICB9XG4gIH0sIFtpbml0aWFsSXRlbXMsIHN0YXRlTWFuYWdlciwgc2NhbGUsIHRyYWlsZXJdKTtcblxuICByZXR1cm4ge1xuICAgIGl0ZW1zOiBzdGF0ZS5jYXJnb3MsXG4gICAgYWN0aXZlSXRlbUlkOiBzdGF0ZS5hY3RpdmVJdGVtSWQsXG4gICAgc2VsZWN0ZWRJZHM6IHN0YXRlLnNlbGVjdGVkSWRzLFxuICAgIHZhbGlkYXRpb246IHN0YXRlLnZhbGlkYXRpb24sXG4gICAgaGFuZGxlTW91c2VEb3duLFxuICAgIGhhbmRsZUNhbnZhc01vdXNlRG93bixcbiAgICBoYW5kbGVSb3RhdGU6IGFjdGlvbnMucm90YXRlSXRlbSxcbiAgICBhZGRJdGVtOiBhY3Rpb25zLmFkZEl0ZW0sXG4gICAgc2V0SXRlbXM6IGFjdGlvbnMuc2V0SXRlbXMsXG4gIH07XG59O1xuIiwiLy8gdGhlbWUgdWksIGNhbnZhcyBjb2xvcnNcblxuZXhwb3J0IGNvbnN0IENBTlZBU19CQUNLR1JPVU5EX0NPTE9SID0gXCIjZmFmYWZhXCI7XG4iLCJpbXBvcnQgeyB1c2VFZmZlY3QsIHVzZVJlZiwgdXNlU3RhdGUsIHR5cGUgRHJhZ0V2ZW50LCB0eXBlIFJlYWN0RWxlbWVudCwgdHlwZSBSZWZPYmplY3QgfSBmcm9tIFwicmVhY3RcIjtcbmltcG9ydCB7IENhcmdvQ2FyZCB9IGZyb20gXCIuLi9jb21wb25lbnRzL0NhcmdvQ2FyZFwiO1xuaW1wb3J0IHsgUGFsbGV0TGlzdCB9IGZyb20gXCIuLi9jb21wb25lbnRzL1BhbGxldExpc3RcIjtcbmltcG9ydCB7IEdyaWRPdmVybGF5IH0gZnJvbSBcIi4uL2NvbXBvbmVudHMvR3JpZE92ZXJsYXlcIjtcbmltcG9ydCB7IHVzZVRyYWlsZXJDYW52YXMgfSBmcm9tIFwiLi4vaG9va3MvdXNlVHJhaWxlckNhbnZhc1wiO1xuaW1wb3J0IHtcbiAgICBERUZBVUxUX0NBTlZBU19XSURUSCxcbiAgICBERUZBVUxUX0NBTlZBU19IRUlHSFQsXG4gICAgQ0FOVkFTX0JPUkRFUixcbiAgICBERUZBVUxUX01BUkdJTixcbiAgICBJTkZPX1BBTkVMX1RPUCxcbiAgICBJTkZPX1BBTkVMX0xFRlQsXG4gICAgSU5GT19QQU5FTF9aX0lOREVYLFxuICAgIElORk9fUEFORUxfUEFERElORyxcbiAgICBJTkZPX1BBTkVMX0JBQ0tHUk9VTkQsXG4gICAgSU5GT19QQU5FTF9CT1JERVIsXG4gICAgR1JJRF9TSVpFXG59IGZyb20gXCIuLi9jb25zdGFudHMvY2FudmFzXCI7XG5pbXBvcnQgeyBDQU5WQVNfQkFDS0dST1VORF9DT0xPUiB9IGZyb20gXCIuLi9jb25zdGFudHMvdGhlbWVcIjtcbmltcG9ydCB0eXBlIHsgQ2FyZ29JdGVtIH0gZnJvbSBcIi4uL3ZpZXdNb2RlbHMvQ2FyZ29JdGVtXCI7XG5pbXBvcnQgdHlwZSB7IExvYWRpbmdDYW52YXNXaWRnZXRQcm9wcyB9IGZyb20gXCIuL0xvYWRpbmdDYW52YXMucHJvcGVydGllc1wiO1xuXG4vKipcbiAqIExvYWRpbmdDYW52YXMg4oCUIHRoZSBNZW5kaXggUGx1Z2dhYmxlIFdpZGdldCBlbnRyeSBwb2ludC5cbiAqXG4gKiBUaGlzIGNvbXBvbmVudCByZWNlaXZlcyB2aWV3IG1vZGVscyBmcm9tIHRoZSBMb2FkaW5nQ2FudmFzQ29udGFpbmVyXG4gKiAod2hpY2ggcmVzb2x2ZXMgTWVuZGl4IG9iamVjdCByZWZlcmVuY2VzIHZpYSBteC5kYXRhKSBhbmQgcmVuZGVycyB0aGVcbiAqIGludGVyYWN0aXZlIHBhY2tpbmcgY2FudmFzLlxuICpcbiAqIEtleSByZXNwb25zaWJpbGl0aWVzOlxuICogLSBSZW5kZXIgdGhlIGNhbnZhcyB3aXRoIHRyYWlsZXIgYm91bmRhcnksIGNhcmdvIGl0ZW1zLCBhbmQgaW5mbyBwYW5lbFxuICogLSBNYW5hZ2UgZHJhZy1hbmQtZHJvcCBmcm9tIHRoZSBwYWxsZXQgbGlzdCBvbnRvIHRoZSBjYW52YXNcbiAqIC0gSGFuZGxlIHJvdGF0aW9uLCBncmlkIHNuYXBwaW5nLCBhbmQgcmVhbC10aW1lIHZhbGlkYXRpb25cbiAqIC0gRGlzcGxheSB2YWxpZGF0aW9uIHN0YXR1cyAoY29sb3JzLCBlcnJvcnMpXG4gKiAtIEV4cG9zZSBzYXZlL2xvYWQgY2FsbGJhY2tzIHRvIHRoZSBjb250YWluZXJcbiAqL1xuZXhwb3J0IGNvbnN0IExvYWRpbmdDYW52YXMgPSAocHJvcHM6IExvYWRpbmdDYW52YXNXaWRnZXRQcm9wcyk6IFJlYWN0RWxlbWVudCA9PiB7XG4gICAgY29uc3QgeyB2aWV3TW9kZWwsIGlzTG9hZGluZyB9ID0gcHJvcHM7XG4gICAgY29uc3Qge1xuICAgICAgICB0cmFpbGVyLFxuICAgICAgICBwYWxsZXRMaXN0LFxuICAgICAgICBpbml0aWFsQ2FudmFzSXRlbXMsXG4gICAgICAgIHNjYWxlLFxuICAgICAgICBjYW52YXNXaWR0aCA9IERFRkFVTFRfQ0FOVkFTX1dJRFRILFxuICAgICAgICBjYW52YXNIZWlnaHQgPSBERUZBVUxUX0NBTlZBU19IRUlHSFQsXG4gICAgICAgIG9uU2F2ZVBsYW4sXG4gICAgICAgIG9uTG9hZFBsYW5cbiAgICB9ID0gdmlld01vZGVsO1xuXG4gICAgY29uc3QgY2FudmFzUmVmID0gdXNlUmVmPEhUTUxEaXZFbGVtZW50IHwgbnVsbD4obnVsbCk7XG5cbiAgICAvLyAtLS0gQ2FudmFzIHN0YXRlIGZyb20gdGhlIGhvb2sgLS0tXG4gICAgY29uc3Qge1xuICAgICAgICBpdGVtcyxcbiAgICAgICAgYWN0aXZlSXRlbUlkLFxuICAgICAgICBzZWxlY3RlZElkcyxcbiAgICAgICAgdmFsaWRhdGlvbixcbiAgICAgICAgaGFuZGxlTW91c2VEb3duLFxuICAgICAgICBoYW5kbGVDYW52YXNNb3VzZURvd24sXG4gICAgICAgIGhhbmRsZVJvdGF0ZSxcbiAgICAgICAgYWRkSXRlbSxcbiAgICAgICAgc2V0SXRlbXNcbiAgICB9ID0gdXNlVHJhaWxlckNhbnZhcyh7XG4gICAgICAgIGluaXRpYWxJdGVtczogaW5pdGlhbENhbnZhc0l0ZW1zLFxuICAgICAgICBjYW52YXNXaWR0aCxcbiAgICAgICAgY2FudmFzSGVpZ2h0LFxuICAgICAgICBjYW52YXNSZWY6IGNhbnZhc1JlZiBhcyBSZWZPYmplY3Q8SFRNTERpdkVsZW1lbnQgfCBudWxsPixcbiAgICAgICAgc2NhbGUsXG4gICAgICAgIHRyYWlsZXJcbiAgICB9KTtcblxuICAgIC8vIC0tLSBUcmFjayB3aGljaCBwYWxsZXRzIGhhdmUgYmVlbiBhZGRlZCB0byB0aGUgY2FudmFzIC0tLVxuICAgIC8vIFdlIHRyYWNrIGFkZGVkIHBhbGxldCBJRHMgaW4gYSBTZXQuIFdoZW4gYSBwYWxsZXQgaXMgZHJhZ2dlZCBvbnRvIHRoZVxuICAgIC8vIGNhbnZhcywgaXRzIElEIGlzIGFkZGVkIHRvIHRoZSBzZXQgc28gaXQgZGlzYXBwZWFycyBmcm9tIHRoZSBwYWxldHRlLlxuICAgIGNvbnN0IFthZGRlZFBhbGxldElkcywgc2V0QWRkZWRQYWxsZXRJZHNdID0gdXNlU3RhdGU8U2V0PHN0cmluZz4+KG5ldyBTZXQoKSk7XG5cbiAgICAvLyBBdmFpbGFibGUgcGFsbGV0cyA9IHBhbGxldExpc3QgbWludXMgdGhvc2UgYWxyZWFkeSBhZGRlZCB0byBjYW52YXNcbiAgICBjb25zdCBhdmFpbGFibGVQYWxsZXRzID0gcGFsbGV0TGlzdC5maWx0ZXIocCA9PiAhYWRkZWRQYWxsZXRJZHMuaGFzKHAuaWQpKTtcblxuICAgIC8vIC0tLSBSZXN0b3JlIGl0ZW1zIHdoZW4gbG9hZGVkIGZyb20gcGxhbiAtLS1cbiAgICAvLyBUaGUgdXNlVHJhaWxlckNhbnZhcyBob29rIGFscmVhZHkgaGFuZGxlcyBpbml0aWFsSXRlbXMgY2hhbmdlcyB2aWEgaXRzXG4gICAgLy8gb3duIHVzZUVmZmVjdCwgYnV0IHdlIGFsc28gc2V0IGl0ZW1zIGRpcmVjdGx5IHdoZW4gYSBwbGFuIGlzIGxvYWRlZFxuICAgIC8vIGFmdGVyIHRoZSBpbml0aWFsIHJlbmRlciB0byBlbnN1cmUgdGhlIGNhbnZhcyByZWZsZWN0cyB0aGUgc2F2ZWQgc3RhdGUuXG4gICAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICAgICAgaWYgKGluaXRpYWxDYW52YXNJdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBzZXRJdGVtcyhpbml0aWFsQ2FudmFzSXRlbXMpO1xuICAgICAgICB9XG4gICAgfSwgW2luaXRpYWxDYW52YXNJdGVtcywgc2V0SXRlbXNdKTtcblxuICAgIC8vIC0tLSBTYXZlIHBsYW4gaGFuZGxlciAtLS1cbiAgICBjb25zdCBoYW5kbGVTYXZlUGxhbiA9ICgpOiB2b2lkID0+IHtcbiAgICAgICAgb25TYXZlUGxhbihpdGVtcywgc2NhbGUpO1xuICAgIH07XG5cbiAgICAvLyAtLS0gTG9hZCBwbGFuIGhhbmRsZXIgLS0tXG4gICAgY29uc3QgaGFuZGxlTG9hZFBsYW4gPSAoKTogdm9pZCA9PiB7XG4gICAgICAgIG9uTG9hZFBsYW4oKTtcbiAgICB9O1xuXG4gICAgLy8gLS0tIERyYWctYW5kLWRyb3AgZnJvbSBwYWxsZXQgbGlzdCB0byBjYW52YXMgLS0tXG4gICAgY29uc3QgaGFuZGxlUGFsbGV0RHJvcCA9IChlOiBEcmFnRXZlbnQ8SFRNTERpdkVsZW1lbnQ+KTogdm9pZCA9PiB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY29uc3QgcGFsbGV0SWQgPSBlLmRhdGFUcmFuc2Zlci5nZXREYXRhKFwidGV4dC9wbGFpblwiKTtcbiAgICAgICAgY29uc3QgcGFsbGV0ID0gYXZhaWxhYmxlUGFsbGV0cy5maW5kKHAgPT4gcC5pZCA9PT0gcGFsbGV0SWQpO1xuICAgICAgICBpZiAoIXBhbGxldCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIGRyb3AgcG9zaXRpb24gcmVsYXRpdmUgdG8gY2FudmFzXG4gICAgICAgIGNvbnN0IGNhbnZhcyA9IGNhbnZhc1JlZi5jdXJyZW50O1xuICAgICAgICBpZiAoIWNhbnZhcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgY29uc3QgeCA9IGUuY2xpZW50WCAtIHJlY3QubGVmdDtcbiAgICAgICAgY29uc3QgeSA9IGUuY2xpZW50WSAtIHJlY3QudG9wO1xuXG4gICAgICAgIC8vIEFkZCB0aGUgcGFsbGV0IHRvIHRoZSBjYW52YXMgYXQgdGhlIGRyb3AgcG9zaXRpb25cbiAgICAgICAgY29uc3QgbmV3SXRlbSA9IHsgLi4ucGFsbGV0LCB4LCB5IH07XG4gICAgICAgIGFkZEl0ZW0obmV3SXRlbSk7XG5cbiAgICAgICAgLy8gTWFyayBhcyBhZGRlZCBzbyBpdCBkaXNhcHBlYXJzIGZyb20gdGhlIHBhbGxldCBsaXN0XG4gICAgICAgIHNldEFkZGVkUGFsbGV0SWRzKHByZXYgPT4gbmV3IFNldChbLi4ucHJldiwgcGFsbGV0SWRdKSk7XG4gICAgfTtcblxuICAgIGNvbnN0IGhhbmRsZVBhbGxldERyYWdPdmVyID0gKGU6IERyYWdFdmVudDxIVE1MRGl2RWxlbWVudD4pOiB2b2lkID0+IHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH07XG5cbiAgICAvLyAtLS0gR2V0IGl0ZW0tc3BlY2lmaWMgZXJyb3JzIGZvciBzdGF0dXMgZGlzcGxheSAtLS1cbiAgICBjb25zdCBnZXRJdGVtRXJyb3JzID0gKGl0ZW1JZDogc3RyaW5nKTogc3RyaW5nW10gPT4ge1xuICAgICAgICByZXR1cm4gdmFsaWRhdGlvbj8uaXRlbUVycm9ycz8uW2l0ZW1JZF0gPz8gW107XG4gICAgfTtcblxuICAgIC8vIC0tLSBMb2FkaW5nIHN0YXRlIC0tLVxuICAgIGlmIChpc0xvYWRpbmcpIHtcbiAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICBzdHlsZT17e1xuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogXCJyZWxhdGl2ZVwiLFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogY2FudmFzV2lkdGgsXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogY2FudmFzSGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICBtYXJnaW46IERFRkFVTFRfTUFSR0lOLFxuICAgICAgICAgICAgICAgICAgICBvdmVyZmxvdzogXCJoaWRkZW5cIixcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyOiBDQU5WQVNfQk9SREVSLFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IENBTlZBU19CQUNLR1JPVU5EX0NPTE9SLFxuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5OiBcImZsZXhcIixcbiAgICAgICAgICAgICAgICAgICAgYWxpZ25JdGVtczogXCJjZW50ZXJcIixcbiAgICAgICAgICAgICAgICAgICAganVzdGlmeUNvbnRlbnQ6IFwiY2VudGVyXCIsXG4gICAgICAgICAgICAgICAgICAgIGZvbnRTaXplOiAxNixcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IFwiIzY2NlwiXG4gICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICBMb2FkaW5nIHBhY2tpbmcgcGxhbi4uLlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gLS0tIFJlbmRlciAtLS1cbiAgICByZXR1cm4gKFxuICAgICAgICA8ZGl2XG4gICAgICAgICAgICByZWY9e2NhbnZhc1JlZn1cbiAgICAgICAgICAgIG9uTW91c2VEb3duPXtoYW5kbGVDYW52YXNNb3VzZURvd259XG4gICAgICAgICAgICBvbkRyb3A9e2hhbmRsZVBhbGxldERyb3B9XG4gICAgICAgICAgICBvbkRyYWdPdmVyPXtoYW5kbGVQYWxsZXREcmFnT3Zlcn1cbiAgICAgICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgICAgICAgcG9zaXRpb246IFwicmVsYXRpdmVcIixcbiAgICAgICAgICAgICAgICB3aWR0aDogY2FudmFzV2lkdGgsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBjYW52YXNIZWlnaHQsXG4gICAgICAgICAgICAgICAgbWFyZ2luOiBERUZBVUxUX01BUkdJTixcbiAgICAgICAgICAgICAgICBvdmVyZmxvdzogXCJoaWRkZW5cIixcbiAgICAgICAgICAgICAgICBib3JkZXI6IENBTlZBU19CT1JERVIsXG4gICAgICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBDQU5WQVNfQkFDS0dST1VORF9DT0xPUlxuICAgICAgICAgICAgfX1cbiAgICAgICAgPlxuICAgICAgICAgICAgey8qIEdyaWQgb3ZlcmxheSAqL31cbiAgICAgICAgICAgIDxHcmlkT3ZlcmxheSB3aWR0aD17Y2FudmFzV2lkdGh9IGhlaWdodD17Y2FudmFzSGVpZ2h0fSBncmlkU2l6ZT17R1JJRF9TSVpFfSAvPlxuXG4gICAgICAgICAgICB7LyogVHJhaWxlciBib3VuZGFyeSAqL31cbiAgICAgICAgICAgIHt0cmFpbGVyICYmIChcbiAgICAgICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDogdHJhaWxlci54LFxuICAgICAgICAgICAgICAgICAgICAgICAgdG9wOiB0cmFpbGVyLnksXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogdHJhaWxlci53aWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogdHJhaWxlci5oZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICBib3JkZXI6IFwiMnB4IGRhc2hlZCAjODg4XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBib3hTaXppbmc6IFwiYm9yZGVyLWJveFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnRlckV2ZW50czogXCJub25lXCJcbiAgICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgKX1cblxuICAgICAgICAgICAgey8qIEluZm8gcGFuZWwgb3ZlcmxheSAqL31cbiAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICBzdHlsZT17e1xuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogXCJhYnNvbHV0ZVwiLFxuICAgICAgICAgICAgICAgICAgICB0b3A6IElORk9fUEFORUxfVE9QLFxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiBJTkZPX1BBTkVMX0xFRlQsXG4gICAgICAgICAgICAgICAgICAgIHpJbmRleDogSU5GT19QQU5FTF9aX0lOREVYLFxuICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiBJTkZPX1BBTkVMX0JBQ0tHUk9VTkQsXG4gICAgICAgICAgICAgICAgICAgIHBhZGRpbmc6IElORk9fUEFORUxfUEFERElORyxcbiAgICAgICAgICAgICAgICAgICAgYm9yZGVyOiBJTkZPX1BBTkVMX0JPUkRFUlxuICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgPGRpdj5BY3RpdmU6IHthY3RpdmVJdGVtSWQgPz8gXCJOb25lXCJ9PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgVmFsaWRhdGlvbjp7XCIgXCJ9XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIHN0eWxlPXt7IGNvbG9yOiB2YWxpZGF0aW9uPy52YWxpZCA/IFwiZ3JlZW5cIiA6IFwicmVkXCIsIGZvbnRXZWlnaHQ6IFwiYm9sZFwiIH19PlxuICAgICAgICAgICAgICAgICAgICAgICAge3ZhbGlkYXRpb24/LnZhbGlkID8gXCJPS1wiIDogXCJJc3N1ZVwifVxuICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAge3ZhbGlkYXRpb24/LmVycm9ycy5sZW5ndGggPiAwICYmIChcbiAgICAgICAgICAgICAgICAgICAgPHVsIHN0eWxlPXt7IG1hcmdpbjogMCwgcGFkZGluZ0xlZnQ6IDE2IH19PlxuICAgICAgICAgICAgICAgICAgICAgICAge3ZhbGlkYXRpb24uZXJyb3JzLm1hcChlcnJvciA9PiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxpIGtleT17ZXJyb3J9IHN0eWxlPXt7IGNvbG9yOiBcInJlZFwiLCBmb250U2l6ZTogMTIgfX0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtlcnJvcn1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2xpPlxuICAgICAgICAgICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgICAgICAgIDwvdWw+XG4gICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPXt7IG1hcmdpblRvcDogOCB9fT5cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBvbkNsaWNrPXtoYW5kbGVTYXZlUGxhbn0gc3R5bGU9e3sgbWFyZ2luUmlnaHQ6IDggfX0+XG4gICAgICAgICAgICAgICAgICAgICAgICBTYXZlIFBsYW5cbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gb25DbGljaz17aGFuZGxlTG9hZFBsYW59PkxvYWQgUGxhbjwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIHsvKiBQYWxsZXQgbGlzdCAoZGVidWcgdmlldykgKi99XG4gICAgICAgICAgICA8UGFsbGV0TGlzdFxuICAgICAgICAgICAgICAgIHBhbGxldHM9e2F2YWlsYWJsZVBhbGxldHN9XG4gICAgICAgICAgICAgICAgb25BZGRQYWxsZXQ9eyhwYWxsZXQ6IENhcmdvSXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgcGFsbGV0IHRvIGNhbnZhcyBhdCBhIGRlZmF1bHQgcG9zaXRpb25cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3SXRlbSA9IHsgLi4ucGFsbGV0LCB4OiA1MCwgeTogNTAgfTtcbiAgICAgICAgICAgICAgICAgICAgc2V0QWRkZWRQYWxsZXRJZHMocHJldiA9PiBuZXcgU2V0KFsuLi5wcmV2LCBwYWxsZXQuaWRdKSk7XG4gICAgICAgICAgICAgICAgICAgIGFkZEl0ZW0obmV3SXRlbSk7XG4gICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgIC8+XG5cbiAgICAgICAgICAgIHsvKiBDYXJnbyBjYXJkcyBvbiBjYW52YXMgKi99XG4gICAgICAgICAgICB7aXRlbXMubWFwKGl0ZW0gPT4gKFxuICAgICAgICAgICAgICAgIDxDYXJnb0NhcmRcbiAgICAgICAgICAgICAgICAgICAga2V5PXtpdGVtLmlkfVxuICAgICAgICAgICAgICAgICAgICBpdGVtPXtpdGVtfVxuICAgICAgICAgICAgICAgICAgICBpc0FjdGl2ZT17YWN0aXZlSXRlbUlkID09PSBpdGVtLmlkfVxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZElkcz17c2VsZWN0ZWRJZHN9XG4gICAgICAgICAgICAgICAgICAgIGhhc0Vycm9yPXtnZXRJdGVtRXJyb3JzKGl0ZW0uaWQpLmxlbmd0aCA+IDB9XG4gICAgICAgICAgICAgICAgICAgIG9uTW91c2VEb3duPXtlID0+IGhhbmRsZU1vdXNlRG93bihlLCBpdGVtLmlkKX1cbiAgICAgICAgICAgICAgICAgICAgb25Sb3RhdGU9e2hhbmRsZVJvdGF0ZX1cbiAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgKSl9XG4gICAgICAgIDwvZGl2PlxuICAgICk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBMb2FkaW5nQ2FudmFzO1xuIiwiaW1wb3J0IHR5cGUgeyBUcmFpbGVySXRlbSB9IGZyb20gXCIuLi92aWV3TW9kZWxzL1RyYWlsZXJJdGVtXCI7XG5pbXBvcnQgdHlwZSB7IFRyYWlsZXIgfSBmcm9tIFwiLi4vbW9kZWxzL1RyYWlsZXJcIjtcbmltcG9ydCB7IG1ldGVyVG9QaXhlbCB9IGZyb20gXCIuLi9kb21haW4vY29vcmRpbmF0ZVJ1bGVzXCI7XG5cbi8qKlxuICogU2hhcGUgb2YgVHJ1Y2tTZWxlY3Rpb24gZGF0YSBhcyBpdCBhcnJpdmVzIGZyb20gTWVuZGl4LlxuICogVHJ1Y2tTZWxlY3Rpb24g4oaSIFJlc291cmNlSW5zdGFuY2Ug4oaSIFJlc291cmNlIOKGkiBUZWNobmljYWxEZXRhaWxzXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHJ1Y2tTZWxlY3Rpb25EYXRhIHtcbiAgaWQ6IHN0cmluZztcbiAgY29kZT86IHN0cmluZztcbiAgdHJhaWxlclR5cGU/OiBcIkRyeVZhblwiIHwgXCJSZWVmZXJcIiB8IFwiRmxhdGJlZFwiIHwgXCJDb250YWluZXJcIiB8IFwiQ3VydGFpbnNpZGVyXCI7XG4gIG1heFBheWxvYWRLZz86IG51bWJlcjtcbiAgYXhsZUNvdW50PzogbnVtYmVyO1xuICBpbnRlcm5hbExlbmd0aE1ldGVyOiBudW1iZXI7XG4gIGludGVybmFsV2lkdGhNZXRlcjogbnVtYmVyO1xuICBpbnRlcm5hbEhlaWdodE1ldGVyOiBudW1iZXI7XG4gIG1heExvYWRNZXRlcnM/OiBudW1iZXI7XG59XG5cbi8qKlxuICogQ29udmVydCBhIFRydWNrU2VsZWN0aW9uIChtZXRlcnMpIHRvIGEgVHJhaWxlckl0ZW0gKHBpeGVscykgdXNpbmcgdGhlIGdpdmVuIHNjYWxlLlxuICpcbiAqIEBwYXJhbSB0cnVjayAtIFRoZSBUcnVja1NlbGVjdGlvbiBkYXRhIGZyb20gTWVuZGl4XG4gKiBAcGFyYW0gc2NhbGUgLSBQaXhlbC10by1tZXRlciBzY2FsZSBmYWN0b3JcbiAqIEBwYXJhbSBwb3NpdGlvbiAtIEluaXRpYWwgY2FudmFzIHBvc2l0aW9uIChwaXhlbHMpXG4gKiBAcmV0dXJucyBBIFRyYWlsZXJJdGVtIHZpZXcgbW9kZWwgcmVhZHkgZm9yIHRoZSBjYW52YXNcbiAqL1xuZXhwb3J0IGNvbnN0IHRydWNrU2VsZWN0aW9uVG9UcmFpbGVySXRlbSA9IChcbiAgdHJ1Y2s6IFRydWNrU2VsZWN0aW9uRGF0YSxcbiAgc2NhbGU6IG51bWJlcixcbiAgcG9zaXRpb246IHsgeDogbnVtYmVyOyB5OiBudW1iZXIgfSA9IHsgeDogMjAsIHk6IDIwIH1cbik6IFRyYWlsZXJJdGVtID0+IHtcbiAgcmV0dXJuIHtcbiAgICBpZDogdHJ1Y2suaWQsXG4gICAgY29kZTogdHJ1Y2suY29kZSA/PyBcIlRSQUlMRVJcIixcbiAgICB0cmFpbGVyVHlwZTogdHJ1Y2sudHJhaWxlclR5cGUgPz8gXCJEcnlWYW5cIixcbiAgICBtYXhQYXlsb2FkS2c6IHRydWNrLm1heFBheWxvYWRLZyA/PyAwLFxuICAgIGF4bGVDb3VudDogdHJ1Y2suYXhsZUNvdW50ID8/IDIsXG4gICAgbWF4TG9hZE1ldGVyczogdHJ1Y2subWF4TG9hZE1ldGVycyA/PyB0cnVjay5pbnRlcm5hbExlbmd0aE1ldGVyLFxuICAgIGludGVybmFsSGVpZ2h0TWV0ZXI6IHRydWNrLmludGVybmFsSGVpZ2h0TWV0ZXIsXG4gICAgeDogcG9zaXRpb24ueCxcbiAgICB5OiBwb3NpdGlvbi55LFxuICAgIHdpZHRoOiBtZXRlclRvUGl4ZWwodHJ1Y2suaW50ZXJuYWxMZW5ndGhNZXRlciwgc2NhbGUpLFxuICAgIGhlaWdodDogbWV0ZXJUb1BpeGVsKHRydWNrLmludGVybmFsV2lkdGhNZXRlciwgc2NhbGUpLFxuICAgIHJvdGF0aW9uOiAwLFxuICB9O1xufTtcblxuLyoqXG4gKiBDb252ZXJ0IGEgVHJhaWxlciBidXNpbmVzcyBtb2RlbCAobWV0ZXJzKSB0byBhIFRyYWlsZXJJdGVtIChwaXhlbHMpIHVzaW5nIHRoZSBnaXZlbiBzY2FsZS5cbiAqXG4gKiBAcGFyYW0gdHJhaWxlciAtIFRoZSBUcmFpbGVyIGJ1c2luZXNzIG1vZGVsXG4gKiBAcGFyYW0gc2NhbGUgLSBQaXhlbC10by1tZXRlciBzY2FsZSBmYWN0b3JcbiAqIEBwYXJhbSBwb3NpdGlvbiAtIEluaXRpYWwgY2FudmFzIHBvc2l0aW9uIChwaXhlbHMpXG4gKiBAcmV0dXJucyBBIFRyYWlsZXJJdGVtIHZpZXcgbW9kZWwgcmVhZHkgZm9yIHRoZSBjYW52YXNcbiAqL1xuZXhwb3J0IGNvbnN0IHRyYWlsZXJUb1RyYWlsZXJJdGVtID0gKFxuICB0cmFpbGVyOiBUcmFpbGVyLFxuICBzY2FsZTogbnVtYmVyLFxuICBwb3NpdGlvbjogeyB4OiBudW1iZXI7IHk6IG51bWJlciB9ID0geyB4OiAyMCwgeTogMjAgfVxuKTogVHJhaWxlckl0ZW0gPT4ge1xuICByZXR1cm4ge1xuICAgIGlkOiB0cmFpbGVyLmlkLFxuICAgIGNvZGU6IHRyYWlsZXIuY29kZSxcbiAgICB0cmFpbGVyVHlwZTogdHJhaWxlci50cmFpbGVyVHlwZSxcbiAgICBtYXhQYXlsb2FkS2c6IHRyYWlsZXIubWF4UGF5bG9hZEtnLFxuICAgIGF4bGVDb3VudDogdHJhaWxlci5heGxlQ291bnQsXG4gICAgbWF4TG9hZE1ldGVyczogdHJhaWxlci5tYXhMb2FkTWV0ZXJzID8/IHRyYWlsZXIuaW50ZXJuYWxMZW5ndGhNZXRlcixcbiAgICBpbnRlcm5hbEhlaWdodE1ldGVyOiB0cmFpbGVyLmludGVybmFsSGVpZ2h0TWV0ZXIsXG4gICAgeDogcG9zaXRpb24ueCxcbiAgICB5OiBwb3NpdGlvbi55LFxuICAgIHdpZHRoOiBtZXRlclRvUGl4ZWwodHJhaWxlci5pbnRlcm5hbExlbmd0aE1ldGVyLCBzY2FsZSksXG4gICAgaGVpZ2h0OiBtZXRlclRvUGl4ZWwodHJhaWxlci5pbnRlcm5hbFdpZHRoTWV0ZXIsIHNjYWxlKSxcbiAgICByb3RhdGlvbjogMCxcbiAgfTtcbn07XG5cbi8qKlxuICogQ29tcHV0ZSB0aGUgb3B0aW1hbCBzY2FsZSBmYWN0b3Igc28gdGhhdCB0aGUgdHJhaWxlciBmaXRzIHdpdGhpbiB0aGUgY2FudmFzLlxuICpcbiAqIEBwYXJhbSB0cnVjayAtIFRoZSBUcnVja1NlbGVjdGlvbiBkYXRhXG4gKiBAcGFyYW0gY2FudmFzV2lkdGggLSBDYW52YXMgd2lkdGggaW4gcGl4ZWxzXG4gKiBAcGFyYW0gY2FudmFzSGVpZ2h0IC0gQ2FudmFzIGhlaWdodCBpbiBwaXhlbHNcbiAqIEBwYXJhbSBwYWRkaW5nIC0gUGFkZGluZyBhcm91bmQgdGhlIHRyYWlsZXIgKHBpeGVscylcbiAqIEByZXR1cm5zIFNjYWxlIGZhY3RvciAocGl4ZWxzIHBlciBtZXRlcilcbiAqL1xuZXhwb3J0IGNvbnN0IGNvbXB1dGVTY2FsZSA9IChcbiAgdHJ1Y2s6IFRydWNrU2VsZWN0aW9uRGF0YSxcbiAgY2FudmFzV2lkdGg6IG51bWJlcixcbiAgY2FudmFzSGVpZ2h0OiBudW1iZXIsXG4gIHBhZGRpbmc6IG51bWJlciA9IDQwXG4pOiBudW1iZXIgPT4ge1xuICBjb25zdCBsZW5ndGhNID0gdHJ1Y2suaW50ZXJuYWxMZW5ndGhNZXRlcjtcbiAgY29uc3Qgd2lkdGhNID0gdHJ1Y2suaW50ZXJuYWxXaWR0aE1ldGVyO1xuICBjb25zdCBhdmFpbGFibGVXaWR0aCA9IGNhbnZhc1dpZHRoIC0gcGFkZGluZztcbiAgY29uc3QgYXZhaWxhYmxlSGVpZ2h0ID0gY2FudmFzSGVpZ2h0IC0gcGFkZGluZztcbiAgcmV0dXJuIE1hdGgubWluKGF2YWlsYWJsZVdpZHRoIC8gbGVuZ3RoTSwgYXZhaWxhYmxlSGVpZ2h0IC8gd2lkdGhNKTtcbn07XG4iLCJpbXBvcnQgdHlwZSB7IENhcmdvSXRlbSB9IGZyb20gXCIuLi92aWV3TW9kZWxzL0NhcmdvSXRlbVwiO1xuaW1wb3J0IHR5cGUgeyBDYW52YXNTdGF0ZSB9IGZyb20gXCIuLi9zdGF0ZS9DYW52YXNTdGF0ZVwiO1xuaW1wb3J0IHsgcGl4ZWxUb01ldGVyIH0gZnJvbSBcIi4uL2RvbWFpbi9jb29yZGluYXRlUnVsZXNcIjtcblxuLyoqXG4gKiBTaGFwZSBvZiBhIHNhdmVkIHBhY2tpbmcgcGxhbiBpdGVtIChwZXJzaXN0ZWQgdG8gTWVuZGl4KS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYWNraW5nUGxhbkl0ZW1EYXRhIHtcbiAgICBpZDogc3RyaW5nO1xuICAgIG5hbWU6IHN0cmluZztcbiAgICB0eXBlOiBcInBhbGxldFwiIHwgXCJib3hcIjtcbiAgICB4OiBudW1iZXI7IC8vIG1ldGVyc1xuICAgIHk6IG51bWJlcjsgLy8gbWV0ZXJzXG4gICAgd2lkdGg6IG51bWJlcjsgLy8gbWV0ZXJzXG4gICAgaGVpZ2h0OiBudW1iZXI7IC8vIG1ldGVyc1xuICAgIHJvdGF0aW9uOiBudW1iZXI7XG4gICAgY29sb3I6IHN0cmluZztcbiAgICBoZWlnaHRNPzogbnVtYmVyO1xuICAgIHdlaWdodEtnPzogbnVtYmVyO1xufVxuXG4vKipcbiAqIFNoYXBlIG9mIGEgc2F2ZWQgcGFja2luZyBwbGFuIChwZXJzaXN0ZWQgdG8gTWVuZGl4KS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQYWNraW5nUGxhbkRhdGEge1xuICAgIHRydWNrSWQ6IHN0cmluZyB8IG51bGw7XG4gICAgaXRlbXM6IFBhY2tpbmdQbGFuSXRlbURhdGFbXTtcbn1cblxuLyoqXG4gKiBTZXJpYWxpemUgdGhlIGN1cnJlbnQgY2FudmFzIHN0YXRlIGludG8gYSBwYWNraW5nIHBsYW4gZm9yIHBlcnNpc3RlbmNlLlxuICogQ29udmVydHMgYWxsIHBpeGVsIGNvb3JkaW5hdGVzIGJhY2sgdG8gbWV0ZXJzLlxuICovXG5leHBvcnQgY29uc3Qgc2VyaWFsaXplUGxhbiA9IChzdGF0ZTogQ2FudmFzU3RhdGUsIHNjYWxlOiBudW1iZXIpOiBQYWNraW5nUGxhbkRhdGEgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICAgIHRydWNrSWQ6IHN0YXRlLnRyYWlsZXI/LmlkID8/IG51bGwsXG4gICAgICAgIGl0ZW1zOiBzdGF0ZS5jYXJnb3MubWFwKGl0ZW0gPT4gKHtcbiAgICAgICAgICAgIGlkOiBpdGVtLmlkLFxuICAgICAgICAgICAgbmFtZTogaXRlbS5uYW1lLFxuICAgICAgICAgICAgdHlwZTogaXRlbS50eXBlLFxuICAgICAgICAgICAgeDogcGl4ZWxUb01ldGVyKGl0ZW0ueCwgc2NhbGUpLFxuICAgICAgICAgICAgeTogcGl4ZWxUb01ldGVyKGl0ZW0ueSwgc2NhbGUpLFxuICAgICAgICAgICAgd2lkdGg6IHBpeGVsVG9NZXRlcihpdGVtLndpZHRoLCBzY2FsZSksXG4gICAgICAgICAgICBoZWlnaHQ6IHBpeGVsVG9NZXRlcihpdGVtLmhlaWdodCwgc2NhbGUpLFxuICAgICAgICAgICAgcm90YXRpb246IGl0ZW0ucm90YXRpb24sXG4gICAgICAgICAgICBjb2xvcjogaXRlbS5jb2xvcixcbiAgICAgICAgICAgIGhlaWdodE06IGl0ZW0uaGVpZ2h0TSxcbiAgICAgICAgICAgIHdlaWdodEtnOiBpdGVtLndlaWdodEtnXG4gICAgICAgIH0pKVxuICAgIH07XG59O1xuXG4vKipcbiAqIERlc2VyaWFsaXplIGEgcGFja2luZyBwbGFuIGJhY2sgaW50byBDYXJnb0l0ZW1zIGZvciB0aGUgY2FudmFzLlxuICogQ29udmVydHMgYWxsIG1ldGVyIGNvb3JkaW5hdGVzIHRvIHBpeGVscy5cbiAqL1xuZXhwb3J0IGNvbnN0IGRlc2VyaWFsaXplUGxhbiA9IChwbGFuOiBQYWNraW5nUGxhbkRhdGEsIHNjYWxlOiBudW1iZXIpOiBDYXJnb0l0ZW1bXSA9PiB7XG4gICAgcmV0dXJuIHBsYW4uaXRlbXMubWFwKGl0ZW0gPT4gKHtcbiAgICAgICAgaWQ6IGl0ZW0uaWQsXG4gICAgICAgIG5hbWU6IGl0ZW0ubmFtZSxcbiAgICAgICAgdHlwZTogaXRlbS50eXBlLFxuICAgICAgICB4OiBpdGVtLnggKiBzY2FsZSxcbiAgICAgICAgeTogaXRlbS55ICogc2NhbGUsXG4gICAgICAgIHdpZHRoOiBpdGVtLndpZHRoICogc2NhbGUsXG4gICAgICAgIGhlaWdodDogaXRlbS5oZWlnaHQgKiBzY2FsZSxcbiAgICAgICAgcm90YXRpb246IGl0ZW0ucm90YXRpb24gYXMgMCB8IDkwIHwgMTgwIHwgMjcwLFxuICAgICAgICBjb2xvcjogaXRlbS5jb2xvcixcbiAgICAgICAgaXNMb2NrZWQ6IGZhbHNlLFxuICAgICAgICBoZWlnaHRNOiBpdGVtLmhlaWdodE0sXG4gICAgICAgIHdlaWdodEtnOiBpdGVtLndlaWdodEtnXG4gICAgfSkpO1xufTtcbiIsImltcG9ydCB0eXBlIHsgQ2FyZ29JdGVtIH0gZnJvbSBcIi4uL3ZpZXdNb2RlbHMvQ2FyZ29JdGVtXCI7XG5pbXBvcnQgeyBtZXRlclRvUGl4ZWwgfSBmcm9tIFwiLi4vZG9tYWluL2Nvb3JkaW5hdGVSdWxlc1wiO1xuXG4vKipcbiAqIFNoYXBlIG9mIGEgUGFja2luZ1VuaXQgYXMgaXQgYXJyaXZlcyBmcm9tIE1lbmRpeC5cbiAqIFBhY2tpbmdVbml0IGhhczogTGVuZ3RoLCBXaWR0aCwgSGVpZ2h0IChpbiBtZXRlcnMpLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBhY2tpbmdVbml0RGF0YSB7XG4gIGlkOiBzdHJpbmc7XG4gIG5hbWU/OiBzdHJpbmc7XG4gIGxlbmd0aE1ldGVyOiBudW1iZXI7XG4gIHdpZHRoTWV0ZXI6IG51bWJlcjtcbiAgaGVpZ2h0TWV0ZXI6IG51bWJlcjtcbiAgcGFja2luZ1R5cGU6IFwicGFsbGV0XCIgfCBcImJveFwiO1xuICB3ZWlnaHRLZz86IG51bWJlcjtcbn1cblxuLyoqXG4gKiBTaGFwZSBvZiBhIFRyYW5zcG9ydE9yZGVyIGFzIGl0IGFycml2ZXMgZnJvbSBNZW5kaXguXG4gKiBUcmFuc3BvcnRPcmRlciAoMS0qKSDihpIgUGFja2luZ1VuaXRcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUcmFuc3BvcnRPcmRlckRhdGEge1xuICBpZDogc3RyaW5nO1xuICBuYW1lPzogc3RyaW5nO1xuICBwYWNraW5nVW5pdD86IFBhY2tpbmdVbml0RGF0YTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgUGFja2luZ1VuaXQgKG1ldGVycykgdG8gYSBDYXJnb0l0ZW0gKHBpeGVscykgdXNpbmcgdGhlIGdpdmVuIHNjYWxlLlxuICpcbiAqIEBwYXJhbSBwYWNraW5nVW5pdCAtIFRoZSBQYWNraW5nVW5pdCBkYXRhIGZyb20gTWVuZGl4XG4gKiBAcGFyYW0gc2NhbGUgLSBQaXhlbC10by1tZXRlciBzY2FsZSBmYWN0b3JcbiAqIEBwYXJhbSBwb3NpdGlvbiAtIEluaXRpYWwgY2FudmFzIHBvc2l0aW9uIChwaXhlbHMpXG4gKiBAcmV0dXJucyBBIENhcmdvSXRlbSB2aWV3IG1vZGVsIHJlYWR5IGZvciB0aGUgY2FudmFzXG4gKi9cbmV4cG9ydCBjb25zdCBwYWNraW5nVW5pdFRvQ2FyZ29JdGVtID0gKFxuICBwYWNraW5nVW5pdDogUGFja2luZ1VuaXREYXRhLFxuICBzY2FsZTogbnVtYmVyLFxuICBwb3NpdGlvbjogeyB4OiBudW1iZXI7IHk6IG51bWJlciB9ID0geyB4OiAwLCB5OiAwIH1cbik6IENhcmdvSXRlbSA9PiB7XG4gIGNvbnN0IGNvbG9yID0gcGFja2luZ1VuaXQucGFja2luZ1R5cGUgPT09IFwicGFsbGV0XCIgPyBcIm9yYW5nZVwiIDogXCJibHVlXCI7XG4gIGNvbnN0IG5hbWUgPSBwYWNraW5nVW5pdC5uYW1lID8/IGBDYXJnbyAke3BhY2tpbmdVbml0LmlkfWA7XG5cbiAgcmV0dXJuIHtcbiAgICBpZDogYGNhcmdvLSR7cGFja2luZ1VuaXQuaWR9YCxcbiAgICBuYW1lLFxuICAgIHg6IHBvc2l0aW9uLngsXG4gICAgeTogcG9zaXRpb24ueSxcbiAgICB3aWR0aDogbWV0ZXJUb1BpeGVsKHBhY2tpbmdVbml0Lmxlbmd0aE1ldGVyLCBzY2FsZSksXG4gICAgaGVpZ2h0OiBtZXRlclRvUGl4ZWwocGFja2luZ1VuaXQud2lkdGhNZXRlciwgc2NhbGUpLFxuICAgIHJvdGF0aW9uOiAwLFxuICAgIGNvbG9yLFxuICAgIHR5cGU6IHBhY2tpbmdVbml0LnBhY2tpbmdUeXBlLFxuICAgIGlzTG9ja2VkOiBmYWxzZSxcbiAgICBoZWlnaHRNOiBwYWNraW5nVW5pdC5oZWlnaHRNZXRlcixcbiAgICB3ZWlnaHRLZzogcGFja2luZ1VuaXQud2VpZ2h0S2csXG4gIH07XG59O1xuXG4vKipcbiAqIENvbnZlcnQgYSBsaXN0IG9mIFRyYW5zcG9ydE9yZGVycyB0byBDYXJnb0l0ZW1zLlxuICogRWFjaCBUcmFuc3BvcnRPcmRlciBoYXMgb25lIFBhY2tpbmdVbml0LlxuICovXG5leHBvcnQgY29uc3QgdHJhbnNwb3J0T3JkZXJzVG9DYXJnb0l0ZW1zID0gKG9yZGVyczogVHJhbnNwb3J0T3JkZXJEYXRhW10sIHNjYWxlOiBudW1iZXIpOiBDYXJnb0l0ZW1bXSA9PiB7XG4gIHJldHVybiBvcmRlcnMuZmlsdGVyKChvcmRlcikgPT4gb3JkZXIucGFja2luZ1VuaXQpLm1hcCgob3JkZXIpID0+IHBhY2tpbmdVbml0VG9DYXJnb0l0ZW0ob3JkZXIucGFja2luZ1VuaXQhLCBzY2FsZSkpO1xufTtcblxuLyoqXG4gKiBTZXJpYWxpemUgYSBDYXJnb0l0ZW0gYmFjayB0byBtZXRlci1iYXNlZCBkYXRhIGZvciBwZXJzaXN0ZW5jZS5cbiAqL1xuZXhwb3J0IGNvbnN0IGNhcmdvSXRlbVRvUGFja2luZ1VuaXREYXRhID0gKGl0ZW06IENhcmdvSXRlbSwgc2NhbGU6IG51bWJlcik6IFBhY2tpbmdVbml0RGF0YSA9PiB7XG4gIHJldHVybiB7XG4gICAgaWQ6IGl0ZW0uaWQucmVwbGFjZShcImNhcmdvLVwiLCBcIlwiKSxcbiAgICBuYW1lOiBpdGVtLm5hbWUsXG4gICAgbGVuZ3RoTWV0ZXI6IHBpeGVsVG9NZXRlcihpdGVtLndpZHRoLCBzY2FsZSksXG4gICAgd2lkdGhNZXRlcjogcGl4ZWxUb01ldGVyKGl0ZW0uaGVpZ2h0LCBzY2FsZSksXG4gICAgaGVpZ2h0TWV0ZXI6IGl0ZW0uaGVpZ2h0TSA/PyAwLFxuICAgIHBhY2tpbmdUeXBlOiBpdGVtLnR5cGUsXG4gICAgd2VpZ2h0S2c6IGl0ZW0ud2VpZ2h0S2csXG4gIH07XG59O1xuXG4vKipcbiAqIEhlbHBlcjogY29udmVydCBwaXhlbCB0byBtZXRlciAoaW52ZXJzZSBvZiBtZXRlclRvUGl4ZWwpLlxuICovXG5jb25zdCBwaXhlbFRvTWV0ZXIgPSAocGl4ZWw6IG51bWJlciwgc2NhbGU6IG51bWJlcik6IG51bWJlciA9PiB7XG4gIHJldHVybiBwaXhlbCAvIHNjYWxlO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIHZpc3VhbCBib3VuZGluZyByZWN0YW5nbGUgb2YgYSBDYXJnb0l0ZW0sIGFjY291bnRpbmcgZm9yIHJvdGF0aW9uLlxuICogRm9yIDkwLWRlZ3JlZSByb3RhdGlvbiwgd2lkdGggYW5kIGhlaWdodCBhcmUgc3dhcHBlZC5cbiAqL1xuZXhwb3J0IGNvbnN0IGdldENhcmdvSXRlbVJlY3QgPSAoaXRlbTogQ2FyZ29JdGVtKTogeyB4OiBudW1iZXI7IHk6IG51bWJlcjsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXIgfSA9PiB7XG4gIGlmIChpdGVtLnJvdGF0aW9uID09PSA5MCB8fCBpdGVtLnJvdGF0aW9uID09PSAyNzApIHtcbiAgICByZXR1cm4geyB4OiBpdGVtLngsIHk6IGl0ZW0ueSwgd2lkdGg6IGl0ZW0uaGVpZ2h0LCBoZWlnaHQ6IGl0ZW0ud2lkdGggfTtcbiAgfVxuICByZXR1cm4geyB4OiBpdGVtLngsIHk6IGl0ZW0ueSwgd2lkdGg6IGl0ZW0ud2lkdGgsIGhlaWdodDogaXRlbS5oZWlnaHQgfTtcbn07XG4iLCIvKipcbiAqIE1lbmRpeCBEYXRhIEFkYXB0ZXJcbiAqXG4gKiBCcmlkZ2VzIHRoZSBSZWFjdCB3aWRnZXQgdG8gdGhlIE1lbmRpeCBEYXRhIEFQSSAoYG14LmRhdGFgKS5cbiAqIEluIGEgTWVuZGl4IHJ1bnRpbWUsIGBteC5kYXRhYCBpcyBhdmFpbGFibGUgZ2xvYmFsbHkuIEluIHRoZSBkZXYgZW52aXJvbm1lbnRcbiAqIChWaXRlKSwgd2UgZmFsbCBiYWNrIHRvIEpTT04gcGFyc2luZyBmb3IgdGVzdGluZy5cbiAqXG4gKiBUaGlzIGFkYXB0ZXIgaGFuZGxlczpcbiAqIC0gTG9hZGluZyBUcnVja1NlbGVjdGlvbiDihpIgVHJhaWxlckl0ZW0gKHZpYSB0cmFpbGVyQWRhcHRlcilcbiAqIC0gTG9hZGluZyBUcmFuc3BvcnRPcmRlcnMg4oaSIENhcmdvSXRlbVtdICh2aWEgY2FyZ29BZGFwdGVyKVxuICogLSBMb2FkaW5nIFBhY2tpbmdQbGFuIOKGkiBDYXJnb0l0ZW1bXSAodmlhIHN0YXRlQWRhcHRlcilcbiAqIC0gU2F2aW5nIFBhY2tpbmdQbGFuIChkZWxldGUgKyByZWNyZWF0ZSBpdGVtcylcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IENhcmdvSXRlbSB9IGZyb20gXCIuLi92aWV3TW9kZWxzL0NhcmdvSXRlbVwiO1xuaW1wb3J0IHR5cGUgeyBUcmFpbGVySXRlbSB9IGZyb20gXCIuLi92aWV3TW9kZWxzL1RyYWlsZXJJdGVtXCI7XG5pbXBvcnQgeyBkZXNlcmlhbGl6ZVBsYW4sIHNlcmlhbGl6ZVBsYW4sIHR5cGUgUGFja2luZ1BsYW5EYXRhLCB0eXBlIFBhY2tpbmdQbGFuSXRlbURhdGEgfSBmcm9tIFwiLi9zdGF0ZUFkYXB0ZXJcIjtcbmltcG9ydCB7IHRydWNrU2VsZWN0aW9uVG9UcmFpbGVySXRlbSwgdHlwZSBUcnVja1NlbGVjdGlvbkRhdGEgfSBmcm9tIFwiLi90cmFpbGVyQWRhcHRlclwiO1xuaW1wb3J0IHsgdHJhbnNwb3J0T3JkZXJzVG9DYXJnb0l0ZW1zLCB0eXBlIFRyYW5zcG9ydE9yZGVyRGF0YSB9IGZyb20gXCIuL2NhcmdvQWRhcHRlclwiO1xuaW1wb3J0IHR5cGUgeyBDYW52YXNTdGF0ZSB9IGZyb20gXCIuLi9zdGF0ZS9DYW52YXNTdGF0ZVwiO1xuXG4vKipcbiAqIENoZWNrIGlmIHdlJ3JlIHJ1bm5pbmcgaW5zaWRlIGEgTWVuZGl4IHJ1bnRpbWUuXG4gKi9cbmNvbnN0IGlzTWVuZGl4UnVudGltZSA9ICgpOiBib29sZWFuID0+IHtcbiAgICByZXR1cm4gdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0eXBlb2YgKHdpbmRvdyBhcyB1bmtub3duIGFzIHsgbXg/OiB1bmtub3duIH0pLm14ICE9PSBcInVuZGVmaW5lZFwiO1xufTtcblxuLyoqXG4gKiBTYWZlbHkgYWNjZXNzIHRoZSBnbG9iYWwgYG14YCBvYmplY3QuXG4gKi9cbmNvbnN0IGdldE14ID0gKCk6IFdpbmRvd1tcIm14XCJdW1wiZGF0YVwiXSB8IG51bGwgPT4ge1xuICAgIGlmICghaXNNZW5kaXhSdW50aW1lKCkpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB3aW5kb3cubXguZGF0YTtcbn07XG5cbi8qKlxuICogTG9hZCBhIHNpbmdsZSBNZW5kaXggb2JqZWN0IGJ5IEdVSUQuXG4gKiBGYWxscyBiYWNrIHRvIEpTT04gcGFyc2luZyBpbiBkZXYgbW9kZS5cbiAqL1xuZXhwb3J0IGNvbnN0IGxvYWRNZW5kaXhPYmplY3QgPSBhc3luYyAoZ3VpZDogc3RyaW5nKTogUHJvbWlzZTx1bmtub3duPiA9PiB7XG4gICAgY29uc3QgbXhEYXRhID0gZ2V0TXgoKTtcbiAgICBpZiAobXhEYXRhKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBteERhdGEubG9hZCh7XG4gICAgICAgICAgICAgICAgZ3VpZCxcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogKG9iajogdW5rbm93bikgPT4gcmVzb2x2ZShvYmopLFxuICAgICAgICAgICAgICAgIGVycm9yOiAoZXJyOiBFcnJvcikgPT4gcmVqZWN0KGVycilcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gRGV2IGZhbGxiYWNrOiBhc3N1bWUgdGhlIGd1aWQgaXMgYWN0dWFsbHkgYSBKU09OIHN0cmluZ1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKGd1aWQpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59O1xuXG4vKipcbiAqIExvYWQgYSBsaXN0IG9mIE1lbmRpeCBvYmplY3RzIHZpYSBYUGF0aC5cbiAqIEZhbGxzIGJhY2sgdG8gSlNPTiBwYXJzaW5nIGluIGRldiBtb2RlLlxuICovXG5leHBvcnQgY29uc3QgbG9hZE1lbmRpeExpc3QgPSBhc3luYyAoeHBhdGg6IHN0cmluZyk6IFByb21pc2U8dW5rbm93bltdPiA9PiB7XG4gICAgY29uc3QgbXhEYXRhID0gZ2V0TXgoKTtcbiAgICBpZiAobXhEYXRhKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBteERhdGEubGlzdCh7XG4gICAgICAgICAgICAgICAgeHBhdGgsXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IChpdGVtczogdW5rbm93bltdKSA9PiByZXNvbHZlKGl0ZW1zKSxcbiAgICAgICAgICAgICAgICBlcnJvcjogKGVycjogRXJyb3IpID0+IHJlamVjdChlcnIpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vIERldiBmYWxsYmFjazogYXNzdW1lIHhwYXRoIGlzIGFjdHVhbGx5IGEgSlNPTiBzdHJpbmdcbiAgICB0cnkge1xuICAgICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHhwYXRoKTtcbiAgICAgICAgcmV0dXJuIEFycmF5LmlzQXJyYXkocGFyc2VkKSA/IHBhcnNlZCA6IFtdO1xuICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxufTtcblxuLyoqXG4gKiBFeGVjdXRlIGEgTWVuZGl4IG1pY3JvZmxvdyBhY3Rpb24uXG4gKiBGYWxscyBiYWNrIHRvIGEgbm8tb3AgaW4gZGV2IG1vZGUuXG4gKi9cbmV4cG9ydCBjb25zdCBleGVjdXRlTWVuZGl4QWN0aW9uID0gYXN5bmMgKGFjdGlvbklkOiBzdHJpbmcsIHBhcmFtczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fSk6IFByb21pc2U8dW5rbm93bj4gPT4ge1xuICAgIGNvbnN0IG14RGF0YSA9IGdldE14KCk7XG4gICAgaWYgKG14RGF0YSkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgbXhEYXRhLmFjdGlvbih7XG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7IGFjdGlvbklkLCAuLi5wYXJhbXMgfSxcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogKHJlc3VsdDogdW5rbm93bikgPT4gcmVzb2x2ZShyZXN1bHQpLFxuICAgICAgICAgICAgICAgIGVycm9yOiAoZXJyOiBFcnJvcikgPT4gcmVqZWN0KGVycilcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gRGV2IGZhbGxiYWNrOiBuby1vcFxuICAgIHJldHVybiBudWxsO1xufTtcblxuLyoqXG4gKiBMb2FkIHRoZSBUcnVja1NlbGVjdGlvbiBvYmplY3QgYW5kIGNvbnZlcnQgaXQgdG8gYSBUcmFpbGVySXRlbSB2aWV3IG1vZGVsLlxuICpcbiAqIEluIE1lbmRpeCwgdGhlIFRydWNrU2VsZWN0aW9uIG9iamVjdCByZWZlcmVuY2UgaXMgcGFzc2VkIGFzIGEgc3RyaW5nIEdVSUQuXG4gKiBXZSByZXNvbHZlIGl0IHZpYSBteC5kYXRhLmxvYWQsIHRoZW4gdHJhdmVyc2UgdGhlIHJlZmVyZW5jZSBjaGFpbjpcbiAqICAgVHJ1Y2tTZWxlY3Rpb24g4oaSIFJlc291cmNlSW5zdGFuY2Ug4oaSIFJlc291cmNlIOKGkiBUZWNobmljYWxEZXRhaWxzXG4gKiB0byBnZXQgdGhlIHRyYWlsZXIgZGltZW5zaW9ucy5cbiAqXG4gKiBAcGFyYW0gdHJ1Y2tSZWYgLSBUcnVja1NlbGVjdGlvbiBvYmplY3QgcmVmZXJlbmNlIChHVUlEIG9yIEpTT04gc3RyaW5nIGluIGRldilcbiAqIEBwYXJhbSBzY2FsZSAtIFBpeGVsLXRvLW1ldGVyIHNjYWxlIGZhY3RvclxuICogQHJldHVybnMgVHJhaWxlckl0ZW0gdmlldyBtb2RlbCwgb3IgbnVsbCBpZiBub3QgYXZhaWxhYmxlXG4gKi9cbmV4cG9ydCBjb25zdCBsb2FkVHJhaWxlckl0ZW0gPSBhc3luYyAodHJ1Y2tSZWY6IHN0cmluZyB8IHVuZGVmaW5lZCwgc2NhbGU6IG51bWJlcik6IFByb21pc2U8VHJhaWxlckl0ZW0gfCBudWxsPiA9PiB7XG4gICAgaWYgKCF0cnVja1JlZikge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgICBjb25zdCB0cnVja0RhdGEgPSAoYXdhaXQgbG9hZE1lbmRpeE9iamVjdCh0cnVja1JlZikpIGFzIFRydWNrU2VsZWN0aW9uRGF0YSB8IG51bGw7XG4gICAgICAgIGlmICghdHJ1Y2tEYXRhKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1Y2tTZWxlY3Rpb25Ub1RyYWlsZXJJdGVtKHRydWNrRGF0YSwgc2NhbGUpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGxvYWQgVHJ1Y2tTZWxlY3Rpb246XCIsIGVycik7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbn07XG5cbi8qKlxuICogTG9hZCBUcmFuc3BvcnRPcmRlciBvYmplY3RzIGFuZCBjb252ZXJ0IHRoZW0gdG8gQ2FyZ29JdGVtIHZpZXcgbW9kZWxzLlxuICpcbiAqIEluIE1lbmRpeCwgdGhlIFRyYW5zcG9ydE9yZGVyIGxpc3QgaXMgcGFzc2VkIGFzIGEgc3RyaW5nIHJlZmVyZW5jZS5cbiAqIFdlIHJlc29sdmUgaXQgdmlhIG14LmRhdGEubGlzdCwgdGhlbiB0cmF2ZXJzZTpcbiAqICAgVHJhbnNwb3J0T3JkZXIg4oaSIFBhY2tpbmdVbml0IOKGkiBQYWNraW5nVHlwZVxuICogdG8gZ2V0IGNhcmdvIGRpbWVuc2lvbnMuXG4gKlxuICogQHBhcmFtIG9yZGVyc1JlZiAtIFRyYW5zcG9ydE9yZGVyIGxpc3QgcmVmZXJlbmNlIChHVUlEIG9yIEpTT04gc3RyaW5nIGluIGRldilcbiAqIEBwYXJhbSBzY2FsZSAtIFBpeGVsLXRvLW1ldGVyIHNjYWxlIGZhY3RvclxuICogQHJldHVybnMgQXJyYXkgb2YgQ2FyZ29JdGVtIHZpZXcgbW9kZWxzXG4gKi9cbmV4cG9ydCBjb25zdCBsb2FkQ2FyZ29JdGVtcyA9IGFzeW5jIChvcmRlcnNHdWlkczogc3RyaW5nW10sIHNjYWxlOiBudW1iZXIpOiBQcm9taXNlPENhcmdvSXRlbVtdPiA9PiB7XG4gICAgaWYgKCFvcmRlcnNHdWlkcyB8fCBvcmRlcnNHdWlkcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IG9yZGVyc0RhdGEgPSBhd2FpdCBQcm9taXNlLmFsbChvcmRlcnNHdWlkcy5tYXAoZ3VpZCA9PiBsb2FkTWVuZGl4T2JqZWN0KGd1aWQpKSk7XG4gICAgICAgIHJldHVybiB0cmFuc3BvcnRPcmRlcnNUb0NhcmdvSXRlbXMob3JkZXJzRGF0YSBhcyBUcmFuc3BvcnRPcmRlckRhdGFbXSwgc2NhbGUpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGxvYWQgVHJhbnNwb3J0T3JkZXJzOlwiLCBlcnIpO1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxufTtcblxuLyoqXG4gKiBMb2FkIGEgc2F2ZWQgUGFja2luZ1BsYW4gZm9yIHRoZSBnaXZlbiBUcnVja1NlbGVjdGlvbi5cbiAqXG4gKiBUaGUgUGFja2luZ1BsYW4gZW50aXR5IGlzIGEgbmV3IGVudGl0eSBpbiBUQ1NMb2FkaW5nTWV0ZXI6XG4gKiAgIFBhY2tpbmdQbGFuICgxIHBlciBUcnVja1NlbGVjdGlvbilcbiAqICAgICDilJTilIAgUGFja2luZ1BsYW5JdGVtICgxLSogcGVyIHBsYW4pXG4gKlxuICogQHBhcmFtIHRydWNrR3VpZCAtIFRoZSBUcnVja1NlbGVjdGlvbiBHVUlEXG4gKiBAcGFyYW0gc2NhbGUgLSBQaXhlbC10by1tZXRlciBzY2FsZSBmYWN0b3JcbiAqIEByZXR1cm5zIEFycmF5IG9mIENhcmdvSXRlbSB2aWV3IG1vZGVscyByZXN0b3JlZCBmcm9tIHRoZSBwbGFuXG4gKi9cbmV4cG9ydCBjb25zdCBsb2FkUGFja2luZ1BsYW4gPSBhc3luYyAodHJ1Y2tHdWlkOiBzdHJpbmcgfCBudWxsLCBzY2FsZTogbnVtYmVyKTogUHJvbWlzZTxDYXJnb0l0ZW1bXT4gPT4ge1xuICAgIGlmICghdHJ1Y2tHdWlkKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgICAvLyBYUGF0aCB0byBmaW5kIHRoZSBQYWNraW5nUGxhbiBmb3IgdGhpcyB0cnVja1xuICAgICAgICBjb25zdCB4cGF0aCA9IGAvL1RDU0xvYWRpbmdNZXRlci5QYWNraW5nUGxhbltUcnVja1NlbGVjdGlvbiA9ICcke3RydWNrR3VpZH0nXWA7XG4gICAgICAgIGNvbnN0IHBsYW5zID0gYXdhaXQgbG9hZE1lbmRpeExpc3QoeHBhdGgpO1xuXG4gICAgICAgIGlmIChwbGFucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCB0aGUgZmlyc3QgKGFuZCBvbmx5KSBwbGFuXG4gICAgICAgIGNvbnN0IHBsYW5PYmogPSBwbGFuc1swXSBhcyB7IGd1aWQ6IHN0cmluZzsgaXRlbXM/OiB1bmtub3duW10gfTtcbiAgICAgICAgaWYgKCFwbGFuT2JqKSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cblxuICAgICAgICAvLyBMb2FkIHBsYW4gaXRlbXNcbiAgICAgICAgY29uc3QgaXRlbXNYUGF0aCA9IGAvL1RDU0xvYWRpbmdNZXRlci5QYWNraW5nUGxhbkl0ZW1bUGFja2luZ1BsYW4gPSAnJHtwbGFuT2JqLmd1aWR9J11gO1xuICAgICAgICBjb25zdCBwbGFuSXRlbXMgPSBhd2FpdCBsb2FkTWVuZGl4TGlzdChpdGVtc1hQYXRoKTtcblxuICAgICAgICAvLyBDb252ZXJ0IHRvIFBhY2tpbmdQbGFuRGF0YSBhbmQgZGVzZXJpYWxpemVcbiAgICAgICAgY29uc3QgcGxhbkRhdGE6IFBhY2tpbmdQbGFuRGF0YSA9IHtcbiAgICAgICAgICAgIHRydWNrSWQ6IHRydWNrR3VpZCxcbiAgICAgICAgICAgIGl0ZW1zOiBwbGFuSXRlbXMubWFwKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJhdyA9IGl0ZW0gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6IHJhdy5pZCBhcyBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHJhdy5uYW1lIGFzIHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogKHJhdy50eXBlIGFzIFwicGFsbGV0XCIgfCBcImJveFwiKSA/PyBcInBhbGxldFwiLFxuICAgICAgICAgICAgICAgICAgICB4OiBOdW1iZXIocmF3LngpLFxuICAgICAgICAgICAgICAgICAgICB5OiBOdW1iZXIocmF3LnkpLFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogTnVtYmVyKHJhdy53aWR0aCksXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogTnVtYmVyKHJhdy5oZWlnaHQpLFxuICAgICAgICAgICAgICAgICAgICByb3RhdGlvbjogTnVtYmVyKHJhdy5yb3RhdGlvbikgYXMgMCB8IDkwIHwgMTgwIHwgMjcwLFxuICAgICAgICAgICAgICAgICAgICBjb2xvcjogKHJhdy5jb2xvciBhcyBzdHJpbmcpID8/IFwiZ3JheVwiLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHRNOiByYXcuaGVpZ2h0TSA/IE51bWJlcihyYXcuaGVpZ2h0TSkgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgIHdlaWdodEtnOiByYXcud2VpZ2h0S2cgPyBOdW1iZXIocmF3LndlaWdodEtnKSA6IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgIH0gYXMgUGFja2luZ1BsYW5JdGVtRGF0YTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIGRlc2VyaWFsaXplUGxhbihwbGFuRGF0YSwgc2NhbGUpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGxvYWQgUGFja2luZ1BsYW46XCIsIGVycik7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFNhdmUgdGhlIGN1cnJlbnQgY2FudmFzIHN0YXRlIGFzIGEgUGFja2luZ1BsYW4uXG4gKlxuICogUGVyIHRoZSByZXF1aXJlbWVudHM6XG4gKiAtIE9ubHkgMSBwYWNraW5nIHBsYW4gcGVyIHRydWNrIChubyB2ZXJzaW9uaW5nKVxuICogLSBPbiBzYXZlOiBkZWxldGUgZXhpc3RpbmcgcGxhbiBpdGVtcyArIHJlY3JlYXRlXG4gKlxuICogQHBhcmFtIHRydWNrR3VpZCAtIFRoZSBUcnVja1NlbGVjdGlvbiBHVUlEXG4gKiBAcGFyYW0gc3RhdGUgLSBDdXJyZW50IGNhbnZhcyBzdGF0ZVxuICogQHBhcmFtIHNjYWxlIC0gUGl4ZWwtdG8tbWV0ZXIgc2NhbGUgZmFjdG9yXG4gKiBAcGFyYW0gb25TYXZlTWljcm9mbG93IC0gT3B0aW9uYWwgTWVuZGl4IG1pY3JvZmxvdyBjYWxsYmFja1xuICogQHJldHVybnMgVGhlIHNlcmlhbGl6ZWQgcGxhbiBkYXRhXG4gKi9cbmV4cG9ydCBjb25zdCBzYXZlUGFja2luZ1BsYW4gPSBhc3luYyAoXG4gICAgdHJ1Y2tHdWlkOiBzdHJpbmcgfCBudWxsLFxuICAgIHN0YXRlOiBDYW52YXNTdGF0ZSxcbiAgICBzY2FsZTogbnVtYmVyLFxuICAgIG9uU2F2ZU1pY3JvZmxvdz86ICgpID0+IHZvaWRcbik6IFByb21pc2U8UGFja2luZ1BsYW5EYXRhPiA9PiB7XG4gICAgY29uc3QgcGxhbiA9IHNlcmlhbGl6ZVBsYW4oc3RhdGUsIHNjYWxlKTtcblxuICAgIGlmIChpc01lbmRpeFJ1bnRpbWUoKSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gU3RlcCAxOiBGaW5kIGV4aXN0aW5nIFBhY2tpbmdQbGFuIGZvciB0aGlzIHRydWNrXG4gICAgICAgICAgICBjb25zdCB4cGF0aCA9IGAvL1RDU0xvYWRpbmdNZXRlci5QYWNraW5nUGxhbltUcnVja1NlbGVjdGlvbiA9ICcke3RydWNrR3VpZH0nXWA7XG4gICAgICAgICAgICBjb25zdCBwbGFucyA9IGF3YWl0IGxvYWRNZW5kaXhMaXN0KHhwYXRoKTtcblxuICAgICAgICAgICAgbGV0IHBsYW5HdWlkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICAgICAgICAgICAgaWYgKHBsYW5zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBTdGVwIDJhOiBQbGFuIGV4aXN0cyDigJQgZGVsZXRlIGFsbCBleGlzdGluZyBpdGVtc1xuICAgICAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nUGxhbiA9IHBsYW5zWzBdIGFzIHsgZ3VpZDogc3RyaW5nIH07XG4gICAgICAgICAgICAgICAgcGxhbkd1aWQgPSBleGlzdGluZ1BsYW4uZ3VpZDtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1zWFBhdGggPSBgLy9UQ1NMb2FkaW5nTWV0ZXIuUGFja2luZ1BsYW5JdGVtW1BhY2tpbmdQbGFuID0gJyR7cGxhbkd1aWR9J11gO1xuICAgICAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nSXRlbXMgPSBhd2FpdCBsb2FkTWVuZGl4TGlzdChpdGVtc1hQYXRoKTtcblxuICAgICAgICAgICAgICAgIC8vIERlbGV0ZSBlYWNoIGl0ZW1cbiAgICAgICAgICAgICAgICBjb25zdCBteERhdGEgPSBnZXRNeCgpITtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgZXhpc3RpbmdJdGVtcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpdGVtT2JqID0gaXRlbSBhcyB7IGd1aWQ6IHN0cmluZyB9O1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBteERhdGEucmVtb3ZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBndWlkOiBpdGVtT2JqLmd1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHJlc29sdmUoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogKGVycjogRXJyb3IpID0+IHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBTdGVwIDJiOiBObyBwbGFuIGV4aXN0cyDigJQgY3JlYXRlIG9uZVxuICAgICAgICAgICAgICAgIGNvbnN0IG14RGF0YSA9IGdldE14KCkhO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1BsYW4gPSBhd2FpdCBuZXcgUHJvbWlzZTx1bmtub3duPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIG14RGF0YS5jcmVhdGUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5OiBcIlRDU0xvYWRpbmdNZXRlci5QYWNraW5nUGxhblwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBUcnVja1NlbGVjdGlvbjogdHJ1Y2tHdWlkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAob2JqOiB1bmtub3duKSA9PiByZXNvbHZlKG9iaiksXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogKGVycjogRXJyb3IpID0+IHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHBsYW5HdWlkID0gKG5ld1BsYW4gYXMgeyBndWlkOiBzdHJpbmcgfSkuZ3VpZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU3RlcCAzOiBDcmVhdGUgbmV3IHBsYW4gaXRlbXNcbiAgICAgICAgICAgIGNvbnN0IG14RGF0YSA9IGdldE14KCkhO1xuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHBsYW4uaXRlbXMpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIG14RGF0YS5jcmVhdGUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5OiBcIlRDU0xvYWRpbmdNZXRlci5QYWNraW5nUGxhbkl0ZW1cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgUGFja2luZ1BsYW46IHBsYW5HdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBUcmFuc3BvcnRPcmRlcjogaXRlbS5pZC5zdGFydHNXaXRoKFwiY2FyZ28tXCIpID8gaXRlbS5pZC5yZXBsYWNlKFwiY2FyZ28tXCIsIFwiXCIpIDogaXRlbS5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgUG9zaXRpb25YOiBpdGVtLngsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBvc2l0aW9uWTogaXRlbS55LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBXaWR0aDogaXRlbS53aWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSGVpZ2h0OiBpdGVtLmhlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgUm90YXRpb246IGl0ZW0ucm90YXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENvbG9yOiBpdGVtLmNvbG9yLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBIZWlnaHRNZXRlcnM6IGl0ZW0uaGVpZ2h0TSA/PyAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBXZWlnaHRLZzogaXRlbS53ZWlnaHRLZyA/PyAwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiByZXNvbHZlKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogKGVycjogRXJyb3IpID0+IHJlamVjdChlcnIpXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDb21taXQgdGhlIHBsYW5cbiAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBteERhdGEuY29tbWl0KHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHJlc29sdmUoKSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IChlcnI6IEVycm9yKSA9PiByZWplY3QoZXJyKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBzYXZlIFBhY2tpbmdQbGFuOlwiLCBlcnIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gRGV2IGZhbGxiYWNrOiBsb2NhbFN0b3JhZ2VcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcImxvYWRpbmdDYW52YXNQbGFuXCIsIEpTT04uc3RyaW5naWZ5KHBsYW4pKTtcblxuICAgIC8vIFRyaWdnZXIgTWVuZGl4IG1pY3JvZmxvdyBjYWxsYmFjayBpZiBwcm92aWRlZFxuICAgIGlmIChvblNhdmVNaWNyb2Zsb3cpIHtcbiAgICAgICAgb25TYXZlTWljcm9mbG93KCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBsYW47XG59O1xuIiwiaW1wb3J0IHsgdXNlQ2FsbGJhY2ssIHVzZUVmZmVjdCwgdXNlTWVtbywgdXNlU3RhdGUsIHR5cGUgUmVhY3RFbGVtZW50IH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgeyBMb2FkaW5nQ2FudmFzIH0gZnJvbSBcIi4vTG9hZGluZ0NhbnZhc1wiO1xuaW1wb3J0IHR5cGUgeyBMb2FkaW5nQ2FudmFzUHJvcHMsIExvYWRpbmdDYW52YXNWaWV3TW9kZWxQcm9wcyB9IGZyb20gXCIuL0xvYWRpbmdDYW52YXMucHJvcGVydGllc1wiO1xuaW1wb3J0IHsgY29tcHV0ZVNjYWxlLCB0eXBlIFRydWNrU2VsZWN0aW9uRGF0YSB9IGZyb20gXCIuLi9hZGFwdGVycy90cmFpbGVyQWRhcHRlclwiO1xuaW1wb3J0IHsgbG9hZFRyYWlsZXJJdGVtLCBsb2FkQ2FyZ29JdGVtcywgbG9hZFBhY2tpbmdQbGFuLCBzYXZlUGFja2luZ1BsYW4gfSBmcm9tIFwiLi4vYWRhcHRlcnMvbWVuZGl4RGF0YUFkYXB0ZXJcIjtcbmltcG9ydCB0eXBlIHsgQ2FyZ29JdGVtIH0gZnJvbSBcIi4uL3ZpZXdNb2RlbHMvQ2FyZ29JdGVtXCI7XG5pbXBvcnQgdHlwZSB7IFRyYWlsZXJJdGVtIH0gZnJvbSBcIi4uL3ZpZXdNb2RlbHMvVHJhaWxlckl0ZW1cIjtcbmltcG9ydCB0eXBlIHsgQ2FudmFzU3RhdGUgfSBmcm9tIFwiLi4vc3RhdGUvQ2FudmFzU3RhdGVcIjtcblxuLyoqXG4gKiBMb2FkaW5nQ2FudmFzQ29udGFpbmVyIOKAlCB0aGUgTWVuZGl4IHdpZGdldCBjb250YWluZXIuXG4gKlxuICogVGhpcyBjb21wb25lbnQgc2l0cyBiZXR3ZWVuIE1lbmRpeCBhbmQgdGhlIExvYWRpbmdDYW52YXMgd2lkZ2V0LlxuICogSXQgaXMgcmVzcG9uc2libGUgZm9yOlxuICogLSBSZWNlaXZpbmcgcmF3IE1lbmRpeCBvYmplY3QgcmVmZXJlbmNlcyAoR1VJRCBzdHJpbmdzKVxuICogLSBSZXNvbHZpbmcgdGhlbSB0byBmdWxsIG9iamVjdHMgdmlhIHRoZSBNZW5kaXggRGF0YSBBUEkgKG14LmRhdGEpXG4gKiAtIENvbnZlcnRpbmcgdGhlbSB0byB2aWV3IG1vZGVscyB1c2luZyBhZGFwdGVyc1xuICogLSBQYXNzaW5nIHRoZSB2aWV3IG1vZGVscyBhbmQgY2FsbGJhY2tzIHRvIHRoZSBMb2FkaW5nQ2FudmFzIHdpZGdldFxuICogLSBIYW5kbGluZyBzYXZlL2xvYWQgcGxhbiB2aWEgTWVuZGl4IG1pY3JvZmxvd3MgYW5kIHRoZSBQYWNraW5nUGxhbiBlbnRpdHlcbiAqXG4gKiBJbiBhIHJlYWwgTWVuZGl4IHByb2plY3QsIHRoZSBvYmplY3QgcmVmZXJlbmNlcyBhcmUgcmVzb2x2ZWQgdmlhIG14LmRhdGEuXG4gKiBJbiB0aGUgZGV2IGVudmlyb25tZW50IChWaXRlKSwgdGhlIHJlZmVyZW5jZXMgYXJlIEpTT04gc3RyaW5ncyB0aGF0IGFyZVxuICogcGFyc2VkIGRpcmVjdGx5LlxuICovXG5leHBvcnQgY29uc3QgTG9hZGluZ0NhbnZhc0NvbnRhaW5lciA9IChwcm9wczogTG9hZGluZ0NhbnZhc1Byb3BzKTogUmVhY3RFbGVtZW50ID0+IHtcbiAgY29uc3Qge1xuICAgIHRydWNrczogdHJ1Y2tzUmVmLFxuICAgIHRyYW5zcG9ydE9yZGVyczogdHJhbnNwb3J0T3JkZXJzUmVmLFxuICAgIGNhbnZhc1dpZHRoID0gMTAwMCxcbiAgICBjYW52YXNIZWlnaHQgPSA2MDAsXG4gICAgb25TYXZlUGxhbjogb25TYXZlUGxhbkNhbGxiYWNrLFxuICAgIG9uTG9hZFBsYW46IG9uTG9hZFBsYW5DYWxsYmFjayxcbiAgfSA9IHByb3BzO1xuXG4gIC8vIC0tLSBTdGF0ZSBmb3IgbG9hZGVkIGRhdGEgLS0tXG4gIGNvbnN0IFt0cmFpbGVySXRlbSwgc2V0VHJhaWxlckl0ZW1dID0gdXNlU3RhdGU8VHJhaWxlckl0ZW0gfCBudWxsPihudWxsKTtcbiAgY29uc3QgW3BhbGxldExpc3QsIHNldFBhbGxldExpc3RdID0gdXNlU3RhdGU8Q2FyZ29JdGVtW10+KFtdKTtcbiAgY29uc3QgW2luaXRpYWxDYW52YXNJdGVtcywgc2V0SW5pdGlhbENhbnZhc0l0ZW1zXSA9IHVzZVN0YXRlPENhcmdvSXRlbVtdPihbXSk7XG4gIGNvbnN0IFtzY2FsZSwgc2V0U2NhbGVdID0gdXNlU3RhdGUoMSk7XG4gIGNvbnN0IFt0cnVja0d1aWQsIHNldFRydWNrR3VpZF0gPSB1c2VTdGF0ZTxzdHJpbmcgfCBudWxsPihudWxsKTtcbiAgY29uc3QgW2lzTG9hZGluZywgc2V0SXNMb2FkaW5nXSA9IHVzZVN0YXRlKHRydWUpO1xuXG4gIC8vIC0tLSBMb2FkIHRydWNrIGRhdGEgYW5kIGNvbXB1dGUgc2NhbGUgLS0tXG4gIC8vIFdlIG5lZWQgdGhlIHRydWNrIGRhdGEgdG8gY29tcHV0ZSB0aGUgc2NhbGUsIGJ1dCB3ZSBhbHNvIG5lZWQgdGhlIHNjYWxlXG4gIC8vIHRvIGNvbnZlcnQgdHJ1Y2sgZGF0YSB0byBhIFRyYWlsZXJJdGVtLiBTbyB3ZSBmaXJzdCBsb2FkIHRoZSByYXcgdHJ1Y2sgZGF0YSxcbiAgLy8gY29tcHV0ZSB0aGUgc2NhbGUsIHRoZW4gY29udmVydCB0byBhIFRyYWlsZXJJdGVtLlxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IGxvYWRUcnVjayA9IGFzeW5jICgpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICAgIGlmICghdHJ1Y2tzUmVmKSB7XG4gICAgICAgIHNldFRyYWlsZXJJdGVtKG51bGwpO1xuICAgICAgICBzZXRUcnVja0d1aWQobnVsbCk7XG4gICAgICAgIHNldFNjYWxlKDEpO1xuICAgICAgICBzZXRJc0xvYWRpbmcoZmFsc2UpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIExvYWQgdGhlIHJhdyB0cnVjayBkYXRhIHRvIGNvbXB1dGUgc2NhbGVcbiAgICAgICAgY29uc3QgcmF3VHJ1Y2sgPSBhd2FpdCBsb2FkTWVuZGl4T2JqZWN0UmF3KHRydWNrc1JlZik7XG4gICAgICAgIGlmIChyYXdUcnVjaykge1xuICAgICAgICAgIHNldFRydWNrR3VpZChyYXdUcnVjay5pZCA/PyBudWxsKTtcblxuICAgICAgICAgIC8vIENvbXB1dGUgc2NhbGUgZnJvbSB0cnVjayBkaW1lbnNpb25zXG4gICAgICAgICAgY29uc3QgY29tcHV0ZWRTY2FsZSA9IGNvbXB1dGVTY2FsZShyYXdUcnVjaywgY2FudmFzV2lkdGgsIGNhbnZhc0hlaWdodCk7XG4gICAgICAgICAgc2V0U2NhbGUoY29tcHV0ZWRTY2FsZSk7XG5cbiAgICAgICAgICAvLyBDb252ZXJ0IHRvIFRyYWlsZXJJdGVtXG4gICAgICAgICAgY29uc3QgdHJhaWxlciA9IGF3YWl0IGxvYWRUcmFpbGVySXRlbSh0cnVja3NSZWYsIGNvbXB1dGVkU2NhbGUpO1xuICAgICAgICAgIHNldFRyYWlsZXJJdGVtKHRyYWlsZXIpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBsb2FkIHRydWNrIGRhdGE6XCIsIGVycik7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGxvYWRUcnVjaygpO1xuICB9LCBbdHJ1Y2tzUmVmLCBjYW52YXNXaWR0aCwgY2FudmFzSGVpZ2h0XSk7XG5cbiAgLy8gLS0tIExvYWQgdHJhbnNwb3J0IG9yZGVycyAocGFsbGV0IGxpc3QpIC0tLVxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IGxvYWRPcmRlcnMgPSBhc3luYyAoKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICBpZiAoIXRyYW5zcG9ydE9yZGVyc1JlZiB8fCB0cmFuc3BvcnRPcmRlcnNSZWYubGVuZ3RoID09PSAwIHx8IHNjYWxlID09PSAxKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBhd2FpdCBsb2FkQ2FyZ29JdGVtcyh0cmFuc3BvcnRPcmRlcnNSZWYsIHNjYWxlKTtcbiAgICAgICAgc2V0UGFsbGV0TGlzdChpdGVtcyk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBsb2FkIHRyYW5zcG9ydCBvcmRlcnM6XCIsIGVycik7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGxvYWRPcmRlcnMoKTtcbiAgfSwgW3RyYW5zcG9ydE9yZGVyc1JlZiwgc2NhbGVdKTtcblxuICAvLyAtLS0gTG9hZCBzYXZlZCBwYWNraW5nIHBsYW4gLS0tXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgbG9hZFBsYW4gPSBhc3luYyAoKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICBpZiAoIXRydWNrR3VpZCB8fCBzY2FsZSA9PT0gMSkge1xuICAgICAgICBzZXRJc0xvYWRpbmcoZmFsc2UpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHNhdmVkSXRlbXMgPSBhd2FpdCBsb2FkUGFja2luZ1BsYW4odHJ1Y2tHdWlkLCBzY2FsZSk7XG4gICAgICAgIHNldEluaXRpYWxDYW52YXNJdGVtcyhzYXZlZEl0ZW1zKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGxvYWQgcGFja2luZyBwbGFuOlwiLCBlcnIpO1xuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgc2V0SXNMb2FkaW5nKGZhbHNlKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgbG9hZFBsYW4oKTtcbiAgfSwgW3RydWNrR3VpZCwgc2NhbGVdKTtcblxuICAvLyAtLS0gU2F2ZSBwbGFuIGhhbmRsZXIg4oCUIGNhbGxlZCBieSB0aGUgd2lkZ2V0IHdpdGggY3VycmVudCBpdGVtcyBhbmQgc2NhbGUgLS0tXG4gIGNvbnN0IGhhbmRsZVNhdmVQbGFuID0gdXNlQ2FsbGJhY2soXG4gICAgYXN5bmMgKGl0ZW1zOiBDYXJnb0l0ZW1bXSwgY3VycmVudFNjYWxlOiBudW1iZXIpID0+IHtcbiAgICAgIGlmICghdHJ1Y2tHdWlkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gQnVpbGQgYSBtaW5pbWFsIENhbnZhc1N0YXRlIGZvciBzZXJpYWxpemF0aW9uXG4gICAgICBjb25zdCBzdGF0ZTogQ2FudmFzU3RhdGUgPSB7XG4gICAgICAgIHRyYWlsZXI6IHRyYWlsZXJJdGVtLFxuICAgICAgICBjYXJnb3M6IGl0ZW1zLFxuICAgICAgICBzZWxlY3RlZElkczogW10sXG4gICAgICAgIGFjdGl2ZUl0ZW1JZDogbnVsbCxcbiAgICAgICAgdmFsaWRhdGlvbjogeyB2YWxpZDogdHJ1ZSwgZXJyb3JzOiBbXSB9LFxuICAgICAgICBzY2FsZTogY3VycmVudFNjYWxlLFxuICAgICAgfTtcblxuICAgICAgYXdhaXQgc2F2ZVBhY2tpbmdQbGFuKHRydWNrR3VpZCwgc3RhdGUsIGN1cnJlbnRTY2FsZSwgb25TYXZlUGxhbkNhbGxiYWNrKTtcbiAgICB9LFxuICAgIFt0cnVja0d1aWQsIHRyYWlsZXJJdGVtLCBvblNhdmVQbGFuQ2FsbGJhY2tdXG4gICk7XG5cbiAgLy8gLS0tIExvYWQgcGxhbiBoYW5kbGVyIC0tLVxuICBjb25zdCBoYW5kbGVMb2FkUGxhbiA9IHVzZUNhbGxiYWNrKCgpID0+IHtcbiAgICBpZiAob25Mb2FkUGxhbkNhbGxiYWNrKSB7XG4gICAgICBvbkxvYWRQbGFuQ2FsbGJhY2soKTtcbiAgICB9XG4gIH0sIFtvbkxvYWRQbGFuQ2FsbGJhY2tdKTtcblxuICAvLyAtLS0gQnVpbGQgdmlldyBtb2RlbCBwcm9wcyBmb3IgdGhlIHdpZGdldCAtLS1cbiAgY29uc3Qgdmlld01vZGVsOiBMb2FkaW5nQ2FudmFzVmlld01vZGVsUHJvcHMgPSB1c2VNZW1vKFxuICAgICgpID0+ICh7XG4gICAgICB0cmFpbGVyOiB0cmFpbGVySXRlbSxcbiAgICAgIHBhbGxldExpc3QsXG4gICAgICBpbml0aWFsQ2FudmFzSXRlbXMsXG4gICAgICBzY2FsZSxcbiAgICAgIGNhbnZhc1dpZHRoLFxuICAgICAgY2FudmFzSGVpZ2h0LFxuICAgICAgb25TYXZlUGxhbjogaGFuZGxlU2F2ZVBsYW4sXG4gICAgICBvbkxvYWRQbGFuOiBoYW5kbGVMb2FkUGxhbixcbiAgICB9KSxcbiAgICBbdHJhaWxlckl0ZW0sIHBhbGxldExpc3QsIGluaXRpYWxDYW52YXNJdGVtcywgc2NhbGUsIGNhbnZhc1dpZHRoLCBjYW52YXNIZWlnaHQsIGhhbmRsZVNhdmVQbGFuLCBoYW5kbGVMb2FkUGxhbl1cbiAgKTtcblxuICByZXR1cm4gPExvYWRpbmdDYW52YXMgdmlld01vZGVsPXt2aWV3TW9kZWx9IGlzTG9hZGluZz17aXNMb2FkaW5nfSAvPjtcbn07XG5cbi8qKlxuICogTG9hZCByYXcgdHJ1Y2sgZGF0YSAoZm9yIHNjYWxlIGNvbXB1dGF0aW9uKS5cbiAqIEluIE1lbmRpeCwgdGhpcyB1c2VzIG14LmRhdGEubG9hZC4gSW4gZGV2LCBpdCBwYXJzZXMgSlNPTi5cbiAqL1xuY29uc3QgbG9hZE1lbmRpeE9iamVjdFJhdyA9IGFzeW5jIChyZWY6IHN0cmluZyk6IFByb21pc2U8VHJ1Y2tTZWxlY3Rpb25EYXRhIHwgbnVsbD4gPT4ge1xuICAvLyBUcnkgbXguZGF0YSBmaXJzdFxuICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiAmJiAod2luZG93IGFzIHVua25vd24gYXMgeyBteD86IHVua25vd24gfSkubXgpIHtcbiAgICBjb25zdCBteERhdGEgPSAod2luZG93IGFzIHVua25vd24gYXMgeyBteDogeyBkYXRhOiB1bmtub3duIH0gfSkubXguZGF0YSBhcyB7XG4gICAgICBsb2FkOiAob3B0czogeyBndWlkOiBzdHJpbmc7IGNhbGxiYWNrOiAob2JqOiB1bmtub3duKSA9PiB2b2lkOyBlcnJvcj86IChlOiBFcnJvcikgPT4gdm9pZCB9KSA9PiB2b2lkO1xuICAgIH07XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIG14RGF0YS5sb2FkKHtcbiAgICAgICAgZ3VpZDogcmVmLFxuICAgICAgICBjYWxsYmFjazogKG9iajogdW5rbm93bikgPT4gcmVzb2x2ZShvYmogYXMgVHJ1Y2tTZWxlY3Rpb25EYXRhKSxcbiAgICAgICAgZXJyb3I6IChlcnI6IEVycm9yKSA9PiByZWplY3QoZXJyKSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4gIC8vIERldiBmYWxsYmFjazogcGFyc2UgSlNPTlxuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKHJlZikgYXMgVHJ1Y2tTZWxlY3Rpb25EYXRhO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgTG9hZGluZ0NhbnZhc0NvbnRhaW5lcjtcbiJdLCJuYW1lcyI6WyJfanN4IiwiX2pzeHMiLCJ1c2VNZW1vIiwidXNlRWZmZWN0IiwidXNlU3RhdGUiLCJ1c2VDYWxsYmFjayIsInVzZVJlZiJdLCJtYXBwaW5ncyI6Ijs7SUFBQTtJQUNBO0lBRU8sTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUM7SUFDbEMsTUFBTSxxQkFBcUIsR0FBRyxHQUFHLENBQUM7SUFDbEMsTUFBTSxhQUFhLEdBQUcsaUJBQWlCLENBQUM7SUFFL0M7SUFFTyxNQUFNLGNBQWMsR0FBRyxXQUFXLENBQUM7SUFFMUM7SUFFTyxNQUFNLGNBQWMsR0FBRyxFQUFFLENBQUM7SUFDMUIsTUFBTSxlQUFlLEdBQUcsRUFBRSxDQUFDO0lBQzNCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDO0lBQ2hDLE1BQU0sa0JBQWtCLEdBQUcsU0FBUyxDQUFDO0lBQ3JDLE1BQU0scUJBQXFCLEdBQUcsTUFBTSxDQUFDO0lBQ3JDLE1BQU0saUJBQWlCLEdBQUcsZ0JBQWdCLENBQUM7SUFFbEQ7SUFFTyxNQUFNLFNBQVMsR0FBRyxFQUFFLENBQUM7SUFFNUI7SUFFTyxNQUFNLGFBQWEsR0FBRyxFQUFFLENBQUM7SUFFekIsTUFBTSxjQUFjLEdBQUcsRUFBRTs7SUN6QmhDOztJQUVHO0lBQ0ksTUFBTSxRQUFRLEdBQUcsQ0FBQyxRQUFrQixLQUFjO1FBQ3JELFFBQVEsQ0FBQyxRQUFRLEdBQUcsYUFBYSxJQUFJLEdBQUcsRUFBYztJQUMxRCxDQUFDLENBQUM7SUFFRjs7SUFFRztJQUNJLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxRQUFrQixLQUFhO0lBQzlE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
