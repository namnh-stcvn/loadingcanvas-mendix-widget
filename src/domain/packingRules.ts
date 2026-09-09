import type { CargoItem } from "../viewModels/CargoItem";
import type { RectLike, Rotation } from "../types/geometry";
import { findCollisions, isInsideBounds } from "./geometryRules";
import { optimizePacking } from "./packingOptimizer";
import { DEFAULT_AXIS_SCALE, getRotatedScreenSize, type AxisScale } from "./rotationRules";
import { fromCargoId } from "./cargoIdentity";

export interface PackingOptions {
  allowRotation?: boolean;
  // Units at or below this count are packed by the exact anytime solver; larger
  // loads fall back to the deterministic skyline heuristic.
  exactLimit?: number;
  // Wall-clock budget (ms) handed to the exact solver.
  timeLimitMs?: number;
}

export interface PackingResult {
  placed: CargoItem[];
  unplaced: CargoItem[];
}

interface Placement {
  x: number;
  y: number;
  rotation: Rotation;
}

const ORIENTATIONS: Rotation[] = [0, 90];

interface Size2D {
  length: number;
  width: number;
}

const getVisualSize = (item: CargoItem, rotation: Rotation, scale: AxisScale): Size2D => {
  return getRotatedScreenSize({ length: item.length, width: item.width }, rotation, scale);
};

// Larger footprints are placed first so small items fill the remaining gaps
// instead of blocking large ones.
const byAreaDescending = (a: CargoItem, b: CargoItem): number => b.length * b.width - a.length * a.width;

// Loads at or below this unit count are packed by the proven-optimal anytime
// search; bigger loads use the skyline heuristic further down.
const DEFAULT_EXACT_UNIT_LIMIT = 16;

const EPSILON = 1e-4;

interface SkylineSegment {
  x: number;
  y: number;
  width: number;
}

// Bottom-left skyline spot: anchor at every segment, bridge neighbours until
// the footprint fits; the deepest frontier in the span sets the top edge. 0°
// wins strict (y, x) ties over 90° (BR-26).
const findSkylineSpot = (
  item: CargoItem,
  segments: SkylineSegment[],
  bounds: RectLike,
  scale: AxisScale,
  allowRotation: boolean
): { x: number; y: number; rotation: Rotation } | null => {
  let best: { x: number; y: number; rotation: Rotation } | null = null;
  const orientations: Rotation[] = allowRotation ? ORIENTATIONS : [0];
  for (const rotation of orientations) {
    const size = getVisualSize(item, rotation, scale);
    for (let start = 0; start < segments.length; start++) {
      let spanWidth = 0;
      let top = bounds.y;
      for (let index = start; index < segments.length && spanWidth < size.length; index++) {
        spanWidth += segments[index].width;
        top = Math.max(top, segments[index].y);
      }
      if (spanWidth < size.length) continue;
      if (top + size.width > bounds.y + bounds.width + EPSILON) continue;
      const x = segments[start].x;
      if (!best || top < best.y || (top === best.y && x < best.x)) {
        best = { x, y: top, rotation };
      }
    }
  }
  return best;
};

// Raises the frontier across the placed span to the rect's bottom edge; free
// pockets under uneven spans are sacrificed (standard skyline approximation).
const updateSkyline = (segments: SkylineSegment[], rect: RectLike): SkylineSegment[] => {
  const next: SkylineSegment[] = [];
  for (const segment of segments) {
    const segmentEnd = segment.x + segment.width;
    if (segmentEnd <= rect.x + EPSILON || segment.x >= rect.x + rect.length - EPSILON) {
      next.push(segment);
      continue;
    }
    const leftWidth = rect.x - segment.x;
    if (leftWidth > EPSILON) {
      next.push({ x: segment.x, y: segment.y, width: leftWidth });
    }
    const coveredStart = Math.max(segment.x, rect.x);
    const coveredEnd = Math.min(segmentEnd, rect.x + rect.length);
    if (coveredEnd - coveredStart > EPSILON) {
      next.push({ x: coveredStart, y: rect.y + rect.width, width: coveredEnd - coveredStart });
    }
    const rightWidth = segmentEnd - (rect.x + rect.length);
    if (rightWidth > EPSILON) {
      next.push({ x: rect.x + rect.length, y: segment.y, width: rightWidth });
    }
  }
  const merged: SkylineSegment[] = [];
  for (const segment of next.sort((a, b) => a.x - b.x)) {
    const previous = merged[merged.length - 1];
    if (
      previous &&
      Math.abs(previous.y - segment.y) <= EPSILON &&
      Math.abs(previous.x + previous.width - segment.x) <= EPSILON
    ) {
      previous.width += segment.width;
    } else {
      merged.push({ ...segment });
    }
  }
  return merged;
};

