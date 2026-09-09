# LoadingCanvas Widget Architecture

ARCHITECTURE.md

## Overview

This repository implements a modular **LoadingCanvas** widget for drag-and-drop truck loading planning. Built with React 18 and TypeScript on the Mendix pluggable-widget toolchain, the widget provides an interactive canvas where users can place, drag, rotate, and validate cargo items within a truck boundary.

The architecture follows a strict **layered separation of concerns**:

- **UI layer** — React components and hooks (`LoadingCanvas`, `LoadingCanvasContainer`, `CargoCard`, `CargoPopup`, `CargoTooltip`, `RotationHandle`, `GridOverlay`, `CargoList`, `useTruckCanvas`, `useCanvasState`, `useCanvasActions`, `useMouseEvents`)
- **State management layer** — `CanvasStateManager` (single source of truth) and `CanvasActionDispatcher` (action routing)
- **Engine layer** — `DragEngine`, `CollisionEngine`, `SnapEngine` (pure business logic; validation executes directly from the dispatcher via `domain/validationRules`)
- **Domain rule layer** — geometry, snap, validation, coordinate, rotation, drag, boundary, and packing helpers
- **Adapter layer** — `cargoAdapter`, `truckAdapter`, `stateAdapter`, `mendixDataAdapter` (Mendix data integration)
- **Data model layer** — business models (`Truck`), view models (`CargoItem`, `TruckItem`), and shared types (`Point`, `RectLike`, `Rotation`, etc.)
- **Constants layer** — canvas dimensions, grid, rotation, snap, card styling, and theme values

## Goals

- Decouple business logic from React so engines and rules are framework-agnostic and testable in isolation
- Enable real-time validation and collision avoidance during drag operations
- Support Mendix-friendly data transformations (metric units in meters/kg at the model layer, pixels at the view layer)
- Make the widget easy to extend (new engines, new validation rules, new snap modes) and easy to test (pure functions, no DOM dependencies in domain/engines)
- Integrate with Mendix 10 via the `mx.data` API for loading/saving packing plans

## Project Structure

