import type { GeometryItem } from "../types/geometry";
export type CargoType = "pallet" | "box";

export interface CargoItem extends GeometryItem {
  id: string;
  name: string;
  type: CargoType;
  color: string;
  isLocked: boolean;
  heightM?: number; // Height in meters for height validation
  weightKg?: number; // Weight in kg for payload validation
}
