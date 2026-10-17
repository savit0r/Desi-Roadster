# 🏎️ Desi Roadster

> **An electrifying 2D side-scrolling arcade game set on chaotic Indian roads.**  
> Drive a futuristic Indian electric sports car that seamlessly transforms between road-driving and flight hover modes.

Built with **HTML5 Canvas**, **Vanilla JavaScript**, and **Vanilla CSS**. No backend, external game engines, or paid image assets required — all graphics, vehicles, roads, and skyline are rendered procedurally with high-performance Canvas vector operations.

---

## 📸 Overview & Key Features

- **Responsive Game Canvas**: Maintains a crisp 16:9 internal resolution (`960 × 540`) with responsive CSS letterbox fitting on any display.
- **Delta-Time Game Loop**: Decoupled physics powered by `requestAnimationFrame`, clamped to `0.1s` to prevent frame-spike anomalies during tab switching.
- **Multi-Layer Indian Parallax Scroller**:
  - *Twilight Indian Sky*: Deep violet-to-saffron gradient with a warm glowing sun and atmospheric horizon dust haze.
  - *Distant Skyline*: Pre-rendered silhouettes of Indian architectural landmarks (India Gate / archways, temple shikharas, modern glass towers, and telecom towers with blinking aircraft warning beacons).
  - *Roadside Elements*: Banyan and gulmohar tree canopies, highway billboard hoardings (*"CHAI POINT"*, *"DESI EV"*), and electric utility poles with hanging catenary power cables.
  - *Grand Trunk Highway*: Multi-lane asphalt, safety hazard curbs (yellow and black blocks), double-yellow central medians, and animated dashed white lane markers.
- **Transformable EV Roadster**:
  - **Road Mode**: Multi-lane steering, suspension bounce, and jumping over road hazards with gravity arcs and landing dust puffs.
  - **Flight Mode**: Retracts wheels into aerodynamic hover thruster pods, deploys cyan ion wings, engages free 2D VTOL navigation, and drains the EV battery.
  - **Regenerative Charging**: Driving on the road automatically recharges the battery pack.
- **Modern Cyber-Desi HUD & Overlay**: Distance meter, dynamic speedometer (km/h), real-time battery gauge, active mode indicator, and pause/start screen modals with frosted glass (`backdrop-filter`).

---

## 📁 File Structure & Responsibilities

```
Desi Roadster/
├── index.html           # Canvas container, responsive letterbox wrapper & DOM HUD/Start overlays
├── README.md            # Project documentation, controls, architecture & roadmap
├── css/
│   └── style.css        # Cyberpunk Indian arcade styling, HUD glassmorphism & button glow
└── js/
    ├── config.js        # Global configuration: physics, canvas metrics, speed & color tokens
    ├── input.js         # Input manager: continuous keys & single-frame trigger events
    ├── audio.js         # Procedural Web Audio API sound synthesizer with persistent mute
    ├── background.js    # Multi-layer parallax scroller: twilight sky, skyline, poles & road
    ├── player.js        # EV roadster entity: road physics, jumping, flight transform & procedural art
    ├── obstacles.js     # Indian traffic & animal obstacles, Rupee coins & fair spawner
    ├── game.js          # Core coordinator: state machine, scoring, game over & HUD synchronization
    └── main.js          # App entrypoint: canvas initialization & window resize handling
```

### Module Breakdown

