/**
 * Unit 12 bank: probability.
 * Original templates written for this game. Difficulty 1 = one-step
 * probability, the complement, likelihood words, relative frequency;
 * 2 = listing outcomes, expected counts, missing probabilities, comparing
 * chances; 3 = overlapping groups, combining sources, claims about a set of
 * probabilities, multi-step expected counts. Typed answers are decimals with
 * at most 2 places (the prompt says "Give a decimal"); fractions are offered
 * as choices in simplest form.
 */
import type { QuestionTemplate } from "@/lib/questions/types";
import { coprimePair, gcd, int } from "@/lib/questions/random";
import { ZONE_WORDS as Z } from "@/content/units/zones";

const INT = { kind: "integer" } as const;
const DEC = { kind: "decimal", places: 2 } as const;
const CHOICE = { kind: "choice", options: [] as string[] } as const;
const MINUS = "−";
const TIMES = "×";
const DIV = "÷";
/** A probability given in hundredths, written as a decimal ("35" -> "0.35", "30" -> "0.3"). */
const dec = (hundredths: number) => String(hundredths / 100);
/** Exact 2-place decimal of a ratio whose denominator divides 100. */
const ratio = (a: number, b: number) => Number(((a / b)).toFixed(2));
/** A total written to 2 places so the options have matching lengths ("1.00"). */
const tot = (hundredths: number) => (hundredths / 100).toFixed(2);
const reduce = (n: number, d: number) => `${n / gcd(n, d)}/${d / gcd(n, d)}`;
const WORDS = ["Impossible", "Unlikely", "Even chance", "Likely", "Certain"];
const counters = (n: number, colour: string) => (n === 0 ? `no ${colour} counters` : `${n} ${colour} counters`);
const DENOMS = [10, 20, 25, 50];

/** Number of ways two spinners numbered 1 to 5 give a total of t. */
const ways5 = (t: number) => Math.max(0, Math.min(t - 1, 11 - t));

