/**
 * Unit 13 bank: position and transformation.
 * Original templates written for this game. Difficulty 1 = one step (quadrant
 * of a point, one translation, reflection or enlargement, a bearing turn);
 * 2 = rotations, reflections in a line, midpoints, finding a translation or
 * scale factor, back bearings; 3 = two-step transformations, reverse
 * problems, identifying a transformation, checking a claim.
 * Everything is described with coordinates and words, so no picture is needed.
 * Conventions: grid units are 1 metre unless stated; rotations are about the
 * origin; enlargements have the origin as centre; bearings are measured
 * clockwise from north. Negative answers are always choices of coordinate
 * pairs; typed answers are positive whole numbers.
 */
import type { QuestionTemplate } from "@/lib/questions/types";
import { int } from "@/lib/questions/random";
import { ZONE_WORDS as Z } from "@/content/units/zones";

const INT = { kind: "integer" } as const;
const CHOICE = { kind: "choice", options: [] as string[] } as const;
const MINUS = "−";

/** Signed number text with a true minus sign. */
const n = (v: number) => (v < 0 ? `${MINUS}${-v}` : `${v}`);
const pt = (x: number, y: number) => `(${n(x)}, ${n(y)})`;
/** "a + d" or "a - d" written for a signed shift d. */
const shift = (a: number, d: number) => (d >= 0 ? `${n(a)} + ${d} = ${n(a + d)}` : `${n(a)} ${MINUS} ${-d} = ${n(a + d)}`);
/** Subtraction text a - b with brackets round a negative b. */
const sub = (a: number, b: number) => (b < 0 ? `${n(a)} ${MINUS} (${n(b)})` : `${n(a)} ${MINUS} ${b}`);
/** Addition text a + b with brackets round a negative b. */
const plus = (a: number, b: number) => (b < 0 ? `${n(a)} + (${n(b)})` : `${n(a)} + ${b}`);
/** Non-zero integer in [lo, hi]. */
const nz = (rng: () => number, lo: number, hi: number) => {
  let v = 0;
  while (v === 0) v = int(rng, lo, hi);
  return v;
};
const sgn = (v: number) => (v < 0 ? -1 : 1);

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

/** "3 right and 2 up" style text for a signed move. */
const move = (dx: number, dy: number) => `${Math.abs(dx)} ${dx > 0 ? "right" : "left"} and ${Math.abs(dy)} ${dy > 0 ? "up" : "down"}`;
const moveShort = (dx: number, dy: number) => `${Math.abs(dx)} ${dx > 0 ? "right" : "left"} ${Math.abs(dy)} ${dy > 0 ? "up" : "down"}`;

const QUAD = {
  rightUp: "Right of the y-axis and above the x-axis",
  leftUp: "Left of the y-axis and above the x-axis",
  rightDown: "Right of the y-axis and below the x-axis",
  leftDown: "Left of the y-axis and below the x-axis",
};
const quadOf = (x: number, y: number) => (x > 0 ? (y > 0 ? QUAD.rightUp : QUAD.rightDown) : y > 0 ? QUAD.leftUp : QUAD.leftDown);

const ROT_CW = `90${"°"} clockwise turn about the origin`;
const ROT_ACW = `90${"°"} anticlockwise turn about the origin`;
const ROT_180 = `180${"°"} turn about the origin`;
const REFL_DIAG = "Reflection in the line y = x";