| File | Primary Responsibility |
| :--- | :--- |
| [`index.html`](index.html) | Defines canvas shell, HUD DOM elements, start, pause, and game-over modals. |
| [`css/style.css`](css/style.css) | Responsive container layout, typography (Orbitron & Outfit), neon glow accents, and modal animations. |
| [`js/config.js`](js/config.js) | Centralized physics tuning parameters (`GRAVITY`, `JUMP_FORCE`, `BATTERY_DRAIN_FLIGHT`), lane positions, and virtual resolution. |
| [`js/input.js`](js/input.js) | Tracks active key states (`isDown`), single-press edge triggers (`isJustPressed`), and resets keys on window blur. |
| [`js/audio.js`](js/audio.js) | Synthesizes pure Web Audio API sound effects (coins, jumps, transforms, near-misses, crashes, game-over fanfare) with persistent mute. |
| [`js/background.js`](js/background.js) | Pre-renders skyline and roadside layers to offscreen canvases and loops them seamlessly with variable parallax speeds. |
| [`js/player.js`](js/player.js) | Procedurally draws the EV sports car with headlights, tri-color decals, alloy rims, ion thrusters, and handles mode physics and lives. |
| [`js/obstacles.js`](js/obstacles.js) | Procedural Canvas sprites for Auto-rickshaws, Scooters, Ambassador Taxis, Zebu Cows, Buffaloes, rotating Rupee coins, and near-miss detection. |
| [`js/game.js`](js/game.js) | Coordinates state flow (`START`, `PLAYING`, `PAUSED`, `GAMEOVER`), score calculations, progressive difficulty, and syncs HUD. |
| [`js/main.js`](js/main.js) | Bootstraps the game when the DOM is ready and maintains crisp rendering across browser window resizes. |

---

## 🕹️ Pilot Controls

| Action | Primary Key | Alternate Key | Description |
| :--- | :---: | :---: | :--- |
| **Start / Jump** | <kbd>Space</kbd> | <kbd>Enter</kbd> | Launch engine on Start Screen; Jump in Road Mode |
| **Steer Up / Climb** | <kbd>W</kbd> | <kbd>↑</kbd> | Shift to upper lane (Road) / Climb altitude (Flight) |
| **Steer Down / Dive** | <kbd>S</kbd> | <kbd>↓</kbd> | Shift to lower lane (Road) / Dive lower (Flight) |
| **Brake / Boost** | <kbd>A</kbd> / <kbd>D</kbd> | <kbd>←</kbd> / <kbd>→</kbd> | Adjust relative road position & scroll speed |
| **Switch Mode** | <kbd>F</kbd> | <kbd>Shift</kbd> | Transform between **Road Drive** ⇄ **Flight Hover** |
| **Pause / Resume** | <kbd>P</kbd> | <kbd>Escape</kbd> | Toggle game pause |

---

## 🚀 Running the Game Locally

### Option 1: Local HTTP Server (Recommended)
You can run a lightweight local server from within the project directory:

```bash
# Using Python
python3 -m http.server 8844

# Or using Node / npx
npx serve -l 8844
```

