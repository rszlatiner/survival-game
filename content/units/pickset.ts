/**
 * Choose three wrong options for a choice question made of numbers (coordinate pairs or phrases with numbers) so
 * that the key does not stand out. Each seed supplies random target ranks (0 = lowest, 3 = highest, how many options
 * score lower than the key) for every numeric column and for x + y of a pair, plus a target for the hub rule (how
 * many coordinates an option shares with the others: key strictly most, strictly least, or neither). The 3-subset
 * of the slip pool that best matches the targets is used, with a seeded tie-break. Thin pools of coordinate pairs
 * are padded with near-miss arithmetic slips so there is always a real choice.
 */
const nums = (o: string): number[] => (o.replace(/−/g, "-").match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
const OFFSETS = [[1, 0], [0, 1], [-1, 0], [0, -1], [2, 0], [0, 2], [-2, 0], [0, -2], [1, 1], [-1, -1], [1, -1], [-1, 1]];

export function pickSet(key: string, pool: string[], targets: number[], tie: number, forced: string[] = []): string[] {
  const seen = new Set([key, ...forced]);
  const slips = pool.filter((o) => (seen.has(o) ? false : (seen.add(o), true)));
  const pairKey = /^\(−?\d+, −?\d+\)$/.test(key);
  if (pairKey && slips.length < 3) {
    // only a thin pool is padded, and only as far as needed for three wrong options
    const [kx, ky] = nums(key);
    const f = (x: number, y: number) => `(${x < 0 ? "−" + -x : x}, ${y < 0 ? "−" + -y : y})`;
    for (const [dx, dy] of OFFSETS) {
      const o = f(kx + dx, ky + dy);
      if (!seen.has(o) && slips.length < 3) (seen.add(o), slips.push(o));
    }
  }
  const need = 3 - forced.length;
  const all0 = [key, ...forced];
  const dim = Math.min(...[...all0, ...slips].map((o) => nums(o).length));
  const pair = [...all0, ...slips].every((o) => /^\(/.test(o)) && dim === 2;
  const vec = (o: string) => {
    const v = nums(o).slice(0, dim);
    return pair ? [...v, v[0] + v[1]] : v;
  };
  const base = all0.map(vec);
  const sv = slips.map(vec);
  const ncol = base[0].length;
  const want = targets[3];
  let best = Infinity;
  let winners: number[][] = [];
  const evalSet = (idx: number[]) => {
    const vs = [...base, ...idx.map((i) => sv[i])];
    let cost = 0;
    for (let c = 0; c < ncol; c++) {
      const kv = vs[0][c];
      let r = 0;
      for (const v of vs) if (v[c] < kv) r++;
      cost += 2 * Math.abs(r - targets[c % 4]);
    }
    const share = vs.map((v, i) => {
      let n = 0;
      for (let j = 0; j < vs.length; j++) if (i !== j) for (let k = 0; k < dim; k++) if (v[k] === vs[j][k]) n++;
      return n;
    });
    const mx = Math.max(...share);
    const mn = Math.min(...share);
    const isMax = share[0] === mx;
    const isMin = share[0] === mn;
    const uniq = (x: number) => share.filter((y) => y === x).length === 1;
    const ok = want === 3 ? isMax && uniq(mx) : want === 0 ? isMin && uniq(mn) : !isMax && !isMin;
    if (!ok) cost += 3;
    if (cost < best) {
      best = cost;
      winners = [idx.slice()];
    } else if (cost === best) winners.push(idx.slice());
  };
  const walk = (start: number, acc: number[]) => {
    if (acc.length === need) return evalSet(acc);
    for (let i = start; i < slips.length; i++) {
      acc.push(i);
      walk(i + 1, acc);
      acc.pop();
    }
  };
  walk(0, []);
  return [...all0, ...winners[tie % winners.length].map((i) => slips[i])];
}
/** Four random target ranks and a tie-break, drawn from a seeded rng, for params(). */
export function pickParams(rng: () => number): { t0: number; t1: number; t2: number; t3: number; tie: number } {
  const r = (n: number) => Math.floor(rng() * n);
  return { t0: r(4), t1: r(4), t2: r(4), t3: r(4), tie: r(1000) };
}