```
src/
├── LoadingCanvas.tsx               # Main widget component: renders canvas, truck, cargo, info panel, grid
├── LoadingCanvas.editorConfig.ts  # Mendix editor configuration (property panes, preview)
├── LoadingCanvas.editorPreview.tsx # Mendix Studio Pro design-time preview
├── LoadingCanvas.xml               # Mendix widget XML manifest
├── package.xml                     # Widget package definition (id, name, version, author)
│
├── components/
│   ├── CargoCard.tsx               # Renders a single cargo item (position, size, border, hover tooltip, click popup, rotation handle)
│   ├── CargoList.tsx               # Debug palette: available cargo items, draggable/clickable onto the canvas
│   ├── CargoPopup.tsx             # Click popup beside a cargo card: Order/Product/Producer/From/To
│   ├── CargoTooltip.tsx            # Hover tooltip: TransportOrderNo + Product name for a cargo card
│   ├── GridOverlay.tsx             # Renders a visual grid on the canvas for grid-snap visualization
│   ├── RotationHandle.tsx          # Small grab-handle UI for rotating an item 90°
│   └── __tests__/                  # Component unit tests
│
├── constants/
│   ├── canvas.ts                   # Canvas dimensions, grid size, rotation step, snap threshold, info panel styles
│   ├── card.ts                     # Card border widths and colors (default, selected, active)
│   └── theme.ts                    # Canvas background color
│
├── domain/
│   ├── boundaryRules.ts            # clamp() — keeps values within a range; plus getCanvasBounds()/getTruckBounds()/getTruckBoundsFromItem() — single authority shared by both the dispatcher's OUT_OF_BOUNDS validation and DragEngine's collision clamping (kept identical by construction; getTruckBoundsFromItem() derives bounds from the rendered proportional truck frame and falls back to the reserved band)
│   ├── coordinateRules.ts          # meterToPixel(), pixelToMeter() (pure unit conversion only)
│   ├── dragRules.ts                # calculateDragPosition() — grid-snapped, clamped drag position
│   ├── geometryRules.ts            # getRectangle(), isIntersecting(), overlaps(), isInsideBounds(), findCollisions()
│   ├── packingOptimizer.ts     # optimizePacking() — exact anytime branch-and-bound auto-packing (max units, then min load meters)
│   ├── packingRules.ts             # packCargoIntoBounds() — routes small loads to the exact solver, large loads to the skyline heuristic
│   ├── rotationRules.ts            # rotate90(), isVerticalRotation(), getRotatedScreenSize()
│   ├── snapRules.ts                # snapToGrid(), snapPosition()
│   ├── validationRules.ts          # validateItem(), validateLoadMeters(), validateAll()
│   └── __tests__/                  # Domain rule unit tests
│
├── engines/
│   ├── DragEngine.ts               # Manages drag state, computes new positions with snap + collision resolution
│   ├── DragState.ts                # Engine-internal drag tracking (isDragging, activeId, startMouse, startPositions, startOffsets)
│   ├── CollisionEngine.ts          # Detects overlaps, finds valid non-overlapping positions
│   ├── SnapEngine.ts               # Calculates best snap target (boundary, edge, align, grid)
│   └── __tests__/                  # Engine unit tests
│
├── hooks/
│   ├── useTruckCanvas.ts           # Main hook: wires engines, state manager, dispatcher, and mouse events
│   ├── useCanvasState.ts           # Subscribes to CanvasStateManager, returns current CanvasState
│   ├── useCanvasActions.ts         # Wraps CanvasActionDispatcher with memoized action callbacks
│   ├── useMouseEvents.ts           # Attaches window mousemove/mouseup/blur listeners during drag
│   ├── coordinateRule.ts           # getCanvasPoint() — browser→canvas coordinate conversion; DOM-dependent, kept out of domain
│   └── __tests__/                  # Hook/util unit tests
│
├── models/
│   └── Truck.ts                    # Business model: truck dimensions (meters), payload, axle count, type
│
├── state/
│   ├── CanvasState.ts              # Interface: truck, cargos, selectedIds, activeItemId, validation, scale, offset
│   ├── CanvasStateManager.ts       # Single source of truth; immutable updates, subscribe/notify, undo/redo history
│   ├── CanvasActionDispatcher.ts   # Routes CanvasAction types to state mutations via engines
│   ├── CanvasStateListener.ts      # Type alias: (state: CanvasState) => void
│   └── __tests__/                  # State management unit tests
│
├── types/
│   ├── geometry.ts                 # Point, Size, Positionable, Sizeable, Rotatable, RectLike, GeometryItem, Rectangle, Rotation
│   └── mx.d.ts                     # Lightweight Mendix widget framework type declarations
│
├── typings/
│   └── stcvn/                      # Mendix widget typings (generated)
│
├── ui/
│   └── LoadingCanvas.css           # Widget styles (canvas, cards, info panel, grid)
│
├── viewModels/
│   ├── CargoItem.ts                # View model: extends GeometryItem with id, name, type, color, isLocked
│   └── TruckItem.ts                # View model: extends GeometryItem with truck business fields
│
├── adapters/
│   ├── cargoAdapter.ts             # Converts PackingUnit/TransportOrder data to CargoItem view models
│   ├── transportOrderMeta.ts       # Loads TransportOrderNo + Product/Company names tooltip/popup meta
│   ├── truckAdapter.ts             # Converts TruckSelection data to TruckItem view model, computes scale
│   ├── stateAdapter.ts             # Serializes/deserializes PackingPlanData for persistence
│   ├── mendixDataAdapter.ts        # Bridges to Mendix Data API (mx.data) for load/save
│   └── __tests__/                  # Adapter unit tests
│
└── widget/
    ├── index.ts                    # Public API barrel for the widget feature (container + prop types)
    ├── LoadingCanvas.container.tsx # Mendix bridge: loads data via mx.data, passes view models to widget
    ├── LoadingCanvasView.tsx       # Pure React canvas renderer used by the container
    └── LoadingCanvas.properties.ts # Property definitions and prop interfaces
```

## Core Components

### Widget Entry Point

- **`LoadingCanvasContainer`** (`src/widget/LoadingCanvas.container.tsx`) is the Mendix-facing component.
  - Receives `LoadingCanvasProps` from Mendix (object references as GUID strings, canvas dimensions, action callbacks)
  - Uses `mendixDataAdapter.ts` to load data via `mx.data` API (with JSON fallback for dev)
  - Converts Mendix objects to view models using adapters
  - Passes view models to `LoadingCanvas` via `LoadingCanvasViewModelProps`
  - Handles save plan (delete + recreate) and load plan via `mendixDataAdapter.ts`

- **`LoadingCanvas`** (`src/LoadingCanvas.tsx`) is the Mendix entry wrapper: maps typed widget props to `LoadingCanvasContainerProps` and renders `LoadingCanvasContainer`.
- **`LoadingCanvasView`** (`src/widget/LoadingCanvasView.tsx`) is the pure React renderer.
  - Receives `LoadingCanvasViewProps` (view models + loading state)
  - Manages canvas state via `useTruckCanvas` hook
  - Renders the canvas, truck boundary, cargo items, info panel, grid overlay, and cargo list
  - Handles drag-and-drop from the cargo list onto the canvas (HTML5 DnD) and click-to-add
  - Calls save/load callbacks on the view model

