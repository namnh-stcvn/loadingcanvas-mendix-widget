import type { TruckItem } from "../../core/types/viewModels/TruckItem";
import { loadMendixObject } from "../mendix/mendixLoaders";
import { extractTruckData } from "../mendix/mendixMappers";
import { computeScale, truckSelectionToTruckItem } from "./truckAdapter";

export interface LoadedTruckResult {
  truck: TruckItem | null;
  scale: { widthScale: number; heightScale: number };
  truckGuid: string | null;
}

export const loadTruckAndScale = async (truckRef: string | undefined): Promise<LoadedTruckResult> => {
  if (!truckRef) {
    return { truck: null, scale: { widthScale: 1, heightScale: 1 }, truckGuid: null };
  }

  try {
    const rawObj = await loadMendixObject(truckRef);
    const truckData = extractTruckData(rawObj, truckRef);
    if (!truckData) {
      return { truck: null, scale: { widthScale: 1, heightScale: 1 }, truckGuid: null };
    }
    const scale = computeScale(truckData);
    const truck = truckSelectionToTruckItem(truckData, scale);
    return { truck, scale, truckGuid: truckData.id };
  } catch (err) {
    console.error("Failed to load TruckSelection:", err);
    return { truck: null, scale: { widthScale: 1, heightScale: 1 }, truckGuid: null };
  }
};

export const loadTruckItem = async (
  truckRef: string | undefined,
  scale: { widthScale: number; heightScale: number }
): Promise<TruckItem | null> => {
  if (!truckRef) {
    return null;
  }

  try {
    const rawObj = await loadMendixObject(truckRef);
    const truckData = extractTruckData(rawObj, truckRef);
    if (!truckData) {
      return null;
    }
    return truckSelectionToTruckItem(truckData, scale);
  } catch (err) {
    console.error("Failed to load TruckSelection:", err);
    return null;
  }
};
