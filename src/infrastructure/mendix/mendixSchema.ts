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

// Runtime association names verified against the Mendix database (join tables):
// tcstransportmodule$transportorder_packingunit -> TCSTransportModule.TransportOrder_PackingUnit
// tcstransportmodule$transportorder_product     -> TCSTransportModule.TransportOrder_Product
// datamodelmodule$packingunit_packingtype       -> DataModelModule.PackingUnit_PackingType
// MxObject get()/set() require the OwningModule.AssociationName form; the DB is the
// source of truth for these names (see docs/PACKING_PLAN_ENTITY.md). Only the
// prefix-less dev-fixture forms are kept as bounded fallbacks.
export const TRANSPORT_ORDER_PACKING_UNIT_ASSOCIATIONS: readonly string[] = [
  "TCSTransportModule.TransportOrder_PackingUnit",
  "TransportOrder_PackingUnit",
];
export const TRANSPORT_ORDER_PRODUCT_ASSOCIATIONS: readonly string[] = [
  "TCSTransportModule.TransportOrder_Product",
  "TCSTransportModule.TransportOrder_DataModelModule.Product",
  "TransportOrder_Product",
];
// Runtime names verified against DB join tables (see docs/PACKING_PLAN_ENTITY.md):
// tcstransportmodule$transportorder_producer,
// tcstransportmodule$transportorder_company_from,
// tcstransportmodule$transportorder_company_to -> all point at DataModelModule.Company.
export const TRANSPORT_ORDER_PRODUCER_ASSOCIATIONS: readonly string[] = [
  "TCSTransportModule.TransportOrder_Producer",
  "TransportOrder_Producer",
];
export const TRANSPORT_ORDER_COMPANY_FROM_ASSOCIATIONS: readonly string[] = [
  "TCSTransportModule.TransportOrder_Company_From",
  "TransportOrder_Company_From",
];
export const TRANSPORT_ORDER_COMPANY_TO_ASSOCIATIONS: readonly string[] = [
  "TCSTransportModule.TransportOrder_Company_To",
  "TransportOrder_Company_To",
];
export const PACKING_UNIT_PACKING_TYPE_ASSOCIATIONS: readonly string[] = [
  "DataModelModule.PackingUnit_PackingType",
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