### State Management

- **`CanvasStateManager`** (`src/state/CanvasStateManager.ts`) is the single source of truth for canvas state.
  - Holds the current `CanvasState` and a history stack for undo/redo.
  - `getState()` returns a deep clone (via `structuredClone`) to prevent external mutation.
  - `setState()` and `updateState()` push the previous state onto the history stack before applying the new state, then notify all subscribers.
  - `subscribe()` registers a listener and immediately fires it with the current state; returns an unsubscribe function.
  - `undo()` / `redo()` navigate the history stack and notify subscribers.
  - History is capped at the current index — new states after an undo discard the redo branch.

- **`CanvasActionDispatcher`** (`src/state/CanvasActionDispatcher.ts`) applies actions against the manager.
  - Receives a `CanvasStateManager` and an options object (`canvasWidth`, `canvasHeight`, `dragEngine`).
  - `dispatch(action)` reads the current state from the manager, then routes to a switch case per action type.
  - Action types: `SELECT`, `DESELECT`, `SET_ACTIVE_ITEM`, `START_DRAG`, `DRAG_MOVE`, `END_DRAG`, `ROTATE`, `ADD_ITEM`, `SET_ITEMS`, `UNDO`, `REDO`.
  - During `DRAG_MOVE`, the dispatcher calls `dragEngine.move()`, updates the drag engine's internal items, validates with `validateAll()`, and writes both `cargos` and `validation` to state.
  - During `ROTATE`, the dispatcher delegates to `dragEngine.rotateItem()` which preserves the item's center and resolves a collision-free placement inside the truck band (reverting to the previous pose when impossible), re-validates against band bounds, and updates state.

- **`CanvasState`** (`src/state/CanvasState.ts`) defines the shape of the entire canvas:
  - `truck: TruckItem | null` — the truck boundary
  - `cargos: CargoItem[]` — all cargo items on the canvas
  - `selectedIds: string[]` — currently selected item IDs
  - `activeItemId: string | null` — the item being actively dragged
  - `validation: ValidationResult` — current validation status and errors
  - `scale: { widthScale: number; heightScale: number }` — pixel-per-meter factors, kept equal (uniform fit-scale from TRUCK_CANVAS 1453x297) so rotations preserve rendered shapes
  - `offsetX: number`, `offsetY: number` — canvas pan offsets

### Engines

- **`DragEngine<T>`** (`src/engines/DragEngine.ts`) — generic over `T extends RectLike & { id: string; rotation: Rotation }`.
  - Maintains internal `DragState` (**`src/engines/DragState.ts`**) — engine-internal gesture state (isDragging, activeId, startMouse, startPositions, startOffsets). It lives beside its sole owner the engine so no engine→state dependency exists.
  - `startDrag(activeId, selectedIds, mouse)` records each selected item's start position and the pointer offset (mouse − item position) so the cursor maintains its relative position during drag.
  - `move(mouse, canvasWidth, canvasHeight, scale?)` computes each dragged item's new position:
    1. Base position = mouse − startOffset (preserves cursor relationship)
    2. `calculateDragPosition()` applies grid snapping and boundary clamping
    3. `SnapEngine.calculateSnapTarget()` snaps to edges, alignments, boundaries, or grid
    4. `CollisionEngine.resolveNonOverlappingPosition()` finds a valid non-overlapping position if the target collides
  - `endDrag()` resets the drag state.
  - `updateItems(items)` syncs the engine's internal item list with external state.

- **`CollisionEngine`** (`src/engines/CollisionEngine.ts`)
  - `detectCollisions(item, others, scale?)` — delegates to `findCollisions()` in `geometryRules.ts`.
  - `findValidPositions(item, others, bounds, snapDistance?, scale?)` — generates candidate X/Y positions from item edges, other item edges, and canvas boundaries; filters to non-overlapping, in-bounds positions; sorts by distance.
  - `resolveNonOverlappingPosition(item, desiredPos, startPos, others, bounds, scale?)` — tries the desired position first; if it collides or is out of bounds, falls back to the nearest valid position, then X-only, then Y-only, then the original start position.

