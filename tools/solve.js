// BFS bot: checks each level is solvable, and NOT solvable without shifting.
const Sim = require('../sim.js');
const DT = 1/120, K = 8;
function solve(L, opts, limit) {
  const s0 = Sim.newState(L);
  const key = s => [Math.round(s.x*6), Math.round(s.y*6), Math.round(s.vx), Math.round(s.vy/2), s.w, s.onGround?1:0, s.jh?1:0].join(',');
  const nodes = [{ s: s0, p: -1, a: null }]; const seen = new Set([key(s0)]);
  for (let i = 0; i < nodes.length && nodes.length < limit; i++) {
    const n = nodes[i];
    for (let d = -1; d <= 1; d++) for (let j = 0; j < 2; j++) for (let sh = 0; sh < 2; sh++) {
      if (sh && opts.noShift) continue;
      const s = Sim.cloneState(n.s);
      for (let f = 0; f < K && !s.dead && !s.won; f++)
        Sim.step(L, s, { left: d < 0, right: d > 0, jump: !!j, shift: f === 0 && !!sh }, DT, opts);
      if (s.dead) continue;
      if (s.won) { let c = i, path = [[d,j,sh]]; while (nodes[c].p >= 0) { path.push(nodes[c].a); c = nodes[c].p; } return { ok: true, n: nodes.length, time: s.time, steps: path.length }; }
      const k = key(s); if (seen.has(k)) continue; seen.add(k);
      nodes.push({ s, p: i, a: [d,j,sh] });
    }
  }
  return { ok: false, n: nodes.length };
}
let bad = 0;
const only = process.argv[2] ? +process.argv[2] : 0;
Sim.levels.forEach((L, i) => {
  if (only && i+1 !== only) return;
  const a = solve(L, {}, 2500000), b = solve(L, { noShift: true }, 2500000);
  const good = a.ok && !b.ok; if (!good) bad++;
  console.log(`L${i+1} ${L.name.padEnd(16)} solvable=${a.ok} (${a.n} nodes${a.ok ? ', ~'+a.time.toFixed(1)+'s' : ''})  solvableWithoutShift=${b.ok}  ${good ? 'OK' : '<<< PROBLEM'}`);
});
process.exit(bad ? 1 : 0);