// Deterministic dense fallback for loads beyond the exact solver's unit limit:
// bottom-left skyline frontier with optional 90° rotation, flush edge-to-edge.
const packSkylineIntoBounds = (
  items: CargoItem[],
  bounds: RectLike,
  scale: AxisScale,
  allowRotation: boolean
): PackingResult => {
  const sorted = [...items].sort(byAreaDescending);
  let segments: SkylineSegment[] = [{ x: bounds.x, y: bounds.y, width: bounds.length }];
  const occupied: RectLike[] = [];
  const placements = new Map<CargoItem, Placement>();

  for (const item of sorted) {
    const spot = findSkylineSpot(item, segments, bounds, scale, allowRotation);
    if (!spot) {
      continue;
    }
    const size = getVisualSize(item, spot.rotation, scale);
    const rect: RectLike = { x: spot.x, y: spot.y, length: size.length, width: size.width };
    if (!isInsideBounds(rect, bounds, scale) || findCollisions(rect, occupied, scale).length > 0) {
      // The frontier math above already guarantees free space; skip rather than
      // corrupt the layout if floating-point drift ever disagrees.
      continue;
    }
    occupied.push(rect);
    segments = updateSkyline(segments, rect);
    placements.set(item, { x: rect.x, y: rect.y, rotation: spot.rotation });
  }

  return {
    placed: items.filter((item) => placements.has(item)).map((item) => ({ ...item, ...placements.get(item)! })),
    unplaced: items.filter((item) => !placements.has(item)),
  };
};

// Repacks all given cargo items into bounds. Small/medium loads are solved
// exactly (maximize placed units, then minimize used length, width, and 90°
// turns) under a wall-clock budget; larger loads use the skyline heuristic.
// Items sit flush edge-to-edge (no gaps); anything that does not fit anywhere
// is returned in `unplaced`. Input item order is preserved inside each group.
export const packCargoIntoBounds = (
  items: CargoItem[],
  bounds: RectLike,
  scale: AxisScale = DEFAULT_AXIS_SCALE,
  options: PackingOptions = {}
): PackingResult => {
  const allowRotation = options.allowRotation ?? true;
  if (items.length <= (options.exactLimit ?? DEFAULT_EXACT_UNIT_LIMIT)) {
    return optimizePacking(items, bounds, scale, { allowRotation, timeLimitMs: options.timeLimitMs });
  }
  return packSkylineIntoBounds(items, bounds, scale, allowRotation);
};

// Expands raw available-cargo entries by their quantity into per-instance canvas
// items (ids "cargo-<orderGuid>-<i>"). Canvas instances are already one unit per
// item and must never be re-expanded; re-expanding would double the cargo on a
// second Auto Load run and nest the instance suffix ("cargo-G-0-0"), which no
// longer resolves back to the base order GUID via fromCargoId.
export const expandCargoByQuantity = (cargo: CargoItem[]): CargoItem[] => {
  const expanded: CargoItem[] = [];
  for (const item of cargo) {
    const quantity = item.quantity ?? 1;
    for (let i = 0; i < quantity; i++) {
      expanded.push({
        ...item,
        id: `${item.id}-${i}`,
      });
    }
  }
  return expanded;
};

// Auto Load input assembly: canvas items are units that pass through unchanged;
// only the still-listed raw entries carry multiplicity and must be expanded first.
// placedInstances maps base transport order ID -> the set of instance indices
// already on canvas, so partially placed orders only expand the unplaced indices
// (avoiding duplicate ids while preserving each unit's number).
export const autoLoadCargoUnits = (
  onCanvas: CargoItem[],
  stillInList: CargoItem[],
  placedInstances: Map<string, Set<number>> = new Map()
): CargoItem[] => {
  const expanded: CargoItem[] = [...onCanvas];
  for (const item of stillInList) {
    const quantity = item.quantity ?? 1;
    const baseId = fromCargoId(item.id);
    const placedSet = placedInstances.get(baseId) ?? new Set<number>();
    for (let i = 0; i < quantity; i++) {
      if (placedSet.has(i)) {
        continue;
      }
      expanded.push({
        ...item,
        id: `${item.id}-${i}`,
      });
    }
  }
  return expanded;
};
