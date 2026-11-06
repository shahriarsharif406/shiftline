/* SHIFTLINE - simulation core (no DOM). Used by the browser and by the Node solver. */
(function (root) {
  'use strict';

  const T = { W: 0.7, H: 0.9, G: 60, JUMP: 19.5, SPEED: 7, COYOTE: 0.09, BUFFER: 0.1 };
  const COLS = 26, ROWS = 13;

  /*
   Tile legend
   #  solid in both worlds        .  empty
   1  solid only in world DUSK    2  solid only in world NIGHT
   ^  spikes (both worlds)        p  spikes only in DUSK     q  spikes only in NIGHT
   S  start                       E  exit
   Rows 11 and 12 default to solid floor unless a level overrides them.
  */
  const LEVELS = [
    {
      name: 'First Light',
      hint: 'Press SHIFT to swap worlds. The bridge only exists in the night world.',
      rows: {
        7: '.'.repeat(20) + '2',
        8: '.'.repeat(20) + '2',
        9: '.'.repeat(20) + '2',
        10: '..S' + '.'.repeat(17) + '2...E.',
        11: '#######' + '2'.repeat(10) + '#########',
        12: '#######' + '.'.repeat(10) + '#########',
      },
    },
    {
      name: 'Stepping Stones',
      hint: 'Shift in mid-air to land on the next platform.',
      rows: {
        7: '...........222',
        9: '......111.......111',
        10: '.S' + '.'.repeat(22) + 'E',
        11: '#####' + '^'.repeat(16) + '#####',
      },
    },
    {
      name: 'The Tunnel',
      hint: 'No room to jump. Shift on the safe tiles between the spikes.',
      rows: {
        0: '......###############',
        1: '......###############',
        2: '......###############',
        3: '......###############',
        4: '......###############',
        5: '......###############',
        6: '......###############',
        7: '......###############',
        8: '......###############',
        9: '......###############',
        10: '.S.....p.q.p.q.p.q.p.....E',
      },
    },
    {
      name: 'Ascent',
      hint: 'Climb! Each ledge lives in a different world.',
      rows: {
        2: '......................E.',
        3: '....................2222',
        5: '...............1111',
        7: '.........2222',
        9: '...1111',
        10: '.S.....' + '^'.repeat(18) + '.',
      },
    },
    {
      name: 'Open Road',
      hint: 'Spike carpets are too wide to jump. Cross each one in the right world.',
      rows: {
        10: '.S.pppppp.qqqqqq.pppppp.E.',
      },
    },
    {
      name: 'Eclipse',
      hint: 'Everything together. Trust your timing.',
      rows: {
        5: '................22',
        7: '............11......11',
        9: '........22',
        10: '.S' + '.'.repeat(20) + 'pp.E',
        11: '######' + '.'.repeat(16) + '####',
        12: '######' + '.'.repeat(16) + '####',
      },
    },
  ];

  function set(g, r, c, str) { for (let i = 0; i < str.length; i++) if (c + i < COLS) g[r][c + i] = str[i]; }

  function parse(def) {
    const g = [];
    for (let r = 0; r < ROWS; r++) g.push(new Array(COLS).fill('.'));
    for (let c = 0; c < COLS; c++) { g[11][c] = '#'; g[12][c] = '#'; }
      for (const k in def.rows) {
        const r = +k; if (!Number.isInteger(r)) continue;
        const s = def.rows[k];
        for (let c = 0; c < COLS; c++) g[r][c] = c < s.length ? s[c] : (r >= 11 ? g[r][c] : '.');
      }
    let sx = 1, sy = 10;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (g[r][c] === 'S') { sx = c; sy = r; g[r][c] = '.'; }
    }
    return { name: def.name, hint: def.hint, grid: g, start: { x: sx + (1 - T.W) / 2, y: sy + 1 - T.H } };
  }

  const parsed = LEVELS.map(parse);

  function solidAt(L, c, r, w) {
    if (c < 0 || c >= COLS || r < 0) return true;
    if (r >= ROWS) return false;
    const ch = L.grid[r][c];
    return ch === '#' || (ch === '1' && w === 0) || (ch === '2' && w === 1);
  }
  function overlapSolid(L, x, y, w) {
    const c0 = Math.floor(x), c1 = Math.floor(x + T.W - 1e-6), r0 = Math.floor(y), r1 = Math.floor(y + T.H - 1e-6);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (solidAt(L, c, r, w)) return true;
    return false;
  }
  function spikeActive(ch, w) { return ch === '^' || (ch === 'p' && w === 0) || (ch === 'q' && w === 1); }

  function newState(L) {
    return { x: L.start.x, y: L.start.y, vx: 0, vy: 0, w: 0, onGround: false, buf: 0, coy: 0, jh: false,
      time: 0, shifts: 0, dead: false, won: false, face: 1, deaths: 0 };
  }
  function cloneState(s) { return Object.assign({}, s); }

  // one fixed step; returns array of event names
  function step(L, s, inp, dt, opts) {
    const ev = [];
    if (s.dead || s.won) return ev;
    s.time += dt;

    if (inp.shift && !(opts && opts.noShift)) {
      if (!overlapSolid(L, s.x, s.y, 1 - s.w)) { s.w = 1 - s.w; s.shifts++; ev.push('shift'); }
      else ev.push('blocked');
    }

    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (dir) s.face = dir;
    const target = dir * T.SPEED, acc = (s.onGround ? 90 : 50) * dt;
    if (s.vx < target) s.vx = Math.min(target, s.vx + acc); else if (s.vx > target) s.vx = Math.max(target, s.vx - acc);

    const pressed = inp.jump && !s.jh; s.jh = !!inp.jump;
    s.buf = pressed ? T.BUFFER : Math.max(0, s.buf - dt);
    s.coy = s.onGround ? T.COYOTE : Math.max(0, s.coy - dt);
    if (s.buf > 0 && s.coy > 0) { s.vy = -T.JUMP; s.buf = 0; s.coy = 0; s.onGround = false; ev.push('jump'); }
    if (!inp.jump && s.vy < -6) s.vy += T.G * dt * 1.6;
    s.vy = Math.min(30, s.vy + T.G * dt);

    // X
    s.x += s.vx * dt;
    if (overlapSolid(L, s.x, s.y, s.w)) {
      if (s.vx > 0) s.x = Math.floor(s.x + T.W) - T.W - 1e-4; else if (s.vx < 0) s.x = Math.floor(s.x) + 1 + 1e-4;
      s.vx = 0;
    }
    // Y
    s.y += s.vy * dt;
    const was = s.onGround; s.onGround = false;
    if (overlapSolid(L, s.x, s.y, s.w)) {
      if (s.vy > 0) { s.y = Math.floor(s.y + T.H) - T.H - 1e-4; s.onGround = true; if (!was && s.vy > 8) ev.push('land'); }
      else if (s.vy < 0) s.y = Math.floor(s.y) + 1 + 1e-4;
      s.vy = 0;
    }

    // hazards
    if (s.y > ROWS + 1) { s.dead = true; ev.push('die'); return ev; }
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
    return ev;
  }

  // find exit (for rendering)
  parsed.forEach(function (L) { /* grid keeps E tiles as-is */ });

  const Sim = { T, COLS, ROWS, levels: parsed, step, newState, cloneState, solidAt, overlapSolid, spikeActive };
  if (typeof module !== 'undefined' && module.exports) module.exports = Sim; else root.Sim = Sim;
})(typeof window !== 'undefined' ? window : globalThis);
