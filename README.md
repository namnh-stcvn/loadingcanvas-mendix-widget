# LoadingCanvas Widget

## Overview

**LoadingCanvas** is a Mendix pluggable widget for interactive truck loading and packing planning. It provides an interactive canvas where users can drag, rotate, and validate cargo items (pallet/box) within a trailer boundary. The widget supports grid snapping, real-time collision detection, and integration with Mendix Data API for saving/loading packing plans.

Built with **React 19**, **TypeScript**, and **Vite**, the widget follows a strict layered architecture with clear separation of concerns between UI, state management, business logic, and domain rules.

---

## Features

- **Interactive Canvas** for placing and arranging cargo items
- **Drag-and-drop** functionality with HTML5 DnD
- **90° rotation** support for cargo items
- **Grid snapping** for precise positioning
- **Real-time collision detection** and overlap validation
- **Boundary validation** to keep items within trailer limits
- **Load/save packing plans** via Mendix Data API
- **Undo/redo history** for drag operations
- **Info panel** displaying validation status and item details
- **Grid overlay** for visual guidance
- **Responsive design** with dark mode support
- **Framework-agnostic engines** (drag, collision, snap, validation)
- **Mendix 10 integration** via `mx.data` API
- **Metric/imperial unit support** (meters/pixels conversion)

---

## Architecture

The widget follows a **strict layered architecture**:

### 1. UI Layer

- React components: `LoadingCanvas`, `CargoCard`, `GridOverlay`, `PalletList`
- Hooks: `useTrailerCanvas`, `useCanvasState`, `useMouseEvents`

### 2. State Management

- `CanvasStateManager` (single source of truth)
- `CanvasActionDispatcher` (action routing)
- Undo/redo history implementation

### 3. Engine Layer

- **DragEngine**: Manages drag state and position calculations
- **CollisionEngine**: Detects overlaps and resolves conflicts
- **SnapEngine**: Handles grid/edge/alignment snapping
- **ValidationEngine**: Validates item positions and dimensions

### 4. Domain Rule Layer

- Pure functions for geometry, rotation, validation, and coordinate conversion
- No React/DOM dependencies for testability

### 5. Adapter Layer

- **cargoAdapter**: Converts Mendix data to view models
- **trailerAdapter**: Converts TruckSelection data to TrailerItem
- **mendixDataAdapter**: Bridges to Mendix Data API

### 6. Data Model Layer

- Business models: `Trailer`, `CargoItem`, `TrailerItem`
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
│   ├── PalletList.tsx         # Debug view: draggable cargo items
│   └── RotationHandle.tsx     # Rotation handle UI
├── constants/                 # Configuration values
│   ├── canvas.ts              # Canvas dimensions, grid, rotation
│   ├── card.ts                # Card border styles
│   └── theme.ts               # Canvas background color
├── domain/                    # Geometry and validation rules
│   ├── boundaryRules.ts       # Clamp values within range
│   ├── coordinateRules.ts     # Meter/pixel conversion
│   ├── dragRules.ts           # Drag position calculations
│   ├── geometryRules.ts       # Intersection checks
│   ├── rotationRules.ts       # 90° rotation logic
│   ├── snapRules.ts           # Snapping logic
│   └── validationRules.ts     # Validation rules
├── engines/                   # Core business logic engines
│   ├── DragEngine.ts          # Drag state management
│   ├── CollisionEngine.ts     # Collision detection
│   ├── SnapEngine.ts          # Snapping calculations
│   └── ValidationEngine.ts    # Validation engine
├── hooks/                     # React hooks
│   ├── useTrailerCanvas.ts    # Main hook: wires engines & state
│   ├── useCanvasState.ts      # Subscribes to state manager
│   ├── useCanvasActions.ts    # Wraps action dispatcher
│   └── useMouseEvents.ts      # Global mouse event listeners
├── models/                    # Business models
│   └── Trailer.ts             # Trailer dimensions and properties
├── state/                     # State management
│   ├── CanvasState.ts         # Canvas state interface
│   ├── CanvasStateManager.ts  # Single source of truth
│   ├── CanvasActionDispatcher.ts # Action routing
│   └── DragState.ts           # Internal drag tracking
├── types/                     # TypeScript type definitions
│   ├── geometry.ts            # Point, Size, Rectangle types
│   └── mx.d.ts                # Mendix widget framework types
├── adapters/                  # Mendix data adapters
│   ├── cargoAdapter.ts        # PackingUnit ↔ CargoItem conversion
│   ├── trailerAdapter.ts      # TruckSelection ↔ TrailerItem
│   ├── stateAdapter.ts        # Packing plan serialization
│   └── mendixDataAdapter.ts   # Mendix Data API bridge
├── widget/                    # Widget entry points
│   ├── index.ts               # Mendix widget entry point
│   ├── LoadingCanvas.container.tsx # Mendix bridge component
│   └── LoadingCanvas.properties.ts # Property definitions
├── fixtures/                  # Test fixtures
│   └── InitialCargoItem.ts    # Debug fixture
└── __tests__/                 # Test files
```

---

## Data Flow

1. **LoadingCanvasContainer** receives props from Mendix (TruckSelection GUID, TransportOrder list, canvas dimensions, callbacks)
2. Loads data via `mendixDataAdapter.ts`:
   - Loads TruckSelection data → computes scale
   - Loads TrailerItem view model
   - Loads CargoItem[] for pallet list (available items)
   - Loads CargoItem[] for saved packing plan
3. Passes view models to `LoadingCanvas` via `LoadingCanvasViewModelProps`
4. **LoadingCanvas** initializes `useTrailerCanvas` hook with view models
5. React renders from current `CanvasState` — items, active item, selected items, validation status
6. User interaction (mousedown on cargo card) triggers drag operations
7. `CanvasActionDispatcher` routes actions to engines (drag, snap, collision, validation)
8. `CanvasStateManager` notifies subscribers; React re-renders with updated state
9. User clicks "Save Plan" → packing plan saved to Mendix entities

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

| Script          | Description                              |
| --------------- | ---------------------------------------- |
| `npm start`     | Start pluggable-widgets-tools dev server |
| `npm dev`       | Start Vite web development server        |
| `npm run build` | Build the widget for production          |
| `npm run lint`  | Lint the codebase                        |
| `npm run test`  | Run unit tests                           |

---

## Technology Stack

- **React 19** with `@vitejs/plugin-react` (Oxc-based Fast Refresh)
- **TypeScript 6** with strict mode
- **Vite** — build tool and dev server with HMR
- **ESLint 10** with `typescript-eslint`, `eslint-plugin-react-hooks`
- **Vitest** — test runner with jsdom environment
- **Prettier** — code formatting (120 print width, 2-space indent)
- **Rollup** — Mendix widget build configuration

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
- Save flow: Delete existing items → Create new items → Commit
- Load flow: Query PackingPlan → Query PackingPlanItems → Deserialize to CargoItems

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
