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

const INT = { kind: "integer" } as const;
const DEC1 = { kind: "decimal", places: 1 } as const;
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
    id: "u15-median-01",
    unit: 15,
    difficulty: 1,
    resource: "food",
    format: INT,
    params(rng) {
      const v = distinct(rng, 7, 30, 120);
      return { a: v[0], b: v[1], c: v[2], d: v[3], e: v[4], f: v[5], g: v[6] };
    },
    prompt: ({ a, b, c, d, e, f, g }, zone) =>
      `${Z[zone].Place}, you measure the lengths, in cm, of seven ${Z[zone].wood}: ${list([a, b, c, d, e, f, g])}. What is the median length?`,
    expected: ({ a, b, c, d, e, f, g }) => sorted([a, b, c, d, e, f, g])[3],
    solution: ({ a, b, c, d, e, f, g }) => {
      const s = sorted([a, b, c, d, e, f, g]);
      return `Put the values in order: ${list(s)}. The middle (4th) value of seven is ${s[3]}, so the median is ${s[3]}.`;
    },
  },
  {
    id: "u15-mode-01",
    unit: 15,
    difficulty: 1,
    resource: "wood",
    format: INT,
    params(rng) {
      const m = int(rng, 3, 20);
      const others: number[] = [];
      while (others.length < 5) {
        const v = int(rng, 2, 24);
        if (v !== m && !others.includes(v)) others.push(v);
      }
      const all = shuffle(rng, [m, m, m, ...others]);
      return { m, a: all[0], b: all[1], c: all[2], d: all[3], e: all[4], f: all[5], g: all[6], h: all[7] };
    },
    prompt: ({ a, b, c, d, e, f, g, h }, zone) =>
      `${Z[zone].Place}, you count the ${Z[zone].food} you collect in each of eight hours: ${list([a, b, c, d, e, f, g, h])}. What is the mode?`,
    expected: ({ m }) => m,
    solution: ({ m }) => `The mode has the highest frequency. ${m} occurs 3 times while each other value occurs once, so the mode is ${m}.`,
  },
  {
    id: "u15-range-01",
    unit: 15,
    difficulty: 1,
    resource: "stone",
    format: INT,
    params(rng) {
      const v = distinct(rng, 6, 18, 38);
      return { a: v[0], b: v[1], c: v[2], d: v[3], e: v[4], f: v[5] };
    },
    prompt: ({ a, b, c, d, e, f }, zone) =>
      `${Z[zone].Place}, the midday temperature (°C) on six days was ${list([a, b, c, d, e, f])}. What is the range of the temperatures?`,
    expected: ({ a, b, c, d, e, f }) => range([a, b, c, d, e, f]),
    solution: ({ a, b, c, d, e, f }) => {
      const v = [a, b, c, d, e, f];
      return `Range = highest ${MINUS} lowest = ${Math.max(...v)} ${MINUS} ${Math.min(...v)} = ${range(v)}.`;
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
      `${Z[zone].Place}, the island has ${pop} coconut palms. You want a fair estimate of the mean number of coconuts per palm by counting ${n} palms. ` +
      `Which sample is the fairest?`,
    options: ({ n, s }) =>
      mix(
        `${n} palms chosen by random draw`,
        [
          `The ${n} palms nearest your camp`,
          `The ${n} tallest palms`,
          `The ${n} palms with the most coconuts`,
          `The ${n} palms closest to the shore`,
          `The ${n} palms easiest to climb`,
        ],
        s,
      ),
    expected: ({ n }) => `${n} palms chosen by random draw`,
    solution: ({ n }) =>
      `A fair sample gives every palm the same chance of being chosen. Choosing near the camp, by height, by coconuts or by ease of climbing favours some palms. ` +
      `So the fairest is: ${n} palms chosen by random draw.`,
  },

  // ---------------- Difficulty 2 ----------------
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
    id: "u15-pie-angle-01",
    unit: 15,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params(rng) {
      const N = [12, 15, 18, 20, 24, 30, 36, 40, 45, 60][int(rng, 0, 9)];
      return { N, k: int(rng, 2, Math.floor(N / 2)) };
    },
    prompt: ({ N, k }, zone) =>
      `${Z[zone].Place}, ${N} castaways vote for a shelter site and ${k} choose the cliff camp. ` +
      `In a pie chart of the votes, what angle, in degrees, shows the ${k} votes for the cliff camp?`,
    expected: ({ N, k }) => (360 * k) / N,
    solution: ({ N, k }) =>
      `The whole circle is 360° for ${N} votes, so one vote is 360 ÷ ${N} = ${360 / N}°. ` +
      `${k} votes: ${k} × ${360 / N} = ${(360 * k) / N}°.`,
  },
  {
    id: "u15-median-even-01",
    unit: 15,
    difficulty: 2,
    resource: "food",
    format: DEC1,
    params(rng) {
      const v = distinct(rng, 6, 4, 40);
      return { a: v[0], b: v[1], c: v[2], d: v[3], e: v[4], f: v[5] };
    },
    prompt: ({ a, b, c, d, e, f }, zone) =>
      `${Z[zone].Place}, you weigh six sacks of ${Z[zone].food}, in kg: ${list([a, b, c, d, e, f])}. What is the median mass, in kg?`,
    expected: ({ a, b, c, d, e, f }) => {
      const s = sorted([a, b, c, d, e, f]);
      return (s[2] + s[3]) / 2;
    },
    solution: ({ a, b, c, d, e, f }) => {
      const s = sorted([a, b, c, d, e, f]);
      return `In order: ${list(s)}. Six values leave two in the middle, the 3rd and 4th; their average is (${s[2]} + ${s[3]}) ÷ 2 = ${(s[2] + s[3]) / 2}.`;
    },
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
      const steps = [int(rng, 1, 4), int(rng, 1, 4), int(rng, 1, 4), int(rng, 1, 4)];
      let ys: number[];
      if (kind === 0) ys = [y0, y0 + steps[0], y0 + steps[0] + steps[1], y0 + sum(steps.slice(0, 3)), y0 + sum(steps)];
      else if (kind === 1) {
        const top = y0 + sum(steps);
        ys = [top, top - steps[0], top - steps[0] - steps[1], top - sum(steps.slice(0, 3)), y0];
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
        `As the hours of sun go up, the height goes up every time. So the answer is: ${POS}.`,
        `As the hours of sun go up, the height goes down every time. So the answer is: ${NEG}.`,
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
    id: "u15-freq-mean-01",
    unit: 15,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params(rng) {
      for (let i = 0; i < 400; i++) {
        const v = distinct(rng, 3, 1, 9).sort((x, y) => x - y);
        const f = [int(rng, 1, 6), int(rng, 1, 6), int(rng, 1, 6)];
        const total = v[0] * f[0] + v[1] * f[1] + v[2] * f[2];
        if (total % sum(f) === 0) return { v1: v[0], v2: v[1], v3: v[2], f1: f[0], f2: f[1], f3: f[2] };
      }
      return { v1: 2, v2: 4, v3: 6, f1: 1, f2: 2, f3: 1 };
    },
    prompt: ({ v1, v2, v3, f1, f2, f3 }, zone) =>
      `${Z[zone].Place}, you count coconuts on palms: ${f1} ${f1 === 1 ? "palm has" : "palms have"} ${v1}, ${f2} ${f2 === 1 ? "palm has" : "palms have"} ${v2} ` +
      `and ${f3} ${f3 === 1 ? "palm has" : "palms have"} ${v3}. What is the mean number of coconuts per palm?`,
    expected: ({ v1, v2, v3, f1, f2, f3 }) => (v1 * f1 + v2 * f2 + v3 * f3) / (f1 + f2 + f3),
    solution: ({ v1, v2, v3, f1, f2, f3 }) =>
      `Total coconuts = ${v1} × ${f1} + ${v2} × ${f2} + ${v3} × ${f3} = ${v1 * f1 + v2 * f2 + v3 * f3}. ` +
      `Number of palms = ${f1} + ${f2} + ${f3} = ${f1 + f2 + f3}. Mean = ${v1 * f1 + v2 * f2 + v3 * f3} ÷ ${f1 + f2 + f3} = ${(v1 * f1 + v2 * f2 + v3 * f3) / (f1 + f2 + f3)}.`,
  },

  // ---------------- Difficulty 3 ----------------
  {
    id: "u15-percent-claim-01",
    unit: 15,
    difficulty: 3,
    resource: "food",
    format: CHOICE,
    params(rng) {
      const p = [20, 60, 80][int(rng, 0, 2)];
      for (let i = 0; i < 100; i++) {
        const t = int(rng, 3, 20);
        const O = 10 * t;
        const N = (O * (100 - p)) / 100;
        const d = O - N;
        const q = (100 * d) / N;
        if (new Set([p, q, d, N, 100 - p]).size === 5) return { p, t, c: int(rng, 0, 1), s: SEL(rng) };
      }
      return { p: 20, t: 7, c: 0, s: 1 };
    },
    prompt: ({ p, t, c }, zone) => {
      const O = 10 * t;
      const N = (O * (100 - p)) / 100;
      const q = (100 * (O - N)) / N;
      return (
        `${Z[zone].Place}, your daily count of ${Z[zone].food} fell from ${O} to ${N}. Tom says the percentage fall is ${c ? p : q}%. ` +
        `Which statement is correct?`
      );
    },
    options: ({ p, t, c, s }) => {
      const O = 10 * t;
      const N = (O * (100 - p)) / 100;
      const d = O - N;
      const q = (100 * d) / N;
      const W = (x: number) => `Tom is wrong: the fall is ${x}%`;
      const C = (x: number) => `Tom is correct: the fall is ${x}%`;
      return c ? mix(C(p), [W(q), W(d), C(100 - p), W(N)], s) : mix(W(p), [C(q), W(d), W(100 - p), W(N)], s);
    },
    expected: ({ p, c }) => (c ? `Tom is correct: the fall is ${p}%` : `Tom is wrong: the fall is ${p}%`),
    solution: ({ p, t, c }) => {
      const O = 10 * t;
      const N = (O * (100 - p)) / 100;
      const d = O - N;
      const q = (100 * d) / N;
      return (
        `The fall is ${O} ${MINUS} ${N} = ${d}. Percentage fall = fall ÷ original × 100 = ${d} ÷ ${O} × 100 = ${p}%. ` +
        `${c ? "That matches Tom's figure." : `Tom divided by the new count (${d} ÷ ${N} × 100 = ${q}), which is the wrong base.`} ` +
        `So the answer is: ${c ? "Tom is correct" : "Tom is wrong"}: the fall is ${p}%.`
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
      `${Z[zone].Place}, a bar chart's vertical axis starts at ${S} mm, not 0. Bar A shows ${S + h} mm and bar B shows ${S + k * h} mm. ` +
      `Measured from the bottom of the chart, how many times as tall as bar A does bar B look?`,
    expected: ({ k }) => k,
    solution: ({ S, h, k }) =>
      `Bar heights are measured from ${S}. Bar A: ${S + h} ${MINUS} ${S} = ${h}. Bar B: ${S + k * h} ${MINUS} ${S} = ${k * h}. ` +
      `${k * h} ÷ ${h} = ${k}, so bar B looks ${k} times as tall. (The real values are much closer than that.)`,
  },
  {
    id: "u15-combined-mean-01",
    unit: 15,
    difficulty: 3,
    resource: "wood",
    format: INT,
    params(rng) {
      const n1 = int(rng, 2, 6);
      let n2 = int(rng, 2, 6);
      if (n2 === n1) n2 = n1 === 6 ? 2 : n1 + 1;
      const M = int(rng, 20, 40);
      const u = (int(rng, 0, 1) ? 1 : -1) * int(rng, 1, 3);
      return { n1, n2, M, m1: M + n2 * u, m2: M - n1 * u };
    },
    prompt: ({ n1, n2, m1, m2 }, zone) =>
      `${Z[zone].Place}, you collect a mean of ${m1} ${Z[zone].food} a day over ${n1} days, then a mean of ${m2} a day over the next ${n2} days. ` +
      `What is the mean number per day over all ${n1 + n2} days?`,
    expected: ({ M }) => M,
    solution: ({ n1, n2, m1, m2, M }) =>
      `First ${n1} days: ${n1} × ${m1} = ${n1 * m1}. Next ${n2} days: ${n2} × ${m2} = ${n2 * m2}. ` +
      `Total = ${n1 * m1 + n2 * m2} over ${n1 + n2} days: ${n1 * m1 + n2 * m2} ÷ ${n1 + n2} = ${M}.`,
  },
  {
    id: "u15-outlier-01",
    unit: 15,
    difficulty: 3,
    resource: "stone",
    format: INT,
    params: (rng) => ({ m: int(rng, 8, 20), q: int(rng, 2, 5) }),
    prompt: ({ m, q }, zone) =>
      `${Z[zone].Place}, six rainfall readings have a mean of ${m + q} mm. One reading, ${m + 6 * q} mm, was a recording mistake. ` +
      `What is the mean of the other five readings, in mm?`,
    expected: ({ m }) => m,
    solution: ({ m, q }) =>
      `Total of six = ${m + q} × 6 = ${6 * (m + q)}. Remove the mistake: ${6 * (m + q)} ${MINUS} ${m + 6 * q} = ${5 * m}. ` +
      `Mean of five = ${5 * m} ÷ 5 = ${m} mm.`,
  },
  {
    id: "u15-two-stat-01",
    unit: 15,
    difficulty: 3,
    resource: "water",
    format: CHOICE,
    params(rng) {
      const ms = int(rng, 0, 1);
      for (let i = 0; i < 200; i++) {
        const A = distinct(rng, 5, 2, 30);
        const B = distinct(rng, 5, 2, 30);
        const stat = (x: number[]) => (ms ? sorted(x)[2] : sum(x));
        if (stat(A) !== stat(B) && range(A) !== range(B)) return { ms, a1: A[0], a2: A[1], a3: A[2], a4: A[3], a5: A[4], b1: B[0], b2: B[1], b3: B[2], b4: B[3], b5: B[4], s: SEL(rng) };
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
    id: "u15-predict-01",
    unit: 15,
    difficulty: 3,
    resource: "food",
    format: INT,
    params(rng) {
      const N = [20, 25, 40, 50][int(rng, 0, 3)];
      return { N, k: int(rng, 3, N - 3), q: int(rng, 3, 12) };
    },
    prompt: ({ N, k, q }, zone) =>
      `${Z[zone].Place}, you ask ${N} castaways if they will join a fishing trip. ${k} say yes. ` +
      `Assume all ${N * q} castaways answer in the same proportions. How many of the ${N * q} would say no?`,
    expected: ({ N, k, q }) => (N - k) * q,
    solution: ({ N, k, q }) =>
      `${N} ${MINUS} ${k} = ${N - k} of the ${N} say no. The group of ${N * q} is ${q} times bigger (${N * q} ÷ ${N} = ${q}), ` +
      `so expect ${N - k} × ${q} = ${(N - k) * q} to say no.`,
  },
];
