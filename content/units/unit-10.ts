/**
 * Unit 10 bank: graphs.
 * Original templates written for this game. Difficulty 1 = read a coordinate
 * or a simple rule; 2 = gradient, midpoint, points on lines, intercepts,
 * reading a distance-time line; 3 = find a line from two points, where lines
 * cross, check a claim, multi-stage journeys. Every graph is described in
 * words, coordinates or a table of values, so no picture is needed. Numeric
 * answers are positive whole numbers; equations the student writes use the
 * typed `expression` format (the part after "y =").
 */
import type { QuestionTemplate } from "@/lib/questions/types";
import { int } from "@/lib/questions/random";
import { ZONE_WORDS as Z } from "@/content/units/zones";
import { pickRanked } from "@/content/units/rankpick";

const INT = { kind: "integer" } as const;
const CHOICE = { kind: "choice", options: [] as string[] } as const;
const EXPR = { kind: "expression" } as const;
const MINUS = "−";
const TIMES = "×";
const DIV = "÷";
const numsIn = (s: string): number[] => (s.match(/\d+/g) ?? []).map(Number);
const pt = (x: number, y: number) => `(${x}, ${y})`;
/** Coefficient text: 1 is left out. */
const co = (n: number) => (n === 1 ? "" : `${n}`);
const hours = (n: number) => (n === 1 ? "1 hour" : `${n} hours`);
/** Equation text for y = mx + c, written in one of two orders. */
const line = (m: number, c: number, flip: number) => (flip ? `y = ${c} + ${m}x` : `y = ${m}x + ${c}`);

/** Scorers for "(x, y)" options: x, y and x + y. */
const parsePt = (o: string): [number, number] => {
  const m = /\((\d+), (\d+)\)/.exec(o)!;
  return [Number(m[1]), Number(m[2])];
};
const PT_SCORERS = [(o: string) => parsePt(o)[0], (o: string) => parsePt(o)[1], (o: string) => parsePt(o)[0] + parsePt(o)[1]];
/** Wrong points only: positive coordinates, never the key. Targets and tie-break come from the seed. */
const pickPoints = (key: string, slips: [number, number][], p: Record<string, number>) =>
  pickRanked(
    key,
    slips.filter(([x, y]) => x > 0 && y > 0).map(([x, y]) => pt(x, y)),
    PT_SCORERS,
    [p.t0, p.t1, p.t2],
    p.tie,
  );
const seedRanks = (rng: () => number) => ({ t0: int(rng, 0, 3), t1: int(rng, 0, 3), t2: int(rng, 0, 3), tie: int(rng, 0, 999) });

