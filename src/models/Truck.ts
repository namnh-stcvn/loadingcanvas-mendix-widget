// business data from Mendix, unit in meters, kg

export interface Trailer {
  id: string;
  code: string;
  internalLengthMeter: number;
  internalWidthMeter: number;
  internalHeightMeter: number;
  maxPayloadKg: number;
  axleCount: number;
  trailerType: "DryVan" | "Reefer" | "Flatbed" | "Container" | "Curtainsider";
  maxLoadMeters?: number; // Maximum load meters along trailer length
}
