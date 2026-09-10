# LoadingCanvas Widget Architecture

## Overview

This repository implements a modular **LoadingCanvas** widget for drag-and-drop truck loading planning. Built with React 18 and TypeScript on the Mendix pluggable-widget toolchain, the widget provides an interactive canvas where users can place, drag, rotate, and validate cargo items within a truck boundary.

The architecture follows a **Pragmatic Domain-Centric Architecture** — a layered architecture that places the business domain at the center while allowing practical cross-layer usage through a Shared Kernel (Core layer).

### Design Principles

1. **Domain is King** — Business logic is the most important part and has zero dependencies on infrastructure or UI frameworks
2. **Shared Kernel** — Pure utilities and types are shared across all layers without creating coupling
3. **Clear Dependency Direction** — Dependencies flow inward: Presentation → State → Domain → Core
4. **Framework Agnostic Domain** — Domain logic has zero React or Mendix dependencies
5. **Testable Isolation** — Each layer can be unit tested independently

---

## Architectural Style

### Why Pragmatic Domain-Centric?

### Layered Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Presentation Layer (src/presentation/)                      │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │  Components     │  │  Hooks                           │   │
│  │  (Pure UI)      │  │  (State + Side Effects)         │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
│  Can depend on: State, Domain, Core                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  State Layer (src/state/)                                    │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │  State Store    │  │  Action Handlers                │   │
│  │  (Single Source │  │  (Orchestration)                │   │
│  │   of Truth)     │  │                                 │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
│  Can depend on: Domain, Core                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Domain Layer (src/domain/)                                  │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │  Business Rules │  │  Engines                        │   │
│  │  (Validation,   │  │  (Drag, Collision, Snap,        │   │
│  │   Geometry,     │  │   Packing)                      │   │
│  │   Rotation)     │  │                                 │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
│  Can depend on: Core ONLY                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Infrastructure Layer (src/infrastructure/)                  │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │  Mendix Bridge  │  │  Data Adapters                  │   │
│  │  (mx.data API)  │  │  (Serialization)                │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
│  Can depend on: Domain, Core                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Core / Shared Kernel (src/core/)                            │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │  Types          │  │  Utilities                      │   │
│  │  (Geometry,     │  │  (Coordinate Conversion,        │   │
│  │   ViewModels)   │  │   ID Manipulation)              │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
│  Can depend on: Nothing                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Layer (src/core/)

### Purpose

The Core layer is the **Shared Kernel** — code that can be used by any layer with zero dependencies. It contains pure types, utility functions, and constants that are fundamental to the application.

### Key Types

#### geometry.ts
```typescript
export interface Point { x: number; y: number; }
export interface Size { length: number; width: number; }
export interface Positionable { x: number; y: number; }
export interface Sizeable { length: number; width: number; }
export interface Rotatable { rotation: Rotation; }
export interface RectLike extends Positionable, Sizeable {}
export interface GeometryItem extends Positionable, Sizeable, Rotatable {}
export interface Rectangle { left: number; top: number; right: number; bottom: number; }
export type Rotation = 0 | 90 | 180 | 270;
```

#### viewModels/CargoItem.ts
```typescript
import type { GeometryItem } from "../geometry";
export type CargoType = "pallet" | "box";
export interface CargoItem extends GeometryItem {
  id: string;
  name: string;
  type: CargoType;
  color: string;
  isLocked: boolean;
  lengthM?: number;
  widthM?: number;
  weightKg?: number;
  quantity?: number;
  transportOrderNo?: string;
  productName?: string;
  producerName?: string;
  companyFromName?: string;
  companyToName?: string;
}
```

### Key Utilities

#### coordinates.ts
```typescript
export const meterToPixel = (meter: number, scale: number): number => meter * scale;
export const pixelToMeter = (pixel: number, scale: number): number => pixel / scale;
```

