/**
 * Unit 6 bank: statistical investigations.
 * Original templates written for this game. Difficulty 1 = one statistic from
 * a short list (median, mode, range), a pie-chart angle, naming a type of data
 * or a data source; 2 = frequency tables, even-sized medians, comparing
 * spreads, sampling and bias, systematic sampling, two-way tables, stem and
 * leaf, pie-chart counts; 3 = changing and combining means, medians from
 * frequency tables, choosing an average, estimating from a sample, reasoning
 * from several averages. There are no figures, so every data set and table is
 * written out in the prompt.
 */
import type { QuestionTemplate } from "@/lib/questions/types";
import { int, pick } from "@/lib/questions/random";
import { ZONE_WORDS as Z } from "@/content/units/zones";

const INT = { kind: "integer" } as const;
const CHOICE = { kind: "choice", options: [] as string[] } as const;
const M = "−";
const list = (a: number[]) => a.join(", ");
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
const sorted = (a: number[]) => a.slice().sort((x, y) => x - y);
function shuffled<T>(rng: () => number, a: T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
/** Group sizes whose sector angle per person (360 / n) is a whole number. */
const PIE_N = [12, 15, 18, 20, 24, 30, 36, 40, 45, 60];

const TYPES = ["Categorical", "Discrete", "Continuous"];
const AVERAGES = ["The mean", "The median", "The mode", "The range"];

/** Store a list as params under a prefix (v0, v1, ...). */
function pack(prefix: string, a: number[]): Record<string, number> {
  return Object.fromEntries(a.map((v, i) => [`${prefix}${i}`, v]));
}
function unpack(p: Record<string, number>, prefix: string, n: number): number[] {
  return Array.from({ length: n }, (_, i) => p[`${prefix}${i}`]);
}
function medianOfTable(fs: number[]): number {
  const n = sum(fs);
  const target = (n + 1) / 2;
  let run = 0;
  for (let i = 0; i < fs.length; i++) {
    run += fs[i];
    if (run >= target) return i + 1;
  }
  return fs.length;
}

export const UNIT_06: QuestionTemplate[] = [
  // ---------------- Difficulty 1 ----------------
  {
    id: "u06-median-odd-01",
    unit: 6,
    difficulty: 1,
    resource: "stone",
    format: INT,
    params: (rng) => pack("v", Array.from({ length: 7 }, () => int(rng, 3, 40))),
    prompt: (p, zone) =>
      `${Z[zone].Place}, seven coconuts are weighed in grams: ${list(unpack(p, "v", 7))}. What is the median mass in grams?`,
    expected: (p) => sorted(unpack(p, "v", 7))[3],
    solution: (p) => {
      const s = sorted(unpack(p, "v", 7));
      return `Put the values in order: ${list(s)}. With 7 values the median is the middle (4th) one: ${s[3]}.`;
    },
  },
  {
    id: "u06-mode-01",
    unit: 6,
    difficulty: 1,
    resource: "wood",
    format: INT,
    params(rng) {
      const [m, a, b, c, d] = shuffled(rng, Array.from({ length: 15 }, (_, i) => i + 1));
      return { m, a, ...pack("v", shuffled(rng, [m, m, m, a, a, b, c, d])) };
    },
    prompt: (p, zone) =>
      `The number of ${Z[zone].wood} you gather on eight trips is ${list(unpack(p, "v", 8))}. What is the mode?`,
    expected: ({ m }) => m,
    solution: ({ m, a }) =>
      `The mode is the value that appears most often. ${m} appears 3 times and no other value appears more than twice (${a} appears twice), so the mode is ${m}.`,
  },
  {
    id: "u06-range-01",
    unit: 6,
    difficulty: 1,
    resource: "water",
    format: INT,
    params(rng) {
      const lo = int(rng, 5, 20);
      const hi = lo + int(rng, 6, 25);
      return { lo, hi, ...pack("v", shuffled(rng, [lo, int(rng, lo, hi), int(rng, lo, hi), hi, int(rng, lo, hi), int(rng, lo, hi)])) };
    },
    prompt: (p, zone) =>
      `Litres of ${Z[zone].water} collected on six days: ${list(unpack(p, "v", 6))}. What is the range?`,
    expected: ({ lo, hi }) => hi - lo,
    solution: ({ lo, hi }) => `The range is the largest value minus the smallest: ${hi} ${M} ${lo} = ${hi - lo}.`,
  },
  {
    id: "u06-pie-angle-01",
    unit: 6,
    difficulty: 1,
    resource: "food",
    format: INT,
    params(rng) {
      const n = pick(rng, PIE_N);
      return { n, f: int(rng, 2, n / 2 - 1) };
    },
    prompt: ({ n, f }, zone) =>
      `${n} castaways pick a favourite food for a pie chart. ${f} of them choose ${Z[zone].food}. ` +
      `What angle, in degrees, should the ${Z[zone].food} sector have?`,
    expected: ({ n, f }) => (360 / n) * f,
    solution: ({ n, f }) =>
      `A full circle is 360°, shared between ${n} people, so one person gets 360 ÷ ${n} = ${360 / n}°. ` +
      `${f} people: ${f} × ${360 / n} = ${(360 / n) * f}°.`,
  },
  {
    id: "u06-data-type-01",
    unit: 6,
    difficulty: 1,
    resource: "stone",
    format: CHOICE,
    params: (rng) => ({ k: int(rng, 0, 2), n: int(rng, 8, 40) }),
    prompt: ({ k, n }, zone) =>
      [
        `${Z[zone].Place}, you record the colour of each of ${n} shells you find. What type of data is this?`,
        `${Z[zone].Place}, you record how many coconuts hang on each of ${n} palm trees. What type of data is this?`,
        `${Z[zone].Place}, you record the exact time, in seconds, that each of ${n} crabs takes to cross a log. What type of data is this?`,
      ][k],
    options: () => TYPES,
    expected: ({ k }) => TYPES[k],
    solution: ({ k }) =>
      [
        "Colours are words that sort things into groups, not numbers, so it is Categorical.",
        "Counts of whole coconuts can only be whole numbers, with gaps between, so it is Discrete.",
        "Times are measured and can take any value in a range, such as 12.37 seconds, so it is Continuous.",
      ][k],
  },
  {
    id: "u06-data-source-01",
    unit: 6,
    difficulty: 1,
    resource: "food",
    format: CHOICE,
    params: (rng) => ({ n: int(rng, 12, 48) }),
    prompt: ({ n }, zone) =>
      `${Z[zone].Place}, you plan to study ${n} items. Which way of getting the data gives primary data, collected by you?`,
    options: ({ n }) => [
      `You measure ${n} shells with a ruler`,
      `You copy ${n} tide times from a chart`,
      `You read ${n} counts in a report`,
      `You use ${n} figures from the old diary`,
    ],
    expected: ({ n }) => `You measure ${n} shells with a ruler`,
    solution: ({ n }) =>
      `Primary data is data you collect yourself. Measuring ${n} shells with a ruler is collecting it yourself: You measure ${n} shells with a ruler. ` +
      `Charts, reports and diaries already exist, so they give secondary data.`,
  },

  // ---------------- Difficulty 2 ----------------
  {
    id: "u06-freq-mean-01",
    unit: 6,
    difficulty: 2,
    resource: "food",
    format: INT,
    params(rng) {
      const v = int(rng, 1, 6);
      for (let i = 0; i < 300; i++) {
        const f = [0, 1, 2, 3].map(() => int(rng, 1, 8));
        const extra = f[1] + 2 * f[2] + 3 * f[3];
        if (extra % sum(f) === 0) return { v, f1: f[0], f2: f[1], f3: f[2], f4: f[3] };
      }
      return { v, f1: 2, f2: 3, f3: 3, f4: 2 };
    },
    prompt: ({ v, f1, f2, f3, f4 }, zone) =>
      `You checked baskets of ${Z[zone].food}. The frequencies for ${v}, ${v + 1}, ${v + 2} and ${v + 3} items per basket are ${f1}, ${f2}, ${f3} and ${f4} baskets. ` +
      `What is the mean number of items per basket?`,
    expected: ({ v, f1, f2, f3, f4 }) => (v * f1 + (v + 1) * f2 + (v + 2) * f3 + (v + 3) * f4) / (f1 + f2 + f3 + f4),
    solution: ({ v, f1, f2, f3, f4 }) => {
      const total = v * f1 + (v + 1) * f2 + (v + 2) * f3 + (v + 3) * f4;
      const n = f1 + f2 + f3 + f4;
      return `Total items = ${v}×${f1} + ${v + 1}×${f2} + ${v + 2}×${f3} + ${v + 3}×${f4} = ${total}. Number of baskets = ${f1} + ${f2} + ${f3} + ${f4} = ${n}. Mean = ${total} ÷ ${n} = ${total / n}.`;
    },
  },
  {
    id: "u06-median-even-01",
    unit: 6,
    difficulty: 2,
    resource: "water",
    format: INT,
    params(rng) {
      for (let i = 0; i < 100; i++) {
        const v = Array.from({ length: 6 }, () => int(rng, 4, 40));
        const s = sorted(v);
        if ((s[2] + s[3]) % 2 === 0) return pack("v", v);
      }
      return pack("v", [10, 14, 8, 20, 16, 12]);
    },
    prompt: (p, zone) =>
      `Six water pots ${Z[zone].place} hold ${list(unpack(p, "v", 6))} litres. What is the median volume, in litres?`,
    expected: (p) => {
      const s = sorted(unpack(p, "v", 6));
      return (s[2] + s[3]) / 2;
    },
    solution: (p) => {
      const s = sorted(unpack(p, "v", 6));
      return `In order: ${list(s)}. With 6 values the median is halfway between the 3rd and 4th: (${s[2]} + ${s[3]}) ÷ 2 = ${(s[2] + s[3]) / 2}.`;
    },
  },
  {
    id: "u06-compare-range-01",
    unit: 6,
    difficulty: 2,
    resource: "stone",
    format: CHOICE,
    params(rng) {
      const ranges = shuffled(rng, [2, 4, 6, 8, 10, 12]).slice(0, 3);
      const p: Record<string, number> = {};
      ranges.forEach((r, i) => {
        const lo = int(rng, 5, 20);
        shuffled(rng, [lo, lo + int(rng, 0, r), lo + int(rng, 0, r), lo + r]).forEach((v, j) => (p[`g${i}${j}`] = v));
      });
      return p;
    },
    prompt: (p, zone) => {
      const grp = (i: number) => list([0, 1, 2, 3].map((j) => p[`g${i}${j}`]));
      return `Three crews log ${Z[zone].food} caught on 4 days. Crew A: ${grp(0)}. Crew B: ${grp(1)}. Crew C: ${grp(2)}. Which crew's catches are the most consistent (smallest range)?`;
    },
    options: () => ["Crew A", "Crew B", "Crew C"],
    expected: (p) => {
      const r = [0, 1, 2].map((i) => rangeOf(p, i));
      return ["Crew A", "Crew B", "Crew C"][r.indexOf(Math.min(...r))];
    },
    solution: (p) => {
      const r = [0, 1, 2].map((i) => rangeOf(p, i));
      return `The range is largest minus smallest. Crew A: ${r[0]}. Crew B: ${r[1]}. Crew C: ${r[2]}. The smallest range is the most consistent: ${["Crew A", "Crew B", "Crew C"][r.indexOf(Math.min(...r))]}.`;
    },
  },
  {
    id: "u06-sample-01",
    unit: 6,
    difficulty: 2,
    resource: "food",
    format: CHOICE,
    params: (rng) => ({ k: int(rng, 0, 1), total: int(rng, 60, 200), s: int(rng, 8, 20) }),
    prompt: ({ k, total, s }, zone) =>
      k === 0
        ? `${Z[zone].Place}, you want to know which food all ${total} islanders like best, but you can only ask ${s} people. Which method gives the fairest sample?`
        : `${Z[zone].Place}, you want to know if all ${total} islanders want more time fishing, and you can ask ${s} people. Which method would give a biased sample?`,
    options: ({ k, s }) =>
      k === 0
        ? [`Names drawn at random from a list`, `The ${s} people sitting nearest you`, `${s} of your friends`, `Whoever volunteers first`]
        : [`${s} people met at the fishing spot`, `${s} names drawn from a hat`, `Random numbers used on the full list`, `Every 10th name on the full name list`],
    expected: ({ k, s }) => (k === 0 ? `Names drawn at random from a list` : `${s} people met at the fishing spot`),
    solution: ({ k, s, total }) =>
      k === 0
        ? `A fair sample gives every one of the ${total} islanders an equal chance of being chosen. Drawing names at random from a list of everyone does this; the other methods favour certain people. So the best choice is: Names drawn at random from a list.`
        : `People at the fishing spot are likely to enjoy fishing, so the ${s} answers would lean one way and not match all ${total} islanders. That is a biased sample: ${s} people met at the fishing spot. The other methods give everyone an equal chance.`,
  },
  {
    id: "u06-every-nth-01",
    unit: 6,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params: (rng) => ({ n: int(rng, 3, 12), s: int(rng, 5, 12) }),
    prompt: ({ n, s }, zone) =>
      `${Z[zone].Place}, a numbered list holds ${n * s} islander names. You pick evenly spaced names, every nth name, to get a sample of ${s} names. What is n?`,
    expected: ({ n }) => n,
    solution: ({ n, s }) =>
      `${s} names must be spread evenly over ${n * s} names, so you take one name from every ${n * s} ÷ ${s} = ${n} names. So n = ${n}.`,
  },
  {
    id: "u06-two-way-01",
    unit: 6,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params(rng) {
      const kids = int(rng, 8, 20);
      return { adults: int(rng, 10, 30), kids, x: int(rng, 3, 9), y: int(rng, 2, kids - 2) };
    },
    prompt: ({ adults, kids, x, y }, zone) =>
      `${Z[zone].Place}, ${adults + kids} islanders vote on a raft design. ${adults} of them are adults. ${x} adults and ${y} children vote for the round raft. ` +
      `How many children do not vote for the round raft?`,
    expected: ({ kids, y }) => kids - y,
    solution: ({ adults, kids, x, y }) =>
      `Children = ${adults + kids} ${M} ${adults} = ${kids}. ${y} of them voted for the round raft, so ${kids} ${M} ${y} = ${kids - y} did not. (The ${x} adults are not needed.)`,
  },
  {
    id: "u06-stem-leaf-01",
    unit: 6,
    difficulty: 2,
    resource: "stone",
    format: INT,
    params(rng) {
      const leaves = (k: number) => sorted(shuffled(rng, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, k));
      const [a1, a2, a3] = leaves(3);
      const [b1, b2, b3] = leaves(3);
      const [c1, c2] = leaves(2);
      return { a1, a2, a3, b1, b2, b3, c1, c2 };
    },
    prompt: ({ a1, a2, a3, b1, b2, b3, c1, c2 }, zone) =>
      `Minutes taken to gather ${Z[zone].stone} are shown in a stem and leaf diagram. Key: 1 | 4 means 14 minutes. ` +
      `Stem 1: ${a1} ${a2} ${a3}. Stem 2: ${b1} ${b2} ${b3}. Stem 3: ${c1} ${c2}. What is the range?`,
    expected: ({ a1, c2 }) => 30 + c2 - (10 + a1),
    solution: ({ a1, c2 }) =>
      `The smallest value is in stem 1 with the smallest leaf: ${10 + a1}. The largest is in stem 3 with the biggest leaf: ${30 + c2}. ` +
      `Range = ${30 + c2} ${M} ${10 + a1} = ${30 + c2 - (10 + a1)}.`,
  },
  {
    id: "u06-pie-compare-01",
    unit: 6,
    difficulty: 2,
    resource: "food",
    format: INT,
    params(rng) {
      const n = pick(rng, PIE_N.filter((v) => v >= 20));
      const fb = int(rng, 2, Math.floor(n / 5));
      return { n, fb, fa: fb + int(rng, 2, Math.floor(n / 5)) };
    },
    prompt: ({ n, fa, fb }, zone) =>
      `${Z[zone].Place}, a pie chart shows the favourite jobs of ${n} castaways. The fishing sector is ${(360 / n) * fa}° and the building sector is ${(360 / n) * fb}°. ` +
      `How many more castaways chose fishing than building?`,
    expected: ({ fa, fb }) => fa - fb,
    solution: ({ n, fa, fb }) =>
      `One castaway is 360 ÷ ${n} = ${360 / n}°. Fishing: ${(360 / n) * fa} ÷ ${360 / n} = ${fa}. Building: ${(360 / n) * fb} ÷ ${360 / n} = ${fb}. ` +
      `The difference is ${fa} ${M} ${fb} = ${fa - fb}.`,
  },

  // ---------------- Difficulty 3 ----------------
  {
    id: "u06-mean-add-01",
    unit: 6,
    difficulty: 3,
    resource: "food",
    format: INT,
    params: (rng) => ({ n: int(rng, 4, 6), m: int(rng, 10, 20), d: int(rng, 1, 4) }),
    prompt: ({ n, m, d }, zone) =>
      `The mean number of ${Z[zone].food} you catch per day over ${n} days is ${m}. After one more day the mean rises to ${m + d}. ` +
      `How many did you catch on that last day?`,
    expected: ({ n, m, d }) => (n + 1) * (m + d) - n * m,
    solution: ({ n, m, d }) =>
      `The first ${n} days total ${n} × ${m} = ${n * m}. After ${n + 1} days the total is ${n + 1} × ${m + d} = ${(n + 1) * (m + d)}. ` +
      `The last day is the difference: ${(n + 1) * (m + d)} ${M} ${n * m} = ${(n + 1) * (m + d) - n * m}.`,
  },
  {
    id: "u06-combined-mean-01",
    unit: 6,
    difficulty: 3,
    resource: "water",
    format: INT,
    params(rng) {
      for (let i = 0; i < 200; i++) {
        const n1 = int(rng, 2, 8);
        const n2 = int(rng, 2, 8);
        const m1 = int(rng, 8, 25);
        const m2 = int(rng, 8, 25);
        if (n1 !== n2 && m1 !== m2 && (n1 * m1 + n2 * m2) % (n1 + n2) === 0) return { n1, n2, m1, m2 };
      }
      return { n1: 2, n2: 4, m1: 10, m2: 16 };
    },
    prompt: ({ n1, n2, m1, m2 }, zone) =>
      `${n1} barrels of ${Z[zone].water} hold a mean of ${m1} litres each. ${n2} other barrels hold a mean of ${m2} litres each. ` +
      `What is the mean volume for all ${n1 + n2} barrels together?`,
    expected: ({ n1, n2, m1, m2 }) => (n1 * m1 + n2 * m2) / (n1 + n2),
    solution: ({ n1, n2, m1, m2 }) =>
      `Totals: ${n1} × ${m1} = ${n1 * m1} and ${n2} × ${m2} = ${n2 * m2}, giving ${n1 * m1 + n2 * m2} litres in ${n1 + n2} barrels. ` +
      `Mean = ${n1 * m1 + n2 * m2} ÷ ${n1 + n2} = ${(n1 * m1 + n2 * m2) / (n1 + n2)}.`,
  },
  {
    id: "u06-median-freq-01",
    unit: 6,
    difficulty: 3,
    resource: "wood",
    format: INT,
    params(rng) {
      for (let i = 0; i < 200; i++) {
        const f = [0, 1, 2, 3, 4].map(() => int(rng, 1, 7));
        if (sum(f) % 2 === 1) return { f1: f[0], f2: f[1], f3: f[2], f4: f[3], f5: f[4] };
      }
      return { f1: 3, f2: 4, f3: 5, f4: 2, f5: 1 };
    },
    prompt: ({ f1, f2, f3, f4, f5 }, zone) =>
      `Huts ${Z[zone].place} have 1 to 5 ${Z[zone].wood} as beams. The frequencies for 1, 2, 3, 4 and 5 beams are ${f1}, ${f2}, ${f3}, ${f4} and ${f5}. ` +
      `What is the median number of beams?`,
    expected: ({ f1, f2, f3, f4, f5 }) => medianOfTable([f1, f2, f3, f4, f5]),
    solution: ({ f1, f2, f3, f4, f5 }) => {
      const fs = [f1, f2, f3, f4, f5];
      const n = sum(fs);
      return `There are ${n} huts, so the median is the ${(n + 1) / 2}th value. Running totals: ${fs.map((_, i) => sum(fs.slice(0, i + 1))).join(", ")}. ` +
        `The ${(n + 1) / 2}th hut falls in the group for ${medianOfTable(fs)} beams, so the median is ${medianOfTable(fs)}.`;
    },
  },
  {
    id: "u06-best-average-01",
    unit: 6,
    difficulty: 3,
    resource: "stone",
    format: CHOICE,
    params(rng) {
      const lo = int(rng, 3, 8);
      const calm = [lo, lo + 1, lo + 2, lo + 4, lo + 5];
      const big = int(rng, 50, 80);
      return {
        k: int(rng, 0, 2),
        ...pack("w", shuffled(rng, [...calm, big])),
        ...pack("n", shuffled(rng, calm)),
        r: int(rng, 5, 9), s: int(rng, 3, 6), t: int(rng, 2, 6), days: int(rng, 20, 40),
      };
    },
    prompt: (p, zone) =>
      [
        `${Z[zone].Place}, the ${Z[zone].food} you catch in six days are ${list(unpack(p, "w", 6))}. Which average best describes a typical day?`,
        `${Z[zone].Place}, a vote on sail colour gives red ${p.r + p.t}, blue ${p.r} and green ${p.s}. Which average tells you the most popular colour?`,
        `${Z[zone].Place}, the ${Z[zone].food} caught on five days are ${list(unpack(p, "n", 5))}. You want to estimate the total for ${p.days} days. Which average helps most?`,
      ][p.k],
    options: () => AVERAGES,
    expected: ({ k }) => AVERAGES[[1, 2, 0][k]],
    solution: ({ k }) =>
      [
        "One day (the very large value) pulls the mean up, so the mean is not typical, and no value repeats so there is no mode. The median is the middle value and ignores extremes. The answer is: The median.",
        "The most popular choice is the value that occurs most often, which is the mode. The answer is: The mode.",
        "There are no extreme values, and total = mean × number of days, so the mean is the right tool. The answer is: The mean.",
      ][k],
  },
  {
    id: "u06-five-numbers-01",
    unit: 6,
    difficulty: 3,
    resource: "water",
    format: INT,
    params(rng) {
      for (let i = 0; i < 300; i++) {
        const a = int(rng, 2, 8);
        const s = a + int(rng, 0, 4);
        const m = s + int(rng, 1, 4);
        const f = m + int(rng, 1, 5);
        const L = f + int(rng, 1, 8);
        if ((a + s + m + f + L) % 5 === 0) return { a, s, m, f, L, mean: (a + s + m + f + L) / 5, r: L - a };
      }
      return { a: 2, s: 3, m: 5, f: 8, L: 12, mean: 6, r: 10 };
    },
    prompt: ({ a, s, m, mean, r }, zone) =>
      `Five whole numbers, written in order from smallest, show the litres of ${Z[zone].water} in five jars. They have mean ${mean}, median ${m} and range ${r}. ` +
      `The smallest is ${a} and the second smallest is ${s}. What is the fourth number?`,
    expected: ({ f }) => f,
    solution: ({ a, s, m, f, L, mean, r }) =>
      `The largest is the smallest plus the range: ${a} + ${r} = ${L}. The total is 5 × ${mean} = ${5 * mean}. ` +
      `The median is the middle (third) number, ${m}. So the fourth is ${5 * mean} ${M} ${a} ${M} ${s} ${M} ${m} ${M} ${L} = ${f}.`,
  },
  {
    id: "u06-sample-estimate-01",
    unit: 6,
    difficulty: 3,
    resource: "wood",
    format: INT,
    params(rng) {
      const s = pick(rng, [10, 12, 15, 20, 25]);
      return { s, x: int(rng, Math.ceil(s * 0.2), Math.floor(s * 0.8)), m: int(rng, 3, 9) };
    },
    prompt: ({ s, x, m }, zone) =>
      `${Z[zone].Place}, you ask a random sample of ${s} islanders, and ${x} say they prefer ${Z[zone].food}. ` +
      `There are ${s * m} islanders in total. Estimate how many of them prefer ${Z[zone].food}.`,
    expected: ({ x, m }) => x * m,
    solution: ({ s, x, m }) =>
      `The sample is ${s} out of ${s * m}, so the whole island is ${m} times bigger than the sample. If the sample is fair, about ${m} times as many prefer it: ${x} × ${m} = ${x * m}.`,
  },
];

function rangeOf(p: Record<string, number>, i: number): number {
  const row = [0, 1, 2, 3].map((j) => p[`g${i}${j}`]);
  return Math.max(...row) - Math.min(...row);
}
