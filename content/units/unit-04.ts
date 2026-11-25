/**
 * Unit 4 bank: equations and inequalities.
 * Original templates written for this game. Difficulty 1 = one- or two-step
 * equations and reading an inequality; 2 = unknown on both sides, brackets,
 * building equations, inequalities; 3 = multi-step, boundary and checking
 * problems. Equation answers are positive whole numbers; inequality answers
 * that are not numbers use the choice format.
 */
import type { QuestionTemplate } from "@/lib/questions/types";
import { int } from "@/lib/questions/random";
import { ZONE_WORDS as Z } from "@/content/units/zones";

const INT = { kind: "integer" } as const;
const CHOICE = { kind: "choice", options: [] as string[] } as const;
const MINUS = "−";
const TIMES = "×";
const DIV = "÷";
const GE = "≥";
const LE = "≤";
const co = (n: number) => (n === 1 ? "" : `${n}`);

/** Four comparison signs, indexed 0..3: >=, >, <=, <. */
const SIGNS = [GE, ">", LE, "<"];
const WORDS = ["at least", "more than", "at most", "fewer than"];

export const UNIT_04: QuestionTemplate[] = [
  // ---------------- Difficulty 1 ----------------
  {
    id: "u04-one-step-add-01",
    unit: 4,
    difficulty: 1,
    resource: "water",
    format: INT,
    params: (rng) => ({ x: int(rng, 5, 30), a: int(rng, 3, 20) }),
    prompt: ({ x, a }, zone) =>
      `${Z[zone].Place}, you pour ${a} litres of ${Z[zone].water} into a barrel and it now holds ${x + a} litres. ` +
      `Solve x + ${a} = ${x + a} to find how many litres were in it before.`,
    expected: ({ x }) => x,
    solution: ({ x, a }) =>
      `Undo the addition by subtracting ${a} from both sides: x = ${x + a} ${MINUS} ${a} = ${x}.`,
  },
  {
    id: "u04-one-step-mult-01",
    unit: 4,
    difficulty: 1,
    resource: "food",
    format: INT,
    params: (rng) => ({ x: int(rng, 3, 12), a: int(rng, 2, 9) }),
    prompt: ({ x, a }, zone) =>
      `${Z[zone].Place}, ${a} equal baskets hold ${a * x} ${Z[zone].food} in all. Solve ${a}x = ${a * x} to find how many are in one basket.`,
    expected: ({ x }) => x,
    solution: ({ x, a }) =>
      `${a}x means ${a} ${TIMES} x. Undo the multiplication by dividing both sides by ${a}: x = ${a * x} ${DIV} ${a} = ${x}.`,
  },
  {
    id: "u04-two-step-01",
    unit: 4,
    difficulty: 1,
    resource: "wood",
    format: INT,
    params: (rng) => ({ x: int(rng, 2, 9), a: int(rng, 2, 6), b: int(rng, 1, 9) }),
    prompt: ({ x, a, b }, zone) =>
      `${Z[zone].Place}, ${a} rafts use x ${Z[zone].wood} each and ${b} more are kept spare, ${a * x + b} in all. ` +
      `Solve ${a}x + ${b} = ${a * x + b} to find x.`,
    expected: ({ x }) => x,
    solution: ({ x, a, b }) =>
      `Subtract ${b} from both sides: ${a}x = ${a * x}. Divide both sides by ${a}: x = ${x}.`,
  },
  {
    id: "u04-two-step-sub-01",
    unit: 4,
    difficulty: 1,
    resource: "stone",
    format: INT,
    params(rng) {
      const x = int(rng, 3, 10);
      const a = int(rng, 2, 6);
      return { x, a, b: int(rng, 1, Math.min(9, a * x - 1)) };
    },
    prompt: ({ x, a, b }, zone) =>
      `${Z[zone].Place}, you carry ${a} loads of x ${Z[zone].stone} and drop ${b}, leaving ${a * x - b}. ` +
      `Solve ${a}x ${MINUS} ${b} = ${a * x - b} to find x.`,
    expected: ({ x }) => x,
    solution: ({ x, a, b }) =>
      `Add ${b} to both sides: ${a}x = ${a * x}. Divide both sides by ${a}: x = ${x}.`,
  },
  {
    id: "u04-inequality-read-01",
    unit: 4,
    difficulty: 1,
    resource: "water",
    format: CHOICE,
    params: (rng) => ({ N: int(rng, 5, 40), m: int(rng, 0, 3) }),
    prompt: ({ N, m }, zone) =>
      `${Z[zone].Place}, camp rules say you must carry ${WORDS[m]} ${N} litres of ${Z[zone].water}. ` +
      `Which inequality shows the litres, L, that you carry?`,
    options: ({ N }) => SIGNS.map((s) => `L ${s} ${N}`),
    expected: ({ N, m }) => `L ${SIGNS[m]} ${N}`,
    solution: ({ N, m }) =>
      `"${WORDS[m]}" means ${m === 0 ? `${N} or more, so the sign is ${GE}` : m === 1 ? `above ${N} but not ${N} itself, so the sign is >` : m === 2 ? `${N} or fewer, so the sign is ${LE}` : `below ${N} but not ${N} itself, so the sign is <`}. ` +
      `The inequality is L ${SIGNS[m]} ${N}.`,
  },
  {
    id: "u04-divide-eq-01",
    unit: 4,
    difficulty: 1,
    resource: "food",
    format: INT,
    params: (rng) => ({ a: int(rng, 2, 8), b: int(rng, 3, 12) }),
    prompt: ({ a, b }, zone) =>
      `${Z[zone].Place}, you share n ${Z[zone].food} equally among ${a} teams and each team gets ${b}. ` +
      `Solve n ${DIV} ${a} = ${b} to find n.`,
    expected: ({ a, b }) => a * b,
    solution: ({ a, b }) =>
      `Undo the division by multiplying both sides by ${a}: n = ${b} ${TIMES} ${a} = ${a * b}.`,
  },

  // ---------------- Difficulty 2 ----------------
  {
    id: "u04-both-sides-01",
    unit: 4,
    difficulty: 2,
    resource: "stone",
    format: INT,
    params(rng) {
      const c = int(rng, 1, 4);
      return { a: c + int(rng, 1, 4), b: int(rng, 1, 8), c, x: int(rng, 2, 9) };
    },
    prompt: ({ a, b, c, x }, zone) =>
      `${Z[zone].Place}, two heaps of ${Z[zone].stone} become equal in size. Solve ${a}x + ${b} = ${co(c)}x + ${b + (a - c) * x} to find x.`,
    expected: ({ x }) => x,
    solution: ({ a, b, c, x }) =>
      `Subtract ${co(c)}x from both sides: ${a - c === 1 ? "" : a - c}x + ${b} = ${b + (a - c) * x}. Subtract ${b}: ${a - c === 1 ? "" : a - c}x = ${(a - c) * x}. ` +
      `${a - c === 1 ? `So x = ${x}.` : `Divide by ${a - c}: x = ${x}.`}`,
  },
  {
    id: "u04-brackets-01",
    unit: 4,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params: (rng) => ({ a: int(rng, 2, 6), b: int(rng, 1, 8), x: int(rng, 2, 9) }),
    prompt: ({ a, b, x }, zone) =>
      `${Z[zone].Place}, ${a} crews each carry x + ${b} ${Z[zone].wood}, ${a * (x + b)} in all. Solve ${a}(x + ${b}) = ${a * (x + b)} to find x.`,
    expected: ({ x }) => x,
    solution: ({ a, b, x }) =>
      `Divide both sides by ${a}: x + ${b} = ${x + b}. Subtract ${b}: x = ${x}. (Check: ${a} ${TIMES} (${x} + ${b}) = ${a * (x + b)}.)`,
  },
  {
    id: "u04-perimeter-eq-01",
    unit: 4,
    difficulty: 2,
    resource: "water",
    format: INT,
    params: (rng) => ({ x: int(rng, 2, 10), a: int(rng, 1, 8) }),
    prompt: ({ x, a }, zone) =>
      `${Z[zone].Place}, a rectangular pool for ${Z[zone].water} is x m wide and (x + ${a}) m long. Its perimeter is ${2 * (2 * x + a)} m. What is x?`,
    expected: ({ x }) => x,
    solution: ({ x, a }) =>
      `Perimeter = 2(x + x + ${a}) = 2(2x + ${a}) = 4x + ${2 * a}. So 4x + ${2 * a} = ${2 * (2 * x + a)}. ` +
      `Subtract ${2 * a}: 4x = ${4 * x}. Divide by 4: x = ${x}.`,
  },
  {
    id: "u04-solve-ineq-01",
    unit: 4,
    difficulty: 2,
    resource: "food",
    format: CHOICE,
    params: (rng) => ({ a: int(rng, 2, 6), b: int(rng, 1, 9), k: int(rng, 2, 9) }),
    prompt: ({ a, b, k }, zone) =>
      `${Z[zone].Place}, the camp is fed when ${a}x + ${b} > ${a * k + b}, where x is the number of baskets of ${Z[zone].food}. Which option is the solution?`,
    options: ({ a, b, k }) => [`x > ${k}`, `x < ${k}`, `x > ${a * k}`, `x > ${a * k + 2 * b}`],
    expected: ({ k }) => `x > ${k}`,
    solution: ({ a, b, k }) =>
      `Subtract ${b} from both sides: ${a}x > ${a * k}. Divide both sides by ${a} (a positive number, so the sign stays the same): x > ${k}.`,
  },
  {
    id: "u04-ineq-integers-01",
    unit: 4,
    difficulty: 2,
    resource: "stone",
    format: INT,
    params: (rng) => ({ a: int(rng, 1, 8), g: int(rng, 3, 8), m: int(rng, 0, 2) }),
    prompt: ({ a, g, m }, zone) => {
      const sym = [`${a} < x ${LE} ${a + g}`, `${a} ${LE} x < ${a + g}`, `${a} < x < ${a + g}`][m];
      return `${Z[zone].Place}, the number of boxes of ${Z[zone].stone}, x, satisfies ${sym}. How many different whole-number values can x take?`;
    },
    expected: ({ g, m }) => (m === 2 ? g - 1 : g),
    solution: ({ a, g, m }) => {
      const lo = m === 1 ? a : a + 1;
      const hi = m === 0 ? a + g : a + g - 1;
      const list = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
      return `Check which end values are allowed. The whole numbers are ${list.join(", ")}. There are ${list.length} of them.`;
    },
  },
  {
    id: "u04-fraction-eq-01",
    unit: 4,
    difficulty: 2,
    resource: "water",
    format: INT,
    params(rng) {
      const b = int(rng, 2, 6);
      const c = int(rng, 3, 8);
      return { a: int(rng, 1, b * c - 2), b, c };
    },
    prompt: ({ a, b, c }, zone) =>
      `${Z[zone].Place}, you add ${a} litres of ${Z[zone].water} to a tank, then share it equally among ${b} jars and each jar gets ${c}. ` +
      `Solve (x + ${a}) ${DIV} ${b} = ${c} to find x.`,
    expected: ({ a, b, c }) => b * c - a,
    solution: ({ a, b, c }) =>
      `Multiply both sides by ${b}: x + ${a} = ${b * c}. Subtract ${a}: x = ${b * c} ${MINUS} ${a} = ${b * c - a}.`,
  },
  {
    id: "u04-number-line-01",
    unit: 4,
    difficulty: 2,
    resource: "wood",
    format: CHOICE,
    params: (rng) => ({ n: int(rng, 2, 12), s: int(rng, 0, 3) }),
    prompt: ({ n, s }, zone) => {
      const closed = s === 0 || s === 2;
      const right = s === 0 || s === 1;
      return (
        `${Z[zone].Place}, a number line for ${Z[zone].wood} has ${closed ? "a closed" : "an open"} circle at ${n} ` +
        `and an arrow pointing ${right ? "right, towards larger numbers" : "left, towards smaller numbers"}. Which inequality does it show?`
      );
    },
    // s: 0 closed+right (>=), 1 open+right (>), 2 closed+left (<=), 3 open+left (<); SIGNS has the same order.
    options: ({ n }) => SIGNS.map((g) => `x ${g} ${n}`),
    expected: ({ n, s }) => `x ${SIGNS[s]} ${n}`,
    solution: ({ n, s }) =>
      `${s === 0 || s === 2 ? "A closed" : "An open"} circle means ${n} ${s === 0 || s === 2 ? "is included, so the sign has an equals bar" : "is not included, so the sign is strict"}. ` +
      `The arrow points ${s < 2 ? "right, so x is bigger" : "left, so x is smaller"}. The inequality is x ${SIGNS[s]} ${n}.`,
  },
  {
    id: "u04-write-equation-01",
    unit: 4,
    difficulty: 2,
    resource: "food",
    format: CHOICE,
    params: (rng) => ({ a: int(rng, 2, 6), b: int(rng, 2, 9), c: int(rng, 10, 40) }),
    prompt: ({ a, b, c }, zone) =>
      `${Z[zone].Place}, you pick a number x of ${Z[zone].food}, multiply it by ${a}, then subtract ${b}. The result is ${c}. Which equation shows this?`,
    options: ({ a, b, c }) => [`${a}x ${MINUS} ${b} = ${c}`, `${a}(x ${MINUS} ${b}) = ${c}`, `${a}x + ${b} = ${c}`, `${a} ${MINUS} ${b}x = ${c}`],
    expected: ({ a, b, c }) => `${a}x ${MINUS} ${b} = ${c}`,
    solution: ({ a, b, c }) =>
      `Multiply x by ${a} first: ${a}x. Then subtract ${b}: ${a}x ${MINUS} ${b}. This equals ${c}, so the equation is ${a}x ${MINUS} ${b} = ${c}. A bracket would mean the ${b} is taken off before multiplying.`,
  },

  // ---------------- Difficulty 3 ----------------
  {
    id: "u04-both-sides-02",
    unit: 4,
    difficulty: 3,
    resource: "wood",
    format: INT,
    params(rng) {
      const c = int(rng, 1, 3);
      const a = c + int(rng, 2, 4);
      const b = int(rng, 1, 5);
      const x = int(rng, 2, 8);
      return { a, b, c, x, d: a * (x + b) - c * x };
    },
    prompt: ({ a, b, c, d }, zone) =>
      `${Z[zone].Place}, two stacks of ${Z[zone].wood} are the same height. Solve ${a}(x + ${b}) = ${co(c)}x + ${d} to find x.`,
    expected: ({ x }) => x,
    solution: ({ a, b, c, d, x }) =>
      `Expand the bracket: ${a}x + ${a * b} = ${co(c)}x + ${d}. Subtract ${co(c)}x: ${a - c === 1 ? "" : a - c}x + ${a * b} = ${d}. ` +
      `Subtract ${a * b}: ${a - c === 1 ? "" : a - c}x = ${d - a * b}. ${a - c === 1 ? `So x = ${x}.` : `Divide by ${a - c}: x = ${x}.`}`,
  },
  {
    id: "u04-construct-02",
    unit: 4,
    difficulty: 3,
    resource: "stone",
    format: INT,
    params: (rng) => ({ x: int(rng, 3, 12), c: int(rng, 2, 4), b: int(rng, 2, 9) }),
    prompt: ({ x, c, b }, zone) =>
      `${Z[zone].Place}, rope A is x metres long. Rope B is ${b} m longer than ${c} times rope A. Together they measure ${x + c * x + b} m, ` +
      `to tie ${Z[zone].stone}. How long is rope B?`,
    expected: ({ x, c, b }) => c * x + b,
    solution: ({ x, c, b }) =>
      `Rope B is ${c}x + ${b}. Together: x + ${c}x + ${b} = ${x + c * x + b}, so ${c + 1}x = ${(c + 1) * x}, and x = ${x}. ` +
      `Rope B = ${c} ${TIMES} ${x} + ${b} = ${c * x + b} m.`,
  },
  {
    id: "u04-ineq-largest-01",
    unit: 4,
    difficulty: 3,
    resource: "water",
    format: INT,
    params(rng) {
      const a = int(rng, 2, 6);
      return { a, b: int(rng, 1, 9), k: int(rng, 3, 12), r: int(rng, 0, a - 1) };
    },
    prompt: ({ a, b, k, r }, zone) =>
      `${Z[zone].Place}, your raft is safe when ${a}n + ${b} ${LE} ${a * k + b + r}, where n is the number of barrels of ${Z[zone].water}. ` +
      `What is the largest whole number n that works?`,
    expected: ({ k }) => k,
    solution: ({ a, b, k, r }) =>
      `Subtract ${b}: ${a}n ${LE} ${a * k + r}. Divide by ${a}: n ${LE} ${a * k + r} ${DIV} ${a}, which is ${k}${r ? ` and a bit (${a * k + r}/${a})` : ""}. ` +
      `The largest whole number is ${k}.`,
  },
  {
    id: "u04-ineq-smallest-01",
    unit: 4,
    difficulty: 3,
    resource: "food",
    format: INT,
    params(rng) {
      const a = int(rng, 2, 6);
      return { a, b: int(rng, 1, 5), m: int(rng, 3, 10), r: int(rng, 0, a - 1) };
    },
    prompt: ({ a, b, m, r }, zone) =>
      `${Z[zone].Place}, your supply of ${Z[zone].food} lasts the week when ${a}n ${MINUS} ${b} > ${a * m + r - b}, where n is the number of traps set. What is the smallest whole number n that works?`,
    expected: ({ m }) => m + 1,
    solution: ({ a, b, m, r }) =>
      `Add ${b}: ${a}n > ${a * m + r}. Divide by ${a}: n > ${m}${r ? ` and a bit (${a * m + r}/${a})` : ""}. ` +
      `n must be strictly bigger, so the smallest whole number is ${m + 1}.`,
  },
  {
    id: "u04-claim-solution-01",
    unit: 4,
    difficulty: 3,
    resource: "wood",
    format: CHOICE,
    params(rng) {
      for (let i = 0; i < 100; i++) {
        const a = int(rng, 2, 6);
        const b = int(rng, 2, 8);
        const n = int(rng, 3, 9);
        if (a * n - b !== a + b + n && a * n - b > 0) return { a, b, n };
      }
      return { a: 3, b: 2, n: 4 };
    },
    prompt: ({ n }, zone) => `${Z[zone].Place}, you are checking tallies of ${Z[zone].wood}. Which equation has the solution x = ${n}?`,
    options: ({ a, b, n }) => [
      `${a}x + ${b} = ${a * n + b}`,
      `${a}x + ${b} = ${a * n - b}`,
      `${a}x ${MINUS} ${b} = ${a * n + b}`,
      `${a}x + ${b} = ${a + b + n}`,
    ],
    expected: ({ a, b, n }) => `${a}x + ${b} = ${a * n + b}`,
    solution: ({ a, b, n }) =>
      `Test x = ${n} in each equation. ${a} ${TIMES} ${n} + ${b} = ${a * n + b}, so ${a}x + ${b} = ${a * n + b} is true. ` +
      `The other equations do not balance when x = ${n}.`,
  },
  {
    id: "u04-ineq-context-01",
    unit: 4,
    difficulty: 3,
    resource: "stone",
    format: CHOICE,
    params(rng) {
      const a = int(rng, 2, 6);
      const c = int(rng, 4, 15);
      return { a, c, B: c + a * int(rng, 3, 9) + int(rng, 0, 3) };
    },
    prompt: ({ a, c, B }, zone) =>
      `${Z[zone].Place}, planks cost ${a} shells each. You have already spent ${c} shells on ${Z[zone].rope} and may spend at most ${B} shells in total. ` +
      `Which inequality gives the number of planks, n, you can buy?`,
    options: ({ a, c, B }) => [`${a}n + ${c} ${LE} ${B}`, `${a}n + ${c} ${GE} ${B}`, `${a}(n + ${c}) ${LE} ${B}`, `${a}n ${MINUS} ${c} ${LE} ${B}`],
    expected: ({ a, c, B }) => `${a}n + ${c} ${LE} ${B}`,
    solution: ({ a, c, B }) =>
      `n planks cost ${a}n. Add the ${c} already spent: ${a}n + ${c}. The total must not go over ${B}, so it is at most ${B}: ${a}n + ${c} ${LE} ${B}.`,
  },
];
