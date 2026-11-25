/**
 * Unit 2 bank: expressions and formulae.
 * Original templates written for this game. Difficulty 1 = one-step
 * substitution or a single rule; 2 = two-step simplifying, factorising or
 * formulae; 3 = multi-step, reverse or checking problems.
 * Answers that are expressions use the choice format; formula answers are
 * positive whole numbers.
 */
import type { QuestionTemplate } from "@/lib/questions/types";
import { coprimePair, int } from "@/lib/questions/random";
import { ZONE_WORDS as Z } from "@/content/units/zones";

const INT = { kind: "integer" } as const;
const CHOICE = { kind: "choice", options: [] as string[] } as const;
const MINUS = "−";
const TIMES = "×";
const co = (n: number) => (n === 1 ? "" : `${n}`);
/** "ax + k" or "ax − |k|" for any whole k. */
const lin = (a: number, k: number) => `${co(a)}x ${k < 0 ? MINUS : "+"} ${Math.abs(k)}`;
const sg = (n: number) => (n < 0 ? `${MINUS}${-n}` : `${n}`);

function pickIdx(rng: () => number, pool: number[], correct: number, n: number): number[] {
  for (let tries = 0; tries < 300; tries++) {
    const idx: number[] = [];
    while (idx.length < n) {
      const i = int(rng, 0, pool.length - 1);
      if (!idx.includes(i)) idx.push(i);
    }
    const vals = idx.map((i) => pool[i]);
    if (!vals.includes(correct) && new Set(vals).size === n) return idx;
  }
  throw new Error("pickIdx: pool too small");
}

const smallestPrime = (n: number) => {
  for (let i = 2; i <= n; i++) if (n % i === 0) return i;
  return n;
};
const negPool = (p: Record<string, number>) => {
  const { p: pp, k, q, m } = p;
  return [-(pp * k * k) - q * m, pp * pp * k * k - q * m, pp * k * k + q * m, 2 * pp * k - q * m, -(pp * k * k - q * m), pp * k * k - q * m + 2 * q];
};

