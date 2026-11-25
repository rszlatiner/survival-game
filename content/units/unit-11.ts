/**
 * Unit 11 sample bank: ratio and proportion.
 * Original templates written for this game. Difficulty 1 = one-step ratio or
 * unitary method; 2 = two-step; 3 = inverse proportion or multi-step.
 * Numbers are chosen backwards from a clean answer, so every answer is a
 * positive integer (or, for the one decimal template, at most 2 places).
 */
import type { QuestionTemplate } from "@/lib/questions/types";
import { coprimePair, gcd, int } from "@/lib/questions/random";
import { ZONE_WORDS as Z } from "@/content/units/zones";

const INT = { kind: "integer" } as const;
const CHOICE = { kind: "choice", options: [] as string[] } as const;
const people = (n: number) => (n === 1 ? "1 person" : `${n} people`);
const parts = (n: number) => (n === 1 ? "1 part" : `${n} parts`);

export const UNIT_11: QuestionTemplate[] = [
  // ---------------- Difficulty 1 ----------------
  {
    id: "u11-simplify-ratio-01",
    unit: 11,
    difficulty: 1,
    resource: "stone",
    format: CHOICE,
    params(rng) {
      const [a, b] = coprimePair(rng, 1, 7);
      return { a, b, k: int(rng, 2, 8) };
    },
    prompt: ({ a, b, k }, zone) =>
      `${Z[zone].Place}, your building pile has ${a * k} ${Z[zone].stone} and ${b * k} ${Z[zone].wood}. ` +
      `What is the ratio of ${Z[zone].stone} to ${Z[zone].wood} in its simplest form?`,
    options: ({ a, b }) => [`${a}:${b}`, `${b}:${a}`, `${2 * a}:${2 * b}`, `${a}:${a + b}`],
    expected: ({ a, b }) => `${a}:${b}`,
    solution: ({ a, b, k }) =>
      `The highest common factor of ${a * k} and ${b * k} is ${k}. ` +
      `Divide both parts by ${k}: ${a * k}:${b * k} = ${a}:${b}.`,
  },
  {
    id: "u11-unit-amount-01",
    unit: 11,
    difficulty: 1,
    resource: "food",
    format: INT,
    params: (rng) => ({ per: int(rng, 2, 9), n: int(rng, 3, 9) }),
    prompt: ({ per, n }, zone) =>
      `${Z[zone].Place}, ${n} baskets hold ${per * n} ${Z[zone].food} altogether, the same number in each. ` +
      `How many ${Z[zone].food} are in one basket?`,
    expected: ({ per }) => per,
    solution: ({ per, n }) =>
      `Every basket holds the same, so divide the total by the number of baskets. ` +
      `${per * n} ÷ ${n} = ${per}, so one basket holds ${per}.`,
  },
  {
    id: "u11-ratio-part-01",
    unit: 11,
    difficulty: 1,
    resource: "wood",
    format: INT,
    params(rng) {
      const [a, b] = coprimePair(rng, 1, 6);
      return { a, b, k: int(rng, 2, 9) };
    },
    prompt: ({ a, b, k }, zone) =>
      `The raft plan uses ${Z[zone].wood} and lengths of ${Z[zone].rope} in the ratio ${a}:${b}. ` +
      `You have ${b * k} lengths of ${Z[zone].rope}. How many ${Z[zone].wood} do you need?`,
    expected: ({ a, k }) => a * k,
    solution: ({ a, b, k }) =>
      `The rope is ${parts(b)}, so one part is ${b * k} ÷ ${b} = ${k}. ` +
      `The wood is ${parts(a)}: ${a} × ${k} = ${a * k}.`,
  },
  {
    id: "u11-exchange-rate-01",
    unit: 11,
    difficulty: 1,
    resource: "food",
    format: INT,
    params: (rng) => ({ r: int(rng, 2, 6), k: int(rng, 2, 9) }),
    prompt: ({ r, k }, zone) =>
      `The island market swaps ${r} litres of ${Z[zone].water} for 1 bundle of ${Z[zone].food}. ` +
      `How many bundles can you get for ${r * k} litres?`,
    expected: ({ k }) => k,
    solution: ({ r, k }) =>
      `Every ${r} litres buys 1 bundle. ${r * k} ÷ ${r} = ${k}, so you get ${k} bundles.`,
  },
  {
    id: "u11-equivalent-ratio-01",
    unit: 11,
    difficulty: 1,
    resource: "water",
    format: CHOICE,
    params(rng) {
      const [a, b] = coprimePair(rng, 1, 7);
      return { a, b, m: int(rng, 3, 6) };
    },
    prompt: ({ a, b }, zone) =>
      `A survival drink mixes ${Z[zone].water} and fruit juice in the ratio ${a}:${b}. ` +
      `Which ratio is equivalent to ${a}:${b}?`,
    // m >= 3 and a != b keep all four strings different.
    options: ({ a, b, m }) => [
      `${a * m}:${b * m}`,
      `${a + m}:${b + m}`,
      `${a * m}:${b * (m + 1)}`,
      `${b * m}:${a * m}`,
    ],
    expected: ({ a, b, m }) => `${a * m}:${b * m}`,
    solution: ({ a, b, m }) =>
      `Multiply both parts by the same number, ${m}: ${a} × ${m} = ${a * m} and ${b} × ${m} = ${b * m}. ` +
      `So ${a}:${b} = ${a * m}:${b * m}. Adding the same number to both parts does not keep the ratio.`,
  },
  {
    id: "u11-map-scale-01",
    unit: 11,
    difficulty: 1,
    resource: "water",
    format: INT,
    params: (rng) => ({ s: [5, 10, 20, 25, 50][int(rng, 0, 4)], d: int(rng, 2, 12) }),
    prompt: ({ s, d }, zone) =>
      `On your hand-drawn map, 1 cm stands for ${s} m. Fresh water near ${Z[zone].landmark} is ${d} cm ` +
      `from camp on the map. How many metres away is it really?`,
    expected: ({ s, d }) => s * d,
    solution: ({ s, d }) =>
      `The scale is 1 cm : ${s} m, so every map centimetre is ${s} metres. ` +
      `${d} × ${s} = ${s * d}, so the water is ${s * d} m away.`,
  },

  // ---------------- Difficulty 2 ----------------
  {
    id: "u11-share-ratio-01",
    unit: 11,
    difficulty: 2,
    resource: "food",
    format: INT,
    params(rng) {
      const [a, b] = coprimePair(rng, 1, 7);
      return { a, b, k: int(rng, 2, 8) };
    },
    prompt: ({ a, b, k }, zone) =>
      `${Z[zone].Place}, your team catches ${(a + b) * k} ${Z[zone].food} and shares them with a neighbouring ` +
      `team in the ratio ${a}:${b} (yours first). How many ${Z[zone].food} does your team keep?`,
    expected: ({ a, k }) => a * k,
    solution: ({ a, b, k }) =>
      `There are ${a} + ${b} = ${a + b} parts, so one part is ${(a + b) * k} ÷ ${a + b} = ${k}. ` +
      `Your team gets ${parts(a)}: ${a} × ${k} = ${a * k}.`,
  },
  {
    id: "u11-share-ratio-02",
    unit: 11,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params(rng) {
      let a = 1, b = 2, c = 3;
      for (let i = 0; i < 100; i++) {
        a = int(rng, 1, 5);
        b = int(rng, 1, 5);
        c = int(rng, 1, 5);
        if (gcd(gcd(a, b), c) === 1 && !(a === b && b === c)) break;
      }
      return { a, b, c, k: int(rng, 2, 6) };
    },
    prompt: ({ a, b, c, k }, zone) =>
      `Three raft crews split ${(a + b + c) * k} ${Z[zone].wood} in the ratio ${a}:${b}:${c}. ` +
      `How many ${Z[zone].wood} does the third crew get?`,
    expected: ({ c, k }) => c * k,
    solution: ({ a, b, c, k }) =>
      `Total parts: ${a} + ${b} + ${c} = ${a + b + c}. One part is ${(a + b + c) * k} ÷ ${a + b + c} = ${k}. ` +
      `The third crew gets ${c} × ${k} = ${c * k}.`,
  },
  {
    id: "u11-share-difference-01",
    unit: 11,
    difficulty: 2,
    resource: "water",
    format: INT,
    params(rng) {
      const [a, b] = coprimePair(rng, 1, 7, true);
      return { a, b, k: int(rng, 2, 9) };
    },
    prompt: ({ a, b, k }, zone) =>
      `Two camps share some ${Z[zone].water} in the ratio ${a}:${b}. The second camp gets ` +
      `${(b - a) * k} litres more than the first. How many litres were shared altogether?`,
    expected: ({ a, b, k }) => (a + b) * k,
    solution: ({ a, b, k }) =>
      `The difference is ${b} − ${a} = ${parts(b - a)}, so one part is ${(b - a) * k} ÷ ${b - a} = ${k} litres. ` +
      `Total: (${a} + ${b}) × ${k} = ${(a + b) * k} litres.`,
  },
  {
    id: "u11-recipe-scale-01",
    unit: 11,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params(rng) {
      const [p, q] = coprimePair(rng, 2, 7);
      const u = int(rng, 2, 4);
      let v = int(rng, 2, 6);
      if (v === u) v = u + 1;
      return { p, q, u, v };
    },
    prompt: ({ p, q, u, v }, zone) =>
      `${Z[zone].Place}, you can make ${p * u} signal torches from ${q * u} ${Z[zone].wood}. ` +
      `How many ${Z[zone].wood} do you need for ${p * v} torches?`,
    expected: ({ q, v }) => q * v,
    solution: ({ p, q, u, v }) =>
      `Torches to wood is ${p * u}:${q * u}, which simplifies to ${p}:${q}. ` +
      `${p * v} torches is ${v} lots of ${p}, so you need ${v} × ${q} = ${q * v}.`,
  },
  {
    id: "u11-exchange-chain-01",
    unit: 11,
    difficulty: 2,
    resource: "stone",
    format: INT,
    params: (rng) => ({ r1: int(rng, 2, 5), r2: int(rng, 2, 4), s: int(rng, 2, 6) }),
    prompt: ({ r1, r2, s }, zone) =>
      `At the market, ${r1} litres of ${Z[zone].water} buy 1 bundle of ${Z[zone].food}, and ${r2} bundles ` +
      `buy 1 load of ${Z[zone].stone}. How many litres of water do ${s} loads cost?`,
    expected: ({ r1, r2, s }) => r1 * r2 * s,
    solution: ({ r1, r2, s }) =>
      `${s} loads of stone cost ${s} × ${r2} = ${s * r2} bundles of food. ` +
      `Those cost ${s * r2} × ${r1} = ${r1 * r2 * s} litres of water.`,
  },
  {
    id: "u11-best-deal-01",
    unit: 11,
    difficulty: 2,
    resource: "food",
    format: CHOICE,
    params(rng) {
      const a = int(rng, 2, 6);
      const b = int(rng, 2, 9);
      const c = int(rng, 2, 6);
      let d = Math.max(1, Math.floor((b * c) / a) + (rng() < 0.5 ? 0 : 1));
      if (d * a === b * c) d += 1;
      return { a, b, c, d };
    },
    prompt: ({ a, b, c, d }, zone) =>
      `Trader A gives ${b} ${Z[zone].food} for ${a} litres of ${Z[zone].water}. ` +
      `Trader B gives ${d} ${Z[zone].food} for ${c} litres. Which trader gives more food for each litre?`,
    options: () => ["Trader A", "Trader B", "Both the same"],
    expected: ({ a, b, c, d }) => (b * c > d * a ? "Trader A" : "Trader B"),
    solution: ({ a, b, c, d }) => {
      const win = b * c > d * a ? "Trader A" : "Trader B";
      return (
        `Food per litre: A is ${b}/${a} = ${b * c}/${a * c} and B is ${d}/${c} = ${d * a}/${a * c}. ` +
        `${Math.max(b * c, d * a)}/${a * c} is bigger, so ${win} gives more food for each litre.`
      );
    },
  },
  {
    id: "u11-ratio-total-01",
    unit: 11,
    difficulty: 2,
    resource: "stone",
    format: INT,
    params(rng) {
      const [a, b] = coprimePair(rng, 1, 7);
      return { a, b, k: int(rng, 2, 9) };
    },
    prompt: ({ a, b, k }, zone) =>
      `${Z[zone].Place}, a shelter wall uses ${Z[zone].wood} and ${Z[zone].stone} in the ratio ${a}:${b}. ` +
      `You have used ${b * k} ${Z[zone].stone}. How many pieces have you used altogether?`,
    expected: ({ a, b, k }) => (a + b) * k,
    solution: ({ a, b, k }) =>
      `One part is ${b * k} ÷ ${b} = ${k}, so the wood is ${a} × ${k} = ${a * k}. ` +
      `Altogether: ${a * k} + ${b * k} = ${(a + b) * k} pieces.`,
  },
  {
    id: "u11-fill-time-01",
    unit: 11,
    difficulty: 2,
    resource: "water",
    format: { kind: "decimal", places: 2 },
    params(rng) {
      const L = [2, 4, 5, 10][int(rng, 0, 3)];
      let M = int(rng, 3, 30);
      if (M === L) M += 1;
      return { L, T: int(rng, 3, 12), M };
    },
    prompt: ({ L, T, M }, zone) =>
      `A dripping rock ${Z[zone].place} fills a ${L}-litre pot with ${Z[zone].water} in ${T} minutes. ` +
      `At the same rate, how many minutes will ${M} litres take? Give a decimal if needed.`,
    // L is 2, 4, 5 or 10, so T*M/L has at most 2 decimal places.
    expected: ({ L, T, M }) => (T * M) / L,
    solution: ({ L, T, M }) =>
      `Each litre takes ${T} ÷ ${L} = ${T / L} minutes. ` +
      `${M} litres take ${M} × ${T} ÷ ${L} = ${(T * M) / L} minutes.`,
  },

  // ---------------- Difficulty 3 ----------------
  {
    id: "u11-inverse-leave-01",
    unit: 11,
    difficulty: 3,
    resource: "food",
    format: INT,
    // Built backwards: P = g*x people for D = y*m days equals n2 = g*y people for x*m days.
    params(rng) {
      const x = int(rng, 3, 6);
      return { g: int(rng, 1, 4), x, y: int(rng, 2, x - 1), m: int(rng, 2, 5) };
    },
    prompt: ({ g, x, y, m }, zone) => {
      const q = g * (x - y);
      return (
        `${Z[zone].Place}, your ${Z[zone].food} will feed ${g * x} people for ${y * m} days. ` +
        `${people(q)} ${q === 1 ? "leaves" : "leave"} to join another camp. ` +
        `At the same daily ration, how many days will the food last now?`
      );
    },
    expected: ({ x, m }) => x * m,
    solution: ({ g, x, y, m }) =>
      `The food is ${g * x} × ${y * m} = ${g * x * y * m} person-days. ` +
      `Now ${people(g * y)} share it: ${g * x * y * m} ÷ ${g * y} = ${x * m} days.`,
  },
  {
    id: "u11-inverse-arrive-01",
    unit: 11,
    difficulty: 3,
    resource: "water",
    format: INT,
    // Built backwards: P = g*y people for D = x*m days equals g*x people for y*m days (x > y).
    params(rng) {
      const y = int(rng, 2, 5);
      return { g: int(rng, 1, 3), y, x: y + int(rng, 1, 3), m: int(rng, 2, 4) };
    },
    prompt: ({ g, x, y, m }, zone) => {
      const q = g * (x - y);
      return (
        `The ${Z[zone].water} stored ${Z[zone].place} will last ${g * y} people for ${x * m} days. ` +
        `${q} rescued ${q === 1 ? "sailor joins" : "sailors join"} you. ` +
        `If everyone drinks the same amount, how many days will it last now?`
      );
    },
    expected: ({ y, m }) => y * m,
    solution: ({ g, x, y, m }) =>
      `The water is ${g * y} × ${x * m} = ${g * x * y * m} person-days. ` +
      `With ${g * x} people: ${g * x * y * m} ÷ ${g * x} = ${y * m} days.`,
  },
  {
    id: "u11-inverse-workers-01",
    unit: 11,
    difficulty: 3,
    resource: "wood",
    format: INT,
    // P = g*x people for H = y*m hours equals g*y people for x*m hours (y > x).
    params(rng) {
      const x = int(rng, 2, 5);
      return { g: int(rng, 1, 3), x, y: x + int(rng, 1, 4), m: int(rng, 1, 4) };
    },
    prompt: ({ g, x, y, m }, zone) =>
      `${Z[zone].Place}, ${g * x} people can cut enough ${Z[zone].wood} for the raft in ${y * m} hours. ` +
      `A storm means it must be done in ${x * m} hours. ` +
      `At the same rate, how many people must be cutting? Count everyone, including the first ${g * x}.`,
    expected: ({ g, y }) => g * y,
    solution: ({ g, x, y, m }) =>
      `The job is ${g * x} × ${y * m} = ${g * x * y * m} person-hours. ` +
      `In ${x * m} hours you need ${g * x * y * m} ÷ ${x * m} = ${g * y} people working, ` +
      `which is ${g * y - g * x} more than the first ${g * x}.`,
  },
  {
    id: "u11-inverse-choice-01",
    unit: 11,
    difficulty: 3,
    resource: "stone",
    format: CHOICE,
    params(rng) {
      const m = int(rng, 2, 6);
      // o = how many near-miss options sit below the answer, so its rank among the options varies.
      return { f: int(rng, 2, 4), m, P: int(rng, 2, 5), o: Math.min(int(rng, 0, 2), m - 1) };
    },
    prompt: ({ f, m, P }, zone) =>
      `${P} people take ${f * m} days to drag ${Z[zone].stone} up for the signal tower. ` +
      `If ${P * f} people work at the same rate instead, how long will it take?`,
    // Three consecutive near-misses m-o .. m-o+2 (all >= 1) plus one direct-proportion
    // distractor f*f*m >= 4m > m+2, so all four differ. m+1 < f*m (m, f >= 2), so at least
    // two options are below the original time and "pick the smallest" does not work.
    options: ({ f, m, o }) => [
      `${m - o} days`,
      `${m - o + 1} days`,
      `${m - o + 2} days`,
      `${f * f * m} days`,
    ],
    expected: ({ m }) => `${m} days`,
    solution: ({ f, m, P }) =>
      `${P * f} people is ${f} times as many, so the time is divided by ${f} (inverse proportion). ` +
      `${f * m} ÷ ${f} = ${m}, so it takes ${m} days.`,
  },
  {
    id: "u11-share-exchange-01",
    unit: 11,
    difficulty: 3,
    resource: "stone",
    format: INT,
    // Water W = (a+b)*r*j, so your share a*r*j buys exactly a*j loads.
    params(rng) {
      const [a, b] = coprimePair(rng, 1, 5);
      return { a, b, r: int(rng, 2, 5), j: int(rng, 1, 4) };
    },
    prompt: ({ a, b, r, j }, zone) =>
      `You and another camp share ${(a + b) * r * j} litres of ${Z[zone].water} in the ratio ${a}:${b} ` +
      `(yours first). The market gives 1 load of ${Z[zone].stone} for ${r} litres. How many loads can you buy?`,
    expected: ({ a, j }) => a * j,
    solution: ({ a, b, r, j }) =>
      `One part is ${(a + b) * r * j} ÷ ${a + b} = ${r * j} litres, so your share is ${a} × ${r * j} = ${a * r * j} litres. ` +
      `${a * r * j} ÷ ${r} = ${a * j} loads.`,
  },
  {
    id: "u11-ratio-change-01",
    unit: 11,
    difficulty: 3,
    resource: "wood",
    format: INT,
    // The target c:b must be in lowest terms (never 6:2): step c up until it is coprime with b.
    // Any 4 consecutive integers include one coprime with b <= 6, so c stays within a+1..a+7.
    params(rng) {
      const [a, b] = coprimePair(rng, 1, 6);
      const k = int(rng, 2, 6);
      let c = a + int(rng, 1, 4);
      while (gcd(c, b) !== 1) c++;
      return { a, b, k, c };
    },
    prompt: ({ a, b, k, c }, zone) =>
      `${Z[zone].Place}, your stockpile has ${Z[zone].wood} and ${Z[zone].stone} in the ratio ${a}:${b}. ` +
      `You have ${b * k} ${Z[zone].stone}. How many more ${Z[zone].wood} must you collect to make the ratio ${c}:${b}?`,
    expected: ({ a, k, c }) => (c - a) * k,
    solution: ({ a, b, k, c }) =>
      `One part is ${b * k} ÷ ${b} = ${k}. You have ${a} × ${k} = ${a * k} wood and need ${c} × ${k} = ${c * k}. ` +
      `Collect ${c * k} − ${a * k} = ${(c - a) * k} more.`,
  },
];