#### cargoId.ts
```typescript
export const CARGO_ID_PREFIX = "cargo-";
export const toCargoId = (id: string): string =>
  id.startsWith(CARGO_ID_PREFIX) ? id : `${CARGO_ID_PREFIX}${id}`;
export const fromCargoId = (id: string): string => {
  if (!id.startsWith(CARGO_ID_PREFIX)) return id;
  const withoutPrefix = id.slice(CARGO_ID_PREFIX.length);
  const dashIndex = withoutPrefix.lastIndexOf("-");

### Business Rules (src/domain/rules/)

| File | Functions | Purpose |
|------|-----------|---------|
| boundaryRules.ts | clamp, getCanvasBounds, getTruckBounds, getTruckBoundsFromItem | Boundary calculations |
| geometryRules.ts | getRectangle, isIntersecting, overlaps, isInsideBounds, findCollisions | Geometry operations |
| validationRules.ts | validateItem, validateLoadMeters, validateAll | Validation logic |
| rotationRules.ts | rotate90, isVerticalRotation, getRotatedScreenSize, rotateKeepingCenter | Rotation logic |
| dragRules.ts | calculateDragPosition | Drag calculations |
| snapRules.ts | snapToGrid, snapPosition | Snap calculations |

### Engines (src/domain/engines/)

Engines orchestrate domain rules to implement complex behaviors:

#### DragEngine<T>
- Manages drag state (start positions, offsets, active item)
- `startDrag(activeId, selectedIds, mouse)` — Begins drag operation
- `move(mouse, canvasWidth, canvasHeight, scale, bounds)` — Updates positions during drag
- `rotateItem(itemId, bounds, scale)` — Rotates item with collision resolution
- `endDrag()` — Ends drag operation
- `updateItems(items)` — Syncs internal items with external state

#### CollisionEngine
- `detectCollisions(item, others, scale)` — Detects collisions
- `findValidPositions(item, others, bounds, snapDistance, scale)` — Finds valid positions
- `resolveNonOverlappingPosition(item, desiredPos, startPos, others, bounds, scale)` — Resolves to valid position

#### SnapEngine
- `calculateSnapTarget(item, others, position, options)` — Calculates snap target

### Packing (src/domain/packing/)

#### packingRules.ts
- `packCargoIntoBounds(items, bounds, scale, options)` — Packs cargo into bounds
- `autoLoadCargoUnits(onCanvas, stillInList, placedInstances)` — Auto-loads cargo units
- `expandCargoByQuantity(cargo)` — Expands cargo by quantity

#### packingOptimizer.ts
- `optimizePacking(items, bounds, scale, options)` — Exact packing optimization
- Uses branch-and-bound algorithm for optimal placement
- Maximizes placed units, minimizes used length/width/rotations
  if (dashIndex > 0 && /^\d+$/.test(withoutPrefix.slice(dashIndex + 1))) {
    return withoutPrefix.slice(0, dashIndex);
  }
  return withoutPrefix;
};
export const getCargoInstanceIndex = (id: string): number => {
  if (!id.startsWith(CARGO_ID_PREFIX)) return 0;

---

## State Layer (src/state/)

### Purpose

The State layer manages application state and orchestrates domain objects. It serves as the **single source of truth** for the UI and coordinates all state mutations.

### Directory Structure

```
src/state/
├── CanvasState.ts                 # State interface definition
├── CanvasStateManager.ts          # State management with undo/redo
├── CanvasStateListener.ts         # Listener type for subscriptions
└── CanvasActionDispatcher.ts      # Action routing and orchestration
```

### Rules

1. **Domain + Core dependencies** — Can import from `src/domain/` and `src/core/`
2. **Single source of truth** — All application state lives here
3. **No business logic** — Orchestrates domain objects but doesn't contain business rules
4. **No direct UI manipulation** — Notifies listeners, doesn't render
5. **No direct Mendix calls** — Delegates to infrastructure layer

### Key Components

#### CanvasState Interface
```typescript
import type { CargoItem } from "../core/types/viewModels/CargoItem";
import type { TruckItem } from "../core/types/viewModels/TruckItem";
import type { ValidationResult } from "../domain/rules/validationRules";