export const UNIT_10: QuestionTemplate[] = [
  // ---------------- Difficulty 1 ----------------
  {
    id: "u10-distance-axis-01",
    unit: 10,
    difficulty: 1,
    resource: "water",
    format: INT,
    params: (rng) => ({
      x: int(rng, 1, 9),
      y: int(rng, 1, 9),
      d: int(rng, 3, 15),
      vert: int(rng, 0, 1),
      swap: int(rng, 0, 1),
    }),
    prompt: ({ x, y, d, vert, swap }, zone) => {
      const far = vert ? pt(x, y + d) : pt(x + d, y);
      const [land, spring] = swap ? [far, pt(x, y)] : [pt(x, y), far];
      return (
        `${Z[zone].Place}, ${Z[zone].landmark} is at ${land} on your grid map and the spring is at ${spring}. ` +
        `One grid unit is 1 metre. How many metres is the spring from ${Z[zone].landmark}?`
      );
    },
    expected: ({ d }) => d,
    solution: ({ x, y, d, vert }) =>
      vert
        ? `Both points have x = ${x}, so they are in the same vertical line. The distance is the difference in y: ${y + d} ${MINUS} ${y} = ${d} metres.`
        : `Both points have y = ${y}, so they are in the same horizontal line. The distance is the difference in x: ${x + d} ${MINUS} ${x} = ${d} metres.`,
  },
  {
    id: "u10-quadrant-01",
    unit: 10,
    difficulty: 1,
    resource: "food",
    format: CHOICE,
    params: (rng) => ({ a: int(rng, 1, 9), b: int(rng, 1, 9), nx: int(rng, 0, 1), ny: int(rng, 0, 1) }),
    prompt: ({ a, b, nx, ny }, zone) =>
      `${Z[zone].Place}, your grid map has the x-axis pointing right and the y-axis pointing up. ` +
      `A cache of ${Z[zone].food} is marked at (${nx ? MINUS : ""}${a}, ${ny ? MINUS : ""}${b}). In which quadrant is the cache?`,
    options: () => ["Top-right", "Top-left", "Bottom-left", "Bottom-right"],
    expected: ({ nx, ny }) => `${ny ? "Bottom" : "Top"}-${nx ? "left" : "right"}`,
    solution: ({ nx, ny }) =>
      `x is ${nx ? "negative, so the point is left" : "positive, so the point is right"} of the y-axis, and y is ` +
      `${ny ? "negative, so it is below" : "positive, so it is above"} the x-axis. It is in the ${ny ? "Bottom" : "Top"}-${nx ? "left" : "right"} quadrant.`,
  },
  {
    id: "u10-evaluate-line-01",
    unit: 10,
    difficulty: 1,
    resource: "stone",
    format: INT,
    params: (rng) => ({ m: int(rng, 2, 6), c: int(rng, 1, 9), x: int(rng, 2, 9), flip: int(rng, 0, 1) }),
    prompt: ({ m, c, x, flip }, zone) =>
      `${Z[zone].Place}, a straight path on your map follows ${line(m, c, flip)}. What is y when x = ${x}?`,
    expected: ({ m, c, x }) => m * x + c,
    solution: ({ m, c, x }) =>
      `Put x = ${x} into the equation: ${m} ${TIMES} ${x} + ${c} = ${m * x} + ${c} = ${m * x + c}.`,
  },
  {
    id: "u10-y-intercept-01",
    unit: 10,
    difficulty: 1,
    resource: "wood",
    format: INT,
    params: (rng) => ({ m: int(rng, 2, 6), c: int(rng, 1, 9), flip: int(rng, 0, 1) }),
    prompt: ({ m, c, flip }, zone) =>
      `${Z[zone].Place}, a rope line on your map is ${line(m, c, flip)}. At what value of y does the line cross the y-axis?`,
    expected: ({ c }) => c,
    solution: ({ m, c }) =>
      `The line crosses the y-axis where x = 0. Then ${m} ${TIMES} 0 = 0, so y = 0 + ${c} = ${c}.`,
  },
  {
    id: "u10-vertical-horizontal-01",
    unit: 10,
    difficulty: 1,
    resource: "wood",
    format: CHOICE,
    params: (rng) => {
      const a = int(rng, 1, 9);
      return { a, b: ((a + int(rng, 1, 8) - 1) % 9) + 1, vert: int(rng, 0, 1) };
    },
    prompt: ({ a, b, vert }, zone) =>
      `${Z[zone].Place}, a fence runs ${vert ? "straight up and down" : "level from left to right"} through the point (${a}, ${b}) ` +
      `on your grid map. Which equation describes the fence?`,
    options: ({ a, b }) => [`x = ${a}`, `y = ${a}`, `x = ${b}`, `y = ${b}`],
    expected: ({ a, b, vert }) => (vert ? `x = ${a}` : `y = ${b}`),
    solution: ({ a, b, vert }) =>
      vert
        ? `Every point on a vertical line has the same x-value, ${a}, so its equation is x = ${a}.`
        : `Every point on a horizontal line has the same y-value, ${b}, so its equation is y = ${b}.`,
  },
  {
    id: "u10-distance-time-01",
    unit: 10,
    difficulty: 1,
    resource: "food",
    format: INT,
    params: (rng) => ({ s: int(rng, 3, 9), t: int(rng, 5, 9) }),
    prompt: ({ s, t }, zone) =>
      `${Z[zone].Place}, you walk at a steady speed. After 1 hour you have gone ${s} km, after 2 hours ${2 * s} km and after 3 hours ${3 * s} km. ` +
      `How far will you have gone after ${t} hours?`,
    expected: ({ s, t }) => s * t,
    solution: ({ s, t }) => `Each hour adds ${s} km, so after ${t} hours you have gone ${t} ${TIMES} ${s} = ${s * t} km.`,
  },

  // ---------------- Difficulty 2 ----------------
  {
    id: "u10-gradient-02",
    unit: 10,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params: (rng) => ({ m: int(rng, 2, 6), h: int(rng, 2, 5), x: int(rng, 1, 6), y: int(rng, 1, 6) }),
    prompt: ({ m, h, x, y }, zone) =>
      `${Z[zone].Place}, a straight ramp on your map rises from ${pt(x, y)} to ${pt(x + h, y + m * h)}. What is the gradient of the ramp?`,
    expected: ({ m }) => m,
    solution: ({ m, h, x, y }) =>
      `Gradient = rise ${DIV} run. Rise = ${y + m * h} ${MINUS} ${y} = ${m * h}. Run = ${x + h} ${MINUS} ${x} = ${h}. ` +
      `${m * h} ${DIV} ${h} = ${m}.`,
  },
  {
    id: "u10-line-equation-02",
    unit: 10,
    difficulty: 2,
    resource: "stone",
    format: EXPR,
    params: (rng) => ({ neg: int(rng, 0, 1), g: int(rng, 2, 6), c: int(rng, 1, 9) }),
    prompt: ({ neg, g, c }, zone) =>
      `${Z[zone].Place}, a straight track has gradient ${neg ? MINUS : ""}${g} and crosses the y-axis at (0, ${c}). ` +
      `Write the right-hand side of its equation y = ... in terms of x.`,
    expected: ({ neg, g, c }) => `${neg ? "-" : ""}${g}x+${c}`,
    solution: ({ neg, g, c }) =>
      `A line has the form y = mx + c, where m is the gradient and c is where it crosses the y-axis. ` +
      `Here m = ${neg ? MINUS : ""}${g} and c = ${c}, so the right-hand side is ${neg ? "-" : ""}${g}x+${c}.`,
  },
  {
    id: "u10-midpoint-02",
    unit: 10,
    difficulty: 2,
    resource: "water",
    format: CHOICE,
    params: (rng) => {
      const mx = int(rng, 4, 9);
      let my = int(rng, 4, 9);
      if (my === mx) my = my === 9 ? 4 : my + 1;
      return { mx, my, h: int(rng, 1, mx - 1), k: int(rng, 1, my - 1), ...seedRanks(rng) };
    },
    prompt: ({ mx, my, h, k }, zone) =>
      `${Z[zone].Place}, two lookout posts are at ${pt(mx - h, my - k)} and ${pt(mx + h, my + k)} on your grid map. ` +
      `A signal fire is placed exactly halfway between them. What are its coordinates?`,
    // Slips: not halved, swapped, half the gap, one coordinate not halved, a post's own coordinate, an off-by-one.
    options: (p) => {
      const { mx, my, h, k } = p;
      return pickPoints(
        pt(mx, my),
        [[2 * mx, 2 * my], [my, mx], [h, k], [mx, 2 * my], [2 * mx, my], [mx, my + k], [mx, my - k], [mx + h, my], [mx - h, my], [mx + 1, my], [mx - 1, my], [mx, my + 1], [mx, my - 1]],
        p,
      );
    },
    expected: ({ mx, my }) => pt(mx, my),
    solution: ({ mx, my, h, k }) =>
      `Add the x-values and halve: (${mx - h} + ${mx + h}) ${DIV} 2 = ${mx}. Add the y-values and halve: (${my - k} + ${my + k}) ${DIV} 2 = ${my}. ` +
      `The midpoint is ${pt(mx, my)}.`,
  },
  {
    id: "u10-on-line-02",
    unit: 10,
    difficulty: 2,
    resource: "food",
    format: CHOICE,
    params: (rng) => ({ m: int(rng, 3, 6), c: int(rng, 1, 5), k: int(rng, 3, 9), ...seedRanks(rng) }),
    prompt: ({ m, c }, zone) =>
      `${Z[zone].Place}, a path follows the line y = ${m}x + ${c} on your map. Which of these points is on the path?`,
    // Slips: the right y at a neighbouring x, the coordinates swapped, y for the wrong x. None is on the line.
    options: (p) => {
      const { m, c, k } = p;
      const y = m * k + c;
      const slips: [number, number][] = [
        [k + 1, y], [k - 1, y], [y, k], [k + 2, m * k], [k - 2, y + c], [k, m * k], [k, y + m], [k + 1, y + c],
        [k - 1, m * k], [k + 3, y], [k - 2, y], [k + 2, y + m], [y, k + 1],
      ];
      return pickPoints(pt(k, y), slips.filter(([x, yy]) => m * x + c !== yy), p);
    },
    expected: ({ m, c, k }) => pt(k, m * k + c),
    solution: ({ m, c, k }) =>
      `Test x = ${k}: y = ${m} ${TIMES} ${k} + ${c} = ${m * k} + ${c} = ${m * k + c}. So ${pt(k, m * k + c)} is on the line; ` +
      `the other points have a different y for their x.`,
  },
  {
    id: "u10-find-c-02",
    unit: 10,
    difficulty: 2,
    resource: "water",
    format: INT,
    params: (rng) => ({ m: int(rng, 2, 6), c: int(rng, 1, 9), x: int(rng, 2, 8) }),
    prompt: ({ m, c, x }, zone) =>
      `${Z[zone].Place}, a straight line y = ${m}x + c passes through the point ${pt(x, m * x + c)}. What is the value of c?`,
    expected: ({ c }) => c,
    solution: ({ m, c, x }) =>
      `Put x = ${x} and y = ${m * x + c} into the equation: ${m * x + c} = ${m} ${TIMES} ${x} + c = ${m * x} + c. ` +
      `So c = ${m * x + c} ${MINUS} ${m * x} = ${c}.`,
  },
  {
    id: "u10-speed-02",
    unit: 10,
    difficulty: 2,
    resource: "food",
    format: INT,
    params: (rng) => ({ v: int(rng, 2, 9), t: int(rng, 1, 3), g: int(rng, 2, 5), d: int(rng, 2, 12) }),
    prompt: ({ v, t, g, d }, zone) =>
      `${Z[zone].Place}, on a distance-time graph a straight line passes through ${pt(t, d)} and ${pt(t + g, d + v * g)}. ` +
      `The first number is hours and the second is kilometres. What is the speed in km/h?`,
    expected: ({ v }) => v,
    solution: ({ v, t, g, d }) =>
      `Speed is the gradient of the line. Distance rises by ${d + v * g} ${MINUS} ${d} = ${v * g} km in ${t + g} ${MINUS} ${t} = ${g} hours. ` +
      `${v * g} ${DIV} ${g} = ${v} km/h.`,
  },
  {
    id: "u10-x-intercept-02",
    unit: 10,
    difficulty: 2,
    resource: "stone",
    format: INT,
    params: (rng) => ({ m: int(rng, 2, 6), k: int(rng, 2, 9) }),
    prompt: ({ m, k }, zone) =>
      `${Z[zone].Place}, a straight line on your map has the equation y = ${m}x ${MINUS} ${m * k}. At what value of x does it cross the x-axis?`,
    expected: ({ k }) => k,
    solution: ({ m, k }) =>
      `On the x-axis y = 0, so ${m}x ${MINUS} ${m * k} = 0. Add ${m * k}: ${m}x = ${m * k}. Divide by ${m}: x = ${k}.`,
  },
  {
    id: "u10-rectangle-02",
    unit: 10,
    difficulty: 2,
    resource: "wood",
    format: CHOICE,
    params: (rng) => {
      const x1 = int(rng, 3, 7);
      const y1 = int(rng, 3, 7);
      return { x1, x2: x1 + int(rng, 3, 6), y1, y2: y1 + int(rng, 3, 6), ...seedRanks(rng) };
    },
    prompt: ({ x1, x2, y1, y2 }, zone) =>
      `${Z[zone].Place}, three corners of a rectangular plot are at ${pt(x1, y1)}, ${pt(x2, y1)} and ${pt(x2, y2)}. ` +
      `Its sides are parallel to the axes. What are the coordinates of the fourth corner?`,
    // Slips: sums and gaps of the given coordinates, swapped coordinates, a corner already given.
    options: (p) => {
      const { x1, x2, y1, y2 } = p;
      return pickPoints(
        pt(x1, y2),
        [
          [x2, y1 + y2], [x1, y1], [x1 + x2, y1], [y2 - y1, x1], [x2 - x1, y1], [x2, y2 - y1], [x1, y1 + y2], [x1 + x2, y2],
          [x2 - x1, y2], [x1, y2 - y1], [y2, x1], [x1 + 1, y2], [x1 - 1, y2], [x1, y2 + 1], [x1, y2 - 1], [x1 - 2, y2], [x1 - 1, y1], [y1, x1], [x1 - 2, y2 - 1],
        ],
        p,
      );
    },
    expected: ({ x1, y2 }) => pt(x1, y2),
    solution: ({ x1, x2, y1, y2 }) =>
      `The corners at ${pt(x1, y1)} and ${pt(x2, y1)} share y = ${y1}, and the corner at ${pt(x2, y2)} is directly above the second one. ` +
      `The fourth corner is above ${pt(x1, y1)}, so it has x = ${x1} and y = ${y2}: ${pt(x1, y2)}.`,
  },

  // ---------------- Difficulty 3 ----------------
  {
    id: "u10-line-two-points-03",
    unit: 10,
    difficulty: 3,
    resource: "stone",
    format: EXPR,
    params: (rng) => {
      const p = int(rng, 1, 3);
      return { m: int(rng, 2, 5), c: int(rng, 1, 9), p, q: p + int(rng, 2, 4) };
    },
    prompt: ({ m, c, p, q }, zone) =>
      `${Z[zone].Place}, a straight line passes through ${pt(p, m * p + c)} and ${pt(q, m * q + c)}. ` +
      `Write the right-hand side of its equation y = ... in terms of x.`,
    expected: ({ m, c }) => `${m}x+${c}`,
    solution: ({ m, c, p, q }) =>
      `Gradient = (${m * q + c} ${MINUS} ${m * p + c}) ${DIV} (${q} ${MINUS} ${p}) = ${m * (q - p)} ${DIV} ${q - p} = ${m}. ` +
      `Put ${pt(p, m * p + c)} into y = ${m}x + c: ${m * p + c} = ${m * p} + c, so c = ${c}. The right-hand side is ${m}x+${c}.`,
  },
  {
    id: "u10-intersection-03",
    unit: 10,
    difficulty: 3,
    resource: "water",
    format: INT,
    params: (rng) => ({ c: int(rng, 1, 4), e: int(rng, 2, 4), b: int(rng, 1, 6), x: int(rng, 2, 8) }),
    prompt: ({ c, e, b, x }, zone) =>
      `${Z[zone].Place}, two paths follow y = ${co(c + e)}x + ${b} and y = ${co(c)}x + ${b + e * x} on your grid map. ` +
      `At what y-value do the paths cross?`,
    expected: ({ c, e, b, x }) => (c + e) * x + b,
    solution: ({ c, e, b, x }) =>
      `At the crossing the two y-values are equal: ${co(c + e)}x + ${b} = ${co(c)}x + ${b + e * x}. ` +
      `Subtract ${co(c)}x and ${b}: ${co(e)}x = ${e * x}, so x = ${x}. Then y = ${c + e} ${TIMES} ${x} + ${b} = ${(c + e) * x + b}.`,
  },
  {
    id: "u10-claim-03",
    unit: 10,
    difficulty: 3,
    resource: "wood",
    format: CHOICE,
    params: (rng) => {
      const right = int(rng, 0, 3) === 0 ? 1 : 0;
      const off = int(rng, 1, 3) * (int(rng, 0, 1) ? 1 : -1);
      return { m: int(rng, 2, 5), c: int(rng, 1, 8), p: int(rng, 2, 7), right, off, t: int(rng, 0, 3), tie: int(rng, 0, 999) };
    },
    prompt: ({ m, c, p, right, off }, zone) =>
      `${Z[zone].Place}, Sam says the point (${p}, ${m * p + c + (right ? 0 : off)}) is on the line y = ${m}x + ${c}. ` +
      `Which statement is correct?`,
    // Every option is self-consistent: it says "Yes" only when the y it states is Sam's y.
    options: ({ m, c, p, right, off, t, tie }) => {
      const A = m * p + c;
      const q = A + (right ? 0 : off);
      const text = (v: number) => `${v === q ? "Yes" : "No"}, y = ${v} when x = ${p}`;
      const slips = [A + m, A - m, A + c, A - c, A + 1, A - 1, A + 2, A - 2, A + 3, A - 3, A + m + c].filter((v) => v > 0 && v !== A);
      const score = (o: string) => numsIn(o)[0];
      return pickRanked(text(A), slips.map(text), [score], [t], tie, right ? [] : [text(q)]);
    },
    expected: ({ m, c, p, right }) => `${right ? "Yes" : "No"}, y = ${m * p + c} when x = ${p}`,
    solution: ({ m, c, p, right, off }) =>
      `Put x = ${p} into y = ${m}x + ${c}: y = ${m} ${TIMES} ${p} + ${c} = ${m * p + c}. ` +
      `${right ? "That matches Sam's point, so he is right." : `Sam's point has y = ${m * p + c + off}, so it is not on the line and he is wrong.`} ` +
      `Answer: ${right ? "Yes" : "No"}, y = ${m * p + c} when x = ${p}.`,
  },
  {
    id: "u10-tank-03",
    unit: 10,
    difficulty: 3,
    resource: "water",
    format: INT,
    params: (rng) => ({ r: int(rng, 3, 8), t: int(rng, 2, 6), T: int(rng, 8, 20) }),
    prompt: ({ r, t, T }, zone) =>
      `${Z[zone].Place}, a tank of ${Z[zone].water} leaks steadily. It holds ${r * T} litres at the start and ${r * (T - t)} litres after ${t} minutes. ` +
      `If it keeps leaking at the same rate, after how many minutes from the start is it empty?`,
    expected: ({ T }) => T,
    solution: ({ r, t, T }) =>
      `It loses ${r * T} ${MINUS} ${r * (T - t)} = ${r * t} litres in ${t} minutes, which is ${r} litres every minute. ` +
      `${r * T} ${DIV} ${r} = ${T} minutes.`,
  },
  {
    id: "u10-triangle-area-03",
    unit: 10,
    difficulty: 3,
    resource: "stone",
    format: INT,
    params: (rng) => {
      for (let i = 0; i < 50; i++) {
        const k = int(rng, 2, 10);
        const c = int(rng, 2, 10);
        if ((k * c) % 2 === 0) return { k, c };
      }
      return { k: 4, c: 5 };
    },
    prompt: ({ k, c }, zone) =>
      `${Z[zone].Place}, a straight line on your map crosses the x-axis at ${pt(k, 0)} and the y-axis at ${pt(0, c)}. ` +
      `What is the area, in square units, of the triangle between the line and the two axes?`,
    expected: ({ k, c }) => (k * c) / 2,
    solution: ({ k, c }) =>
      `The triangle has a right angle at the origin, with base ${k} along the x-axis and height ${c} along the y-axis. ` +
      `Area = ${k} ${TIMES} ${c} ${DIV} 2 = ${(k * c) / 2}.`,
  },
  {
    id: "u10-journey-03",
    unit: 10,
    difficulty: 3,
    resource: "food",
    format: INT,
    params: (rng) => {
      for (let i = 0; i < 200; i++) {
        const s1 = int(rng, 2, 6);
        const t1 = int(rng, 1, 3);
        const r = int(rng, 1, 2);
        const s2 = int(rng, 3, 8);
        const t2 = int(rng, 1, 4);
        if ((s1 * t1 + s2 * t2) % (t1 + r + t2) === 0) return { s1, t1, r, s2, t2 };
      }
      return { s1: 6, t1: 2, r: 1, s2: 6, t2: 3 };
    },
    prompt: ({ s1, t1, r, s2, t2 }, zone) =>
      `${Z[zone].Place}, you walk for ${hours(t1)} at ${s1} km/h, rest for ${hours(r)}, then walk for ${hours(t2)} at ${s2} km/h. ` +
      `What is your average speed, in km/h, over the whole trip including the rest?`,
    expected: ({ s1, t1, r, s2, t2 }) => (s1 * t1 + s2 * t2) / (t1 + r + t2),
    solution: ({ s1, t1, r, s2, t2 }) =>
      `Distance = ${s1} ${TIMES} ${t1} + ${s2} ${TIMES} ${t2} = ${s1 * t1 + s2 * t2} km. Total time = ${t1} + ${r} + ${t2} = ${t1 + r + t2} hours, ` +
      `because the rest counts. Average speed = ${s1 * t1 + s2 * t2} ${DIV} ${t1 + r + t2} = ${(s1 * t1 + s2 * t2) / (t1 + r + t2)} km/h.`,
  },
];
