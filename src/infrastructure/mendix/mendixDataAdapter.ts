/**
 * Mendix Data Adapter — public facade.
 *
 * The implementation is split into focused modules:
 * - mendixRuntime.ts: mx.data detection, GUID/Decimal helpers
 * - mendixLoaders.ts: mx.data get/action wrappers
 * - mendixAssociations.ts: reference reads and association filtering
 * - mendixMappers.ts: MxObject/plain-object → data mapping
 * - truckLoader.ts: TruckSelection → TruckItem
 * - cargoLoader.ts: TransportOrders → CargoItem[]
 * - planRepository.ts: PackingPlan load/save
 * - mendixSchema.ts: Domain Model entity/association/attribute names
 */

export { isMendixRuntime, getMx, toBig, getObjectGuid, type MendixDecimal } from "./mendixRuntime";
export { loadMendixObject, loadMendixObjects, loadMendixList, executeMendixAction } from "./mendixLoaders";
export { getReferenceGuids, filterByAssociationGuid } from "./mendixAssociations";
export { toPlainObject, extractTruckData, extractTransportOrderData } from "./mendixMappers";
export { loadTruckAndScale, loadTruckItem, type LoadedTruckResult } from "../adapters/truckLoader";
export { loadCargoItems } from "../adapters/cargoLoader";
export { loadPackingPlan, savePackingPlan } from "../adapters/planRepository";
