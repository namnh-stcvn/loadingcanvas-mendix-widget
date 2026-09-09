# LoadingCanvas Widget

## Overview

**LoadingCanvas** is a Mendix pluggable widget for interactive truck loading and packing planning. It provides an interactive canvas where users can drag, rotate, and validate cargo items (pallet/box) within a truck boundary. The widget supports grid snapping, real-time collision detection, and integration with Mendix Data API for saving/loading packing plans.

Built with **React 18.2** (pinned via package.json `overrides`/`resolutions`, automatic JSX runtime), **TypeScript**, and the **Mendix pluggable-widgets-tools** toolchain, the widget follows a strict layered architecture with clear separation of concerns between UI, state management, business logic, and domain rules.

---

## Features

- **Interactive Canvas** for placing and arranging cargo items
- **Drag-and-drop** functionality with HTML5 DnD
- **90° rotation** support for cargo items
- **Grid snapping** for precise positioning
- **Real-time collision detection** and overlap validation
- **Boundary validation** to keep items within truck limits
- **Proportional truck frame** — the frame matches the selected truck's internal length × width (meters → pixels via the measured uniform scale) and is centered vertically in the reserved canvas band; the truck image spans the full canvas width behind the frame
- **Frame-based validation** — drag, rotate, add, and Auto Load all validate against the proportional frame bounds instead of the full canvas band
- **Rotation-aware load-meter (LM) validation** — counts a 90°/270° rotated cargo by the length it actually occupies along the truck
- **Load/save packing plans** via Mendix Data API, with save failures surfaced in the info panel instead of failing silently
- **Auto Load** button that repacks all cargo tightly into the truck (First-Fit Decreasing with optional 90° rotation)
- **Remove cargo items** — remove a transport order's cargo from the canvas, returning it to the available cargo list
- **Undo/redo history** for committed state transitions (per-gesture granularity for drags; one undo step covers a full drag operation)
- **Info panel** displaying validation status and item details
- **Grid overlay** for visual guidance
- **Responsive design** with dark mode support
- **Framework-agnostic engines** (drag, collision, snap) plus pure domain validation rules
- **Mendix 10 integration** via `mx.data` API
- **Metric/imperial unit support** (meters/pixels conversion)

---

## Architecture

The widget follows a **strict layered architecture**:

### 1. UI Layer

- React components: `LoadingCanvas`, `CargoCard`, `GridOverlay`, `CargoList`
- Hooks: `useTruckCanvas`, `useCanvasState`, `useMouseEvents`

### 2. State Management

- `CanvasStateManager` (single source of truth)
- `CanvasActionDispatcher` (action routing)
- Undo/redo history implementation

### 3. Engine Layer

- **DragEngine**: Manages drag state and position calculations
- **CollisionEngine**: Detects overlaps and resolves conflicts
- **SnapEngine**: Handles grid/edge/alignment snapping
- _(validation no longer has a dedicated engine — the dispatcher validates directly via `domain/validationRules.ts`)_

### 4. Domain Rule Layer

- Pure functions for geometry, rotation, validation, and coordinate conversion
- No React/DOM dependencies for testability

### 5. Adapter Layer

- **cargoAdapter**: Converts Mendix data to view models
- **truckAdapter**: Converts TruckSelection data to TruckItem
- **mendixDataAdapter**: Bridges to Mendix Data API

### 6. Data Model Layer

- Business models: `Truck`, `CargoItem`, `TruckItem`
- Shared types: `Point`, `Rectangle`, `Rotation`

### 7. Constants Layer

- Configuration values: canvas dimensions, grid size, rotation steps

---

## Project Structure

```
src/
├── LoadingCanvas.tsx          # Main widget component
├── LoadingCanvas.editorConfig.ts # Mendix editor configuration
├── LoadingCanvas.editorPreview.tsx # Studio Pro preview
├── LoadingCanvas.xml          # Mendix widget manifest
├── package.xml                # Widget package definition
├── components/                # UI components
│   ├── CargoCard.tsx          # Renders a single cargo item
│   ├── GridOverlay.tsx        # Visual grid on canvas
│   ├── CargoList.tsx          # Debug palette: individual cargo chips (one per packing unit)
│   └── RotationHandle.tsx     # Rotation handle UI
├── constants/                 # Configuration values
│   ├── canvas.ts              # Canvas dimensions, grid, rotation
│   ├── card.ts                # Card border styles
│   └── theme.ts               # Canvas background color
│ ├── domain/                    # Geometry and validation rules
│   ├── boundaryRules.ts       # Clamp values within range
│   ├── coordinateRules.ts     # Meter/pixel conversion (pure; DOM-free)
│   ├── dragRules.ts           # Drag position calculations
│   ├── geometryRules.ts       # Intersection checks
│   ├── packingOptimizer.ts    # Exact anytime auto-packing (max units, then min load meters) for the Auto Load button
│   ├── packingRules.ts        # Auto-packing (First-Fit Decreasing) for the Auto Load button
│   ├── rotationRules.ts       # 90° rotation logic
│   ├── snapRules.ts           # Snapping logic
│   ├── cargoIdentity.ts       # cargo- ID prefix helpers (toCargoId/fromCargoId)
│   └── validationRules.ts     # Validation rules
├── engines/                   # Core business logic engines
│   ├── DragEngine.ts          # Drag state management
│   ├── DragState.ts           # Engine-internal drag tracking
│   ├── CollisionEngine.ts     # Collision detection
│   └── SnapEngine.ts          # Snapping calculations
├── hooks/                     # React hooks
│   ├── useTruckCanvas.ts      # Main hook: wires engines & state
│   ├── useCanvasState.ts      # Subscribes to state manager
│   ├── useCanvasActions.ts    # Wraps action dispatcher
│   ├── useMouseEvents.ts      # Global mouse event listeners
│   └── coordinateRule.ts      # Browser→canvas coordinate conversion (DOM, kept out of domain)
├── models/                    # Business models
│   └── Truck.ts               # Truck dimensions and properties
├── state/                     # State management
│   ├── CanvasState.ts         # Canvas state interface
│   ├── CanvasStateManager.ts  # Single source of truth
│   ├── CanvasActionDispatcher.ts # Action routing
├── types/                     # TypeScript type definitions
│   ├── geometry.ts            # Point, Size, Rectangle types
│   └── mx.d.ts                # Mendix widget framework types
├── adapters/                  # Mendix data adapters
│   ├── cargoAdapter.ts        # PackingUnit ↔ CargoItem conversion
│   ├── truckAdapter.ts        # TruckSelection ↔ TruckItem
│   ├── stateAdapter.ts        # Packing plan serialization
│   └── mendixDataAdapter.ts   # Mendix Data API bridge
├── widget/                    # Widget entry points
│   ├── index.ts               # Mendix widget entry point
│   ├── LoadingCanvas.container.tsx # Mendix bridge component
│   └── LoadingCanvas.properties.ts # Property definitions
```