export interface CanvasState {
  truck: TruckItem | null;
  cargos: CargoItem[];
  selectedIds: string[];
  activeItemId: string | null;
  validation: ValidationResult;
  scale: { widthScale: number; heightScale: number };
}
```

#### CanvasStateManager
- `getState()` — Returns deep-cloned current state
- `setState(nextState)` — Updates state with history tracking
- `updateState(update)` — Updates state via function
- `setStateTransient(nextState)` — Updates state without history (for drag frames)
- `subscribe(listener)` — Subscribes to state changes
- `undo()` — Undoes last state change
- `redo()` — Redoes last undone change

#### CanvasActionDispatcher

---

## Infrastructure Layer (src/infrastructure/)

### Purpose

The Infrastructure layer handles **external system integrations** and **data transformations**. It is the **only layer** allowed to interact with the Mendix runtime.

### Directory Structure

```
src/infrastructure/
├── mendix/                        # Mendix-specific integration code
│   ├── mendixRuntime.ts           # mx.data detection, GUID, Decimal helpers
│   ├── mendixLoaders.ts           # mx.data load/commit wrappers
│   ├── mendixAssociations.ts      # Association filtering
│   ├── mendixMappers.ts           # MxObject → plain object mapping
│   └── mendixSchema.ts            # Entity/association/attribute constants
└── adapters/                      # Data mapping and serialization
    ├── cargoAdapter.ts            # PackingUnit → CargoItem mapping
    ├── truckAdapter.ts            # TruckSelection → TruckItem mapping
    ├── stateAdapter.ts            # CanvasState ↔ PackingPlanData
    ├── cargoLoader.ts             # Load TransportOrders from Mendix
    ├── truckLoader.ts             # Load TruckSelection from Mendix
    ├── transportOrderMeta.ts      # Load TO metadata
    ├── planRepository.ts          # Load/save PackingPlan
    └── mendixDataAdapter.ts       # Public facade for Mendix Data API
```

### Rules

1. **Domain + Core dependencies** — Can import from `src/domain/` and `src/core/`
2. **Mendix gateway** — Only layer allowed to call Mendix runtime APIs
3. **Data transformation** — Converts between Mendix and domain formats
4. **No business logic** — Uses domain rules but doesn't implement them
5. **No direct UI manipulation** — Returns data, doesn't render

### Mendix Bridge (src/infrastructure/mendix/)

| File | Functions | Purpose |
|------|-----------|---------|
| mendixRuntime.ts | isMendixRuntime, getMx, getObjectGuid, isMxObject, setMxAttribute, setMxDecimalAttribute | Runtime detection and helpers |
| mendixLoaders.ts | loadMendixObject, loadMendixObjects, loadMendixList, executeMendixAction | Data loading |
| mendixAssociations.ts | getReferenceGuids, filterByAssociationGuid | Association handling |

---

## Presentation Layer (src/presentation/)

### Purpose

The Presentation layer contains **React components and hooks**. It is a thin UI layer that renders state and captures user interactions.

### Directory Structure

```
src/presentation/
├── hooks/                         # React hooks
│   ├── useTruckCanvas.ts          # Main canvas hook (engines + state)
│   ├── useCanvasState.ts          # State subscription hook
│   ├── useCanvasActions.ts        # Action dispatcher hook
│   ├── useMouseEvents.ts          # Mouse event handling
│   └── coordinateRule.ts          # Canvas coordinate conversion
├── components/                    # Presentational components
│   ├── CargoCard.tsx              # Single cargo item rendering
│   ├── CargoList.tsx              # Available cargo list
│   ├── CargoPopup.tsx             # Cargo detail popup
│   ├── CargoTooltip.tsx           # Cargo hover tooltip
│   ├── GridOverlay.tsx            # Grid overlay
│   └── RotationHandle.tsx         # Rotation handle
└── widget/                        # Widget container
    ├── LoadingCanvas.tsx              # Mendix entry point
    ├── LoadingCanvas.container.tsx     # Data loading container
    ├── LoadingCanvasView.tsx          # Main view component
    ├── LoadingCanvas.properties.ts     # Props interface
    ├── LoadingCanvas.editorConfig.ts    # Editor configuration
    ├── LoadingCanvas.editorPreview.tsx  # Editor preview
    ├── LoadingCanvas.xml               # Widget manifest
    └── index.ts                       # Public exports
```

### Rules

1. **State + Domain + Core dependencies** — Can import from any layer
2. **Thin components** — Components are pure (props in, UI out)
3. **Hooks delegate** — Business logic in hooks delegates to state/domain
4. **No direct Mendix calls** — Uses infrastructure layer via container
5. **No business logic duplication** — Reuses domain rules


---

## Dependency Rules

### Allowed Dependencies Matrix

| Layer | Core | Domain | State | Infrastructure | Presentation |
|-------|------|--------|-------|----------------|--------------|
| **Core** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Domain** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **State** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Infrastructure** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Presentation** | ✅ | ✅ | ✅ | ❌ | ✅ |

### Dependency Direction Diagram

```
                    ┌──────────────────┐
                    │   Shared Kernel   │
                    │   (core/)         │
                    └──────────────────┘
                         ▲     ▲
                         │     │
            ┌────────────┘     └────────────┐
            │                               │
            ▼                               │