- **`SnapEngine`** (`src/engines/SnapEngine.ts`)
  - `calculateSnapTarget(item, others, targetPos, config)` — evaluates snap candidates along X and Y axes independently (`config.scale` supplies the axis scales used for rotated footprints):
    1. **Boundary snapping** — snap to canvas edges
    2. **Edge contact snapping** — snap so item edges touch other item edges
    3. **Alignment snapping** — snap so item edges align with other item edges
    4. **Grid snapping** — fallback when no edge/alignment candidate is within `SNAP_THRESHOLD` (15px)
  - Uses `getRotatedScreenSize()` to account for rotated items when computing snap positions.
  - Returns a `SnapTarget` with position, type, and distance.

### Adapters

- **`cargoAdapter.ts`** — Converts between PackingUnit/TransportOrder data (meters) and CargoItem view models (pixels).
  - `packingUnitToCargoItem()` — single PackingUnit → CargoItem
  - `transportOrdersToCargoItems()` — list of TransportOrders → CargoItem[]
  - `cargoItemToPackingUnitData()` — CargoItem → PackingUnitData (for persistence). Currently unused in production code (covered by unit tests only); the save path uses `stateAdapter.serializePlan()` — kept as a documented utility until a removal decision
  - `getCargoItemRect()` — gets the visual rectangle of a CargoItem (accounting for rotation). Currently unused in production code (unit tests only) — kept as a documented utility until a removal decision

- **`truckAdapter.ts`** — Converts between TruckSelection data (meters) and TruckItem view model (pixels).
  - `truckSelectionToTruckItem()` — TruckSelectionData → TruckItem; the frame is sized from the truck's internal dimensions (meters × uniform scale) and centered vertically in the reserved canvas band so it aligns with drag bounds
  - `truckToTruckItem()` — Truck business model → TruckItem (same proportional sizing). Currently unused in production code (unit tests only) — kept as a documented utility until a removal decision
- `computeScale()` — computes one uniform pixel-per-meter scale fitting the truck into TRUCK_CANVAS (1453x297) with padding=0; returns `{ widthScale, heightScale }` with equal values so rotation preserves rendered proportions

- **`stateAdapter.ts`** — Serializes/deserializes packing plans for persistence.
  - `serializePlan()` — CanvasState → PackingPlanData (meters)
  - `deserializePlan()` — PackingPlanData → CargoItem[] (pixels)
  - `PackingPlanData` / `PackingPlanItemData` interfaces

- **`mendixDataAdapter.ts`** — Bridges to the Mendix Data API.
  - `loadMendixObject()` — loads a single object by GUID via `mx.data.load`
  - `loadMendixList()` — loads a list of objects via XPath via `mx.data.list`
  - `executeMendixAction()` — executes a microflow via `mx.data.action`
  - `loadTruckItem()` — loads TruckSelection and converts to TruckItem
  - `loadCargoItems()` — loads TransportOrders and converts to CargoItem[]; enriches each item with tooltip meta (TransportOrderNo + Product name) via `transportOrderMeta.ts`
  - `loadPackingPlan()` — loads saved PackingPlan from Mendix entities and re-attaches the tooltip meta through the items' TransportOrder associations
  - `savePackingPlan()` — saves canvas state as PackingPlan (delete + recreate items)

> **Adapters & dependency direction.** The declared chain is `UI → Hooks → State → Engine → Domain → Adapters → Mendix Runtime`. Adapters are the mappers that _produce_ the domain/view models and translate between Mendix meter data and pixel/view coordinates, so they intentionally import down into `domain/*` (`coordinateRules`, `cargoIdentity`, `rotationRules`) and reference the `viewModels/*` they construct, plus `state/CanvasState` when serializing a plan. These are **deliberate, documented** boundary crossings in the mapper role — there is no upward import out of domain/engines/state into adapters, and only adapters ever touch the Mendix runtime.

### React Hooks

- **`useTruckCanvas`** (`src/hooks/useTruckCanvas.ts`) — the main entry point.
  - Memoizes engine instances (`CollisionEngine`, `SnapEngine`, `DragEngine`) and the `CanvasStateManager` + `CanvasActionDispatcher`.
  - Wires `useCanvasState()` and `useCanvasActions()` to the manager and dispatcher.
  - Provides `handleMouseDown`, `handleCanvasMouseDown`, `dragMove`, `handleMouseUp`, and `handleCancel` callbacks, all `useCallback`-memoized so their identity is stable across renders.
  - Uses `useMouseEvents()` to attach global mousemove/mouseup/blur listeners during drag; because the handlers are stable, the listeners attach once per gesture instead of being torn down and re-added on every pointer-move frame.
  - Returns: `items`, `activeItemId`, `selectedIds`, `validation`, `handleMouseDown`, `handleCanvasMouseDown`, `handleRotate`, `addItem`, `setItems`.

