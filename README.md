# SHIFTLINE

A two-world platformer made for **GitHub Game Off 2026** (theme: **SHIFT**).

Two worlds, **Dusk** and **Night**, share one map. Platforms, walls and spikes exist in only one of them. Press **Shift** to swap worlds, but you cannot shift while the other world has a wall where you are standing. Reach the glowing portal in all 6 levels.

![theme](https://img.shields.io/badge/Game%20Off-2026-orange) ![license](https://img.shields.io/badge/license-MIT-blue)

## Play

Open `index.html` in any modern browser (no build step, no dependencies), or play it on itch.io.

## Controls

| Action | Keys |
|---|---|
| Move | Arrow keys / A D |
| Jump | Space / W / Up |
| **Shift worlds** | **Either Shift key** (or `E`) |
| Restart level | R |
| Mute | M |
| Touch | On-screen buttons on phones/tablets |

> Windows may offer "Sticky Keys" after pressing Shift five times in a row. If that pops up, use `E` to shift instead.

## How it is built

- Plain JavaScript + Canvas 2D, no libraries. All art is drawn in code; all audio is synthesised with the Web Audio API.
- `sim.js` is the pure game simulation (physics, shift rules, levels). It has no DOM code, so it also runs in Node.
- `main.js` handles rendering, audio, input and scenes.
- `tools/solve.js` is a breadth-first-search bot that plays every level to prove it is solvable, and that it is **not** solvable without shifting:

```
node tools/solve.js        # all levels (slow, a few minutes)
node tools/solve.js 3      # a single level
```

Add a level by appending to `LEVELS` in `sim.js` (tile legend is documented there), then run the solver.

## Tips

`?level=N` in the URL jumps straight to level N.

## License

MIT, see `LICENSE`.
