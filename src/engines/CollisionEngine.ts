import type { Point, RectLike, Rotation } from "../types/geometry";
import { findCollisions, isInsideBounds } from "../domain/geometryRules";
import { getRotatedSize } from "../domain/rotationRules";

export interface ValidPosition {
  position: Point;
  type: "snap_left" | "snap_right" | "snap_top" | "snap_bottom" | "grid";
  distance: number;
}

export class CollisionEngine {
  detectCollisions<T extends RectLike>(item: T, others: T[]): T[] {
    return findCollisions(item, others);
  }

  findValidPositions<T extends RectLike & { rotation?: Rotation }>(
    item: T,
    others: T[],
    bounds: RectLike,
    snapDistance: number = 0
  ): ValidPosition[] {
    const itemVis = getRotatedSize({ length: item.length, width: item.width }, item.rotation ?? 0);
    const itemLen = itemVis.length;
    const itemW = itemVis.width;

    const xCandidates = new Set<number>();
    xCandidates.add(item.x);
    if (bounds) {
      xCandidates.add(bounds.x);
      xCandidates.add(bounds.x + bounds.length - itemLen);
    }

    const yCandidates = new Set<number>();
    yCandidates.add(item.y);
    if (bounds) {
      yCandidates.add(bounds.y);
      yCandidates.add(bounds.y + bounds.width - itemW);
    }

    for (const other of others) {
      const otherVis = getRotatedSize({ length: other.length, width: other.width }, other.rotation ?? 0);
      const otherLen = otherVis.length;
      const otherW = otherVis.width;

      // X-axis candidates for item
      xCandidates.add(other.x + otherLen + snapDistance);
      xCandidates.add(other.x - itemLen - snapDistance);
      xCandidates.add(other.x);
      xCandidates.add(other.x + otherLen - itemLen);

      // Y-axis candidates for item
      yCandidates.add(other.y + otherW + snapDistance);
      yCandidates.add(other.y - itemW - snapDistance);
      yCandidates.add(other.y);
      yCandidates.add(other.y + otherW - itemW);
    }

    const validPositions: ValidPosition[] = [];
    const visited = new Set<string>();

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
            distance: Math.hypot(x - item.x, y - item.y),
          });
        }
      }
    }

    return validPositions.sort((a, b) => a.distance - b.distance);
  }

  resolveNonOverlappingPosition<T extends RectLike & { rotation?: Rotation }>(
    item: T,
    desiredPos: Point,
    startPos: Point,
    others: T[],
    bounds: RectLike
  ): Point {
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

  private isValidPosition<T extends RectLike>(item: T, position: Point, others: T[], bounds: RectLike): boolean {
    const movedItem = { ...item, x: position.x, y: position.y };

    if (!isInsideBounds(movedItem, bounds)) {
      return false;
    }

    return this.detectCollisions(movedItem, others).length === 0;
  }
}
