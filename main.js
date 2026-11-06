/* SHIFTLINE - rendering, audio, input, menus, progress, ghosts */
(function () {
  'use strict';
  const { COLS, ROWS, T, levels } = Sim;
  const NLEV = levels.length;
  const cv = document.getElementById('c');
  const ctx = cv.getContext('2d');
  const FONT = '"Segoe UI","Nirmala UI","Noto Sans Bengali","Hind Siliguri",system-ui,-apple-system,Roboto,sans-serif';
  let W = 0, H = 0, DPR = 1, ts = 32, ox = 0, oy = 0;

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ts = Math.min(W / COLS, H / ROWS);
    ox = (W - ts * COLS) / 2; oy = (H - ts * ROWS) / 2;
  }
  window.addEventListener('resize', resize); resize();

  /* ============ settings, save data, language ============ */
  function loadJSON(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } }
  function storeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  const settings = Object.assign({ music: 0.7, sfx: 0.8, lang: 'en', shake: true, patterns: false, ghost: true }, loadJSON('shiftline.settings', {}));
  const save = Object.assign({ levels: {} }, loadJSON('shiftline.save', {}));
  const saveSettings = () => storeJSON('shiftline.settings', settings);
  const saveProgress = () => storeJSON('shiftline.save', save);

  const I18 = {
    en: {
      play: 'PLAY', cont: 'CONTINUE', levels: 'LEVELS', settings: 'SETTINGS', credits: 'CREDITS', back: 'BACK',
      resume: 'RESUME', restart: 'RESTART LEVEL', menu: 'MAIN MENU', music: 'Music', sfx: 'Sound effects', language: 'Language',
      shake: 'Screen shake', patterns: 'Colour-blind patterns', ghost: 'Best-run ghost', fullscreen: 'Fullscreen', on: 'ON', off: 'OFF',
      chapter: 'CHAPTER', level: 'LEVEL', shifts: 'SHIFTS', deaths: 'DEATHS', shards: 'SHARDS', best: 'best', par: 'PAR',
      newbest: 'NEW BEST', complete: 'LEVEL COMPLETE', next: 'NEXT LEVEL', retry: 'RETRY', paused: 'PAUSED', locked: 'LOCKED',
      sub: 'A TWO-WORLD PLATFORMER  •  GAME OFF 2026  •  THEME: SHIFT',
      how1: 'Two worlds share one map. Platforms, walls and spikes exist in only one of them.',
      how2: 'Press SHIFT (either Shift key) to swap worlds — but not while inside a wall or a lock zone.',
      how3: 'Reach the glowing portal. Collect shards and beat par for 3 stars.',
      ctl: 'MOVE  ← → / A D     JUMP  SPACE     SHIFT  ⇧ (either Shift key, or E)     RESTART  R     PAUSE  P',
      endTitle: 'YOU SHIFTED THE WORLD', endSub: 'All levels complete', total: 'TOTAL TIME', stars: 'STARS', thanks: 'Thanks for playing!',
      made: 'Made for GitHub Game Off 2026 by FutureTech.ai', gravity: 'GRAVITY', gravUp: 'UP', gravDown: 'DOWN', lockTip: 'SHIFT LOCKED HERE',
      c1: 'Dusk / Night', c2: 'Ember / Frost', c3: 'Bloom / Void', tap: 'PRESS SPACE OR TAP TO START', ghostLbl: 'GHOST', muted: 'MUTED (M)',
      cr1: 'Design, code, art & sound: FutureTech.ai', cr2: 'Built with plain JavaScript, Canvas 2D and Web Audio.', cr3: 'Source: github.com/shahriarsharif406/shiftline',
      cr4: 'Controls: Arrows/AD move, Space jump, Shift swap worlds, R restart, P pause, M mute, F fullscreen.', cr5: 'Gamepad: stick/d-pad, A jump, X/B/bumpers shift, Start pause.',
    },
    bn: {
      play: 'খেলুন', cont: 'চালিয়ে যান', levels: 'লেভেল', settings: 'সেটিংস', credits: 'ক্রেডিট', back: 'ফিরে যান',
      resume: 'চালিয়ে যান', restart: 'লেভেল আবার শুরু', menu: 'মূল মেনু', music: 'সঙ্গীত', sfx: 'শব্দ', language: 'ভাষা',
      shake: 'স্ক্রিন কাঁপুনি', patterns: 'বর্ণান্ধ-বান্ধব নকশা', ghost: 'সেরা রানের ঘোস্ট', fullscreen: 'পূর্ণ পর্দা', on: 'চালু', off: 'বন্ধ',
      chapter: 'অধ্যায়', level: 'লেভেল', shifts: 'শিফট', deaths: 'মৃত্যু', shards: 'শার্ড', best: 'সেরা', par: 'লক্ষ্য',
      newbest: 'নতুন রেকর্ড', complete: 'লেভেল সম্পূর্ণ', next: 'পরের লেভেল', retry: 'আবার', paused: 'বিরতি', locked: 'বন্ধ',
      sub: 'দুই জগতের প্ল্যাটফর্মার  •  গেম অফ ২০২৬  •  থিম: SHIFT',
      how1: 'দুটি জগৎ একই ম্যাপ ভাগ করে। প্ল্যাটফর্ম, দেয়াল ও কাঁটা শুধু একটি জগতে থাকে।',
      how2: 'জগৎ বদলাতে SHIFT চাপুন — তবে দেয়াল বা লক জোনের ভেতরে নয়।',
      how3: 'জ্বলজ্বলে পোর্টালে পৌঁছান। শার্ড কুড়ান আর লক্ষ্য-সময়ের মধ্যে শেষ করে ৩ তারা পান।',
      ctl: 'চলা  ← → / A D     লাফ  SPACE     শিফট  ⇧ (যেকোনো Shift বা E)     আবার  R     বিরতি  P',
      endTitle: 'আপনি জগৎ বদলে দিয়েছেন', endSub: 'সব লেভেল শেষ', total: 'মোট সময়', stars: 'তারা', thanks: 'খেলার জন্য ধন্যবাদ!',
      made: 'GitHub Game Off 2026-এর জন্য FutureTech.ai-এর তৈরি', gravity: 'মাধ্যাকর্ষণ', gravUp: 'ওপরে', gravDown: 'নিচে', lockTip: 'এখানে শিফট বন্ধ',
      c1: 'গোধূলি / রাত', c2: 'অঙ্গার / তুষার', c3: 'প্রস্ফুটন / শূন্য', tap: 'শুরু করতে SPACE চাপুন বা ট্যাপ করুন', ghostLbl: 'ঘোস্ট', muted: 'মিউট (M)',
      cr1: 'ডিজাইন, কোড, আর্ট ও সাউন্ড: FutureTech.ai', cr2: 'সাধারণ JavaScript, Canvas 2D ও Web Audio দিয়ে তৈরি।', cr3: 'সোর্স: github.com/shahriarsharif406/shiftline',
      cr4: 'কন্ট্রোল: তীর/AD চলা, Space লাফ, Shift জগৎ বদল, R আবার, P বিরতি, M মিউট, F পূর্ণ পর্দা।', cr5: 'গেমপ্যাড: স্টিক/ডি-প্যাড, A লাফ, X/B/বাম্পার শিফট, Start বিরতি।',
    },
  };
  const LEVEL_BN = [
    ['প্রথম আলো', 'জগৎ বদলাতে SHIFT চাপুন। সেতুটি শুধু রাতের জগতে আছে।'],
    ['পাথরের সিঁড়ি', 'শূন্যে থাকতেই শিফট করে পরের প্ল্যাটফর্মে নামুন।'],
    ['সুড়ঙ্গ', 'লাফানোর জায়গা নেই। কাঁটার মাঝের নিরাপদ ঘরে শিফট করুন।'],
    ['আরোহণ', 'উপরে উঠুন! প্রতিটি তাক আলাদা জগতে থাকে।'],
    ['খোলা পথ', 'কাঁটার কার্পেট লাফিয়ে পার হওয়া যায় না। ঠিক জগতে থেকে হেঁটে পার হোন।'],
    ['গ্রহণ', 'সবকিছু একসাথে। সময়জ্ঞান ঠিক রাখুন।'],
    ['স্প্রিং-লাফ', 'বাউন্স প্যাড আপনাকে অনেক উঁচুতে ছুড়ে দেয়। তারপর শিফট করে সেতু পার হোন।'],
    ['তুষার-তালা', 'লাল জোনের ভেতরে শিফট করা যায় না। ঢোকার আগেই শিফট করুন।'],
    ['হিমবাহের ধাপ', 'আলাদা জগতের তাকগুলোর মাঝে বাউন্স করে এগোন।'],
    ['তুষারঝড়', 'জগৎ ঠিক করে নিন: কার্পেট, দেয়াল, সেতু। এই ক্রমে।'],
    ['উল্টো দুনিয়া', 'শূন্য জগতে মাধ্যাকর্ষণ ওপরের দিকে। কাঁটার ওপর দিয়ে ছাদে হাঁটুন।'],
    ['স্তম্ভ', 'ঝুলন্ত স্তম্ভের নিচ দিয়ে যান, দাঁড়ানো স্তম্ভের ওপর দিয়ে উঠুন।'],
    ['যমজ নদী', 'দেয়ালের নিচের তাকে নামুন, তারপর আবার উঠুন।'],
    ['শিফটলাইন', 'ছাদে থেকে লক জোনে ঢুকুন। বেরিয়ে নিচে নামুন।'],
  ];
  const tr = (k) => (I18[settings.lang] && I18[settings.lang][k]) || I18.en[k] || k;
  const lvName = (i) => settings.lang === 'bn' && LEVEL_BN[i] ? LEVEL_BN[i][0] : levels[i].name;
  const lvHint = (i) => settings.lang === 'bn' && LEVEL_BN[i] ? LEVEL_BN[i][1] : levels[i].hint;

  /* ============ themes ============ */
  const THEMES = [
    { names: { en: ['DUSK', 'NIGHT'], bn: ['গোধূলি', 'রাত'] }, acc: ['#ffb047', '#5ff3e4'], acc2: ['#ff7a45', '#2aa9c9'],
      skyTop: [[44, 14, 88], [3, 9, 26]], skyMid: [[196, 62, 122], [10, 40, 78]], skyBot: [[255, 178, 104], [16, 98, 112]],
      far: [[98, 28, 104], [6, 28, 52]], near: [[58, 18, 78], [4, 18, 36]], solid: [[34, 14, 48], [5, 20, 30]], edge: [[255, 150, 90], [70, 235, 220]], sun: '#ffd98a', moon: '#e9fbff' },
    { names: { en: ['EMBER', 'FROST'], bn: ['অঙ্গার', 'তুষার'] }, acc: ['#ff7043', '#8fd3ff'], acc2: ['#d92d20', '#4aa3df'],
      skyTop: [[52, 8, 12], [10, 24, 60]], skyMid: [[160, 40, 30], [40, 90, 150]], skyBot: [[255, 140, 60], [170, 220, 255]],
      far: [[90, 20, 20], [38, 70, 120]], near: [[50, 12, 14], [24, 48, 92]], solid: [[40, 12, 12], [18, 36, 64]], edge: [[255, 120, 60], [170, 225, 255]], sun: '#ffb36b', moon: '#f2fbff' },
    { names: { en: ['BLOOM', 'VOID'], bn: ['প্রস্ফুটন', 'শূন্য'] }, acc: ['#7dff9a', '#c77dff'], acc2: ['#22b455', '#7b3fd1'],
      skyTop: [[12, 50, 48], [10, 4, 30]], skyMid: [[36, 120, 100], [44, 16, 92]], skyBot: [[150, 240, 170], [120, 40, 160]],
      far: [[20, 80, 70], [28, 10, 70]], near: [[12, 50, 44], [18, 6, 48]], solid: [[10, 40, 38], [14, 6, 36]], edge: [[130, 255, 170], [200, 140, 255]], sun: '#d6ffa8', moon: '#2a0f4a' },
  ];
  let TH = THEMES[0];
  const rgb = (a) => 'rgb(' + (a[0] | 0) + ',' + (a[1] | 0) + ',' + (a[2] | 0) + ')';
  const lerp = (a, b, t) => a + (b - a) * t;
  const mixc = (p, t) => [lerp(p[0][0], p[1][0], t), lerp(p[0][1], p[1][1], t), lerp(p[0][2], p[1][2], t)];
  const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

  /* ============ game state ============ */
  let scene = 'title';       // title | levels | settings | credits | play | pause | clear | end
  let li = 0, L = levels[0], s = Sim.newState(L);
  let deaths = 0, mix = 0, clock = 0, sceneT = 0, introT = 0, fade = 1;
  let shake = 0, flash = 0, flashCol = '#fff', blockFlash = 0, lockFlash = 0, squash = 0, deadT = 0, winT = 0, padFlash = null;
  let res = null;            // last level result
  let rec = [], ghostData = null, gs = null, gIdx = 0;
  const parts = [], rings = [], keys = {};
  let shiftQueued = false, sel = 0, btns = [], mouse = { x: -1, y: -1 }, noFade = false;

  const lvDone = (i) => !!save.levels[i];
  const maxDone = () => { let m = -1; for (let i = 0; i < NLEV; i++) if (lvDone(i)) m = i; return m; };
  const unlocked = (i) => i <= maxDone() + 2;
  const fmt = (t) => { const m = Math.floor(t / 60), sec = t - m * 60; return (m ? m + ':' : '') + (m && sec < 10 ? '0' : '') + sec.toFixed(2); };
  const totalStars = () => { let n = 0; for (const k in save.levels) n += save.levels[k].stars || 0; return n; };

  function rleEnc(a) { if (!a.length) return []; const o = []; let p = a[0], n = 1; for (let i = 1; i < a.length; i++) { if (a[i] === p && n < 65535) n++; else { o.push(p, n); p = a[i]; n = 1; } } o.push(p, n); return o; }
  function rleDec(r) { const o = []; for (let i = 0; i + 1 < r.length; i += 2) for (let k = 0; k < r[i + 1]; k++) o.push(r[i]); return o; }

  function loadLevel(i) {
    li = i; L = levels[i]; TH = THEMES[L.ch]; s = Sim.newState(L);
    deaths = 0; mix = 0; deadT = 0; winT = 0; introT = 0; fade = 1; scene = 'play'; sceneT = 0; shiftQueued = false;
    parts.length = 0; rings.length = 0; rec = [];
    const g = loadJSON('shiftline.ghost.' + i, null);
    ghostData = g && Array.isArray(g.d) ? rleDec(g.d) : null; gs = ghostData ? Sim.newState(L) : null; gIdx = 0;
    setChapterAudio(L.ch); padWorld(0);
  }
  function respawn(countDeath) {
    if (countDeath) deaths++;
    s = Sim.newState(L); mix = 0; deadT = 0; shiftQueued = false; rec = [];
    gs = ghostData ? Sim.newState(L) : null; gIdx = 0; padWorld(0);
  }
  function go(sc) { scene = sc; sceneT = 0; sel = 0; if (sc === 'title' || sc === 'settings' || sc === 'credits') TH = THEMES[0]; fade = Math.max(fade, 0.5); }

  /* ============ audio ============ */
  let AC = null, master = null, sfxBus = null, musBus = null, padA, padB, padF, musicWorld = 0, chap = 0, arpI = 2;
  const ROOTS = [[110, 73.4], [98, 65.4], [123.5, 82.4]];
  const SCALES = [
    [[293.7, 349.2, 392, 440, 523.3, 587.3], [146.8, 174.6, 196, 220, 261.6, 293.7]],
    [[261.6, 311.1, 349.2, 392, 466.2, 523.3], [130.8, 155.6, 174.6, 196, 233.1, 261.6]],
    [[329.6, 370, 415.3, 493.9, 554.4, 659.3], [164.8, 185, 207.7, 246.9, 277.2, 329.6]],
  ];
  function applyVolumes() { if (!AC) return; sfxBus.gain.value = settings.sfx; musBus.gain.value = settings.music; }
  function initAudio() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.gain.value = 0.55; master.connect(AC.destination);
      sfxBus = AC.createGain(); sfxBus.connect(master); musBus = AC.createGain(); musBus.connect(master); applyVolumes();
      padF = AC.createBiquadFilter(); padF.type = 'lowpass'; padF.frequency.value = 520;
      const pg = AC.createGain(); pg.gain.value = 0.05; padF.connect(pg); pg.connect(musBus);
      padA = AC.createOscillator(); padB = AC.createOscillator();
      padA.type = 'sawtooth'; padB.type = 'sawtooth'; padA.frequency.value = ROOTS[chap][0]; padB.frequency.value = ROOTS[chap][0] * 1.5; padB.detune.value = 7;
      padA.connect(padF); padB.connect(padF); padA.start(); padB.start();
      setInterval(arp, 260);
    } catch (e) { AC = null; }
  }
  function tone(f, d, type, v, slide, delay, bus) {
    if (!AC) return;
    const t0 = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + d);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v || 0.2, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g); g.connect(bus || sfxBus); o.start(t0); o.stop(t0 + d + 0.05);
  }
  function noise(d, v, f0, f1) {
    if (!AC) return;
    const n = Math.floor(AC.sampleRate * d), b = AC.createBuffer(1, n, AC.sampleRate), data = b.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = AC.createBufferSource(); src.buffer = b;
    const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    const t0 = AC.currentTime; f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + d);
    const g = AC.createGain(); g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    src.connect(f); f.connect(g); g.connect(sfxBus); src.start();
  }
  function arp() {
    if (!AC || settings.music <= 0.001 || scene === 'end') return;
    const w = musicWorld;
    if (w === 1 && Math.random() < 0.45) return;
    arpI = Math.max(0, Math.min(5, arpI + (Math.random() < 0.5 ? -1 : 1) * (1 + (Math.random() < 0.3 ? 1 : 0))));
    tone(SCALES[chap][w][arpI] * (w ? 2 : 1), w ? 0.9 : 0.5, w ? 'sine' : 'triangle', w ? 0.05 : 0.045, 0, 0, musBus);
  }
  function setChapterAudio(c) { chap = c; }
  function padWorld(w) {
    musicWorld = w; if (!AC) return;
    const t = AC.currentTime, r = ROOTS[chap][w];
    padA.frequency.setTargetAtTime(r, t, 0.25); padB.frequency.setTargetAtTime(r * 1.5, t, 0.25); padF.frequency.setTargetAtTime(w ? 330 : 560, t, 0.3);
  }
  const sfx = {
    jump() { tone(340, 0.16, 'square', 0.07, 320); }, land() { noise(0.07, 0.12, 400, 120); },
    shift(w) { noise(0.32, 0.22, w ? 3200 : 600, w ? 500 : 3000); tone(w ? 520 : 260, 0.3, 'sine', 0.1, w ? -260 : 260); padWorld(w); },
    blocked() { tone(120, 0.2, 'sawtooth', 0.12, -60); tone(95, 0.2, 'square', 0.06, -30); },
    locked() { tone(180, 0.1, 'square', 0.09, 0); tone(150, 0.14, 'square', 0.09, 0, 0.11); },
    bounce() { tone(220, 0.28, 'sine', 0.16, 500); tone(330, 0.2, 'triangle', 0.08, 400, 0.04); },
    shard() { tone(988, 0.18, 'triangle', 0.12); tone(1319, 0.3, 'triangle', 0.1, 0, 0.08); },
    die() { noise(0.4, 0.28, 1400, 70); tone(220, 0.4, 'sawtooth', 0.12, -170); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.45, 'triangle', 0.13, 0, i * 0.1)); },
    star() { tone(880, 0.25, 'sine', 0.1); }, ui() { tone(660, 0.08, 'triangle', 0.08); }, move() { tone(520, 0.05, 'sine', 0.05); },
  };

  /* ============ input ============ */
  const SHIFT_CODES = ['ShiftLeft', 'ShiftRight', 'KeyE', 'KeyX'];
  let padPrev = { shift: false, ok: false, back: false, up: false, down: false, left: false, right: false, start: false };
  function pad() {
    const out = { left: false, right: false, jump: false, shift: false, ok: false, back: false, up: false, down: false, start: false };
    try {
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      for (let i = 0; i < gps.length; i++) {
        const g = gps[i]; if (!g || !g.connected) continue;
        const b = (n) => !!(g.buttons[n] && g.buttons[n].pressed), ax = g.axes[0] || 0, ay = g.axes[1] || 0;
        out.left = out.left || ax < -0.4 || b(14); out.right = out.right || ax > 0.4 || b(15);
        out.up = out.up || ay < -0.5 || b(12); out.down = out.down || ay > 0.5 || b(13);
        out.jump = out.jump || b(0) || b(12); out.shift = out.shift || b(1) || b(2) || b(4) || b(5) || b(3);
        out.ok = out.ok || b(0); out.back = out.back || b(1); out.start = out.start || b(9);
      }
    } catch (e) { /* ignore */ }
    return out;
  }
  function pollPad() {
    const g = pad();
    if (g.shift && !padPrev.shift && scene === 'play') shiftQueued = true;
    if (scene !== 'play') {
      if (g.up && !padPrev.up) navKey('up'); if (g.down && !padPrev.down) navKey('down');
      if (g.left && !padPrev.left) navKey('left'); if (g.right && !padPrev.right) navKey('right');
      if (g.ok && !padPrev.ok) navKey('ok'); if (g.back && !padPrev.back) navKey('back');
    }
    if (g.start && !padPrev.start) { if (scene === 'play') go('pause'); else if (scene === 'pause') { scene = 'play'; } }
    padPrev = g;
    return g;
  }

  function fullscreenToggle() {
    try {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen();
    } catch (e) { /* ignore */ }
  }

  function activate(id) {
    initAudio(); sfx.ui();
    if (id === 'play') { const nx = Math.min(NLEV - 1, maxDone() + 1); loadLevel(nx); }
    else if (id === 'levels') go('levels');
    else if (id === 'settings') go('settings');
    else if (id === 'credits') go('credits');
    else if (id === 'back' || id === 'menu') go('title');
    else if (id === 'resume') scene = 'play';
    else if (id === 'restart') { respawn(false); scene = 'play'; }
    else if (id === 'retry') loadLevel(li);
    else if (id === 'next') { if (li + 1 < NLEV) loadLevel(li + 1); else go('end'); }
    else if (id === 'lang') { settings.lang = settings.lang === 'en' ? 'bn' : 'en'; saveSettings(); }
    else if (id === 'shake' || id === 'patterns' || id === 'ghost') { settings[id] = !settings[id]; saveSettings(); }
    else if (id === 'fs') fullscreenToggle();
    else if (id === 'pause-levels') go('levels');
    else if (id.indexOf('lv:') === 0) { const i = +id.slice(3); if (unlocked(i)) loadLevel(i); else sfx.blocked(); }
  }
  function adjust(id, dir) {
    if (id === 'music' || id === 'sfx') { settings[id] = Math.max(0, Math.min(1, Math.round((settings[id] + dir * 0.1) * 10) / 10)); applyVolumes(); saveSettings(); sfx.move(); }
    else if (id === 'lang' || id === 'shake' || id === 'patterns' || id === 'ghost') activate(id);
  }

  // menu / grid navigation, shared by keyboard + gamepad
  function navKey(k) {
    initAudio();
    if (scene === 'play') return;
    const n = btns.length; if (!n) return;
    if (scene === 'levels') {
      const cur = btns[sel] ? btns[sel].id : 'back';
      if (k === 'back') { go('title'); return; }
      if (k === 'ok') { activate(cur); return; }
      if (cur === 'back') { if (k === 'up') sel = NLEV - 1; sfx.move(); return; }
      const i = +cur.slice(3), ch = levels[i].ch;
      const first = levels.findIndex(l => l.ch === ch), off = i - first;
      const rowLen = (c) => levels.filter(l => l.ch === c).length;
      const rowFirst = (c) => levels.findIndex(l => l.ch === c);
      if (k === 'left') sel = Math.max(0, i - 1);
      else if (k === 'right') sel = Math.min(NLEV - 1, i + 1);
      else if (k === 'up' && ch > 0) sel = rowFirst(ch - 1) + Math.min(off, rowLen(ch - 1) - 1);
      else if (k === 'down') sel = ch < 2 ? rowFirst(ch + 1) + Math.min(off, rowLen(ch + 1) - 1) : n - 1;
      sfx.move(); return;
    }
    if (k === 'up') { sel = (sel - 1 + n) % n; sfx.move(); }
    else if (k === 'down') { sel = (sel + 1) % n; sfx.move(); }
    else if (k === 'left' || k === 'right') { if (btns[sel]) adjust(btns[sel].id, k === 'left' ? -1 : 1); }
    else if (k === 'ok') { if (btns[sel]) activate(btns[sel].id); }
    else if (k === 'back') { if (scene === 'pause') scene = 'play'; else if (scene === 'clear' || scene === 'end') go(scene === 'end' ? 'title' : 'levels'); else go('title'); }
  }

  window.addEventListener('keydown', function (e) {
    const c = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].indexOf(c) >= 0) e.preventDefault();
    initAudio();
    if (SHIFT_CODES.indexOf(c) >= 0) { if (!e.repeat && scene === 'play') shiftQueued = true; return; }
    if (e.repeat && scene === 'play') { keys[c] = true; return; }
    keys[c] = true;
    if (c === 'KeyM') { settings.music = settings.music > 0 ? 0 : 0.7; settings.sfx = settings.music > 0 ? 0.8 : 0; applyVolumes(); saveSettings(); return; }
    if (c === 'KeyF') { fullscreenToggle(); return; }
    if (scene === 'play') {
      if (c === 'KeyR') respawn(false);
      else if (c === 'Escape' || c === 'KeyP') go('pause');
      return;
    }
    if (c === 'ArrowUp' || c === 'KeyW') navKey('up'); else if (c === 'ArrowDown' || c === 'KeyS') navKey('down');
    else if (c === 'ArrowLeft' || c === 'KeyA') navKey('left'); else if (c === 'ArrowRight' || c === 'KeyD') navKey('right');
    else if (c === 'Enter' || c === 'Space') navKey('ok'); else if (c === 'Escape' || c === 'Backspace' || c === 'KeyP') navKey('back');
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });
  window.addEventListener('blur', function () { for (const k in keys) keys[k] = false; if (scene === 'play') go('pause'); });

  function hitBtn(x, y) { for (let i = 0; i < btns.length; i++) { const b = btns[i]; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return i; } return -1; }
  cv.addEventListener('pointermove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; if (scene !== 'play') { const i = hitBtn(e.clientX, e.clientY); if (i >= 0 && i !== sel) { sel = i; } } });
  cv.addEventListener('pointerdown', function (e) {
    initAudio(); mouse.x = e.clientX; mouse.y = e.clientY;
    if (scene === 'play') return;
    const i = hitBtn(e.clientX, e.clientY);
    if (i >= 0) {
      sel = i; const b = btns[i];
      if ((b.id === 'music' || b.id === 'sfx') && b.slider) { settings[b.id] = Math.max(0, Math.min(1, Math.round(((e.clientX - b.slider.x) / b.slider.w) * 10) / 10)); applyVolumes(); saveSettings(); sfx.move(); }
      else activate(b.id);
    } else if (scene === 'title') { /* tap anywhere = play */ activate('play'); }
  });
  document.querySelectorAll('#touch button').forEach(function (b) {
    const k = b.getAttribute('data-k');
    const down = function (e) { e.preventDefault(); initAudio(); if (k === 'Shift') { if (scene === 'play') shiftQueued = true; } else keys[k] = true; };
    const up = function (e) { e.preventDefault(); if (k !== 'Shift') keys[k] = false; };
    b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
  });
  const touchEl = document.getElementById('touch');

  /* ============ fx ============ */
  function burst(x, y, n, col, spd, grav, life) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (0.3 + Math.random()) * spd;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.5 + Math.random() * 0.7), max: life, size: 0.05 + Math.random() * 0.09, col, g: grav });
    }
  }
  const doShake = (v) => { if (settings.shake) shake = Math.max(shake, v); };

  /* ============ tick ============ */
  const STEP = 1 / 120;
  function packInput(i) { return (i.left ? 1 : 0) | (i.right ? 2 : 0) | (i.jump ? 4 : 0) | (i.shift ? 8 : 0); }
  function unpackInput(b) { return { left: !!(b & 1), right: !!(b & 2), jump: !!(b & 4), shift: !!(b & 8) }; }

  function tick(gp) {
    clock += STEP; sceneT += STEP; fade = Math.max(0, fade - STEP * 2.5);
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= STEP; if (p.life <= 0) { parts.splice(i, 1); continue; } p.vy += p.g * STEP; p.x += p.vx * STEP; p.y += p.vy * STEP; }
    for (let i = rings.length - 1; i >= 0; i--) { rings[i].life -= STEP; if (rings[i].life <= 0) rings.splice(i, 1); }
    shake = Math.max(0, shake - STEP * 2.2); flash = Math.max(0, flash - STEP * 3); blockFlash = Math.max(0, blockFlash - STEP * 3); lockFlash = Math.max(0, lockFlash - STEP * 2.5);
    squash += (0 - squash) * Math.min(1, STEP * 14);
    if (padFlash) { padFlash.t -= STEP; if (padFlash.t <= 0) padFlash = null; }

    if (scene !== 'play') {
      let want = 0;
      if (scene === 'title' || scene === 'levels' || scene === 'settings' || scene === 'credits') want = Math.floor(sceneT / 3) % 2;
      else if (scene === 'end') want = 1; else want = s.w;
      mix += (want - mix) * Math.min(1, STEP * 4);
      return;
    }
    introT += STEP;
    mix += (s.w - mix) * Math.min(1, STEP * 7);

    if (s.dead) { deadT += STEP; if (deadT > 0.75) respawn(true); return; }
    if (s.won) { winT += STEP; if (winT > 1.1) finishLevel(); return; }

    const inp = {
      left: !!(keys.ArrowLeft || keys.KeyA || gp.left), right: !!(keys.ArrowRight || keys.KeyD || gp.right),
      jump: !!(keys.Space || keys.ArrowUp || keys.KeyW || keys.KeyZ || gp.jump), shift: shiftQueued,
    };
    shiftQueued = false;
    rec.push(packInput(inp));
    const ev = Sim.step(L, s, inp, STEP);

    // ghost playback (same deterministic sim, recorded inputs)
    if (gs && !gs.won && !gs.dead && ghostData && gIdx < ghostData.length) Sim.step(L, gs, unpackInput(ghostData[gIdx++]), STEP);

    const cx = s.x + T.W / 2, cy = s.y + T.H / 2, gd = Sim.gravDir(L, s), feetY = gd > 0 ? s.y + T.H : s.y;
    for (let i = 0; i < ev.length; i++) {
      const e = ev[i];
      if (e === 'jump') { sfx.jump(); squash = -0.22; burst(cx, feetY, 5, 'rgba(255,255,255,.7)', 1.2, 4 * gd, 0.35); }
      else if (e === 'land') { sfx.land(); squash = 0.28; burst(cx, feetY, 7, 'rgba(255,255,255,.7)', 1.6, 5 * gd, 0.4); }
      else if (e === 'bounce') { sfx.bounce(); squash = -0.35; padFlash = { x: cx, y: feetY, t: 0.3 }; burst(cx, feetY, 12, TH.acc[s.w], 3, 3 * gd, 0.5); }
      else if (e === 'shard') { sfx.shard(); burst(cx, cy, 18, '#ffe27a', 3.5, 0, 0.7); }
      else if (e === 'shift') {
        sfx.shift(s.w); flash = 1; flashCol = TH.acc[s.w];
        rings.push({ x: cx, y: cy, life: 0.7, max: 0.7, col: TH.acc[s.w] }); burst(cx, cy, 16, TH.acc[s.w], 3.5, 0, 0.6);
      } else if (e === 'blocked') { sfx.blocked(); doShake(0.45); blockFlash = 1; }
      else if (e === 'locked') { sfx.locked(); doShake(0.3); lockFlash = 1; }
      else if (e === 'die') { sfx.die(); doShake(0.9); burst(cx, cy, 34, '#ff4d6d', 6, 12, 0.9); burst(cx, cy, 14, '#ffffff', 4, 10, 0.6); }
      else if (e === 'win') { sfx.win(); burst(cx, cy, 40, '#ffe27a', 5, 3, 1.1); burst(cx, cy, 24, TH.acc[s.w], 4, 2, 1.1); }
    }
    if (s.onGround && Math.abs(s.vx) > 4 && Math.random() < 0.18) burst(cx - s.face * 0.2, feetY, 1, 'rgba(255,255,255,.5)', 0.8, 2 * gd, 0.35);
  }

  function finishLevel() {
    const t = s.time, nSh = L.shards.length, all = nSh > 0 && s.got === (1 << nSh) - 1, underPar = t <= L.par;
    const stars = 1 + (all || nSh === 0 ? 1 : 0) + (underPar ? 1 : 0);
    const prev = save.levels[li], best = !prev || t < prev.t;
    save.levels[li] = { t: best ? t : prev.t, stars: Math.max(stars, prev ? prev.stars : 0), got: (prev ? prev.got : 0) | s.got };
    if (best) storeJSON('shiftline.ghost.' + li, { d: rleEnc(rec) });
    saveProgress();
    res = { t, stars, all, underPar, best, shards: s.got, deaths, shifts: s.shifts, bestT: save.levels[li].t, anim: 0 };
    scene = (li >= NLEV - 1) ? 'end' : 'clear'; sceneT = 0; sel = 0;
  }

  /* ============ drawing helpers ============ */
  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function text(str, x, y, size, weight, align, col, alpha) {
    ctx.globalAlpha = alpha === undefined ? 1 : alpha; ctx.fillStyle = col || '#fff';
    ctx.font = weight + ' ' + size + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.fillText(str, x, y); ctx.globalAlpha = 1;
  }
  function starShape(x, y, r, fill, col) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
    ctx.closePath();
    if (fill) { ctx.fillStyle = col || '#ffe27a'; ctx.shadowColor = '#ffe27a'; ctx.shadowBlur = r * 0.8; ctx.fill(); ctx.shadowBlur = 0; }
    else { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  const stars = []; for (let i = 0; i < 90; i++) stars.push({ x: hash(i + 1), y: hash(i + 77) * 0.62, r: 0.5 + hash(i + 9) * 1.6, p: hash(i + 31) * 6 });
  function hillY(x, seed, base, amp) { return base + Math.sin(x * 0.006 + seed) * amp + Math.sin(x * 0.015 + seed * 2.3) * amp * 0.45 + Math.sin(x * 0.0035 + seed * 0.7) * amp * 0.8; }
  function palm(x, y, size, col) {
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, size * 0.07); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + size * 0.12, y - size * 0.5, x + size * 0.04, y - size); ctx.stroke();
    const tx = x + size * 0.04, ty = y - size;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.55, l = size * 0.5;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + Math.cos(a) * l * 0.6, ty + Math.sin(a) * l * 0.6 - l * 0.2, tx + Math.cos(a) * l, ty + Math.sin(a) * l + l * 0.3); ctx.stroke();
    }
  }
  function peaks(seed, base, amp, off, pw, col) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 8; x += 6) {
      const p = (x + off) / pw, i = Math.floor(p), f = p - i, tall = 0.45 + 0.55 * hash(i + seed), tri = f < 0.5 ? f * 2 : (1 - f) * 2;
      ctx.lineTo(x, base - amp * tall * Math.pow(tri, 0.9));
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }
  function island(x, y, w, col) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.18, 0, 0, 6.3); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - w * 0.95, y + 2); ctx.lineTo(x + w * 0.95, y + 2); ctx.lineTo(x + w * 0.1, y + w * 0.9); ctx.lineTo(x - w * 0.2, y + w * 0.7); ctx.closePath(); ctx.fill();
  }

  function drawBackground() {
    const sc = Sim.CHAPTERS[L.ch].scenery, themeIdx = THEMES.indexOf(TH);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgb(mixc(TH.skyTop, mix))); g.addColorStop(0.55, rgb(mixc(TH.skyMid, mix))); g.addColorStop(1, rgb(mixc(TH.skyBot, mix)));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const starA = themeIdx === 2 ? 0.45 + 0.5 * mix : mix;
    if (starA > 0.02) {
      for (let i = 0; i < stars.length; i++) {
        const st = stars[i], tw = 0.6 + 0.4 * Math.sin(clock * 1.7 + st.p);
        ctx.globalAlpha = starA * tw * 0.9; ctx.fillStyle = '#e8f6ff'; ctx.beginPath(); ctx.arc(st.x * W, st.y * H, st.r, 0, 6.3); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // sun / moon / void ring
    const bx = W * 0.74, by = oy + ts * 3.3, br = ts * 1.9;
    if (mix < 0.98) {
      const sg = ctx.createRadialGradient(bx, by, br * 0.2, bx, by, br * 2.8);
      sg.addColorStop(0, 'rgba(255,210,120,.8)'); sg.addColorStop(0.35, 'rgba(255,120,110,.3)'); sg.addColorStop(1, 'rgba(255,120,110,0)');
      ctx.globalAlpha = 1 - mix; ctx.fillStyle = sg; ctx.fillRect(bx - br * 3, by - br * 3, br * 6, br * 6);
      ctx.fillStyle = TH.sun; ctx.beginPath(); ctx.arc(bx, by + mix * ts * 3, br, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1;
    }
    if (mix > 0.02) {
      ctx.globalAlpha = mix;
      if (themeIdx === 2) {
        ctx.fillStyle = '#12041f'; ctx.beginPath(); ctx.arc(bx, by, br * 0.8, 0, 6.3); ctx.fill();
        ctx.strokeStyle = TH.acc[1]; ctx.lineWidth = br * 0.12; ctx.shadowColor = TH.acc[1]; ctx.shadowBlur = br * 0.6;
        ctx.beginPath(); ctx.ellipse(bx, by, br * 1.5, br * 0.35, -0.35 + Math.sin(clock * 0.4) * 0.05, 0, 6.3); ctx.stroke(); ctx.shadowBlur = 0;
      } else {
        const mg = ctx.createRadialGradient(bx, by, br * 0.3, bx, by, br * 2.4); mg.addColorStop(0, 'rgba(170,240,255,.45)'); mg.addColorStop(1, 'rgba(170,240,255,0)');
        ctx.fillStyle = mg; ctx.fillRect(bx - br * 3, by - br * 3, br * 6, br * 6);
        ctx.fillStyle = TH.moon; ctx.beginPath(); ctx.arc(bx, by + (1 - mix) * ts * 3, br * 0.8, 0, 6.3); ctx.fill();
        ctx.fillStyle = 'rgba(120,170,190,.35)';
        [[-0.25, -0.15, 0.2], [0.2, 0.1, 0.15], [-0.05, 0.3, 0.1]].forEach(function (c) { ctx.beginPath(); ctx.arc(bx + c[0] * br * 1.6, by + c[1] * br * 1.6, c[2] * br, 0, 6.3); ctx.fill(); });
      }
      ctx.globalAlpha = 1;
    }
    const px = (s.x - COLS / 2) * ts * (scene === 'play' || scene === 'pause' ? 1 : 0), drift = scene === 'play' || scene === 'pause' ? 0 : clock * 8;
    const far = rgb(mixc(TH.far, mix)), near = rgb(mixc(TH.near, mix));
    if (sc === 'palms') {
      [{ seed: 1.3, base: 0.62, amp: 0.05, k: 0.12, col: far, palms: true }, { seed: 4.1, base: 0.74, amp: 0.045, k: 0.28, col: near }].forEach(function (l) {
        const off = px * l.k + drift; ctx.fillStyle = l.col; ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 8) ctx.lineTo(x, hillY(x + off, l.seed, H * l.base, H * l.amp));
        ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
        if (l.palms) for (let i = 0; i < 9; i++) { const gx = (i * W / 7 + hash(i + 5) * 60) % (W + 100); palm(gx, hillY(gx + off, l.seed, H * l.base, H * l.amp) + 4, ts * (1.5 + hash(i + 3) * 1.2), l.col); }
      });
    } else if (sc === 'peaks') {
      peaks(3, H * 0.74, H * 0.32, px * 0.1 + drift, W * 0.22, far);
      peaks(11, H * 0.86, H * 0.26, px * 0.25 + drift * 1.6, W * 0.17, near);
    } else {
      for (let i = 0; i < 6; i++) {
        const x = ((hash(i + 2) * W * 1.3 + clock * (4 + i * 2) + px * (0.05 + i * 0.02)) % (W + 200)) - 100, y = H * (0.28 + 0.5 * hash(i + 8)) + Math.sin(clock * 0.5 + i) * 6;
        island(x, y, ts * (1.2 + hash(i + 4) * 1.6), i % 2 ? far : near);
      }
    }
    ctx.globalAlpha = 0.12; ctx.fillStyle = '#fff';
    for (let i = 0; i < 14; i++) { const x = ((i * 137 + clock * 12 * (1 + hash(i))) % (W + 100)) - 50; ctx.fillRect(x, H * 0.88 + hash(i + 2) * H * 0.1, 30 + hash(i) * 50, 2); }
    ctx.globalAlpha = 1;
  }

  function drawZones() {
    for (let i = 0; i < L.zones.length; i++) {
      const z = L.zones[i], x = ox + z.x * ts, y = oy + z.y * ts, w = z.w * ts, h = z.h * ts;
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.fillStyle = 'rgba(255,60,90,' + (0.1 + lockFlash * 0.25) + ')'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(255,90,120,' + (0.22 + lockFlash * 0.4) + ')'; ctx.lineWidth = 2;
      const sp = ts * 0.5, off = (clock * 12) % sp;
      for (let d = -h; d < w + h; d += sp) { ctx.beginPath(); ctx.moveTo(x + d + off, y + h); ctx.lineTo(x + d + off + h, y); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,90,120,.7)'; ctx.lineWidth = 2; ctx.setLineDash([ts * 0.2, ts * 0.15]); ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); ctx.setLineDash([]);
      // padlock icon
      const lx = x + w / 2, ly = y + ts * 0.7, ls = ts * 0.32;
      ctx.fillStyle = 'rgba(255,110,140,.9)'; rr(lx - ls, ly - ls * 0.2, ls * 2, ls * 1.5, ls * 0.25); ctx.fill();
      ctx.strokeStyle = 'rgba(255,110,140,.9)'; ctx.lineWidth = ls * 0.35; ctx.beginPath(); ctx.arc(lx, ly - ls * 0.2, ls * 0.6, Math.PI, 0); ctx.stroke();
    }
  }

  function drawTiles() {
    const A = mixc(TH.solid, mix), E = mixc(TH.edge, mix), flipLevel = L.flip;
    ctx.fillStyle = rgb(A);
    for (let r = 0; r < ROWS; r++) {
      const y = oy + r * ts;
      if (ox > 0 && L.grid[r][0] === '#') ctx.fillRect(0, y - 0.5, ox + 1, ts + 1);
      if (ox > 0 && L.grid[r][COLS - 1] === '#') ctx.fillRect(ox + COLS * ts - 1, y - 0.5, ox + 2, ts + 1);
    }
    for (let c = 0; c < COLS; c++) {
      if (L.grid[ROWS - 1][c] === '#') ctx.fillRect(ox + c * ts - 0.5, oy + ROWS * ts - 1, ts + 1, H);
      if (flipLevel && oy > 0 && L.grid[0][c] === '#') ctx.fillRect(ox + c * ts - 0.5, 0, ts + 1, oy + 1);
    }
    const pat = settings.patterns;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const ch = L.grid[r][c]; if (ch === '.' || ch === 'E') continue;
      const x = ox + c * ts, y = oy + r * ts;
      if (ch === '#') {
        ctx.fillStyle = rgb(A); ctx.fillRect(x - 0.5, y - 0.5, ts + 1, ts + 1);
        ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(x, y, ts, ts * 0.5);
        const up = r > 0 ? L.grid[r - 1][c] : '#', dn = r < ROWS - 1 ? L.grid[r + 1][c] : '#';
        if (up !== '#' && up !== 'b') { ctx.fillStyle = rgb(E); ctx.fillRect(x - 0.5, y - 0.5, ts + 1, Math.max(3, ts * 0.1)); ctx.globalAlpha = 0.25; ctx.fillRect(x - 0.5, y, ts + 1, ts * 0.28); ctx.globalAlpha = 1; }
        if (flipLevel && dn !== '#' && dn !== 'b' && r < ROWS - 1) { ctx.fillStyle = rgb(E); ctx.fillRect(x - 0.5, y + ts - Math.max(3, ts * 0.1) + 0.5, ts + 1, Math.max(3, ts * 0.1)); }
      } else if (ch === '1' || ch === '2') {
        const act = ch === '1' ? 1 - mix : mix, w = ch === '1' ? 0 : 1, col = TH.acc[w];
        if (act < 0.98) { ctx.globalAlpha = 0.45 * (1 - act); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.setLineDash([ts * 0.12, ts * 0.12]); rr(x + 2, y + 2, ts - 4, ts - 4, ts * 0.18); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
        if (act > 0.03) {
          ctx.globalAlpha = act; ctx.shadowColor = col; ctx.shadowBlur = ts * 0.5 * act;
          const gg = ctx.createLinearGradient(x, y, x, y + ts); gg.addColorStop(0, col); gg.addColorStop(1, TH.acc2[w]);
          ctx.fillStyle = gg; rr(x + 1, y + 1, ts - 2, ts - 2, ts * 0.2); ctx.fill(); ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(x + ts * 0.14, y + ts * 0.12, ts * 0.72, ts * 0.14, ts * 0.07); ctx.fill(); ctx.globalAlpha = 1;
        }
        if (pat) { ctx.globalAlpha = Math.max(act, 0.5); ctx.fillStyle = 'rgba(20,10,40,.7)'; ctx.beginPath(); if (w === 0) ctx.arc(x + ts / 2, y + ts / 2, ts * 0.13, 0, 6.3); else { ctx.moveTo(x + ts / 2, y + ts * 0.34); ctx.lineTo(x + ts * 0.66, y + ts / 2); ctx.lineTo(x + ts / 2, y + ts * 0.66); ctx.lineTo(x + ts * 0.34, y + ts / 2); ctx.closePath(); } ctx.fill(); ctx.globalAlpha = 1; }
      } else if (ch === 'b') {
        const pf = padFlash && Math.abs(padFlash.x - (c + 0.5)) < 1 ? padFlash.t / 0.3 : 0, comp = 0.25 + 0.2 * pf, up = !flipLevel || true;
        ctx.fillStyle = rgb(A); rr(x + 2, y + ts * 0.62, ts - 4, ts * 0.38, ts * 0.12); ctx.fill();
        ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = Math.max(2, ts * 0.07); ctx.lineJoin = 'round'; ctx.beginPath();
        const top = y + ts * (0.18 + comp * 0.3), bot = y + ts * 0.62;
        ctx.moveTo(x + ts * 0.25, bot); for (let k = 0; k < 4; k++) ctx.lineTo(x + ts * (k % 2 ? 0.25 : 0.75), bot - (bot - top) * (k + 1) / 4); ctx.stroke();
        ctx.fillStyle = '#ffe27a'; ctx.shadowColor = '#ffe27a'; ctx.shadowBlur = ts * 0.3; rr(x + ts * 0.1, top - ts * 0.1, ts * 0.8, ts * 0.14, ts * 0.07); ctx.fill(); ctx.shadowBlur = 0; void up;
      } else if (ch === '^' || ch === 'p' || ch === 'q') {
        const act = ch === '^' ? 1 : (ch === 'p' ? 1 - mix : mix), col = ch === 'p' ? TH.acc[0] : (ch === 'q' ? TH.acc[1] : '#ffffff'), n = 2, w = ts / n;
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
          if (pat && ch !== '^') { ctx.fillStyle = col; ctx.globalAlpha = act; ctx.beginPath(); if (ch === 'p') ctx.arc(x + ts / 2, y + ts - ts * 0.22, ts * 0.07, 0, 6.3); else { const cx2 = x + ts / 2, cy2 = y + ts - ts * 0.22, d = ts * 0.09; ctx.moveTo(cx2, cy2 - d); ctx.lineTo(cx2 + d, cy2); ctx.lineTo(cx2, cy2 + d); ctx.lineTo(cx2 - d, cy2); ctx.closePath(); } ctx.fill(); ctx.globalAlpha = 1; }
        }
      }
    }
  }

  function drawShards() {
    for (let i = 0; i < L.shards.length; i++) {
      if (s.got & (1 << i)) continue;
      const sh = L.shards[i], x = ox + (sh.c + 0.5) * ts, y = oy + (sh.r + 0.5) * ts + Math.sin(clock * 2.4 + i) * ts * 0.08, r = ts * 0.26;
      const g = ctx.createRadialGradient(x, y, 0, x, y, ts * 0.9); g.addColorStop(0, 'rgba(255,226,122,.5)'); g.addColorStop(1, 'rgba(255,226,122,0)');
      ctx.fillStyle = g; ctx.fillRect(x - ts, y - ts, ts * 2, ts * 2);
      ctx.save(); ctx.translate(x, y); ctx.scale(Math.cos(clock * 2 + i), 1);
      ctx.fillStyle = '#ffe27a'; ctx.shadowColor = '#ffe27a'; ctx.shadowBlur = ts * 0.4;
      ctx.beginPath(); ctx.moveTo(0, -r * 1.3); ctx.lineTo(r, 0); ctx.lineTo(0, r * 1.3); ctx.lineTo(-r, 0); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.moveTo(0, -r * 1.3); ctx.lineTo(r * 0.5, -r * 0.1); ctx.lineTo(0, 0); ctx.lineTo(-r * 0.5, -r * 0.1); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  function drawExit() {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (L.grid[r][c] === 'E') {
      const x = ox + (c + 0.5) * ts, y = oy + (r + 0.5) * ts, pul = 1 + Math.sin(clock * 3) * 0.06;
      const g = ctx.createRadialGradient(x, y, 0, x, y, ts * 1.3); g.addColorStop(0, 'rgba(255,240,170,.8)'); g.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = g; ctx.fillRect(x - ts * 1.4, y - ts * 1.4, ts * 2.8, ts * 2.8);
      ctx.save(); ctx.translate(x, y);
      for (let i = 0; i < 3; i++) { ctx.rotate(clock * (i % 2 ? -1 : 1) * (0.8 + i * 0.4)); ctx.strokeStyle = i === 1 ? '#ffffff' : '#ffe27a'; ctx.lineWidth = 2; ctx.setLineDash([ts * 0.25, ts * 0.12]); ctx.beginPath(); ctx.arc(0, 0, ts * (0.46 - i * 0.1) * pul, 0, 6.3); ctx.stroke(); }
      ctx.setLineDash([]); ctx.restore(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, ts * 0.08, 0, 6.3); ctx.fill();
    }
  }

  function drawBody(st, alpha, ghost) {
    const w = T.W * ts, h = T.H * ts, x = ox + st.x * ts, y = oy + st.y * ts, flipped = Sim.gravDir(L, st) < 0;
    const col = ghost ? '#ffffff' : TH.acc[st.w], sx = ghost ? 1 : 1 + squash * 0.8, sy = ghost ? 1 : 1 - squash;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x + w / 2, flipped ? y : y + h); ctx.scale(sx, sy * (flipped ? -1 : 1));
    if (!ghost) { ctx.shadowColor = col; ctx.shadowBlur = ts * 0.7; }
    const g = ctx.createLinearGradient(0, -h, 0, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(1, col);
    ctx.fillStyle = g; rr(-w / 2, -h, w, h, w * 0.32); ctx.fill(); ctx.shadowBlur = 0;
    const ex = st.face * w * 0.12, ey = -h * 0.62; ctx.fillStyle = '#1a0f2e';
    ctx.beginPath(); ctx.ellipse(ex - w * 0.17, ey, w * 0.075, h * 0.1, 0, 0, 6.3); ctx.ellipse(ex + w * 0.17, ey, w * 0.075, h * 0.1, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - w * 0.15 + st.face, ey - h * 0.03, w * 0.025, 0, 6.3); ctx.arc(ex + w * 0.19 + st.face, ey - h * 0.03, w * 0.025, 0, 6.3); ctx.fill();
    ctx.restore();
  }
  function drawPlayer() {
    if (settings.ghost && gs && !gs.won && !gs.dead && ghostData) drawBody(gs, 0.28, true);
    if (s.dead) return;
    drawBody(s, 1, false);
    if (blockFlash > 0) { const w = T.W * ts, h = T.H * ts, x = ox + s.x * ts, y = oy + s.y * ts; ctx.globalAlpha = blockFlash * 0.9; ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 3; rr(x - 3, y - 3, w + 6, h + 6, w * 0.4); ctx.stroke(); ctx.globalAlpha = 1; }
  }

  function drawFx() {
    for (let i = 0; i < rings.length; i++) { const r = rings[i], t = 1 - r.life / r.max; ctx.globalAlpha = (1 - t) * 0.8; ctx.strokeStyle = r.col; ctx.lineWidth = 4 * (1 - t) + 1; ctx.beginPath(); ctx.arc(ox + r.x * ts, oy + r.y * ts, t * ts * 7, 0, 6.3); ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (let i = 0; i < parts.length; i++) { const p = parts[i]; ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(ox + p.x * ts, oy + p.y * ts, p.size * ts, 0, 6.3); ctx.fill(); }
    ctx.globalAlpha = 1;
    // ambient motes: embers rise / snow falls in chapter 2, drifting dust elsewhere
    const ch = THEMES.indexOf(TH), w = mix > 0.5 ? 1 : 0;
    ctx.fillStyle = TH.acc[w];
    for (let i = 0; i < 26; i++) {
      let x = (hash(i) * W + Math.sin(clock * 0.4 + i) * 30 + clock * (6 + hash(i + 3) * 8)) % W, y = hash(i + 9) * H * 0.75 + Math.sin(clock * 0.6 + i * 2) * 14;
      if (ch === 1) { const sp = (8 + hash(i + 5) * 22) * (w ? 1 : -1); y = (((hash(i + 9) * H + clock * sp) % H) + H) % H; ctx.fillStyle = w ? '#ffffff' : '#ff9a4d'; }
      ctx.globalAlpha = 0.2 + 0.2 * Math.sin(clock * 2 + i); ctx.beginPath(); ctx.arc(x, y, ch === 1 ? 1.6 + hash(i) * 1.6 : 1.6, 0, 6.3); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ============ HUD & menus ============ */
  let btnBase = 0;
  function btn(id, label, x, y, w, h, opts) {
    opts = opts || {}; const i = btns.length; btns.push({ id, x, y, w, h, slider: opts.slider });
    const on = sel === i, fs = opts.fs || h * 0.42;
    ctx.fillStyle = on ? 'rgba(255,255,255,.22)' : 'rgba(10,5,25,.5)'; rr(x, y, w, h, h * 0.3); ctx.fill();
    ctx.strokeStyle = on ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.2)'; ctx.lineWidth = on ? 2.5 : 1.2; rr(x, y, w, h, h * 0.3); ctx.stroke();
    if (opts.value !== undefined) {
      text(label, x + h * 0.4, y + h / 2, fs, 600, 'left', '#fff', opts.dim ? 0.5 : 0.95);
      if (opts.slider) {
        const sx = x + w * 0.55, sw = w * 0.38, sy = y + h / 2;
        opts.slider.x = sx; opts.slider.w = sw;
        ctx.fillStyle = 'rgba(255,255,255,.2)'; rr(sx, sy - 4, sw, 8, 4); ctx.fill();
        ctx.fillStyle = TH.acc[0]; rr(sx, sy - 4, Math.max(8, sw * opts.value), 8, 4); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx + sw * opts.value, sy, 9, 0, 6.3); ctx.fill();
      } else text(opts.value, x + w - h * 0.4, y + h / 2, fs, 800, 'right', on ? '#ffe27a' : '#fff', 0.95);
    } else text(label, x + w / 2, y + h / 2, fs, 800, 'center', '#fff', 0.95);
  }

  function drawHUD() {
    const pad = Math.max(14, ts * 0.35), fs = Math.max(13, ts * 0.42);
    text(tr('chapter') + ' ' + (L.ch + 1) + '  •  ' + tr('level') + ' ' + (li + 1) + '/' + NLEV, pad, pad + fs * 0.4, fs * 0.75, 600, 'left', '#fff', 0.65);
    text(lvName(li).toUpperCase(), pad, pad + fs * 1.5, fs * 1.4, 800, 'left', '#fff', 0.95);
    text(fmt(s.time), W - pad, pad + fs * 0.5, fs * 1.5, 700, 'right', '#fff', 0.95);
    text(tr('par') + ' ' + fmt(L.par) + '   ' + tr('shifts') + ' ' + s.shifts + '   ' + tr('deaths') + ' ' + deaths, W - pad, pad + fs * 1.75, fs * 0.75, 600, 'right', '#fff', 0.65);
    if (L.shards.length) {
      const got = (function () { let n = 0; for (let i = 0; i < L.shards.length; i++) if (s.got & (1 << i)) n++; return n; })();
      for (let i = 0; i < L.shards.length; i++) { const sx = pad + fs * 0.5 + i * fs * 1.2, sy = pad + fs * 2.9, on = i < got; ctx.fillStyle = on ? '#ffe27a' : 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.moveTo(sx, sy - fs * 0.5); ctx.lineTo(sx + fs * 0.35, sy); ctx.lineTo(sx, sy + fs * 0.5); ctx.lineTo(sx - fs * 0.35, sy); ctx.closePath(); ctx.fill(); }
    }
    const pw = ts * 4, ph = ts * 0.8, px = W / 2 - pw / 2, py = pad * 0.7, nm = TH.names[settings.lang] || TH.names.en;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(px, py, pw, ph, ph / 2); ctx.fill();
    const kx = px + ph / 2 + (pw - ph) * mix; ctx.fillStyle = TH.acc[s.w]; ctx.shadowColor = TH.acc[s.w]; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(kx, py + ph / 2, ph * 0.38, 0, 6.3); ctx.fill(); ctx.shadowBlur = 0;
    text(nm[0], px + pw * 0.27, py + ph / 2, ph * 0.38, 700, 'center', '#fff', 0.8 - mix * 0.45); text(nm[1], px + pw * 0.75, py + ph / 2, ph * 0.38, 700, 'center', '#fff', 0.35 + mix * 0.45);
    if (L.flip) text(tr('gravity') + ' ' + (s.w ? '↑ ' + tr('gravUp') : '↓ ' + tr('gravDown')), W / 2, py + ph + fs * 0.9, fs * 0.8, 700, 'center', TH.acc[s.w], 0.95);
    if (Sim.inLock(L, s.x, s.y)) text('🔒 ' + tr('lockTip'), W / 2, py + ph + fs * (L.flip ? 2.2 : 0.9), fs * 0.85, 800, 'center', '#ff6b8a', 0.95);
    if (scene === 'play' && (introT < 9 || deaths >= 2)) {
      const a = Math.min(1, introT) * (introT > 8 ? Math.max(0, 9 - introT) : 1), hint = lvHint(li);
      ctx.font = '600 ' + (fs * 0.95) + 'px ' + FONT; const tw = Math.min(W * 0.94, ctx.measureText(hint).width + 36), al = deaths >= 2 ? 1 : a;
      ctx.globalAlpha = al * 0.9; ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(W / 2 - tw / 2, H - ts * 1.25 - fs, tw, fs * 2.2, fs * 1.1); ctx.fill(); ctx.globalAlpha = 1;
      text(hint, W / 2, H - ts * 1.25, fs * 0.95, 600, 'center', '#fff', al);
    }
    if (scene === 'play' && li === 0 && introT < 12) text(tr('ctl'), W / 2, H - ts * 0.55, fs * 0.75, 500, 'center', '#fff', 0.7);
    if (scene === 'play' && introT < 2.2) {   // chapter / level card
      const a = introT < 0.3 ? introT / 0.3 : introT > 1.7 ? Math.max(0, (2.2 - introT) / 0.5) : 1, nm2 = TH.names[settings.lang] || TH.names.en;
      text(tr('chapter') + ' ' + (L.ch + 1) + '  •  ' + nm2[0] + ' / ' + nm2[1], W / 2, H * 0.4 - fs * 1.8, fs * 1.1, 700, 'center', TH.acc[0], a);
      text(lvName(li), W / 2, H * 0.4, fs * 3.2, 900, 'center', '#fff', a);
    }
  }

  function panel(w, h) {
    ctx.fillStyle = 'rgba(8,4,20,.62)'; ctx.fillRect(0, 0, W, H);
    const x = W / 2 - w / 2, y = H / 2 - h / 2;
    ctx.fillStyle = 'rgba(20,10,40,.8)'; rr(x, y, w, h, 24); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5; rr(x, y, w, h, 24); ctx.stroke();
    return { x, y };
  }
  const bw = () => Math.min(W * 0.8, ts * 10), bh = () => Math.max(40, ts * 1.05);

  function drawTitle() {
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.22, size = Math.min(W * 0.12, ts * 3.4), off = Math.sin(clock * 1.2) * 2 + 6 * Math.max(0, Math.sin(clock * 0.8 + 1) - 0.8) * 5;
    ctx.save(); ctx.font = '900 ' + size + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = (size * 0.06) + 'px';
    ctx.fillStyle = TH.acc[0]; ctx.globalAlpha = 0.9; ctx.fillText('SHIFTLINE', cx - off - 3, cy); ctx.fillStyle = TH.acc[1]; ctx.fillText('SHIFTLINE', cx + off + 3, cy);
    ctx.globalAlpha = 1; ctx.shadowColor = '#fff'; ctx.shadowBlur = 24; ctx.fillStyle = '#fff'; ctx.fillText('SHIFTLINE', cx, cy); ctx.restore();
    const fs = Math.max(14, ts * 0.5);
    text(tr('sub'), cx, cy + size * 0.72, fs * 0.85, 600, 'center', '#fff', 0.8);
    const w = bw(), h = bh(), x0 = cx - w / 2, y0 = H * 0.42, gap = h * 1.25;
    btn('play', maxDone() >= 0 ? tr('cont') : tr('play'), x0, y0, w, h);
    btn('levels', tr('levels') + '   ★ ' + totalStars() + '/' + NLEV * 3, x0, y0 + gap, w, h);
    btn('settings', tr('settings'), x0, y0 + gap * 2, w, h);
    btn('credits', tr('credits'), x0, y0 + gap * 3, w, h);
    text(tr('how2'), cx, H * 0.93, fs * 0.8, 500, 'center', '#fff', 0.7);
  }

  function drawLevelSelect() {
    ctx.fillStyle = 'rgba(8,4,20,.5)'; ctx.fillRect(0, 0, W, H);
    const fs = Math.max(14, ts * 0.5), cx = W / 2;
    text(tr('levels'), cx, H * 0.08, fs * 2, 900, 'center', '#fff');
    text('★ ' + totalStars() + ' / ' + NLEV * 3, cx, H * 0.08 + fs * 1.6, fs * 0.9, 700, 'center', '#ffe27a', 0.9);
    const cell = Math.min(W * 0.11, ts * 2.1, H * 0.16), gap = cell * 0.18;
    const rowsY = [H * 0.30, H * 0.505, H * 0.71];
    for (let ch = 0; ch < 3; ch++) {
      const idx = []; for (let i = 0; i < NLEV; i++) if (levels[i].ch === ch) idx.push(i);
      const totalW = idx.length * cell + (idx.length - 1) * gap, x0 = cx - totalW / 2, nm = THEMES[ch].names[settings.lang] || THEMES[ch].names.en;
      text(tr('chapter') + ' ' + (ch + 1) + '  •  ' + nm[0] + ' / ' + nm[1], cx, rowsY[ch] - cell * 0.78, fs * 0.9, 700, 'center', THEMES[ch].acc[0], 0.95);
      idx.forEach(function (i, k) {
        const x = x0 + k * (cell + gap), y = rowsY[ch] - cell * 0.5, open = unlocked(i), d = save.levels[i], b0 = btns.length;
        btns.push({ id: 'lv:' + i, x, y, w: cell, h: cell * 1.05 });
        const on = sel === b0;
        ctx.fillStyle = on ? 'rgba(255,255,255,.24)' : 'rgba(10,5,25,.55)'; rr(x, y, cell, cell * 1.05, cell * 0.16); ctx.fill();
        ctx.strokeStyle = on ? '#fff' : THEMES[ch].acc[0]; ctx.globalAlpha = open ? (on ? 1 : 0.6) : 0.25; ctx.lineWidth = on ? 3 : 1.5; rr(x, y, cell, cell * 1.05, cell * 0.16); ctx.stroke(); ctx.globalAlpha = 1;
        text(open ? String(i + 1) : '🔒', x + cell / 2, y + cell * 0.36, cell * 0.36, 800, 'center', '#fff', open ? 1 : 0.5);
        if (open) { for (let q = 0; q < 3; q++) starShape(x + cell * (0.25 + q * 0.25), y + cell * 0.7, cell * 0.09, !!(d && d.stars > q)); if (d) text(fmt(d.t), x + cell / 2, y + cell * 0.93, cell * 0.14, 600, 'center', '#fff', 0.75); }
      });
    }
    btns.push({ id: 'back', x: cx - bw() / 4, y: H * 0.88, w: bw() / 2, h: bh() * 0.8 });
    const b = btns[btns.length - 1], on = sel === btns.length - 1;
    ctx.fillStyle = on ? 'rgba(255,255,255,.22)' : 'rgba(10,5,25,.5)'; rr(b.x, b.y, b.w, b.h, b.h * 0.3); ctx.fill(); ctx.strokeStyle = on ? '#fff' : 'rgba(255,255,255,.2)'; ctx.lineWidth = on ? 2.5 : 1.2; rr(b.x, b.y, b.w, b.h, b.h * 0.3); ctx.stroke();
    text(tr('back'), b.x + b.w / 2, b.y + b.h / 2, b.h * 0.42, 800, 'center', '#fff');
    const cur = btns[sel] && btns[sel].id.indexOf('lv:') === 0 ? +btns[sel].id.slice(3) : -1;
    if (cur >= 0) { TH = THEMES[levels[cur].ch]; text(unlocked(cur) ? lvName(cur) + ' — ' + lvHint(cur) : tr('locked'), cx, H * 0.83, fs * 0.8, 500, 'center', '#fff', 0.8); }
  }

  function drawSettings() {
    ctx.fillStyle = 'rgba(8,4,20,.55)'; ctx.fillRect(0, 0, W, H);
    const fs = Math.max(14, ts * 0.5), cx = W / 2, w = Math.min(W * 0.9, ts * 13), h = Math.max(36, ts * 0.85), x0 = cx - w / 2, y0 = H * 0.2, gap = h * 1.2;
    text(tr('settings'), cx, H * 0.1, fs * 2, 900, 'center', '#fff');
    btn('music', tr('music'), x0, y0, w, h, { value: settings.music, slider: {}, fs: h * 0.4 });
    btn('sfx', tr('sfx'), x0, y0 + gap, w, h, { value: settings.sfx, slider: {}, fs: h * 0.4 });
    btn('lang', tr('language'), x0, y0 + gap * 2, w, h, { value: settings.lang === 'en' ? 'English' : 'বাংলা', fs: h * 0.4 });
    btn('shake', tr('shake'), x0, y0 + gap * 3, w, h, { value: settings.shake ? tr('on') : tr('off'), fs: h * 0.4 });
    btn('patterns', tr('patterns'), x0, y0 + gap * 4, w, h, { value: settings.patterns ? tr('on') : tr('off'), fs: h * 0.4 });
    btn('ghost', tr('ghost'), x0, y0 + gap * 5, w, h, { value: settings.ghost ? tr('on') : tr('off'), fs: h * 0.4 });
    btn('fs', tr('fullscreen') + '  (F)', x0, y0 + gap * 6, w, h, { fs: h * 0.4 });
    btn('back', tr('back'), x0, y0 + gap * 7, w, h, { fs: h * 0.4 });
  }
  function drawCredits() {
    ctx.fillStyle = 'rgba(8,4,20,.55)'; ctx.fillRect(0, 0, W, H);
    const fs = Math.max(14, ts * 0.5), cx = W / 2;
    text('SHIFTLINE', cx, H * 0.16, fs * 3, 900, 'center', '#fff'); text(tr('made'), cx, H * 0.16 + fs * 2.2, fs, 600, 'center', '#fff', 0.8);
    ['cr1', 'cr2', 'cr3', 'cr4', 'cr5'].forEach(function (k, i) { text(tr(k), cx, H * 0.42 + i * fs * 1.9, fs * 0.9, 500, 'center', '#fff', 0.85); });
    btn('back', tr('back'), cx - bw() / 4, H * 0.82, bw() / 2, bh());
  }
  function drawPause() {
    const fs = Math.max(14, ts * 0.5), pw = Math.min(W * 0.9, ts * 9), ph = ts * 7, p = panel(pw, ph), cx = W / 2, h = bh() * 0.9, x0 = cx - pw * 0.4, w = pw * 0.8;
    text(tr('paused'), cx, p.y + ph * 0.13, fs * 2, 900, 'center', '#fff');
    btn('resume', tr('resume'), x0, p.y + ph * 0.25, w, h); btn('restart', tr('restart'), x0, p.y + ph * 0.25 + h * 1.25, w, h);
    btn('pause-levels', tr('levels'), x0, p.y + ph * 0.25 + h * 2.5, w, h); btn('menu', tr('menu'), x0, p.y + ph * 0.25 + h * 3.75, w, h);
  }
  function drawClear() {
    if (!res) return;
    const fs = Math.max(14, ts * 0.5), pw = Math.min(W * 0.92, ts * 12), ph = ts * 8.6, p = panel(pw, ph), cx = W / 2, a = Math.min(1, sceneT / 0.4);
    text(tr('complete'), cx, p.y + ph * 0.1, fs * 2, 900, 'center', '#ffe27a', a); text(lvName(li), cx, p.y + ph * 0.2, fs * 1.1, 600, 'center', '#fff', 0.85 * a);
    for (let q = 0; q < 3; q++) { const t = sceneT - 0.3 - q * 0.35, got = res.stars > q, sc = got ? Math.min(1, Math.max(0, t * 4)) : 1; if (got && t > 0 && !res['s' + q]) { res['s' + q] = true; sfx.star(); } starShape(cx + (q - 1) * fs * 3.2, p.y + ph * 0.38, fs * 1.3 * (got ? 0.6 + 0.4 * sc : 1), got && t > 0); }
    text(tr('stars').length ? '' : '', cx, p.y, 1, 1, 'center');
    text(fmt(res.t) + '   (' + tr('par') + ' ' + fmt(L.par) + ')' + (res.underPar ? '  ✓' : ''), cx, p.y + ph * 0.54, fs * 1.3, 700, 'center', '#fff');
    text((res.best ? '★ ' + tr('newbest') : tr('best') + ' ' + fmt(res.bestT)) + (L.shards.length ? '     ' + tr('shards') + ' ' + (res.all ? L.shards.length : (function () { let n = 0; for (let i = 0; i < L.shards.length; i++) if (res.shards & (1 << i)) n++; return n; })()) + '/' + L.shards.length : ''), cx, p.y + ph * 0.63, fs * 0.95, 600, 'center', res.best ? '#ffe27a' : '#fff', 0.9);
    text(tr('shifts') + ' ' + res.shifts + '    ' + tr('deaths') + ' ' + res.deaths, cx, p.y + ph * 0.71, fs * 0.85, 500, 'center', '#fff', 0.7);
    const h = bh() * 0.8, bwid = pw * 0.28, gx = pw * 0.03, x0 = cx - (bwid * 3 + gx * 2) / 2, by = p.y + ph * 0.8;
    btn('next', tr('next'), x0, by, bwid, h, { fs: h * 0.36 }); btn('retry', tr('retry'), x0 + bwid + gx, by, bwid, h, { fs: h * 0.36 }); btn('pause-levels', tr('levels'), x0 + (bwid + gx) * 2, by, bwid, h, { fs: h * 0.36 });
  }
  function drawEnd() {
    const fs = Math.max(14, ts * 0.5), pw = Math.min(W * 0.92, ts * 13), ph = ts * 8.6, p = panel(pw, ph), cx = W / 2;
    let tt = 0; for (let i = 0; i < NLEV; i++) if (save.levels[i]) tt += save.levels[i].t;
    text(tr('endTitle'), cx, p.y + ph * 0.12, fs * 1.9, 900, 'center', TH.acc[1]); text(tr('endSub'), cx, p.y + ph * 0.24, fs * 1.1, 600, 'center', '#fff', 0.85);
    text(tr('stars') + '  ★ ' + totalStars() + ' / ' + NLEV * 3, cx, p.y + ph * 0.38, fs * 1.4, 800, 'center', '#ffe27a');
    text(tr('total') + '  ' + fmt(tt), cx, p.y + ph * 0.5, fs * 1.2, 700, 'center', '#fff');
    text(tr('made'), cx, p.y + ph * 0.62, fs * 0.9, 500, 'center', '#fff', 0.7); text(tr('thanks'), cx, p.y + ph * 0.7, fs * 0.9, 500, 'center', '#fff', 0.7);
    btn('menu', tr('menu'), cx - bw() / 4, p.y + ph * 0.8, bw() / 2, bh() * 0.85);
  }

  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); btns = [];
    const inGame = scene === 'play' || scene === 'pause' || scene === 'clear' || scene === 'end';
    if (inGame) { TH = THEMES[L.ch]; }
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake * ts * 0.35, (Math.random() - 0.5) * shake * ts * 0.35);
    drawBackground();
    if (inGame) { drawTiles(); drawZones(); drawShards(); drawExit(); drawPlayer(); }
    drawFx(); ctx.restore();
    if (flash > 0) { ctx.globalAlpha = flash * 0.22; ctx.fillStyle = flashCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (s.dead && scene === 'play') { ctx.globalAlpha = Math.min(0.35, deadT); ctx.fillStyle = '#ff2d55'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (scene === 'title') drawTitle(); else if (scene === 'levels') drawLevelSelect(); else if (scene === 'settings') drawSettings(); else if (scene === 'credits') drawCredits();
    else { drawHUD(); if (scene === 'pause') drawPause(); else if (scene === 'clear') drawClear(); else if (scene === 'end') drawEnd(); }
    if (fade > 0 && !noFade) { ctx.globalAlpha = Math.min(1, fade); ctx.fillStyle = '#07040f'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (settings.music <= 0 && settings.sfx <= 0) text(tr('muted'), W - 12, H - 12, 12, 600, 'right', '#fff', 0.6);
    if (touchEl) touchEl.style.visibility = scene === 'play' ? 'visible' : 'hidden';
    if (sel >= btns.length) sel = Math.max(0, btns.length - 1);
  }

  /* ============ main loop ============ */
  let last = performance.now(), acc = 0, gpState = pad();
  function frame(now) {
    acc += Math.min(0.1, (now - last) / 1000); last = now;
    gpState = pollPad();
    while (acc >= STEP) { tick(gpState); acc -= STEP; }
    render(); requestAnimationFrame(frame);
  }

  // URL helpers: ?level=N jumps to a level, ?scene=levels|settings|credits|pause|clear|end for screenshots
  try {
    const q = new URLSearchParams(location.search);
    if (q.get('level')) loadLevel(Math.max(0, Math.min(NLEV - 1, +q.get('level') - 1)));
    const sc = q.get('scene');
    if (sc === 'levels' || sc === 'settings' || sc === 'credits') go(sc);
    else if (sc === 'pause') { if (!q.get('level')) loadLevel(0); scene = 'pause'; }
    else if (sc === 'clear' || sc === 'end') { loadLevel(q.get('level') ? +q.get('level') - 1 : 0); s.won = true; s.got = 1; s.time = 8.4; rec = [0]; finishLevel(); if (sc === 'end') { scene = 'end'; } sceneT = 2; }
    if (q.get('shot')) { noFade = true; introT = 5; sceneT = Math.max(sceneT, 2.4); }
    if (q.get('lang') === 'bn') settings.lang = 'bn';
    if (q.get('demo')) { for (let i = 0; i < 9; i++) save.levels[i] = { t: 8 + i, stars: 1 + (i % 3), got: 1 }; }
  } catch (e) { /* ignore */ }
  requestAnimationFrame(frame);
  window.__shiftline = { get scene() { return scene; }, load: loadLevel, state: function () { return s; }, keys: keys, queueShift: function () { shiftQueued = true; }, btnBase: btnBase };
})();
