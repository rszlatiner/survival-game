/**
 * Unit 15 bank: interpreting and discussing results.
 * Original templates written for this game. Difficulty 1 = one statistic from
 * a short list (mean, median, mode, range, a percentage) or a simple sampling
 * choice; 2 = percentage change, comparing two data sets, a missing value,
 * pie-chart angles, frequency tables, correlation from a table, consistency;
 * 3 = checking a claim about percentage change, a truncated chart axis,
 * combining means, removing an error, comparing two statistics at once,
 * predicting from a sample. All data is in the prompt and every item has one
 * defensible answer that can be calculated, never an opinion. Typed answers
 * are positive numbers; percentage answers are typed as the number only.
 */
import type { QuestionTemplate } from "@/lib/questions/types";
import { int } from "@/lib/questions/random";
import { ZONE_WORDS as Z } from "@/content/units/zones";
import { pickSet } from "@/content/units/pickset";
import { pickRanked } from "@/content/units/rankpick";

const INT = { kind: "integer" } as const;
const CHOICE = { kind: "choice", options: [] as string[] } as const;
const MINUS = "−";
const list = (a: number[]) => a.join(", ");
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const sorted = (a: number[]) => [...a].sort((x, y) => x - y);
const range = (a: number[]) => Math.max(...a) - Math.min(...a);

