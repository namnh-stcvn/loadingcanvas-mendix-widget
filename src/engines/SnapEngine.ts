import type { Point, Rotation, RectLike } from "../types/geometry";
import { snapToGrid } from "../domain/snapRules";
import { getRotatedSize } from "../domain/rotationRules";
import { GRID_SIZE, SNAP_THRESHOLD } from "../constants/canvas";

export interface SnapTarget {
    position: Point;
    rotation?: Rotation;
    type: "edge" | "align" | "boundary" | "grid" | "angle" | "none";
    distance: number;
}

/**
 * Configuration for snap calculations.
 */
export interface SnapConfig {
    /** Bounding rectangle for boundary snapping (optional) */
    bounds?: RectLike;
    /** Grid size for grid snapping (0 disables grid snap) */
    gridSize: number;
    /** Maximum distance to snap (pixels) */
    threshold: number;
}

/**
 * Internal representation of a snap candidate along a single axis.
 */
interface SnapCandidate {
    position: number;
    type: SnapTarget["type"];
    distance: number;
}

/**
 * Default configuration values.
 */
const DEFAULT_SNAP_CONFIG: SnapConfig = {
    gridSize: GRID_SIZE,
    threshold: SNAP_THRESHOLD
};

/**
 * Evaluates a snap candidate against the current best candidate.
 * Returns the better candidate (the one with smaller distance).
 */
function evaluateCandidate(current: SnapCandidate, candidate: SnapCandidate): SnapCandidate {
    return candidate.distance < current.distance ? candidate : current;
}

/**
 * Creates a snap candidate for a target position.
 */
function createCandidate(position: number, type: SnapTarget["type"], targetPos: number): SnapCandidate {
    return {
        position,
        type,
        distance: Math.abs(targetPos - position)
    };
}

/**
 * Calculates boundary snap candidates for a single axis.
 */
function calculateBoundaryCandidates(
    targetPos: number,
    itemSize: number,
    bounds: RectLike,
    axis: "x" | "y"
): SnapCandidate[] {
    const boundsStart = axis === "x" ? bounds.x : bounds.y;
    const boundsEnd = axis === "x" ? bounds.x + bounds.width : bounds.y + bounds.height;

    return [
        createCandidate(boundsStart, "boundary", targetPos),
        createCandidate(boundsEnd - itemSize, "boundary", targetPos)
    ];
}

/**
 * Calculates edge and alignment snap candidates for a single axis
 * against another item.
 */
function calculateItemSnapCandidates(
    targetPos: number,
    itemSize: number,
    other: RectLike,
    otherSize: number,
    axis: "x" | "y"
): SnapCandidate[] {
    const otherStart = axis === "x" ? other.x : other.y;
    const otherEnd = axis === "x" ? other.x + otherSize : other.y + otherSize;

    return [
        // Edge: item touching other's far edge
        createCandidate(otherEnd, "edge", targetPos),
        // Edge: item touching other's near edge
        createCandidate(otherStart - itemSize, "edge", targetPos),
        // Align: item's near edge aligned with other's near edge
        createCandidate(otherStart, "align", targetPos),
        // Align: item's far edge aligned with other's far edge
        createCandidate(otherEnd - itemSize, "align", targetPos)
    ];
}

/**
 * Calculates grid snap candidate for a single axis.
 */
function calculateGridCandidate(targetPos: number, gridSize: number, threshold: number): SnapCandidate | null {
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

/**
 * Finds the best snap candidate from a list of candidates.
 * If no candidate is within threshold, returns the target position as fallback.
 */
function findBestCandidate(candidates: SnapCandidate[], threshold: number, targetPos: number): SnapCandidate {
    const initial: SnapCandidate = {
        position: targetPos,
        type: "none",
        distance: threshold + 1
    };

    return candidates.reduce((best, candidate) => evaluateCandidate(best, candidate), initial);
}

export class SnapEngine {
    /**
     * Calculates the best snap target for an item being dragged.
     *
     * The method evaluates multiple snap sources in priority order:
     * 1. Boundary snapping (if bounds are provided)
     * 2. Edge contact snapping (touching other items)
     * 3. Alignment snapping (aligning edges with other items)
     * 4. Grid snapping (fallback when no other snap is within threshold)
     *
     * @param item - The item being dragged
     * @param others - Other items to snap against
     * @param targetPos - Current target position
     * @param config - Snap configuration (bounds, gridSize, threshold)
     * @returns The best snap target found
     */
    calculateSnapTarget<T extends RectLike & { rotation?: Rotation }>(
        item: T,
        others: T[],
        targetPos: Point,
        config: Partial<SnapConfig> = {}
    ): SnapTarget {
        const { bounds, gridSize = DEFAULT_SNAP_CONFIG.gridSize, threshold = DEFAULT_SNAP_CONFIG.threshold } = config;

        const itemVis = getRotatedSize({ width: item.width, height: item.height }, item.rotation ?? 0);

        // Collect all X-axis candidates
        const xCandidates: SnapCandidate[] = [];

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
        const yCandidates: SnapCandidate[] = [];

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

        const maxDistance = Math.max(
            finalBestX.distance <= threshold ? finalBestX.distance : 0,
            finalBestY.distance <= threshold ? finalBestY.distance : 0
        );

        const resultType =
            finalBestX.type !== "none" ? finalBestX.type : finalBestY.type !== "none" ? finalBestY.type : "none";

        return {
            position: { x: finalBestX.position, y: finalBestY.position },
            type: resultType,
            distance: maxDistance
        };
    }
}
