# Business Rules — LoadingCanvas Widget

This document describes the **business rules** of the LoadingCanvas widget: the behavioral contract that governs truck loading and packing planning. It states _what_ the system enforces, not _how_ it is implemented. Technical design lives in `ARCHITECTURE.md`; the persistence entity design lives in `docs/PACKING_PLAN_ENTITY.md`.

All measurements use metric units: meters for length/width/height, kilograms for weight.

---

## 1. Purpose & Scope

LoadingCanvas is an interactive, two-dimensional top-view planner for loading cargo onto a truck. A planner selects a truck, receives the cargo belonging to the selected transport orders, arranges the cargo inside the truck, and saves the resulting arrangement as a single packing plan.

These rules cover: trucks, cargo, placement, capacity, positioning, collision handling, automatic packing, user interaction, plan persistence, verification, and status display.

---

## 2. Glossary

| Term                       | Meaning                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Truck (TruckSelection)** | The vehicle being loaded; defines the usable interior space and limits.                                  |
| **Transport Order**        | A shipping order that supplies cargo to the planner.                                                     |
| **Packing Unit**           | The physical unit (pallet or box) belonging to a transport order; defines footprint, height, and weight. |
| **Cargo Item**             | A packing unit as represented on the planning canvas.                                                    |
| **Packing Plan**           | The single saved arrangement of cargo for one truck selection.                                           |
| **Plan Item**              | One stored cargo placement inside a packing plan.                                                        |
| **Load Meter (LM)**        | Linear meters of truck length occupied by cargo.                                                         |
| **Canvas**                 | The interactive 2-D top-view surface on which cargo is arranged.                                         |

---

## 3. Truck Rules

- **BR-01** — Exactly one truck is planned at a time; it is identified by its truck selection.
- **BR-02** — The usable loading space is the truck's interior: internal length × internal width × internal height.
- **BR-03** — When truck data is missing or incomplete, default values apply: 13.6 m length, 2.45 m width, 2.7 m height, 24,000 kg maximum payload, 2 axles.
- **BR-04** — The maximum load meters defaults to the truck's internal length when not explicitly configured.
- **BR-05** — A truck is classified as one of: DryVan (default), Reefer, Flatbed, Container, or Curtainsider.

---

## 4. Cargo & Transport Order Rules

- **BR-06** — Every cargo item originates from exactly one transport order, and each transport order contributes exactly one packing unit.
- **BR-07** — Cargo comes in two types: **pallet** or **box**.
- **BR-08** — Cargo is color-coded on screen: orange = pallet, blue = box.
- **BR-09** — When cargo dimensions are missing or invalid, defaults apply: 1.2 m length × 0.8 m width footprint, 1.6 m height, 500 kg weight.
- **BR-10** — The available-cargo list shows only cargo that is **not** currently placed on the canvas. Placing cargo removes it from the list; removing it from the canvas returns it to the list.
- **BR-10a** — A transport order's cargo can be removed from the canvas by the user; all cargo items belonging to that transport order are removed simultaneously and returned to the available-cargo list.

---

## 5. Placement Rules

- **BR-11** — A cargo item must lie **entirely inside** the truck's interior boundary. Items partially outside the truck are invalid.
- **BR-12** — Cargo items must **never overlap** one another. Touching edges are allowed.
- **BR-13** — Items may only be rotated in **90° steps**: 0°, 90°, 180°, or 270° (clockwise).
- **BR-14** — Rotating an item keeps it centered on its current position; after rotation the item is kept at a valid position.
- **BR-15** — A locked item cannot be rotated (and cannot be moved).
- **BR-16** — Real-world proportions are preserved on screen: a rotated rectangular item remains a rectangle of the correct shape.

---

## 6. Capacity Rules

- **BR-17** — The total load meters occupied by cargo along the truck's length must not exceed the truck's maximum load meters. Exceeding it is reported as a violation (`LM_EXCEEDED`).
- **BR-18** — Each cargo item's weight is carried with the plan data. The truck's maximum payload limit is recorded but is **not currently enforced** by the planner (known gap; only load meters are validated).

---

## 7. Positioning & Alignment Rules

