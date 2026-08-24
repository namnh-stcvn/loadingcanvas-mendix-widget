# PackingPlan Entity Design — TCSLoadingMeter Module

## Overview

This document describes the new `PackingPlan` and `PackingPlanItem` entities to be
created in the **TCSLoadingMeter** module in Mendix Studio Pro. These entities
store the saved packing arrangement for each truck (TruckSelection).

## Design Constraints

- **Only 1 packing plan per truck** (no versioning)
- **Save = delete + recreate items** (simplest approach)
- **Load on page open** — when the widget loads, it reads the saved plan
- **Do NOT modify existing Mendix model structure** — only add new entities

## Entity: PackingPlan

| Attribute        | Type                                          | Required | Description                                   |
| ---------------- | --------------------------------------------- | -------- | --------------------------------------------- |
| `TruckSelection` | Reference (TCSTransportModule.TruckSelection) | Yes      | Links to the truck this plan belongs to (1-1) |
| `CreatedDate`    | DateTime                                      | Yes      | When the plan was created                     |
| `ModifiedDate`   | DateTime                                      | Yes      | When the plan was last modified               |

**Note:** Mendix automatically creates a hidden `id` attribute for every entity. This serves as the primary key and is used internally for object identification and relationships. No manual ID attribute is needed.

**Relationships:**

- `PackingPlan` → `PackingPlanItem` (1-to-many, cascade delete)

## Entity: PackingPlanItem

| Attribute        | Type                                          | Required | Description                                       |
| ---------------- | --------------------------------------------- | -------- | ------------------------------------------------- |
| `PackingPlan`    | Reference (TCSLoadingMeter.PackingPlan)       | Yes      | Parent plan (many-to-1)                           |
| `TransportOrder` | Reference (TCSTransportModule.TransportOrder) | Yes      | Which transport order this item represents        |
| `PositionX`      | Decimal                                       | Yes      | X position in meters (relative to trailer origin) |
| `PositionY`      | Decimal                                       | Yes      | Y position in meters (relative to trailer origin) |
| `Width`          | Decimal                                       | Yes      | Item width in meters                              |
| `Height`         | Decimal                                       | Yes      | Item height in meters                             |
| `Rotation`       | Integer                                       | Yes      | Rotation: 0, 90, 180, or 270                      |
| `Color`          | String                                        | No       | Display color (e.g., "orange", "blue")            |
| `HeightMeters`   | Decimal                                       | No       | Item height in meters (for height validation)     |
| `WeightKg`       | Decimal                                       | No       | Item weight in kg (for payload validation)        |

**Note:** Mendix automatically creates a hidden `id` attribute for every entity. This serves as the primary key and is used internally for object identification and relationships. No manual ID attribute is needed.

## Data Model Diagram

```
TCSLoadingMeter Module (NEW entities):

  PackingPlan
  ├─ id (auto-generated PK, hidden)
  ├─ TruckSelection → TCSTransportModule.TruckSelection (1-1)
  ├─ CreatedDate
  ├─ ModifiedDate
  └─ PackingPlanItem (1-*)

  PackingPlanItem
  ├─ id (auto-generated PK, hidden)
  ├─ PackingPlan → TCSLoadingMeter.PackingPlan (*-1)
  ├─ TransportOrder → TCSTransportModule.TransportOrder (*-1)
  ├─ PositionX (Decimal, meters)
  ├─ PositionY (Decimal, meters)
  ├─ Width (Decimal, meters)
  ├─ Height (Decimal, meters)
  ├─ Rotation (Integer: 0/90/180/270)
  ├─ Color (String)
  ├─ HeightMeters (Decimal, optional)
  └─ WeightKg (Decimal, optional)
```

## Integration with Existing Data Model

The new entities integrate with the existing model via references:

```
TCSLoadingMeter.TruckSelection_TCSTransportModule.Session (1-*)
TruckSelection_ResourceInstance (1-*)
TCSTransportModule.ResourceInstance_Resource (1-*)
DataModelModule.Resource_TechnicalDetails (1-1)
TCSTransportModule.TransportOrderSequence_TruckSelection (*-1)
TransportOrderSequence_TransportOrder (1-*)
TCSTransportModule.TransportOrder_PackingUnit (1-*)
DataModelModule.PackingUnit_DataModelModule.PackingType (1-*)

List off entity with attributes:

TrucSelection:
- TruckIndex (interger)

ResourceInstance:
- Name (String)
- LicensePlate (String)
...

Resource:
- Name (String)
...

TechnicalDetails:
- NameResource (String)
- HangerLength (Decimal, meters)
- HangerWidth (Decimal, meters)
...

TransportOrder:
- TransportOrderNo (String)
- Quantity (interger)
...

PackingUnit:
- Name (String)
- Length (Decimal, meters)
- Width (Decimal, meters)
...

PackingType:
- E_PackingType (Enum, "Pallet", Box)

NEW:
TCSLoadingMeter.PackingPlan (1 per TruckSelection)
  └─ PackingPlanItem (1-* per plan)
      └─ TransportOrder (reference to existing entity)
```

## Save Flow (Delete + Recreate)

1. User clicks "Save Plan" on the widget
2. Widget calls `onSavePlan` callback → container's `handleSavePlan`
3. Container calls `savePackingPlan()` in `mendixDataAdapter.ts`
4. `savePackingPlan`:
   a. Serializes current canvas state to `PackingPlanData` (meters)
   b. Queries for existing `PackingPlan` for this `TruckSelection`
   c. If plan exists:
   - Delete all existing `PackingPlanItem` records
     d. If no plan exists:
   - Create a new `PackingPlan` record
     e. Create new `PackingPlanItem` records for each canvas item
     f. Commit all changes
5. Container calls `onSavePlan` microflow callback (if configured)

## Load Flow (On Page Open)

1. Widget initializes → container's `useEffect` runs
2. Container calls `loadPackingPlan()` in `mendixDataAdapter.ts`
3. `loadPackingPlan`:
   a. Queries for `PackingPlan` where `TruckSelection = {truckGuid}`
   b. If found, queries for all `PackingPlanItem` records
   c. Converts items to `PackingPlanData` (meters)
   d. Deserializes to `CargoItem[]` (pixels) using `deserializePlan()`
4. Container passes restored items to widget as `initialCanvasItems`
5. Widget renders canvas with restored items

## Mendix Microflow Integration

The widget's `onSavePlan` and `onLoadPlan` properties can be configured in
Mendix Studio Pro to trigger microflows. The container calls these callbacks
after the save/load operations complete.

### Microflow: SavePackingPlan

- **Input**: TruckSelection (object), CanvasItems (list)
- **Steps**:
  1. Find existing PackingPlan for TruckSelection
  2. If exists, delete all PackingPlanItem children
  3. If not exists, create new PackingPlan
  4. For each canvas item, create a PackingPlanItem
  5. Commit

### Microflow: LoadPackingPlan

- **Input**: TruckSelection (object)
- **Steps**:
  1. Find PackingPlan for TruckSelection
  2. If found, retrieve all PackingPlanItem children
  3. Return as list

## XPath Queries

### Find PackingPlan for a Truck

```
//TCSLoadingMeter.PackingPlan[TCSLoadingMeter.PackingPlan_TruckSelection = '{truckGuid}']
```

_(or `//TCSLoadingMeter.PackingPlan[TCSLoadingMeter.TruckSelection = '{truckGuid}']` depending on association name in Domain Model)_

### Find PackingPlanItems for a Plan

```
//TCSLoadingMeter.PackingPlanItem[TCSLoadingMeter.PackingPlanItem_PackingPlan = '{planGuid}']
```

_(or `//TCSLoadingMeter.PackingPlanItem[TCSLoadingMeter.PackingPlan = '{planGuid}']` depending on association name in Domain Model)_

## Notes

- The `PositionX` and `PositionY` are relative to the trailer's internal origin
  (top-left corner of the trailer interior), not the canvas origin.
- The `Width` and `Height` are the item's dimensions in meters (before rotation).
- The `Rotation` is stored as an integer (0, 90, 180, 270) representing
  clockwise rotation in degrees.
- The `Color` is stored as a string for display purposes (e.g., "orange" for
  pallets, "blue" for boxes).
- `HeightMeters` and `WeightKg` are optional and used for validation
  (height check, payload check).
