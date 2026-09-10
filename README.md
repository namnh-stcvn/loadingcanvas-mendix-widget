# LoadingCanvas Widget

## Overview

**LoadingCanvas** is a Mendix pluggable widget for interactive truck loading and packing planning. It provides an interactive canvas where users can drag, rotate, and validate cargo items (pallet/box) within a truck boundary. The widget supports grid snapping, real-time collision detection, and integration with Mendix Data API for saving/loading packing plans.

Built with **React 18.2** (pinned via package.json `overrides`/`resolutions`, automatic JSX runtime), **TypeScript**, and the **Mendix pluggable-widgets-tools** toolchain. See [ARCHITECTURE.md](ARCHITECTURE.md) for the detailed architecture documentation.

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

See [ARCHITECTURE.md](ARCHITECTURE.md) for the complete architecture documentation, including:

- Layer structure (Core, Domain, State, Infrastructure, Presentation)
- Dependency direction and import rules
- Project structure and directory layout
- Data flow diagrams
- Testing strategy

---

## Project Structure

See [ARCHITECTURE.md](ARCHITECTURE.md) for the complete directory structure. The codebase follows a 5-layer architecture:

- `src/core/` — Shared kernel (types, utilities, constants)
- `src/domain/` — Business logic (rules, engines, packing)
- `src/state/` — State management (CanvasController, StateManager, ActionDispatcher)
- `src/infrastructure/` — External integrations (Mendix bridge, adapters)
- `src/presentation/` — UI layer (hooks, components, widget)

---

## Data Flow

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed data flow diagrams, including:

- User interaction flow (drag, rotate, validate)
- Data loading flow (Mendix → Infrastructure → Domain → State → Presentation)
- Save flow (State → Infrastructure → Mendix)
- Auto Load flow (Domain packing rules → State update → UI re-render)

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