Then visit: **[http://localhost:8844](http://localhost:8844)** in your web browser.

### Option 2: Direct File Open
Because the project uses standard modular JavaScript without external asset dependencies, you can open [`index.html`](index.html) directly in any modern browser:

```bash
open index.html
```

---

## 🧪 Phase 1 Testing Checklist

- [x] **Responsive Scaling**: Canvas centers and preserves a 16:9 ratio across different window sizes.
- [x] **Start Screen**: Pressing <kbd>Space</kbd> or clicking **"START ENGINE"** smoothly initiates the game loop and displays the HUD.
- [x] **Road Driving**: <kbd>W</kbd> / <kbd>S</kbd> smoothly moves the car between lanes while strictly respecting highway boundaries.
- [x] **Jumping**: <kbd>Space</kbd> triggers an upward arc with gravity and returns to the current lane with a landing dust puff.
- [x] **Flight Mode**: Pressing <kbd>F</kbd> or <kbd>Shift</kbd> triggers the aerodynamic wing deployment, wheel folding, ion particle emissions, and vertical flight controls.
- [x] **Battery Management**: Battery drains while hovering in flight and regenerates when driving on the road.
- [x] **Pause & Resume**: Pressing <kbd>P</kbd> or <kbd>Esc</kbd> pauses the loop and displays the pause menu.

---

## ⚡ Flight Mode & Transformation Dynamics

The game differentiates itself through its fluid two-tier locomotion system:

### 1. Finite State Machine
- **`ROAD`**: High-traction ground physics, lane switching, jumping, and regenerative battery recharge (`+10%/s`).
- **`TRANSFORM_TO_FLIGHT`**: Smooth ease-out vertical lift toward altitude ($Y \approx 220$), expanding shockwave energy ring, crackling lightning arcs, 90° wheel folding into hover repulsors, and aerodynamic wing deployment.
- **`FLIGHT`**: Free 2D VTOL navigation ($Y: 70 \to 340$), dual ion-jet exhaust flames, altitude-dependent pitch tilt, and steady battery drain (`-7%/s`).
- **`TRANSFORM_TO_ROAD`**: Ease-in descent toward the nearest safe highway lane, wing retraction, wheel realignment, and touchdown dust puffs.

### 2. Accidental Toggle Prevention & Edge Cases
- **Transition Lock**: Pressing <kbd>F</kbd> or <kbd>Shift</kbd> during active takeoff or landing is strictly debounced to prevent glitching or stuck heights.
- **Low-Battery Lockout**: Takeoff requires at least $15\%$ energy. If attempted with $<15\%$, a red warning alert (*"⚡ BATTERY LOW! (>15% REQUIRED TO FLY)"*) displays and takeoff is rejected.
- **Emergency Descent**: If flight energy hits $0\%$, an automatic forced landing initiates with emergency red sputter sparks.
- **3D Depth Perception**: A dynamic soft shadow stays on the road surface below the car. As the car climbs higher into the sky, the shadow shrinks and fades naturally.


---

## 🌐 Community Wisdom & Proven Patterns

- **Delta Time & Variable Refresh Rates**: To ensure consistent game speed across 60Hz, 120Hz, and high-refresh displays, all motion calculations multiply by elapsed seconds (`dt`). Capping `dt` at `0.1s` avoids physics tunneling if the tab is backgrounded. Reference: [Building a 2D Game Engine in JavaScript: Delta Time & The Game Loop](https://dev.to/straker/building-a-game-engine-in-javascript-the-game-loop-13e5) by [Steven Lambert](https://dev.to/straker).
- **Infinite Canvas Parallax Performance**: Pre-rendering repeating skyline elements onto an offscreen canvas and drawing back-to-back prevents frame drops and eliminates visual seams during high-speed horizontal scrolling. Reference: [Creating Parallax Scrolling Effects in HTML5 Canvas](https://dev.to/alvaromontoro/creating-parallax-scrolling-effects-in-html5-canvas-39k2) by [Alvaro Montoro](https://dev.to/alvaromontoro).

---

## 🗺️ Roadmap Progress
- [x] **Phase 1: Minimal Working Project**
  - Responsive letterbox 16:9 canvas
  - requestAnimationFrame delta-time loop
  - Multi-layer Indian sunset skyline & parallax road
  - Controllable EV roadster with road & flight mode
- [x] **Phase 2: Indian Road Environment & Obstacles**
  - Procedural Auto-rickshaws, Scooters, Ambassador Taxis
  - Distinct Zebu Cows (hump & horns) and Water Buffaloes (swept-back horns)
  - Variable obstacle speeds, fair lane spawner, and memory-safe culling
  - Precise AABB collision boxes, jump/flight clearance, sparks, and screen shake
- [x] **Phase 3: Pickups, Powerups & Scoring**
  - Rotating Indian Rupee Gold Coins ₹ (+50 pts & +4% EV Battery recharge)
  - Near-miss close-shave bonuses (+100 pts)
  - Distance-based scoring strictly frozen when not in PLAYING state
  - High score persistence via `localStorage`
- [x] **Phase 4: Audio & Complete Arcade Polish**
  - Procedural Web Audio API sound synthesizer (coin chimes, whooshes, jumps, cyber transformations, crash explosions, game over fanfare)
  - Persistent master audio mute toggle (<kbd>M</kbd> and HUD button)
  - Chassis integrity (3 hearts) & Game Over breakdown modal with stats
  - Guaranteed freeze on game over and full state reset on restart


