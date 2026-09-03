import type { GeometryItem } from "../types/geometry";
import type { Truck } from "../models/Truck";

export interface TruckItem extends GeometryItem {
  id: Truck["id"];
  code: Truck["code"];
  truckType: Truck["truckType"];
  maxPayloadKg: Truck["maxPayloadKg"];
  axleCount: Truck["axleCount"];
  maxLoadMeters?: number; // Maximum load meters along truck length
}
