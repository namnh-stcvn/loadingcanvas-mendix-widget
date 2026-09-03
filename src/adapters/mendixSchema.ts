// Mendix Domain Model schema names. All entity/association/XPath literals for
// this widget live here; logic modules must import from this file only.

export const PACKING_PLAN_ENTITY = "TCSLoadingMeter.PackingPlan";
export const PACKING_PLAN_ITEM_ENTITY = "TCSLoadingMeter.PackingPlanItem";
export const PACKING_PLAN_XPATH = "//TCSLoadingMeter.PackingPlan";
export const PACKING_PLAN_ITEM_XPATH = "//TCSLoadingMeter.PackingPlanItem";

export const PACKING_PLAN_TRUCK_SELECTION_ASSOCIATION = "TCSLoadingMeter.PackingPlan_TruckSelection";
export const PACKING_PLAN_TRUCK_SELECTION_ASSOCIATION_FALLBACK = "PackingPlan_TruckSelection";
export const PACKING_PLAN_ITEM_TRANSPORT_ORDER_ASSOCIATION = "TCSLoadingMeter.PackingPlanItem_TransportOrder";
export const PACKING_PLAN_ITEM_TRANSPORT_ORDER_ASSOCIATION_FALLBACK = "PackingPlanItem_TransportOrder";

export const PACKING_PLAN_TRUCK_ASSOCIATIONS: readonly string[] = [
  PACKING_PLAN_TRUCK_SELECTION_ASSOCIATION,
  PACKING_PLAN_TRUCK_SELECTION_ASSOCIATION_FALLBACK,
];
export const PACKING_PLAN_ITEM_ASSOCIATIONS: readonly string[] = [
  "TCSLoadingMeter.PackingPlanItem_PackingPlan",
  "PackingPlanItem_PackingPlan",
];
export const PACKING_PLAN_ITEM_PACKING_PLAN_ASSOCIATION = PACKING_PLAN_ITEM_ASSOCIATIONS[0];

export const TRANSPORT_ORDER_PACKING_UNIT_ASSOCIATIONS: readonly string[] = [
  "TCSTransportModule.TransportOrder_PackingUnit",
  "TransportOrder_PackingUnit",
];
export const PACKING_UNIT_PACKING_TYPE_ASSOCIATIONS: readonly string[] = [
  "DataModelModule.PackingUnit_DataModelModule.PackingType",
  "PackingUnit_PackingType",
];

export const PACKING_TYPE_ENUM_ATTRIBUTE = "E_PackingType";

// PackingPlanItem attribute names (docs/PACKING_PLAN_ENTITY.md).
export const PACKING_PLAN_ITEM_ATTRIBUTES = {
  positionX: "PositionX",
  positionY: "PositionY",
  length: "Length",
  width: "Width",
  height: "Height",
  rotation: "Rotation",
  color: "Color",
  lengthMeters: "LengthMeters",
  widthMeters: "WidthMeters",
  weightKg: "WeightKg",
} as const;