┌───────────────────────┐                   │
│   Domain Layer        │                   │
│   (domain/)           │                   │
└───────────────────────┘                   │
            ▲                               │
            │                               │
            │         ┌─────────────────────┘
            │         │
            ▼         ▼
┌───────────────────────┐
│   State Layer         │
│   (state/)            │
└───────────────────────┘
            ▲
            │
            ▼
┌───────────────────────┐
│   Presentation Layer  │
│   (presentation/)     │
└───────────────────────┘

┌───────────────────────┐
│   Infrastructure      │◄──── Can use Domain + Core

---

## Data Flow

### User Interaction Flow

```
User Action → Component → Hook → ActionDispatcher → StateManager
                  │                         │
                  │                         ▼
                  │                   Domain Engine
                  │                         │
                  │                         ▼
                  │                   Domain Rules
                  │                         │
                  ▼                         ▼
              Re-render              State Update
```

### Data Loading Flow

```
Mendix Runtime → mendixLoaders → Adapters → Domain Rules → View Models → State
```

### Save Flow

```
State → Adapters → mendixMappers → mendixLoaders → Mendix Runtime
```

### Auto Load Flow

```
User Action → Hook → ActionDispatcher → Domain Packing Rules → State → Re-render
```

---

## Testing Strategy

### Test File Location

Tests live alongside the code they test:
```
src/core/utils/__tests__/coordinates.spec.ts
src/domain/rules/__tests__/validationRules.spec.ts
src/domain/engines/__tests__/DragEngine.spec.ts
src/state/__tests__/CanvasStateManager.spec.ts

---

## Build & Tooling

- **Mendix pluggable-widgets-tools** (`@mendix/pluggable-widgets-tools` v10) — all pipelines
- **Rollup** — widget bundler under the hood of pluggable-widgets-tools
- **React 18.2** (pinned) with automatic JSX runtime
- **TypeScript 5.9** — strict mode, bundler module resolution
- **ESLint 9** — flat config with typescript-eslint and react-hooks
- **Jest + ts-jest** — unit test runner via `test:unit:web:enzyme-free`
- **Prettier** — code formatting (printWidth 120, 2-space indent, double quotes)

---

## Mendix Integration

### Widget Manifest
- **`src/presentation/widget/LoadingCanvas.xml`** — Mendix widget manifest
- **`src/package.xml`** — Widget package definition
- **`src/core/types/mx.ts`** — TypeScript declarations for Mendix framework
- **`src/typings/stcvn/`** — Generated Mendix widget typings

### Mendix Data API

The `src/infrastructure/adapters/mendixDataAdapter.ts` module bridges the widget to the Mendix Data API:

- **Loading**: Uses `mx.data.load()` and `mx.data.list()` to resolve object references
- **Saving**: Uses `mx.data.create()`, `mx.data.remove()`, and `mx.data.commit()` to persist packing plans
- **Dev fallback**: When `mx` is not available (local dev server), falls back to JSON parsing and localStorage

### PackingPlan Entity

See `docs/PACKING_PLAN_ENTITY.md` for the full entity design.

- **PackingPlan** (1 per TruckSelection) — stores the plan header
- **PackingPlanItem** (1-* per plan) — stores individual item positions
- **Save flow**: Find-or-create plan → Delete existing items → Create new items → Commit
- **Load flow**: Query PackingPlan → Query PackingPlanItems → Resolve associations → Deserialize

---

## Notes

- Domain rules and engines are framework-agnostic — they have no React or Mendix dependencies
- The `useCanvasState` and `useCanvasActions` hooks expose the state manager cleanly to React components
- The `Truck` business model uses metric units (meters, kg); the canvas view layer uses pixels
- The `src/core/utils/coordinates.ts` module provides conversion helpers used by all layers
- This architecture supports future export/import, undo/redo, and Mendix data sync
- The packing optimizer in `src/domain/packing/packingOptimizer.ts` uses a branch-and-bound algorithm for optimal placement
src/infrastructure/adapters/__tests__/stateAdapter.spec.ts
src/presentation/components/__tests__/CargoCard.spec.tsx
```

