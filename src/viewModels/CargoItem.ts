import type { GeometryItem } from "../types/geometry";
export type CargoType = "pallet" | "box";

export interface CargoItem extends GeometryItem {
  id: string;
  name: string;
  type: CargoType;
  color: string;
  isLocked: boolean;
  lengthM?: number; // Footprint length in meters
  widthM?: number; // Footprint width in meters
  weightKg?: number; // Weight in kg for payload validation
  quantity?: number;
  transportOrderNo?: string; // Transport Order Number
  productName?: string; // Product name from TransportOrder -> Product association
}
