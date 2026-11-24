/** Small helpers for template `params` functions. All take a seeded rng. */

/** Integer in [lo, hi] inclusive. */
export function int(rng: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

/** Two different coprime integers in [lo, hi]; with `ascending` the first is smaller. */
export function coprimePair(
  rng: () => number,
  lo: number,
  hi: number,
  ascending = false,
): [number, number] {
  for (let i = 0; i < 100; i++) {
    const a = int(rng, lo, hi);
    const b = int(rng, lo, hi);
    if (a !== b && gcd(a, b) === 1) return ascending && a > b ? [b, a] : [a, b];
  }
  return [lo, lo + 1]; // consecutive integers are always coprime
}