### Layer-Specific Testing

| Layer | Coverage Target | Test Type |
|-------|-----------------|-----------|
| Core | 100% | Pure function tests |
| Domain | 95% | Unit tests for rules and engines |
| State | 90% | State transition tests |
| Infrastructure | 80% | Adapter tests with mocks |
| Presentation | 70% | Component render tests |

### Test Examples

**Core Layer:**
```typescript
describe("meterToPixel", () => {
  it("converts meters to pixels correctly", () => {
    expect(meterToPixel(1.2, 50)).toBe(60);
  });
});
```

**Domain Layer:**
```typescript
describe("validateAll", () => {
  it("returns valid for items within bounds", () => {
    const result = validateAll(items, bounds);
    expect(result.valid).toBe(true);
  });
});
```

**State Layer:**
```typescript
describe("CanvasStateManager", () => {
  it("tracks history for undo/redo", () => {
    manager.setState(state1);
    manager.setState(state2);
    manager.undo();
    expect(manager.getState()).toEqual(state1);
  });
});
```
│   (infrastructure/)   │
└───────────────────────┘
```

### Key Constraints

1. **Core has zero project dependencies** — only external libraries (big.js)
2. **Domain has zero framework dependencies** — no React, no Mendix, no browser APIs
3. **Infrastructure is the only Mendix gateway** — no Mendix imports elsewhere
4. **State orchestrates domain** — doesn't contain business logic
5. **Presentation is thin** — components are pure, hooks delegate to state/domain

### Anti-Patterns to Avoid

| Anti-Pattern | Description | Solution |
|--------------|-------------|----------|
| Domain importing React | Domain layer has React dependencies | Move to Presentation |
| Domain importing Mendix | Domain layer has Mendix dependencies | Move to Infrastructure |
| UI containing business logic | Components have business rules | Move to Domain |
| State containing business logic | State has validation/calculation logic | Move to Domain |
| Infrastructure in UI | Components call Mendix directly | Use container/component pattern |
| Circular dependencies | Layer A imports B, B imports A | Introduce Shared Kernel |
### Hooks (src/presentation/hooks/)

| Hook | Purpose |
|------|---------|
| useTruckCanvas.ts | Main hook that wires engines + state together |
| useCanvasState.ts | Subscribes to CanvasStateManager |
| useCanvasActions.ts | Wraps CanvasActionDispatcher methods |
| useMouseEvents.ts | Attaches mousemove/mouseup/blur listeners |
| coordinateRule.ts | Converts browser coordinates to canvas coordinates |

### Components (src/presentation/components/)

| Component | Purpose |
|-----------|---------|
| CargoCard.tsx | Renders single cargo item with interactions |
| CargoList.tsx | Renders available cargo items with drag-drop |
| CargoPopup.tsx | Shows cargo details popup |
| CargoTooltip.tsx | Shows cargo tooltip on hover |
| GridOverlay.tsx | Renders grid lines on canvas |
| RotationHandle.tsx | Rotation handle for 90° rotation |
| mendixMappers.ts | toPlainObject, extractTruckData, extractTransportOrderData | Object mapping |
| mendixSchema.ts | Entity/association/attribute constants | Schema definitions |

### Data Adapters (src/infrastructure/adapters/)

| File | Functions | Purpose |
|------|-----------|---------|
| cargoAdapter.ts | packingUnitToCargoItem, transportOrdersToCargoItems, applyPackingUnitData | Cargo mapping |
| truckAdapter.ts | truckSelectionToTruckItem, truckToTruckItem, computeScale | Truck mapping |
| stateAdapter.ts | serializePlan, deserializePlan | State serialization |
| cargoLoader.ts | loadCargoItems | Load cargo from Mendix |
| truckLoader.ts | loadTruckAndScale, loadTruckItem | Load truck from Mendix |
| transportOrderMeta.ts | buildTransportOrderMeta | Load TO metadata |
| planRepository.ts | loadPackingPlan, savePackingPlan | Plan persistence |
- `dispatch(action)` — Routes actions to appropriate handlers
- Orchestrates domain engines (DragEngine, CollisionEngine, SnapEngine)
- Validates results using domain rules
- Updates state via StateManager

### Action Types
```typescript
export type CanvasAction =
  | { type: "SELECT"; ids: string[] }
  | { type: "DESELECT" }
  | { type: "SET_ACTIVE_ITEM"; id: string | null }
  | { type: "START_DRAG"; activeId: string; mouse: Point }
  | { type: "DRAG_MOVE"; mouse: Point }
  | { type: "END_DRAG" }
  | { type: "ROTATE"; itemId: string }
  | { type: "ADD_ITEM"; item: CargoItem }
  | { type: "SET_ITEMS"; items: CargoItem[] }
  | { type: "REMOVE_ITEM"; baseId: string }
  | { type: "UNDO" }
  | { type: "REDO" };