export const UNIT_12: QuestionTemplate[] = [
  // ---------------- Difficulty 1 ----------------
  {
    id: "u12-simple-prob-01",
    unit: 12,
    difficulty: 1,
    resource: "stone",
    format: DEC,
    params: (rng) => {
      const N = [4, 5, 10, 20, 25, 50][int(rng, 0, 5)];
      return { N, r: int(rng, 1, N - 1) };
    },
    prompt: ({ N, r }, zone) =>
      `${Z[zone].Place}, a bag holds ${N} shells of the same size and ${r} of them are white. You take one without looking. ` +
      `What is the probability that it is white? Give a decimal.`,
    expected: ({ N, r }) => ratio(r, N),
    solution: ({ N, r }) =>
      `Probability = white shells ${DIV} all shells = ${r} ${DIV} ${N} = ${ratio(r, N)}.`,
  },
  {
    id: "u12-complement-01",
    unit: 12,
    difficulty: 1,
    resource: "water",
    format: DEC,
    params: (rng) => ({ q: 5 * int(rng, 2, 18) }),
    prompt: ({ q }, zone) =>
      `${Z[zone].Place}, the chance of a storm tomorrow is ${dec(q)}. What is the probability that there is no storm? Give a decimal.`,
    expected: ({ q }) => (100 - q) / 100,
    solution: ({ q }) =>
      `The probabilities of an event and its opposite add up to 1, so P(no storm) = 1 ${MINUS} ${dec(q)} = ${dec(100 - q)}.`,
  },
  {
    id: "u12-chance-words-01",
    unit: 12,
    difficulty: 1,
    resource: "food",
    format: CHOICE,
    params: (rng) => {
      const s = int(rng, 0, 4);
      const red = [0, int(rng, 2, 3), 0, int(rng, 10, 16), int(rng, 4, 15)][s];
      const same = int(rng, 3, 9);
      const blue = [int(rng, 4, 15), int(rng, 12, 16), 0, int(rng, 2, 3), 0][s];
      return s === 2 ? { s, red: same, blue: same, drop: int(rng, 0, 3) } : { s, red, blue, drop: int(rng, 0, 3) };
    },
    prompt: ({ red, blue }, zone) =>
      `${Z[zone].Place}, a bag holds ${counters(red, "red")} and ${counters(blue, "blue")}. ` +
      `You pick one counter without looking. How likely is it to be red?`,
    options: ({ s, drop }) => [WORDS[s], ...WORDS.filter((_, i) => i !== s).filter((_, i) => i !== drop)],
    expected: ({ s }) => WORDS[s],
    solution: ({ s, red, blue }) =>
      `${
        [
          `There are no red counters, so a red one cannot be picked.`,
          `Only ${red} of the ${red + blue} counters are red, which is a small share.`,
          `There are as many red as blue counters, so red and blue are equally likely.`,
          `${red} of the ${red + blue} counters are red, which is most of them.`,
          `Every counter is red, so a red one is sure to be picked.`,
        ][s]
      } The best word is ${WORDS[s]}.`,
  },
  {
    id: "u12-fraction-choice-01",
    unit: 12,
    difficulty: 1,
    resource: "wood",
    format: CHOICE,
    params: (rng) => {
      for (let i = 0; i < 100; i++) {
        const r = int(rng, 2, 8);
        const b = int(rng, 2, 8);
        const g = int(rng, 2, 8);
        const N = r + b + g;
        const set = [reduce(b, N), reduce(b, r + g), reduce(r + g, N), reduce(b, r), reduce(g, N)];
        if (r !== b && b !== g && r !== g && N !== 2 * b && new Set(set).size === 5 && !set.some((x) => x.endsWith("/1"))) return { r, b, g, drop: int(rng, 0, 3) };
      }
      return { r: 2, b: 3, g: 5, drop: 0 };
    },
    prompt: ({ r, b, g }, zone) =>
      `${Z[zone].Place}, a pouch holds ${r} red shells, ${b} blue shells and ${g} green shells. You pick one without looking. ` +
      `What is the probability that it is blue? Give a fraction in its simplest form.`,
    options: ({ r, b, g, drop }) => {
      const N = r + b + g;
      return [reduce(b, N), ...[reduce(b, r + g), reduce(r + g, N), reduce(b, r), reduce(g, N)].filter((_, i) => i !== drop)];
    },
    expected: ({ r, b, g }) => reduce(b, r + b + g),
    solution: ({ r, b, g }) => {
      const N = r + b + g;
      return (
        `There are ${r} + ${b} + ${g} = ${N} shells and ${b} are blue, so P(blue) = ${b}/${N}` +
        `${gcd(b, N) > 1 ? `, which simplifies to ${reduce(b, N)}` : `, which is already in simplest form`}. ` +
        `The answer is ${reduce(b, N)}.`
      );
    },
  },
  {
    id: "u12-die-01",
    unit: 12,
    difficulty: 1,
    resource: "water",
    format: DEC,
    params: (rng) => ({ k: int(rng, 3, 8), less: int(rng, 0, 1) }),
    prompt: ({ k, less }, zone) =>
      `${Z[zone].Place}, you roll a fair 10-sided die numbered 1 to 10. What is the probability of a number ${less ? "less" : "greater"} than ${k}? ` +
      `Give a decimal.`,
    expected: ({ k, less }) => (less ? k - 1 : 10 - k) / 10,
    solution: ({ k, less }) =>
      `${less ? `The numbers 1 to ${k - 1}` : `The numbers ${k + 1} to 10`} make ${less ? k - 1 : 10 - k} favourable outcomes out of 10. ` +
      `${less ? k - 1 : 10 - k} ${DIV} 10 = ${(less ? k - 1 : 10 - k) / 10}.`,
  },
  {
    id: "u12-relative-freq-01",
    unit: 12,
    difficulty: 1,
    resource: "food",
    format: DEC,
    params: (rng) => {
      const n = DENOMS[int(rng, 0, 3)];
      return { n, h: int(rng, 1, n - 1) };
    },
    prompt: ({ n, h }, zone) =>
      `${Z[zone].Place}, you set a snare ${n} times and it catches something on ${h} of those times. ` +
      `What is the relative frequency of a catch? Give a decimal.`,
    expected: ({ n, h }) => ratio(h, n),
    solution: ({ n, h }) =>
      `Relative frequency = number of catches ${DIV} number of tries = ${h} ${DIV} ${n} = ${ratio(h, n)}.`,
  },

  // ---------------- Difficulty 2 ----------------
  {
    id: "u12-outcomes-02",
    unit: 12,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params: (rng) => ({ a: int(rng, 3, 6), b: int(rng, 3, 8) }),
    prompt: ({ a, b }, zone) =>
      `${Z[zone].Place}, you spin two spinners. The first is numbered 1 to ${a} and the second is numbered 1 to ${b}. ` +
      `How many different pairs of results are possible?`,
    expected: ({ a, b }) => a * b,
    solution: ({ a, b }) =>
      `Each of the ${a} results on the first spinner can go with any of the ${b} results on the second: ${a} ${TIMES} ${b} = ${a * b}.`,
  },
  {
    id: "u12-expected-02",
    unit: 12,
    difficulty: 2,
    resource: "food",
    format: INT,
    params: (rng) => {
      const [a, b] = coprimePair(rng, 2, 9, true);
      return { a, b, k: int(rng, 3, 12) };
    },
    prompt: ({ a, b, k }, zone) =>
      `${Z[zone].Place}, the chance that your trap catches something on any night is ${a}/${b}. ` +
      `Over ${b * k} nights, about how many nights would you expect a catch?`,
    expected: ({ a, k }) => a * k,
    solution: ({ a, b, k }) =>
      `Expected number = probability ${TIMES} number of nights = ${a}/${b} ${TIMES} ${b * k}. ${b * k} ${DIV} ${b} = ${k}, then ${k} ${TIMES} ${a} = ${a * k}.`,
  },
  {
    id: "u12-missing-prob-02",
    unit: 12,
    difficulty: 2,
    resource: "water",
    format: DEC,
    params: (rng) => {
      for (let i = 0; i < 100; i++) {
        const q1 = 5 * int(rng, 2, 8);
        const q2 = 5 * int(rng, 2, 8);
        const q3 = 5 * int(rng, 2, 8);
        if (q1 + q2 + q3 <= 90) return { q1, q2, q3 };
      }
      return { q1: 20, q2: 30, q3: 15 };
    },
    prompt: ({ q1, q2, q3 }, zone) =>
      `${Z[zone].Place}, a spinner has four colours. The probability of red is ${dec(q1)}, blue is ${dec(q2)} and green is ${dec(q3)}. ` +
      `The rest of the spinner is yellow. What is the probability of yellow? Give a decimal.`,
    expected: ({ q1, q2, q3 }) => (100 - q1 - q2 - q3) / 100,
    solution: ({ q1, q2, q3 }) =>
      `${dec(q1)} + ${dec(q2)} + ${dec(q3)} = ${dec(q1 + q2 + q3)}. All four probabilities add to 1, so yellow is 1 ${MINUS} ${dec(q1 + q2 + q3)} = ${dec(100 - q1 - q2 - q3)}.`,
  },
  {
    id: "u12-total-from-prob-02",
    unit: 12,
    difficulty: 2,
    resource: "stone",
    format: INT,
    params: (rng) => {
      const [a, b] = coprimePair(rng, 2, 9, true);
      return { a, b, k: int(rng, 2, 6) };
    },
    prompt: ({ a, b, k }, zone) =>
      `${Z[zone].Place}, a bag holds counters of several colours. The probability of picking a white counter is ${a}/${b}, ` +
      `and there are ${a * k} white counters. How many counters are in the bag?`,
    expected: ({ b, k }) => b * k,
    solution: ({ a, b, k }) =>
      `The white counters are ${a}/${b} of the bag. ${a * k} ${DIV} ${a} = ${k} counters for each 1/${b}, so the whole bag is ${k} ${TIMES} ${b} = ${b * k}.`,
  },
  {
    id: "u12-dice-sum-02",
    unit: 12,
    difficulty: 2,
    resource: "stone",
    format: INT,
    params: (rng) => ({ s: int(rng, 3, 11) }),
    prompt: ({ s }, zone) =>
      `${Z[zone].Place}, you roll two fair six-sided dice, one red and one blue. ` +
      `How many of the 36 equally likely outcomes give a total of ${s}?`,
    expected: ({ s }) => (s <= 7 ? s - 1 : 13 - s),
    solution: ({ s }) => {
      const found: string[] = [];
      for (let r = 1; r <= 6; r++) if (s - r >= 1 && s - r <= 6) found.push(`(${r}, ${s - r})`);
      return `Write each pair as (red, blue). The pairs with a total of ${s} are ${found.join(", ")}. That is ${found.length} outcomes.`;
    },
  },
  {
    id: "u12-predict-02",
    unit: 12,
    difficulty: 2,
    resource: "water",
    format: INT,
    params: (rng) => {
      const n = DENOMS[int(rng, 0, 3)];
      return { n, h: int(rng, 2, n - 1), k: int(rng, 3, 10) };
    },
    prompt: ({ n, h, k }, zone) =>
      `${Z[zone].Place}, you test ${n} seeds and ${h} of them sprout. Using this result, about how many of ${n * k} seeds would you expect to sprout?`,
    expected: ({ h, k }) => h * k,
    solution: ({ n, h, k }) =>
      `${h} out of ${n} sprouted. ${n * k} seeds is ${k} times as many (${n * k} ${DIV} ${n} = ${k}), so expect ${h} ${TIMES} ${k} = ${h * k}.`,
  },
  {
    id: "u12-compare-02",
    unit: 12,
    difficulty: 2,
    resource: "wood",
    format: CHOICE,
    params: (rng) => {
      if (int(rng, 0, 4) === 4) {
        const [p, q] = coprimePair(rng, 2, 7, true);
        const k1 = int(rng, 2, 6);
        let k2 = int(rng, 2, 6);
        if (k2 === k1) k2 = k1 === 6 ? 2 : k1 + 1;
        return { ra: p * k1, na: q * k1, rb: p * k2, nb: q * k2 };
      }
      const trap = int(rng, 0, 1);
      for (let i = 0; i < 300; i++) {
        const na = int(rng, 8, 30);
        const nb = int(rng, 8, 30);
        const ra = int(rng, 2, na - 2);
        const rb = int(rng, 2, nb - 2);
        const aBetter = ra * nb > rb * na;
        const moreReds = ra > rb;
        if (ra * nb !== rb * na && ra !== rb && (trap ? aBetter !== moreReds : aBetter === moreReds)) return { ra, na, rb, nb };
      }
      return { ra: 6, na: 20, rb: 4, nb: 10 };
    },
    prompt: ({ ra, na, rb, nb }, zone) =>
      `${Z[zone].Place}, bag A has ${ra} red counters out of ${na}, and bag B has ${rb} red counters out of ${nb}. ` +
      `You want a red counter. Which bag gives the better chance when you pick one without looking?`,
    options: () => ["Bag A", "Bag B", "Both the same", "Cannot tell without more information"],
    expected: ({ ra, na, rb, nb }) => (ra * nb === rb * na ? "Both the same" : ra * nb > rb * na ? "Bag A" : "Bag B"),
    solution: ({ ra, na, rb, nb }) => {
      const key = ra * nb === rb * na ? "Both the same" : ra * nb > rb * na ? "Bag A" : "Bag B";
      return (
        `Compare ${ra}/${na} and ${rb}/${nb} by cross-multiplying: ${ra} ${TIMES} ${nb} = ${ra * nb} and ${rb} ${TIMES} ${na} = ${rb * na}. ` +
        `${ra * nb === rb * na ? "They are equal" : ra * nb > rb * na ? "The first is bigger, so bag A has the larger fraction" : "The second is bigger, so bag B has the larger fraction"}. ` +
        `Answer: ${key}.`
      );
    },
  },
  {
    id: "u12-fair-check-02",
    unit: 12,
    difficulty: 2,
    resource: "food",
    format: INT,
    params: (rng) => ({ k: int(rng, 5, 15), e: int(rng, 2, 9) }),
    prompt: ({ k, e }, zone) =>
      `${Z[zone].Place}, you roll a fair six-sided die ${6 * k} times and get a six ${k + e} times. ` +
      `How many more sixes is that than you would expect?`,
    expected: ({ e }) => e,
    solution: ({ k, e }) =>
      `A fair die gives a six with probability 1/6, so expect ${6 * k} ${DIV} 6 = ${k} sixes. ${k + e} ${MINUS} ${k} = ${e}.`,
  },

  // ---------------- Difficulty 3 ----------------
  {
    id: "u12-overlap-03",
    unit: 12,
    difficulty: 3,
    resource: "food",
    format: DEC,
    params: (rng) => {
      const N = [20, 25, 50][int(rng, 0, 2)];
      const nei = int(rng, 2, N / 5);
      const u = N - nei;
      const b = int(rng, 2, 6);
      const f = int(rng, b + 2, u - 2);
      return { N, nei, b, f, g: u + b - f };
    },
    prompt: ({ N, f, g, b }, zone) =>
      `${Z[zone].Place}, you ask ${N} survivors what they like to eat. ${f} like fish, ${g} like fruit and ${b} like both. ` +
      `One survivor is picked at random. What is the probability that they like neither? Give a decimal.`,
    expected: ({ N, nei }) => ratio(nei, N),
    solution: ({ N, nei, b, f, g }) =>
      `The ${b} who like both are counted twice, so the number who like at least one is ${f} + ${g} ${MINUS} ${b} = ${f + g - b}. ` +
      `Neither: ${N} ${MINUS} ${f + g - b} = ${nei}. Probability = ${nei} ${DIV} ${N} = ${ratio(nei, N)}.`,
  },
  {
    id: "u12-claim-03",
    unit: 12,
    difficulty: 3,
    resource: "water",
    format: CHOICE,
    params: (rng) => {
      const S = [90, 100, 110, 100, 120, 100][int(rng, 0, 5)];
      for (let i = 0; i < 200; i++) {
        const q1 = 5 * int(rng, 2, 12);
        const q2 = 5 * int(rng, 2, 12);
        const q3 = S - q1 - q2;
        if (q3 >= 10 && q3 <= 60) return { q1, q2, q3, S, w: int(rng, 0, 1) ? 110 : 90 };
      }
      return { q1: 30, q2: 40, q3: 30, S: 100, w: 90 };
    },
    prompt: ({ q1, q2, q3 }, zone) =>
      `${Z[zone].Place}, a friend says a spinner with three colours has probabilities ${dec(q1)} for red, ${dec(q2)} for blue and ${dec(q3)} for green, ` +
      `and no other outcomes. Which statement is correct?`,
    options: ({ S, w }) => {
      const W = S === 100 ? w : 100;
      return [
        `Possible, the total is ${tot(S)}`,
        `Not possible, the total is ${tot(S)}`,
        `Possible, the total is ${tot(W)}`,
        `Not possible, the total is ${tot(W)}`,
      ];
    },
    expected: ({ S }) => `${S === 100 ? "Possible" : "Not possible"}, the total is ${tot(S)}`,
    solution: ({ q1, q2, q3, S }) =>
      `The probabilities of all outcomes must add to exactly 1. ${dec(q1)} + ${dec(q2)} + ${dec(q3)} = ${dec(S)}. ` +
      `Answer: ${S === 100 ? "Possible" : "Not possible"}, the total is ${tot(S)}.`,
  },
  {
    id: "u12-expected-either-03",
    unit: 12,
    difficulty: 3,
    resource: "wood",
    format: INT,
    params: (rng) => ({ k: int(rng, 2, 10), q1: 5 * int(rng, 2, 8), q2: 5 * int(rng, 2, 8) }),
    prompt: ({ k, q1, q2 }, zone) =>
      `${Z[zone].Place}, a spinner lands on red with probability ${dec(q1)} and on blue with probability ${dec(q2)}. You spin it ${20 * k} times. ` +
      `About how many times would you expect it to land on red or blue?`,
    expected: ({ k, q1, q2 }) => (20 * k * (q1 + q2)) / 100,
    solution: ({ k, q1, q2 }) =>
      `Red and blue cannot both happen on one spin, so P(red or blue) = ${dec(q1)} + ${dec(q2)} = ${dec(q1 + q2)}. ` +
      `Expected number = ${20 * k} ${TIMES} ${dec(q1 + q2)} = ${(20 * k * (q1 + q2)) / 100}.`,
  },
  {
    id: "u12-add-red-03",
    unit: 12,
    difficulty: 3,
    resource: "stone",
    format: INT,
    params: (rng) => {
      const [p, q] = [[1, 2], [2, 3], [3, 4], [3, 5], [4, 5]][int(rng, 0, 4)];
      const m = int(rng, 3, 8);
      return { p, q, m, r: int(rng, 1, p * m - 1) };
    },
    prompt: ({ p, q, m, r }, zone) =>
      `${Z[zone].Place}, a bag has ${r} red and ${(q - p) * m} blue counters. ` +
      `How many red counters must you add so that the probability of picking red is ${p}/${q}?`,
    expected: ({ p, m, r }) => p * m - r,
    solution: ({ p, q, m, r }) =>
      `The ${(q - p) * m} blue counters stay the same. After adding, blue is ${q - p}/${q} of the bag, so the bag holds ${(q - p) * m} ${DIV} ${q - p} ${TIMES} ${q} = ${q * m} counters, ` +
      `and ${p}/${q} of ${q * m} = ${p * m} are red. Add ${p * m} ${MINUS} ${r} = ${p * m - r}.`,
  },
  {
    id: "u12-two-spinners-03",
    unit: 12,
    difficulty: 3,
    resource: "water",
    format: DEC,
    params: (rng) => ({ k: int(rng, 4, 9) }),
    prompt: ({ k }, zone) =>
      `${Z[zone].Place}, you spin two fair spinners, each numbered 1 to 5, and add the two results. ` +
      `What is the probability that the total is more than ${k}? Give a decimal.`,
    expected: ({ k }) => {
      let c = 0;
      for (let t = k + 1; t <= 10; t++) c += ways5(t);
      return (c * 4) / 100;
    },
    solution: ({ k }) => {
      let c = 0;
      const parts: string[] = [];
      for (let t = k + 1; t <= 10; t++) {
        c += ways5(t);
        parts.push(`${t} in ${ways5(t)} ${ways5(t) === 1 ? "way" : "ways"}`);
      }
      return `There are 5 ${TIMES} 5 = 25 equally likely pairs. Totals above ${k}: ${parts.join(", ")}. That is ${c} pairs. ${c} ${DIV} 25 = ${(c * 4) / 100}.`;
    },
  },
  {
    id: "u12-combine-bags-03",
    unit: 12,
    difficulty: 3,
    resource: "stone",
    format: DEC,
    params: (rng) => {
      const T = [20, 25, 50][int(rng, 0, 2)];
      let na = int(rng, 5, T - 5);
      if (2 * na === T) na += 1;
      const nb = T - na;
      return { T, na, ra: int(rng, 1, na - 1), rb: int(rng, 1, nb - 1) };
    },
    prompt: ({ T, na, ra, rb }, zone) =>
      `${Z[zone].Place}, bag A holds ${na} counters and ${ra} are red. Bag B holds ${T - na} counters and ${rb} are red. ` +
      `Both bags are emptied into one box and you pick a counter. What is the probability it is red? Give a decimal.`,
    expected: ({ T, ra, rb }) => ratio(ra + rb, T),
    solution: ({ T, na, ra, rb }) =>
      `Red counters: ${ra} + ${rb} = ${ra + rb}. All counters: ${na} + ${T - na} = ${T}. Probability = ${ra + rb} ${DIV} ${T} = ${ratio(ra + rb, T)}.`,
  },
];
