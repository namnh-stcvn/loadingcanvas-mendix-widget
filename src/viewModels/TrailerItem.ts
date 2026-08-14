import type { GeometryItem } from "../types/geometry";
import type { Trailer } from "../models/Trailer";

export interface TrailerItem extends GeometryItem {
  id: Trailer["id"];
  code: Trailer["code"];
  trailerType: Trailer["trailerType"];
  maxPayloadKg: Trailer["maxPayloadKg"];
  axleCount: Trailer["axleCount"];
  maxLoadMeters?: number; // Maximum load meters along trailer length
  internalHeightMeter?: number; // Internal height in meters for height validation
}
