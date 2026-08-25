# LoadingCanvas Widget Architecture

## Overview

This repository implements a modular **LoadingCanvas** widget for drag-and-drop truck loading planning. Built with React 19, TypeScript, and Vite, the widget provides an interactive canvas where users can place, drag, rotate, and validate cargo items within a truck boundary.

The architecture follows a strict **layered separation of concerns**:

- **UI layer** — React components and hooks (`LoadingCanvas`, `LoadingCanvasContainer`, `CargoCard`, `RotationHandle`, `GridOverlay`, `PalletList`, `useTruckCanvas`, `useCanvasState`, `useCanvasActions`, `useMouseEvents`)
- **State management layer** — `CanvasStateManager` (single source of truth) and `CanvasActionDispatcher` (action routing)
- **Engine layer** — `DragEngine`, `CollisionEngine`, `SnapEngine`, `ValidationEngine` (pure business logic)
- **Domain rule layer** — geometry, snap, validation, coordinate, rotation, drag, and boundary helpers
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
│   ├── CargoCard.tsx               # Renders a single cargo item (position, size, border, label, rotation handle)
│   ├── GridOverlay.tsx             # Renders a visual grid on the canvas for grid-snap visualization
│   ├── PalletList.tsx              # Debug view: draggable cargo items available to place on canvas
│   ├── RotationHandle.tsx           # Small grab-handle UI for rotating an item 90°
│   └── __tests__/                  # Component unit tests
│
├── constants/
│   ├── canvas.ts                   # Canvas dimensions, grid size, rotation step, snap threshold, info panel styles
│   ├── card.ts                     # Card border widths and colors (default, selected, active)
│   └── theme.ts                    # Canvas background color
│
├── domain/
│   ├── boundaryRules.ts            # clamp() — keeps values within a range
│   ├── coordinateRules.ts          # getCanvasPoint(), meterToPixel(), pixelToMeter()
│   ├── dragRules.ts                # calculateDragPosition() — grid-snapped, clamped drag position
│   ├── geometryRules.ts            # getRectangle(), isIntersecting(), overlaps(), isInsideBounds(), findCollisions()
│   ├── rotationRules.ts            # rotate90(), isVerticalRotation(), getRotatedSize()
│   ├── snapRules.ts                # snapToGrid(), snapPosition()
│   ├── validationRules.ts          # validateItem(), validateLoadMeters(), validateAll()
│   └── __tests__/                  # Domain rule unit tests
│
├── engines/
│   ├── DragEngine.ts               # Manages drag state, computes new positions with snap + collision resolution
│   ├── CollisionEngine.ts          # Detects overlaps, finds valid non-overlapping positions
│   ├── SnapEngine.ts               # Calculates best snap target (boundary, edge, align, grid)
│   ├── ValidationEngine.ts         # Validates all items against bounds and each other
│   └── __tests__/                  # Engine unit tests
│
├── hooks/
│   ├── useTruckCanvas.ts           # Main hook: wires engines, state manager, dispatcher, and mouse events
│   ├── useCanvasState.ts           # Subscribes to CanvasStateManager, returns current CanvasState
│   ├── useCanvasActions.ts         # Wraps CanvasActionDispatcher with memoized action callbacks
│   └── useMouseEvents.ts           # Attaches window mousemove/mouseup/blur listeners during drag
│
├── models/
│   └── Truck.ts                    # Business model: truck dimensions (meters), payload, axle count, type
│
├── state/
│   ├── CanvasState.ts              # Interface: truck, cargos, selectedIds, activeItemId, validation, scale, offset
│   ├── CanvasStateManager.ts       # Single source of truth; immutable updates, subscribe/notify, undo/redo history
│   ├── CanvasActionDispatcher.ts   # Routes CanvasAction types to state mutations via engines
│   ├── CanvasStateListener.ts      # Type alias: (state: CanvasState) => void
│   ├── DragState.ts                # Internal drag tracking: isDragging, activeId, startMouse, startPositions, startOffsets
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
│   ├── truckAdapter.ts             # Converts TruckSelection data to TruckItem view model, computes scale
│   ├── stateAdapter.ts             # Serializes/deserializes PackingPlanData for persistence
│   ├── mendixDataAdapter.ts        # Bridges to Mendix Data API (mx.data) for load/save
│   └── __tests__/                  # Adapter unit tests
│
├── widget/
│   ├── index.ts                    # Mendix widget entry point (exports LoadingCanvasContainer)
│   ├── LoadingCanvas.container.tsx # Mendix bridge: loads data via mx.data, passes view models to widget
│   └── LoadingCanvas.properties.ts # Property definitions and prop interfaces
│
├── fixtures/
│   └── InitialCargoItem.ts         # Debug fixture: initial cargo items for testing
│
└── __tests__/
    └── setup.ts                    # Vitest setup file
