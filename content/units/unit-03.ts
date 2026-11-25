/**
 * Unit 3 bank: decimals, percentages and rounding.
 * Original templates written for this game. Difficulty 1 = one-step; 2 = two
 * steps or a rule in context; 3 = multi-step, reverse or checking problems.
 * Percentage answers use the integer format (a whole number, no % sign) because
 * the answer parser compares percent entries as fractions. Money is in shells.
 * Decimal sums are built from whole-number hundredths and divided once, so
 * every answer prints cleanly. Rounding questions state their rule.
 */
import type { QuestionTemplate } from "@/lib/questions/types";
import { int } from "@/lib/questions/random";
import { ZONE_WORDS as Z } from "@/content/units/zones";

const INT = { kind: "integer" } as const;
const D1 = { kind: "decimal", places: 1 } as const;
const D2 = { kind: "decimal", places: 2 } as const;
const CHOICE = { kind: "choice", options: [] as string[] } as const;
const TIMES = "×";
const DIV = "÷";
const PCT_NOTE = "Type the number only, without the % sign.";

/** A decimal built from whole hundredths: 345 -> "3.45". */
const h = (hundredths: number) => String(hundredths / 100);

/** Every way to choose 3 of 5 distractors. */
const TRIPLES: Array<[number, number, number]> = [
  [0, 1, 2], [0, 1, 3], [0, 1, 4], [0, 2, 3], [0, 2, 4], [0, 3, 4], [1, 2, 3], [1, 2, 4], [1, 3, 4], [2, 3, 4],
];

const estPool = (p: Record<string, number>) => {
  const { u, t, w } = p;
  const est = (u + 1) * 10 * t;
  return [est / 10, u * 10 * t, (u + 1) * (10 * t + w), (u + 1) * 10 * (t + 1), est * 10];
};

const BOUND_OK = [-50, -30, -10, 10, 30, 49];
const BOUND_BAD = [-51, -60, -75, 50, 55, 70, 99];

const SHARE_FORMS = 3;
const shareText = (v: number, form: number) =>
  form === 0 ? `${v}%` : form === 1 ? `${v / 100}` : `${v / 5}/20`;

