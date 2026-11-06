/* SHIFTLINE - simulation core (no DOM). Shared by the browser and the Node solver.
 *
 * Tile legend
 *   #  solid in both worlds        .  empty
 *   1  solid only in world 0       2  solid only in world 1
 *   ^  spikes (both worlds)        p  spikes only in world 0     q  spikes only in world 1
 *   b  bounce pad (solid, launches the player)
 *   S  start    E  exit
 * Separate layers: shards (optional collectibles) and lock zones (shifting is disabled inside).
 * Chapter 3 levels set `flip: true`: in world 1 gravity points UP.
 */
(function (root) {
  'use strict';

  const T = { W: 0.7, H: 0.9, G: 60, JUMP: 19.5, BOUNCE: 27, SPEED: 7, COYOTE: 0.09, BUFFER: 0.1 };
  const COLS = 26, ROWS = 13;

  const CHAPTERS = [
    { id: 0, scenery: 'palms' },
    { id: 1, scenery: 'peaks' },
    { id: 2, scenery: 'islands' },
  ];

  const LEVELS = [
    /* ---------------- Chapter 1: Dusk / Night ---------------- */
    { ch: 0, name: 'First Light', hint: 'Press SHIFT to swap worlds. The bridge only exists in the night world.', par: 9,
      build(b) { b.bridge(7, 16, '2'); b.v(20, 7, 10, '2'); b.p(10, 2, 'S'); b.p(10, 24, 'E'); b.shard(8, 12); } },
    { ch: 0, name: 'Stepping Stones', hint: 'Shift in mid-air to land on the next platform.', par: 9,
      build(b) { b.h(11, 5, 20, '^'); b.h(9, 6, 8, '1'); b.h(7, 11, 13, '2'); b.h(9, 16, 18, '1'); b.p(10, 1, 'S'); b.p(10, 24, 'E'); b.shard(5, 12); } },
    { ch: 0, name: 'The Tunnel', hint: 'No room to jump. Shift on the safe tiles between the spikes.', par: 13,
      build(b) {
        b.box(0, 9, 6, 20, '#'); b.p(10, 1, 'S'); b.p(10, 25, 'E');
        [7, 11, 15, 19].forEach(c => b.p(10, c, 'p')); [9, 13, 17].forEach(c => b.p(10, c, 'q')); b.shard(10, 12);
      } },
    { ch: 0, name: 'Ascent', hint: 'Climb! Each ledge lives in a different world.', par: 11,
      build(b) { b.p(2, 22, 'E'); b.h(3, 20, 23, '2'); b.h(5, 15, 18, '1'); b.h(7, 9, 12, '2'); b.h(9, 3, 6, '1'); b.h(10, 7, 24, '^'); b.p(10, 1, 'S'); b.shard(4, 10); } },
    { ch: 0, name: 'Open Road', hint: 'Spike carpets are too wide to jump. Cross each one in the right world.', par: 12,
      build(b) { b.p(10, 1, 'S'); b.p(10, 3, 'pppppp'); b.p(10, 10, 'qqqqqq'); b.p(10, 17, 'pppppp'); b.p(10, 24, 'E'); b.shard(7, 12); } },
    { ch: 0, name: 'Eclipse', hint: 'Everything together. Trust your timing.', par: 14,
      build(b) {
        b.gap(6, 21); b.h(9, 8, 9, '2'); b.h(7, 12, 13, '1'); b.h(5, 16, 17, '2'); b.h(7, 20, 21, '1');
        b.p(10, 22, 'pp'); b.p(10, 1, 'S'); b.p(10, 25, 'E'); b.shard(3, 16);
      } },

    /* ---------------- Chapter 2: Ember / Frost ---------------- */
    { ch: 1, name: 'Spring Loaded', hint: 'Bounce pads launch you high. Then shift to cross the bridge.', par: 10,
      build(b) { b.v(10, 6, 10, '#'); b.v(11, 6, 10, '#'); b.p(10, 6, 'b'); b.bridge(15, 20, '2'); b.p(10, 1, 'S'); b.p(10, 24, 'E'); b.shard(4, 10); } },
    { ch: 1, name: 'Frozen Lock', hint: 'You cannot shift inside the red zone. Shift BEFORE you enter.', par: 12,
      build(b) {
        b.zone(8, 2, 17, 10); b.p(10, 9, 'ppppppp'); b.bridge(20, 23, '1'); b.p(10, 1, 'S'); b.p(10, 24, 'E'); b.shard(8, 12);
      } },
    { ch: 1, name: 'Glacier Steps', hint: 'Bounce between ledges that live in different worlds.', par: 11,
      build(b) {
        b.p(10, 1, 'S'); b.p(10, 3, 'b'); b.h(10, 4, 25, '^'); b.h(6, 7, 10, '2'); b.p(4, 12, '1b1'); b.h(2, 19, 23, '2'); b.p(1, 21, 'E'); b.shard(2, 16);
      } },
    { ch: 1, name: 'Whiteout', hint: 'Plan your worlds: carpet, wall, bridge. In that order.', par: 15,
      build(b) {
        b.p(10, 1, 'S'); b.p(10, 4, 'b'); b.v(8, 6, 10, '#'); b.p(10, 10, 'pppppp'); b.v(18, 6, 10, '1'); b.bridge(20, 23, '1'); b.p(10, 25, 'E'); b.shard(7, 12);
      } },

    /* ---------------- Chapter 3: Bloom / Void (gravity flips in Void) ---------------- */
    { ch: 2, flip: true, name: 'Upside Down', hint: 'In the Void world gravity points UP. Walk the ceiling over the spikes.', par: 9,
      build(b) { b.h(10, 5, 18, '^'); b.p(10, 1, 'S'); b.p(10, 24, 'E'); b.shard(2, 12); } },
    { ch: 2, flip: true, name: 'Pillars', hint: 'Duck under the hanging pillar, climb over the standing ones.', par: 11,
      build(b) {
        b.v(8, 4, 10, '#'); b.v(19, 4, 10, '#'); b.v(14, 2, 8, '#'); b.p(10, 1, 'S'); b.p(10, 24, 'E'); b.shard(6, 11);
      } },
    { ch: 2, flip: true, name: 'Twin Rivers', hint: 'Fall onto the ledge under the wall, then rise again.', par: 11,
      build(b) { b.gap(8, 17); b.v(12, 2, 4, '#'); b.h(7, 10, 14, '1'); b.p(10, 1, 'S'); b.p(10, 24, 'E'); b.shard(6, 12); } },
    { ch: 2, flip: true, name: 'Shiftline', hint: 'Enter the lock zone on the ceiling. Leave it, then fall.', par: 13,
      build(b) {
        b.h(10, 4, 9, '^'); b.zone(10, 2, 15, 10); b.p(10, 11, 'p'); b.p(10, 13, 'p'); b.v(20, 2, 10, '2'); b.p(10, 1, 'S'); b.p(10, 24, 'E'); b.shard(2, 13);
      } },
  ];

  function builderFor(g, extra) {
    const b = {
      p(r, c, s) { for (let i = 0; i < s.length; i++) if (c + i >= 0 && c + i < COLS) g[r][c + i] = s[i]; },
      h(r, c0, c1, ch) { for (let c = c0; c <= c1; c++) g[r][c] = ch; },
      v(c, r0, r1, ch) { for (let r = r0; r <= r1; r++) g[r][c] = ch; },
      box(r0, r1, c0, c1, ch) { for (let r = r0; r <= r1; r++) b.h(r, c0, c1, ch); },
      gap(c0, c1) { b.h(11, c0, c1, '.'); b.h(12, c0, c1, '.'); },
      bridge(c0, c1, ch) { b.gap(c0, c1); b.h(11, c0, c1, ch); },
      shard(r, c) { extra.shards.push({ c: c, r: r }); },
      zone(c0, r0, c1, r1) { extra.zones.push({ x: c0, y: r0, w: c1 - c0 + 1, h: r1 - r0 + 1 }); },
    };
    return b;
  }

  function parse(def, index) {
    const g = [];
    for (let r = 0; r < ROWS; r++) g.push(new Array(COLS).fill('.'));
    for (let c = 0; c < COLS; c++) { g[11][c] = '#'; g[12][c] = '#'; if (def.flip) { g[0][c] = '#'; g[1][c] = '#'; } }
    const extra = { shards: [], zones: [] };
    def.build(builderFor(g, extra));
    let sx = 1, sy = 10;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (g[r][c] === 'S') { sx = c; sy = r; g[r][c] = '.'; }
    return { index: index, ch: def.ch, flip: !!def.flip, name: def.name, hint: def.hint, par: def.par, grid: g,
      shards: extra.shards, zones: extra.zones, start: { x: sx + (1 - T.W) / 2, y: sy + 1 - T.H } };
  }
  const parsed = LEVELS.map(parse);

  function solidAt(L, c, r, w) {
    if (c < 0 || c >= COLS || r < 0) return true;
    if (r >= ROWS) return false;
    const ch = L.grid[r][c];
    return ch === '#' || ch === 'b' || (ch === '1' && w === 0) || (ch === '2' && w === 1);
  }
  function overlapSolid(L, x, y, w) {
    const c0 = Math.floor(x), c1 = Math.floor(x + T.W - 1e-6), r0 = Math.floor(y), r1 = Math.floor(y + T.H - 1e-6);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (solidAt(L, c, r, w)) return true;
    return false;
  }
  function inLock(L, x, y) {
    for (let i = 0; i < L.zones.length; i++) {
      const z = L.zones[i];
      if (x < z.x + z.w && x + T.W > z.x && y < z.y + z.h && y + T.H > z.y) return true;
    }
    return false;
  }
  function spikeActive(ch, w) { return ch === '^' || (ch === 'p' && w === 0) || (ch === 'q' && w === 1); }
  function gravDir(L, s) { return (L.flip && s.w === 1) ? -1 : 1; }

  function newState(L) {
    return { x: L.start.x, y: L.start.y, vx: 0, vy: 0, w: 0, onGround: false, buf: 0, coy: 0, jh: false,
      time: 0, shifts: 0, dead: false, won: false, face: 1, got: 0 };
  }
  function cloneState(s) { return Object.assign({}, s); }

  function step(L, s, inp, dt, opts) {
    const ev = [];
    if (s.dead || s.won) return ev;
    s.time += dt;

    if (inp.shift && !(opts && opts.noShift)) {
      if (inLock(L, s.x, s.y)) ev.push('locked');
      else if (overlapSolid(L, s.x, s.y, 1 - s.w)) ev.push('blocked');
      else {
        s.w = 1 - s.w; s.shifts++; ev.push('shift');
        if (L.flip) { s.vy = 0; s.onGround = false; s.coy = 0; }
      }
    }
    const gd = gravDir(L, s);

    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (dir) s.face = dir;
    const target = dir * T.SPEED, acc = (s.onGround ? 90 : 50) * dt;
    if (s.vx < target) s.vx = Math.min(target, s.vx + acc); else if (s.vx > target) s.vx = Math.max(target, s.vx - acc);

    const pressed = inp.jump && !s.jh; s.jh = !!inp.jump;
    s.buf = pressed ? T.BUFFER : Math.max(0, s.buf - dt);
    s.coy = s.onGround ? T.COYOTE : Math.max(0, s.coy - dt);
    if (s.buf > 0 && s.coy > 0) { s.vy = -T.JUMP * gd; s.buf = 0; s.coy = 0; s.onGround = false; ev.push('jump'); }
    if (!inp.jump && s.vy * gd < -6) s.vy += T.G * gd * dt * 1.6;
    s.vy = Math.max(-30, Math.min(30, s.vy + T.G * gd * dt));

    // X
    s.x += s.vx * dt;
    if (overlapSolid(L, s.x, s.y, s.w)) {
      if (s.vx > 0) s.x = Math.floor(s.x + T.W) - T.W - 1e-4; else if (s.vx < 0) s.x = Math.floor(s.x) + 1 + 1e-4;
      s.vx = 0;
    }
    // Y
    const vyBefore = s.vy;
    s.y += s.vy * dt;
    const was = s.onGround; s.onGround = false;
    if (overlapSolid(L, s.x, s.y, s.w)) {
      if (s.vy > 0) s.y = Math.floor(s.y + T.H) - T.H - 1e-4; else if (s.vy < 0) s.y = Math.floor(s.y) + 1 + 1e-4;
      if (vyBefore * gd > 0) {            // landed on something in the gravity direction
        s.onGround = true;
        if (!was && Math.abs(vyBefore) > 8) ev.push('land');
        // bounce pad underfoot?
        const row = gd > 0 ? Math.floor(s.y + T.H + 0.05) : Math.floor(s.y - 0.05);
        const c0 = Math.floor(s.x), c1 = Math.floor(s.x + T.W - 1e-6);
        let pad = false;
        for (let c = c0; c <= c1; c++) if (row >= 0 && row < ROWS && L.grid[row][c] === 'b') pad = true;
        if (pad) { s.vy = -T.BOUNCE * gd; s.onGround = false; s.coy = 0; ev.push('bounce'); }
        else s.vy = 0;
      } else s.vy = 0;
    }

    // hazards
    if (s.y > ROWS + 1 || s.y < -3) { s.dead = true; ev.push('die'); return ev; }
    const bx = s.x + 0.08, by = s.y + 0.08, bw = T.W - 0.16, bh = T.H - 0.16;
    const c0 = Math.max(0, Math.floor(s.x) - 1), c1 = Math.min(COLS - 1, Math.floor(s.x + T.W) + 1);
    const r0 = Math.max(0, Math.floor(s.y) - 1), r1 = Math.min(ROWS - 1, Math.floor(s.y + T.H) + 1);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const ch = L.grid[r][c];
      if (spikeActive(ch, s.w)) {
        const sx = c + 0.18, sy = r + 0.5, sw = 0.64, sh = 0.5;
        if (bx < sx + sw && bx + bw > sx && by < sy + sh && by + bh > sy) { s.dead = true; ev.push('die'); return ev; }
      }
      if (ch === 'E') {
        const dx = s.x + T.W / 2 - (c + 0.5), dy = s.y + T.H / 2 - (r + 0.5);
        if (dx * dx + dy * dy < 0.5) { s.won = true; ev.push('win'); return ev; }
      }
    }
    for (let i = 0; i < L.shards.length; i++) {
      if (s.got & (1 << i)) continue;
      const dx = s.x + T.W / 2 - (L.shards[i].c + 0.5), dy = s.y + T.H / 2 - (L.shards[i].r + 0.5);
      if (dx * dx + dy * dy < 0.5) { s.got |= (1 << i); ev.push('shard'); }
    }
    return ev;
  }

  const Sim = { T, COLS, ROWS, CHAPTERS, levels: parsed, step, newState, cloneState, solidAt, overlapSolid, inLock, spikeActive, gravDir };
  if (typeof module !== 'undefined' && module.exports) module.exports = Sim; else root.Sim = Sim;
})(typeof window !== 'undefined' ? window : globalThis);
