# SHIFTLINE

A two-world platformer made for **GitHub Game Off 2026** (theme: **SHIFT**).

Two worlds share one map. Platforms, walls and spikes exist in only one of them. Press **Shift** to swap worlds, but you cannot shift while the other world has a wall where you are standing, or while you are inside a **lock zone**. Reach the glowing portal in all 14 levels.

## Play

Open `index.html` in any modern browser (no build step, no dependencies), or play it on itch.io.

## Features

- **14 hand-built levels in 3 chapters**, each with its own look, music scale and mechanic:
  1. **Dusk / Night**: the core shift mechanic (platforms, bridges, spike carpets, tunnels)
  2. **Ember / Frost**: bounce pads and shift-lock zones
  3. **Bloom / Void**: in the Void world **gravity points up**. Shifting flips gravity, so you can walk on the ceiling
- **Optional shards** in every level, plus a **par time**: collect the shard and beat par for 3 stars
- **Best-run ghost**: a translucent replay of your fastest run, recorded as inputs and replayed through the same deterministic simulation
- Level select with stars and best times, pause menu, saved progress (localStorage)
- **English and Bangla (বাংলা)** UI and level text
- **Accessibility**: colour-blind tile patterns, screen-shake toggle, separate music/SFX volume
- Keyboard, **gamepad** and **touch** controls, fullscreen
- All art is drawn in code and all audio is synthesised with the Web Audio API

## Controls

| Action | Keys |
|---|---|
| Move | Arrow keys / A D |
| Jump | Space / W / Up |
| **Shift worlds** | **Either Shift key** (or `E`) |
| Restart level | R |
| Pause | P / Esc |
| Mute / Fullscreen | M / F |
| Gamepad | stick or d-pad move, A jump, X / B / bumpers shift, Start pause |
| Touch | on-screen buttons |

> Windows may offer "Sticky Keys" after pressing Shift five times in a row. If that pops up, use `E` to shift instead.

## How it is built

- Plain JavaScript + Canvas 2D, no libraries.
- `sim.js` is the pure game simulation (physics, shift rules, levels). It has no DOM code, so it also runs in Node.
- `main.js` handles rendering, audio, input, menus, progress and ghosts.
- **Every level is verified by a bot.** `tools/solve.js` is a breadth-first-search player that uses the real simulation. `tools/verify.sh` runs it on all levels in parallel and proves that each level is solvable, **not** solvable without shifting, and that every shard is reachable:

```
tools/verify.sh            # all levels (a few minutes)
node tools/solve.js 8 exit # one level / goal (exit | noshift | shard0 ...)
```

To add a level, append to `LEVELS` in `sim.js` (the tile legend and builder helpers are documented there) and run the verifier.

## Tips

`?level=N` in the URL jumps straight to level N.

## License

MIT, see `LICENSE`.
