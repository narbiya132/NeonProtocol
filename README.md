# NEON PROTOCOL ⚡

**Enter the Grid. Adapt. Survive.**

NEON PROTOCOL is a cyberpunk-inspired survival arena game built with HTML, CSS, and vanilla JavaScript. Step into a futuristic combat simulation, face increasingly dangerous enemies, collect energy, and evolve your abilities to survive each wave.

Designed with a neon visual identity, real-time combat, and a tactical upgrade system, NEON PROTOCOL brings an arcade-style survival experience directly to your browser.

## 🎮 Features

- **Real-Time Combat:** Aim with your mouse and fire at hostile units in a dynamic arena.
- **Progressive Enemy Waves:** Face increasingly challenging waves of enemies.
- **Multiple Enemy Types:** Fight Hunters, armored Brutes, and ranged Wraiths.
- **Tactical Upgrade System:** Choose between randomized upgrades to improve damage, movement, firing speed, energy, and survivability.
- **Dash Mechanic:** Evade incoming attacks with a quick directional dash.
- **Energy Pulse:** Release an area-of-effect attack to damage nearby enemies and clear hostile projectiles.
- **Combat Feedback:** Experience particle effects, floating damage numbers, screen shake, and synthesized sound effects.
- **Collectible Resources:** Pick up energy shards and health drops during combat.
- **Live Statistics:** Track score, eliminations, accuracy, combo multiplier, wave progress, and survival time.
- **Persistent High Score:** Save your best score locally in your browser.
- **Responsive Interface:** A futuristic HUD with health and energy indicators, combat intelligence, and enemy information.

## 🕹️ Controls

| Action | Control |
|---|---|
| Move | `W`, `A`, `S`, `D` |
| Aim | Mouse |
| Shoot | Hold left mouse button |
| Dash | `Shift` |
| Energy Pulse | `E` |
| Pause / Resume | `Esc` |
| Select an Upgrade | Click a card or press `1`, `2`, or `3` |

## 🚀 Getting Started

No build tools, package managers, or external JavaScript libraries are required.

### Run locally

1. Clone this repository:

   ```bash
   git clone https://github.com/narbiya132/NeonProtocol.git
   ```

2. Open the project folder:

   ```bash
   cd neon-protocol
   ```

3. Make sure the following files are present in the same directory:

   ```text
   NeonProtocol/
   ├── index.html
   ├── style.css
   ├── game.js
   └── README.md
   ```

4. Open `index.html` in your browser.

   Alternatively, open the project in Visual Studio Code and run it using the Live Server extension.

## 🧠 How It Works

NEON PROTOCOL uses the HTML Canvas API to render the arena and its entities, while JavaScript handles the game simulation.

- **Rendering:** A canvas-based rendering loop draws the arena, player, enemies, projectiles, pickups, and particle effects.
- **Game State:** JavaScript manages gameplay states, including the start screen, active combat, pause, upgrades, and game over.
- **Enemy AI:** Different enemy types use different movement and attack behaviors.
- **Collision Detection:** Distance-based collision checks handle projectiles, enemy contact, and collectible items.
- **Progression:** Clearing a wave unlocks an upgrade selection before the next wave begins.
- **Local Persistence:** Browser local storage retains the player's high score.

## 🛠️ Built With

- **HTML5** — Game structure and interface.
- **CSS3** — Responsive layout, HUD styling, and neon visual effects.
- **JavaScript (ES6+)** — Gameplay logic, enemy behavior, upgrades, and state management.
- **HTML Canvas API** — Real-time game rendering.
- **Web Audio API** — Procedurally synthesized sound effects.
- **Local Storage API** — High-score persistence.

## 📂 Project Structure

```text
NeonProtocol/
├── index.html    # Game interface and HUD
├── style.css     # Visual design and responsive styling
├── game.js       # Game engine and gameplay systems
└── README.md     # Project documentation
```

## 🔮 Future Improvements

- Boss encounters with unique attack patterns.
- Additional weapons and enemy archetypes.
- Difficulty selection and more gameplay modes.
- Improved obstacle collision and pathfinding.
- Expanded sound design and background music.
- Online leaderboards and competitive score tracking.
- Mobile-friendly touch controls.
- Additional maps, environments, and unlockable content.

## 🎯 Project Goal

The goal of NEON PROTOCOL is to explore browser-based game development through interactive combat, real-time rendering, enemy behavior, and progression systems while maintaining a cohesive, futuristic user experience.

## 🤝 Contributing

Suggestions, bug reports, and improvements are welcome. Fork the repository, create a feature branch, and submit a pull request.

## 📄 License

This project is currently available for personal and educational use. Add an explicit license file if you want to define permissions for redistribution, modification, or commercial use.

---

**NEON PROTOCOL** — The Grid doesn't forgive mistakes.
