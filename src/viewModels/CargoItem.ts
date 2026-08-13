import type { GeometryItem } from "../types/geometry";
export type CargoType = "pallet" | "box";

export interface CargoItem extends GeometryItem {
    id: string;
    name: string;
    type: CargoType;
    color: string;
    isLocked: boolean;
    /** Height in meters (for height validation) */
    heightM?: number;
    /** Weight in kg (for payload validation) */
    weightKg?: number;
}