- **`useCanvasState`** (`src/hooks/useCanvasState.ts`) — subscribes to the `CanvasStateManager` via `useEffect`, returns the current `CanvasState`.

- **`useCanvasActions`** (`src/hooks/useCanvasActions.ts`) — wraps the `CanvasActionDispatcher` with `useCallback`-memoized action functions: `startDrag`, `dragMove`, `endDrag`, `rotateItem`, `addItem`, `setItems`, `deselect`.

- **`useMouseEvents`** (`src/hooks/useMouseEvents.ts`) — attaches `mousemove`, `mouseup`, and `blur` window listeners only while `dragging` is true; cleans up on unmount or when dragging stops.

### UI Components

- **`LoadingCanvasView`** (`src/widget/LoadingCanvasView.tsx`) — the main canvas renderer component.
  - Receives view models from the container (truck, available cargo, initial plan items, scale).
  - Derives the available cargo list (cargo not yet on the canvas) from `state.cargos` — no separate state.
  - Renders the canvas with truck boundary, cargo items, info panel, grid overlay, and cargo list.
  - Handles drag-and-drop from the cargo list onto the canvas (HTML5 DnD); newly added/dropped cargo is placed at the raw position (list clicks default to `{x: 50, y: 50}`), which may fall outside the truck band and be flagged `OUT_OF_BOUNDS` until the user drags it into place.
  - Displays validation status (colors, errors) in the info panel.
  - Provides the info-panel buttons: **Save Plan**, **Load Plan**, and **Auto Load** (repacks every cargo — on canvas plus still in the list — tightly into the truck frame via `packCargoIntoBounds()`; small/medium loads are solved exactly to maximize loaded units then minimize load meters, larger loads use a deterministic skyline fill; items that do not fit stay in the cargo list and a red notice reports their count).
  - Shows a "Save failed" notice in the info panel when the container reports a `saveError`.

- **`LoadingCanvasContainer`** (`src/widget/LoadingCanvas.container.tsx`) — the Mendix bridge.
  - Receives Mendix props (object references as GUID strings).
  - Loads data via `mx.data` API (with JSON fallback for dev).
  - Converts to view models using adapters.
  - Passes view models to `LoadingCanvas`.
  - Handles save/load plan via `mendixDataAdapter.ts`; `handleSavePlan` wraps `savePackingPlan()` in a try/catch and surfaces failures through a `saveError` view-model field (kept in the info panel) instead of failing silently.

- **`CargoCard`** (`src/components/CargoCard.tsx`) — renders a single cargo item.
  - Displays the continuous cargo number **centered on the card** (same number shown on the cargo chip it came from).
  - Cards are draggable (HTML5 DnD carries `single:<full-unit-id>`, matching cargo chips); dropping an already-placed card back on the canvas **moves** it (position update, not a duplicate), while dragging it to the cargo list removes its transport order.
  - Computes the visual size via `getRotatedScreenSize()` to account for rotation.
  - Applies a border based on state: active (red, 3px), selected (blue, 3px), or default (gray, 1px).
  - On hover shows the `RotationHandle` (unlocked items only) and the `CargoTooltip` with the item's TransportOrderNo and Product name; double-clicking the card toggles a `CargoPopup` beside it showing Order/Product/Producer/From/To company names. Only one popup is open at a time — double-clicking another card moves the popup to it. The popup renders on the right of the card by default and flips to the left when it would otherwise overflow the canvas right edge.

- **`GridOverlay`** (`src/components/GridOverlay.tsx`) — renders a visual grid on the canvas.
  - Uses a canvas-generated background pattern for crisp grid lines.
  - Does not interfere with drag-and-drop or mouse events (pointerEvents: none).

- **`CargoList`** (`src/components/CargoList.tsx`) — debug palette of available cargo items, rendered as a bottom-left overlay.
  - Each transport order with quantity N is expanded into N individual chips (one per packing unit).
  - Chips carry **continuous numbering across all transport orders** (TO1 → 1..44, TO2 → 45..49, ...) derived from `numberStart` + instance index; numbers never change after a partial placement.
  - Chips are draggable (HTML5 DnD carries `single:<cargo-id>-<instanceIndex>` for a single-unit drop) or clickable to add one item via `onAddCargo`.
  - Tracks `placedInstances` (`Map<baseId, Set<instanceIndex>>`) to hide only the placed chips without renumbering.
  - Shows "No cargo items available" when nothing is left to place.

- **`RotationHandle`** (`src/components/RotationHandle.tsx`) — a small circular grab-handle (↻) inside the card at its top center, shown on hover; the hover tooltip hangs below the card so the two never overlap.