```
  const withoutPrefix = id.slice(CARGO_ID_PREFIX.length);
  const dashIndex = withoutPrefix.lastIndexOf("-");
  if (dashIndex > 0 && /^\d+$/.test(withoutPrefix.slice(dashIndex + 1))) {
    return parseInt(withoutPrefix.slice(dashIndex + 1), 10);
  }
  return 0;
};
```

---

## Domain Layer (src/domain/)

### Purpose

The Domain layer is the **heart of the application**. It contains all business logic: validation rules, geometry calculations, packing algorithms, and interaction engines. This layer has **zero dependencies** on React, Mendix, or browser APIs.

### Directory Structure

```
src/domain/
├── rules/                         # Pure business rules
│   ├── boundaryRules.ts           # clamp, getCanvasBounds, getTruckBounds
│   ├── geometryRules.ts           # overlaps, isInsideBounds, findCollisions
│   ├── validationRules.ts         # validateItem, validateAll, validateLoadMeters
│   ├── rotationRules.ts           # rotate90, getRotatedScreenSize, rotateKeepingCenter
│   ├── dragRules.ts               # calculateDragPosition
│   └── snapRules.ts               # snapToGrid, snapPosition
├── engines/                       # Business engines (use domain rules)
│   ├── DragEngine.ts              # Drag behavior with collision/snap resolution
│   ├── CollisionEngine.ts         # Collision detection and resolution
│   ├── SnapEngine.ts              # Grid snapping with bounds
│   └── DragState.ts               # Drag state interface
└── packing/                       # Packing optimization feature
    ├── packingRules.ts            # packCargoIntoBounds, autoLoadCargoUnits
    └── packingOptimizer.ts        # optimizePacking (exact solver)
```

### Rules

1. **Core-only dependencies** — Can ONLY import from `src/core/`
2. **Zero React dependencies** — No React, React DOM, or React hooks
3. **Zero Mendix dependencies** — No mx.data, MxObject, or Mendix APIs
4. **Zero browser dependencies** — No window, document, or DOM APIs
5. **Pure and testable** — All code must be unit testable without mocks

### Directory Structure

```
src/core/
├── types/                         # Pure type definitions
│   ├── geometry.ts                # Point, RectLike, Rotation, Size, Rectangle
│   ├── mx.ts                      # Mendix type declarations (MxData, MxObject)
│   └── viewModels/                # View model interfaces
│       ├── CargoItem.ts           # Cargo item view model
│       └── TruckItem.ts           # Truck item view model
├── utils/                         # Pure utility functions
│   ├── coordinates.ts             # meterToPixel, pixelToMeter
│   └── cargoId.ts                 # toCargoId, fromCargoId, getCargoInstanceIndex
└── constants/                     # Application constants
    ├── canvas.ts                  # Canvas dimensions, grid size, rotation step
    ├── card.ts                    # Card border widths and colors
    ├── cargoList.ts               # Cargo list panel styles
    ├── rotationHandle.ts          # Rotation handle styles
    └── theme.ts                   # Theme colors
```

### Rules

1. **Zero project dependencies** — Core cannot import from Domain, State, Infrastructure, or Presentation
2. **Pure functions only** — All utilities must be pure (no side effects)
3. **No framework dependencies** — No React, Mendix, or browser APIs
4. **Fully testable** — All code must be testable without mocks

Traditional Clean Architecture enforces strict layer isolation, but this can be impractical for React applications where:
- Hooks need direct access to domain engines for performance
- Pure utility functions are needed across all layers
- The domain should be the center of the application

Our approach combines:
- **Clean Architecture** principles for layer separation
- **Domain-Driven Design** focus on business logic
- **Pragmatic React patterns** for state management