/**
 * Unit 9 bank: sequences and functions.
 * Original templates written for this game. Difficulty 1 = continue a pattern,
 * read a term-to-term rule, put a number through a rule; 2 = find an nth term,
 * work backwards through a machine, patterns from a story; 3 = reverse and
 * multi-step problems, claims about a sequence, a non-linear sequence.
 * Rules and nth terms that a student must write use the typed `expression`
 * format (letters n or x); everything else is a positive whole number or a
 * choice. Numbers are chosen backwards from a clean answer.
 */
import type { QuestionTemplate } from "@/lib/questions/types";
import { int } from "@/lib/questions/random";
import { ZONE_WORDS as Z } from "@/content/units/zones";

const INT = { kind: "integer" } as const;
const CHOICE = { kind: "choice", options: [] as string[] } as const;
const EXPR = { kind: "expression" } as const;
const MINUS = "−";
const TIMES = "×";
const DIV = "÷";
/** Coefficient text: 1 is left out. */
const co = (n: number) => (n === 1 ? "" : `${n}`);
/** "3, 5, 7 and 9". */
const andList = (xs: number[]) => `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
const firstFour = (a: number, d: number) => [a, a + d, a + 2 * d, a + 3 * d];

export const UNIT_09: QuestionTemplate[] = [
  // ---------------- Difficulty 1 ----------------
  {
    id: "u09-next-term-01",
    unit: 9,
    difficulty: 1,
    resource: "water",
    format: INT,
    params: (rng) => ({ a: int(rng, 3, 20), d: int(rng, 2, 9) }),
    prompt: ({ a, d }, zone) =>
      `${Z[zone].Place}, you collect ${andList(firstFour(a, d))} litres of ${Z[zone].water} on four days in a row. ` +
      `Each day you collect the same amount more than the day before. How many litres do you collect on day 5?`,
    expected: ({ a, d }) => a + 4 * d,
    solution: ({ a, d }) =>
      `Each day is ${d} more than the day before (${a + d} ${MINUS} ${a} = ${d}). ` +
      `Day 5 is ${a + 3 * d} + ${d} = ${a + 4 * d}.`,
  },
  {
    id: "u09-decreasing-01",
    unit: 9,
    difficulty: 1,
    resource: "food",
    format: INT,
    params: (rng) => ({ f: int(rng, 3, 15), d: int(rng, 2, 7) }),
    prompt: ({ f, d }, zone) =>
      `${Z[zone].Place}, you count ${andList([f + 4 * d, f + 3 * d, f + 2 * d, f + d])} ${Z[zone].food} left in your store ` +
      `on four mornings, falling by the same amount each day. How many ${Z[zone].food} will you count on morning 5?`,
    expected: ({ f }) => f,
    solution: ({ f, d }) =>
      `Each morning there are ${d} fewer (${f + 4 * d} ${MINUS} ${f + 3 * d} = ${d}). ` +
      `Morning 5 is ${f + d} ${MINUS} ${d} = ${f}.`,
  },
  {
    id: "u09-term-rule-01",
    unit: 9,
    difficulty: 1,
    resource: "stone",
    format: CHOICE,
    params: (rng) => {
      const d = int(rng, 2, 8);
      return { d, a: d + int(rng, 2, 10), drop: int(rng, 0, 3) };
    },
    prompt: ({ a, d }, zone) =>
      `${Z[zone].Place}, the rows of your wall use ${andList(firstFour(a, d))} ${Z[zone].stone}, in that order. ` +
      `What is the term-to-term rule?`,
    // Four wrong rules; one is left out by the seed so the wrong set varies.
    options: ({ a, d, drop }) => [
      `Add ${d}`,
      ...[`Subtract ${d}`, `Multiply by ${d}`, `Add ${a}`, `Add ${d + 1}`].filter((_, i) => i !== drop),
    ],
    expected: ({ d }) => `Add ${d}`,
    solution: ({ a, d }) =>
      `Each term is ${d} more than the one before (${a + d} ${MINUS} ${a} = ${d}), so the rule is Add ${d}. ` +
      `The rule must work between every pair of neighbours.`,
  },
  {
    id: "u09-nth-term-gen-01",
    unit: 9,
    difficulty: 1,
    resource: "wood",
    format: INT,
    params: (rng) => ({ d: int(rng, 2, 9), c: int(rng, 1, 9), m: int(rng, 5, 12) }),
    prompt: ({ d, c, m }, zone) =>
      `${Z[zone].Place}, the number of ${Z[zone].wood} in section n of a fence is ${d}n + ${c}. ` +
      `How many ${Z[zone].wood} are in section ${m}?`,
    expected: ({ d, c, m }) => d * m + c,
    solution: ({ d, c, m }) =>
      `Put n = ${m}: ${d} ${TIMES} ${m} + ${c} = ${d * m} + ${c} = ${d * m + c}.`,
  },
  {
    id: "u09-machine-01",
    unit: 9,
    difficulty: 1,
    resource: "stone",
    format: INT,
    params: (rng) => ({ a: int(rng, 2, 6), b: int(rng, 1, 9), x: int(rng, 2, 9) }),
    prompt: ({ a, b, x }, zone) =>
      `${Z[zone].Place}, your number machine multiplies the input by ${a} and then adds ${b}. ` +
      `What comes out when you put in ${x}?`,
    expected: ({ a, b, x }) => a * x + b,
    solution: ({ a, b, x }) =>
      `Multiply first: ${x} ${TIMES} ${a} = ${a * x}. Then add ${b}: ${a * x} + ${b} = ${a * x + b}.`,
  },
  {
    id: "u09-multiples-nth-01",
    unit: 9,
    difficulty: 1,
    resource: "wood",
    format: EXPR,
    params: (rng) => ({ d: int(rng, 3, 9) }),
    prompt: ({ d }, zone) =>
      `${Z[zone].Place}, the numbers of ${Z[zone].wood} in your piles follow the sequence ${andList([d, 2 * d, 3 * d, 4 * d])}. ` +
      `Write an expression, in terms of n, for the n-th term.`,
    expected: ({ d }) => `${d}n`,
    solution: ({ d }) =>
      `Each term is ${d} times its position (1st term ${d} ${TIMES} 1, 2nd term ${d} ${TIMES} 2), so the n-th term is ${d}n.`,
  },

  // ---------------- Difficulty 2 ----------------
  {
    id: "u09-nth-term-find-02",
    unit: 9,
    difficulty: 2,
    resource: "water",
    format: EXPR,
    params: (rng) => ({ d: int(rng, 2, 9), c: int(rng, 1, 8) }),
    prompt: ({ d, c }, zone) =>
      `${Z[zone].Place}, the litres of ${Z[zone].water} you store each day are ${andList(firstFour(d + c, d))}, and the pattern continues. ` +
      `Write an expression, in terms of n, for the litres stored on day n.`,
    expected: ({ d, c }) => `${d}n+${c}`,
    solution: ({ d, c }) =>
      `The amounts go up by ${d} each day, so the rule starts ${d}n. On day 1, ${d}n gives ${d} but the amount is ${d + c}, ` +
      `so add ${c}. The n-th term is ${d}n+${c}.`,
  },
  {
    id: "u09-nth-term-down-02",
    unit: 9,
    difficulty: 2,
    resource: "food",
    format: EXPR,
    params: (rng) => {
      const d = int(rng, 2, 6);
      return { d, c: 4 * d + int(rng, 2, 12) };
    },
    prompt: ({ d, c }, zone) =>
      `${Z[zone].Place}, your supply of ${Z[zone].food} drops each week: ${andList([c - d, c - 2 * d, c - 3 * d, c - 4 * d])} in weeks 1 to 4. ` +
      `Write an expression, in terms of n, for the number in week n.`,
    expected: ({ d, c }) => `${c}-${d}n`,
    solution: ({ d, c }) =>
      `The terms go down by ${d}, so the rule has ${MINUS}${d}n in it. In week 1, ${MINUS}${d}n gives ${MINUS}${d} but the supply is ${c - d}, ` +
      `so start from ${c}. The n-th term is ${c}-${d}n.`,
  },
  {
    id: "u09-position-02",
    unit: 9,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params: (rng) => ({ d: int(rng, 3, 9), c: int(rng, 1, 9), k: int(rng, 8, 25) }),
    prompt: ({ d, c, k }, zone) =>
      `${Z[zone].Place}, the number of ${Z[zone].wood} in section n of a ramp is ${d}n + ${c}. ` +
      `Which section has exactly ${d * k + c} ${Z[zone].wood}?`,
    expected: ({ k }) => k,
    solution: ({ d, c, k }) =>
      `Solve ${d}n + ${c} = ${d * k + c}. Subtract ${c}: ${d}n = ${d * k}. Divide by ${d}: n = ${k}.`,
  },
  {
    id: "u09-inverse-machine-02",
    unit: 9,
    difficulty: 2,
    resource: "food",
    format: INT,
    params: (rng) => ({ a: int(rng, 2, 7), b: int(rng, 1, 12), x: int(rng, 3, 15) }),
    prompt: ({ a, b, x }, zone) =>
      `${Z[zone].Place}, a number machine multiplies by ${a} and then adds ${b}. It gives out ${a * x + b}. ` +
      `What number was put in?`,
    expected: ({ x }) => x,
    solution: ({ a, b, x }) =>
      `Work backwards. Undo the add: ${a * x + b} ${MINUS} ${b} = ${a * x}. Undo the multiply: ${a * x} ${DIV} ${a} = ${x}.`,
  },
  {
    id: "u09-table-rule-02",
    unit: 9,
    difficulty: 2,
    resource: "water",
    format: EXPR,
    params: (rng) => {
      const a = int(rng, 2, 7);
      const sub = int(rng, 0, 1);
      return { a, sub, b: sub ? int(rng, 1, a - 1) : int(rng, 1, 6) };
    },
    prompt: ({ a, b, sub }, zone) =>
      `${Z[zone].Place}, you test a rule that turns x into y. When x is 1, 2, 3 and 4, y is ${andList([1, 2, 3, 4].map((x) => a * x + (sub ? -b : b)))}. ` +
      `Write the rule as an expression in x (the part after y =).`,
    expected: ({ a, b, sub }) => `${a}x${sub ? "-" : "+"}${b}`,
    solution: ({ a, b, sub }) =>
      `y goes up by ${a} each time x goes up by 1, so the rule starts ${a}x. When x = 1, ${a}x gives ${a} but y is ${a + (sub ? -b : b)}, ` +
      `so ${sub ? "subtract" : "add"} ${b}. The rule is ${a}x${sub ? "-" : "+"}${b}.`,
  },
  {
    id: "u09-huts-02",
    unit: 9,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params: (rng) => ({ d: int(rng, 3, 5), n: int(rng, 6, 12) }),
    prompt: ({ d, n }, zone) =>
      `${Z[zone].Place}, one hut uses ${d + 1} ${Z[zone].wood}. Each extra hut built beside it shares a wall, so it needs only ${d} more ${Z[zone].wood}. ` +
      `How many ${Z[zone].wood} do ${n} huts in a row need?`,
    expected: ({ d, n }) => d * n + 1,
    solution: ({ d, n }) =>
      `The first hut uses ${d + 1}. The other ${n - 1} huts use ${d} each: ${n - 1} ${TIMES} ${d} = ${d * (n - 1)}. ` +
      `Total: ${d + 1} + ${d * (n - 1)} = ${d * n + 1}.`,
  },
  {
    id: "u09-sum-rule-02",
    unit: 9,
    difficulty: 2,
    resource: "food",
    format: INT,
    params: (rng) => ({ a: int(rng, 2, 5), b: int(rng, 3, 8) }),
    prompt: ({ a, b }, zone) =>
      `${Z[zone].Place}, you gather ${a} ${Z[zone].food} on day 1 and ${b} on day 2. After that, each day you gather as many as the ` +
      `two previous days added together. How many ${Z[zone].food} do you gather on day 6?`,
    expected: ({ a, b }) => 3 * a + 5 * b,
    solution: ({ a, b }) =>
      `Day 3 = ${a} + ${b} = ${a + b}. Day 4 = ${b} + ${a + b} = ${a + 2 * b}. ` +
      `Day 5 = ${a + b} + ${a + 2 * b} = ${2 * a + 3 * b}. Day 6 = ${a + 2 * b} + ${2 * a + 3 * b} = ${3 * a + 5 * b}.`,
  },
  {
    id: "u09-constant-step-02",
    unit: 9,
    difficulty: 2,
    resource: "stone",
    format: CHOICE,
    params: (rng) => ({ a: int(rng, 2, 4), d: int(rng, 5, 9), x: int(rng, 0, 4), y: int(rng, 1, 4) }),
    prompt: ({ a, d }, zone) =>
      `${Z[zone].Place}, four plans for gathering ${Z[zone].stone} each give ${a} on day 1 and ${a + d} on day 2. ` +
      `Which plan goes up by the same amount every day?`,
    // Five wrong plans, two left out by the seed (never the same pair for every seed).
    options: ({ a, d, x, y }) => {
      const show = (t: number[]) => t.join(", ");
      const wrong = [
        show([a, a + d, a + 2 * d + 1, a + 3 * d + 3]),
        show([a, a + d, a + 2 * d - 1, a + 3 * d - 3]),
        show([a, a + d, a + 2 * d - 2, a + 3 * d - 6]),
        show([a, a + d, 2 * a + 2 * d, 4 * a + 4 * d]),
        show([a, a + d, 2 * a + d, 3 * a + 2 * d]),
      ];
      const first = x;
      const second = (x + y) % 5;
      return [show(firstFour(a, d)), ...wrong.filter((_, i) => i !== first && i !== second)];
    },
    expected: ({ a, d }) => firstFour(a, d).join(", "),
    solution: ({ a, d }) =>
      `Check the gaps. ${firstFour(a, d).join(", ")} goes up by ${d} every time, so the gap is constant. ` +
      `The other plans have gaps that grow, shrink or change.`,
  },

  // ---------------- Difficulty 3 ----------------
  {
    id: "u09-first-exceed-03",
    unit: 9,
    difficulty: 3,
    resource: "food",
    format: INT,
    params: (rng) => {
      const d = int(rng, 3, 8);
      return { d, c: int(rng, 2, 9), k: int(rng, 6, 15), r: int(rng, 0, d - 1) };
    },
    prompt: ({ d, c, k, r }, zone) =>
      `${Z[zone].Place}, the number of ${Z[zone].food} in your stockpile on day n is ${d}n + ${c}. ` +
      `On which day does it first hold more than ${d * k + c + r} ${Z[zone].food}?`,
    expected: ({ k }) => k + 1,
    solution: ({ d, c, k, r }) =>
      `Day ${k} holds ${d} ${TIMES} ${k} + ${c} = ${d * k + c}, which is not more than ${d * k + c + r}. ` +
      `Day ${k + 1} holds ${d} ${TIMES} ${k + 1} + ${c} = ${d * (k + 1) + c}, which is more. So it is day ${k + 1}.`,
  },
  {
    id: "u09-member-03",
    unit: 9,
    difficulty: 3,
    resource: "wood",
    format: CHOICE,
    params: (rng) => {
      const d = int(rng, 4, 9);
      return { d, c: int(rng, 2, d - 2), k: int(rng, 5, 15), drop: int(rng, 0, 3) };
    },
    prompt: ({ d, c }, zone) =>
      `${Z[zone].Place}, the number of ${Z[zone].wood} in row n of a path is ${d}n + ${c}. ` +
      `Which of these could be the number in one of the rows?`,
    options: ({ d, c, k, drop }) => {
      const t = d * k + c;
      return [`${t}`, ...[t + 1, t - 1, t + c, d * k].filter((_, i) => i !== drop).map(String)];
    },
    expected: ({ d, c, k }) => `${d * k + c}`,
    solution: ({ d, c, k }) =>
      `Every row is ${c} more than a multiple of ${d}. ${d * k + c} ${MINUS} ${c} = ${d * k} = ${d} ${TIMES} ${k}, ` +
      `so ${d * k + c} is row ${k}. For the other numbers, taking away ${c} does not leave a multiple of ${d}.`,
  },
  {
    id: "u09-two-plans-03",
    unit: 9,
    difficulty: 3,
    resource: "wood",
    format: INT,
    params: (rng) => {
      const e = int(rng, 1, 4);
      const n0 = int(rng, 4, 12);
      const cA = int(rng, 2, 15);
      return { e, n0, cA, cB: cA + e * n0, dB: int(rng, 2, 6) };
    },
    prompt: ({ e, cA, cB, dB }, zone) =>
      `${Z[zone].Place}, after n days, Team A has collected ${co(dB + e)}n + ${cA} ${Z[zone].wood} and Team B has collected ` +
      `${co(dB)}n + ${cB} ${Z[zone].wood}. After how many days do they have the same number?`,
    expected: ({ n0 }) => n0,
    solution: ({ e, cA, cB, dB }) =>
      `Set them equal: ${co(dB + e)}n + ${cA} = ${co(dB)}n + ${cB}. Subtract ${co(dB)}n from both sides: ${co(e)}n + ${cA} = ${cB}. ` +
      `Subtract ${cA}: ${co(e)}n = ${cB - cA}${e === 1 ? "" : `, so n = ${(cB - cA) / e}`}.`,
  },
  {
    id: "u09-reverse-nth-03",
    unit: 9,
    difficulty: 3,
    resource: "water",
    format: EXPR,
    params: (rng) => ({ d: int(rng, 2, 8), c: int(rng, 1, 9), p: int(rng, 2, 4), g: int(rng, 3, 5) }),
    prompt: ({ d, c, p, g }, zone) =>
      `${Z[zone].Place}, the litres of ${Z[zone].water} you record go up by the same amount every day. Day ${p} has ${d * p + c} litres ` +
      `and day ${p + g} has ${d * (p + g) + c} litres. Write an expression, in terms of n, for the litres on day n.`,
    expected: ({ d, c }) => `${d}n+${c}`,
    solution: ({ d, c, p, g }) =>
      `From day ${p} to day ${p + g} is ${g} steps, and the amount rises by ${d * (p + g) + c} ${MINUS} ${d * p + c} = ${d * g}, ` +
      `so each step is ${d * g} ${DIV} ${g} = ${d}. The rule starts ${d}n; day ${p} would be ${d * p} but is ${d * p + c}, so add ${c}. ` +
      `The n-th term is ${d}n+${c}.`,
  },
  {
    id: "u09-square-nth-03",
    unit: 9,
    difficulty: 3,
    resource: "stone",
    format: EXPR,
    params: (rng) => ({ c: int(rng, 1, 9) }),
    prompt: ({ c }, zone) =>
      `${Z[zone].Place}, the layers of a pyramid hold ${andList([1, 4, 9, 16].map((s) => s + c))} ${Z[zone].stone}. ` +
      `The gaps between terms are not equal. Write an expression, in terms of n, for layer n.`,
    expected: ({ c }) => `n^2+${c}`,
    solution: ({ c }) =>
      `The square numbers are 1, 4, 9, 16. Each term is ${c} more than a square number, so the n-th term is n^2+${c}.`,
  },
  {
    id: "u09-chain-machine-03",
    unit: 9,
    difficulty: 3,
    resource: "water",
    format: INT,
    params: (rng) => ({
      x: int(rng, 2, 8),
      a: int(rng, 2, 4),
      b: int(rng, 1, 8),
      c: int(rng, 2, 4),
      e: int(rng, 1, 9),
    }),
    prompt: ({ a, b, c, e, x }, zone) =>
      `${Z[zone].Place}, two machines are joined. The first multiplies by ${a} then adds ${b}. The second multiplies by ${c} ` +
      `then subtracts ${e}. The final output is ${c * (a * x + b) - e}. What was put into the first machine?`,
    expected: ({ x }) => x,
    solution: ({ a, b, c, e, x }) =>
      `Work backwards through the second machine: ${c * (a * x + b) - e} + ${e} = ${c * (a * x + b)}, then ${DIV} ${c} = ${a * x + b}. ` +
      `Through the first: ${a * x + b} ${MINUS} ${b} = ${a * x}, then ${DIV} ${a} = ${x}.`,
  },
];