- **`CargoPopup`** (`src/components/CargoPopup.tsx`) — dark double-click popup shown beside the card (right side by default, or the left side when it would overflow the canvas) showing `Order: <TransportOrderNo>`, `Product: <name>`, `By: <producer>`, `From: <company>`, `To: <company>`; renders nothing when all fields are empty.

## Data Flow

1. **`LoadingCanvasContainer`** receives props from Mendix (TruckSelection GUID, TransportOrder list, Session, canvas dimensions, callbacks).
2. Container loads data via `mendixDataAdapter.ts`:
   a. `loadMendixObjectRaw()` → raw TruckSelection data → `computeScale()` → scale
   b. `loadTruckItem()` → TruckItem view model
   c. `loadCargoItems()` → CargoItem[] (available cargo list)
   d. `loadPackingPlan()` → CargoItem[] (saved items on canvas)
3. Container passes view models to `LoadingCanvas` via `LoadingCanvasViewModelProps`.
4. **`LoadingCanvas`** initializes `useTruckCanvas` with the view models.
5. **React renders** from the current `CanvasState` — `items` (cargos), `activeItemId`, `selectedIds`, `validation`.
6. **User interaction** (mousedown on a cargo card) triggers `handleMouseDown`, which converts the browser coordinate to a canvas coordinate via `getCanvasPoint()` and dispatches `START_DRAG` through `useCanvasActions()`.
7. **`CanvasActionDispatcher.dispatch()`** routes the action: `START_DRAG` calls `dragEngine.startDrag()` and updates `selectedIds` / `activeItemId` in the state manager.
8. **Mouse move** (captured by `useMouseEvents`) calls `dragMove`, which dispatches `DRAG_MOVE`.
9. **`DRAG_MOVE`** calls `dragEngine.move()` (which applies snap + collision resolution), then `validateAll()`, and writes the new `cargos` and `validation` to the state manager.
10. **`CanvasStateManager`** notifies subscribers; `useCanvasState` triggers a re-render with the updated state.
11. **React re-renders** the cargo cards at their new positions.
12. **Mouse up** dispatches `END_DRAG`, which calls `dragEngine.endDrag()` and clears `activeItemId`.
13. **User clicks "Save Plan"** → `handleSavePlan` → `onSavePlan(items, scale)` → container's `handleSavePlan` → `savePackingPlan()` → deletes existing plan items + creates new ones via `mx.data`.
14. **User clicks "Auto Load"** → `handleAutoLoad` calls `autoLoadCargoUnits(items, availableCargoItems, placedInstances)` which merges canvas items with expanded available cargo (skipping instance indices already placed), then calls `packCargoIntoBounds()` (small/medium loads: exact branch-and-bound that maximizes loaded units then minimizes load meters under a wall-clock budget; larger loads: deterministic bottom-left skyline fill with optional 90° rotation, flush edge-to-edge placement inside the truck frame), then dispatches `SET_ITEMS` with the packed result so validation runs as usual; items that do not fit remain in the cargo list and their count is shown in the info panel.

## Domain Rules

### Geometry (`geometryRules.ts`)

- `getRectangle(item, scale?)` — converts x/y/width/height (accounting for rotation) to a `Rectangle` (left, top, right, bottom); `scale?` defaults to the uniform `{1, 1}` pair.
- `isIntersecting(a, b, eps)` — AABB intersection check with epsilon tolerance.
- `overlaps(a, b, scale?)` — checks if two items overlap using `getRectangle` + `isIntersecting`.
- `isInsideBounds(item, bounds, scale?)` — checks if an item (accounting for rotation) is fully within bounds.
- `findCollisions(target, items, scale?)` — filters items that overlap the target.

### Packing (`packingRules.ts`, `packingOptimizer.ts`)

- `packCargoIntoBounds(items, bounds, scale?, options?)` — pure auto-packing used by the **Auto Load** button.
  - Routes by load size: loads at or below `options.exactLimit` (default 16 units) go to the exact solver; larger loads fall back to the skyline heuristic.
  - Returns `{ placed, unplaced }`; input order is preserved within each group and all cargo identity fields (id, name, color, metric sizes, weight) are untouched — only `x`, `y`, `rotation` are recomputed.