export const UNIT_02: QuestionTemplate[] = [
  // ---------------- Difficulty 1 ----------------
  {
    id: "u02-substitute-01",
    unit: 2,
    difficulty: 1,
    resource: "water",
    format: INT,
    params: (rng) => ({ a: int(rng, 2, 6), b: int(rng, 1, 9), d: int(rng, 2, 8) }),
    prompt: ({ a, b, d }, zone) =>
      `${Z[zone].Place}, the litres of ${Z[zone].water} you need for a trip are L = ${a}d + ${b}, where d is the number of days. ` +
      `Find L when d = ${d}.`,
    expected: ({ a, b, d }) => a * d + b,
    solution: ({ a, b, d }) =>
      `Replace d with ${d}: L = ${a} ${TIMES} ${d} + ${b} = ${a * d} + ${b} = ${a * d + b}.`,
  },
  {
    id: "u02-collect-01",
    unit: 2,
    difficulty: 1,
    resource: "food",
    format: CHOICE,
    params(rng) {
      for (let i = 0; i < 50; i++) {
        const a = int(rng, 2, 6);
        const c = int(rng, 2, 6);
        if (a + c !== a * c) return { a, b: int(rng, 2, 9), c };
      }
      return { a: 3, b: 4, c: 2 };
    },
    prompt: ({ a, b, c }, zone) =>
      `${Z[zone].Place}, your tally of ${Z[zone].food} is ${a}x + ${b} + ${c}x, where x is the number in one basket. ` +
      `Which is its simplest form?`,
    options: ({ a, b, c }) => [`${a + c}x + ${b}`, `${a + b + c}x`, `${a * c}x + ${b}`, `${a + c}x² + ${b}`],
    expected: ({ a, b, c }) => `${a + c}x + ${b}`,
    solution: ({ a, b, c }) =>
      `Only terms with x can be added together. ${a}x + ${c}x = ${a + c}x. The number ${b} is a different kind of term and stays as it is. ` +
      `So the answer is ${a + c}x + ${b}.`,
  },
  {
    id: "u02-write-expression-01",
    unit: 2,
    difficulty: 1,
    resource: "wood",
    format: CHOICE,
    params: (rng) => ({ p: int(rng, 30, 60), k: int(rng, 2, 6) }),
    prompt: ({ p, k }, zone) =>
      `${Z[zone].Place}, you have ${p} ${Z[zone].wood}. Each raft you build uses ${k}. ` +
      `Which expression gives the number left after building r rafts?`,
    options: ({ p, k }) => [`${p} ${MINUS} ${k}r`, `${k}r ${MINUS} ${p}`, `${p}r ${MINUS} ${k}`, `${p} + ${k}r`],
    expected: ({ p, k }) => `${p} ${MINUS} ${k}r`,
    solution: ({ p, k }) =>
      `r rafts use ${k} ${TIMES} r = ${k}r pieces. What is left is the start minus what is used: ${p} ${MINUS} ${k}r.`,
  },
  {
    id: "u02-expand-01",
    unit: 2,
    difficulty: 1,
    resource: "stone",
    format: CHOICE,
    params(rng) {
      for (let i = 0; i < 50; i++) {
        const a = int(rng, 2, 5);
        const b = int(rng, 3, 6);
        if (a !== b) return { a, b, c: int(rng, 2, 7) };
      }
      return { a: 2, b: 3, c: 4 };
    },
    prompt: ({ a, b, c }, zone) =>
      `${Z[zone].Place}, a stack of ${Z[zone].stone} is counted as ${a}(${b}x + ${c}). Which option is this with the bracket expanded?`,
    options: ({ a, b, c }) => [
      `${a * b}x + ${a * c}`,
      `${a * b}x + ${c}`,
      `${a * b}x + ${b * c}`,
      `${a + b}x + ${a * c}`,
    ],
    expected: ({ a, b, c }) => `${a * b}x + ${a * c}`,
    solution: ({ a, b, c }) =>
      `Multiply every term inside the bracket by ${a}: ${a} ${TIMES} ${b}x = ${a * b}x and ${a} ${TIMES} ${c} = ${a * c}. ` +
      `So ${a}(${b}x + ${c}) = ${a * b}x + ${a * c}.`,
  },
  {
    id: "u02-substitute-02",
    unit: 2,
    difficulty: 1,
    resource: "food",
    format: INT,
    params: (rng) => ({ h: int(rng, 3, 9), half: int(rng, 2, 6) }),
    prompt: ({ h, half }, zone) =>
      `${Z[zone].Place}, a triangular garden of ${Z[zone].food} has area A = ½ ${TIMES} b ${TIMES} h. ` +
      `Find A, in square metres, when b = ${2 * half} and h = ${h}.`,
    expected: ({ h, half }) => half * h,
    solution: ({ h, half }) =>
      `A = ½ ${TIMES} ${2 * half} ${TIMES} ${h}. Half of ${2 * half} is ${half}, and ${half} ${TIMES} ${h} = ${half * h}.`,
  },
  {
    id: "u02-substitute-03",
    unit: 2,
    difficulty: 1,
    resource: "water",
    format: INT,
    params: (rng) => ({ n: int(rng, 2, 8), k: int(rng, 1, 9) }),
    prompt: ({ n, k }, zone) =>
      `${Z[zone].Place}, a pump gives R = n² + ${k} litres of ${Z[zone].water} a minute, where n is its setting. Find R when n = ${n}.`,
    expected: ({ n, k }) => n * n + k,
    solution: ({ n, k }) =>
      `n² means n ${TIMES} n. With n = ${n}: ${n} ${TIMES} ${n} = ${n * n}, then ${n * n} + ${k} = ${n * n + k}.`,
  },

  // ---------------- Difficulty 2 ----------------
  {
    id: "u02-collect-02",
    unit: 2,
    difficulty: 2,
    resource: "wood",
    format: CHOICE,
    params(rng) {
      const b = int(rng, 4, 8);
      return { a: int(rng, 2, 6), b, c: int(rng, 2, 6), d: int(rng, 2, b - 1) };
    },
    prompt: ({ a, b, c, d }, zone) =>
      `${Z[zone].Place}, your tally of ${Z[zone].wood} is ${a}x + ${b}y + ${c}x ${MINUS} ${d}y. Which is its simplest form?`,
    options: ({ a, b, c, d }) => [
      `${a + c}x + ${co(b - d)}y`,
      `${a + c}x + ${b + d}y`,
      `${a + b + c - d}xy`,
      `${a + c}x ${MINUS} ${co(b - d)}y`,
    ],
    expected: ({ a, b, c, d }) => `${a + c}x + ${co(b - d)}y`,
    solution: ({ a, b, c, d }) =>
      `Collect the x terms: ${a}x + ${c}x = ${a + c}x. Collect the y terms: ${b}y ${MINUS} ${d}y = ${co(b - d)}y. ` +
      `So the answer is ${a + c}x + ${co(b - d)}y.`,
  },
  {
    id: "u02-expand-simplify-01",
    unit: 2,
    difficulty: 2,
    resource: "stone",
    format: CHOICE,
    params(rng) {
      for (let i = 0; i < 50; i++) {
        const a = int(rng, 2, 5);
        const c = int(rng, 2, 5);
        if (a + c !== a * c) return { a, b: int(rng, 2, 6), c, d: int(rng, 2, 6) };
      }
      return { a: 2, b: 3, c: 3, d: 4 };
    },
    prompt: ({ a, b, c, d }, zone) =>
      `${Z[zone].Place}, a count of ${Z[zone].stone} is ${a}(x + ${b}) + ${c}(x + ${d}). Which option is this expanded and simplified?`,
    options: ({ a, b, c, d }) => [
      `${a + c}x + ${a * b + c * d}`,
      `${a + c}x + ${b + d}`,
      `${a + c}x + ${a * b + d}`,
      `${a * c}x + ${a * b + c * d}`,
    ],
    expected: ({ a, b, c, d }) => `${a + c}x + ${a * b + c * d}`,
    solution: ({ a, b, c, d }) =>
      `Expand each bracket: ${a}x + ${a * b} and ${c}x + ${c * d}. Add the x terms: ${a}x + ${c}x = ${a + c}x. ` +
      `Add the numbers: ${a * b} + ${c * d} = ${a * b + c * d}. The answer is ${a + c}x + ${a * b + c * d}.`,
  },
  {
    id: "u02-formula-solve-01",
    unit: 2,
    difficulty: 2,
    resource: "water",
    format: INT,
    params: (rng) => ({ a: int(rng, 2, 6), b: int(rng, 3, 15), n: int(rng, 2, 9) }),
    prompt: ({ a, b, n }, zone) =>
      `${Z[zone].Place}, a trade trip costs C = ${a}n + ${b} shells, where n is the number of barrels of ${Z[zone].water}. ` +
      `A trip cost ${a * n + b} shells. How many barrels, n?`,
    expected: ({ n }) => n,
    solution: ({ a, b, n }) =>
      `Put in the cost: ${a}n + ${b} = ${a * n + b}. Take away ${b}: ${a}n = ${a * n}. Divide by ${a}: n = ${n}.`,
  },
  {
    id: "u02-factorise-01",
    unit: 2,
    difficulty: 2,
    resource: "food",
    format: CHOICE,
    params(rng) {
      const [a, b] = coprimePair(rng, 2, 7);
      return { a, b, g: [4, 6, 8, 9, 10, 12][int(rng, 0, 5)] };
    },
    prompt: ({ a, b, g }, zone) =>
      `${Z[zone].Place}, your count of ${Z[zone].food} is ${g * a}x + ${g * b}. Which option is this factorised completely?`,
    options: ({ a, b, g }) => {
      const f = smallestPrime(g);
      return [
        `${g}(${a}x + ${b})`,
        `${f}(${(g / f) * a}x + ${(g / f) * b})`,
        `${g}(${a}x + ${g * b})`,
        `${g}(${a}x ${MINUS} ${b})`,
      ];
    },
    expected: ({ a, b, g }) => `${g}(${a}x + ${b})`,
    solution: ({ a, b, g }) =>
      `Find the highest common factor of ${g * a} and ${g * b}. It is ${g}, because ${g * a} = ${g} ${TIMES} ${a} and ${g * b} = ${g} ${TIMES} ${b}, ` +
      `and ${a} and ${b} share no factor. So ${g * a}x + ${g * b} = ${g}(${a}x + ${b}). A smaller common factor leaves the bracket still able to be divided.`,
  },
  {
    id: "u02-substitute-bracket-01",
    unit: 2,
    difficulty: 2,
    resource: "stone",
    format: INT,
    params: (rng) => ({ a: int(rng, 2, 5), b: int(rng, 1, 7), n: int(rng, 2, 6) }),
    prompt: ({ a, b, n }, zone) =>
      `${Z[zone].Place}, a tower needs S = ${a}(2n + ${b}) ${Z[zone].stone}, where n is the number of layers. Find S when n = ${n}.`,
    expected: ({ a, b, n }) => a * (2 * n + b),
    solution: ({ a, b, n }) =>
      `Brackets first: 2 ${TIMES} ${n} + ${b} = ${2 * n} + ${b} = ${2 * n + b}. Then multiply: ${a} ${TIMES} ${2 * n + b} = ${a * (2 * n + b)}.`,
  },
  {
    id: "u02-words-02",
    unit: 2,
    difficulty: 2,
    resource: "wood",
    format: CHOICE,
    params: (rng) => ({ k: int(rng, 2, 5), e: int(rng, 2, 4), l: int(rng, 3, 9) }),
    prompt: ({ k, e, l }, zone) =>
      `${Z[zone].Place}, you have ${k} crates with x ${Z[zone].wood} in each. ${e} are taken out of every crate, and you also have ${l} loose. ` +
      `Which expression gives the total?`,
    options: ({ k, e, l }) => [
      `${k}(x ${MINUS} ${e}) + ${l}`,
      `${k}x ${MINUS} ${e} + ${l}`,
      `${k}(x ${MINUS} ${e} + ${l})`,
      `(${k} + ${l})(x ${MINUS} ${e})`,
    ],
    expected: ({ k, e, l }) => `${k}(x ${MINUS} ${e}) + ${l}`,
    solution: ({ k, e, l }) =>
      `Each crate now holds x ${MINUS} ${e}. There are ${k} crates, so ${k}(x ${MINUS} ${e}). Add the ${l} loose pieces: ${k}(x ${MINUS} ${e}) + ${l}.`,
  },
  {
    id: "u02-expand-02",
    unit: 2,
    difficulty: 2,
    resource: "water",
    format: INT,
    params(rng) {
      for (let i = 0; i < 50; i++) {
        const a = int(rng, 2, 5);
        const b = int(rng, 2, 4);
        const d = int(rng, 2, 6);
        if (a * b - d >= 1) return { a, b, c: int(rng, 2, 6), d, e: int(rng, 2, 5) };
      }
      return { a: 3, b: 3, c: 2, d: 2, e: 2 };
    },
    prompt: ({ a, b, c, d, e }, zone) =>
      `${Z[zone].Place}, a rate of ${Z[zone].water} is ${a}(${b}x + ${c}) ${MINUS} ${d}(x ${MINUS} ${e}). ` +
      `When it is expanded and simplified, what is the coefficient of x (the number in front of x)?`,
    expected: ({ a, b, d }) => a * b - d,
    solution: ({ a, b, c, d, e }) =>
      `Expand: ${a}(${b}x + ${c}) = ${a * b}x + ${a * c}. Then ${MINUS}${d}(x ${MINUS} ${e}) = ${MINUS}${d}x + ${d * e}. ` +
      `The x terms are ${a * b}x ${MINUS} ${d}x = ${a * b - d}x, so the coefficient is ${a * b - d}.`,
  },
  {
    id: "u02-perimeter-expr-01",
    unit: 2,
    difficulty: 2,
    resource: "food",
    format: CHOICE,
    params: (rng) => ({ a: int(rng, 1, 5), b: int(rng, 1, 6), c: int(rng, 1, 5), d: int(rng, 1, 6) }),
    prompt: ({ a, b, c, d }, zone) =>
      `${Z[zone].Place}, a rectangular pen for ${Z[zone].food} has sides (${co(a)}x + ${b}) m and (${co(c)}x + ${d}) m. Which expression is its perimeter?`,
    options: ({ a, b, c, d }) => [
      `${2 * (a + c)}x + ${2 * (b + d)}`,
      `${a + c}x + ${b + d}`,
      `${2 * (a + c)}x + ${b + d}`,
      `${a + c}x + ${2 * (b + d)}`,
    ],
    expected: ({ a, b, c, d }) => `${2 * (a + c)}x + ${2 * (b + d)}`,
    solution: ({ a, b, c, d }) =>
      `The perimeter is 2 ${TIMES} (length + width) = 2(${co(a)}x + ${b} + ${co(c)}x + ${d}) = 2(${a + c}x + ${b + d}). ` +
      `Doubling both terms gives ${2 * (a + c)}x + ${2 * (b + d)}.`,
  },

  // ---------------- Difficulty 3 ----------------
  {
    id: "u02-rearrange-01",
    unit: 2,
    difficulty: 3,
    resource: "wood",
    format: CHOICE,
    params: (rng) => ({ a: int(rng, 2, 6), b: int(rng, 2, 9) }),
    prompt: ({ a, b }, zone) =>
      `${Z[zone].Place}, the hours to cut ${Z[zone].wood} are T = ${a}n + ${b}, where n is the number of logs. Which option makes n the subject?`,
    options: ({ a, b }) => [
      `n = (T ${MINUS} ${b}) ÷ ${a}`,
      `n = T ÷ ${a} ${MINUS} ${b}`,
      `n = (T + ${b}) ÷ ${a}`,
      `n = ${a}(T ${MINUS} ${b})`,
    ],
    expected: ({ a, b }) => `n = (T ${MINUS} ${b}) ÷ ${a}`,
    solution: ({ a, b }) =>
      `Undo the operations in reverse order. First subtract ${b} from both sides: T ${MINUS} ${b} = ${a}n. ` +
      `Then divide both sides by ${a}: n = (T ${MINUS} ${b}) ÷ ${a}.`,
  },
  {
    id: "u02-trapezium-reverse-01",
    unit: 2,
    difficulty: 3,
    resource: "stone",
    format: INT,
    params(rng) {
      const a = int(rng, 3, 8);
      const b = int(rng, 4, 12);
      return { a, b, h: 2 * int(rng, 2, 4) };
    },
    prompt: ({ a, b, h }, zone) =>
      `${Z[zone].Place}, a bed of ${Z[zone].stone} has area A = ½(a + b)h. Its area is ${((a + b) * h) / 2} m², a = ${a} m and h = ${h} m. Find b.`,
    expected: ({ b }) => b,
    solution: ({ a, b, h }) =>
      `Substitute: ½(${a} + b) ${TIMES} ${h} = ${((a + b) * h) / 2}. Half of ${h} is ${h / 2}, so ${h / 2}(${a} + b) = ${((a + b) * h) / 2}. ` +
      `Divide by ${h / 2}: ${a} + b = ${a + b}. So b = ${a + b} ${MINUS} ${a} = ${b}.`,
  },
  {
    id: "u02-equivalent-01",
    unit: 2,
    difficulty: 3,
    resource: "stone",
    format: CHOICE,
    params(rng) {
      const c = int(rng, 2, 3);
      for (let i = 0; i < 100; i++) {
        const a = c + int(rng, 1, 3);
        const b = int(rng, 2, 6);
        const d = int(rng, 2, 5);
        if (a * b - c * d !== b + d) return { a, b, c, d };
      }
      return { a: 4, b: 3, c, d: 2 };
    },
    prompt: ({ a, b, c, d }, zone) =>
      `${Z[zone].Place}, your count of ${Z[zone].stone} is ${a}(x + ${b}) ${MINUS} ${c}(x ${MINUS} ${d}). Which expression is equivalent to it?`,
    options: ({ a, b, c, d }) => [
      lin(a - c, a * b + c * d),
      lin(a - c, a * b - c * d),
      lin(a + c, a * b + c * d),
      lin(a - c, b + d),
    ],
    expected: ({ a, b, c, d }) => lin(a - c, a * b + c * d),
    solution: ({ a, b, c, d }) =>
      `Expand: ${a}(x + ${b}) = ${a}x + ${a * b}. Then ${MINUS}${c}(x ${MINUS} ${d}) = ${MINUS}${c}x + ${c * d}, because ${MINUS}${c} ${TIMES} ${MINUS}${d} is positive. ` +
      `Collect: ${co(a - c)}x + ${a * b + c * d}, which is ${lin(a - c, a * b + c * d)}.`,
  },
  {
    id: "u02-substitute-negative-01",
    unit: 2,
    difficulty: 3,
    resource: "water",
    format: CHOICE,
    params(rng) {
      for (let i = 0; i < 100; i++) {
        const base = { p: int(rng, 2, 4), k: int(rng, 2, 4), q: int(rng, 2, 5), m: int(rng, 2, 6) };
        if (base.p * base.k * base.k - base.q * base.m === 0) continue;
        try {
          const idx = pickIdx(rng, negPool(base), base.p * base.k * base.k - base.q * base.m, 3);
          return { ...base, i: idx[0], j: idx[1], l: idx[2] };
        } catch {
          /* try again */
        }
      }
      return { p: 3, k: 2, q: 2, m: 3, i: 0, j: 1, l: 2 };
    },
    prompt: ({ p, k, q, m }, zone) =>
      `${Z[zone].Place}, a ${Z[zone].water} formula is ${p}a² ${MINUS} ${q}b. Find its value when a = ${MINUS}${k} and b = ${m}.`,
    options: (p) => {
      const pool = negPool(p);
      return [p.p * p.k * p.k - p.q * p.m, pool[p.i], pool[p.j], pool[p.l]].map(sg);
    },
    expected: ({ p, k, q, m }) => sg(p * k * k - q * m),
    solution: ({ p, k, q, m }) =>
      `Square first: (${MINUS}${k})² = ${k * k}, because a negative times a negative is positive. ` +
      `Then ${p} ${TIMES} ${k * k} = ${p * k * k} and ${q} ${TIMES} ${m} = ${q * m}. ${p * k * k} ${MINUS} ${q * m} = ${sg(p * k * k - q * m)}.`,
  },
  {
    id: "u02-simplify-reverse-01",
    unit: 2,
    difficulty: 3,
    resource: "wood",
    format: INT,
    params(rng) {
      for (let i = 0; i < 200; i++) {
        const a = int(rng, 3, 6);
        const b = int(rng, 4, 8);
        const c = int(rng, 2, 4);
        const d = int(rng, 2, 4);
        const k = int(rng, 2, 6);
        if (a * b - c * k >= 1 && a * d - c >= 1) return { a, b, c, d, k };
      }
      return { a: 4, b: 6, c: 2, d: 3, k: 3 };
    },
    prompt: ({ a, b, c, d, k }, zone) =>
      `${Z[zone].Place}, a count of ${Z[zone].wood}, ${a}(${d}x + ${b}) ${MINUS} ${c}(x + k) simplifies to ${a * d - c}x + ${a * b - c * k}. What is the number k?`,
    expected: ({ k }) => k,
    solution: ({ a, b, c, d, k }) =>
      `Expand: ${a * d}x + ${a * b} ${MINUS} ${c}x ${MINUS} ${c}k. The number terms are ${a * b} ${MINUS} ${c}k = ${a * b - c * k}. ` +
      `So ${c}k = ${a * b} ${MINUS} ${a * b - c * k} = ${c * k}, and k = ${c * k} ÷ ${c} = ${k}.`,
  },
  {
    id: "u02-chained-formula-01",
    unit: 2,
    difficulty: 3,
    resource: "food",
    format: INT,
    params(rng) {
      for (let i = 0; i < 100; i++) {
        const a = int(rng, 2, 4);
        const b = int(rng, 1, 6);
        const c = int(rng, 2, 4);
        const d = int(rng, 1, 8);
        const n = int(rng, 2, 6);
        if (c * (a * n + b) - d >= 1) return { a, b, c, d, n };
      }
      return { a: 2, b: 1, c: 3, d: 2, n: 3 };
    },
    prompt: ({ a, b, c, d, n }, zone) =>
      `${Z[zone].Place}, a store of ${Z[zone].food} uses h = ${a}n + ${b} and L = ${c}h ${MINUS} ${d}. Find L when n = ${n}.`,
    expected: ({ a, b, c, d, n }) => c * (a * n + b) - d,
    solution: ({ a, b, c, d, n }) =>
      `Find h first: h = ${a} ${TIMES} ${n} + ${b} = ${a * n + b}. Then L = ${c} ${TIMES} ${a * n + b} ${MINUS} ${d} = ${c * (a * n + b)} ${MINUS} ${d} = ${c * (a * n + b) - d}.`,
  },
];
