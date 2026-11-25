/**
 * Choose wrong options so the key's rank is spread evenly. Each seed supplies a target rank for every scorer
 * (rank = how many options score lower than the key, 0 to 3); the 3-subset of the slip pool that best matches
 * all the targets is used, with a seeded tie-break. Pool items equal to the key or to each other are ignored.
 */
export function pickRanked(
  key: string,
  pool: string[],
  scorers: ((o: string) => number)[],
  targets: number[],
  tie: number,
  forced: string[] = [],
): string[] {
  const seen = new Set([key, ...forced]);
  const slips = pool.filter((o) => (seen.has(o) ? false : (seen.add(o), true)));
  const need = 3 - forced.length;
  const subsets: string[][] = [];
  const walk = (start: number, acc: string[]) => {
    if (acc.length === need) return void subsets.push([...acc]);
    for (let i = start; i < slips.length; i++) walk(i + 1, [...acc, slips[i]]);
  };
  walk(0, []);
  let best = Infinity;
  let winners: string[][] = [];
  for (const sub of subsets) {
    const all = [...forced, ...sub];
    let cost = 0;
    scorers.forEach((score, c) => {
      const kv = score(key);
      cost += Math.abs(all.filter((o) => score(o) < kv).length - targets[c]);
    });
    if (cost < best) {
      best = cost;
      winners = [all];
    } else if (cost === best) winners.push(all);
  }
  return [key, ...winners[tie % winners.length]];
}