- `optimizePacking(items, bounds, scale?, options?)` — exact anytime branch-and-bound solver (`packingOptimizer.ts`).
  - Objective (lexicographic): **maximize placed units**, then **minimize used length** (load meters, BR-17), then used width, then the number of 90° turns (upright preference, BR-26).
  - Normal-form placement theorem: an optimal packing exists where every item's left edge is the bounds-left or a placed right edge and every top edge is the bounds-top or a placed bottom edge, so the search explores a finite corner-candidate set. Identical-footprint units are grouped and explored in canonical (non-decreasing position) order to avoid redundant permutations.
  - Prunes by a free-area count upper bound and by lexicographic dominance; runs under `options.timeLimitMs` (default 400 ms) and returns the best layout found so far on expiry, so the result is never worse than the greedy seed.
  - Optional 90° rotation (`options.allowRotation`, default on): tried only when 0° has no valid spot; ties keep 0°.
- `packSkylineIntoBounds(...)` — deterministic bottom-left skyline fallback for large loads (`packingRules.ts`).
  - Maintains a frontier of free horizontal segments; each item anchors at the lowest-y segment that can bridge its width, with optional 90° rotation, filling flush edge-to-edge.
- `autoLoadCargoUnits(onCanvas, stillInList, placedInstances?)` — assembles items for Auto Load.
  - Canvas items pass through unchanged (already per-unit instances with instance suffix).
  - Available items are expanded one instance per quantity unit, skipping instance indices already present in `placedInstances` (a `Map<baseId, Set<instanceIndex>>`) so partially placed orders never produce duplicate ids.
- `expandCargoByQuantity(cargo)` — expands raw cargo entries by their quantity into per-instance items (ids `cargo-<orderGuid>-<i>`).

### Rotation (`rotationRules.ts`)

- `rotate90(rotation)` — adds 90° modulo 360.
- `isVerticalRotation(rotation)` — true for 90° and 270°.
- `getRotatedScreenSize(size, rotation, scale?)` — projects rotated extents through the matching axis scales; reduces to a plain width/height swap under uniform or default scale.

### Snap (`snapRules.ts`)

- `snapToGrid(value, gridSize)` — rounds to the nearest grid multiple.
- `snapPosition(x, y, gridSize)` — snaps both axes.

### Drag (`dragRules.ts`)

- `calculateDragPosition(item, startPosition, deltaX, deltaY, canvasWidth, canvasHeight, gridSize)` — snaps the target position to grid and clamps within canvas bounds.

### Validation (`validationRules.ts`)

- `validateItem(item, bounds, others, scale?)` — checks `OUT_OF_BOUNDS` and `OVERLAP` errors; returns `ValidationResult` with `valid` and `errors`.
- `validateLoadMeters(items, maxLoadMeters, scale)` — checks if total load meters exceed `maxLoadMeters`; each item contributes its rotation-aware X-extent (via `getRotatedScreenSize`) so a 90°/270° rotated cargo counts the length it actually takes along the truck.
- `validateAll(items, bounds, options)` — combines all validation checks into a single result.

### Coordinate (`coordinateRules.ts` + `hooks/coordinateRule.ts`)

- `getCanvasPoint(canvas, clientX, clientY)` — converts browser client coordinates to canvas-relative coordinates. Lives in `src/hooks/coordinateRule.ts` because it depends on the DOM; the domain layer stays DOM-free.
- `meterToPixel(meter, scale)` / `pixelToMeter(pixel, scale)` — unit conversion for Mendix integration (pure, kept in `domain/coordinateRules.ts`).

### Boundary (`boundaryRules.ts`)

- `clamp(value, min, max)` — constrains a number to a range.

## Scaling & Rendering Model

- **Uniform scale** — `computeScale()` returns a single pixel-per-meter factor (fit-scale = min of the width/height fits; 106.838 px/m for the default 13.6m x 2.45m truck). Cargo keeps true real-world proportions on screen.
- **Rotation** — stored `length`/`width` are base-orientation pixels; `getRotatedScreenSize()` projects rotated extents through the matching axis scales, which reduces to a plain swap while both scales are equal. This keeps a rotated rectangle a rectangle instead of distorting its shape.
- **Truck frame** — the dashed boundary is drawn from the truck's internal dimensions (meters → pixels via the uniform scale) and centered vertically in the reserved TRUCK_CANVAS band (1453x297 at LEFT/TOP) so it matches drag bounds; the truck backdrop image spans the full canvas width behind it. A cargo row spanning the full 2.45m interior width (~262px) leaves ~35px slack inside the frame.
- **Persistence round-trip** — plans store meters; `serializePlan()`/`deserializePlan()` convert through the current scale pair, so re-saving after any scale change refreshes stored values.

## Constants

