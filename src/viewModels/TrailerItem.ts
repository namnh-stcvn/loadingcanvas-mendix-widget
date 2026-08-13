import type { GeometryItem } from "../types/geometry";
import type { Trailer } from "../models/Trailer";

export interface TrailerItem extends GeometryItem {
    id: Trailer["id"];
    code: Trailer["code"];
    trailerType: Trailer["trailerType"];
    maxPayloadKg: Trailer["maxPayloadKg"];
    axleCount: Trailer["axleCount"];
    /** Maximum load meters allowed (length along trailer) */
    maxLoadMeters?: number;
    /** Internal height in meters (for height validation) */
    internalHeightMeter?: number;
}