/** The key plus three distractors chosen from the candidates by the number s (different subsets on different seeds). */
function mix(key: string, cands: string[], s: number): string[] {
  const arr = [...new Set(cands)].filter((c) => c !== key);
  let r = s;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = r % (i + 1);
    r = Math.floor(r / (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return [key, ...arr.slice(0, 3)];
}
const SEL = (rng: () => number) => int(rng, 0, 5039);
/** Like mix, but s packs four random target ranks and a tie-break (see pickSet). */
const SEL2 = (rng: () => number) => int(rng, 0, 256 * 1000 - 1);
const mix2 = (key: string, cands: string[], s: number) =>
  pickSet(key, cands, [s % 4, Math.floor(s / 4) % 4, Math.floor(s / 16) % 4, Math.floor(s / 64) % 4], Math.floor(s / 256));

function shuffle<T>(rng: () => number, a: T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
/** n different integers in [lo, hi]. */
function distinct(rng: () => number, n: number, lo: number, hi: number): number[] {
  const out: number[] = [];
  while (out.length < n) {
    const v = int(rng, lo, hi);
    if (!out.includes(v)) out.push(v);
  }
  return out;
}
/** n integers in [1, 40] with exactly the given mean (random spread around it). */
function setWithMean(rng: () => number, n: number, mean: number): number[] {
  for (let i = 0; i < 200; i++) {
    const v: number[] = [];
    for (let j = 0; j < n - 1; j++) v.push(int(rng, Math.max(1, mean - 6), mean + 6));
    const last = n * mean - sum(v);
    if (last >= 1 && last <= 40) return shuffle(rng, [...v, last]);
  }
  return Array(n).fill(mean);
}


type P = Record<string, number>;
/** Leaf rows of the stem-and-leaf for the reading template, as digit arrays. */
function rowsOf(p: P): number[][] {
  return [0, 1, 2].map((i) => String(p[`r${i}`]).padStart(p[`z${i}`], "0").split("").map(Number));
}
function valuesOf(p: P): number[] {
  return rowsOf(p).flatMap((r, i) => r.map((l) => (p.s0 + i) * 10 + l));
}
/** Values of one group (a or b) from the back-to-back table: stems 1 to 3, a leaf of -1 means no leaves. */
function groupOf(p: P, g: "a" | "b"): number[] {
  const out: number[] = [];
  for (const st of [1, 2, 3]) {
    const leaves = p[`${g}${st}`];
    if (leaves < 0) continue;
    const digits = String(leaves).split("").map(Number);
    // leading zeros are kept by storing the leaves as a digit string in order: the first digit is never dropped
    for (const l of digits) out.push(st * 10 + l);
  }
  return out.sort((x, y) => x - y);
}
const med5 = (v: number[]) => v[(v.length - 1) / 2];
/** True if the short conclusion holds for the four weekly counts. */
function conclusionTrue(o: string, v: number[]): boolean {
  const steps = [v[1] - v[0], v[2] - v[1], v[3] - v[2]];
  switch (o) {
    case "Rose every week": return steps.every((x) => x > 0);
    case "Fell every week": return steps.every((x) => x < 0);
    case "Rose by the same amount each week": return steps.every((x) => x === steps[0]);
    case "Highest in week 1": return v[0] === Math.max(...v);
    case "Highest in week 2": return v[1] === Math.max(...v);
    case "Highest in week 4": return v[3] === Math.max(...v);
    case "Lowest in week 4": return v[3] === Math.min(...v);
    case "Lowest in week 2": return v[1] === Math.min(...v);
    case "At least doubled by week 4": return v[3] >= 2 * v[0];
    case "Fell by half or more by week 4": return 2 * v[3] <= v[0];
  }
  return false;
}
function conclusionKey(kind: number, v: number[]): string {
  return kind === 0 ? "Rose every week" : kind === 1 ? "Fell every week" : "Highest in week 2";
}

/** Round percentages (5 to 100, not p) that a careless solver could give for a fall of p%. */
function slipPercents(p: number): number[] {
  const c = [100 - p, 2 * p, p / 2, p + 10, p - 10, p + 5, p - 5, 100 - p / 2, p + 20, p - 20, (100 * p) / (100 - p)];
  return [...new Set(c)].filter((x) => Number.isInteger(x) && x >= 5 && x <= 100 && x !== p);
}
/** Tom's wrong figure: one of the slips, chosen by w. */
function claimOf(p: number, w: number): number {
  const pool = slipPercents(p);
  return pool[w % pool.length];
}

const POS = "Positive correlation";
const NEG = "Negative correlation";
const NONE = "No correlation";

export const UNIT_15: QuestionTemplate[] = [
  // ---------------- Difficulty 1 ----------------
  {
    id: "u15-mean-01",
    unit: 15,
    difficulty: 1,
    resource: "water",
    format: INT,
    params(rng) {
      const m = int(rng, 18, 28);
      const d = [int(rng, -4, 4), int(rng, -4, 4), int(rng, -4, 4), int(rng, -4, 4)];
      const all = [...d, -sum(d)].map((x) => m + x);
      return { m, a: all[0], b: all[1], c: all[2], d: all[3], e: all[4] };
    },
    prompt: ({ a, b, c, d, e }, zone) =>
      `${Z[zone].Place}, you count the ${Z[zone].food} you collect on each of five days: ${list([a, b, c, d, e])}. What is the mean number per day?`,
    expected: ({ m }) => m,
    solution: ({ m, a, b, c, d, e }) => `Add the five values: ${[a, b, c, d, e].join(" + ")} = ${a + b + c + d + e}. Divide by 5: ${a + b + c + d + e} ÷ 5 = ${m}.`,
  },
  {
    id: "u15-stem-leaf-read-01",
    unit: 15,
    difficulty: 1,
    resource: "food",
    format: INT,
    params(rng) {
      const s0 = int(rng, 1, 3);
      const rows = [0, 1, 2].map(() => Array.from({ length: int(rng, 2, 4) }, () => int(rng, 0, 9)).sort((x, y) => x - y));
      const values = rows.flatMap((r, i) => r.map((l) => (s0 + i) * 10 + l));
      for (let i = 0; i < 100; i++) {
        const T = (s0 + int(rng, 0, 2)) * 10 + 5;
        const k = values.filter((v) => v > T).length;
        if (k >= 1 && k < values.length) return { s0, T, r0: Number(rows[0].join("")), r1: Number(rows[1].join("")), r2: Number(rows[2].join("")), z0: rows[0].length, z1: rows[1].length, z2: rows[2].length };
      }
      return { s0, T: (s0 + 1) * 10 + 5, r0: Number(rows[0].join("")), r1: Number(rows[1].join("")), r2: Number(rows[2].join("")), z0: rows[0].length, z1: rows[1].length, z2: rows[2].length };
    },
    prompt: (p, zone) => {
      const rows = rowsOf(p);
      return (
        `${Z[zone].Place}, you count the ${Z[zone].food} you collect each day. Stem-and-leaf (key 2 | 3 means 23): ` +
        `${rows.map((r, i) => `${p.s0 + i} | ${r.join("")}`).join("; ")}. On how many days did you collect more than ${p.T}?`
      );
    },
    expected: (p) => valuesOf(p).filter((v) => v > p.T).length,
    solution: (p) => {
      const big = valuesOf(p).filter((v) => v > p.T);
      return `Read each stem and leaf as a number. The values above ${p.T} are ${list(big)}, so there are ${big.length} such days.`;
    },
  },
  {
    id: "u15-two-way-read-01",
    unit: 15,
    difficulty: 1,
    resource: "wood",
    format: INT,
    params: (rng) => ({ a: int(rng, 3, 14), b: int(rng, 3, 14), c: int(rng, 3, 14), d: int(rng, 3, 14), q: int(rng, 0, 3) }),
    prompt: ({ a, b, c, d, q }, zone) =>
      `${Z[zone].Place}, a survey of castaways gives a two-way table. Fishing: ${a} adults, ${b} children. Building: ${c} adults, ${d} children. ` +
      `How many ${["children were surveyed in total", "adults were surveyed in total", "castaways prefer fishing", "castaways prefer building"][q]}?`,
    expected: ({ a, b, c, d, q }) => [b + d, a + c, a + b, c + d][q],
    solution: ({ a, b, c, d, q }) =>
      [
        `Add the children in both rows: ${b} + ${d} = ${b + d}.`,
        `Add the adults in both rows: ${a} + ${c} = ${a + c}.`,
        `Add the fishing row: ${a} + ${b} = ${a + b}.`,
        `Add the building row: ${c} + ${d} = ${c + d}.`,
      ][q],
  },
  {
    id: "u15-timeseries-read-01",
    unit: 15,
    difficulty: 1,
    resource: "stone",
    format: INT,
    params(rng) {
      const v = distinct(rng, 6, 8, 40);
      return { a: v[0], b: v[1], c: v[2], d: v[3], e: v[4], f: v[5], hi: int(rng, 0, 1) };
    },
    prompt: ({ a, b, c, d, e, f, hi }, zone) =>
      `${Z[zone].Place}, your weekly count of ${Z[zone].food} for weeks 1 to 6 was ${list([a, b, c, d, e, f])}. ` +
      `In which week was the count ${hi ? "highest" : "lowest"}? (Write the week number.)`,
    expected: ({ a, b, c, d, e, f, hi }) => {
      const v = [a, b, c, d, e, f];
      return v.indexOf(hi ? Math.max(...v) : Math.min(...v)) + 1;
    },
    solution: ({ a, b, c, d, e, f, hi }) => {
      const v = [a, b, c, d, e, f];
      const x = hi ? Math.max(...v) : Math.min(...v);
      return `The ${hi ? "highest" : "lowest"} count is ${x}, which is in week ${v.indexOf(x) + 1}.`;
    },
  },
  {
    id: "u15-yes-percent-01",
    unit: 15,
    difficulty: 1,
    resource: "water",
    format: INT,
    params(rng) {
      const N = [4, 5, 10, 20, 25, 50][int(rng, 0, 5)];
      return { N, k: int(rng, 1, N - 1) };
    },
    prompt: ({ N, k }, zone) =>
      `${Z[zone].Place}, you ask ${N} castaways if they want to move camp. ${k} say yes. What percentage say yes? (Write the number only.)`,
    expected: ({ N, k }) => (100 * k) / N,
    solution: ({ N, k }) => `${k} out of ${N} is ${k}/${N}. Multiply by 100: ${k} ÷ ${N} × 100 = ${(100 * k) / N}, so ${(100 * k) / N}% say yes.`,
  },
  {
    id: "u15-sample-choice-01",
    unit: 15,
    difficulty: 1,
    resource: "stone",
    format: CHOICE,
    params: (rng) => ({ n: int(rng, 8, 30), pop: int(rng, 6, 20) * 10, s: SEL(rng) }),
    prompt: ({ n, pop }, zone) =>
      `${Z[zone].Place}, you survey a grove of ${pop} coconut palms. You want a fair estimate of the mean number of coconuts per palm by counting ${n} palms. ` +
      `Which sample is the fairest?`,
    options: ({ n, s }) =>
      mix(
        `The ${n} palms drawn at random`,
        [
          `The ${n} palms nearest your camp`,
          `The ${n} tallest palms`,
          `The ${n} palms with the most coconuts`,
          `The ${n} palms closest to the shore`,
          `The ${n} palms easiest to climb`,
        ],
        s,
      ),
    expected: ({ n }) => `The ${n} palms drawn at random`,
    solution: ({ n }) =>
      `A fair sample gives every palm the same chance of being chosen. Choosing near the camp, by height, by coconuts or by ease of climbing favours some palms. ` +
      `So the fairest is: The ${n} palms drawn at random.`,
  },
  {
    id: "u15-percent-increase-01",
    unit: 15,
    difficulty: 2,
    resource: "food",
    format: INT,
    params: (rng) => ({ t: int(rng, 2, 10), p: [10, 15, 20, 25, 30, 40, 50][int(rng, 0, 6)] }),
    prompt: ({ t, p }, zone) =>
      `${Z[zone].Place}, your weekly count of ${Z[zone].food} rose from ${20 * t} in week 1 to ${20 * t + (20 * t * p) / 100} in week 2. ` +
      `What was the percentage increase? (Write the number only.)`,
    expected: ({ p }) => p,
    solution: ({ t, p }) => {
      const O = 20 * t;
      const inc = (O * p) / 100;
      return `Increase = ${O + inc} ${MINUS} ${O} = ${inc}. Percentage increase = increase ÷ original × 100 = ${inc} ÷ ${O} × 100 = ${p}.`;
    },
  },
  {
    id: "u15-compare-means-01",
    unit: 15,
    difficulty: 2,
    resource: "water",
    format: CHOICE,
    params(rng) {
      for (let i = 0; i < 100; i++) {
        const mA = int(rng, 8, 20);
        const mB = mA + (int(rng, 0, 1) ? 1 : -1) * int(rng, 1, 5);
        const A = setWithMean(rng, 4, mA);
        const B = setWithMean(rng, 4, mB);
        if (sum(A) / 4 === mA && sum(B) / 4 === mB) return { a1: A[0], a2: A[1], a3: A[2], a4: A[3], b1: B[0], b2: B[1], b3: B[2], b4: B[3], s: SEL(rng) };
      }
      return { a1: 10, a2: 12, a3: 14, a4: 16, b1: 8, b2: 9, b3: 10, b4: 13, s: 1 };
    },
    prompt: ({ a1, a2, a3, a4, b1, b2, b3, b4 }, zone) =>
      `${Z[zone].Place}, you count ${Z[zone].food} at two sites on four days. Site A: ${list([a1, a2, a3, a4])}. Site B: ${list([b1, b2, b3, b4])}. ` +
      `Which statement about the means is correct?`,
    options: ({ a1, a2, a3, a4, b1, b2, b3, b4, s }) => {
      const A = [a1, a2, a3, a4];
      const B = [b1, b2, b3, b4];
      const hi = sum(A) > sum(B) ? "A" : "B";
      const lo = hi === "A" ? "B" : "A";
      const d = Math.abs(sum(A) - sum(B)) / 4;
      const rd = Math.abs(range(A) - range(B));
      const sa = sorted(A);
      const sb = sorted(B);
      const md = Math.abs((sa[1] + sa[2]) / 2 - (sb[1] + sb[2]) / 2);
      const t = (site: string, x: number) => `Site ${site} has the higher mean, by ${x}`;
      const cands = [t(lo, d), t(hi, 4 * d), t(lo, 4 * d)];
      for (const x of [rd, md]) if (Number.isInteger(x) && x > 0) cands.push(t(hi, x), t(lo, x));
      return mix(t(hi, d), cands, s);
    },
    expected: ({ a1, a2, a3, a4, b1, b2, b3, b4 }) => {
      const sa = a1 + a2 + a3 + a4;
      const sb = b1 + b2 + b3 + b4;
      return `Site ${sa > sb ? "A" : "B"} has the higher mean, by ${Math.abs(sa - sb) / 4}`;
    },
    solution: ({ a1, a2, a3, a4, b1, b2, b3, b4 }) => {
      const sa = a1 + a2 + a3 + a4;
      const sb = b1 + b2 + b3 + b4;
      return (
        `Mean of A = ${sa} ÷ 4 = ${sa / 4}. Mean of B = ${sb} ÷ 4 = ${sb / 4}. ` +
        `The difference is ${Math.abs(sa - sb) / 4}, so: Site ${sa > sb ? "A" : "B"} has the higher mean, by ${Math.abs(sa - sb) / 4}.`
      );
    },
  },
  {
    id: "u15-missing-value-01",
    unit: 15,
    difficulty: 2,
    resource: "stone",
    format: INT,
    params(rng) {
      const v = [int(rng, 5, 20), int(rng, 5, 20), int(rng, 5, 20), int(rng, 5, 20)];
      const x = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].filter((c) => (sum(v) + c) % 5 === 0);
      const last = x[int(rng, 0, x.length - 1)];
      return { a: v[0], b: v[1], c: v[2], d: v[3], x: last, m: (sum(v) + last) / 5 };
    },
    prompt: ({ a, b, c, d, m }, zone) =>
      `${Z[zone].Place}, the mean number of ${Z[zone].food} you collect per day over five days is ${m}. On four of the days you collect ${list([a, b, c, d])}. ` +
      `How many do you collect on the fifth day?`,
    expected: ({ x }) => x,
    solution: ({ a, b, c, d, x, m }) =>
      `Total for five days = ${m} × 5 = ${5 * m}. The four known days add up to ${a + b + c + d}. ` +
      `Fifth day = ${5 * m} ${MINUS} ${a + b + c + d} = ${x}.`,
  },
  {
    id: "u15-backtoback-01",
    unit: 15,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params(rng) {
      for (let i = 0; i < 200; i++) {
        const okv = (v: number) => v % 10 !== 0;
        const A = distinct(rng, 5, 11, 39).filter(okv).sort((x, y) => x - y);
        const B = distinct(rng, 5, 11, 39).filter(okv).sort((x, y) => x - y);
        if (A.length !== 5 || B.length !== 5) continue;
        const row = (V: number[], st: number) => V.filter((v) => Math.floor(v / 10) === st).map((v) => v % 10).join("");
        if (A[2] !== B[2] && [1, 2, 3].every((st) => row(A, st).length + row(B, st).length > 0)) {
          const out: Record<string, number> = {};
          [1, 2, 3].forEach((st) => {
            out[`a${st}`] = row(A, st) === "" ? -1 : Number(row(A, st));
            out[`b${st}`] = row(B, st) === "" ? -1 : Number(row(B, st));
          });
          return out;
        }
      }
      return { a1: 28, b1: 4, a2: 17, b2: 39, a3: 6, b3: 15 };
    },
    prompt: (p, zone) => {
      const t = (v: number) => (v < 0 ? "-" : String(v));
      return (
        `${Z[zone].Place}, two sites record daily counts of ${Z[zone].food}. Stem-and-leaf (stem 2, leaf 3 means 23). ` +
        `${[1, 2, 3].map((st) => `${st}: A ${t(p[`a${st}`])}, B ${t(p[`b${st}`])}`).join(". ")}. What is the difference between the two medians?`
      );
    },
    expected: (p) => Math.abs(med5(groupOf(p, "a")) - med5(groupOf(p, "b"))),
    solution: (p) => {
      const A = groupOf(p, "a");
      const B = groupOf(p, "b");
      return (
        `Site A in order: ${list(A)}, median ${med5(A)}. Site B in order: ${list(B)}, median ${med5(B)}. ` +
        `Difference = ${Math.max(med5(A), med5(B))} ${MINUS} ${Math.min(med5(A), med5(B))} = ${Math.abs(med5(A) - med5(B))}.`
      );
    },
  },
  {
    id: "u15-trend-choice-01",
    unit: 15,
    difficulty: 2,
    resource: "food",
    format: CHOICE,
    params(rng) {
      const p = int(rng, 1, 4);
      const base = [0, 1, 2, 3].map(() => int(rng, 8, 16));
      base[p - 1] += int(rng, 12, 16);
      const dir = int(rng, 0, 1);
      const y2 = base.map((v) => v + (dir ? 1 : -1) * int(rng, 1, 4));
      return { p, dir, a: base[0], b: base[1], c: base[2], d: base[3], e: y2[0], f: y2[1], g: y2[2], h: y2[3], s: SEL2(rng) };
    },
    prompt: ({ a, b, c, d, e, f, g, h }, zone) =>
      `${Z[zone].Place}, you record your counts of ${Z[zone].food} by quarter. Year 1: ${list([a, b, c, d])}. Year 2: ${list([e, f, g, h])}. Which statement is correct?`,
    options: ({ p, dir, s }) => {
      const text = (q: number, hi: number) => `Peak: quarter ${q}; year 2 total ${hi ? "higher" : "lower"}`;
      const pool: string[] = [];
      for (let q = 1; q <= 4; q++) for (const hi of [0, 1]) pool.push(text(q, hi));
      return mix2(text(p, dir), pool, s);
    },
    expected: ({ p, dir }) => `Peak: quarter ${p}; year 2 total ${dir ? "higher" : "lower"}`,
    solution: ({ p, dir, a, b, c, d, e, f, g, h }) =>
      `The highest count in each year is in quarter ${p}. Totals: year 1 = ${a + b + c + d}, year 2 = ${e + f + g + h}, so year 2 is ${dir ? "higher" : "lower"}. ` +
      `So: Peak: quarter ${p}; year 2 total ${dir ? "higher" : "lower"}.`,
  },
  {
    id: "u15-correlation-01",
    unit: 15,
    difficulty: 2,
    resource: "water",
    format: CHOICE,
    params(rng) {
      const kind = int(rng, 0, 2);
      const x0 = int(rng, 1, 4);
      const sx = int(rng, 1, 3);
      const y0 = int(rng, 4, 10);
      // one small step against the trend in the sloping cases, so the answer is about the overall pattern
      const dip = int(rng, 1, 3);
      const steps = [0, 1, 2, 3].map((i) => (i === dip ? -1 : int(rng, 3, 5)));
      let ys: number[];
      if (kind === 0) ys = [y0, y0 + steps[0], y0 + steps[0] + steps[1], y0 + sum(steps.slice(0, 3)), y0 + sum(steps)];
      else if (kind === 1) {
        const top = y0 + 20;
        ys = [top, top - steps[0], top - steps[0] - steps[1], top - sum(steps.slice(0, 3)), top - sum(steps)];
      } else {
        const a = y0;
        const b = a + int(rng, 3, 6);
        const c = a + int(rng, 1, 2);
        ys = [a, b, c, b, a];
      }
      return { kind, x0, sx, y1: ys[0], y2: ys[1], y3: ys[2], y4: ys[3], y5: ys[4] };
    },
    prompt: ({ x0, sx, y1, y2, y3, y4, y5 }, zone) =>
      `${Z[zone].Place}, you record hours of sun and seedling height (cm) at five plots. Sun: ${list([0, 1, 2, 3, 4].map((i) => x0 + i * sx))}. ` +
      `Height: ${list([y1, y2, y3, y4, y5])}. What kind of correlation does the data show?`,
    options: () => [POS, NEG, NONE],
    expected: ({ kind }) => [POS, NEG, NONE][kind],
    solution: ({ kind }) =>
      [
        `As the hours of sun go up, the height generally goes up (one small dip does not change the pattern). So the answer is: ${POS}.`,
        `As the hours of sun go up, the height generally goes down (one small rise does not change the pattern). So the answer is: ${NEG}.`,
        `The height goes up and down as the hours of sun increase, with no steady direction. So the answer is: ${NONE}.`,
      ][kind],
  },
  {
    id: "u15-consistency-01",
    unit: 15,
    difficulty: 2,
    resource: "stone",
    format: CHOICE,
    params(rng) {
      for (let i = 0; i < 100; i++) {
        const A = distinct(rng, 5, 15, 32);
        const B = distinct(rng, 5, 15, 32);
        if (range(A) !== range(B)) return { a1: A[0], a2: A[1], a3: A[2], a4: A[3], a5: A[4], b1: B[0], b2: B[1], b3: B[2], b4: B[3], b5: B[4], s: SEL(rng) };
      }
      return { a1: 20, a2: 21, a3: 22, a4: 23, a5: 24, b1: 16, b2: 20, b3: 22, b4: 26, b5: 30, s: 1 };
    },
    prompt: ({ a1, a2, a3, a4, a5, b1, b2, b3, b4, b5 }, zone) =>
      `${Z[zone].Place}, two ways of twisting ${Z[zone].rope} each make five strands (lengths in cm). A: ${list([a1, a2, a3, a4, a5])}. ` +
      `B: ${list([b1, b2, b3, b4, b5])}. The smaller range is more consistent. Which way is more consistent, and what is its range?`,
    options: ({ a1, a2, a3, a4, a5, b1, b2, b3, b4, b5, s }) => {
      const ra = range([a1, a2, a3, a4, a5]);
      const rb = range([b1, b2, b3, b4, b5]);
      const better = ra < rb ? "A" : "B";
      const other = better === "A" ? "B" : "A";
      const rBetter = Math.min(ra, rb);
      const rOther = Math.max(ra, rb);
      return mix(`Way ${better}, range ${rBetter}`, [`Way ${other}, range ${rOther}`, `Way ${better}, range ${rOther}`, `Way ${other}, range ${rBetter}`], s);
    },
    expected: ({ a1, a2, a3, a4, a5, b1, b2, b3, b4, b5 }) => {
      const ra = range([a1, a2, a3, a4, a5]);
      const rb = range([b1, b2, b3, b4, b5]);
      return `Way ${ra < rb ? "A" : "B"}, range ${Math.min(ra, rb)}`;
    },
    solution: ({ a1, a2, a3, a4, a5, b1, b2, b3, b4, b5 }) => {
      const ra = range([a1, a2, a3, a4, a5]);
      const rb = range([b1, b2, b3, b4, b5]);
      return `Range of A = ${Math.max(a1, a2, a3, a4, a5)} ${MINUS} ${Math.min(a1, a2, a3, a4, a5)} = ${ra}. Range of B = ${Math.max(b1, b2, b3, b4, b5)} ${MINUS} ${Math.min(b1, b2, b3, b4, b5)} = ${rb}. The smaller range is more consistent, so: Way ${ra < rb ? "A" : "B"}, range ${Math.min(ra, rb)}.`;
    },
  },
  {
    id: "u15-twoway-percent-01",
    unit: 15,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params(rng) {
      const N = [10, 20, 25, 50][int(rng, 0, 3)];
      return { N, a: int(rng, 1, N - 1), b: int(rng, 3, 14), d: int(rng, 3, 14) };
    },
    prompt: ({ N, a, b, d }, zone) =>
      `${Z[zone].Place}, a survey gives a two-way table. Fishing: ${a} adults, ${b} children. Building: ${N - a} adults, ${d} children. ` +
      `What percentage of the adults prefer fishing? (Write the number only.)`,
    expected: ({ N, a }) => (100 * a) / N,
    solution: ({ N, a }) =>
      `There are ${a} + ${N - a} = ${N} adults. ${a} out of ${N} is ${a} \u00f7 ${N} \u00d7 100 = ${(100 * a) / N}%.`,
  },
  {
    id: "u15-percent-claim-01",
    unit: 15,
    difficulty: 3,
    resource: "food",
    format: CHOICE,
    params: (rng) => ({
      p: [10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80][int(rng, 0, 10)],
      t: int(rng, 2, 12),
      w: int(rng, 0, 99),
      tg: int(rng, 0, 3),
      tie: int(rng, 0, 999),
    }),
    prompt: ({ p, t, w }, zone) => {
      const O = 20 * t;
      const N = (O * (100 - p)) / 100;
      return (
        `${Z[zone].Place}, your daily count of ${Z[zone].food} fell from ${O} to ${N}. Tom says the percentage fall is ${claimOf(p, w)}%. ` +
        `Which percentage is the actual fall?`
      );
    },
    options: ({ p, w, tg, tie }) => {
      const pool = slipPercents(p).map((x) => `${x}%`);
      return pickRanked(`${p}%`, pool, [(o) => Number(o.replace("%", ""))], [tg], tie, [`${claimOf(p, w)}%`]);
    },
    expected: ({ p }) => `${p}%`,
    solution: ({ p, t, w }) => {
      const O = 20 * t;
      const N = (O * (100 - p)) / 100;
      return (
        `The fall is ${O} ${MINUS} ${N} = ${O - N}. Percentage fall = fall \u00f7 original \u00d7 100 = ${O - N} \u00f7 ${O} \u00d7 100 = ${p}%. ` +
        `Tom's ${claimOf(p, w)}% does not match. So the actual fall is ${p}%.`
      );
    },
  },
  {
    id: "u15-misleading-axis-01",
    unit: 15,
    difficulty: 3,
    resource: "stone",
    format: INT,
    params: (rng) => ({ S: [20, 30, 40, 50, 60][int(rng, 0, 4)], h: int(rng, 1, 4), k: int(rng, 2, 5) }),
    prompt: ({ S, h, k }, zone) =>
      `${Z[zone].Place}, a bar chart of ${Z[zone].food} has its vertical axis starting at ${S}, not 0. Bar A shows ${S + h} and bar B shows ${S + k * h}. ` +
      `Measured from the bottom of the chart, how many times as tall as bar A is bar B?`,
    expected: ({ k }) => k,
    solution: ({ S, h, k }) =>
      `Bar heights are measured from ${S}. Bar A: ${S + h} ${MINUS} ${S} = ${h}. Bar B: ${S + k * h} ${MINUS} ${S} = ${k * h}. ` +
      `${k * h} ÷ ${h} = ${k}, so bar B looks ${k} times as tall. (The real values are much closer than that.)`,
  },
  {
    id: "u15-pictogram-area-01",
    unit: 15,
    difficulty: 3,
    resource: "wood",
    format: INT,
    params: (rng) => ({ v: int(rng, 3, 9), k: int(rng, 2, 6) }),
    prompt: ({ v, k }, zone) =>
      `${Z[zone].Place}, a pictogram compares ${v} ${Z[zone].food} on Monday with ${k * v} on Tuesday. ` +
      `The Tuesday picture is drawn ${k} times as tall and ${k} times as wide as the Monday picture. ` +
      `How many times the area of Monday's picture does Tuesday's cover?`,
    expected: ({ k }) => k * k,
    solution: ({ v, k }) =>
      `Area = height \u00d7 width, so scaling both by ${k} multiplies the area by ${k} \u00d7 ${k} = ${k * k}. ` +
      `The real values only differ by ${k} times (${v} to ${k * v}), so the picture exaggerates the difference.`,
  },
  {
    id: "u15-outlier-01",
    unit: 15,
    difficulty: 3,
    resource: "stone",
    format: INT,
    params: (rng) => ({ m: int(rng, 8, 20), q: int(rng, 2, 5) }),
    prompt: ({ m, q }, zone) =>
      `${Z[zone].Place}, six weighings of a sack of ${Z[zone].food} have a mean of ${m + q} kg. One weighing, ${m + 6 * q} kg, was a recording mistake. ` +
      `What is the mean of the other five weighings, in kg?`,
    expected: ({ m }) => m,
    solution: ({ m, q }) =>
      `Total of six = ${m + q} × 6 = ${6 * (m + q)}. Remove the mistake: ${6 * (m + q)} ${MINUS} ${m + 6 * q} = ${5 * m}. ` +
      `Mean of five = ${5 * m} ÷ 5 = ${m} kg.`,
  },
  {
    id: "u15-two-stat-01",
    unit: 15,
    difficulty: 3,
    resource: "water",
    format: CHOICE,
    params(rng) {
      const ms = int(rng, 0, 1);
      const opp = int(rng, 0, 1);
      for (let i = 0; i < 400; i++) {
        const A = distinct(rng, 5, 2, 30);
        const B = distinct(rng, 5, 2, 30);
        const stat = (x: number[]) => (ms ? sorted(x)[2] : sum(x));
        const mid = (x: number[]) => Math.max(...x) + Math.min(...x);
        // in half the seeds the midrange (max + min) orders the sets the opposite way to the mean or median
        const flips = Math.sign(stat(A) - stat(B)) !== Math.sign(mid(A) - mid(B));
        if (stat(A) !== stat(B) && range(A) !== range(B) && mid(A) !== mid(B) && flips === (opp === 1)) return { ms, a1: A[0], a2: A[1], a3: A[2], a4: A[3], a5: A[4], b1: B[0], b2: B[1], b3: B[2], b4: B[3], b5: B[4], s: SEL(rng) };
      }
      return { ms: 0, a1: 4, a2: 9, a3: 12, a4: 15, a5: 20, b1: 8, b2: 10, b3: 11, b4: 13, b5: 14, s: 1 };
    },
    prompt: ({ a1, a2, a3, a4, a5, b1, b2, b3, b4, b5 }, zone) =>
      `${Z[zone].Place}, you count ${Z[zone].food} each day for five days at two sites. Site A: ${list([a1, a2, a3, a4, a5])}. ` +
      `Site B: ${list([b1, b2, b3, b4, b5])}. Which statement is true?`,
    options: ({ ms }) => {
      const w = ms ? "median" : "mean";
      return ["A", "B"].flatMap((x) => ["A", "B"].map((y) => `Higher ${w}: ${x}. Larger range: ${y}`));
    },
    expected: ({ ms, a1, a2, a3, a4, a5, b1, b2, b3, b4, b5 }) => {
      const A = [a1, a2, a3, a4, a5];
      const B = [b1, b2, b3, b4, b5];
      const stat = (x: number[]) => (ms ? sorted(x)[2] : sum(x));
      return `Higher ${ms ? "median" : "mean"}: ${stat(A) > stat(B) ? "A" : "B"}. Larger range: ${range(A) > range(B) ? "A" : "B"}`;
    },
    solution: ({ ms, a1, a2, a3, a4, a5, b1, b2, b3, b4, b5 }) => {
      const A = [a1, a2, a3, a4, a5];
      const B = [b1, b2, b3, b4, b5];
      const stat = (x: number[]) => (ms ? sorted(x)[2] : sum(x) / 5);
      const w = ms ? "median" : "mean";
      const hi = (ms ? sorted(A)[2] > sorted(B)[2] : sum(A) > sum(B)) ? "A" : "B";
      const lg = range(A) > range(B) ? "A" : "B";
      return (
        `${w[0].toUpperCase()}${w.slice(1)}: A is ${stat(A)} and B is ${stat(B)}. Range: A is ${range(A)} and B is ${range(B)}. ` +
        `So the true statement is: Higher ${w}: ${hi}. Larger range: ${lg}.`
      );
    },
  },
  {
    id: "u15-conclusion-01",
    unit: 15,
    difficulty: 3,
    resource: "food",
    format: CHOICE,
    params(rng) {
      for (let i = 0; i < 300; i++) {
        const kind = int(rng, 0, 2);
        const a = int(rng, 10, 24);
        const steps = [int(rng, 2, 6), int(rng, 2, 6), int(rng, 2, 6)];
        if (steps[0] === steps[1] && steps[1] === steps[2]) continue;
        let v: number[];
        if (kind === 0) v = [a, a + steps[0], a + steps[0] + steps[1], a + sum(steps)];
        else if (kind === 1) v = [a + sum(steps), a + steps[1] + steps[2], a + steps[2], a];
        else v = [a, a + steps[0] + steps[1], a + steps[0], a - 1 + steps[2] > 0 ? a - 1 : a];
        if (kind === 0 && v[3] >= 2 * v[0]) continue;
        if (kind === 1 && 2 * v[3] <= v[0]) continue;
        if (kind === 2 && !(v[1] > v[0] && v[1] > v[2] && v[2] > v[3] && v[3] < v[0])) continue;
        return { kind, a: v[0], b: v[1], c: v[2], d: v[3], s: SEL2(rng) };
      }
      return { kind: 0, a: 12, b: 15, c: 20, d: 21, s: 1 };
    },
    prompt: ({ a, b, c, d }, zone) =>
      `${Z[zone].Place}, your weekly count of ${Z[zone].food} in weeks 1 to 4 was ${list([a, b, c, d])}. Which conclusion is supported by the data?`,
    options: ({ kind, a, b, c, d, s }) => {
      const key = conclusionKey(kind, [a, b, c, d]);
      const pool = [
        "Rose every week",
        "Fell every week",
        "Rose by the same amount each week",
        "Highest in week 1",
        "Highest in week 4",
        "Lowest in week 4",
        "Lowest in week 2",
        "At least doubled by week 4",
        "Fell by half or more by week 4",
      ].filter((o) => conclusionTrue(o, [a, b, c, d]) === false);
      return mix2(key, pool, s);
    },
    expected: ({ kind, a, b, c, d }) => conclusionKey(kind, [a, b, c, d]),
    solution: ({ kind, a, b, c, d }) =>
      `Compare the counts week by week: ${list([a, b, c, d])}. ` +
      `${kind === 0 ? "Each week is higher than the one before, but not by the same amount." : kind === 1 ? "Each week is lower than the one before." : "The count goes up to week 2 then falls."} ` +
      `The supported conclusion is: ${conclusionKey(kind, [a, b, c, d])}.`,
  },
];
