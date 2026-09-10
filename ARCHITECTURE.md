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

Traditional Clean Architecture enforces strict layer isolation, but this is impractical for a single React/Mendix widget. The pragmatic version keeps the domain at the center with zero framework dependencies while allowing:

- Hooks to reach domain engines directly for performance (no redundant indirection).
- Pure utilities + shared types to be used by every layer through the Core Shared Kernel.
- The State layer to own a real, unit-testable interaction machine (manager + dispatcher + engines).

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
export interface Point {
  x: number;
  y: number;
}
export interface Size {
  length: number;
  width: number;
}
export interface Positionable {
  x: number;
  y: number;
}
export interface Sizeable {
  length: number;
  width: number;
}
export interface Rotatable {
  rotation: Rotation;
}
export interface RectLike extends Positionable, Sizeable {}
export interface GeometryItem extends Positionable, Sizeable, Rotatable {}
export interface Rectangle {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
export type Rotation = 0 | 90 | 180 | 270;
```

#### Truck.ts
```typescript
export interface Truck {
  id: string;
  code: string;
  internalLengthMeter: number;
  internalWidthMeter: number;
  internalHeightMeter: number;
  maxPayloadKg: number;
  axleCount: number;
  truckType: "DryVan" | "Reefer" | "Flatbed" | "Container" | "Curtainsider";
  maxLoadMeters?: number;
}
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

---

## Domain Layer (src/domain/)

### Purpose

The Domain layer is the **heart of the application**. It contains all business logic: validation rules, geometry calculations, packing algorithms, and interaction engines. This layer has **zero dependencies** on React, Mendix, or browser APIs.

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
├── CanvasState.ts # State interface definition
├── CanvasStateManager.ts # State management with undo/redo
├── CanvasStateListener.ts # Listener type for subscriptions
├── CanvasActionDispatcher.ts # Action routing and orchestration
└── CanvasController.ts            # Interaction machine facade (owns manager + dispatcher + engines)`n├── CanvasController.ts            # Interaction machine facade (owns manager + dispatcher + engines)

````

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
````

#### CanvasStateManager

- `getState()` — Returns deep-cloned current state
- `setState(nextState)` — Updates state with history tracking
- `updateState(update)` — Updates state via function
- `setStateTransient(nextState)` — Updates state without history (for drag frames)
- `subscribe(listener)` — Subscribes to state changes
- `undo()` — Undoes last state change
- `redo()` — Redoes last undone change

#### CanvasActionDispatcher

#### CanvasController

The main facade for the interaction machine. Owns the state manager, action dispatcher, and domain engines (DragEngine, CollisionEngine, SnapEngine). Hooks are thin React adapters over this controller.

- `getState()` — Returns current state from the manager
- `subscribe(listener)` — Subscribes to state changes
- `dispatch(action)` — Routes actions to the dispatcher
- `startDrag(activeId, mouse)` — Begins a drag operation
- `move(mouse)` — Updates drag position
- `endDrag()` — Ends drag operation
- `rotate(itemId)` — Rotates an item
- `addItem(item)` — Adds item to canvas
- `setItems(items)` — Replaces all items
- `removeItem(baseId)` — Removes item by base ID
- `undo()` / `redo()` — History navigation

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

| File                  | Functions                                                                                | Purpose                       |
| --------------------- | ---------------------------------------------------------------------------------------- | ----------------------------- |
| mendixRuntime.ts      | isMendixRuntime, getMx, getObjectGuid, isMxObject, setMxAttribute, setMxDecimalAttribute | Runtime detection and helpers |
| mendixLoaders.ts      | loadMendixObject, loadMendixObjects, loadMendixList, executeMendixAction                 | Data loading                  |
| mendixAssociations.ts | getReferenceGuids, filterByAssociationGuid                                               | Association handling          |

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

| Layer              | Core | Domain | State | Infrastructure | Presentation |
| ------------------ | ---- | ------ | ----- | -------------- | ------------ |
| **Core**           | ✅   | ❌     | ❌    | ❌             | ❌           |
| **Domain**         | ✅   | ✅     | ❌    | ❌             | ❌           |
| **State**          | ✅   | ✅     | ✅    | ❌             | ❌           |
| **Infrastructure** | ✅   | ✅     | ❌    | ✅             | ❌           |
| **Presentation**   | ✅   | ✅     | ✅    | ❌             | ✅           |

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
│ │
│ ▼
│ Domain Engine
│ │
│ ▼
│ Domain Rules
│ │
▼ ▼
Re-render State Update

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

src/core/utils/**tests**/coordinates.spec.ts
src/domain/rules/**tests**/validationRules.spec.ts
src/domain/engines/**tests**/DragEngine.spec.ts
src/state/**tests**/CanvasStateManager.spec.ts

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
- **`src/core/types/mx.d.ts`** — TypeScript declarations for Mendix framework
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