| Constant                     | File        | Value               | Purpose                                    |
| ---------------------------- | ----------- | ------------------- | ------------------------------------------ |
| `DEFAULT_CANVAS_WIDTH`       | `canvas.ts` | 1800                | Canvas width in pixels                     |
| `DEFAULT_CANVAS_HEIGHT`      | `canvas.ts` | 600                 | Canvas height in pixels                    |
| `CANVAS_BORDER`              | `canvas.ts` | `"2px solid black"` | Canvas border style                        |
| `GRID_SIZE`                  | `canvas.ts` | 20                  | Grid snapping interval                     |
| `ROTATION_STEP`              | `canvas.ts` | 90                  | Degrees per rotation                       |
| `SNAP_THRESHOLD`             | `canvas.ts` | 15                  | Max distance for snap activation           |
| `INFO_PANEL_*`               | `canvas.ts` | various             | Info panel overlay positioning and styling |
| `CARD_BORDER_WIDTH`          | `card.ts`   | 1                   | Default card border width                  |
| `CARD_SELECTED_BORDER_WIDTH` | `card.ts`   | 3                   | Selected card border width                 |
| `CARD_ACTIVE_BORDER_WIDTH`   | `card.ts`   | 3                   | Active (dragging) card border width        |
| `CARD_BORDER_COLOR`          | `card.ts`   | `"gray"`            | Default card border color                  |
| `CARD_SELECTED_BORDER_COLOR` | `card.ts`   | `"blue"`            | Selected card border color                 |
| `CARD_ACTIVE_BORDER_COLOR`   | `card.ts`   | `"red"`             | Active card border color                   |
| `CANVAS_BACKGROUND_COLOR`    | `theme.ts`  | `"#fafafa"`         | Canvas background color                    |

## Build & Tooling

- **Mendix pluggable-widgets-tools** (`@mendix/pluggable-widgets-tools` v10) — all pipelines: `build:web` bundle, `start:web` dev server with HMR, `lint`, and unit tests
- **Rollup** — widget bundler under the hood of pluggable-widgets-tools (uses the tools' defaults; no custom `rollup.config.mjs`)
- **React 18.2** (pinned via package.json `overrides`/`resolutions`) with the automatic JSX runtime (`jsx: "react-jsx"`)
- **TypeScript 5.9** — strict mode, `erasableSyntaxOnly`, bundler module resolution, `allowArbitraryExtensions`; `noUnusedLocals`/`noUnusedParameters` intentionally disabled because the rollup TypeScript plugin fails the build on TS6133 (unused code stays reported as eslint warnings)
- **ESLint 9** — flat config in `.eslintrc.js` with `typescript-eslint` and `eslint-plugin-react-hooks`, plus complexity/size guard rules (`complexity`, `max-depth`, `max-lines-per-function`)
- **Jest + ts-jest** — unit test runner via `test:unit:web:enzyme-free` (jsdom environment, CSS/PNG assets stubbed, `*.spec.*` files under `src/`)
- **Prettier** — code formatting checked during lint (printWidth 120, 2-space indent, double quotes, es5 trailing commas)

## Mendix Integration

### Widget Manifest

- **`LoadingCanvas.xml`** — Mendix widget manifest defining properties, metadata, and entry point.
- **`package.xml`** — Widget package definition (id, name, version, author, etc.).
- **`src/types/mx.d.ts`** — Lightweight TypeScript declarations for the Mendix widget framework.
- **`src/typings/stcvn/`** — Generated Mendix widget typings.

### Mendix Data API

The `mendixDataAdapter.ts` module bridges the widget to the Mendix Data API:

- **Loading**: Uses `mx.data.load()` and `mx.data.list()` to resolve object references.
- **Saving**: Uses `mx.data.create()`, `mx.data.remove()`, and `mx.data.commit()` to persist packing plans.
- **Dev fallback**: When `mx` is not available (local dev server), falls back to JSON parsing and localStorage.

### PackingPlan Entity

See `docs/PACKING_PLAN_ENTITY.md` for the full entity design.

- **PackingPlan** (1 per TruckSelection) — stores the plan header.
- **PackingPlanItem** (1-\* per plan) — stores individual item positions.
- **Save flow**: Find-or-create plan → Delete existing items → Create new items (association-first, GUID-keyed pairing) → Commit; logs contextual warnings if associations cannot be resolved
- **Load flow**: Query PackingPlan → Query PackingPlanItems → Resolve TransportOrder associations via MxObject API → Deserialize to CargoItems

## Notes

- Existing engine and hook code remains compatible and framework-agnostic — domain rules and engines have no React dependencies.
- The `useCanvasState` and `useCanvasActions` hooks expose the state manager cleanly to React components.
- The `Truck` business model uses metric units (meters, kg); the canvas view layer uses pixels. The `coordinateRules.ts` module provides conversion helpers for Mendix integration.
- This architecture supports future export/import, undo/redo, and Mendix data sync.
