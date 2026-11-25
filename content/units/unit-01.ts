/**
 * Unit 1 bank: number and calculation.
 * Original templates written for this game. Difficulty 1 = one-step recall or
 * application; 2 = two-step or a rule applied in context; 3 = multi-step
 * reasoning, reverse problems or checking a claim.
 * Numbers are built backwards from a clean answer, so every answer is exact.
 */
import type { QuestionTemplate } from "@/lib/questions/types";
import { coprimePair, gcd, int } from "@/lib/questions/random";
import { ZONE_WORDS as Z } from "@/content/units/zones";

const INT = { kind: "integer" } as const;
const CHOICE = { kind: "choice", options: [] as string[] } as const;
const SUP: Record<number, string> = { 2: "²", 3: "³", 4: "⁴" };
/** A minus sign that reads clearly: U+2212 for negatives. */
const sg = (n: number) => (n < 0 ? `−${-n}` : `${n}`);
const lcm = (a: number, b: number) => (a * b) / gcd(a, b);
const factorCount = (n: number) => {
  let c = 0;
  for (let i = 1; i <= n; i++) if (n % i === 0) c++;
  return c;
};
const factorList = (n: number) => {
  const out: number[] = [];
  for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i);
  return out;
};
const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};

/** Choose `n` distinct indexes of `pool` whose values differ from each other and from `correct`. */
function pickIdx(rng: () => number, pool: number[], correct: number, n: number): number[] {
  for (let tries = 0; tries < 200; tries++) {
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

const fpow = (p: number, e: number) => (e === 1 ? `${p}` : `${p}${SUP[e]}`);
const PRIME_PAIRS: Array<[number, number]> = [[2, 3], [2, 5], [3, 5], [2, 7], [3, 7]];
const EXP_PAIRS: Array<[number, number]> = [[2, 1], [3, 1], [1, 2], [3, 2], [1, 3], [2, 3]];

const dropPool = (p: Record<string, number>) => {
  const final = p.t - p.n * p.d;
  return [Math.abs(final), p.t - p.d, final - p.d, final + p.d, p.t + p.n * p.d, p.d - p.t];
};
const betweenPool = (k: number, N: number): Array<[number, number]> => [
  [k - 1, k], [k + 1, k + 2], [k - 2, k - 1], [Math.floor(N / 2), Math.floor(N / 2) + 1], [k + 2, k + 3], [k + 3, k + 4],
];

export const UNIT_01: QuestionTemplate[] = [
  // ---------------- Difficulty 1 ----------------
  {
    id: "u01-negative-rise-01",
    unit: 1,
    difficulty: 1,
    resource: "water",
    format: INT,
    params: (rng) => ({ a: int(rng, 2, 9), b: int(rng, 2, 9) }),
    prompt: ({ a, b }, zone) =>
      `${Z[zone].Place}, the night temperature drops to −${a} °C. By midday it reaches ${b} °C. ` +
      `By how many degrees has the temperature risen?`,
    expected: ({ a, b }) => a + b,
    solution: ({ a, b }) =>
      `From −${a} up to 0 is ${a} degrees, and from 0 up to ${b} is ${b} more. ${a} + ${b} = ${a + b}, so it rose ${a + b} degrees.`,
  },
  {
    id: "u01-square-root-01",
    unit: 1,
    difficulty: 1,
    resource: "stone",
    format: INT,
    params: (rng) => ({ k: int(rng, 3, 12) }),
    prompt: ({ k }, zone) =>
      `${Z[zone].Place}, you lay a square floor of ${Z[zone].stone} that covers ${k * k} square metres. ` +
      `How long is one side of the floor, in metres?`,
    expected: ({ k }) => k,
    solution: ({ k }) =>
      `The area of a square is side × side. You need the number that multiplies by itself to give ${k * k}. ` +
      `${k} × ${k} = ${k * k}, so the side is ${k} m.`,
  },
  {
    id: "u01-multiples-01",
    unit: 1,
    difficulty: 1,
    resource: "wood",
    format: INT,
    params(rng) {
      const m = [6, 7, 8, 9, 12][int(rng, 0, 4)];
      return { m, q: int(rng, 3, 9), r: int(rng, 1, m - 1) };
    },
    prompt: ({ m, q, r }, zone) =>
      `${Z[zone].Place}, a raft drifts in with ${Z[zone].wood} every ${m} days (day ${m}, day ${2 * m}, day ${3 * m} and so on). ` +
      `What is the first arrival day after day ${m * q + r}?`,
    expected: ({ m, q }) => m * (q + 1),
    solution: ({ m, q, r }) =>
      `Arrival days are the multiples of ${m}. ${m} × ${q} = ${m * q} is too early (it is before day ${m * q + r}). ` +
      `The next multiple is ${m} × ${q + 1} = ${m * (q + 1)}.`,
  },
  {
    id: "u01-powers-01",
    unit: 1,
    difficulty: 1,
    resource: "food",
    format: INT,
    params: (rng) => ({ a: int(rng, 2, 5), b: int(rng, 2, 4) }),
    prompt: ({ a, b }, zone) =>
      `Your store tally for ${Z[zone].food} is written as ${a}${SUP[b]}. How many ${Z[zone].food} is that?`,
    expected: ({ a, b }) => a ** b,
    solution: ({ a, b }) =>
      `${a}${SUP[b]} means ${a} multiplied by itself ${b} times: ${Array(b).fill(a).join(" × ")} = ${a ** b}.`,
  },
  {
    id: "u01-factor-count-01",
    unit: 1,
    difficulty: 1,
    resource: "water",
    format: INT,
    params: (rng) => ({ N: [12, 16, 18, 20, 24, 28, 30, 36, 40, 45][int(rng, 0, 9)] }),
    prompt: ({ N }, zone) =>
      `${Z[zone].Place}, you have ${N} bottles of ${Z[zone].water} and want equal rows with none left over. ` +
      `How many different row lengths are possible, including 1 and ${N}?`,
    expected: ({ N }) => factorCount(N),
    solution: ({ N }) =>
      `Row lengths must divide ${N} exactly, so they are its factors: ${factorList(N).join(", ")}. ` +
      `That is ${factorCount(N)} factors.`,
  },
  {
    id: "u01-order-ops-01",
    unit: 1,
    difficulty: 1,
    resource: "stone",
    format: INT,
    params: (rng) => ({ a: int(rng, 2, 9), b: int(rng, 2, 6), c: int(rng, 2, 6) }),
    prompt: ({ a, b, c }, zone) =>
      `${Z[zone].Place}, you find ${a} ${Z[zone].stone} in a heap and ${b} bags that each hold ${c}. ` +
      `Work out ${a} + ${b} × ${c} to count them all.`,
    expected: ({ a, b, c }) => a + b * c,
    solution: ({ a, b, c }) =>
      `Multiplication comes before addition. ${b} × ${c} = ${b * c}, then ${a} + ${b * c} = ${a + b * c}.`,
  },

  // ---------------- Difficulty 2 ----------------
  {
    id: "u01-hcf-01",
    unit: 1,
    difficulty: 2,
    resource: "food",
    format: INT,
    params(rng) {
      const [a, b] = coprimePair(rng, 2, 7);
      return { a, b, g: int(rng, 2, 6) };
    },
    prompt: ({ a, b, g }, zone) =>
      `You have ${g * a} ${Z[zone].food} and ${g * b} ${Z[zone].stone} and pack identical bundles, using all of both. ` +
      `What is the greatest number of bundles you can make?`,
    expected: ({ g }) => g,
    solution: ({ a, b, g }) =>
      `The number of bundles must divide both ${g * a} and ${g * b}, so find their highest common factor. ` +
      `${g * a} = ${g} × ${a} and ${g * b} = ${g} × ${b}, and ${a} and ${b} share no factor except 1. The answer is ${g}.`,
  },
  {
    id: "u01-lcm-01",
    unit: 1,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params(rng) {
      const [a, b] = coprimePair(rng, 2, 6);
      return { a, b, g: int(rng, 1, 3) };
    },
    prompt: ({ a, b, g }, zone) =>
      `${Z[zone].Place}, one signal fire flashes every ${g * a} minutes and another every ${g * b} minutes. ` +
      `They flash together now. After how many minutes will they next flash together?`,
    expected: ({ a, b, g }) => g * a * b,
    solution: ({ a, b, g }) =>
      `You need the lowest common multiple of ${g * a} and ${g * b}. Their highest common factor is ${g}, so ` +
      `the LCM is ${g * a} × ${g * b} ÷ ${g} = ${g * a * b}.`,
  },
  {
    id: "u01-prime-factor-01",
    unit: 1,
    difficulty: 2,
    resource: "stone",
    format: CHOICE,
    params(rng) {
      const [p, q] = PRIME_PAIRS[int(rng, 0, PRIME_PAIRS.length - 1)];
      const [a, b] = EXP_PAIRS[int(rng, 0, EXP_PAIRS.length - 1)];
      return { p, q, a, b };
    },
    prompt: ({ p, q, a, b }, zone) =>
      `${Z[zone].Place}, a pile holds ${p ** a * q ** b} ${Z[zone].stone}. Which option writes ${p ** a * q ** b} as a product of prime factors?`,
    options: ({ p, q, a, b }) => [
      `${fpow(p, a)} × ${fpow(q, b)}`,
      `${fpow(p, b)} × ${fpow(q, a)}`,
      `${fpow(p, a + 1)} × ${fpow(q, b)}`,
      `${fpow(p, a)} × ${fpow(q, b + 1)}`,
    ],
    expected: ({ p, q, a, b }) => `${fpow(p, a)} × ${fpow(q, b)}`,
    solution: ({ p, q, a, b }) =>
      `Divide by primes: ${p ** a * q ** b} has ${a} factor${a > 1 ? "s" : ""} of ${p} and ${b} factor${b > 1 ? "s" : ""} of ${q}, ` +
      `so it is ${fpow(p, a)} × ${fpow(q, b)}. Check: ${p ** a} × ${q ** b} = ${p ** a * q ** b}.`,
  },
  {
    id: "u01-negative-calc-01",
    unit: 1,
    difficulty: 2,
    resource: "water",
    format: CHOICE,
    params(rng) {
      for (let i = 0; i < 100; i++) {
        const t = int(rng, 3, 9);
        const d = int(rng, 2, 5);
        const n = int(rng, 3, 5);
        if (t - n * d >= 0) continue;
        const base = { t, d, n };
        try {
          const idx = pickIdx(rng, dropPool(base), t - n * d, 3);
          return { ...base, i: idx[0], j: idx[1], k: idx[2] };
        } catch {
          /* try again */
        }
      }
      return { t: 5, d: 3, n: 3, i: 0, j: 1, k: 4 };
    },
    prompt: ({ t, d, n }, zone) =>
      `${Z[zone].Place}, the temperature at dusk is ${t} °C and it falls by ${d} °C every hour for ${n} hours. ` +
      `What is the temperature then?`,
    options: (p) => {
      const pool = dropPool(p);
      return [p.t - p.n * p.d, pool[p.i], pool[p.j], pool[p.k]].map((v) => `${sg(v)} °C`);
    },
    expected: ({ t, d, n }) => `${sg(t - n * d)} °C`,
    solution: ({ t, d, n }) =>
      `It falls ${n} × ${d} = ${n * d} degrees in total. ${t} − ${n * d} = ${sg(t - n * d)}, ` +
      `so the temperature is ${sg(t - n * d)} °C.`,
  },
  {
    id: "u01-sqrt-between-01",
    unit: 1,
    difficulty: 2,
    resource: "food",
    format: CHOICE,
    params(rng) {
      const k = int(rng, 3, 11);
      const N = k * k + int(rng, 1, 2 * k);
      const pool = betweenPool(k, N).map((x) => x[0]);
      const idx = pickIdx(rng, pool, k, 3);
      return { k, N, i: idx[0], j: idx[1], l: idx[2] };
    },
    prompt: ({ N }, zone) =>
      `${Z[zone].Place}, a square patch of ${Z[zone].food} has an area of ${N} square metres. ` +
      `Between which two whole numbers of metres does the side length lie?`,
    options: ({ k, N, i, j, l }) => {
      const pool = betweenPool(k, N);
      return [[k, k + 1], pool[i], pool[j], pool[l]].map(([x, y]) => `${x} and ${y}`);
    },
    expected: ({ k }) => `${k} and ${k + 1}`,
    solution: ({ k, N }) =>
      `${k} × ${k} = ${k * k} and ${k + 1} × ${k + 1} = ${(k + 1) ** 2}. ${N} is between them, ` +
      `so the side is between ${k} and ${k + 1} metres: ${k} and ${k + 1}.`,
  },
  {
    id: "u01-cube-root-01",
    unit: 1,
    difficulty: 2,
    resource: "stone",
    format: INT,
    params: (rng) => ({ k: int(rng, 2, 7) }),
    prompt: ({ k }, zone) =>
      `${Z[zone].Place}, a cube-shaped pit holds ${k ** 3} cubic metres of ${Z[zone].stone}. ` +
      `What is the area, in square metres, of its square base?`,
    expected: ({ k }) => k * k,
    solution: ({ k }) =>
      `A cube has volume edge × edge × edge. ${k} × ${k} × ${k} = ${k ** 3}, so each edge is ${k} m. ` +
      `The base area is ${k} × ${k} = ${k * k}.`,
  },
  {
    id: "u01-divisible-nine-01",
    unit: 1,
    difficulty: 2,
    resource: "wood",
    format: CHOICE,
    params(rng) {
      const offs = [-4, -3, -2, -1, 1, 2, 3, 4];
      const pick: number[] = [];
      while (pick.length < 3) {
        const o = offs[int(rng, 0, offs.length - 1)];
        if (!pick.includes(o)) pick.push(o);
      }
      return { m: int(rng, 12, 110), o1: pick[0], o2: pick[1], o3: pick[2] };
    },
    prompt: (_p, zone) =>
      `${Z[zone].Place}, you must share a heap of ${Z[zone].wood} equally among 9 teams with none left over. ` +
      `Which heap size works?`,
    options: ({ m, o1, o2, o3 }) => [9 * m, 9 * m + o1, 9 * m + o2, 9 * m + o3].map(String),
    expected: ({ m }) => `${9 * m}`,
    solution: ({ m }) => {
      const s = String(9 * m).split("").map(Number);
      return (
        `A number divides by 9 exactly when its digits add to a multiple of 9. ` +
        `For ${9 * m}: ${s.join(" + ")} = ${s.reduce((a, b) => a + b, 0)}, a multiple of 9, so ${9 * m} works. The other heaps are 1 to 4 away from a multiple of 9.`
      );
    },
  },
  {
    id: "u01-prime-count-01",
    unit: 1,
    difficulty: 2,
    resource: "food",
    format: INT,
    params: (rng) => ({ lo: 10 * int(rng, 1, 7) }),
    prompt: ({ lo }, zone) =>
      `${Z[zone].Place}, your baskets of ${Z[zone].food} are numbered ${lo} to ${lo + 20}, including both ends. ` +
      `Only baskets with a prime number go to the camp. How many baskets is that?`,
    expected: ({ lo }) => {
      let c = 0;
      for (let n = lo; n <= lo + 20; n++) if (isPrime(n)) c++;
      return c;
    },
    solution: ({ lo }) => {
      const ps: number[] = [];
      for (let n = lo; n <= lo + 20; n++) if (isPrime(n)) ps.push(n);
      return `A prime has exactly two factors. Checking each number from ${lo} to ${lo + 20}, the primes are ${ps.join(", ")}. That is ${ps.length} baskets.`;
    },
  },

  // ---------------- Difficulty 3 ----------------
  {
    id: "u01-hcf-lcm-reverse-01",
    unit: 1,
    difficulty: 3,
    resource: "water",
    format: INT,
    params(rng) {
      const [a, b] = coprimePair(rng, 2, 5);
      return { a, b, g: int(rng, 2, 4), s: int(rng, 0, 1) };
    },
    prompt: ({ a, b, g, s }, zone) =>
      `${Z[zone].Place}, two crates hold different numbers of ${Z[zone].water} jugs. The HCF of the two numbers is ${g} ` +
      `and their LCM is ${g * a * b}. One crate holds ${g * (s ? a : b)} jugs. How many does the other hold?`,
    expected: ({ a, b, g, s }) => g * (s ? b : a),
    solution: ({ a, b, g, s }) => {
      const x = g * (s ? a : b);
      return (
        `HCF × LCM equals the product of the two numbers: ${g} × ${g * a * b} = ${g * g * a * b}. ` +
        `The other number is ${g * g * a * b} ÷ ${x} = ${g * (s ? b : a)}.`
      );
    },
  },
  {
    id: "u01-lcm-three-01",
    unit: 1,
    difficulty: 3,
    resource: "stone",
    format: INT,
    params(rng) {
      for (let i = 0; i < 200; i++) {
        const p = int(rng, 2, 10);
        const q = int(rng, 2, 10);
        const r = int(rng, 2, 10);
        if (p === q || q === r || p === r) continue;
        const l = lcm(lcm(p, q), r);
        if (l <= 180 && l > Math.max(p, q, r)) return { p, q, r };
      }
      return { p: 4, q: 6, r: 9 };
    },
    prompt: ({ p, q, r }, zone) =>
      `${Z[zone].Place}, three signal fires flash every ${p}, ${q} and ${r} minutes. They all flash together now. ` +
      `After how many minutes will all three next flash together?`,
    expected: ({ p, q, r }) => lcm(lcm(p, q), r),
    solution: ({ p, q, r }) =>
      `Find the LCM step by step. The LCM of ${p} and ${q} is ${lcm(p, q)}. The LCM of ${lcm(p, q)} and ${r} is ${lcm(lcm(p, q), r)}, ` +
      `the first time all three line up.`,
  },
  {
    id: "u01-power-grow-01",
    unit: 1,
    difficulty: 3,
    resource: "food",
    format: INT,
    params(rng) {
      const r = int(rng, 2, 3);
      return { r, s: [2, 3, 5][int(rng, 0, 2)], d: int(rng, 3, r === 2 ? 5 : 4) };
    },
    prompt: ({ r, s, d }, zone) =>
      `${Z[zone].Place}, a patch of ${Z[zone].food} has ${s} on day 0 and ${r === 2 ? "doubles" : "triples"} every day. ` +
      `On which day does it reach exactly ${s * r ** d}?`,
    expected: ({ d }) => d,
    solution: ({ r, s, d }) => {
      const steps = [s];
      for (let i = 0; i < d; i++) steps.push(steps[i] * r);
      return `Multiply by ${r} each day: ${steps.join(" → ")}. The count reaches ${s * r ** d} after ${d} multiplications, so on day ${d}.`;
    },
  },
  {
    id: "u01-claim-01",
    unit: 1,
    difficulty: 3,
    resource: "wood",
    format: CHOICE,
    params(rng) {
      const set = [3, 7, 11, 13];
      const i = int(rng, 0, 3);
      const j = (i + int(rng, 1, 3)) % 4;
      return { p: set[i], q: set[j], w: int(rng, 0, 1) };
    },
    prompt: ({ p, q }, zone) =>
      `${Z[zone].Place}, you count ${p * q} ${Z[zone].wood}. Which statement about the number ${p * q} is true?`,
    options: ({ p, q, w }) => {
      const N = p * q;
      const r = w ? q : p;
      return [`${N} is a prime number`, `${N} is divisible by ${r}`, `${N} is divisible by ${r + 1}`, `${N} is a square number`];
    },
    expected: ({ p, q, w }) => `${p * q} is divisible by ${w ? q : p}`,
    solution: ({ p, q, w }) =>
      `${p * q} = ${p} × ${q}, so it has factors other than 1 and itself and is not prime. ` +
      `So ${p * q} is divisible by ${w ? q : p}. It is odd, so it cannot divide by ${(w ? q : p) + 1}, and it is not a perfect square.`,
  },
  {
    id: "u01-order-ops-02",
    unit: 1,
    difficulty: 3,
    resource: "wood",
    format: INT,
    params(rng) {
      for (let i = 0; i < 100; i++) {
        const a = int(rng, 2, 6);
        const b = int(rng, 2, 6);
        const c = int(rng, 2, 6);
        const d = int(rng, 2, 6);
        if ((a + b) ** 2 - c * d >= 5) return { a, b, c, d };
      }
      return { a: 4, b: 3, c: 2, d: 5 };
    },
    prompt: ({ a, b, c, d }, zone) =>
      `${Z[zone].Place}, the plan for your ${Z[zone].wood} needs the value of (${a} + ${b})² − ${c} × ${d}. Work it out.`,
    expected: ({ a, b, c, d }) => (a + b) ** 2 - c * d,
    solution: ({ a, b, c, d }) =>
      `Brackets first: ${a} + ${b} = ${a + b}. Then the power: ${a + b}² = ${(a + b) ** 2}. Then multiply: ${c} × ${d} = ${c * d}. ` +
      `Finally subtract: ${(a + b) ** 2} − ${c * d} = ${(a + b) ** 2 - c * d}.`,
  },
  {
    id: "u01-negative-mean-01",
    unit: 1,
    difficulty: 3,
    resource: "water",
    format: INT,
    params(rng) {
      for (let i = 0; i < 200; i++) {
        const m = int(rng, 1, 5);
        const v = [int(rng, -6, 8), int(rng, -6, 8), int(rng, -6, 8)];
        const w = 4 * m - v.reduce((a, b) => a + b, 0);
        if (w < -6 || w > 10) continue;
        const all = [...v, w];
        if (!all.some((x) => x < 0)) continue;
        // Rotate so the computed reading is not always last.
        const rot = int(rng, 0, 3);
        const r = [...all.slice(rot), ...all.slice(0, rot)];
        return { m, t1: r[0], t2: r[1], t3: r[2], t4: r[3] };
      }
      return { m: 2, t1: -3, t2: 4, t3: 5, t4: 2 };
    },
    prompt: ({ t1, t2, t3, t4 }, zone) =>
      `${Z[zone].Place}, four night temperatures in °C are recorded: ${[t1, t2, t3, t4].map(sg).join(", ")}. ` +
      `What is the mean temperature?`,
    expected: ({ m }) => m,
    solution: ({ m, t1, t2, t3, t4 }) =>
      `Add all four readings: ${[t1, t2, t3, t4].map((v) => (v < 0 ? `(${sg(v)})` : sg(v))).join(" + ")} = ${t1 + t2 + t3 + t4}. ` +
      `Divide by 4: ${t1 + t2 + t3 + t4} ÷ 4 = ${m}.`,
  },
];
