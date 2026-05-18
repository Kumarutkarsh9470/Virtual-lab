# Virtual Lab

A collaborative 2D physics sandbox built for university-level learning. Drop bodies, connect constraints, apply forces, and watch real physics unfold — all in the browser, no installation required for students.

---

## What it does

Virtual Lab lets you build and run +2 / first-year university physics experiments interactively:

- **Mechanics** — Atwood machines, monkey-rope problems, double-pulley systems, inclined planes with friction, wedge-block constraints
- **Oscillations** — spring-mass SHM with live KE tracking
- **Electrostatics** — Coulomb repulsion and attraction between charged bodies, real-time field-line overlay
- **Magnetism** — bar magnet dipole interactions with N/S pole visualisation
- **Kinematics** — projectile motion launcher at configurable angles

Every scenario is hand-crafted and loadable in one click from the **Experiment Library**.

---

## Tech stack

| Layer             | Technology        |
| ----------------- | ----------------- |
| UI framework      | React 19 + Vite 8 |
| Physics engine    | Matter.js 0.20    |
| Styling           | Tailwind CSS v4   |
| Icons             | Lucide React      |
| Charts (upcoming) | Recharts          |

---

## Getting started locally

### Prerequisites

- [Node.js](https://nodejs.org/) **v18 or higher** (v22 recommended)
- npm **v9 or higher** (comes with Node)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/Kumarutkarsh9470/Virtual-lab.git
cd Virtual-lab

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open your browser at the URL shown in the terminal (usually **http://localhost:5173**).

That's it — no backend, no database, no environment variables needed.

### Other commands

```bash
# Build for production (outputs to dist/)
npm run build

# Preview the production build locally
npm run preview

# Run the linter
npm run lint
```

---

## How to use

| Action              | How                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| Add a body          | Select a shape tool from the left toolbar, then click on the canvas                                             |
| Select / move       | Use the arrow tool, then drag bodies around                                                                     |
| Pan the canvas      | Hold middle mouse button and drag, or use the Hand tool                                                         |
| Zoom                | Scroll the mouse wheel                                                                                          |
| Connect bodies      | Pick Rope, Spring, Pivot or Motor from the toolbar, then click two bodies in sequence                           |
| Edit properties     | Select a body — the Properties panel opens on the right. Adjust mass, friction, charge, magnetic strength, etc. |
| Load an experiment  | Click the **book icon** at the top of the toolbar to open the Experiment Library                                |
| Toggle force arrows | Click the **Forces** button in the top header                                                                   |
| Pause / step        | Use the Pause and Step buttons in the header                                                                    |

---

## Project structure

```
src/
├── engine/
│   ├── world.js          # Matter.js engine & runner setup
│   ├── bodies.js         # Body creation (box, circle, wedge, incline, …)
│   ├── constraints.js    # Rope, spring, pivot, motor constraints
│   ├── forces.js         # Electrostatics, magnetics, Atwood tick logic
│   └── scenarios.js      # 10 preset +2 level physics experiments
├── renderer/
│   ├── camera.js         # Pan/zoom coordinate transforms
│   └── loop.js           # requestAnimationFrame draw loop
└── ui/
    ├── App.jsx            # Top-level layout & state
    ├── PhysicsCanvas.jsx  # Canvas mount + mouse interaction
    ├── Toolbar.jsx        # Left sidebar tool buttons
    ├── PropertyPanel.jsx  # Right sidebar body editor
    └── ScenarioPanel.jsx  # Experiment library modal
```

---

## Roadmap

- [ ] Phase 2 — Multiplayer collaboration via Socket.io
- [ ] Phase 3 — Live data graphs with Recharts (KE, PE, position vs time)
- [ ] Phase 4 — Server-authoritative physics for shared sessions
- [ ] Phase 5 — Student submission & grading flow

---

## License

MIT — free to use for academic and educational purposes.
