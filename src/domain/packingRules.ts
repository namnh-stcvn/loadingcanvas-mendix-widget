import type { CargoItem } from "../viewModels/CargoItem";
import type { Point, RectLike, Rotation } from "../types/geometry";
import { findCollisions, isInsideBounds } from "./geometryRules";
import { DEFAULT_AXIS_SCALE, getRotatedScreenSize, type AxisScale } from "./rotationRules";

export interface PackingOptions {
  allowRotation?: boolean;
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

// First-Fit Decreasing: bigger footprints are placed first so small items
// fill the remaining gaps instead of blocking large ones.
const byAreaDescending = (a: CargoItem, b: CargoItem): number => b.length * b.width - a.length * a.width;

// Corner candidates: bounds origin plus right/bottom/top edges of every placed
// rect, kept as EXACT values so items sit flush edge-to-edge (no gaps, no
// overlaps). Sorted by (y, x) this yields a stable shelf-like fill from top-left.
const collectCandidates = (occupied: RectLike[], bounds: RectLike): Point[] => {
  const xs = new Set<number>([bounds.x]);
  const ys = new Set<number>([bounds.y]);
  for (const rect of occupied) {
    xs.add(rect.x + rect.length);
    ys.add(rect.y + rect.width);
    ys.add(rect.y);
  }

  const points: Point[] = [];
  for (const y of ys) {
    for (const x of xs) {
      points.push({ x, y });
    }
  }
  return points.sort((a, b) => a.y - b.y || a.x - b.x);
};

const clampIntoBounds = (pos: Point, size: Size2D, bounds: RectLike): Point => ({
  x: Math.min(Math.max(pos.x, bounds.x), Math.max(bounds.x, bounds.x + bounds.length - size.length)),
  y: Math.min(Math.max(pos.y, bounds.y), Math.max(bounds.y, bounds.y + bounds.width - size.width)),
});

const isFreeSpot = (rect: RectLike, occupied: RectLike[], bounds: RectLike, scale: AxisScale): boolean => {
  return isInsideBounds(rect, bounds, scale) && findCollisions(rect, occupied, scale).length === 0;
};

// Returns the best (smallest y, then x) placement across the allowed
// orientations; strict comparison keeps 0° winning ties over 90°.
const findFirstFit = (
  item: CargoItem,
  occupied: RectLike[],
  bounds: RectLike,
  scale: AxisScale,
  allowRotation: boolean
): Placement | null => {
  const orientations: Rotation[] = allowRotation ? ORIENTATIONS : [0];
  const candidates = collectCandidates(occupied, bounds);
  let best: Placement | null = null;

  for (const rotation of orientations) {
    const size = getVisualSize(item, rotation, scale);

    for (const candidate of candidates) {
      const pos = clampIntoBounds(candidate, size, bounds);
      if (!isFreeSpot({ ...pos, ...size }, occupied, bounds, scale)) {
        continue;
      }
      if (!best || pos.y < best.y || (pos.y === best.y && pos.x < best.x)) {
        best = { x: pos.x, y: pos.y, rotation };
      }
      break;
    }
  }

  return best;
};

// Repacks all given cargo items into bounds using First-Fit Decreasing with
// optional 90° rotation. Items sit flush edge-to-edge (no gaps); anything
// that does not fit anywhere is returned in `unplaced`. Input item order is
// preserved inside each group.
export const packCargoIntoBounds = (
  items: CargoItem[],
  bounds: RectLike,
  scale: AxisScale = DEFAULT_AXIS_SCALE,
  options: PackingOptions = {}
): PackingResult => {
  const allowRotation = options.allowRotation ?? true;

  const sorted = [...items].sort(byAreaDescending);
  const occupied: RectLike[] = [];
  const placements = new Map<CargoItem, Placement>();

  for (const item of sorted) {
    const placement = findFirstFit(item, occupied, bounds, scale, allowRotation);
    if (!placement) {
      continue;
    }
    const size = getVisualSize(item, placement.rotation, scale);
    // Visual extents only — storing `rotation` here would make geometryRules
    // apply the rotation a second time and corrupt every later overlap check.
    occupied.push({ x: placement.x, y: placement.y, length: size.length, width: size.width });
    placements.set(item, placement);
  }

  return {
    placed: items.filter((item) => placements.has(item)).map((item) => ({ ...item, ...placements.get(item)! })),
    unplaced: items.filter((item) => !placements.has(item)),
  };
};
