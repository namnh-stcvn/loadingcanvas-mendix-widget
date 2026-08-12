# LoadingCanvas

[Mendix pluggable widget for interactive truck loading and packing. Supports pallet and box positioning, 90° rotation, grid snapping, real-time validation, and loading/saving packing plans.]

## Overview

**LoadingCanvas** is a Mendix pluggable widget that provides an interactive canvas for drag-and-drop trailer loading planning. Users can place, drag, rotate, and validate cargo items (pallet and boxes) within a trailer boundary. The widget supports grid snapping, real-time collision validation, and saving/loading packing plans via the Mendix Data API.

Built with **React 19**, **TypeScript**, and **Vite**, the widget follows a modular architecture with strict separation of concerns between UI, state management, business logic (engines), and domain rules.

## Features

- **Interactive canvas** for placing and arranging cargo items
- **Drag-and-drop** functionality with HTML5 DnD
- **90° rotation** support for cargo items
- **Grid snapping** for precise positioning
- **Real-time collision detection** and overlap validation
- **Boundary validation** to keep items within trailer limits
- **Load/ save packing plans** via Mendix Data API
- **Undo/redo history** for drag operations
- **Info panel** displaying validation status and item details
- **Grid overlay** for visual guidance
- **Responsive design** with dark mode support

## Architecture

The widget follows a strict layered architecture:

| Layer                 | Description                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **UI Layer**          | React components and hooks (`LoadingCanvas`, `LoadingCanvasContainer`, `CargoCard`, `RotationHandle`, `GridOverlay`, `PalletList`) |
| **State Management**  | `CanvasStateManager` (single source of truth) and `CanvasActionDispatcher` (action routing)                                        |
| **Engine Layer**      | `DragEngine`, `CollisionEngine`, `SnapEngine`, `ValidationEngine` (pure business logic)                                            |
| **Domain Rule Layer** | Geometry, snap, validation, coordinate, rotation, drag, and boundary helpers                                                       |
| **Adapter Layer**     | `cargoAdapter`, `trailerAdapter`, `stateAdapter`, `mendixDataAdapter` (Mendix data integration)                                    |
| **Data Model Layer**  | Business models (`Trailer`), view models (`CargoItem`, `TrailerItem`), and shared types                                            |
| **Constants Layer**   | Canvas dimensions, grid, rotation, snap, card styling, and theme values                                                            |

## Project Structure

```
src/
├── App.tsx                          # Root React component
├── main.tsx                         # Vite entry point
├── MyWidget.tsx                     # Legacy widget container (deprecated)
├── index.css                        # Global styles
│
├── components/                      # UI components
│   ├── CargoCard.tsx                # Renders a single cargo item
│   ├── GridOverlay.tsx              # Visual grid on canvas
│   ├── PalletList.tsx               # Debug view: draggable cargo items
│   └── RotationHandle.tsx           # Rotation handle UI
│
├── constants/                       # Configuration values
│   ├── canvas.ts                    # Canvas dimensions, grid, rotation, snap
│   ├── card.ts                      # Card border styles
│   └── theme.ts                     # Canvas background color
│
├── domain/                          # Geometry and validation rules
│   ├── boundaryRules.ts
│   ├── coordinateRules.ts
│   ├── dragRules.ts
│   ├── geometryRules.ts
│   ├── rotationRules.ts
│   ├── snapRules.ts
│   └── validationRules.ts
│
├── engines/                         # Core business logic engines
│   ├── DragEngine.ts
│   ├── CollisionEngine.ts
│   ├── SnapEngine.ts
│   └── ValidationEngine.ts
│
├── hooks/                           # React hooks
│   ├── useTrailerCanvas.ts          # Main hook: wires engines & state
│   ├── useCanvasState.ts            # Subscribes to CanvasStateManager
│   ├── useCanvasActions.ts          # Wraps CanvasActionDispatcher
│   └── useMouseEvents.ts            # Global mouse event listeners
│
├── models/                          # Business models
│   └── Trailer.ts                   # Trailer dimensions and properties
│
├── state/                           # State management
│   ├── CanvasState.ts               # Canvas state interface
│   ├── CanvasStateManager.ts        # Single source of truth
│   ├── CanvasActionDispatcher.ts    # Action routing
│   ├── CanvasStateListener.ts
│   └── DragState.ts
│
├── types/                           # TypeScript type definitions
│   ├── geometry.ts                  # Point, Size, Rectangle, Rotation
│   └── mendix.d.ts                  # Mendix widget framework types
│
├── viewModels/                      # View models
│   ├── CargoItem.ts                 # Cargo item view model
│   └── TrailerItem.ts               # Trailer view model
│
├── adapters/                        # Mendix data adapters
│   ├── cargoAdapter.ts              # PackingUnit ↔ CargoItem conversion
│   ├── trailerAdapter.ts            # TruckSelection ↔ TrailerItem conversion
│   ├── stateAdapter.ts              # Packing plan serialization
│   └── mendixDataAdapter.ts         # Mendix Data API bridge
│
├── widget/                          # Widget entry points
│   ├── index.ts                     # Mendix widget entry point
│   ├── LoadingCanvas.tsx            # Main widget component
│   ├── LoadingCanvas.container.tsx  # Mendix bridge component
│   └── LoadingCanvas.properties.ts  # Property definitions
│
├── fixtures/                        # Test fixtures
│   └── InitialCargoItem.ts
│
└── __tests__/                       # Test files
    └── setup.ts
```