---

## Data Flow

1. **LoadingCanvasContainer** receives props from Mendix (TruckSelection GUID, TransportOrder list, canvas dimensions, callbacks)
2. Loads data via `mendixDataAdapter.ts`:
   - Loads TruckSelection data → computes scale
   - Loads TruckItem view model
   - Loads CargoItem[] for the available cargo list
   - Loads CargoItem[] for saved packing plan
3. Passes view models to `LoadingCanvas` via `LoadingCanvasViewModelProps`
4. **LoadingCanvas** initializes `useTruckCanvas` hook with view models
5. React renders from current `CanvasState` — items, active item, selected items, validation status
6. User interaction (mousedown on cargo card) triggers drag operations
7. `CanvasActionDispatcher` routes actions to engines (drag, snap, collision, validation)
8. `CanvasStateManager` notifies subscribers; React re-renders with updated state
9. User clicks "Save Plan" → packing plan saved to Mendix entities
10. User clicks "Auto Load" → `packCargoIntoBounds()` repacks every cargo (canvas + cargo list) flush into the truck frame: small/medium loads are solved exactly to maximize loaded units then minimize load meters, larger loads use a deterministic skyline fill; items that do not fit stay in the cargo list

Note: the truck frame is proportional to the selected truck's internal dimensions (length × width) and centered vertically in the reserved canvas band; cargo placement, rotation, and Auto Load are validated against this frame, not the full canvas band.

---

## Installation

```bash
# Install dependencies
npm install

# If using NPM v7.x.x, use legacy peer deps
npm install --legacy-peer-deps
```

---

## Development

```bash
# Start development server with HMR
npm start

# Or use the web dev server
npm dev

# Watch for code changes and auto-bundle the widget
# Changes will be included in the Mendix test project deployment folder
```

---

## Available Scripts

| Script          | Description                                  |
| --------------- | -------------------------------------------- |
| `npm start`     | Start pluggable-widgets-tools dev server     |
| `npm dev`       | Start pluggable-widgets-tools web dev server |
| `npm run build` | Build the widget for production              |
| `npm run lint`  | Lint the codebase                            |
| `npm run test`  | Run unit tests                               |

---

## Technology Stack

- **React 18.2** (pinned via package.json `overrides`/`resolutions`, automatic JSX runtime)
- **TypeScript 5.9** with strict mode (`erasableSyntaxOnly`, bundler module resolution)
- **@mendix/pluggable-widgets-tools v10** — build pipelines: bundle, dev server with HMR, lint, and unit tests
- **ESLint 9** (flat config) with `typescript-eslint` and `eslint-plugin-react-hooks`
- **Jest + ts-jest** — unit test runner (jsdom environment)
- **Prettier** — code formatting (120 print width, 2-space indent)
- **Rollup** — Mendix widget build configuration (via pluggable-widgets-tools defaults)

---

## Mendix Integration

### Widget Manifest

- `LoadingCanvas.xml` — Mendix widget manifest
- `package.xml` — Widget package definition

### Mendix Data API

- Uses `mx.data.load()` and `mx.data.list()` for loading
- Uses `mx.data.create()`, `mx.data.remove()`, and `mx.data.commit()` for saving
- Dev fallback: JSON parsing and localStorage when `mx` is unavailable

### PackingPlan Entity

- **PackingPlan** (1 per TruckSelection) — stores the plan header
- **PackingPlanItem** (1-* per plan) — stores individual item positions
- Save flow: Find-or-create plan → Delete existing items → Create new items (association-first, GUID-keyed pairing) → Commit; logs contextual warnings if associations cannot be resolved
- Load flow: Query PackingPlan → Query PackingPlanItems → Resolve TransportOrder associations via MxObject API → Deserialize to CargoItems

---

## Contributing

1. Install NPM package dependencies: `npm install` (or `npm install --legacy-peer-deps` for NPM v7.x.x)
2. Run `npm start` to watch for code changes
3. Follow the architecture guidelines in `ARCHITECTURE.md`
4. Write pure functions for domain rules and engines (no React/DOM dependencies)
5. Ensure TypeScript strict mode compliance
6. Submit pull requests with appropriate tests

---

## License

[Apache-2.0](LICENSE) © 2026 STCVN
