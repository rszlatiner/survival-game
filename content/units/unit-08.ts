/**
 * Unit 8 bank: fractions.
 * Original templates written for this game. Difficulty 1 = fraction of an
 * amount, equivalent fractions, simplifying, fraction to decimal, adding with
 * a common denominator; 2 = adding, subtracting and multiplying fractions,
 * mixed numbers, dividing by a fraction, ordering, decimals to fractions;
 * 3 = finding the whole, repeated fractions of a remainder, mixed-number sums,
 * quotients, fractions between fractions and comparing parts of amounts.
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
/** Neighbouring fractions: the fraction made by adding tops and bottoms lies strictly between them. */
const BETWEEN: [number, number, number, number][] = [
  [1, 3, 1, 2], [1, 4, 1, 3], [1, 5, 1, 4], [2, 5, 1, 2], [1, 2, 2, 3],
  [2, 3, 3, 4], [3, 4, 4, 5], [1, 3, 2, 5], [3, 5, 2, 3], [2, 5, 3, 7],
];

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
      return { n: int(rng, 1, d - 1), d, k: int(rng, 2, 9) };
    },
    prompt: ({ n, d, k }, zone) =>
      `${Z[zone].Place}, you catch ${d * k} ${Z[zone].food} and keep ${n}/${d} of them. How many do you keep?`,
    expected: ({ n, k }) => n * k,
    solution: ({ n, d, k }) =>
      `Split ${d * k} into ${d} equal parts: ${d * k} ÷ ${d} = ${k} in each part. Then take ${n} parts: ${n} ${T} ${k} = ${n * k}.`,
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
      return { a, b, g: int(rng, 2, 6) };
    },
    prompt: ({ a, b, g }, zone) =>
      `${g * b} ${Z[zone].stone} are in a pile, and ${g * a} of them are flat. Write ${g * a}/${g * b} in its simplest form.`,
    options: ({ a, b, g }) => [`${a}/${b}`, `${g * a}/${g * b}`, `${b}/${a}`, `${a}/${g * b}`],
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
      return { n: int(rng, 1, d - 1), d };
    },
    prompt: ({ n, d }, zone) =>
      `${Z[zone].Place}, a building plan uses ${n}/${d} of a tonne of material. Write ${n}/${d} as a decimal. Type the number only.`,
    expected: ({ n, d }) => Math.round((n * 100) / d) / 100,
    solution: ({ n, d }) =>
      `A fraction is a division: ${n} ÷ ${d} = ${Math.round((n * 100) / d) / 100}.`,
  },
  {
    id: "u08-add-like-01",
    unit: 8,
    difficulty: 1,
    resource: "food",
    format: CHOICE,
    params(rng) {
      const d = int(rng, 5, 12);
      const a = int(rng, 1, d - 2);
      return { a, b: int(rng, 1, d - a - 1), d };
    },
    prompt: ({ a, b, d }, zone) =>
      `${Z[zone].Place}, you eat ${a}/${d} of your ${Z[zone].food} in the morning and ${b}/${d} in the evening. What fraction have you eaten in total? ${SIMPLEST}`,
    options: ({ a, b, d }) =>
      withDistractors(fmt(a + b, d), [`${a + b}/${2 * d}`, `${a + b}/${d}`, `${a + b + 1}/${d}`, `${a * b}/${d}`, `${a + b - 1}/${d}`]),
    expected: ({ a, b, d }) => fmt(a + b, d),
    solution: ({ a, b, d }) =>
      `The denominators are the same, so add the tops and keep the bottom: ${a}/${d} + ${b}/${d} = ${a + b}/${d}. In simplest form that is ${fmt(a + b, d)}.`,
  },
  {
    id: "u08-remaining-01",
    unit: 8,
    difficulty: 1,
    resource: "water",
    format: INT,
    params(rng) {
      const b = int(rng, 3, 8);
      return { a: int(rng, 1, b - 1), b, k: int(rng, 2, 9) };
    },
    prompt: ({ a, b, k }, zone) =>
      `You drink ${a}/${b} of a ${b * k}-litre barrel of ${Z[zone].water}. How many litres are left?`,
    expected: ({ a, b, k }) => (b - a) * k,
    solution: ({ a, b, k }) =>
      `Split ${b * k} into ${b} equal parts: ${b * k} ÷ ${b} = ${k} per part. You drank ${a} parts, so ${b - a} parts are left: ${b - a} ${T} ${k} = ${(b - a) * k}.`,
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
      return { a: int(rng, 1, b - 1), b, c: int(rng, 1, d - 1), d };
    },
    prompt: ({ a, b, c, d }, zone) =>
      `A wall ${Z[zone].place} is ${a}/${b} built on Monday and a further ${c}/${d} of the wall is built on Tuesday. What fraction is built altogether? ${SIMPLEST}`,
    options: ({ a, b, c, d }) =>
      withDistractors(fmt(a * d + b * c, b * d), [`${a + c}/${b + d}`, `${a + c}/${b * d}`, fmt(a * d + b * c + 1, b * d), fmt(a * c, b * d), `${a * d + c}/${b * d}`]),
    expected: ({ a, b, c, d }) => fmt(a * d + b * c, b * d),
    solution: ({ a, b, c, d }) =>
      `Use a common denominator, ${b * d}: ${a}/${b} = ${a * d}/${b * d} and ${c}/${d} = ${b * c}/${b * d}. ` +
      `Add: ${a * d} + ${b * c} = ${a * d + b * c}, so the total is ${a * d + b * c}/${b * d} = ${fmt(a * d + b * c, b * d)}.`,
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
        const a = int(rng, 1, b - 1);
        const c = int(rng, 1, d - 1);
        if (a * d > b * c + 1) return { a, b, c, d };
      }
      return { a: 3, b: 4, c: 1, d: 3 };
    },
    prompt: ({ a, b, c, d }, zone) =>
      `A tank of ${Z[zone].water} is ${a}/${b} full. You use ${c}/${d} of a tank. What fraction of a tank is left? ${SIMPLEST}`,
    options: ({ a, b, c, d }) =>
      withDistractors(fmt(a * d - b * c, b * d), [`${a * d - c}/${b * d}`, `${a * d - b * c + 1}/${b * d}`, `${a * d - b * c}/${b + d}`, fmt(a * d + b * c, b * d)]),
    expected: ({ a, b, c, d }) => fmt(a * d - b * c, b * d),
    solution: ({ a, b, c, d }) =>
      `Use a common denominator, ${b * d}: ${a}/${b} = ${a * d}/${b * d} and ${c}/${d} = ${b * c}/${b * d}. ` +
      `Subtract: ${a * d} ${M} ${b * c} = ${a * d - b * c}, so ${a * d - b * c}/${b * d} = ${fmt(a * d - b * c, b * d)}.`,
  },
  {
    id: "u08-improper-01",
    unit: 8,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params(rng) {
      const d = int(rng, 2, 9);
      return { w: int(rng, 1, 5), n: int(rng, 1, d - 1), d };
    },
    prompt: ({ w, n, d }, zone) =>
      `A raft ${Z[zone].place} is ${w} ${n}/${d} lengths of ${Z[zone].rope} long. Written as an improper fraction it is ?/${d}. What is the top number?`,
    expected: ({ w, n, d }) => w * d + n,
    solution: ({ w, n, d }) =>
      `${w} whole ones are ${w} ${T} ${d} = ${w * d} parts of size 1/${d}. Add the ${n} extra parts: ${w * d} + ${n} = ${w * d + n}. So ${w} ${n}/${d} = ${w * d + n}/${d}.`,
  },
  {
    id: "u08-remaining-02",
    unit: 8,
    difficulty: 2,
    resource: "food",
    format: INT,
    params(rng) {
      const b = int(rng, 3, 8);
      const a = int(rng, 1, b - 2);
      const c = int(rng, 1, b - a - 1);
      return { a, b, c, k: int(rng, 2, 8) };
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
      return { a: int(rng, 1, b - 1), b, c: int(rng, 1, d - 1), d };
    },
    prompt: ({ a, b, c, d }, zone) =>
      `${c}/${d} of a plot ${Z[zone].place} is cleared for ${Z[zone].stone}, and ${a}/${b} of that cleared part holds large ones. What fraction of the whole plot holds large ${Z[zone].stone}? ${SIMPLEST}`,
    options: ({ a, b, c, d }) =>
      withDistractors(fmt(a * c, b * d), [`${a * c}/${b + d}`, `${a + c}/${b * d}`, fmt(a * d, b * c), `${a * c}/${b * d + 1}`]),
    expected: ({ a, b, c, d }) => fmt(a * c, b * d),
    solution: ({ a, b, c, d }) =>
      `"Of" means multiply: ${a}/${b} ${T} ${c}/${d}. Multiply the tops (${a} ${T} ${c} = ${a * c}) and the bottoms (${b} ${T} ${d} = ${b * d}), giving ${a * c}/${b * d} = ${fmt(a * c, b * d)}.`,
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
        const top = Math.max(...vals);
        if (new Set(vals.map((v) => Math.round(v * 1e6))).size !== 4) continue;
        if (vals.filter((v) => Math.abs(v - top) < 1e-9).length !== 1) continue;
        // Half the time insist the longest piece does not have the biggest top number, so the top number is no clue.
        const win = fr[vals.indexOf(top)][0];
        if (rng() < 0.5 && win >= Math.max(...fr.map((x) => x[0]))) continue;
        return { n1: fr[0][0], d1: fr[0][1], n2: fr[1][0], d2: fr[1][1], n3: fr[2][0], d3: fr[2][1], n4: fr[3][0], d4: fr[3][1] };
      }
      return { n1: 1, d1: 2, n2: 2, d2: 5, n3: 3, d3: 4, n4: 1, d4: 3 };
    },
    prompt: ({ n1, d1, n2, d2, n3, d3, n4, d4 }, zone) =>
      `Four ${Z[zone].wood} are cut to ${n1}/${d1}, ${n2}/${d2}, ${n3}/${d3} and ${n4}/${d4} of a metre. Which fraction shows the longest one?`,
    options: ({ n1, d1, n2, d2, n3, d3, n4, d4 }) => [`${n1}/${d1}`, `${n2}/${d2}`, `${n3}/${d3}`, `${n4}/${d4}`],
    expected: ({ n1, d1, n2, d2, n3, d3, n4, d4 }) => {
      const f = [[n1, d1], [n2, d2], [n3, d3], [n4, d4]];
      const best = f.reduce((m, x) => (x[0] * m[1] > m[0] * x[1] ? x : m));
      return `${best[0]}/${best[1]}`;
    },
    solution: ({ n1, d1, n2, d2, n3, d3, n4, d4 }) => {
      const f = [[n1, d1], [n2, d2], [n3, d3], [n4, d4]];
      const best = f.reduce((m, x) => (x[0] * m[1] > m[0] * x[1] ? x : m));
      return `Compare them as decimals: ${f.map(([n, d]) => `${n}/${d} ≈ ${(n / d).toFixed(2)}`).join(", ")}. The largest is ${best[0]}/${best[1]}.`;
    },
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
        if (gcd(h, 100) > 1) return { h };
      }
      return { h: 35 };
    },
    prompt: ({ h }, zone) =>
      `${Z[zone].Place}, a pot is ${(h / 100).toFixed(2)} full of ${Z[zone].food}. Write ${(h / 100).toFixed(2)} as a fraction in its simplest form.`,
    options: ({ h }) => withDistractors(fmt(h, 100), [`${h}/100`, `1/${h}`, `${h}/10`, `${h}/1000`]),
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
      return { n: int(rng, 2, d - 1), d, k: int(rng, 2, 9) };
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
      return { a: int(rng, 1, b - 2), b, c: int(rng, 1, d - 1), d, k: int(rng, 1, 4) };
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
      for (let i = 0; i < 100; i++) {
        const [b, d] = pick(rng, PAIRS);
        const a = int(rng, 1, b - 1);
        const c = int(rng, 1, d - 1);
        const w1 = int(rng, 1, 4);
        const w2 = int(rng, 1, 4);
        const top = a * d + c * b;
        if (top % (b * d) !== 0 && gcd(top, b * d) < b * d) return { w1, a, b, w2, c, d };
      }
      return { w1: 2, a: 1, b: 2, w2: 1, c: 3, d: 4 };
    },
    prompt: ({ w1, a, b, w2, c, d }, zone) =>
      `${Z[zone].Place}, you carry ${w1} ${a}/${b} kg of ${Z[zone].food} to camp, then ${w2} ${c}/${d} kg more. How many kilograms is that in total? ${SIMPLEST}`,
    options: ({ w1, a, b, w2, c, d }) => {
      const top = a * d + c * b;
      const right = fmt((w1 + w2) * b * d + top, b * d);
      const whole = Math.floor(((w1 + w2) * b * d + top) / (b * d));
      const rest = right.includes(" ") ? right.split(" ")[1] : right;
      return withDistractors(right, [`${w1 + w2} ${a + c}/${b + d}`, `${whole + 1} ${rest}`, `${whole - 1} ${rest}`, `${w1 + w2} ${rest}`]);
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
    params: (rng) => {
      const [a, b, c, d] = pick(rng, BETWEEN);
      return { a, b, c, d };
    },
    prompt: ({ a, b, c, d }, zone) =>
      `A marker ${Z[zone].place} must be placed at a point strictly between ${a}/${b} and ${c}/${d} of the way along a trail. Which fraction is a possible place for the marker?`,
    options: ({ a, b, c, d }) => [`${a + c}/${b + d}`, `${a}/${b + 1}`, `${2 * c + 1}/${2 * d}`, `${2 * c}/${2 * d}`],
    expected: ({ a, b, c, d }) => `${a + c}/${b + d}`,
    solution: ({ a, b, c, d }) =>
      `Turn them into decimals: ${a}/${b} ≈ ${(a / b).toFixed(2)} and ${c}/${d} ≈ ${(c / d).toFixed(2)}. A fraction between them must be bigger than ${(a / b).toFixed(2)} and smaller than ${(c / d).toFixed(2)}. ` +
      `${a + c}/${b + d} ≈ ${((a + c) / (b + d)).toFixed(2)} fits. (${a}/${b + 1} is too small, ${2 * c + 1}/${2 * d} is too big, and ${2 * c}/${2 * d} equals ${c}/${d}.) ` +
      `The answer is ${a + c}/${b + d}.`,
  },
  {
    id: "u08-parts-compare-01",
    unit: 8,
    difficulty: 3,
    resource: "food",
    format: INT,
    params(rng) {
      for (let i = 0; i < 100; i++) {
        const b = int(rng, 3, 8);
        const d = int(rng, 3, 8);
        const a = int(rng, 1, b - 1);
        const c = int(rng, 1, d - 1);
        const k1 = int(rng, 2, 7);
        const k2 = int(rng, 2, 7);
        const x = a * k1;
        const y = c * k2;
        if (x > y) return { a, b, k1, c, d, k2 };
      }
      return { a: 3, b: 4, k1: 6, c: 1, d: 3, k2: 3 };
    },
    prompt: ({ a, b, k1, c, d, k2 }, zone) =>
      `Team A catches ${b * k1} ${Z[zone].food} and Team B catches ${d * k2}. Team A trades ${a}/${b} of its catch and Team B trades ${c}/${d} of its catch. ` +
      `How many more does Team A trade than Team B?`,
    expected: ({ a, k1, c, k2 }) => a * k1 - c * k2,
    solution: ({ a, b, k1, c, d, k2 }) =>
      `Team A: ${a}/${b} of ${b * k1} = ${a} ${T} ${k1} = ${a * k1}. Team B: ${c}/${d} of ${d * k2} = ${c} ${T} ${k2} = ${c * k2}. ` +
      `The difference is ${a * k1} ${M} ${c * k2} = ${a * k1 - c * k2}.`,
  },
];