- **BR-19** — Positions align to a fixed square grid so placements are tidy and repeatable. Grid alignment is disabled when no grid is configured.
- **BR-20** — While moving an item, snapping is applied in priority order:
  1. Flush against the **truck walls** (boundary),
  2. **Touching an edge** of a neighboring item,
  3. **Edge-aligned** with a neighboring item,
  4. Otherwise the **plain grid**, as fallback.

  Snapping only engages within a small activation distance of the target.

---

## 8. Collision Handling Rules

- **BR-21** — When a moved item would land on an occupied or out-of-bounds spot, the system resolves it in this order:
  1. Use the requested position if it is free and inside the truck;
  2. Otherwise move it to the **nearest valid free position**;
  3. Otherwise slide only **along the length axis**;
  4. Otherwise slide only **along the width axis**;
  5. Otherwise **return the item to where the drag started**.
- **BR-22** — After any move or rotation, an item is either at a valid non-overlapping position inside the truck, or back at its previous valid position. An item is never left overlapping or outside.

---

## 9. Auto Load (Automatic Packing) Rules

- **BR-23** — Auto Load repacks **all** cargo into the truck: both cargo already on the canvas and cargo still in the available-cargo list.
- **BR-24** — Bigger footprints are packed **first** (largest area first), so small items fill leftover gaps instead of blocking large ones.
- **BR-25** — Placement fills from the **top-left corner** in shelf-like rows, and items sit **flush edge-to-edge** with no gaps and no overlaps.
- **BR-26** — During automatic packing, items may be turned by up to 90° to fit; when both orientations fit equally well, the upright (0°) orientation is preferred.
- **BR-27** — Cargo that does not fit anywhere **remains in the available-cargo list**, and the user is told how many items did not fit.

---

## 10. Interaction & Selection Rules

- **BR-28** — Pressing an item starts interacting with it and makes it the active selection; pressing empty canvas space clears the selection.
- **BR-29** — Several items can be selected and dragged **together** as a group. Starting a drag on an item that is not part of the current selection restricts the drag to that single item.
- **BR-30** — Cargo enters the canvas at the **drop point** when dragged from the list, or at a default position when added by clicking it in the list.
- **BR-31** — Until the initial data (truck, cargo, saved plan) has finished loading, the planner shows a loading state instead of an editable canvas.

---

## 11. Packing Plan Persistence Rules

- **BR-32** — There is **exactly one** saved packing plan per truck selection. Plans are not versioned.
- **BR-33** — Saving **replaces** the previously saved arrangement completely: all stored item placements of the plan are replaced with the current canvas arrangement.
- **BR-34** — A plan stores, for every cargo item: which **transport order** it belongs to, its **position**, its **footprint** (length × width), its **rotation**, and its **color/type**.
- **BR-35** — Stored positions and dimensions are in **meters, measured from the truck's interior origin** (top-left corner of the truck interior), independent of screen zoom or scale.
- **BR-36** — Planning is two-dimensional: item height is always stored as **zero** (no Z axis).
- **BR-37** — The saved plan is **loaded automatically when the page opens**; the canvas starts from the saved arrangement. If no plan exists, the canvas starts empty.
- **BR-38** — "Load Plan" **never discards unsaved work**: if no saved plan exists, the current canvas content is kept unchanged.
- **BR-39** — An optional follow-up action (configured microflow) runs **after** the plan has been successfully saved; it does not run when saving failed.
- **Remark** — Persisting plans requires running inside the Mendix application runtime. Outside of it (local development/testing), saving produces no persistent effect.

---

## 12. Verification Rules

- **BR-40** — The loading exercise counts as **complete** only when the cargo of **every** provided transport order has been placed on the truck — i.e., the available-cargo list has been emptied onto the canvas.
- **BR-41** — Any change to the number of items on the canvas **invalidates** a previous verification result.

---

## 13. Status Display Rules

- **BR-42** — Card borders communicate state:

  | State                                       | Border              |
  | ------------------------------------------- | ------------------- |
  | Normal                                      | gray                |
  | Selected                                    | blue                |
  | Being dragged (active)                      | red                 |
  | Invalid placement (overlap / out of bounds) | red error highlight |

- **BR-43** — After Auto Load, the planner reports how many items did not fit, if any.
- **BR-44** — A grid overlay is drawn on the canvas as visual guidance matching the snap grid.
