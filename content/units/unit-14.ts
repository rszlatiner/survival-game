/**
 * Unit 14 bank: volume, surface area and symmetry.
 * Original templates written for this game. Difficulty 1 = one formula or one
 * fact (volume of a cuboid, surface area of a cube, lines of symmetry of a
 * regular polygon, naming a solid from its face, edge and vertex counts);
 * 2 = two-step volume and surface-area work, capacity in litres, rotational
 * symmetry, shapes with several symmetries; 3 = composite prisms, reverse
 * problems, scaling edges, comparing solids, counting parts of a prism.
 * Solids and shapes are described with dimensions and counts, so no picture
 * is needed. Capacity: 1 litre = 1000 cm³. Typed answers are positive
 * whole numbers; every answer is exact.
 */
import type { QuestionTemplate } from "@/lib/questions/types";
import { int } from "@/lib/questions/random";
import { ZONE_WORDS as Z } from "@/content/units/zones";

const INT = { kind: "integer" } as const;
const CHOICE = { kind: "choice", options: [] as string[] } as const;
const MINUS = "−";

/** The key plus three distractors chosen from the candidates by the number s (different subsets on different seeds). */
function mix(key: string, cands: string[], s: number): string[] {
  const arr = [...new Set(cands)].filter((c) => c !== key);
  let r = s;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = r % (i + 1);
    r = Math.floor(r / (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return [key, ...arr.slice(0, 3)];
}
const SEL = (rng: () => number) => int(rng, 0, 5039);

/** Faces, edges, vertices of common solids (each triple is different). */
const SOLIDS: { name: string; f: number; e: number; v: number }[] = [
  { name: "cuboid", f: 6, e: 12, v: 8 },
  { name: "triangular prism", f: 5, e: 9, v: 6 },
  { name: "square-based pyramid", f: 5, e: 8, v: 5 },
  { name: "triangular pyramid", f: 4, e: 6, v: 4 },
  { name: "pentagonal prism", f: 7, e: 15, v: 10 },
  { name: "pentagonal pyramid", f: 6, e: 10, v: 6 },
  { name: "hexagonal prism", f: 8, e: 18, v: 12 },
  { name: "hexagonal pyramid", f: 7, e: 12, v: 7 },
];

/** Shapes with their number of lines of symmetry and order of rotational symmetry. */
const SHAPES: { text: string; l: number; o: number }[] = [
  { text: "a rectangle that is not a square", l: 2, o: 2 },
  { text: "a rhombus that is not a square", l: 2, o: 2 },
  { text: "an equilateral triangle", l: 3, o: 3 },
  { text: "a square", l: 4, o: 4 },
  { text: "a regular pentagon", l: 5, o: 5 },
  { text: "a regular hexagon", l: 6, o: 6 },
  { text: "a parallelogram that is not a rectangle or a rhombus", l: 0, o: 2 },
  { text: "an isosceles trapezium", l: 1, o: 1 },
  { text: "a kite that is not a rhombus", l: 1, o: 1 },
];
const sym = (l: number, o: number) => `${l} ${l === 1 ? "line" : "lines"}, order ${o}`;

const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [8, 15, 17],
];

export const UNIT_14: QuestionTemplate[] = [
  // ---------------- Difficulty 1 ----------------
  {
    id: "u14-cuboid-vol-01",
    unit: 14,
    difficulty: 1,
    resource: "wood",
    format: INT,
    params: (rng) => ({ l: int(rng, 3, 12), w: int(rng, 2, 9), h: int(rng, 2, 9) }),
    prompt: ({ l, w, h }, zone) =>
      `${Z[zone].Place}, a storage crate is a cuboid ${l} cm long, ${w} cm wide and ${h} cm high. What is its volume in cm³?`,
    expected: ({ l, w, h }) => l * w * h,
    solution: ({ l, w, h }) => `Volume of a cuboid = length × width × height = ${l} × ${w} × ${h} = ${l * w * h} cm³.`,
  },
  {
    id: "u14-cube-surface-01",
    unit: 14,
    difficulty: 1,
    resource: "stone",
    format: INT,
    params: (rng) => ({ a: int(rng, 2, 12) }),
    prompt: ({ a }, zone) =>
      `${Z[zone].Place}, you paint every face of a cube-shaped box with edges of ${a} cm. What is the total area painted, in cm²?`,
    expected: ({ a }) => 6 * a * a,
    solution: ({ a }) =>
      `One face is a square of area ${a} × ${a} = ${a * a} cm². A cube has 6 faces, so the total is 6 × ${a * a} = ${6 * a * a} cm².`,
  },
  {
    id: "u14-polygon-lines-01",
    unit: 14,
    difficulty: 1,
    resource: "food",
    format: INT,
    params: (rng) => ({ n: int(rng, 3, 10), s: int(rng, 10, 40) }),
    prompt: ({ n, s }, zone) =>
      `${Z[zone].Place}, you arrange ${Z[zone].wood} into a regular polygon with ${n} equal sides, each ${s} cm long. ` +
      `How many lines of symmetry does the shape have?`,
    expected: ({ n }) => n,
    solution: ({ n }) => `A regular polygon has one line of symmetry for each of its sides, so a polygon with ${n} sides has ${n} lines of symmetry.`,
  },
  {
    id: "u14-solid-identify-01",
    unit: 14,
    difficulty: 1,
    resource: "water",
    format: CHOICE,
    params: (rng) => ({ t: int(rng, 0, SOLIDS.length - 1), s: SEL(rng) }),
    prompt: ({ t }, zone) =>
      `${Z[zone].Place}, you build a model from ${Z[zone].wood}. It has ${SOLIDS[t].f} faces, ${SOLIDS[t].e} edges and ${SOLIDS[t].v} vertices. ` +
      `Which solid is it?`,
    options: ({ t, s }) =>
      mix(
        SOLIDS[t].name,
        SOLIDS.map((x) => x.name),
        s,
      ),
    expected: ({ t }) => SOLIDS[t].name,
    solution: ({ t }) =>
      `Compare the counts with each solid: ${SOLIDS[t].f} faces, ${SOLIDS[t].e} edges and ${SOLIDS[t].v} vertices belong only to the ${SOLIDS[t].name}. ` +
      `So the solid is: ${SOLIDS[t].name}.`,
  },
  {
    id: "u14-cube-edge-01",
    unit: 14,
    difficulty: 1,
    resource: "water",
    format: INT,
    params: (rng) => ({ a: int(rng, 2, 9) }),
    prompt: ({ a }, zone) =>
      `${Z[zone].Place}, a cube-shaped tank holds exactly ${a * a * a} cm³ of ${Z[zone].water}. How long is one edge of the tank, in centimetres?`,
    expected: ({ a }) => a,
    solution: ({ a }) => `Volume of a cube = edge × edge × edge. ${a} × ${a} × ${a} = ${a * a * a}, so each edge is ${a} cm.`,
  },
  {
    id: "u14-prism-vol-01",
    unit: 14,
    difficulty: 1,
    resource: "food",
    format: INT,
    params: (rng) => ({ area: int(rng, 6, 40), len: int(rng, 3, 12) }),
    prompt: ({ area, len }, zone) =>
      `${Z[zone].Place}, a drying rack for ${Z[zone].food} is a prism. Its cross-section has an area of ${area} cm² and the rack is ${len} cm long. ` +
      `What is its volume in cm³?`,
    expected: ({ area, len }) => area * len,
    solution: ({ area, len }) => `Volume of a prism = area of cross-section × length = ${area} × ${len} = ${area * len} cm³.`,
  },

  // ---------------- Difficulty 2 ----------------
  {
    id: "u14-cuboid-surface-01",
    unit: 14,
    difficulty: 2,
    resource: "stone",
    format: INT,
    params: (rng) => ({ l: int(rng, 3, 9), w: int(rng, 2, 7), h: int(rng, 2, 6) }),
    prompt: ({ l, w, h }, zone) =>
      `${Z[zone].Place}, you wrap a cuboid box measuring ${l} cm by ${w} cm by ${h} cm in leaves. ` +
      `What area of leaves is needed to cover all six faces, in cm²?`,
    expected: ({ l, w, h }) => 2 * (l * w + l * h + w * h),
    solution: ({ l, w, h }) =>
      `The faces come in three equal pairs: ${l} × ${w} = ${l * w}, ${l} × ${h} = ${l * h} and ${w} × ${h} = ${w * h}. ` +
      `Total = 2 × (${l * w} + ${l * h} + ${w * h}) = 2 × ${l * w + l * h + w * h} = ${2 * (l * w + l * h + w * h)} cm².`,
  },
  {
    id: "u14-triangle-prism-01",
    unit: 14,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params(rng) {
      const b = int(rng, 3, 10);
      let h = int(rng, 3, 10);
      if ((b * h) % 2 === 1) h += 1;
      return { b, h, len: int(rng, 3, 12) };
    },
    prompt: ({ b, h, len }, zone) =>
      `${Z[zone].Place}, a ramp is a triangular prism. Each triangular end has a base of ${b} cm and a perpendicular height of ${h} cm. ` +
      `The ramp is ${len} cm long. What is its volume in cm³?`,
    expected: ({ b, h, len }) => (b * h * len) / 2,
    solution: ({ b, h, len }) =>
      `Area of the triangular end = ½ × ${b} × ${h} = ${(b * h) / 2} cm². ` +
      `Volume = area × length = ${(b * h) / 2} × ${len} = ${(b * h * len) / 2} cm³.`,
  },
  {
    id: "u14-litres-01",
    unit: 14,
    difficulty: 2,
    resource: "water",
    format: INT,
    params: (rng) => ({ a: int(rng, 2, 6), b: int(rng, 2, 6), c: int(rng, 2, 6) }),
    prompt: ({ a, b, c }, zone) =>
      `${Z[zone].Place}, a tank is a cuboid with a base ${10 * a} cm by ${10 * b} cm and a height of ${10 * c} cm. ` +
      `It is filled with ${Z[zone].water}. How many litres does it hold? (1 litre = 1000 cm³)`,
    expected: ({ a, b, c }) => a * b * c,
    solution: ({ a, b, c }) =>
      `Volume = ${10 * a} × ${10 * b} × ${10 * c} = ${1000 * a * b * c} cm³. ` +
      `Divide by 1000 to change to litres: ${1000 * a * b * c} ÷ 1000 = ${a * b * c} litres.`,
  },
  {
    id: "u14-turn-angle-01",
    unit: 14,
    difficulty: 2,
    resource: "food",
    format: INT,
    params: (rng) => ({ n: [3, 4, 5, 6, 8, 9, 10, 12][int(rng, 0, 7)], m: int(rng, 2, 4) }),
    prompt: ({ n, m }, zone) =>
      `${Z[zone].Place}, you lay out a pattern of ${n * m} ${Z[zone].wood} with rotational symmetry of order ${n}. ` +
      `What is the smallest turn, in degrees, that fits the pattern exactly onto itself?`,
    expected: ({ n }) => 360 / n,
    solution: ({ n }) => `A full turn is 360°. With order ${n}, the pattern fits onto itself ${n} times in one full turn, so the smallest turn is 360 ÷ ${n} = ${360 / n}°.`,
  },
  {
    id: "u14-missing-edge-01",
    unit: 14,
    difficulty: 2,
    resource: "stone",
    format: INT,
    params: (rng) => ({ l: int(rng, 3, 12), w: int(rng, 2, 9), h: int(rng, 2, 9) }),
    prompt: ({ l, w, h }, zone) =>
      `${Z[zone].Place}, a cuboid block has a volume of ${l * w * h} cm³. It is ${l} cm long and ${w} cm wide. ` +
      `How high is the block, in centimetres?`,
    expected: ({ h }) => h,
    solution: ({ l, w, h }) =>
      `Volume = length × width × height, so height = volume ÷ (length × width). ${l} × ${w} = ${l * w}, ` +
      `and ${l * w * h} ÷ ${l * w} = ${h}. The block is ${h} cm high.`,
  },
  {
    id: "u14-cut-block-01",
    unit: 14,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params(rng) {
      const L = int(rng, 6, 12);
      const W = int(rng, 5, 10);
      const H = int(rng, 5, 10);
      return { L, W, H, l: int(rng, 2, L - 3), w: int(rng, 2, W - 2), h: int(rng, 2, H - 2) };
    },
    prompt: ({ L, W, H, l, w, h }, zone) =>
      `${Z[zone].Place}, a solid block measures ${L} cm by ${W} cm by ${H} cm. A cuboid ${l} cm by ${w} cm by ${h} cm is cut out of one corner. ` +
      `What volume is left, in cm³?`,
    expected: ({ L, W, H, l, w, h }) => L * W * H - l * w * h,
    solution: ({ L, W, H, l, w, h }) =>
      `Whole block: ${L} × ${W} × ${H} = ${L * W * H} cm³. Piece cut out: ${l} × ${w} × ${h} = ${l * w * h} cm³. ` +
      `Left: ${L * W * H} ${MINUS} ${l * w * h} = ${L * W * H - l * w * h} cm³.`,
  },
  {
    id: "u14-open-box-01",
    unit: 14,
    difficulty: 2,
    resource: "water",
    format: INT,
    params: (rng) => ({ l: int(rng, 4, 10), w: int(rng, 3, 8), h: int(rng, 2, 6) }),
    prompt: ({ l, w, h }, zone) =>
      `${Z[zone].Place}, you make an open-topped box (no lid) from a flat net. The box is ${l} cm long, ${w} cm wide and ${h} cm high. ` +
      `What is the total area of the net, in cm²?`,
    expected: ({ l, w, h }) => l * w + 2 * l * h + 2 * w * h,
    solution: ({ l, w, h }) =>
      `The net has a base ${l} × ${w} = ${l * w}, two long sides 2 × (${l} × ${h}) = ${2 * l * h}, and two short sides 2 × (${w} × ${h}) = ${2 * w * h}. ` +
      `There is no lid. Total = ${l * w} + ${2 * l * h} + ${2 * w * h} = ${l * w + 2 * l * h + 2 * w * h} cm².`,
  },
  {
    id: "u14-shape-sym-01",
    unit: 14,
    difficulty: 2,
    resource: "food",
    format: CHOICE,
    params: (rng) => ({ t: int(rng, 0, SHAPES.length - 1), side: int(rng, 8, 40), s: SEL(rng) }),
    prompt: ({ t, side }, zone) =>
      `${Z[zone].Place}, you lay ${Z[zone].wood} in the shape of ${SHAPES[t].text}, with a longest side of ${side} cm. ` +
      `How many lines of symmetry does it have, and what is its order of rotational symmetry?`,
    options: ({ t, s }) => {
      const { l, o } = SHAPES[t];
      const pool = [sym(2, 2), sym(3, 3), sym(4, 4), sym(5, 5), sym(6, 6), sym(0, 2), sym(1, 1), sym(l, 1), sym(l, 2), sym(0, 1), sym(1, o)];
      return mix(sym(l, o), pool, s);
    },
    expected: ({ t }) => sym(SHAPES[t].l, SHAPES[t].o),
    solution: ({ t }) =>
      `For ${SHAPES[t].text}: count the mirror lines and the number of times it fits onto itself in one full turn. ` +
      `The answer is ${sym(SHAPES[t].l, SHAPES[t].o)}.`,
  },

  // ---------------- Difficulty 3 ----------------
  {
    id: "u14-l-prism-01",
    unit: 14,
    difficulty: 3,
    resource: "stone",
    format: INT,
    params(rng) {
      const W = int(rng, 6, 12);
      const H = int(rng, 5, 10);
      return { W, H, w: int(rng, 2, W - 3), h: int(rng, 2, H - 3), len: int(rng, 3, 10) };
    },
    prompt: ({ W, H, w, h, len }, zone) =>
      `${Z[zone].Place}, a step block is a prism ${len} cm long. Its end face is an L-shape: a ${W} cm by ${H} cm rectangle ` +
      `with a ${w} cm by ${h} cm rectangle removed from one corner. What is its volume in cm³?`,
    expected: ({ W, H, w, h, len }) => (W * H - w * h) * len,
    solution: ({ W, H, w, h, len }) =>
      `Area of the L-shaped end = ${W} × ${H} ${MINUS} ${w} × ${h} = ${W * H} ${MINUS} ${w * h} = ${W * H - w * h} cm². ` +
      `Volume = ${W * H - w * h} × ${len} = ${(W * H - w * h) * len} cm³.`,
  },
  {
    id: "u14-tank-height-01",
    unit: 14,
    difficulty: 3,
    resource: "water",
    format: INT,
    params: (rng) => ({ a: int(rng, 3, 7), b: int(rng, 3, 7), c: int(rng, 2, 6) }),
    prompt: ({ a, b, c }, zone) =>
      `${Z[zone].Place}, a cuboid tank has a base ${10 * a} cm by ${10 * b} cm. When full it holds ${a * b * c} litres of ${Z[zone].water}. ` +
      `(1 litre = 1000 cm³) How tall is the tank, in centimetres?`,
    expected: ({ c }) => 10 * c,
    solution: ({ a, b, c }) =>
      `Volume in cm³ = ${a * b * c} × 1000 = ${1000 * a * b * c}. The base area is ${10 * a} × ${10 * b} = ${100 * a * b} cm². ` +
      `Height = volume ÷ base area = ${1000 * a * b * c} ÷ ${100 * a * b} = ${10 * c} cm.`,
  },
  {
    id: "u14-scale-edges-01",
    unit: 14,
    difficulty: 3,
    resource: "wood",
    format: INT,
    params: (rng) => ({ v: int(rng, 12, 60), k: int(rng, 2, 3) }),
    prompt: ({ v, k }, zone) =>
      `${Z[zone].Place}, a cuboid model has a volume of ${v} cm³. A bigger copy is built with every edge ${k} times as long. ` +
      `What is the volume of the bigger copy, in cm³?`,
    expected: ({ v, k }) => v * k * k * k,
    solution: ({ v, k }) =>
      `Length, width and height are each multiplied by ${k}, so the volume is multiplied by ${k} × ${k} × ${k} = ${k * k * k}. ` +
      `${v} × ${k * k * k} = ${v * k * k * k} cm³.`,
  },
  {
    id: "u14-box-compare-01",
    unit: 14,
    difficulty: 3,
    resource: "food",
    format: CHOICE,
    params(rng) {
      for (let i = 0; i < 100; i++) {
        const p = { l1: int(rng, 3, 9), w1: int(rng, 2, 8), h1: int(rng, 2, 8), l2: int(rng, 3, 9), w2: int(rng, 2, 8), h2: int(rng, 2, 8), s: SEL(rng) };
        const va = p.l1 * p.w1 * p.h1;
        const vb = p.l2 * p.w2 * p.h2;
        const sa = 2 * (p.l1 * p.w1 + p.l1 * p.h1 + p.w1 * p.h1);
        const sb = 2 * (p.l2 * p.w2 + p.l2 * p.h2 + p.w2 * p.h2);
        const d = Math.abs(va - vb);
        const m1 = Math.abs(sa - sb);
        const m2 = Math.abs(p.l1 + p.w1 + p.h1 - (p.l2 + p.w2 + p.h2));
        const m3 = Math.abs(p.l1 * p.w1 - p.l2 * p.w2);
        if (d > 0 && new Set([d, m1, m2, m3].filter((v) => v > 0)).size === 4 && [m1, m2, m3].every((v) => v > 0)) return p;
      }
      return { l1: 4, w1: 5, h1: 6, l2: 3, w2: 8, h2: 5, s: 1 };
    },
    prompt: ({ l1, w1, h1, l2, w2, h2 }, zone) =>
      `${Z[zone].Place}, you have two cuboid boxes to store ${Z[zone].food}. Box A is ${l1} cm by ${w1} cm by ${h1} cm. ` +
      `Box B is ${l2} cm by ${w2} cm by ${h2} cm. Which box has the larger volume, and by how many cm³?`,
    options: ({ l1, w1, h1, l2, w2, h2, s }) => {
      const va = l1 * w1 * h1;
      const vb = l2 * w2 * h2;
      const big = va > vb ? "A" : "B";
      const small = va > vb ? "B" : "A";
      const d = Math.abs(va - vb);
      const sa = 2 * (l1 * w1 + l1 * h1 + w1 * h1);
      const sb = 2 * (l2 * w2 + l2 * h2 + w2 * h2);
      const m1 = Math.abs(sa - sb);
      const m2 = Math.abs(l1 + w1 + h1 - (l2 + w2 + h2));
      const m3 = Math.abs(l1 * w1 - l2 * w2);
      return mix(
        `Box ${big}, by ${d}`,
        [`Box ${small}, by ${d}`, `Box ${big}, by ${m1}`, `Box ${small}, by ${m1}`, `Box ${big}, by ${m2}`, `Box ${small}, by ${m2}`, `Box ${big}, by ${m3}`, `Box ${small}, by ${m3}`],
        s,
      );
    },
    expected: ({ l1, w1, h1, l2, w2, h2 }) => {
      const va = l1 * w1 * h1;
      const vb = l2 * w2 * h2;
      return `Box ${va > vb ? "A" : "B"}, by ${Math.abs(va - vb)}`;
    },
    solution: ({ l1, w1, h1, l2, w2, h2 }) => {
      const va = l1 * w1 * h1;
      const vb = l2 * w2 * h2;
      return (
        `Box A: ${l1} × ${w1} × ${h1} = ${va} cm³. Box B: ${l2} × ${w2} × ${h2} = ${vb} cm³. ` +
        `The difference is ${Math.max(va, vb)} ${MINUS} ${Math.min(va, vb)} = ${Math.abs(va - vb)}, so the answer is: Box ${va > vb ? "A" : "B"}, by ${Math.abs(va - vb)}.`
      );
    },
  },
  {
    id: "u14-tri-prism-surface-01",
    unit: 14,
    difficulty: 3,
    resource: "stone",
    format: INT,
    params: (rng) => ({ t: int(rng, 0, TRIPLES.length - 1), len: int(rng, 4, 10) }),
    prompt: ({ t, len }, zone) => {
      const [a, b, c] = TRIPLES[t];
      return (
        `${Z[zone].Place}, a stone wedge is a prism ${len} cm long. Its end is a right-angled triangle with sides ${a} cm, ${b} cm and ${c} cm ` +
        `(${c} cm is the longest side). What is the total surface area of the wedge, in cm²?`
      );
    },
    expected: ({ t, len }) => {
      const [a, b, c] = TRIPLES[t];
      return a * b + (a + b + c) * len;
    },
    solution: ({ t, len }) => {
      const [a, b, c] = TRIPLES[t];
      return (
        `Two triangular ends: 2 × (½ × ${a} × ${b}) = ${a * b}. ` +
        `Three rectangles, one on each side of the triangle: (${a} + ${b} + ${c}) × ${len} = ${a + b + c} × ${len} = ${(a + b + c) * len}. ` +
        `Total = ${a * b} + ${(a + b + c) * len} = ${a * b + (a + b + c) * len} cm².`
      );
    },
  },
  {
    id: "u14-reverse-edges-01",
    unit: 14,
    difficulty: 3,
    resource: "wood",
    format: INT,
    params: (rng) => ({ n: int(rng, 4, 12) }),
    prompt: ({ n }, zone) =>
      `${Z[zone].Place}, you build the frame of a prism, using one length of ${Z[zone].rope} for each edge. You use ${3 * n} lengths. ` +
      `How many faces does the prism have?`,
    expected: ({ n }) => n + 2,
    solution: ({ n }) =>
      `A prism whose end faces have n sides has 3n edges. So 3n = ${3 * n} and n = ${3 * n} ÷ 3 = ${n}. ` +
      `It has n side faces plus 2 end faces: ${n} + 2 = ${n + 2} faces.`,
  },
];
