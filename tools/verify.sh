#!/bin/sh
# Verifies every level in parallel: exit reachable, NOT reachable without shifting, every shard reachable.
cd "$(dirname "$0")/.." || exit 1
N=$(node -e "console.log(require('./sim.js').levels.length)")
for i in $(seq 1 "$N"); do
  echo "$i exit"; echo "$i noshift"
  S=$(node -e "console.log(require('./sim.js').levels[$i-1].shards.length)")
  for k in $(seq 0 $((S-1))); do echo "$i shard$k"; done
done | xargs -P "${JOBS:-2}" -L1 node tools/solve.js | sort -t: -k2 -n