export const UNIT_13: QuestionTemplate[] = [
  // ---------------- Difficulty 1 ----------------
  {
    id: "u13-quadrant-01",
    unit: 13,
    difficulty: 1,
    resource: "water",
    format: CHOICE,
    params: (rng) => ({ x: nz(rng, -9, 9), y: nz(rng, -9, 9) }),
    prompt: ({ x, y }, zone) =>
      `${Z[zone].Place}, you mark a point for ${Z[zone].landmark} at ${pt(x, y)} on your grid map. ` +
      `Which description of its position is correct?`,
    options: () => [QUAD.rightUp, QUAD.leftUp, QUAD.rightDown, QUAD.leftDown],
    expected: ({ x, y }) => quadOf(x, y),
    solution: ({ x, y }) =>
      `The x-coordinate ${n(x)} is ${x < 0 ? "negative, so the point is left of the y-axis" : "positive, so the point is right of the y-axis"}. ` +
      `The y-coordinate ${n(y)} is ${y < 0 ? "negative, so it is below the x-axis" : "positive, so it is above the x-axis"}. ` +
      `So the point is: ${quadOf(x, y)}.`,
  },
  {
    id: "u13-translate-point-01",
    unit: 13,
    difficulty: 1,
    resource: "food",
    format: CHOICE,
    params(rng) {
      const a = nz(rng, -6, 6);
      const b = nz(rng, -6, 6);
      const c = int(rng, 2, 7);
      let d = int(rng, 2, 7);
      if (d === c) d = c === 7 ? 2 : c + 1;
      return { a, b, c, d, sx: int(rng, 0, 1), sy: int(rng, 0, 1), s: SEL(rng) };
    },
    prompt: ({ a, b, c, d, sx, sy }, zone) =>
      `Near ${Z[zone].landmark}, a marker stake is at P${pt(a, b)} on your grid map. ` +
      `It is moved ${c} units ${sx ? "right" : "left"} and ${d} units ${sy ? "up" : "down"}. What are its new coordinates?`,
    options: ({ a, b, c, d, sx, sy, s }) => {
      const dx = sx ? c : -c;
      const dy = sy ? d : -d;
      const key = pt(a + dx, b + dy);
      return mix(
        key,
        [
          pt(a - dx, b + dy),
          pt(a + dx, b - dy),
          pt(a - dx, b - dy),
          pt(a + sgn(dx) * d, b + sgn(dy) * c),
          pt(b + dy, a + dx),
          pt(a + dx, b),
        ],
        s,
      );
    },
    expected: ({ a, b, c, d, sx, sy }) => pt(a + (sx ? c : -c), b + (sy ? d : -d)),
    solution: ({ a, b, c, d, sx, sy }) => {
      const dx = sx ? c : -c;
      const dy = sy ? d : -d;
      return (
        `Moving ${sx ? "right adds to" : "left takes away from"} the x-coordinate: ${shift(a, dx)}. ` +
        `Moving ${sy ? "up adds to" : "down takes away from"} the y-coordinate: ${shift(b, dy)}. ` +
        `The new coordinates are ${pt(a + dx, b + dy)}.`
      );
    },
  },
  {
    id: "u13-bearing-turn-01",
    unit: 13,
    difficulty: 1,
    resource: "wood",
    format: INT,
    params: (rng) => ({ b: int(rng, 20, 200), t: int(rng, 30, 150) }),
    prompt: ({ b, t }, zone) =>
      `${Z[zone].Place}, you stand facing a bearing of ${b}° (bearings are measured clockwise from north). ` +
      `You turn clockwise through ${t}°. What bearing are you facing now, in degrees?`,
    expected: ({ b, t }) => b + t,
    solution: ({ b, t }) =>
      `Bearings are measured clockwise, so a clockwise turn adds to the bearing: ${b} + ${t} = ${b + t}. ` +
      `You now face a bearing of ${b + t}°.`,
  },
  {
    id: "u13-reflect-vertex-01",
    unit: 13,
    difficulty: 1,
    resource: "stone",
    format: CHOICE,
    params(rng) {
      const a1 = int(rng, 1, 4);
      const a2 = int(rng, 1, 4);
      return { a1, b1: a1 + int(rng, 2, 4), a2, c2: a2 + int(rng, 2, 4), axis: int(rng, 0, 1), v: int(rng, 0, 2), s: SEL(rng) };
    },
    prompt: ({ a1, b1, a2, c2, axis, v }, zone) =>
      `${Z[zone].Place}, a triangular sail has corners A${pt(a1, a2)}, B${pt(b1, a2)} and C${pt(b1, c2)} on a grid map. ` +
      `It is reflected in the ${axis ? "x" : "y"}-axis. What are the coordinates of ${"ABC"[v]}', the image of ${"ABC"[v]}?`,
    options: ({ a1, b1, a2, c2, axis, v, s }) => {
      const [x, y] = [[a1, a2], [b1, a2], [b1, c2]][v];
      const key = axis ? pt(x, -y) : pt(-x, y);
      return mix(key, [axis ? pt(-x, y) : pt(x, -y), pt(-x, -y), pt(y, x), pt(-y, x), pt(x, y), pt(y, -x)], s);
    },
    expected: ({ a1, b1, a2, c2, axis, v }) => {
      const [x, y] = [[a1, a2], [b1, a2], [b1, c2]][v];
      return axis ? pt(x, -y) : pt(-x, y);
    },
    solution: ({ a1, b1, a2, c2, axis, v }) => {
      const [x, y] = [[a1, a2], [b1, a2], [b1, c2]][v];
      return axis
        ? `A reflection in the x-axis changes the sign of the y-coordinate and keeps x. ${"ABC"[v]}${pt(x, y)} goes to ${pt(x, -y)}.`
        : `A reflection in the y-axis changes the sign of the x-coordinate and keeps y. ${"ABC"[v]}${pt(x, y)} goes to ${pt(-x, y)}.`;
    },
  },
  {
    id: "u13-enlarge-length-01",
    unit: 13,
    difficulty: 1,
    resource: "water",
    format: INT,
    params: (rng) => ({ len: int(rng, 3, 12), k: int(rng, 2, 6) }),
    prompt: ({ len, k }, zone) =>
      `${Z[zone].Place}, a pattern for a shelter panel has a side ${len} cm long. ` +
      `You enlarge the pattern with scale factor ${k}. How long is that side in the enlarged pattern, in centimetres?`,
    expected: ({ len, k }) => len * k,
    solution: ({ len, k }) => `An enlargement multiplies every length by the scale factor: ${len} × ${k} = ${len * k}, so the side is ${len * k} cm.`,
  },
  {
    id: "u13-midpoint-x-01",
    unit: 13,
    difficulty: 1,
    resource: "food",
    format: INT,
    params(rng) {
      const x1 = int(rng, 1, 9);
      return { x1, x2: x1 + 2 * int(rng, 1, 5), y1: int(rng, 1, 9), y2: int(rng, 1, 9), swap: int(rng, 0, 1) };
    },
    prompt: ({ x1, x2, y1, y2, swap }, zone) => {
      const [p, q] = swap ? [pt(x2, y2), pt(x1, y1)] : [pt(x1, y1), pt(x2, y2)];
      return (
        `Near ${Z[zone].landmark}, a rope is stretched between stakes at A${p} and B${q}. ` +
        `A flag is tied at the midpoint of the rope. What is the x-coordinate of the flag?`
      );
    },
    expected: ({ x1, x2 }) => (x1 + x2) / 2,
    solution: ({ x1, x2 }) => `The midpoint's x-coordinate is halfway between the x-coordinates: (${x1} + ${x2}) ÷ 2 = ${x1 + x2} ÷ 2 = ${(x1 + x2) / 2}.`,
  },

  // ---------------- Difficulty 2 ----------------
  {
    id: "u13-rotate-90-01",
    unit: 13,
    difficulty: 2,
    resource: "stone",
    format: CHOICE,
    params(rng) {
      let a = nz(rng, -6, 6);
      let b = nz(rng, -6, 6);
      while (Math.abs(a) === Math.abs(b)) b = nz(rng, -6, 6);
      return { a, b, dir: int(rng, 0, 1), s: SEL(rng) };
    },
    prompt: ({ a, b, dir }, zone) =>
      `${Z[zone].Place}, you mark point P${pt(a, b)} on your grid map. P is rotated 90° ${dir ? "anticlockwise" : "clockwise"} ` +
      `about the origin O(0, 0). What are the coordinates of its image?`,
    options: ({ a, b, dir, s }) => {
      const key = dir ? pt(-b, a) : pt(b, -a);
      return mix(key, [dir ? pt(b, -a) : pt(-b, a), pt(-a, -b), pt(b, a), pt(-a, b), pt(a, -b), pt(-b, -a)], s);
    },
    expected: ({ a, b, dir }) => (dir ? pt(-b, a) : pt(b, -a)),
    solution: ({ a, b, dir }) =>
      dir
        ? `A 90° anticlockwise turn about the origin sends (x, y) to (${MINUS}y, x). So P${pt(a, b)} goes to ${pt(-b, a)}.`
        : `A 90° clockwise turn about the origin sends (x, y) to (y, ${MINUS}x). So P${pt(a, b)} goes to ${pt(b, -a)}.`,
  },
  {
    id: "u13-translation-find-01",
    unit: 13,
    difficulty: 2,
    resource: "water",
    format: CHOICE,
    params(rng) {
      const dx = nz(rng, -8, 8);
      let dy = nz(rng, -8, 8);
      while (Math.abs(dy) === Math.abs(dx)) dy = nz(rng, -8, 8);
      return { a: int(rng, -5, 5), b: int(rng, -5, 5), dx, dy, s: SEL(rng) };
    },
    prompt: ({ a, b, dx, dy }, zone) =>
      `Near ${Z[zone].landmark}, a stake moves from A${pt(a, b)} to A'${pt(a + dx, b + dy)} on your grid map. ` +
      `Which description of this translation is correct?`,
    options: ({ a, b, dx, dy, s }) => {
      const slip = Math.abs(Math.abs(a + dx) - Math.abs(a));
      const cands = [
        move(-dx, dy),
        move(dx, -dy),
        move(-dx, -dy),
        move(sgn(dx) * Math.abs(dy), sgn(dy) * Math.abs(dx)),
      ];
      if (slip > 0) cands.push(move(sgn(dx) * slip, dy));
      return mix(move(dx, dy), cands, s);
    },
    expected: ({ dx, dy }) => move(dx, dy),
    solution: ({ a, b, dx, dy }) =>
      `The x-coordinate changes from ${n(a)} to ${n(a + dx)}, a change of ${n(dx)}, so ${dx > 0 ? "right" : "left"} ${Math.abs(dx)}. ` +
      `The y-coordinate changes from ${n(b)} to ${n(b + dy)}, a change of ${n(dy)}, so ${dy > 0 ? "up" : "down"} ${Math.abs(dy)}. ` +
      `The translation is ${move(dx, dy)}.`,
  },
  {
    id: "u13-bearing-back-01",
    unit: 13,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params(rng) {
      let th = int(rng, 10, 350);
      if (th === 180) th = 200;
      return { th };
    },
    prompt: ({ th }, zone) =>
      `${Z[zone].Place}, the bearing of ${Z[zone].landmark} from your camp is ${th}° (measured clockwise from north). ` +
      `What is the bearing of your camp from ${Z[zone].landmark}, in degrees?`,
    expected: ({ th }) => (th < 180 ? th + 180 : th - 180),
    solution: ({ th }) =>
      th < 180
        ? `The return bearing differs by 180°. ${th} is less than 180, so add: ${th} + 180 = ${th + 180}.`
        : `The return bearing differs by 180°. ${th} is more than 180, so subtract: ${th} ${MINUS} 180 = ${th - 180}.`,
  },
  {
    id: "u13-reflect-line-01",
    unit: 13,
    difficulty: 2,
    resource: "food",
    format: CHOICE,
    params(rng) {
      const m = int(rng, 2, 6);
      let a = int(rng, -3, 10);
      while (a === m || a === 0) a = int(rng, -3, 10);
      return { m, a, b: nz(rng, -8, 8), s: SEL(rng) };
    },
    prompt: ({ m, a, b }, zone) =>
      `${Z[zone].Place}, a trap is at P${pt(a, b)} on your grid map. P is reflected in the vertical line x = ${m}. ` +
      `What are the coordinates of the image of P?`,
    options: ({ m, a, b, s }) =>
      mix(pt(2 * m - a, b), [pt(-a, b), pt(m - a, b), pt(a, 2 * m - b), pt(2 * m - a, -b), pt(a, -b), pt(m + a, b)], s),
    expected: ({ m, a, b }) => pt(2 * m - a, b),
    solution: ({ m, a, b }) => {
      const d = Math.abs(a - m);
      return (
        `P is ${d} units ${a < m ? "left" : "right"} of the line x = ${m}, so its image is ${d} units on the other side: ` +
        `x = ${m} ${a < m ? "+" : MINUS} ${d} = ${n(2 * m - a)}. The y-coordinate stays ${n(b)}, so the image is ${pt(2 * m - a, b)}.`
      );
    },
  },
  {
    id: "u13-enlarge-vertex-01",
    unit: 13,
    difficulty: 2,
    resource: "wood",
    format: CHOICE,
    params(rng) {
      const a = nz(rng, -5, 5);
      let b = nz(rng, -5, 5);
      while (b === a) b = nz(rng, -5, 5);
      return { a, b, k: int(rng, 2, 5), s: SEL(rng) };
    },
    prompt: ({ a, b, k }, zone) =>
      `${Z[zone].Place}, a marker at A${pt(a, b)} is enlarged with scale factor ${k} and the origin O(0, 0) as the centre of enlargement. ` +
      `What are the coordinates of the image of A?`,
    options: ({ a, b, k, s }) =>
      mix(pt(k * a, k * b), [pt(a + k, b + k), pt(k * a, b), pt(a, k * b), pt(k * b, k * a), pt(-k * a, k * b), pt(k * a, -k * b)], s),
    expected: ({ a, b, k }) => pt(k * a, k * b),
    solution: ({ a, b, k }) =>
      `With the origin as the centre, multiply both coordinates by the scale factor ${k}: ${n(a)} × ${k} = ${n(k * a)} and ${n(b)} × ${k} = ${n(k * b)}. ` +
      `The image is ${pt(k * a, k * b)}.`,
  },
  {
    id: "u13-midpoint-neg-01",
    unit: 13,
    difficulty: 2,
    resource: "stone",
    format: CHOICE,
    params(rng) {
      const x1 = int(rng, -8, 8);
      const y1 = int(rng, -8, 8);
      return { x1, x2: x1 + 2 * nz(rng, -6, 6), y1, y2: y1 + 2 * nz(rng, -6, 6), s: SEL(rng) };
    },
    prompt: ({ x1, x2, y1, y2 }, zone) =>
      `Near ${Z[zone].landmark}, you stretch a rope between stakes at A${pt(x1, y1)} and B${pt(x2, y2)} on your grid map. ` +
      `What are the coordinates of the midpoint of AB?`,
    options: ({ x1, x2, y1, y2, s }) => {
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      return mix(
        pt(mx, my),
        [pt(x1 + x2, y1 + y2), pt((x2 - x1) / 2, (y2 - y1) / 2), pt(mx, y1 + y2), pt(my, mx), pt((Math.abs(x1) + Math.abs(x2)) / 2, (Math.abs(y1) + Math.abs(y2)) / 2), pt(x1 + x2, my), pt(mx, -my), pt(-mx, my), pt(x2 - x1, y2 - y1), pt(my, -mx)],
        s,
      );
    },
    expected: ({ x1, x2, y1, y2 }) => pt((x1 + x2) / 2, (y1 + y2) / 2),
    solution: ({ x1, x2, y1, y2 }) =>
      `Add the coordinates and halve. x: (${plus(x1, x2)}) ÷ 2 = ${n(x1 + x2)} ÷ 2 = ${n((x1 + x2) / 2)}. ` +
      `y: (${plus(y1, y2)}) ÷ 2 = ${n(y1 + y2)} ÷ 2 = ${n((y1 + y2) / 2)}. The midpoint is ${pt((x1 + x2) / 2, (y1 + y2) / 2)}.`,
  },
  {
    id: "u13-rect-perimeter-01",
    unit: 13,
    difficulty: 2,
    resource: "water",
    format: INT,
    params(rng) {
      const w = int(rng, 3, 9);
      let h = int(rng, 2, 8);
      if (h === w) h = w === 9 ? 2 : w + 1;
      const x1 = int(rng, -6, 2);
      const y1 = int(rng, -5, 2);
      return { x1, y1, x2: x1 + w, y2: y1 + h };
    },
    prompt: ({ x1, y1, x2, y2 }, zone) =>
      `${Z[zone].Place}, a rectangular garden has sides parallel to the grid lines. Opposite corners are A${pt(x1, y1)} and C${pt(x2, y2)}. ` +
      `Each grid square is 1 m wide. What length of fence goes all the way round it, in metres?`,
    expected: ({ x1, y1, x2, y2 }) => 2 * (x2 - x1 + (y2 - y1)),
    solution: ({ x1, y1, x2, y2 }) =>
      `Width: ${sub(x2, x1)} = ${x2 - x1}. Height: ${sub(y2, y1)} = ${y2 - y1}. ` +
      `Perimeter = 2 × (${x2 - x1} + ${y2 - y1}) = 2 × ${x2 - x1 + (y2 - y1)} = ${2 * (x2 - x1 + (y2 - y1))} metres.`,
  },
  {
    id: "u13-scale-find-01",
    unit: 13,
    difficulty: 2,
    resource: "food",
    format: INT,
    params: (rng) => ({ len: int(rng, 2, 9), k: int(rng, 2, 7), m: int(rng, 3, 11) }),
    prompt: ({ len, k, m }, zone) =>
      `${Z[zone].Place}, an enlargement turns a side of a net pattern from ${len} cm into ${len * k} cm. ` +
      `The same enlargement is applied to another side that is ${m} cm long. How long is that side after the enlargement, in centimetres?`,
    expected: ({ k, m }) => k * m,
    solution: ({ len, k, m }) =>
      `The scale factor is ${len * k} ÷ ${len} = ${k}. The other side becomes ${m} × ${k} = ${k * m} cm.`,
  },

  // ---------------- Difficulty 3 ----------------
  {
    id: "u13-two-step-01",
    unit: 13,
    difficulty: 3,
    resource: "food",
    format: CHOICE,
    params(rng) {
      const c = int(rng, 2, 6);
      let d = int(rng, 2, 6);
      if (d === c) d = c === 6 ? 2 : c + 1;
      return { a: nz(rng, -6, 6), b: nz(rng, -6, 6), axis: int(rng, 0, 1), sx: int(rng, 0, 1), sy: int(rng, 0, 1), c, d, s: SEL(rng) };
    },
    prompt: ({ a, b, axis, sx, sy, c, d }, zone) =>
      `${Z[zone].Place}, point P${pt(a, b)} is reflected in the ${axis ? "y" : "x"}-axis. Its image is then moved ` +
      `${c} units ${sx ? "right" : "left"} and ${d} units ${sy ? "up" : "down"}. What are the coordinates of the final image?`,
    options: ({ a, b, axis, sx, sy, c, d, s }) => {
      const dx = sx ? c : -c;
      const dy = sy ? d : -d;
      const refl = (x: number, y: number): [number, number] => (axis ? [-x, y] : [x, -y]);
      const other = (x: number, y: number): [number, number] => (axis ? [x, -y] : [-x, y]);
      const [rx, ry] = refl(a, b);
      const [ox, oy] = other(a, b);
      const [tx, ty] = refl(a + dx, b + dy);
      return mix(
        pt(rx + dx, ry + dy),
        [pt(tx, ty), pt(rx, ry), pt(a + dx, b + dy), pt(ox + dx, oy + dy), pt(rx - dx, ry + dy), pt(rx + sgn(dx) * d, ry + sgn(dy) * c)],
        s,
      );
    },
    expected: ({ a, b, axis, sx, sy, c, d }) => {
      const [rx, ry] = axis ? [-a, b] : [a, -b];
      return pt(rx + (sx ? c : -c), ry + (sy ? d : -d));
    },
    solution: ({ a, b, axis, sx, sy, c, d }) => {
      const [rx, ry] = axis ? [-a, b] : [a, -b];
      const dx = sx ? c : -c;
      const dy = sy ? d : -d;
      return (
        `Step 1, reflect in the ${axis ? "y" : "x"}-axis: P${pt(a, b)} goes to ${pt(rx, ry)}. ` +
        `Step 2, move ${c} ${sx ? "right" : "left"} and ${d} ${sy ? "up" : "down"}: x is ${shift(rx, dx)} and y is ${shift(ry, dy)}. ` +
        `The final image is ${pt(rx + dx, ry + dy)}.`
      );
    },
  },
  {
    id: "u13-reverse-translation-01",
    unit: 13,
    difficulty: 3,
    resource: "stone",
    format: CHOICE,
    params(rng) {
      const c = int(rng, 2, 7);
      let d = int(rng, 2, 7);
      if (d === c) d = c === 7 ? 2 : c + 1;
      return { a: nz(rng, -6, 6), b: nz(rng, -6, 6), c, d, sx: int(rng, 0, 1), sy: int(rng, 0, 1), s: SEL(rng) };
    },
    prompt: ({ a, b, c, d, sx, sy }, zone) => {
      const dx = sx ? c : -c;
      const dy = sy ? d : -d;
      return (
        `Near ${Z[zone].landmark}, you place a flag, then move it ${c} units ${sx ? "right" : "left"} and ${d} units ${sy ? "up" : "down"}. ` +
        `It now stands at ${pt(a + dx, b + dy)}. Where did you first place the flag?`
      );
    },
    options: ({ a, b, c, d, sx, sy, s }) => {
      const dx = sx ? c : -c;
      const dy = sy ? d : -d;
      const f = a + dx;
      const g = b + dy;
      return mix(pt(a, b), [pt(f + dx, g + dy), pt(f - dx, g + dy), pt(f + dx, g - dy), pt(f - sgn(dx) * d, g - sgn(dy) * c), pt(g - dy, f - dx), pt(f, g - dy)], s);
    },
    expected: ({ a, b }) => pt(a, b),
    solution: ({ a, b, c, d, sx, sy }) => {
      const dx = sx ? c : -c;
      const dy = sy ? d : -d;
      return (
        `To go back, undo the move: ${sx ? "left" : "right"} ${c} and ${sy ? "down" : "up"} ${d}. ` +
        `x: ${shift(a + dx, -dx)}. y: ${shift(b + dy, -dy)}. The flag was first placed at ${pt(a, b)}.`
      );
    },
  },
  {
    id: "u13-find-rotation-01",
    unit: 13,
    difficulty: 3,
    resource: "water",
    format: CHOICE,
    params(rng) {
      const a = nz(rng, -6, 6);
      let b = nz(rng, -6, 6);
      while (Math.abs(a) === Math.abs(b)) b = nz(rng, -6, 6);
      return { a, b, t: int(rng, 0, 3) };
    },
    prompt: ({ a, b, t }, zone) => {
      const [c, d] = [[b, -a], [-b, a], [-a, -b], [b, a]][t];
      return (
        `${Z[zone].Place}, point P${pt(a, b)} on your grid map is moved by one transformation to P'${pt(c, d)}. ` +
        `Which transformation does this?`
      );
    },
    options: () => [ROT_CW, ROT_ACW, ROT_180, REFL_DIAG],
    expected: ({ t }) => [ROT_CW, ROT_ACW, ROT_180, REFL_DIAG][t],
    solution: ({ a, b, t }) => {
      const [c, d] = [[b, -a], [-b, a], [-a, -b], [b, a]][t];
      const rule = [
        `(x, y) → (y, ${MINUS}x)`,
        `(x, y) → (${MINUS}y, x)`,
        `(x, y) → (${MINUS}x, ${MINUS}y)`,
        `(x, y) → (y, x)`,
      ][t];
      return `Test the rule that fits: P${pt(a, b)} goes to P'${pt(c, d)} under ${rule}. The other three rules give different points. So it is: ${[ROT_CW, ROT_ACW, ROT_180, REFL_DIAG][t]}.`;
    },
  },
  {
    id: "u13-enlarge-area-01",
    unit: 13,
    difficulty: 3,
    resource: "wood",
    format: INT,
    params: (rng) => ({ w: int(rng, 2, 6), h: int(rng, 2, 5), k: int(rng, 2, 4) }),
    prompt: ({ w, h, k }, zone) =>
      `${Z[zone].Place}, a plot has corners O(0, 0), P(${w}, 0), Q(${w}, ${h}) and R(0, ${h}); one unit is 1 metre. ` +
      `It is enlarged with scale factor ${k} and centre O. What is the area of the enlarged plot, in square metres?`,
    expected: ({ w, h, k }) => k * w * (k * h),
    solution: ({ w, h, k }) =>
      `Every length is multiplied by ${k}, so the enlarged plot is ${k * w} m by ${k * h} m. ` +
      `Area = ${k * w} × ${k * h} = ${k * w * k * h} square metres.`,
  },
  {
    id: "u13-bearing-chain-01",
    unit: 13,
    difficulty: 3,
    resource: "stone",
    format: INT,
    params(rng) {
      const th = int(rng, 20, 170);
      let t = int(rng, 30, 170);
      if (th + t === 180) t += 1;
      return { th, t };
    },
    prompt: ({ th, t }, zone) =>
      `${Z[zone].Place}, the bearing of ${Z[zone].landmark} from your camp is ${th}°. You walk there, turn to face directly back at your camp, ` +
      `then turn clockwise through ${t}°. What bearing are you now facing, in degrees?`,
    expected: ({ th, t }) => (th + 180 + t) % 360,
    solution: ({ th, t }) => {
      const raw = th + 180 + t;
      return (
        `Facing back at camp, your bearing is ${th} + 180 = ${th + 180}. A clockwise turn of ${t} adds ${t}: ${th + 180} + ${t} = ${raw}. ` +
        (raw >= 360 ? `A bearing must be less than 360, so subtract 360: ${raw} ${MINUS} 360 = ${raw - 360}.` : `So you face a bearing of ${raw}°.`)
      );
    },
  },
  {
    id: "u13-claim-translation-01",
    unit: 13,
    difficulty: 3,
    resource: "water",
    format: CHOICE,
    params(rng) {
      const dx = nz(rng, -5, 5);
      const dy = nz(rng, -5, 5);
      const same = int(rng, 0, 1);
      // when the moves differ, Q moves by (dx + e1, dy) or (dx, dy + e2) with a non-zero result
      const which = int(rng, 0, 1);
      let e = int(rng, 0, 1) ? 1 : -1;
      if ((which === 0 ? dx + e : dy + e) === 0) e = -e;
      return { dx, dy, same, which, e, p1: int(rng, -5, 5), p2: int(rng, -5, 5), q1: int(rng, -5, 5), q2: int(rng, -5, 5), s: SEL(rng) };
    },
    prompt: ({ dx, dy, same, which, e, p1, p2, q1, q2 }, zone) => {
      const [qx, qy] = same ? [dx, dy] : which === 0 ? [dx + e, dy] : [dx, dy + e];
      return (
        `${Z[zone].Place}, stakes P${pt(p1, p2)} and Q${pt(q1, q2)} are moved to P'${pt(p1 + dx, p2 + dy)} and Q'${pt(q1 + qx, q2 + qy)}. ` +
        `Kai says one translation moved both stakes. Which statement is correct?`
      );
    },
    options: ({ dx, dy, same, which, e, s }) => {
      const [qx, qy] = same ? [dx, dy] : which === 0 ? [dx + e, dy] : [dx, dy + e];
      if (same) {
        return mix(
          `Yes: both move ${moveShort(dx, dy)}`,
          [
            `No: P ${moveShort(dx, dy)}, Q ${moveShort(dx + (dx + 1 === 0 ? -1 : 1), dy)}`,
            `No: P ${moveShort(dx, dy)}, Q ${moveShort(dx, dy + (dy + 1 === 0 ? -1 : 1))}`,
            `Yes: both move ${moveShort(sgn(dx) * Math.abs(dy), sgn(dy) * Math.abs(dx))}`,
            `Yes: both move ${moveShort(-dx, dy)}`,
          ],
          s,
        );
      }
      return mix(
        `No: P ${moveShort(dx, dy)}, Q ${moveShort(qx, qy)}`,
        [
          `Yes: both move ${moveShort(dx, dy)}`,
          `Yes: both move ${moveShort(qx, qy)}`,
          `No: P ${moveShort(qx, qy)}, Q ${moveShort(dx, dy)}`,
          `No: P ${moveShort(dx, dy)}, Q ${moveShort(-qx, qy)}`,
        ],
        s,
      );
    },
    expected: ({ dx, dy, same, which, e }) => {
      const [qx, qy] = same ? [dx, dy] : which === 0 ? [dx + e, dy] : [dx, dy + e];
      return same ? `Yes: both move ${moveShort(dx, dy)}` : `No: P ${moveShort(dx, dy)}, Q ${moveShort(qx, qy)}`;
    },
    solution: ({ dx, dy, same, which, e }) => {
      const [qx, qy] = same ? [dx, dy] : which === 0 ? [dx + e, dy] : [dx, dy + e];
      const ans = same ? `Yes: both move ${moveShort(dx, dy)}` : `No: P ${moveShort(dx, dy)}, Q ${moveShort(qx, qy)}`;
      return (
        `Work out each move from the coordinates. P moves ${move(dx, dy)}. Q moves ${move(qx, qy)}. ` +
        `${same ? "The moves are the same" : "The moves are different"}, so the answer is: ${ans}.`
      );
    },
  },
];
