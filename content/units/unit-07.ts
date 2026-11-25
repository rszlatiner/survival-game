/**
 * Unit 7 bank: shapes and measurements.
 * Original templates written for this game. Difficulty 1 = one formula or one
 * unit conversion (perimeter, area of rectangle, triangle and parallelogram,
 * circumference); 2 = trapezium and circle areas, compound shapes, area
 * conversions, finding a missing length, comparing shapes; 3 = composite
 * shapes, reversing circle formulas, paths and covering problems, scale
 * claims and mixed units. There are no figures: every shape is described with
 * its measurements. Circle answers use pi = 3.14 and have at most 2 decimal
 * places.
 */
import type { QuestionTemplate } from "@/lib/questions/types";
import { int, pick } from "@/lib/questions/random";
import { ZONE_WORDS as Z } from "@/content/units/zones";

const INT = { kind: "integer" } as const;
const D1 = { kind: "decimal", places: 1 } as const;
const D2F = { kind: "decimal", places: 2 } as const;
const CHOICE = { kind: "choice", options: [] as string[] } as const;
const M = "−";
const T = "×";
const PI = 3.14;
/** Clean binary-float noise from a value that has at most 2 decimal places. */
const d2 = (n: number) => Math.round(n * 100) / 100;
const SHAPES = ["The rectangle", "The triangle", "The parallelogram"];
const times = (n: number) => `${n} times`;
const key = (p: Record<string, number>) => times(p.t === 0 ? p.k * p.k : p.k);
/** Six plausible wrong factors (typical slips) for the scale-factor question. */
const wrong = (p: Record<string, number>) => {
  const k = p.k;
  return p.t === 0
    ? [times(k), times(2 * k), times(k * k * k), times(k * k + k), times(2 * k * k), times(k * k + 1)]
    : [times(k * k), times(2 * k), times((k * k) / 2), times(k / 2), times(k + 2), times(k * k - k)];
};
function shuffled<T>(rng: () => number, a: T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export const UNIT_07: QuestionTemplate[] = [
  // ---------------- Difficulty 1 ----------------
  {
    id: "u07-rect-perimeter-01",
    unit: 7,
    difficulty: 1,
    resource: "water",
    format: INT,
    params: (rng) => ({ l: int(rng, 6, 25), w: int(rng, 3, 15) }),
    prompt: ({ l, w }, zone) =>
      `${Z[zone].Place}, you fence a rectangular water pen ${l} m long and ${w} m wide with ${Z[zone].rope}. How many metres of ${Z[zone].rope} go all the way round?`,
    expected: ({ l, w }) => 2 * (l + w),
    solution: ({ l, w }) =>
      `The perimeter is the distance all the way round: 2 × (${l} + ${w}) = 2 × ${l + w} = ${2 * (l + w)} m.`,
  },
  {
    id: "u07-area-method-01",
    unit: 7,
    difficulty: 1,
    resource: "food",
    format: CHOICE,
    params(rng) {
      // No wrong option may give the same number as the right one.
      for (let i = 0; i < 100; i++) {
        const b = int(rng, 4, 16);
        const h = int(rng, 3, 12);
        if (b * h !== 0 && 2 * (b + h) !== (b * h) / 2 && b + h !== (b * h) / 2) return { b, h };
      }
      return { b: 6, h: 5 };
    },
    prompt: ({ b, h }, zone) =>
      `A triangular sunshade ${Z[zone].place} has a base of ${b} m and a perpendicular height of ${h} m. Which calculation gives its area in square metres?`,
    options: ({ b, h }) => [`½ ${T} ${b} ${T} ${h}`, `${b} ${T} ${h}`, `${b} + ${h}`, `2 ${T} (${b} + ${h})`],
    expected: ({ b, h }) => `½ ${T} ${b} ${T} ${h}`,
    solution: ({ b, h }) =>
      `The area of a triangle is half of base ${T} height, so the calculation is ½ ${T} ${b} ${T} ${h}. (${b} ${T} ${h} would be the area of a rectangle, and ${b} + ${h} or 2 ${T} (${b} + ${h}) are not areas at all.)`,
  },
  {
    id: "u07-triangle-area-01",
    unit: 7,
    difficulty: 1,
    resource: "wood",
    format: INT,
    params: (rng) => ({ b: 2 * int(rng, 3, 10), h: int(rng, 3, 14) }),
    prompt: ({ b, h }, zone) =>
      `A triangular sail ${Z[zone].place} has a base of ${b} m and a perpendicular height of ${h} m. What is its area in square metres?`,
    expected: ({ b, h }) => (b * h) / 2,
    solution: ({ b, h }) =>
      `Area of a triangle = ½ ${T} base ${T} height = ½ ${T} ${b} ${T} ${h} = ${(b * h) / 2} m².`,
  },
  {
    id: "u07-parallelogram-area-01",
    unit: 7,
    difficulty: 1,
    resource: "stone",
    format: INT,
    params(rng) {
      const h = int(rng, 3, 12);
      return { b: int(rng, 5, 16), h, s: h + int(rng, 1, 4) };
    },
    prompt: ({ b, h, s }, zone) =>
      `${Z[zone].Place}, a flat slab of stone is a parallelogram with a base of ${b} cm, a sloping side of ${s} cm and a perpendicular height of ${h} cm. What is its area in cm²?`,
    expected: ({ b, h }) => b * h,
    solution: ({ b, h, s }) =>
      `Area of a parallelogram = base ${T} perpendicular height = ${b} ${T} ${h} = ${b * h} cm². The sloping side (${s} cm) is not used.`,
  },
  {
    id: "u07-convert-length-01",
    unit: 7,
    difficulty: 1,
    resource: "water",
    format: INT,
    params(rng) {
      let t = int(rng, 12, 98);
      if (t % 10 === 0) t += 1; // keeps the one-decimal length from reading 2.0 m
      return { k: int(rng, 0, 2), t };
    },
    prompt: ({ k, t }, zone) =>
      [
        `${Z[zone].Place}, a length of ${Z[zone].rope} is ${(t / 10).toFixed(1)} m long. How many centimetres is that?`,
        `${Z[zone].Place}, a trail is ${(t / 10).toFixed(1)} km long. How many metres is that?`,
        `${Z[zone].Place}, a branch is ${t} cm long. How many millimetres is that?`,
      ][k],
    expected: ({ k, t }) => [t * 10, t * 100, t * 10][k],
    solution: ({ k, t }) =>
      [
        `1 m = 100 cm, so ${(t / 10).toFixed(1)} ${T} 100 = ${t * 10} cm.`,
        `1 km = 1000 m, so ${(t / 10).toFixed(1)} ${T} 1000 = ${t * 100} m.`,
        `1 cm = 10 mm, so ${t} ${T} 10 = ${t * 10} mm.`,
      ][k],
  },
  {
    id: "u07-circumference-01",
    unit: 7,
    difficulty: 1,
    resource: "food",
    format: D2F,
    params: (rng) => ({ d: int(rng, 2, 20) }),
    prompt: ({ d }, zone) =>
      `A round basket of ${Z[zone].food} ${Z[zone].place} has a diameter of ${d} cm. Use π = 3.14. What is its circumference in cm? Type the number only.`,
    expected: ({ d }) => d2(PI * d),
    solution: ({ d }) =>
      `Circumference = π ${T} diameter = 3.14 ${T} ${d} = ${d2(PI * d)} cm.`,
  },

  // ---------------- Difficulty 2 ----------------
  {
    id: "u07-trapezium-area-01",
    unit: 7,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params: (rng) => ({ a: int(rng, 3, 10), b: int(rng, 8, 16), h: 2 * int(rng, 2, 6) }),
    prompt: ({ a, b, h }, zone) =>
      `A roof panel ${Z[zone].place} is a trapezium. Its parallel sides are ${a} m and ${b} m, and they are ${h} m apart. What is the area in square metres?`,
    expected: ({ a, b, h }) => ((a + b) * h) / 2,
    solution: ({ a, b, h }) =>
      `Area of a trapezium = ½ ${T} (sum of parallel sides) ${T} distance between them = ½ ${T} (${a} + ${b}) ${T} ${h} = ½ ${T} ${a + b} ${T} ${h} = ${((a + b) * h) / 2} m².`,
  },
  {
    id: "u07-circle-area-01",
    unit: 7,
    difficulty: 2,
    resource: "stone",
    format: D2F,
    params: (rng) => ({ r: int(rng, 2, 12) }),
    prompt: ({ r }, zone) =>
      `A round fire pit ${Z[zone].place} has a radius of ${r} m. Use π = 3.14. What is its area in square metres? Type the number only.`,
    expected: ({ r }) => d2(PI * r * r),
    solution: ({ r }) =>
      `Area of a circle = π ${T} radius² = 3.14 ${T} ${r} ${T} ${r} = 3.14 ${T} ${r * r} = ${d2(PI * r * r)} m².`,
  },
  {
    id: "u07-circle-area-02",
    unit: 7,
    difficulty: 2,
    resource: "water",
    format: D2F,
    params: (rng) => ({ r: int(rng, 2, 10) }),
    prompt: ({ r }, zone) =>
      `A round pond ${Z[zone].place} is ${2 * r} m across at its widest. Use π = 3.14. What is the area of the pond in square metres? Type the number only.`,
    expected: ({ r }) => d2(PI * r * r),
    solution: ({ r }) =>
      `The widest distance is the diameter, so the radius is ${2 * r} ÷ 2 = ${r} m. Area = 3.14 ${T} ${r}² = 3.14 ${T} ${r * r} = ${d2(PI * r * r)} m².`,
  },
  {
    id: "u07-l-area-01",
    unit: 7,
    difficulty: 2,
    resource: "food",
    format: INT,
    params(rng) {
      const l = int(rng, 8, 16);
      const w = int(rng, 6, 12);
      return { l, w, a: int(rng, 2, l - 3), b: int(rng, 2, w - 2) };
    },
    prompt: ({ l, w, a, b }, zone) =>
      `A plot ${Z[zone].place} is a ${l} m by ${w} m rectangle with a ${a} m by ${b} m rectangle cut out of one corner, leaving an L shape. What is the area of the L shape in square metres?`,
    expected: ({ l, w, a, b }) => l * w - a * b,
    solution: ({ l, w, a, b }) =>
      `Whole rectangle: ${l} ${T} ${w} = ${l * w}. Corner removed: ${a} ${T} ${b} = ${a * b}. L shape = ${l * w} ${M} ${a * b} = ${l * w - a * b} m².`,
  },
  {
    id: "u07-area-units-01",
    unit: 7,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params: (rng) => ({ k: int(rng, 0, 1), a: int(rng, 2, 9) }),
    prompt: ({ k, a }, zone) =>
      k === 0
        ? `A tarp ${Z[zone].place} has an area of ${a} m². What is that in cm²? Type the number only.`
        : `A hatch cover ${Z[zone].place} has an area of ${a * 10000} cm². What is that in m²? Type the number only.`,
    expected: ({ k, a }) => (k === 0 ? a * 10000 : a),
    solution: ({ k, a }) =>
      k === 0
        ? `1 m = 100 cm, so 1 m² = 100 ${T} 100 = 10000 cm². ${a} ${T} 10000 = ${a * 10000} cm².`
        : `1 m² = 100 ${T} 100 = 10000 cm², so divide by 10000: ${a * 10000} ÷ 10000 = ${a} m².`,
  },
  {
    id: "u07-triangle-height-01",
    unit: 7,
    difficulty: 2,
    resource: "stone",
    format: INT,
    params(rng) {
      const b = 2 * int(rng, 3, 9);
      return { b, h: int(rng, 3, 14) };
    },
    prompt: ({ b, h }, zone) =>
      `A triangular marker made ${Z[zone].place} has a base of ${b} cm and an area of ${(b * h) / 2} cm². What is its perpendicular height in cm?`,
    expected: ({ h }) => h,
    solution: ({ b, h }) =>
      `Area = ½ ${T} base ${T} height, so ${(b * h) / 2} = ½ ${T} ${b} ${T} height, which gives ${(b * h) / 2} = ${b / 2} ${T} height. Height = ${(b * h) / 2} ÷ ${b / 2} = ${h} cm.`,
  },
  {
    id: "u07-compare-shapes-01",
    unit: 7,
    difficulty: 2,
    resource: "food",
    format: CHOICE,
    params(rng) {
      const want = int(rng, 0, 2); // which shape has the greatest area
      for (let i = 0; i < 400; i++) {
        const p = {
          rl: int(rng, 4, 12), rw: int(rng, 3, 9),
          tb: 2 * int(rng, 3, 10), th: int(rng, 4, 14),
          pb: int(rng, 4, 12), ph: int(rng, 3, 9),
        };
        const a = [p.rl * p.rw, (p.tb * p.th) / 2, p.pb * p.ph];
        const top = Math.max(...a);
        if (a.indexOf(top) === want && a.filter((v) => v === top).length === 1 && new Set(a).size === 3) return p;
      }
      return { rl: 10, rw: 8, tb: 12, th: 6, pb: 7, ph: 5 };
    },
    prompt: ({ rl, rw, tb, th, pb, ph }, zone) =>
      `Three drying racks ${Z[zone].place}: a rectangle ${rl} m by ${rw} m; a triangle with base ${tb} m and perpendicular height ${th} m; ` +
      `a parallelogram with base ${pb} m and perpendicular height ${ph} m. Which rack has the greatest area?`,
    options: () => SHAPES,
    expected: ({ rl, rw, tb, th, pb, ph }) => {
      const a = [rl * rw, (tb * th) / 2, pb * ph];
      return SHAPES[a.indexOf(Math.max(...a))];
    },
    solution: ({ rl, rw, tb, th, pb, ph }) => {
      const a = [rl * rw, (tb * th) / 2, pb * ph];
      return `Rectangle: ${rl} ${T} ${rw} = ${a[0]} m². Triangle: ½ ${T} ${tb} ${T} ${th} = ${a[1]} m². Parallelogram: ${pb} ${T} ${ph} = ${a[2]} m². The greatest is ${SHAPES[a.indexOf(Math.max(...a))]}.`;
    },
  },
  {
    id: "u07-mixed-units-01",
    unit: 7,
    difficulty: 2,
    resource: "wood",
    format: D1,
    params: (rng) => ({ l: int(rng, 3, 9), c: 50 * int(rng, 2, 9) }),
    prompt: ({ l, c }, zone) =>
      `A board ${Z[zone].place} is ${l} m long and ${c} cm wide. What is its area in square metres? Type the number only.`,
    expected: ({ l, c }) => (l * c) / 100,
    solution: ({ l, c }) =>
      `Change the width to metres: ${c} cm = ${c / 100} m. Area = ${l} ${T} ${c / 100} = ${(l * c) / 100} m².`,
  },

  // ---------------- Difficulty 3 ----------------
  {
    id: "u07-house-shape-01",
    unit: 7,
    difficulty: 3,
    resource: "wood",
    format: INT,
    params: (rng) => ({ w: 2 * int(rng, 2, 6), h: int(rng, 3, 8), t: int(rng, 2, 6) }),
    prompt: ({ w, h, t }, zone) =>
      `A hut wall ${Z[zone].place} is a rectangle ${w} m wide and ${h} m tall, with a triangle on top whose base is the ${w} m top edge and whose height is ${t} m. What is the total area in square metres?`,
    expected: ({ w, h, t }) => w * h + (w * t) / 2,
    solution: ({ w, h, t }) =>
      `Rectangle: ${w} ${T} ${h} = ${w * h}. Triangle: ½ ${T} ${w} ${T} ${t} = ${(w * t) / 2}. Total = ${w * h} + ${(w * t) / 2} = ${w * h + (w * t) / 2} m².`,
  },
  {
    id: "u07-radius-reverse-01",
    unit: 7,
    difficulty: 3,
    resource: "stone",
    format: INT,
    params: (rng) => ({ r: int(rng, 3, 25) }),
    prompt: ({ r }, zone) =>
      `The rim of a round well ${Z[zone].place} measures ${d2(2 * PI * r)} m all the way round. Use π = 3.14. What is the radius of the well in metres?`,
    expected: ({ r }) => r,
    solution: ({ r }) =>
      `Circumference = 2 ${T} π ${T} radius, so ${d2(2 * PI * r)} = 6.28 ${T} radius. Radius = ${d2(2 * PI * r)} ÷ 6.28 = ${r} m.`,
  },
  {
    id: "u07-path-area-01",
    unit: 7,
    difficulty: 3,
    resource: "water",
    format: D2F,
    params: (rng) => ({ r: int(rng, 3, 10), w: int(rng, 1, 3) }),
    prompt: ({ r, w }, zone) =>
      `A circular pond ${Z[zone].place} has a radius of ${r} m. A path ${w} m wide goes all the way round it. Use π = 3.14. What is the area of the path in square metres? Type the number only.`,
    expected: ({ r, w }) => d2(PI * ((r + w) * (r + w) - r * r)),
    solution: ({ r, w }) =>
      `Pond and path together have radius ${r} + ${w} = ${r + w} m, so area ${d2(PI * (r + w) * (r + w))}. The pond alone is ${d2(PI * r * r)}. ` +
      `Path = ${d2(PI * (r + w) * (r + w))} ${M} ${d2(PI * r * r)} = ${d2(PI * ((r + w) * (r + w) - r * r))} m².`,
  },
  {
    id: "u07-tiles-01",
    unit: 7,
    difficulty: 3,
    resource: "stone",
    format: INT,
    params: (rng) => ({ t: pick(rng, [20, 25, 50]), l: int(rng, 2, 5), w: int(rng, 2, 5) }),
    prompt: ({ t, l, w }, zone) =>
      `You cover a floor ${Z[zone].place} that is ${l} m by ${w} m with square tiles. Each tile is ${t} cm by ${t} cm. How many tiles do you need?`,
    expected: ({ t, l, w }) => ((100 * l) / t) * ((100 * w) / t),
    solution: ({ t, l, w }) =>
      `The floor is ${100 * l} cm by ${100 * w} cm. Along the length: ${100 * l} ÷ ${t} = ${(100 * l) / t} tiles. Along the width: ${100 * w} ÷ ${t} = ${(100 * w) / t} tiles. ` +
      `Total = ${(100 * l) / t} ${T} ${(100 * w) / t} = ${((100 * l) / t) * ((100 * w) / t)}.`,
  },
  {
    id: "u07-window-01",
    unit: 7,
    difficulty: 3,
    resource: "water",
    format: D2F,
    params: (rng) => ({ r: int(rng, 2, 5), h: int(rng, 2, 6) }),
    prompt: ({ r, h }, zone) =>
      `A window ${Z[zone].place} is a rectangle ${2 * r} m wide and ${h} m tall with a semicircle on top. The semicircle's diameter is the ${2 * r} m top edge. Use π = 3.14. What is the total area in square metres? Type the number only.`,
    expected: ({ r, h }) => d2(2 * r * h + (PI * r * r) / 2),
    solution: ({ r, h }) =>
      `Rectangle: ${2 * r} ${T} ${h} = ${2 * r * h}. The semicircle has radius ${r}, and half a circle is ½ ${T} 3.14 ${T} ${r}² = ${d2((PI * r * r) / 2)}. ` +
      `Total = ${2 * r * h} + ${d2((PI * r * r) / 2)} = ${d2(2 * r * h + (PI * r * r) / 2)} m².`,
  },
  {
    id: "u07-scale-claim-01",
    unit: 7,
    difficulty: 3,
    resource: "food",
    format: CHOICE,
    params(rng) {
      const t = int(rng, 0, 1);
      const k = t === 0 ? int(rng, 3, 6) : pick(rng, [6, 8, 10]);
      const [c0, c1, c2] = shuffled(rng, [0, 1, 2, 3, 4, 5]).slice(0, 3);
      return { t, k, r: int(rng, 2, 9), c0, c1, c2 };
    },
    prompt: ({ t, k, r }, zone) =>
      t === 0
        ? `A circular mat for drying ${Z[zone].food} has radius ${r} m. You make a new mat with a radius ${k} times as long. By what factor does the area grow?`
        : `A circular mat for drying ${Z[zone].food} has radius ${r} m. A new mat has ${k * k} times the area of the old one. The new radius is how many times the old radius?`,
    options: (p) => [key(p), ...[p.c0, p.c1, p.c2].map((c) => wrong(p)[c])],
    expected: (p) => key(p),
    solution: ({ t, k, r }) =>
      t === 0
        ? `Area = π ${T} radius². The new radius is ${k * r}, so the new area is π ${T} ${k * r}² = π ${T} ${k * k} ${T} ${r}². The area is multiplied by ${k} ${T} ${k} = ${k * k}, so the answer is ${k * k} times.`
        : `Area grows by the square of the radius factor. ${k * k} = ${k} ${T} ${k}, so the radius is multiplied by ${k}: the answer is ${k} times.`,
  },
];
