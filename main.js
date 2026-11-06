/* SHIFTLINE - rendering, audio, input, scenes */
(function () {
  'use strict';
  const { COLS, ROWS, T, levels } = Sim;
  const cv = document.getElementById('c');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1, ts = 32, ox = 0, oy = 0;

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const hud = 0; // level fills the screen
    ts = Math.min(W / COLS, (H - hud) / ROWS);
    ox = (W - ts * COLS) / 2; oy = (H - ts * ROWS) / 2;
  }
  window.addEventListener('resize', resize); resize();

  /* ---------- palettes ---------- */
  const rgb = (a) => 'rgb(' + (a[0] | 0) + ',' + (a[1] | 0) + ',' + (a[2] | 0) + ')';
  const lerp = (a, b, t) => a + (b - a) * t;
  const mixc = (p, t) => [lerp(p[0][0], p[1][0], t), lerp(p[0][1], p[1][1], t), lerp(p[0][2], p[1][2], t)];
  const P = {
    skyTop: [[44, 14, 88], [3, 9, 26]],
    skyMid: [[196, 62, 122], [10, 40, 78]],
    skyBot: [[255, 178, 104], [16, 98, 112]],
    far: [[98, 28, 104], [6, 28, 52]],
    near: [[58, 18, 78], [4, 18, 36]],
    solid: [[34, 14, 48], [5, 20, 30]],
    solidEdge: [[255, 150, 90], [70, 235, 220]],
    accent: [[255, 176, 71], [95, 243, 228]],
    hazard: [[255, 77, 109], [255, 77, 180]],
  };
  const DUSK = '#ffb047', NIGHT = '#5ff3e4';

  /* ---------- state ---------- */
  let scene = 'title';       // title | play | clear | end
  let li = 0, L = levels[0], s = Sim.newState(L);
  let carry = { time: 0, deaths: 0 };
  let mix = 0;               // 0 = dusk, 1 = night (animated)
  let shake = 0, flash = 0, flashCol = '#fff', blockFlash = 0, squash = 0;
  let deadT = 0, winT = 0, sceneT = 0, hintT = 0, clock = 0;
  let totalTime = 0, totalDeaths = 0, newBest = false;
  const parts = [], rings = [];
  const keys = {};
  let shiftQueued = false;

  function bestKey(i) { return 'shiftline.best.' + i; }
  function getBest(i) { try { const v = parseFloat(localStorage.getItem(bestKey(i))); return isNaN(v) ? null : v; } catch (e) { return null; } }
  function setBest(i, v) { try { localStorage.setItem(bestKey(i), String(v)); } catch (e) { /* ignore */ } }

  function loadLevel(i) {
    li = i; L = levels[i]; s = Sim.newState(L);
    carry = { time: 0, deaths: 0 };
    mix = s.w; deadT = 0; winT = 0; hintT = 0; scene = 'play'; sceneT = 0; parts.length = 0; rings.length = 0;
    if (i === 0) { totalTime = 0; totalDeaths = 0; }
  }
  function respawn(countDeath) {
    carry.time += s.time; if (countDeath) carry.deaths++;
    s = Sim.newState(L); mix = 0; deadT = 0; shiftQueued = false;
  }

  /* ---------- audio ---------- */
  let AC = null, master = null, muted = false, padA, padB, padF, musicWorld = 0;
  function initAudio() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(AC.destination);
      padF = AC.createBiquadFilter(); padF.type = 'lowpass'; padF.frequency.value = 520;
      const pg = AC.createGain(); pg.gain.value = 0.05; padF.connect(pg); pg.connect(master);
      padA = AC.createOscillator(); padB = AC.createOscillator();
      padA.type = 'sawtooth'; padB.type = 'sawtooth'; padA.frequency.value = 110; padB.frequency.value = 164.9; padB.detune.value = 7;
      padA.connect(padF); padB.connect(padF); padA.start(); padB.start();
      setInterval(arp, 260);
    } catch (e) { AC = null; }
  }
  function tone(f, d, type, v, slide, delay) {
    if (!AC || muted) return;
    const t0 = AC.currentTime + (delay || 0);
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + d);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v || 0.2, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + d + 0.05);
  }
  function noise(d, v, f0, f1) {
    if (!AC || muted) return;
    const n = Math.floor(AC.sampleRate * d), b = AC.createBuffer(1, n, AC.sampleRate), data = b.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = AC.createBufferSource(); src.buffer = b;
    const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    const t0 = AC.currentTime; f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + d);
    const g = AC.createGain(); g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  const SC = [[293.7, 349.2, 392, 440, 523.3, 587.3], [146.8, 174.6, 196, 220, 261.6, 293.7]];
  let arpI = 0;
  function arp() {
    if (!AC || muted || scene === 'end') return;
    const w = musicWorld;
    if (w === 1 && Math.random() < 0.45) return;
    arpI = Math.max(0, Math.min(5, arpI + (Math.random() < 0.5 ? -1 : 1) * (1 + (Math.random() < 0.3 ? 1 : 0))));
    tone(SC[w][arpI] * (w ? 2 : 1), w ? 0.9 : 0.5, w ? 'sine' : 'triangle', w ? 0.05 : 0.045, 0, 0);
  }
  function padWorld(w) {
    musicWorld = w;
    if (!AC) return;
    const t = AC.currentTime;
    padA.frequency.setTargetAtTime(w ? 73.4 : 110, t, 0.25);
    padB.frequency.setTargetAtTime(w ? 110 : 164.9, t, 0.25);
    padF.frequency.setTargetAtTime(w ? 330 : 560, t, 0.3);
  }
  const sfx = {
    jump() { tone(340, 0.16, 'square', 0.07, 320); },
    land() { noise(0.07, 0.12, 400, 120); },
    shift(w) { noise(0.32, 0.22, w ? 3200 : 600, w ? 500 : 3000); tone(w ? 520 : 260, 0.3, 'sine', 0.1, w ? -260 : 260); padWorld(w); },
    blocked() { tone(120, 0.2, 'sawtooth', 0.12, -60); tone(95, 0.2, 'square', 0.06, -30); },
    die() { noise(0.4, 0.28, 1400, 70); tone(220, 0.4, 'sawtooth', 0.12, -170); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.45, 'triangle', 0.13, 0, i * 0.1)); },
    ui() { tone(660, 0.1, 'triangle', 0.1); },
  };

  /* ---------- input ---------- */
  const SHIFT_CODES = ['ShiftLeft', 'ShiftRight', 'KeyE', 'KeyX'];
  function action() {          // confirm key / click
    initAudio(); sfx.ui();
    if (scene === 'title') loadLevel(0);
    else if (scene === 'clear') loadLevel(li + 1);
    else if (scene === 'end') { scene = 'title'; sceneT = 0; }
  }
  window.addEventListener('keydown', function (e) {
    const c = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(c) >= 0) e.preventDefault();
    initAudio();
    if (SHIFT_CODES.indexOf(c) >= 0) { if (!e.repeat) { keys.shiftDown = true; shiftQueued = true; } return; }
    if (e.repeat) { keys[c] = true; return; }
    keys[c] = true;
    if (c === 'KeyM') { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.55; return; }
    if (scene === 'play') {
      if (c === 'KeyR') { respawn(false); }
      if (c === 'Escape') { scene = 'title'; sceneT = 0; }
    } else if (c === 'Space' || c === 'Enter') action();
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; if (SHIFT_CODES.indexOf(e.code) >= 0) keys.shiftDown = false; });
  window.addEventListener('blur', function () { for (const k in keys) keys[k] = false; });
  cv.addEventListener('pointerdown', function () { if (scene !== 'play') action(); });
  document.querySelectorAll('#touch button').forEach(function (b) {
    const k = b.getAttribute('data-k');
    const down = function (e) { e.preventDefault(); initAudio(); if (k === 'Shift') shiftQueued = true; else keys[k] = true; };
    const up = function (e) { e.preventDefault(); if (k !== 'Shift') keys[k] = false; };
    b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
  });

  /* ---------- fx ---------- */
  function burst(x, y, n, col, spd, grav, life) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (0.3 + Math.random()) * spd;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.5 + Math.random() * 0.7), max: life, size: 0.05 + Math.random() * 0.09, col, g: grav });
    }
  }

  /* ---------- simulation tick ---------- */
  const STEP = 1 / 120;
  function tick() {
    clock += STEP; sceneT += STEP;
    // particles
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life -= STEP; if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += p.g * STEP; p.x += p.vx * STEP; p.y += p.vy * STEP;
    }
    for (let i = rings.length - 1; i >= 0; i--) { rings[i].life -= STEP; if (rings[i].life <= 0) rings.splice(i, 1); }
    shake = Math.max(0, shake - STEP * 2.2); flash = Math.max(0, flash - STEP * 3); blockFlash = Math.max(0, blockFlash - STEP * 3);
    squash += (0 - squash) * Math.min(1, STEP * 14);

    if (scene === 'title') {
      // auto-shift the backdrop so the title shows both worlds
      const want = (Math.floor(sceneT / 3) % 2);
      mix += (want - mix) * Math.min(1, STEP * 4);
      return;
    }
    if (scene !== 'play') { mix += ((scene === 'end' ? 1 : s.w) - mix) * Math.min(1, STEP * 6); return; }

    mix += (s.w - mix) * Math.min(1, STEP * 7);
    hintT += STEP;

    if (s.dead) {
      deadT += STEP; if (deadT > 0.75) respawn(true);
      return;
    }
    if (s.won) {
      winT += STEP;
      if (winT > 1.1) finishLevel();
      return;
    }
    const inp = {
      left: !!(keys.ArrowLeft || keys.KeyA), right: !!(keys.ArrowRight || keys.KeyD),
      jump: !!(keys.Space || keys.ArrowUp || keys.KeyW || keys.KeyZ), shift: shiftQueued,
    };
    shiftQueued = false;
    const ev = Sim.step(L, s, inp, STEP);
    const cx = s.x + T.W / 2, cy = s.y + T.H / 2;
    for (let i = 0; i < ev.length; i++) {
      const e = ev[i];
      if (e === 'jump') { sfx.jump(); squash = -0.22; burst(cx, s.y + T.H, 5, 'rgba(255,255,255,.7)', 1.2, 4, 0.35); }
      else if (e === 'land') { sfx.land(); squash = 0.28; burst(cx, s.y + T.H, 7, 'rgba(255,255,255,.7)', 1.6, 5, 0.4); }
      else if (e === 'shift') {
        sfx.shift(s.w); flash = 1; flashCol = s.w ? NIGHT : DUSK;
        rings.push({ x: cx, y: cy, life: 0.7, max: 0.7, col: s.w ? NIGHT : DUSK });
        burst(cx, cy, 16, s.w ? NIGHT : DUSK, 3.5, 0, 0.6);
      } else if (e === 'blocked') { sfx.blocked(); shake = 0.45; blockFlash = 1; }
      else if (e === 'die') { sfx.die(); shake = 0.9; burst(cx, cy, 34, '#ff4d6d', 6, 12, 0.9); burst(cx, cy, 14, '#ffffff', 4, 10, 0.6); }
      else if (e === 'win') { sfx.win(); burst(cx, cy, 40, '#ffe27a', 5, 3, 1.1); burst(cx, cy, 24, s.w ? NIGHT : DUSK, 4, 2, 1.1); }
    }
    // running dust
    if (s.onGround && Math.abs(s.vx) > 4 && Math.random() < 0.18) burst(cx - s.face * 0.2, s.y + T.H, 1, 'rgba(255,255,255,.5)', 0.8, 2, 0.35);
  }

  function finishLevel() {
    const t = carry.time + s.time;
    totalTime += t; totalDeaths += carry.deaths;
    const b = getBest(li); newBest = b === null || t < b; if (newBest) setBest(li, t);
    carry.final = t;
    scene = (li >= levels.length - 1) ? 'end' : 'clear'; sceneT = 0;
  }

  /* ---------- drawing helpers ---------- */
  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function text(str, x, y, size, weight, align, col, alpha) {
    ctx.globalAlpha = alpha === undefined ? 1 : alpha; ctx.fillStyle = col || '#fff';
    ctx.font = weight + ' ' + size + 'px "Segoe UI", system-ui, -apple-system, Roboto, sans-serif';
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.fillText(str, x, y); ctx.globalAlpha = 1;
  }
  const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
  const stars = []; for (let i = 0; i < 90; i++) stars.push({ x: hash(i + 1), y: hash(i + 77) * 0.62, r: 0.5 + hash(i + 9) * 1.6, p: hash(i + 31) * 6 });

  function hillY(x, seed, base, amp) {
    return base + Math.sin(x * 0.006 + seed) * amp + Math.sin(x * 0.015 + seed * 2.3) * amp * 0.45 + Math.sin(x * 0.0035 + seed * 0.7) * amp * 0.8;
  }
  function palm(x, y, size, col) {
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(2, size * 0.07); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + size * 0.12, y - size * 0.5, x + size * 0.04, y - size); ctx.stroke();
    const tx = x + size * 0.04, ty = y - size;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.55, l = size * 0.5;
      ctx.beginPath(); ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx + Math.cos(a) * l * 0.6, ty + Math.sin(a) * l * 0.6 - l * 0.2, tx + Math.cos(a) * l, ty + Math.sin(a) * l + l * 0.3); ctx.stroke();
    }
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgb(mixc(P.skyTop, mix))); g.addColorStop(0.55, rgb(mixc(P.skyMid, mix))); g.addColorStop(1, rgb(mixc(P.skyBot, mix)));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // stars (night)
    if (mix > 0.02) {
      for (let i = 0; i < stars.length; i++) {
        const st = stars[i], tw = 0.6 + 0.4 * Math.sin(clock * 1.7 + st.p);
        ctx.globalAlpha = mix * tw * 0.9; ctx.fillStyle = '#e8f6ff';
        ctx.beginPath(); ctx.arc(st.x * W, st.y * H, st.r, 0, 6.3); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // sun / moon
    const bx = W * 0.74, by = oy + ts * 3.3, br = ts * 1.9;
    if (mix < 0.98) {
      const sg = ctx.createRadialGradient(bx, by, br * 0.2, bx, by, br * 2.8);
      sg.addColorStop(0, 'rgba(255,210,120,.85)'); sg.addColorStop(0.35, 'rgba(255,120,110,.35)'); sg.addColorStop(1, 'rgba(255,120,110,0)');
      ctx.globalAlpha = 1 - mix; ctx.fillStyle = sg; ctx.fillRect(bx - br * 3, by - br * 3, br * 6, br * 6);
      ctx.fillStyle = '#ffd98a'; ctx.beginPath(); ctx.arc(bx, by + mix * ts * 3, br, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1;
    }
    if (mix > 0.02) {
      ctx.globalAlpha = mix;
      const mg = ctx.createRadialGradient(bx, by, br * 0.3, bx, by, br * 2.4);
      mg.addColorStop(0, 'rgba(170,240,255,.45)'); mg.addColorStop(1, 'rgba(170,240,255,0)');
      ctx.fillStyle = mg; ctx.fillRect(bx - br * 3, by - br * 3, br * 6, br * 6);
      ctx.fillStyle = '#e9fbff'; ctx.beginPath(); ctx.arc(bx, by + (1 - mix) * ts * 3, br * 0.8, 0, 6.3); ctx.fill();
      ctx.fillStyle = 'rgba(120,170,190,.35)';
      [[-0.25, -0.15, 0.2], [0.2, 0.1, 0.15], [-0.05, 0.3, 0.1]].forEach(function (c) { ctx.beginPath(); ctx.arc(bx + c[0] * br * 1.6, by + c[1] * br * 1.6, c[2] * br, 0, 6.3); ctx.fill(); });
      ctx.globalAlpha = 1;
    }
    // parallax delta silhouettes
    const px = (s.x - COLS / 2) * ts;
    [{ seed: 1.3, base: 0.62, amp: 0.05, k: 0.12, col: P.far, palms: true }, { seed: 4.1, base: 0.74, amp: 0.045, k: 0.28, col: P.near, palms: false }].forEach(function (l) {
      const off = px * l.k + (scene === 'title' ? clock * 8 : 0);
      ctx.fillStyle = rgb(mixc(l.col, mix)); ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) ctx.lineTo(x, hillY(x + off, l.seed, H * l.base, H * l.amp));
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      if (l.palms) {
        for (let i = 0; i < 9; i++) {
          const wx = i * W / 7 + hash(i + 5) * 60; const gx = ((wx - off * 0 ) % (W + 100));
          palm(gx, hillY(gx + off, l.seed, H * l.base, H * l.amp) + 4, ts * (1.5 + hash(i + 3) * 1.2), rgb(mixc(l.col, mix)));
        }
      }
    });
    // river shimmer
    const ry = H * 0.88;
    ctx.globalAlpha = 0.12; ctx.fillStyle = '#fff';
    for (let i = 0; i < 14; i++) { const x = ((i * 137 + clock * 12 * (1 + hash(i))) % (W + 100)) - 50; ctx.fillRect(x, ry + hash(i + 2) * H * 0.1, 30 + hash(i) * 50, 2); }
    ctx.globalAlpha = 1;
  }

  function accent(a) { return rgb(mixc(P.accent, mix)); }

  function drawTiles() {
    const A = mixc(P.solid, mix), E = mixc(P.solidEdge, mix);
    // extend solid ground past the edges of the playfield (wide / tall screens)
    ctx.fillStyle = rgb(A);
    for (let r = 0; r < ROWS; r++) {
      const y = oy + r * ts;
      if (ox > 0 && L.grid[r][0] === '#') ctx.fillRect(0, y - 0.5, ox + 1, ts + 1);
      if (ox > 0 && L.grid[r][COLS - 1] === '#') ctx.fillRect(ox + COLS * ts - 1, y - 0.5, ox + 2, ts + 1);
      if (r > 0 && L.grid[r - 1][0] !== '#' && L.grid[r][0] === '#' && ox > 0) { ctx.fillStyle = rgb(E); ctx.fillRect(0, y - 0.5, ox + 1, Math.max(3, ts * 0.1)); ctx.fillStyle = rgb(A); }
      if (r > 0 && L.grid[r - 1][COLS - 1] !== '#' && L.grid[r][COLS - 1] === '#' && ox > 0) { ctx.fillStyle = rgb(E); ctx.fillRect(ox + COLS * ts - 1, y - 0.5, ox + 2, Math.max(3, ts * 0.1)); ctx.fillStyle = rgb(A); }
    }
    for (let c = 0; c < COLS; c++) if (L.grid[ROWS - 1][c] === '#') ctx.fillRect(ox + c * ts - 0.5, oy + ROWS * ts - 1, ts + 1, H);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const ch = L.grid[r][c]; if (ch === '.' || ch === 'E') continue;
      const x = ox + c * ts, y = oy + r * ts;
      if (ch === '#') {
        ctx.fillStyle = rgb(A); ctx.fillRect(x - 0.5, y - 0.5, ts + 1, ts + 1);
        ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(x, y, ts, ts * 0.5);
        const up = r > 0 ? L.grid[r - 1][c] : '#';
        if (up !== '#') { ctx.fillStyle = rgb(E); ctx.fillRect(x - 0.5, y - 0.5, ts + 1, Math.max(3, ts * 0.1)); ctx.globalAlpha = 0.25; ctx.fillRect(x - 0.5, y, ts + 1, ts * 0.28); ctx.globalAlpha = 1; }
      } else if (ch === '1' || ch === '2') {
        const act = ch === '1' ? 1 - mix : mix, col = ch === '1' ? DUSK : NIGHT;
        if (act < 0.98) { // ghost outline
          ctx.globalAlpha = 0.45 * (1 - act); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.setLineDash([ts * 0.12, ts * 0.12]);
          rr(x + 2, y + 2, ts - 4, ts - 4, ts * 0.18); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        }
        if (act > 0.03) {
          ctx.globalAlpha = act; ctx.shadowColor = col; ctx.shadowBlur = ts * 0.5 * act;
          const gg = ctx.createLinearGradient(x, y, x, y + ts); gg.addColorStop(0, col); gg.addColorStop(1, ch === '1' ? '#ff7a45' : '#2aa9c9');
          ctx.fillStyle = gg; rr(x + 1, y + 1, ts - 2, ts - 2, ts * 0.2); ctx.fill();
          ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(x + ts * 0.14, y + ts * 0.12, ts * 0.72, ts * 0.14, ts * 0.07); ctx.fill(); ctx.globalAlpha = 1;
        }
      } else if (ch === '^' || ch === 'p' || ch === 'q') {
        const act = ch === '^' ? 1 : (ch === 'p' ? 1 - mix : mix), col = ch === 'p' ? DUSK : (ch === 'q' ? NIGHT : '#ffffff');
        const n = 2, w = ts / n;
        if (act < 0.98) {
          ctx.globalAlpha = 0.45 * (1 - act); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.setLineDash([ts * 0.1, ts * 0.1]);
          for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.moveTo(x + i * w + 2, y + ts); ctx.lineTo(x + i * w + w / 2, y + ts * 0.5); ctx.lineTo(x + (i + 1) * w - 2, y + ts); ctx.closePath(); ctx.stroke(); }
          ctx.setLineDash([]); ctx.globalAlpha = 1;
        }
        if (act > 0.03) {
          ctx.globalAlpha = act; ctx.shadowColor = '#ff4d6d'; ctx.shadowBlur = ts * 0.4 * act;
          for (let i = 0; i < n; i++) {
            const gg = ctx.createLinearGradient(0, y + ts * 0.5, 0, y + ts); gg.addColorStop(0, '#fff0f3'); gg.addColorStop(1, '#ff4d6d');
            ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(x + i * w + 1, y + ts); ctx.lineTo(x + i * w + w / 2, y + ts * 0.48); ctx.lineTo(x + (i + 1) * w - 1, y + ts); ctx.closePath(); ctx.fill();
          }
          ctx.shadowBlur = 0; ctx.globalAlpha = 1;
          if (ch !== '^') { ctx.fillStyle = col; ctx.globalAlpha = act; ctx.fillRect(x + ts * 0.08, y + ts - 3, ts * 0.84, 3); ctx.globalAlpha = 1; }
        }
      }
    }
  }

  function drawExit() {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (L.grid[r][c] === 'E') {
      const x = ox + (c + 0.5) * ts, y = oy + (r + 0.5) * ts, pul = 1 + Math.sin(clock * 3) * 0.06;
      const g = ctx.createRadialGradient(x, y, 0, x, y, ts * 1.3);
      g.addColorStop(0, 'rgba(255,240,170,.8)'); g.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = g; ctx.fillRect(x - ts * 1.4, y - ts * 1.4, ts * 2.8, ts * 2.8);
      ctx.save(); ctx.translate(x, y);
      for (let i = 0; i < 3; i++) {
        ctx.rotate(clock * (i % 2 ? -1 : 1) * (0.8 + i * 0.4));
        ctx.strokeStyle = i === 1 ? '#ffffff' : '#ffe27a'; ctx.lineWidth = 2; ctx.setLineDash([ts * 0.25, ts * 0.12]);
        ctx.beginPath(); ctx.arc(0, 0, ts * (0.46 - i * 0.1) * pul, 0, 6.3); ctx.stroke();
      }
      ctx.setLineDash([]); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, ts * 0.08, 0, 6.3); ctx.fill();
    }
  }

  function drawPlayer() {
    if (s.dead) return;
    const w = T.W * ts, h = T.H * ts, x = ox + s.x * ts, y = oy + s.y * ts;
    const col = s.w ? NIGHT : DUSK;
    const sx = 1 + squash * 0.8, sy = 1 - squash;
    ctx.save(); ctx.translate(x + w / 2, y + h); ctx.scale(sx, sy);
    ctx.shadowColor = col; ctx.shadowBlur = ts * 0.7;
    const g = ctx.createLinearGradient(0, -h, 0, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(1, col);
    ctx.fillStyle = g; rr(-w / 2, -h, w, h, w * 0.32); ctx.fill(); ctx.shadowBlur = 0;
    // eyes
    const ex = s.face * w * 0.12, ey = -h * 0.62;
    ctx.fillStyle = '#1a0f2e';
    ctx.beginPath(); ctx.ellipse(ex - w * 0.17, ey, w * 0.075, h * 0.1, 0, 0, 6.3); ctx.ellipse(ex + w * 0.17, ey, w * 0.075, h * 0.1, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ex - w * 0.15 + s.face * 1, ey - h * 0.03, w * 0.025, 0, 6.3); ctx.arc(ex + w * 0.19 + s.face * 1, ey - h * 0.03, w * 0.025, 0, 6.3); ctx.fill();
    ctx.restore();
    // blocked-shift warning: show where the other world's solids are
    if (blockFlash > 0) { ctx.globalAlpha = blockFlash * 0.9; ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 3; rr(x - 3, y - 3, w + 6, h + 6, w * 0.4); ctx.stroke(); ctx.globalAlpha = 1; }
  }

  function drawFx() {
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i], t = 1 - r.life / r.max;
      ctx.globalAlpha = (1 - t) * 0.8; ctx.strokeStyle = r.col; ctx.lineWidth = 4 * (1 - t) + 1;
      ctx.beginPath(); ctx.arc(ox + r.x * ts, oy + r.y * ts, t * ts * 7, 0, 6.3); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]; ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(ox + p.x * ts, oy + p.y * ts, p.size * ts, 0, 6.3); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // ambient motes
    ctx.fillStyle = mix > 0.5 ? NIGHT : DUSK;
    for (let i = 0; i < 22; i++) {
      const x = ((hash(i) * W + Math.sin(clock * 0.4 + i) * 30 + clock * (6 + hash(i + 3) * 8)) % W);
      const y = (hash(i + 9) * H * 0.75 + Math.sin(clock * 0.6 + i * 2) * 14);
      ctx.globalAlpha = 0.18 + 0.18 * Math.sin(clock * 2 + i); ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 6.3); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function fmt(t) { const m = Math.floor(t / 60), sec = t - m * 60; return (m ? m + ':' : '') + (m && sec < 10 ? '0' : '') + sec.toFixed(2); }

  function drawHUD() {
    const pad = Math.max(14, ts * 0.35), fs = Math.max(13, ts * 0.42);
    text('LEVEL ' + (li + 1) + '/' + levels.length, pad, pad + fs * 0.4, fs * 0.8, 600, 'left', '#fff', 0.65);
    text(L.name.toUpperCase(), pad, pad + fs * 1.5, fs * 1.4, 800, 'left', '#fff', 0.95);
    const t = carry.time + s.time;
    text(fmt(t), W - pad, pad + fs * 0.5, fs * 1.5, 700, 'right', '#fff', 0.95);
    text('SHIFTS ' + s.shifts + '   DEATHS ' + (carry.deaths), W - pad, pad + fs * 1.75, fs * 0.8, 600, 'right', '#fff', 0.65);
    // world pill
    const pw = ts * 3.6, ph = ts * 0.8, px = W / 2 - pw / 2, py = pad * 0.7;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(px, py, pw, ph, ph / 2); ctx.fill();
    const kx = px + ph / 2 + (pw - ph) * mix;
    ctx.fillStyle = s.w ? NIGHT : DUSK; ctx.shadowColor = s.w ? NIGHT : DUSK; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(kx, py + ph / 2, ph * 0.38, 0, 6.3); ctx.fill(); ctx.shadowBlur = 0;
    text('DUSK', px + pw * 0.27, py + ph / 2, ph * 0.38, 700, 'center', '#fff', 0.8 - mix * 0.45);
    text('NIGHT', px + pw * 0.75, py + ph / 2, ph * 0.38, 700, 'center', '#fff', 0.35 + mix * 0.45);
    // hint
    if (hintT < 9 || carry.deaths >= 2) {
      const a = Math.min(1, hintT) * (hintT > 8 ? Math.max(0, 9 - hintT) : 1);
      const hint = L.hint;
      ctx.font = '600 ' + (fs * 0.95) + 'px system-ui, sans-serif';
      const tw = ctx.measureText(hint).width + 36;
      ctx.globalAlpha = (carry.deaths >= 2 ? 1 : a) * 0.9; ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(W / 2 - tw / 2, H - ts * 1.25 - fs, tw, fs * 2.2, fs * 1.1); ctx.fill();
      ctx.globalAlpha = 1; text(hint, W / 2, H - ts * 1.25, fs * 0.95, 600, 'center', '#fff', carry.deaths >= 2 ? 1 : a);
    }
    if (li === 0 && hintT < 12) text('MOVE  ← → / A D     JUMP  SPACE     SHIFT  ⇧ (either Shift key, or E)     RESTART  R', W / 2, H - ts * 0.55, fs * 0.8, 500, 'center', '#fff', 0.7);
  }

  function panel(w, h) {
    ctx.fillStyle = 'rgba(8,4,20,.62)'; ctx.fillRect(0, 0, W, H);
    const x = W / 2 - w / 2, y = H / 2 - h / 2;
    ctx.fillStyle = 'rgba(20,10,40,.78)'; rr(x, y, w, h, 24); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5; rr(x, y, w, h, 24); ctx.stroke();
    return { x, y };
  }

  function drawTitle() {
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.34, size = Math.min(W * 0.12, ts * 3.4);
    const off = Math.sin(clock * 1.2) * 2 + 6 * Math.max(0, Math.sin(clock * 0.8 + 1) - 0.8) * 5;
    ctx.save(); ctx.font = '900 ' + size + 'px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = (size * 0.06) + 'px';
    ctx.fillStyle = DUSK; ctx.globalAlpha = 0.9; ctx.fillText('SHIFTLINE', cx - off - 3, cy);
    ctx.fillStyle = NIGHT; ctx.fillText('SHIFTLINE', cx + off + 3, cy);
    ctx.globalAlpha = 1; ctx.shadowColor = '#fff'; ctx.shadowBlur = 24; ctx.fillStyle = '#fff'; ctx.fillText('SHIFTLINE', cx, cy);
    ctx.restore();
    const fs = Math.max(14, ts * 0.5);
    text('A TWO-WORLD PLATFORMER  •  GAME OFF 2026  •  THEME: SHIFT', cx, cy + size * 0.72, fs * 0.9, 600, 'center', '#fff', 0.8);
    const blink = 0.55 + 0.45 * Math.sin(clock * 4);
    text('PRESS SPACE OR TAP TO START', cx, H * 0.62, fs * 1.4, 800, 'center', '#fff', blink);
    const lines = ['Two worlds share one map. Platforms, walls and spikes exist in only one of them.', 'Press SHIFT (either Shift key) to swap worlds — but you cannot shift while inside a wall.',
      'Reach the glowing portal.  Move: ← → / A D   Jump: Space   Restart: R   Mute: M'];
    ctx.fillStyle = 'rgba(8,4,20,.5)'; rr(cx - Math.min(W * 0.46, fs * 25), H * 0.72 - fs * 1.2, Math.min(W * 0.92, fs * 50), fs * 5.4, 18); ctx.fill();
    lines.forEach(function (l, i) { text(l, cx, H * 0.72 + i * fs * 1.5, fs * 0.95, 500, 'center', '#fff', 0.75); });
    let total = 0, have = 0; for (let i = 0; i < levels.length; i++) { const b = getBest(i); if (b !== null) { total += b; have++; } }
    if (have === levels.length) text('BEST TOTAL  ' + fmt(total), cx, H * 0.92, fs, 700, 'center', '#ffe27a', 0.9);
  }

  function drawClear() {
    const fs = Math.max(14, ts * 0.5), pw = Math.min(W * 0.9, ts * 11), ph = ts * 6.2;
    const p = panel(pw, ph), cx = W / 2;
    text('LEVEL COMPLETE', cx, p.y + ph * 0.17, fs * 2, 900, 'center', '#ffe27a');
    text(L.name, cx, p.y + ph * 0.32, fs * 1.2, 600, 'center', '#fff', 0.8);
    text('TIME  ' + fmt(carry.final) + (newBest ? '   ★ NEW BEST' : (getBest(li) !== null ? '   (best ' + fmt(getBest(li)) + ')' : '')), cx, p.y + ph * 0.5, fs * 1.3, 700, 'center', '#fff');
    text('SHIFTS ' + s.shifts + '    DEATHS ' + carry.deaths, cx, p.y + ph * 0.64, fs * 1, 600, 'center', '#fff', 0.75);
    text('SPACE / TAP → NEXT LEVEL', cx, p.y + ph * 0.84, fs * 1.1, 800, 'center', '#fff', 0.55 + 0.45 * Math.sin(clock * 4));
  }
  function drawEnd() {
    const fs = Math.max(14, ts * 0.5), pw = Math.min(W * 0.92, ts * 13), ph = ts * 7.4;
    const p = panel(pw, ph), cx = W / 2;
    text('YOU SHIFTED THE WORLD', cx, p.y + ph * 0.15, fs * 2, 900, 'center', '#5ff3e4');
    text('All ' + levels.length + ' levels complete', cx, p.y + ph * 0.3, fs * 1.2, 600, 'center', '#fff', 0.85);
    text('TOTAL TIME  ' + fmt(totalTime) + '     DEATHS  ' + totalDeaths, cx, p.y + ph * 0.46, fs * 1.3, 700, 'center', '#fff');
    text('Made for GitHub Game Off 2026 by FutureTech.ai', cx, p.y + ph * 0.62, fs * 1, 500, 'center', '#fff', 0.7);
    text('Thanks for playing!', cx, p.y + ph * 0.74, fs * 1, 500, 'center', '#fff', 0.7);
    text('SPACE / TAP → TITLE', cx, p.y + ph * 0.89, fs * 1.1, 800, 'center', '#fff', 0.55 + 0.45 * Math.sin(clock * 4));
  }

  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake * ts * 0.35, (Math.random() - 0.5) * shake * ts * 0.35);
    drawBackground();
    if (scene !== 'title') { drawTiles(); drawExit(); drawPlayer(); }
    drawFx();
    ctx.restore();
    // shift flash + vignette
    if (flash > 0) { ctx.globalAlpha = flash * 0.22; ctx.fillStyle = flashCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (s.dead) { ctx.globalAlpha = Math.min(0.35, deadT); ctx.fillStyle = '#ff2d55'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (scene === 'title') drawTitle();
    else { drawHUD(); if (scene === 'clear') drawClear(); else if (scene === 'end') drawEnd(); }
    text(muted ? 'MUTED (M)' : '', W - 12, H - 12, 12, 600, 'right', '#fff', 0.6);
  }

  /* ---------- main loop ---------- */
  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(0.1, (now - last) / 1000); last = now;
    while (acc >= STEP) { tick(); acc -= STEP; }
    render(); requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // optional ?level=N jump (handy for testing)
  try { const q = /[?&]level=(\d+)/.exec(location.search); if (q) loadLevel(Math.max(0, Math.min(levels.length - 1, +q[1] - 1))); } catch (e) { /* ignore */ }

  // debug / test hook
  window.__shiftline = { get scene() { return scene; }, load: loadLevel, state: function () { return s; } };
})();