```

## Core Components

### Widget Entry Point

- **`LoadingCanvasContainer`** (`src/widget/LoadingCanvas.container.tsx`) is the Mendix-facing component.
  - Receives `LoadingCanvasProps` from Mendix (object references as GUID strings, canvas dimensions, action callbacks)
  - Uses `mendixDataAdapter.ts` to load data via `mx.data` API (with JSON fallback for dev)
  - Converts Mendix objects to view models using adapters
  - Passes view models to `LoadingCanvas` via `LoadingCanvasViewModelProps`
  - Handles save plan (delete + recreate) and load plan via `mendixDataAdapter.ts`

- **`LoadingCanvas`** (`src/LoadingCanvas.tsx`) is the pure React component.
  - Receives `LoadingCanvasWidgetProps` (view models + loading state)
  - Manages canvas state via `useTruckCanvas` hook
  - Renders the canvas, truck boundary, cargo items, info panel, grid overlay, and pallet list
  - Handles drag-and-drop from pallet list to canvas (HTML5 DnD)
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
  - Receives a `CanvasStateManager` and an options object (`canvasWidth`, `canvasHeight`, `dragEngine`, `validationEngine`).
  - `dispatch(action)` reads the current state from the manager, then routes to a switch case per action type.
  - Action types: `SELECT`, `DESELECT`, `SET_ACTIVE_ITEM`, `START_DRAG`, `DRAG_MOVE`, `END_DRAG`, `ROTATE`, `ADD_ITEM`, `SET_ITEMS`, `UNDO`, `REDO`.
  - During `DRAG_MOVE`, the dispatcher calls `dragEngine.move()`, updates the drag engine's internal items, validates the result with `validationEngine.validateItems()`, and writes both `cargos` and `validation` to state.
  - During `ROTATE`, the dispatcher computes the new rotation (90° clockwise), preserves the item's center using `getRotatedSize`, clamps to canvas bounds, re-validates, and updates state.

- **`CanvasState`** (`src/state/CanvasState.ts`) defines the shape of the entire canvas:
  - `truck: TruckItem | null` — the truck boundary
  - `cargos: CargoItem[]` — all cargo items on the canvas
  - `selectedIds: string[]` — currently selected item IDs
  - `activeItemId: string | null` — the item being actively dragged
  - `validation: ValidationResult` — current validation status and errors
  - `scale: { widthScale: number; heightScale: number }` — separate width/height pixel-to-meter scale factors (2-scale approach using TRUCK_CANVAS 1453x297)
  - `offsetX: number`, `offsetY: number` — canvas pan offsets

### Engines

- **`DragEngine<T>`** (`src/engines/DragEngine.ts`) — generic over `T extends RectLike & { id: string; rotation: Rotation }`.
  - Maintains internal `DragState` (isDragging, activeId, startMouse, startPositions, startOffsets).
  - `startDrag(activeId, selectedIds, mouse)` records each selected item's start position and the pointer offset (mouse − item position) so the cursor maintains its relative position during drag.
  - `move(mouse, canvasWidth, canvasHeight)` computes each dragged item's new position:
    1. Base position = mouse − startOffset (preserves cursor relationship)
    2. `calculateDragPosition()` applies grid snapping and boundary clamping
    3. `SnapEngine.calculateSnapTarget()` snaps to edges, alignments, boundaries, or grid
    4. `CollisionEngine.resolveNonOverlappingPosition()` finds a valid non-overlapping position if the target collides
  - `endDrag()` resets the drag state.
  - `updateItems(items)` syncs the engine's internal item list with external state.

- **`CollisionEngine`** (`src/engines/CollisionEngine.ts`)
  - `detectCollisions(item, others)` — delegates to `findCollisions()` in `geometryRules.ts`.
  - `findValidPositions(item, others, bounds, snapDistance)` — generates candidate X/Y positions from item edges, other item edges, and canvas boundaries; filters to non-overlapping, in-bounds positions; sorts by distance.
  - `resolveNonOverlappingPosition(item, desiredPos, startPos, others, bounds)` — tries the desired position first; if it collides or is out of bounds, falls back to the nearest valid position, then X-only, then Y-only, then the original start position.

- **`SnapEngine`** (`src/engines/SnapEngine.ts`)
  - `calculateSnapTarget(item, others, targetPos, config)` — evaluates snap candidates along X and Y axes independently:
    1. **Boundary snapping** — snap to canvas edges
    2. **Edge contact snapping** — snap so item edges touch other item edges
    3. **Alignment snapping** — snap so item edges align with other item edges
    4. **Grid snapping** — fallback when no edge/alignment candidate is within `SNAP_THRESHOLD` (15px)
  - Uses `getRotatedSize()` to account for rotated items when computing snap positions.
  - Returns a `SnapTarget` with position, type, and distance.

- **`ValidationEngine`** (`src/engines/ValidationEngine.ts`)
  - `validateItems(items, bounds, options)` — delegates to `validateAll()` in `validationRules.ts`.
  - Checks: `OUT_OF_BOUNDS`, `OVERLAP`, `LM_EXCEEDED`.
  - Returns `ValidationResult` with `valid`, `errors`, and `itemErrors` (per-item error mapping for UI highlighting).

### Adapters

- **`cargoAdapter.ts`** — Converts between PackingUnit/TransportOrder data (meters) and CargoItem view models (pixels).
  - `packingUnitToCargoItem()` — single PackingUnit → CargoItem
  - `transportOrdersToCargoItems()` — list of TransportOrders → CargoItem[]
  - `cargoItemToPackingUnitData()` — CargoItem → PackingUnitData (for persistence)
  - `getCargoItemRect()` — gets the visual rectangle of a CargoItem (accounting for rotation)

- **`truckAdapter.ts`** — Converts between TruckSelection data (meters) and TruckItem view model (pixels).
  - `truckSelectionToTruckItem()` — TruckSelectionData → TruckItem
  - `truckToTruckItem()` — Truck business model → TruckItem
- `computeScale()` — computes separate width/height pixel-to-meter scale factors using TRUCK_CANVAS (1453x297) with padding=0; returns `{ widthScale, heightScale }`

- **`stateAdapter.ts`** — Serializes/deserializes packing plans for persistence.
  - `serializePlan()` — CanvasState → PackingPlanData (meters)
  - `deserializePlan()` — PackingPlanData → CargoItem[] (pixels)
  - `PackingPlanData` / `PackingPlanItemData` interfaces

- **`mendixDataAdapter.ts`** — Bridges to the Mendix Data API.
  - `loadMendixObject()` — loads a single object by GUID via `mx.data.load`
  - `loadMendixList()` — loads a list of objects via XPath via `mx.data.list`
  - `executeMendixAction()` — executes a microflow via `mx.data.action`
  - `loadTruckItem()` — loads TruckSelection and converts to TruckItem
  - `loadCargoItems()` — loads TransportOrders and converts to CargoItem[]
  - `loadPackingPlan()` — loads saved PackingPlan from Mendix entities
  - `savePackingPlan()` — saves canvas state as PackingPlan (delete + recreate items)

### React Hooks

- **`useTruckCanvas`** (`src/hooks/useTruckCanvas.ts`) — the main entry point.
  - Memoizes engine instances (`CollisionEngine`, `SnapEngine`, `DragEngine`, `ValidationEngine`) and the `CanvasStateManager` + `CanvasActionDispatcher`.
  - Wires `useCanvasState()` and `useCanvasActions()` to the manager and dispatcher.
  - Provides `handleMouseDown`, `handleCanvasMouseDown`, and `handleRotate` callbacks.
  - Uses `useMouseEvents()` to attach global mousemove/mouseup/blur listeners during drag.
  - Syncs the drag engine's internal items whenever `state.cargos` changes.
  - Returns: `items`, `activeItemId`, `selectedIds`, `validation`, `handleMouseDown`, `handleCanvasMouseDown`, `handleRotate`, `addItem`, `setItems`.

- **`useCanvasState`** (`src/hooks/useCanvasState.ts`) — subscribes to the `CanvasStateManager` via `useEffect`, returns the current `CanvasState`.

- **`useCanvasActions`** (`src/hooks/useCanvasActions.ts`) — wraps the `CanvasActionDispatcher` with `useCallback`-memoized action functions: `startDrag`, `dragMove`, `endDrag`, `rotateItem`, `addItem`, `setItems`, `deselect`.

- **`useMouseEvents`** (`src/hooks/useMouseEvents.ts`) — attaches `mousemove`, `mouseup`, and `blur` window listeners only while `dragging` is true; cleans up on unmount or when dragging stops.

### UI Components

- **`LoadingCanvas`** (`src/LoadingCanvas.tsx`) — the main widget component.
  - Receives view models from the container (truck, pallet list, initial canvas items, scale).
  - Manages pallet list state (useState) for the debug palette view.
  - Renders the canvas with truck boundary, cargo items, info panel, grid overlay, and pallet list.
  - Handles drag-and-drop from pallet list to canvas (HTML5 DnD).
  - Displays validation status (colors, errors) in the info panel.

- **`LoadingCanvasContainer`** (`src/widget/LoadingCanvas.container.tsx`) — the Mendix bridge.
  - Receives Mendix props (object references as GUID strings).
  - Loads data via `mx.data` API (with JSON fallback for dev).
  - Converts to view models using adapters.
  - Passes view models to `LoadingCanvas`.
  - Handles save/load plan via `mendixDataAdapter.ts`.

- **`CargoCard`** (`src/components/CargoCard.tsx`) — renders a single cargo item.
  - Computes the visual size via `getRotatedSize()` to account for rotation.
  - Applies a border based on state: active (red, 3px), selected (blue, 3px), or default (gray, 1px).
  - Displays item name, ID, position, size, and rotation as a label below the item.
  - Renders a `RotationHandle` for 90° rotation.

- **`GridOverlay`** (`src/components/GridOverlay.tsx`) — renders a visual grid on the canvas.
  - Uses a canvas-generated background pattern for crisp grid lines.
  - Does not interfere with drag-and-drop or mouse events (pointerEvents: none).

- **`PalletList`** (`src/components/PalletList.tsx`) — debug view showing available cargo items.
  - Each pallet is draggable (HTML5 DnD) and also clickable (for quick testing).
  - Shows pallet name, type, and dimensions.

- **`RotationHandle`** (`src/components/RotationHandle.tsx`) — a small circular grab-handle (↻) positioned at the top center of the cargo card.

## Data Flow

1. **`LoadingCanvasContainer`** receives props from Mendix (TruckSelection GUID, TransportOrder list, Session, canvas dimensions, callbacks).
2. Container loads data via `mendixDataAdapter.ts`:
   a. `loadMendixObjectRaw()` → raw TruckSelection data → `computeScale()` → scale
   b. `loadTruckItem()` → TruckItem view model
   c. `loadCargoItems()` → CargoItem[] (pallet list)
   d. `loadPackingPlan()` → CargoItem[] (saved items on canvas)
3. Container passes view models to `LoadingCanvas` via `LoadingCanvasViewModelProps`.
4. **`LoadingCanvas`** initializes `useTruckCanvas` with the view models.
5. **React renders** from the current `CanvasState` — `items` (cargos), `activeItemId`, `selectedIds`, `validation`.
6. **User interaction** (mousedown on a cargo card) triggers `handleMouseDown`, which converts the browser coordinate to a canvas coordinate via `getCanvasPoint()` and dispatches `START_DRAG` through `useCanvasActions()`.
7. **`CanvasActionDispatcher.dispatch()`** routes the action: `START_DRAG` calls `dragEngine.startDrag()` and updates `selectedIds` / `activeItemId` in the state manager.
8. **Mouse move** (captured by `useMouseEvents`) calls `dragMove`, which dispatches `DRAG_MOVE`.
9. **`DRAG_MOVE`** calls `dragEngine.move()` (which applies snap + collision resolution), then `validationEngine.validateItems()`, and writes the new `cargos` and `validation` to the state manager.
10. **`CanvasStateManager`** notifies subscribers; `useCanvasState` triggers a re-render with the updated state.
11. **React re-renders** the cargo cards at their new positions.
12. **Mouse up** dispatches `END_DRAG`, which calls `dragEngine.endDrag()` and clears `activeItemId`.
13. **User clicks "Save Plan"** → `handleSavePlan` → `onSavePlan(items, scale)` → container's `handleSavePlan` → `savePackingPlan()` → deletes existing plan items + creates new ones via `mx.data`.

## Domain Rules

### Geometry (`geometryRules.ts`)

- `getRectangle(item)` — converts x/y/width/height (accounting for rotation) to a `Rectangle` (left, top, right, bottom).
- `isIntersecting(a, b, eps)` — AABB intersection check with epsilon tolerance.
- `overlaps(a, b)` — checks if two items overlap using `getRectangle` + `isIntersecting`.
- `isInsideBounds(item, bounds)` — checks if an item (accounting for rotation) is fully within bounds.
- `findCollisions(target, items)` — filters items that overlap the target.

### Rotation (`rotationRules.ts`)

- `rotate90(rotation)` — adds 90° modulo 360.
- `isVerticalRotation(rotation)` — true for 90° and 270°.
- `getRotatedSize(size, rotation)` — swaps width/height for vertical rotations.

### Snap (`snapRules.ts`)

- `snapToGrid(value, gridSize)` — rounds to the nearest grid multiple.
- `snapPosition(x, y, gridSize)` — snaps both axes.

### Drag (`dragRules.ts`)

- `calculateDragPosition(item, startPosition, deltaX, deltaY, canvasWidth, canvasHeight, gridSize)` — snaps the target position to grid and clamps within canvas bounds.

### Validation (`validationRules.ts`)

- `validateItem(item, bounds, others)` — checks `OUT_OF_BOUNDS` and `OVERLAP` errors; returns `ValidationResult` with `valid` and `errors`.
- `validateLoadMeters(items, maxLoadMeters, scale)` — checks if total length exceeds max load meters.
- `validateAll(items, bounds, options)` — combines all validation checks into a single result.

### Coordinate (`coordinateRules.ts`)

- `getCanvasPoint(canvas, clientX, clientY)` — converts browser client coordinates to canvas-relative coordinates.
- `meterToPixel(meter, scale)` / `pixelToMeter(pixel, scale)` — unit conversion for Mendix integration.

### Boundary (`boundaryRules.ts`)

- `clamp(value, min, max)` — constrains a number to a range.

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

- **Vite** — build tool and dev server with HMR
- **React 19** with `@vitejs/plugin-react` (Oxc-based Fast Refresh)
- **TypeScript 6** with strict mode, `verbatimModuleSyntax`, and `noUnusedLocals`/`noUnusedParameters`
- **ESLint 10** with `typescript-eslint`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh`
- **Vitest** — test runner with jsdom environment
- **Prettier** — code formatting (printWidth 120, 2-space indent, single quotes, trailing commas)
- **Rollup** — Mendix widget build config (`rollup.config.mjs`)

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
- **Dev fallback**: When `mx` is not available (Vite dev server), falls back to JSON parsing and localStorage.

### PackingPlan Entity

See `docs/PACKING_PLAN_ENTITY.md` for the full entity design.

- **PackingPlan** (1 per TruckSelection) — stores the plan header.
- **PackingPlanItem** (1-\* per plan) — stores individual item positions.
- **Save flow**: Delete existing items → Create new items → Commit.
- **Load flow**: Query PackingPlan → Query PackingPlanItems → Deserialize to CargoItems.

## Notes

- Existing engine and hook code remains compatible and framework-agnostic — domain rules and engines have no React dependencies.
- The `useCanvasState` and `useCanvasActions` hooks expose the state manager cleanly to React components.
- The `Truck` business model uses metric units (meters, kg); the canvas view layer uses pixels. The `coordinateRules.ts` module provides conversion helpers for Mendix integration.
- This architecture supports future export/import, undo/redo, and Mendix data sync.