## Data Flow

1. **LoadingCanvasContainer** receives props from Mendix (TruckSelection GUID, TransportOrder list, canvas dimensions, callbacks)
2. Container loads data via `mendixDataAdapter.ts`:
   - Loads TruckSelection data → computes scale
   - Loads TrailerItem view model
   - Loads CargoItem[] for pallet list (available items)
   - Loads CargoItem[] for saved packing plan
3. Container passes view models to `LoadingCanvas` via `LoadingCanvasViewModelProps`
4. **LoadingCanvas** initializes `useTrailerCanvas` hook with view models
5. React renders from current `CanvasState` — items, active item, selected items, validation status
6. User interaction (mousedown on cargo card) triggers drag operations
7. `CanvasActionDispatcher` routes actions to engines (drag, snap, collision, validation)
8. `CanvasStateManager` notifies subscribers; React re-renders with updated state
9. User clicks "Save Plan" → packing plan saved to Mendix entities

## Installation

```bash
# Install dependencies
npm install

# If using NPM v7.x.x, use legacy peer deps
npm install --legacy-peer-deps
```

## Development

```bash
# Start development server with HMR
npm start

# Or use the web dev server
npm dev

# Watch for code changes and auto-bundle the widget
# Changes will be included in the Mendix test project deployment folder
```

## Available Scripts

| Script               | Description                                      |
| -------------------- | ------------------------------------------------ |
| `npm start`          | Start pluggable-widgets-tools development server |
| `npm dev`            | Start Vite web development server                |
| `npm run build`      | Build the widget for production                  |
| `npm run lint`       | Lint the codebase                                |
| `npm run lint:fix`   | Fix linting issues automatically                 |
| `npm test`           | Run unit tests                                   |
| `npm run test:unit`  | Run unit tests (Jest/Vitest)                     |
| `npm run prerelease` | Run lint before release                          |
| `npm run release`    | Release the widget                               |

## Technology Stack

- **React 19** with `@vitejs/plugin-react` (Oxc-based Fast Refresh)
- **TypeScript 6** with strict mode
- **Vite** — build tool and dev server with HMR
- **ESLint 10** with `typescript-eslint`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh`
- **Vitest** — test runner with jsdom environment
- **Prettier** — code formatting (120 print width, 2-space indent, single quotes, trailing commas)
- **Rollup** — Mendix widget build configuration

## Mendix Integration

### Widget Manifest

- **`widget.xml`** — Mendix widget manifest defining properties, metadata, and entry point
- **`package.xml`** — Widget package definition (id, name, version, author)

### Mendix Data API

The widget integrates with Mendix 10 via the `mx.data` API:

- **Loading**: Uses `mx.data.load()` and `mx.data.list()` to resolve object references
- **Saving**: Uses `mx.data.create()`, `mx.data.remove()`, and `mx.data.commit()` to persist packing plans
- **Dev fallback**: When `mx` is not available (Vite dev server), falls back to JSON parsing and localStorage

### PackingPlan Entity

See `docs/PACKING_PLAN_ENTITY.md` for the full entity design:

- **PackingPlan** (1 per TruckSelection) — stores the plan header
- **PackingPlanItem** (1-\* per plan) — stores individual item positions
- **Save flow**: Delete existing items → Create new items → Commit
- **Load flow**: Query PackingPlan → Query PackingPlanItems → Deserialize to CargoItems

## Contributing

1. Install NPM package dependencies: `npm install` (or `npm install --legacy-peer-deps` for NPM v7.x.x)
2. Run `npm start` to watch for code changes
3. Follow the architecture guidelines in `ARCHITECTURE.md`
4. Write pure functions for domain rules and engines (no React/DOM dependencies)
5. Ensure TypeScript strict mode compliance
6. Submit pull requests with appropriate tests

## License

[Apache-2.0](LICENSE) © 2026 STCVN
