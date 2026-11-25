/**
 * Unit 8 bank: fractions.
 * Original templates written for this game. Difficulty 1 = fraction of an
 * amount, equivalent fractions, simplifying, fraction to decimal, adding with
 * a common denominator; 2 = adding, subtracting and multiplying fractions,
 * mixed numbers, dividing by a fraction, ordering, decimals to fractions;
 * 3 = finding the whole, repeated fractions of a remainder, mixed-number sums,
 * quotients, fractions between fractions and multiplying mixed numbers.
 * Typed answers are whole numbers or decimals. Answers that are fractions use
 * the choice format, written in simplest form with mixed numbers such as
 * "1 1/4" when the value is above 1, and every such prompt says so.
 */
import type { QuestionTemplate } from "@/lib/questions/types";
import { coprimePair, gcd, int, pick } from "@/lib/questions/random";
import { ZONE_WORDS as Z } from "@/content/units/zones";

const INT = { kind: "integer" } as const;
const D2F = { kind: "decimal", places: 2 } as const;
const CHOICE = { kind: "choice", options: [] as string[] } as const;
const M = "−";
const T = "×";
const SIMPLEST = "Give the answer in simplest form.";

/** Simplest form; mixed number "w n/d" above 1; whole numbers as plain digits. */
function fmt(n: number, d: number): string {
  const g = gcd(n, d);
  const [a, b] = [n / g, d / g];
  if (b === 1) return `${a}`;
  if (a > b) return `${Math.floor(a / b)} ${a % b}/${b}`;
  return `${a}/${b}`;
}
/** Correct answer first, then the first three distinct candidates that are not the answer. */
function withDistractors(correct: string, cands: string[]): string[] {
  const out = [correct];
  for (const c of cands) if (!out.includes(c) && out.length < 4) out.push(c);
  return out;
}
/** Denominator pairs with no common factor, so the common denominator is their product. */
const PAIRS: [number, number][] = [[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [2, 7], [3, 7]];
/** Neighbouring fractions a/b < c/d (both simplest, below 1, denominators up to 9) with c*b - a*d = 1, so the fraction made by adding tops and bottoms lies strictly between them. */
const BETWEEN: [number, number, number, number][] = [];
for (let b = 2; b <= 9; b++)
  for (let d = 2; d <= 9; d++)
    for (let a = 1; a < b; a++)
      for (let c = 1; c < d; c++) if (gcd(a, b) === 1 && gcd(c, d) === 1 && c * b - a * d === 1) BETWEEN.push([a, b, c, d]);

/** A numerator below d that shares no factor with d, so n/d is already in simplest form. */
function numer(rng: () => number, d: number): number {
  for (let i = 0; i < 50; i++) {
    const n = int(rng, 1, d - 1);
    if (gcd(n, d) === 1) return n;
  }
  return 1;
}
/** A random order of 0..n-1 stored in params (q0, q1, ...), so wrong-answer choices vary from seed to seed. */
function perm(rng: () => number, n: number): Record<string, number> {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return Object.fromEntries(a.map((v, i) => [`q${i}`, v]));
}
const order = (p: Record<string, number>, n: number) => Array.from({ length: n }, (_, i) => p[`q${i}`]);
/** Wrong-answer candidates in the stored random order. */
const shuffledCands = (p: Record<string, number>, cands: string[]) => order(p, cands.length).map((i) => cands[i]);
/** "n/d" followed by how it simplifies, without restating an unchanged fraction. */
function simp(n: number, d: number): string {
  const f = fmt(n, d);
  return f === `${n}/${d}` ? `${n}/${d} (already in simplest form)` : `${n}/${d} = ${f}`;
}
type Fr = [number, number];
/**
 * Options for a fraction question: the key plus three wrong answers from `pool` (typical slips, each a [top, bottom]).
 * `p.r` (0 to 3) is how many wrong answers are smaller in value than the key, so the key's value rank is spread evenly.
 */
function ranked(p: Record<string, number>, key: Fr, pool: Fr[]): string[] {
  const kv = key[0] / key[1];
  const keyS = fmt(key[0], key[1]);
  const seen = new Set([keyS]);
  const below: string[] = [];
  const above: string[] = [];
  for (const i of order(p, pool.length)) {
    const [n, d] = pool[i];
    if (!(n > 0 && d > 0)) continue;
    const str = fmt(n, d);
    if (seen.has(str)) continue;
    seen.add(str);
    const v = n / d;
    if (Math.abs(v - kv) < 1e-9) continue;
    (v < kv ? below : above).push(str);
  }
  let nb = Math.min(p.r, below.length);
  let na = 3 - nb;
  if (na > above.length) {
    na = above.length;
    nb = Math.min(below.length, 3 - na);
  }
  return [keyS, ...below.slice(0, nb), ...above.slice(0, na)];
}
const ORDER_WORDS = ["shortest", "second shortest", "second longest", "longest"];
/** The four fractions of an ordering question, shortest first. */
const ascending = (p: Record<string, number>) =>
  [1, 2, 3, 4]
    .map((i) => [p[`n${i}`], p[`d${i}`]])
    .sort((x, y) => x[0] * y[1] - y[0] * x[1])
    .map(([n, d]) => `${n}/${d}`);
const parts = (n: number) => (n === 1 ? "1 part" : `${n} parts`);
export const UNIT_08: QuestionTemplate[] = [
  // ---------------- Difficulty 1 ----------------
  {
    id: "u08-fraction-of-01",
    unit: 8,
    difficulty: 1,
    resource: "food",
    format: INT,
    params(rng) {
      const d = int(rng, 2, 8);
      return { n: numer(rng, d), d, k: int(rng, 2, 9) };
    },
    prompt: ({ n, d, k }, zone) =>
      `${Z[zone].Place}, you gather ${d * k} ${Z[zone].food} and keep ${n}/${d} of them. How many do you keep?`,
    expected: ({ n, k }) => n * k,
    solution: ({ n, d, k }) =>
      `Split ${d * k} into ${d} equal parts: ${d * k} ÷ ${d} = ${k} in each part. Then take ${parts(n)}: ${n} ${T} ${k} = ${n * k}.`,
  },
  {
    id: "u08-equivalent-01",
    unit: 8,
    difficulty: 1,
    resource: "water",
    format: INT,
    params(rng) {
      const [a, b] = coprimePair(rng, 1, 9, true);
      return { a, b, m: int(rng, 2, 6) };
    },
    prompt: ({ a, b, m }, zone) =>
      `A water jar ${Z[zone].place} is ${a}/${b} full. Written with ${b * m} equal parts, it is ?/${b * m} full. What number replaces the question mark?`,
    expected: ({ a, m }) => a * m,
    solution: ({ a, b, m }) =>
      `${b} ${T} ${m} = ${b * m}, so multiply the top by ${m} as well: ${a} ${T} ${m} = ${a * m}. So ${a}/${b} = ${a * m}/${b * m}.`,
  },
  {
    id: "u08-simplify-01",
    unit: 8,
    difficulty: 1,
    resource: "stone",
    format: CHOICE,
    params(rng) {
      const [a, b] = coprimePair(rng, 1, 9, true);
      return { a, b, g: int(rng, 2, 6), r: int(rng, 0, 3), ...perm(rng, 6) };
    },
    prompt: ({ a, b, g }, zone) =>
      `${g * b} ${Z[zone].stone} are in a pile, and ${g * a} of them are flat. Write ${g * a}/${g * b} in its simplest form.`,
    options: (p) => ranked(p, [p.a, p.b], [[p.b, p.a], [p.g * p.a, p.b], [p.a + 1, p.b + 1], [p.a, p.g * p.b], [p.a, p.b + 1], [p.a, 2 * p.b]]),
    expected: ({ a, b }) => `${a}/${b}`,
    solution: ({ a, b, g }) =>
      `Divide the top and the bottom by their highest common factor, ${g}: ${g * a} ÷ ${g} = ${a} and ${g * b} ÷ ${g} = ${b}. So ${g * a}/${g * b} = ${a}/${b}.`,
  },
  {
    id: "u08-to-decimal-01",
    unit: 8,
    difficulty: 1,
    resource: "wood",
    format: D2F,
    params(rng) {
      const d = pick(rng, [2, 4, 5, 10, 20, 25]);
      return { n: numer(rng, d), d };
    },
    prompt: ({ n, d }, zone) =>
      `${Z[zone].Place}, a building plan uses ${n}/${d} of a tonne of material. Write ${n}/${d} as a decimal. Type the number only.`,
    expected: ({ n, d }) => Math.round((n * 100) / d) / 100,
    solution: ({ n, d }) => `A fraction is a division: ${n} ÷ ${d} = ${Math.round((n * 100) / d) / 100}.`,
  },
  {
    id: "u08-add-like-01",
    unit: 8,
    difficulty: 1,
    resource: "food",
    format: CHOICE,
    params(rng) {
      for (let i = 0; i < 100; i++) {
        const d = int(rng, 5, 12);
        const a = numer(rng, d);
        const b = numer(rng, d);
        if (a + b < d) return { a, b, d, r: int(rng, 0, 3), ...perm(rng, 10) };
      }
      return { a: 1, b: 2, d: 7, r: 1, ...perm(rng, 10) };
    },
    prompt: ({ a, b, d }, zone) =>
      `${Z[zone].Place}, you eat ${a}/${d} of your ${Z[zone].food} in the morning and ${b}/${d} in the evening. What fraction have you eaten in total? ${SIMPLEST}`,
    options: (p) => {
      const { a, b, d } = p;
      return ranked(p, [a + b, d], [[a + b, 2 * d], [a + b - 1, d], [a * b, d], [a + b + 1, d], [a + b, d - 1], [a + b + 2, d], [a, d], [a + b, d + 1], [d - a - b, d], [2 * (a + b), d]]);
    },
    expected: ({ a, b, d }) => fmt(a + b, d),
    solution: ({ a, b, d }) =>
      `The denominators are the same, so add the tops and keep the bottom. So ${a}/${d} + ${b}/${d} = ${simp(a + b, d)}.`,
  },
  {
    id: "u08-remaining-01",
    unit: 8,
    difficulty: 1,
    resource: "water",
    format: INT,
    params(rng) {
      const b = int(rng, 3, 8);
      return { a: numer(rng, b), b, k: int(rng, 2, 9) };
    },
    prompt: ({ a, b, k }, zone) =>
      `You drink ${a}/${b} of a ${b * k}-litre barrel of ${Z[zone].water}. How many litres are left?`,
    expected: ({ a, b, k }) => (b - a) * k,
    solution: ({ a, b, k }) =>
      `Split ${b * k} into ${b} equal parts: ${b * k} ÷ ${b} = ${k} per part. You drank ${parts(a)}, so ${parts(b - a)} are left: ${b - a} ${T} ${k} = ${(b - a) * k}.`,
  },

  // ---------------- Difficulty 2 ----------------
  {
    id: "u08-add-unlike-01",
    unit: 8,
    difficulty: 2,
    resource: "stone",
    format: CHOICE,
    params(rng) {
      const [b, d] = pick(rng, PAIRS);
      return { a: numer(rng, b), b, c: numer(rng, d), d, r: int(rng, 0, 3), ...perm(rng, 9) };
    },
    prompt: ({ a, b, c, d }, zone) =>
      `A wall ${Z[zone].place} is ${a}/${b} built on Monday and a further ${c}/${d} of the wall is built on Tuesday. What fraction is built altogether? ${SIMPLEST}`,
    options: (p) => {
      const { a, b, c, d } = p;
      return ranked(p, [a * d + b * c, b * d], [[a + c, b + d], [a * d + b * c, b + d], [a + c, Math.min(b, d)], [a + c, b * d], [a * d + b * c + 1, b * d], [a * d + b * c - 1, b * d], [a * c, b * d], [a * d + b * c, b * d + 1], [a * d + b * c, Math.max(b, d)]]);
    },
    expected: ({ a, b, c, d }) => fmt(a * d + b * c, b * d),
    solution: ({ a, b, c, d }) =>
      `Use a common denominator, ${b * d}: ${a}/${b} = ${a * d}/${b * d} and ${c}/${d} = ${b * c}/${b * d}. ` +
      `Add: ${a * d} + ${b * c} = ${a * d + b * c}, so the total is ${simp(a * d + b * c, b * d)}.`,
  },
  {
    id: "u08-subtract-unlike-01",
    unit: 8,
    difficulty: 2,
    resource: "water",
    format: CHOICE,
    params(rng) {
      for (let i = 0; i < 100; i++) {
        const [b, d] = pick(rng, PAIRS);
        const a = numer(rng, b);
        const c = numer(rng, d);
        if (a * d > b * c + 1) return { a, b, c, d, r: int(rng, 0, 3), ...perm(rng, 7) };
      }
      return { a: 3, b: 4, c: 1, d: 3, r: 1, ...perm(rng, 7) };
    },
    prompt: ({ a, b, c, d }, zone) =>
      `A tank of ${Z[zone].water} is ${a}/${b} full. You use ${c}/${d} of a tank. What fraction of a tank is left? ${SIMPLEST}`,
    options: (p) => {
      const { a, b, c, d } = p;
      return ranked(p, [a * d - b * c, b * d], [[a * d - c, b * d], [a * d - b * c + 1, b * d], [a * d - b * c - 1, b * d], [a * d - b * c, b + d], [a * d + b * c, b * d], [a * d - b * c, b * d + 1], [a * d - b * c, 2 * b * d]]);
    },
    expected: ({ a, b, c, d }) => fmt(a * d - b * c, b * d),
    solution: ({ a, b, c, d }) =>
      `Use a common denominator, ${b * d}: ${a}/${b} = ${a * d}/${b * d} and ${c}/${d} = ${b * c}/${b * d}. ` +
      `Subtract: ${a * d} ${M} ${b * c} = ${a * d - b * c}, so ${simp(a * d - b * c, b * d)}.`,
  },
  {
    id: "u08-improper-01",
    unit: 8,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params(rng) {
      const d = int(rng, 2, 9);
      return { w: int(rng, 1, 5), n: numer(rng, d), d };
    },
    prompt: ({ w, n, d }, zone) =>
      `A raft ${Z[zone].place} is ${w} ${n}/${d} lengths of ${Z[zone].rope} long. Written as an improper fraction it is ?/${d}. What is the top number?`,
    expected: ({ w, n, d }) => w * d + n,
    solution: ({ w, n, d }) =>
      `${w} whole ${w === 1 ? "one is" : "ones are"} ${w} ${T} ${d} = ${w * d} parts of size 1/${d}. Add the ${n} extra ${n === 1 ? "part" : "parts"}: ${w * d} + ${n} = ${w * d + n}. So ${w} ${n}/${d} = ${w * d + n}/${d}.`,
  },
  {
    id: "u08-remaining-02",
    unit: 8,
    difficulty: 2,
    resource: "food",
    format: INT,
    params(rng) {
      for (let i = 0; i < 100; i++) {
        const b = int(rng, 4, 9);
        const a = numer(rng, b);
        const c = numer(rng, b);
        if (a + c < b) return { a, b, c, k: int(rng, 2, 8) };
      }
      return { a: 1, b: 5, c: 2, k: 4 };
    },
    prompt: ({ a, b, c, k }, zone) =>
      `You gather ${b * k} ${Z[zone].food}. You eat ${a}/${b} of them and trade ${c}/${b} of them. How many ${Z[zone].food} do you have left?`,
    expected: ({ a, b, c, k }) => (b - a - c) * k,
    solution: ({ a, b, c, k }) =>
      `Eaten and traded together make ${a}/${b} + ${c}/${b} = ${a + c}/${b}. What is left is ${b - a - c}/${b}. ` +
      `Each of the ${b} equal parts is ${b * k} ÷ ${b} = ${k}, so ${b - a - c} ${T} ${k} = ${(b - a - c) * k}.`,
  },
  {
    id: "u08-multiply-01",
    unit: 8,
    difficulty: 2,
    resource: "stone",
    format: CHOICE,
    params(rng) {
      const b = int(rng, 2, 6);
      const d = int(rng, 2, 6);
      return { a: numer(rng, b), b, c: numer(rng, d), d, r: int(rng, 0, 3), ...perm(rng, 8) };
    },
    prompt: ({ a, b, c, d }, zone) =>
      `${c}/${d} of a plot ${Z[zone].place} is cleared for ${Z[zone].stone}, and ${a}/${b} of that cleared part holds large ones. What fraction of the whole plot holds large ${Z[zone].stone}? ${SIMPLEST}`,
    options: (p) => {
      const { a, b, c, d } = p;
      return ranked(p, [a * c, b * d], [[a * c, b + d], [a + c, b * d], [a * d, b * c], [a * c + 1, b * d], [a * c, b * d + 1], [a * c, 2 * b * d], [a * c - 1, b * d], [a * c, b * d + b + d]]);
    },
    expected: ({ a, b, c, d }) => fmt(a * c, b * d),
    solution: ({ a, b, c, d }) =>
      `"Of" means multiply: ${a}/${b} ${T} ${c}/${d}. Multiply the tops (${a} ${T} ${c} = ${a * c}) and the bottoms (${b} ${T} ${d} = ${b * d}), giving ${simp(a * c, b * d)}.`,
  },
  {
    id: "u08-divide-fraction-01",
    unit: 8,
    difficulty: 2,
    resource: "water",
    format: INT,
    params(rng) {
      const [n, d] = coprimePair(rng, 1, 6, true);
      return { n, d, k: int(rng, 2, 7) };
    },
    prompt: ({ n, d, k }, zone) =>
      `A cup holds ${n}/${d} of a litre. How many full cups can you fill from ${n * k} litres of ${Z[zone].water}?`,
    expected: ({ d, k }) => d * k,
    solution: ({ n, d, k }) =>
      `Divide: ${n * k} ÷ ${n}/${d} = ${n * k} ${T} ${d}/${n} (flip the fraction and multiply) = ${n * k * d} ÷ ${n} = ${d * k}.`,
  },
  {
    id: "u08-order-01",
    unit: 8,
    difficulty: 2,
    resource: "wood",
    format: CHOICE,
    params(rng) {
      for (let i = 0; i < 200; i++) {
        const fr = Array.from({ length: 4 }, () => {
          const d = int(rng, 3, 10);
          return [int(rng, 1, d - 1), d];
        });
        if (fr.some(([n, d]) => gcd(n, d) !== 1)) continue;
        const vals = fr.map(([n, d]) => n / d);
        if (new Set(vals.map((v) => Math.round(v * 1e6))).size !== 4) continue;
        return { n1: fr[0][0], d1: fr[0][1], n2: fr[1][0], d2: fr[1][1], n3: fr[2][0], d3: fr[2][1], n4: fr[3][0], d4: fr[3][1], k: int(rng, 0, 3) };
      }
      return { n1: 1, d1: 2, n2: 2, d2: 5, n3: 3, d3: 4, n4: 1, d4: 3, k: 3 };
    },
    prompt: ({ n1, d1, n2, d2, n3, d3, n4, d4, k }, zone) =>
      `Four ${Z[zone].wood} are cut to ${n1}/${d1}, ${n2}/${d2}, ${n3}/${d3} and ${n4}/${d4} of a metre. Which fraction shows the ${ORDER_WORDS[k]} one?`,
    options: ({ n1, d1, n2, d2, n3, d3, n4, d4 }) => [`${n1}/${d1}`, `${n2}/${d2}`, `${n3}/${d3}`, `${n4}/${d4}`],
    expected: (p) => ascending(p)[p.k],
    solution: (p) =>
      `Compare them as decimals: ${[1, 2, 3, 4].map((i) => `${p[`n${i}`]}/${p[`d${i}`]} ≈ ${(p[`n${i}`] / p[`d${i}`]).toFixed(2)}`).join(", ")}. ` +
      `From shortest to longest the order is ${ascending(p).join(", ")}, so the ${ORDER_WORDS[p.k]} is ${ascending(p)[p.k]}.`,
  },
  {
    id: "u08-decimal-to-fraction-01",
    unit: 8,
    difficulty: 2,
    resource: "food",
    format: CHOICE,
    params(rng) {
      for (let i = 0; i < 100; i++) {
        const h = int(rng, 4, 96);
        if (gcd(h, 100) > 1) return { h, r: int(rng, 0, 3), ...perm(rng, 8) };
      }
      return { h: 35, r: 1, ...perm(rng, 8) };
    },
    prompt: ({ h }, zone) =>
      `${Z[zone].Place}, a pot is ${(h / 100).toFixed(2)} full of ${Z[zone].food}. Write ${(h / 100).toFixed(2)} as a fraction in its simplest form.`,
    options: (p) => ranked(p, [p.h, 100], [[p.h, 10], [p.h, 50], [100, p.h], [p.h, 1000], [p.h, 200], [p.h, 500], [1, p.h], [100 - p.h, 100]]),
    expected: ({ h }) => fmt(h, 100),
    solution: ({ h }) =>
      `${(h / 100).toFixed(2)} means ${h} hundredths, which is ${h}/100. Divide the top and bottom by ${gcd(h, 100)}: ${fmt(h, 100)}.`,
  },

  // ---------------- Difficulty 3 ----------------
  {
    id: "u08-whole-from-part-01",
    unit: 8,
    difficulty: 3,
    resource: "wood",
    format: INT,
    params(rng) {
      const d = int(rng, 3, 9);
      for (let i = 0; i < 50; i++) {
        const n = int(rng, 2, d - 1);
        if (gcd(n, d) === 1) return { n, d, k: int(rng, 2, 9) };
      }
      return { n: 2, d: 3, k: 4 };
    },
    prompt: ({ n, d, k }, zone) =>
      `${n}/${d} of your ${Z[zone].rope} is ${n * k} m long. How long was the whole length, in metres?`,
    expected: ({ d, k }) => d * k,
    solution: ({ n, d, k }) =>
      `${n} parts are worth ${n * k} m, so one part is ${n * k} ÷ ${n} = ${k} m. The whole has ${d} parts: ${d} ${T} ${k} = ${d * k} m.`,
  },
  {
    id: "u08-two-stage-01",
    unit: 8,
    difficulty: 3,
    resource: "water",
    format: INT,
    params(rng) {
      const b = int(rng, 3, 6);
      const d = int(rng, 3, 5);
      for (let i = 0; i < 100; i++) {
        const a = int(rng, 1, b - 2);
        if (gcd(a, b) === 1) return { a, b, c: numer(rng, d), d, k: int(rng, 1, 4) };
      }
      return { a: 1, b, c: 1, d, k: 2 };
    },
    prompt: ({ a, b, c, d, k }, zone) =>
      `You start with ${b * d * k} litres of ${Z[zone].water}. On day 1 you use ${a}/${b} of it. On day 2 you use ${c}/${d} of what is left. How many litres remain?`,
    expected: ({ a, b, c, d, k }) => (b - a) * (d - c) * k,
    solution: ({ a, b, c, d, k }) =>
      `Day 1 uses ${a}/${b} of ${b * d * k} = ${a * d * k}, leaving ${b * d * k} ${M} ${a * d * k} = ${(b - a) * d * k}. ` +
      `Day 2 uses ${c}/${d} of ${(b - a) * d * k} = ${c * (b - a) * k}, leaving ${(b - a) * d * k} ${M} ${c * (b - a) * k} = ${(b - a) * (d - c) * k}.`,
  },
  {
    id: "u08-mixed-add-01",
    unit: 8,
    difficulty: 3,
    resource: "food",
    format: CHOICE,
    params(rng) {
      const [b, d] = pick(rng, PAIRS);
      return { w1: int(rng, 1, 4), a: numer(rng, b), b, w2: int(rng, 1, 4), c: numer(rng, d), d, r: int(rng, 0, 3), ...perm(rng, 10) };
    },
    prompt: ({ w1, a, b, w2, c, d }, zone) =>
      `${Z[zone].Place}, you carry ${w1} ${a}/${b} kg of ${Z[zone].food} to camp, then ${w2} ${c}/${d} kg more. How many kilograms is that in total? ${SIMPLEST}`,
    options: (p) => {
      const { w1, a, b, w2, c, d } = p;
      const S = w1 + w2;
      const den = b * d;
      const top = a * d + c * b;
      const total = S * den + top;
      return ranked(p, [total, den], [
        [S * (b + d) + a + c, b + d], // added tops and bottoms of the fractions
        top >= den ? [S * den + top - den, den] : [(S + 1) * den + top, den], // forgot to carry, or carried when not needed
        [(w1 * b + a) * (w2 * d + c), den], // multiplied instead of added
        [S * den + a * c, den], // multiplied the fraction parts
        [Math.abs((w1 * b + a) * d - (w2 * d + c) * b), den], // subtracted
        [total + 1, den],
        [total - 1, den],
        [total, den + b + d],
        [w1 * b + a + w2 * d + c, b + d],
        [total, den - 1],
      ]);
    },
    expected: ({ w1, a, b, w2, c, d }) => fmt((w1 + w2) * b * d + a * d + c * b, b * d),
    solution: ({ w1, a, b, w2, c, d }) =>
      `Add the whole numbers: ${w1} + ${w2} = ${w1 + w2}. Add the fractions with a common denominator: ${a * d}/${b * d} + ${c * b}/${b * d} = ${a * d + c * b}/${b * d}. ` +
      `Put them together and tidy up: ${fmt((w1 + w2) * b * d + a * d + c * b, b * d)}.`,
  },
  {
    id: "u08-mixed-divide-01",
    unit: 8,
    difficulty: 3,
    resource: "stone",
    format: INT,
    params(rng) {
      for (let i = 0; i < 100; i++) {
        const d = int(rng, 2, 5);
        const n = int(rng, 1, d - 1);
        const q = int(rng, 3, 8);
        if (gcd(n, d) === 1 && (q * n) % d !== 0) return { n, d, q };
      }
      return { n: 3, d: 4, q: 3 };
    },
    prompt: ({ n, d, q }, zone) =>
      `A path ${Z[zone].place} is ${fmt(q * n, d)} km long and is split into equal sections, each ${n}/${d} km long. How many sections are there?`,
    expected: ({ q }) => q,
    solution: ({ n, d, q }) =>
      `Divide the length by the section size: ${fmt(q * n, d)} ÷ ${n}/${d}. As improper fractions that is ${q * n}/${d} ${T} ${d}/${n} = ${q * n * d}/${d * n} = ${q}.`,
  },
  {
    id: "u08-between-01",
    unit: 8,
    difficulty: 3,
    resource: "stone",
    format: CHOICE,
    params(rng) {
      const [a, b, c, d] = pick(rng, BETWEEN);
      return { a, b, c, d, r: int(rng, 0, 3), ...perm(rng, 11) };
    },
    prompt: ({ a, b, c, d }, zone) =>
      `A marker ${Z[zone].place} must be placed at a point strictly between ${a}/${b} and ${c}/${d} of the way along a trail. Which fraction is a possible place for the marker?`,
    options: (p) => ranked(p, [p.a + p.c, p.b + p.d], [[p.a, p.b + 1], [p.a, p.b + 2], [p.a, 2 * p.b], [1, p.b + p.d], [p.c, p.d], [2 * p.c + 1, 2 * p.d], [p.c + 1, p.d], [p.c, p.d - 1], [3 * p.c + 1, 3 * p.d], [2 * p.a, 2 * p.b + 1], [3 * p.a, 3 * p.b + 2]]),
    expected: ({ a, b, c, d }) => fmt(a + c, b + d),
    solution: ({ a, b, c, d }) =>
      `Turn them into decimals: ${a}/${b} ≈ ${(a / b).toFixed(2)} and ${c}/${d} ≈ ${(c / d).toFixed(2)}. A fraction between them must be bigger than ${(a / b).toFixed(2)} and smaller than ${(c / d).toFixed(2)}. ` +
      `${fmt(a + c, b + d)} ≈ ${((a + c) / (b + d)).toFixed(2)} fits. Every other option is too small, too big, or equal to ${c}/${d}. ` +
      `The answer is ${fmt(a + c, b + d)}.`,
  },
  {
    id: "u08-mixed-multiply-01",
    unit: 8,
    difficulty: 3,
    resource: "wood",
    format: CHOICE,
    params(rng) {
      const b = int(rng, 2, 5);
      const d = int(rng, 2, 5);
      return { w1: int(rng, 1, 3), a: numer(rng, b), b, w2: int(rng, 1, 3), c: numer(rng, d), d, r: int(rng, 0, 3), ...perm(rng, 8) };
    },
    prompt: ({ w1, a, b, w2, c, d }, zone) =>
      `A mat ${Z[zone].place} is ${w1} ${a}/${b} m long and ${w2} ${c}/${d} m wide. What area, in square metres, does it cover? ${SIMPLEST}`,
    options: (p) => {
      const { w1, a, b, w2, c, d } = p;
      const top = (w1 * b + a) * (w2 * d + c);
      const den = b * d;
      return ranked(p, [top, den], [
        [w1 * w2 * den + a * c, den], // multiplied wholes and fractions separately
        [(w1 + w2) * den + a * d + c * b, den], // added instead of multiplied
        [top, b + d],
        [top + 1, den],
        [top - 1, den],
        [top, 2 * den],
        [top, den + 1],
        [top, den - 1],
      ]);
    },
    expected: ({ w1, a, b, w2, c, d }) => fmt((w1 * b + a) * (w2 * d + c), b * d),
    solution: ({ w1, a, b, w2, c, d }) =>
      `Change to improper fractions: ${w1} ${a}/${b} = ${w1 * b + a}/${b} and ${w2} ${c}/${d} = ${w2 * d + c}/${d}. Multiply the tops and the bottoms: ${(w1 * b + a) * (w2 * d + c)}/${b * d} = ${fmt((w1 * b + a) * (w2 * d + c), b * d)}.`,
  },
];
