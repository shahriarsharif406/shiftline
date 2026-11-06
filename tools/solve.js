// BFS bot. Usage: node tools/solve.js <level 1-based> <exit|noshift|shard0|shard1...>
// Prints one JSON line. Used to prove levels are solvable (and not solvable without shifting).
const Sim = require('../sim.js');
const DT = 1 / 120, K = 10;
function solve(L, goal, limit) {
  const opts = goal === 'noshift' ? { noShift: true } : {};
  const shardIdx = goal.startsWith('shard') ? +goal.slice(5) : -1;
  const s0 = Sim.newState(L);
  const key = s => [Math.round(s.x * 5), Math.round(s.y * 5), Math.round(s.vx), Math.round(s.vy / 3), s.w, s.onGround ? 1 : 0, s.jh ? 1 : 0].join(',');
  const nodes = [{ s: s0 }]; const seen = new Set([key(s0)]);
  for (let i = 0; i < nodes.length && nodes.length < limit; i++) {
    const n = nodes[i];
    for (let d = -1; d <= 1; d++) for (let j = 0; j < 2; j++) for (let sh = 0; sh < 2; sh++) {
      if (sh && opts.noShift) continue;
      const s = Sim.cloneState(n.s);
      for (let f = 0; f < K && !s.dead && !s.won; f++) {
        Sim.step(L, s, { left: d < 0, right: d > 0, jump: !!j, shift: f === 0 && !!sh }, DT, opts);
        if (shardIdx >= 0 && (s.got & (1 << shardIdx))) return { ok: true, n: nodes.length, time: s.time };
      }
      if (s.dead) continue;
      if (s.won && shardIdx < 0) return { ok: true, n: nodes.length, time: s.time };
      if (s.won) continue;
      const k = key(s); if (seen.has(k)) continue; seen.add(k);
      nodes.push({ s });
    }
  }
  return { ok: false, n: nodes.length, exhausted: nodes.length < limit };
}
if (require.main === module) {
  const li = +process.argv[2] - 1, goal = process.argv[3];
  const r = solve(Sim.levels[li], goal, 3000000);
  console.log(JSON.stringify(Object.assign({ level: li + 1, goal }, r)));
}
module.exports = { solve };