export const UNIT_03: QuestionTemplate[] = [
  // ---------------- Difficulty 1 ----------------
  {
    id: "u03-round-dp-01",
    unit: 3,
    difficulty: 1,
    resource: "water",
    format: { kind: "decimal", places: 2 },
    params: (rng) => ({ n: int(rng, 1101, 9899), m: int(rng, 1, 2) }),
    prompt: ({ n, m }, zone) =>
      `${Z[zone].Place}, a rope of length ${(n / 1000).toFixed(3)} m is cut for ${Z[zone].water} jars. ` +
      `Round the length to ${m} decimal place${m === 1 ? "" : "s"}. Round up if the next digit is 5 or more.`,
    expected: ({ n, m }) => (m === 1 ? Math.floor((n + 50) / 100) / 10 : Math.floor((n + 5) / 10) / 100),
    solution: ({ n, m }) => {
      const r = m === 1 ? Math.floor((n + 50) / 100) / 10 : Math.floor((n + 5) / 10) / 100;
      const digit = Number(String(n)[m + 1]);
      return (
        `Look at the digit after the ${m === 1 ? "first" : "second"} decimal place: it is ${digit}. ` +
        `${digit >= 5 ? "That is 5 or more, so round up" : "That is less than 5, so round down"}. ` +
        `${(n / 1000).toFixed(3)} rounds to ${r.toFixed(m)}.`
      );
    },
  },
  {
    id: "u03-percent-of-01",
    unit: 3,
    difficulty: 1,
    resource: "stone",
    format: INT,
    params: (rng) => ({ p: [10, 20, 25, 30, 40, 50, 60, 75][int(rng, 0, 7)], k: int(rng, 1, 10) }),
    prompt: ({ p, k }, zone) =>
      `${Z[zone].Place}, ${p}% of your ${20 * k} ${Z[zone].stone} are flat enough for building. How many is that?`,
    expected: ({ p, k }) => (p * 20 * k) / 100,
    solution: ({ p, k }) =>
      `${p}% means ${p} out of every 100. ${p}% of ${20 * k} = ${p} ${DIV} 100 ${TIMES} ${20 * k} = ${(p * 20 * k) / 100}.`,
  },
  {
    id: "u03-fraction-percent-01",
    unit: 3,
    difficulty: 1,
    resource: "wood",
    format: INT,
    params(rng) {
      const n = [4, 5, 10, 20, 25, 50][int(rng, 0, 5)];
      return { n, k: int(rng, 1, n - 1) };
    },
    prompt: ({ n, k }, zone) =>
      `${Z[zone].Place}, ${k} of your ${n} ${Z[zone].wood} ${k === 1 ? "is" : "are"} damaged by salt water. What percentage is damaged? ${PCT_NOTE}`,
    expected: ({ n, k }) => (100 * k) / n,
    solution: ({ n, k }) =>
      `Percentage = part ${DIV} whole ${TIMES} 100. ${k} ${DIV} ${n} ${TIMES} 100 = ${(100 * k) / n}, so ${(100 * k) / n}% is damaged.`,
  },
  {
    id: "u03-decimal-mult-01",
    unit: 3,
    difficulty: 1,
    resource: "food",
    format: D2,
    params: (rng) => ({ w: int(rng, 11, 95), n: int(rng, 3, 9) }),
    prompt: ({ w, n }, zone) =>
      `${n} ${Z[zone].food} each weigh ${h(w)} kg. What is their total weight, in kg?`,
    expected: ({ w, n }) => (w * n) / 100,
    solution: ({ w, n }) =>
      `Multiply ${h(w)} by ${n}. Working in hundredths: ${w} ${TIMES} ${n} = ${w * n}, and ${w * n} hundredths is ${(w * n) / 100}. The total is ${(w * n) / 100} kg.`,
  },
  {
    id: "u03-order-decimals-01",
    unit: 3,
    difficulty: 1,
    resource: "water",
    format: CHOICE,
    params(rng) {
      const t: number[] = [];
      while (t.length < 4) {
        const v = int(rng, 5, 990);
        if (!t.includes(v)) t.push(v);
      }
      return { a: t[0], b: t[1], c: t[2], d: t[3], s: int(rng, 0, 1) };
    },
    prompt: ({ s }, zone) =>
      `${Z[zone].Place}, you measure four pots of ${Z[zone].water}. Which pot holds the ${s ? "least" : "most"}?`,
    options: ({ a, b, c, d }) => [a, b, c, d].map((v) => `${v / 1000} L`),
    expected: ({ a, b, c, d, s }) => {
      const t = [a, b, c, d];
      return `${(s ? Math.min(...t) : Math.max(...t)) / 1000} L`;
    },
    solution: ({ a, b, c, d, s }) => {
      const t = [a, b, c, d];
      const best = s ? Math.min(...t) : Math.max(...t);
      return (
        `Write every amount to 3 decimal places: ${t.map((v) => (v / 1000).toFixed(3)).join(", ")}. ` +
        `Compare them as whole numbers of thousandths. The ${s ? "smallest" : "largest"} is ${(best / 1000).toFixed(3)}, which is ${best / 1000} L.`
      );
    },
  },
  {
    id: "u03-convert-km-01",
    unit: 3,
    difficulty: 1,
    resource: "stone",
    format: D2,
    params: (rng) => ({ k: int(rng, 101, 999) }),
    prompt: ({ k }, zone) =>
      `${Z[zone].Place}, the path to ${Z[zone].landmark} is ${10 * k} m long. How many kilometres is that?`,
    expected: ({ k }) => k / 100,
    solution: ({ k }) =>
      `1 km is 1000 m, so divide by 1000. ${10 * k} ${DIV} 1000 = ${k / 100}. The path is ${k / 100} km.`,
  },

  // ---------------- Difficulty 2 ----------------
  {
    id: "u03-percent-increase-01",
    unit: 3,
    difficulty: 2,
    resource: "food",
    format: INT,
    params: (rng) => ({ N: 20 * int(rng, 1, 10), p: [5, 10, 15, 20, 25, 30, 40, 50][int(rng, 0, 7)] }),
    prompt: ({ N, p }, zone) =>
      `${Z[zone].Place}, a trader raises the price of a bundle of ${Z[zone].food} from ${N} shells by ${p}%. What is the new price, in shells?`,
    expected: ({ N, p }) => N + (N * p) / 100,
    solution: ({ N, p }) =>
      `The rise is ${p}% of ${N} = ${(N * p) / 100}. New price: ${N} + ${(N * p) / 100} = ${N + (N * p) / 100} shells.`,
  },
  {
    id: "u03-percent-decrease-01",
    unit: 3,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params: (rng) => ({ N: 20 * int(rng, 2, 10), p: [5, 10, 15, 20, 25, 30, 40, 50][int(rng, 0, 7)] }),
    prompt: ({ N, p }, zone) =>
      `${Z[zone].Place}, a kit of ${Z[zone].wood} costs ${N} shells. A sale takes ${p}% off. What is the sale price, in shells?`,
    expected: ({ N, p }) => N - (N * p) / 100,
    solution: ({ N, p }) =>
      `The discount is ${p}% of ${N} = ${(N * p) / 100}. Sale price: ${N} ${"−"} ${(N * p) / 100} = ${N - (N * p) / 100} shells.`,
  },
  {
    id: "u03-express-percent-01",
    unit: 3,
    difficulty: 2,
    resource: "water",
    format: INT,
    params(rng) {
      const n = [10, 20, 25, 50][int(rng, 0, 3)];
      return { n, r: int(rng, 1, n - 1) };
    },
    prompt: ({ n, r }, zone) =>
      `You stored ${n} litres of ${Z[zone].water}. After a week, ${r} litres are left. What percentage of the water was used? ${PCT_NOTE}`,
    expected: ({ n, r }) => (100 * (n - r)) / n,
    solution: ({ n, r }) =>
      `Used = ${n} ${"−"} ${r} = ${n - r} litres. Percentage used = ${n - r} ${DIV} ${n} ${TIMES} 100 = ${(100 * (n - r)) / n}.`,
  },
  {
    id: "u03-round-sf-01",
    unit: 3,
    difficulty: 2,
    resource: "stone",
    format: INT,
    params(rng) {
      const digits = int(rng, 3, 4);
      const lo = 10 ** (digits - 1);
      return { V: int(rng, lo + 11, 10 ** digits - 11), digits, sf: int(rng, 1, 2) };
    },
    prompt: ({ V, sf }, zone) =>
      `${Z[zone].Place}, a heap holds ${V} ${Z[zone].stone}. Round ${V} to ${sf} significant figure${sf === 1 ? "" : "s"}. Round up if the next digit is 5 or more.`,
    expected: ({ V, digits, sf }) => {
      const pv = 10 ** (digits - sf);
      return Math.floor((V + pv / 2) / pv) * pv;
    },
    solution: ({ V, digits, sf }) => {
      const pv = 10 ** (digits - sf);
      const r = Math.floor((V + pv / 2) / pv) * pv;
      const next = Number(String(V)[sf]);
      return (
        `Keep the first ${sf === 1 ? "digit" : "two digits"}, then look at the next digit, which is ${next}. ` +
        `${next >= 5 ? "It is 5 or more, so round up" : "It is less than 5, so leave the kept digits as they are"}. ` +
        `Fill the remaining places with zeros: ${V} rounds to ${r}.`
      );
    },
  },
  {
    id: "u03-estimate-01",
    unit: 3,
    difficulty: 2,
    resource: "food",
    format: CHOICE,
    params: (rng) => ({ u: int(rng, 2, 8), f: int(rng, 5, 9), t: int(rng, 1, 8), w: int(rng, 1, 4), c: int(rng, 0, 9) }),
    prompt: ({ u, f, t, w }, zone) =>
      `${Z[zone].Place}, you need a quick estimate of ${u}.${f} ${TIMES} ${10 * t + w} for your stock of ${Z[zone].food}. ` +
      `Round each number to 1 significant figure first. What is the estimate?`,
    options: (p) => {
      const pool = estPool(p);
      return [(p.u + 1) * 10 * p.t, ...TRIPLES[p.c].map((i) => pool[i])].map(String);
    },
    expected: ({ u, t }) => String((u + 1) * 10 * t),
    solution: ({ u, f, t, w }) =>
      `${u}.${f} rounds to ${u + 1} (1 significant figure, as the next digit is 5 or more). ${10 * t + w} rounds to ${10 * t}. ` +
      `${u + 1} ${TIMES} ${10 * t} = ${(u + 1) * 10 * t}.`,
  },
  {
    id: "u03-compare-percent-01",
    unit: 3,
    difficulty: 2,
    resource: "wood",
    format: CHOICE,
    params(rng) {
      if (int(rng, 0, 4) === 0) {
        // A tie: both teams have the same percentage.
        for (let i = 0; i < 50; i++) {
          const n = [20, 25, 50][int(rng, 0, 2)];
          const m = [20, 25, 50][int(rng, 0, 2)];
          const a = int(rng, 2, n - 2);
          if (n !== m && (a * m) % n === 0 && (a * m) / n >= 2 && (a * m) / n <= m - 2) return { n, m, a, b: (a * m) / n };
        }
      }
      for (let i = 0; i < 100; i++) {
        const n = [20, 25, 50][int(rng, 0, 2)];
        const m = [20, 25, 50][int(rng, 0, 2)];
        const a = int(rng, 2, n - 2);
        const b = int(rng, 2, m - 2);
        if (a * m !== b * n) return { n, m, a, b };
      }
      return { n: 20, m: 25, a: 9, b: 10 };
    },
    prompt: ({ n, m, a, b }, zone) =>
      `Team A gathered ${a} of ${n} ${Z[zone].wood}. Team B gathered ${b} of ${m}. Which team gathered the larger percentage?`,
    options: () => ["Team A", "Team B", "They are equal"],
    expected: ({ n, m, a, b }) => (a * m === b * n ? "They are equal" : a * m > b * n ? "Team A" : "Team B"),
    solution: ({ n, m, a, b }) => {
      const pa = (100 * a) / n;
      const pb = (100 * b) / m;
      return `Team A: ${a} ${DIV} ${n} ${TIMES} 100 = ${pa}%. Team B: ${b} ${DIV} ${m} ${TIMES} 100 = ${pb}%. ${pa === pb ? "They are equal: the percentages match." : `${pa > pb ? "Team A" : "Team B"} has the larger percentage.`}`;
    },
  },
  {
    id: "u03-decimal-mult-02",
    unit: 3,
    difficulty: 2,
    resource: "water",
    format: D2,
    params(rng) {
      for (let i = 0; i < 100; i++) {
        const A = int(rng, 11, 49);
        const B = int(rng, 12, 48);
        if (A % 10 !== 0 && B % 10 !== 0) return { A, B };
      }
      return { A: 18, B: 41 };
    },
    prompt: ({ A, B }, zone) =>
      `${Z[zone].Place}, a spring gives ${A / 10} litres of ${Z[zone].water} every minute. How many litres does it give in ${B / 10} minutes?`,
    expected: ({ A, B }) => (A * B) / 100,
    solution: ({ A, B }) =>
      `Ignore the decimal points: ${A} ${TIMES} ${B} = ${A * B}. There is 1 decimal place in each number, so 2 in the answer: ${A * B} ${DIV} 100 = ${(A * B) / 100} litres.`,
  },
  {
    id: "u03-divide-decimals-01",
    unit: 3,
    difficulty: 2,
    resource: "food",
    format: INT,
    params: (rng) => ({ c: [20, 25, 40, 50, 60, 75, 80][int(rng, 0, 6)], n: int(rng, 4, 20) }),
    prompt: ({ c, n }, zone) =>
      `You have ${h(c * n)} kg of ${Z[zone].food}. Each portion is ${h(c)} kg. How many full portions can you make?`,
    expected: ({ n }) => n,
    solution: ({ c, n }) =>
      `Divide ${h(c * n)} by ${h(c)}. Multiply both by 100 to remove the decimals: ${c * n} ${DIV} ${c} = ${n}. You can make ${n} portions.`,
  },

  // ---------------- Difficulty 3 ----------------
  {
    id: "u03-reverse-percent-01",
    unit: 3,
    difficulty: 3,
    resource: "stone",
    format: INT,
    params: (rng) => ({ k: int(rng, 2, 9), p: [10, 20, 25, 50][int(rng, 0, 3)], s: int(rng, 0, 1) }),
    prompt: ({ k, p, s }, zone) => {
      const orig = 20 * k;
      const now = s ? orig - (orig * p) / 100 : orig + (orig * p) / 100;
      return s
        ? `In a sale, a bundle of ${Z[zone].stone} was reduced by ${p}% and now costs ${now} shells. What was the price before the sale, in shells?`
        : `After a ${p}% price rise, a bundle of ${Z[zone].stone} costs ${now} shells. What was the price before the rise, in shells?`;
    },
    expected: ({ k }) => 20 * k,
    solution: ({ k, p, s }) => {
      const orig = 20 * k;
      const now = s ? orig - (orig * p) / 100 : orig + (orig * p) / 100;
      const pct = s ? 100 - p : 100 + p;
      return (
        `The new price is ${pct}% of the original price. So ${pct}% = ${now}, and 1% = ${now} ${DIV} ${pct} = ${orig / 100}. ` +
        `The original is 100% = ${orig / 100} ${TIMES} 100 = ${orig} shells.`
      );
    },
  },
  {
    id: "u03-successive-percent-01",
    unit: 3,
    difficulty: 3,
    resource: "food",
    format: INT,
    params: (rng) => ({ k: int(rng, 1, 5), p: [10, 20, 30, 50][int(rng, 0, 3)], q: [10, 20, 30, 50][int(rng, 0, 3)] }),
    prompt: ({ k, p, q }, zone) =>
      `A bundle of ${Z[zone].food} costs ${100 * k} shells. The price rises by ${p}%, then a week later falls by ${q}% of the new price. What is the final price, in shells?`,
    expected: ({ k, p, q }) => (k * (100 + p) * (100 - q)) / 100,
    solution: ({ k, p, q }) => {
      const mid = (100 * k * (100 + p)) / 100;
      return (
        `After the rise: ${100 * k} ${TIMES} ${(100 + p) / 100} = ${mid}. ` +
        `The fall is ${q}% of ${mid}, which is ${(mid * q) / 100}. Final price: ${mid} ${"−"} ${(mid * q) / 100} = ${mid - (mid * q) / 100} shells.`
      );
    },
  },
  {
    id: "u03-round-boundary-01",
    unit: 3,
    difficulty: 3,
    resource: "wood",
    format: CHOICE,
    params(rng) {
      const bad: number[] = [];
      while (bad.length < 3) {
        const o = BOUND_BAD[int(rng, 0, BOUND_BAD.length - 1)];
        if (!bad.includes(o)) bad.push(o);
      }
      return { t: int(rng, 11, 89), ok: int(rng, 0, BOUND_OK.length - 1), b1: bad[0], b2: bad[1], b3: bad[2] };
    },
    prompt: ({ t }, zone) =>
      `${Z[zone].Place}, a length of ${Z[zone].rope} is recorded as ${(t / 10).toFixed(1)} m after rounding to 1 decimal place. ` +
      `Which of these could be its true length? Round up if the next digit is 5 or more.`,
    options: ({ t, ok, b1, b2, b3 }) =>
      [BOUND_OK[ok], b1, b2, b3].map((o) => `${((t * 100 + o) / 1000).toFixed(3)} m`),
    expected: ({ t, ok }) => `${((t * 100 + BOUND_OK[ok]) / 1000).toFixed(3)} m`,
    solution: ({ t, ok }) => {
      const v = (t * 100 + BOUND_OK[ok]) / 1000;
      return (
        `A length rounds to ${(t / 10).toFixed(1)} to 1 decimal place if it is at least ${((t * 100 - 50) / 1000).toFixed(3)} and below ${((t * 100 + 50) / 1000).toFixed(3)}. ` +
        `Only ${v.toFixed(3)} m is in that range.`
      );
    },
  },
  {
    id: "u03-mixed-order-01",
    unit: 3,
    difficulty: 3,
    resource: "stone",
    format: CHOICE,
    params(rng) {
      const vals: number[] = [];
      while (vals.length < 4) {
        const v = 5 * int(rng, 2, 19);
        if (!vals.includes(v)) vals.push(v);
      }
      return {
        a: vals[0], b: vals[1], c: vals[2], d: vals[3],
        fa: int(rng, 0, SHARE_FORMS - 1), fb: int(rng, 0, SHARE_FORMS - 1), fc: int(rng, 0, SHARE_FORMS - 1), fd: int(rng, 0, SHARE_FORMS - 1),
      };
    },
    prompt: (_p, zone) =>
      `${Z[zone].Place}, four crews each moved a share of their own separate pile of ${Z[zone].stone}. Which share is the greatest?`,
    options: ({ a, b, c, d, fa, fb, fc, fd }) => [shareText(a, fa), shareText(b, fb), shareText(c, fc), shareText(d, fd)],
    expected: ({ a, b, c, d, fa, fb, fc, fd }) => {
      const all = [[a, fa], [b, fb], [c, fc], [d, fd]];
      const best = all.reduce((m, x) => (x[0] > m[0] ? x : m));
      return shareText(best[0], best[1]);
    },
    solution: ({ a, b, c, d, fa, fb, fc, fd }) => {
      const all = [[a, fa], [b, fb], [c, fc], [d, fd]];
      const best = all.reduce((m, x) => (x[0] > m[0] ? x : m));
      return (
        `Change every share to a percentage: ${all.map(([v, f]) => (f === 0 ? `${v}%` : `${shareText(v, f)} = ${v}%`)).join(", ")}. ` +
        `The greatest is ${best[0]}%${best[1] === 0 ? "" : `, which is ${shareText(best[0], best[1])}`}.`
      );
    },
  },
  {
    id: "u03-percent-change-01",
    unit: 3,
    difficulty: 3,
    resource: "water",
    format: INT,
    params: (rng) => ({ N: 20 * int(rng, 1, 10), p: [5, 10, 15, 20, 25, 30, 40, 50][int(rng, 0, 7)], s: int(rng, 0, 1) }),
    prompt: ({ N, p, s }, zone) => {
      const M = s ? N - (N * p) / 100 : N + (N * p) / 100;
      return (
        `The price of a barrel of ${Z[zone].water} changed from ${N} shells to ${M} shells. ` +
        `What is the percentage ${s ? "decrease" : "increase"}? ${PCT_NOTE}`
      );
    },
    expected: ({ p }) => p,
    solution: ({ N, p, s }) => {
      const ch = (N * p) / 100;
      return (
        `The change is ${ch} shells. Percentage change = change ${DIV} original price ${TIMES} 100 = ${ch} ${DIV} ${N} ${TIMES} 100 = ${p}. ` +
        `So it is a ${p}% ${s ? "decrease" : "increase"}.`
      );
    },
  },
  {
    id: "u03-best-buy-01",
    unit: 3,
    difficulty: 3,
    resource: "wood",
    format: D2,
    params(rng) {
      const u1 = int(rng, 50, 150);
      const d = 5 * int(rng, 1, 4);
      return { n1: [4, 5, 6, 8, 10][int(rng, 0, 4)], n2: [4, 5, 6, 8, 10][int(rng, 0, 4)], u1, u2: int(rng, 0, 1) ? u1 + d : u1 - d };
    },
    prompt: ({ n1, n2, u1, u2 }, zone) =>
      `Pack A has ${n1} ${Z[zone].wood} for ${h(n1 * u1)} shells. Pack B has ${n2} for ${h(n2 * u2)} shells. ` +
      `How many shells less per piece does the cheaper pack cost?`,
    expected: ({ u1, u2 }) => Math.abs(u1 - u2) / 100,
    solution: ({ n1, n2, u1, u2 }) =>
      `Price per piece, A: ${h(n1 * u1)} ${DIV} ${n1} = ${h(u1)}. B: ${h(n2 * u2)} ${DIV} ${n2} = ${h(u2)}. ` +
      `The difference is ${h(Math.max(u1, u2))} ${"−"} ${h(Math.min(u1, u2))} = ${Math.abs(u1 - u2) / 100} shells per piece.`,
  },
];
