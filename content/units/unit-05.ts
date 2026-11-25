/**
 * Unit 5 bank: angles.
 * Original templates written for this game. Difficulty 1 = one angle fact
 * (straight line, point, triangle, quadrilateral, naming, regular exterior);
 * 2 = two-step or reasoned use of a fact (isosceles, polygon sums, parallel lines, exterior
 * angle, clock hands); 3 = multi-step reasoning with algebra, ratio or checking
 * a claim. There are no figures, so every angle relationship is stated in
 * words. All answers are whole numbers of degrees or a named choice.
 */
import type { QuestionTemplate } from "@/lib/questions/types";
import { int, pick } from "@/lib/questions/random";
import { ZONE_WORDS as Z } from "@/content/units/zones";

const INT = { kind: "integer" } as const;
const CHOICE = { kind: "choice", options: [] as string[] } as const;
const DEG = "°";
const M = "−";
const co = (n: number) => (n === 1 ? "" : `${n}`);

const NAMES = ["acute", "right", "obtuse", "reflex"];
const ALT = "Alternate angles are equal";
const COR = "Corresponding angles are equal";
const CIN = "Co-interior angles add up to 180°";
const VOP = "Vertically opposite angles are equal";
const REASONS = [ALT, COR, CIN, VOP];
const WHERE = [
  "on opposite sides of the crossing line, both between the two parallel lines",
  "in matching positions at the two crossings (both above their line, both right of the crossing line)",
  "on the same side of the crossing line, both between the two parallel lines",
  "opposite each other at the same crossing, made by the same two lines",
];
/** Angle sizes that are not 90, so "equal" and "add to 180" cannot both hold. */
const notRight = (rng: () => number) => {
  const a = int(rng, 40, 135);
  return a >= 90 ? a + 5 : a;
};
const RATIOS: number[][] = [
  [1, 2, 3], [2, 3, 4], [1, 4, 5], [2, 3, 5], [3, 4, 5],
  [1, 5, 6], [3, 5, 7], [2, 5, 8], [4, 5, 9], [1, 3, 5],
];

export const UNIT_05: QuestionTemplate[] = [
  // ---------------- Difficulty 1 ----------------
  {
    id: "u05-straight-line-01",
    unit: 5,
    difficulty: 1,
    resource: "water",
    format: INT,
    params: (rng) => ({ a: int(rng, 25, 155) }),
    prompt: ({ a }, zone) =>
      `${Z[zone].Place}, a pole leans against a straight horizontal beam. The angle on the left of the pole is ${a}${DEG}. ` +
      `What is the angle on its right, in degrees? Type the number only.`,
    expected: ({ a }) => 180 - a,
    solution: ({ a }) =>
      `Angles on a straight line add up to 180${DEG}. ${180} ${M} ${a} = ${180 - a}, so the angle is ${180 - a}${DEG}.`,
  },
  {
    id: "u05-at-point-01",
    unit: 5,
    difficulty: 1,
    resource: "food",
    format: INT,
    params(rng) {
      const a = int(rng, 70, 150);
      const b = int(rng, 70, 150);
      return { a, b };
    },
    prompt: ({ a, b }, zone) =>
      `Three paths meet at a clearing ${Z[zone].place} and split the ground around it into three angles. ` +
      `Two of the angles are ${a}${DEG} and ${b}${DEG}. How many degrees is the third angle?`,
    expected: ({ a, b }) => 360 - a - b,
    solution: ({ a, b }) =>
      `Angles around a point add up to 360${DEG}. ${a} + ${b} = ${a + b}, and 360 ${M} ${a + b} = ${360 - a - b}${DEG}.`,
  },
  {
    id: "u05-triangle-third-01",
    unit: 5,
    difficulty: 1,
    resource: "wood",
    format: INT,
    params: (rng) => ({ a: int(rng, 30, 80), b: int(rng, 30, 80) }),
    prompt: ({ a, b }, zone) =>
      `A triangular sail is cut from cloth made ${Z[zone].place}. Two of its angles are ${a}${DEG} and ${b}${DEG}. ` +
      `What is the size of the third angle, in degrees?`,
    expected: ({ a, b }) => 180 - a - b,
    solution: ({ a, b }) =>
      `The angles of a triangle add up to 180${DEG}. ${a} + ${b} = ${a + b}, so the third angle is 180 ${M} ${a + b} = ${180 - a - b}${DEG}.`,
  },
  {
    id: "u05-classify-01",
    unit: 5,
    difficulty: 1,
    resource: "water",
    format: CHOICE,
    params(rng) {
      const k = int(rng, 0, 3);
      const a = [int(rng, 10, 85), 90, int(rng, 95, 175), int(rng, 185, 350)][k];
      return { k, a };
    },
    prompt: ({ a }, zone) =>
      `${Z[zone].Place}, a lookout turns a signal arm through an angle of ${a}${DEG}. What type of angle is this?`,
    options: () => NAMES,
    expected: ({ k }) => NAMES[k],
    solution: ({ a, k }) =>
      `Acute is under 90${DEG}, right is exactly 90${DEG}, obtuse is between 90${DEG} and 180${DEG}, reflex is over 180${DEG}. ` +
      `${a}${DEG} is ${NAMES[k]}.`,
  },
  {
    id: "u05-quad-fourth-01",
    unit: 5,
    difficulty: 1,
    resource: "food",
    format: INT,
    params: (rng) => ({ a: int(rng, 70, 110), b: int(rng, 70, 110), c: int(rng, 70, 110) }),
    prompt: ({ a, b, c }, zone) =>
      `A four-sided garden plot ${Z[zone].place} has angles of ${a}${DEG}, ${b}${DEG} and ${c}${DEG} at three corners. ` +
      `What is the angle at the fourth corner?`,
    expected: ({ a, b, c }) => 360 - a - b - c,
    solution: ({ a, b, c }) =>
      `The angles of a quadrilateral add up to 360${DEG}. ${a} + ${b} + ${c} = ${a + b + c}, so the fourth angle is 360 ${M} ${a + b + c} = ${360 - a - b - c}${DEG}.`,
  },

  {
    id: "u05-exterior-regular-01",
    unit: 5,
    difficulty: 1,
    resource: "stone",
    format: INT,
    params: (rng) => ({ n: pick(rng, [5, 6, 8, 9, 10, 12, 15, 18, 20]) }),
    prompt: ({ n }, zone) =>
      `A ring of ${n} equal ${Z[zone].stone} is laid as a regular ${n}-sided shape. The outside (exterior) angles of any polygon add up to 360${DEG}. ` +
      `How many degrees is one exterior angle of this shape?`,
    expected: ({ n }) => 360 / n,
    solution: ({ n }) =>
      `A regular shape has ${n} equal exterior angles that total 360${DEG}, so each is 360 ÷ ${n} = ${360 / n}${DEG}.`,
  },

  // ---------------- Difficulty 2 ----------------
  {
    id: "u05-isosceles-base-01",
    unit: 5,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params: (rng) => ({ a: 2 * int(rng, 10, 70) }),
    prompt: ({ a }, zone) =>
      `A roof frame ${Z[zone].place} is an isosceles triangle. The angle at the top is ${a}${DEG}. ` +
      `How many degrees is each of the two equal base angles?`,
    expected: ({ a }) => (180 - a) / 2,
    solution: ({ a }) =>
      `The three angles add up to 180${DEG}, so the two base angles share 180 ${M} ${a} = ${180 - a}${DEG}. ` +
      `They are equal, so each is ${180 - a} ÷ 2 = ${(180 - a) / 2}${DEG}.`,
  },
  {
    id: "u05-cointerior-01",
    unit: 5,
    difficulty: 2,
    resource: "water",
    format: INT,
    params: (rng) => ({ a: notRight(rng) }),
    prompt: ({ a }, zone) =>
      `Two parallel ${Z[zone].rope} lines are crossed by a third line. Two angles lie between the parallel lines, on the same side of the crossing line. ` +
      `One is ${a}${DEG}. What is the other?`,
    expected: ({ a }) => 180 - a,
    solution: ({ a }) =>
      `These are co-interior angles between parallel lines, so they add up to 180${DEG}. 180 ${M} ${a} = ${180 - a}${DEG}.`,
  },
  {
    id: "u05-reason-01",
    unit: 5,
    difficulty: 2,
    resource: "food",
    format: CHOICE,
    params(rng) {
      const k = int(rng, 0, 3);
      const a = notRight(rng);
      return { k, a, b: k === 2 ? 180 - a : a };
    },
    prompt: ({ a, b, k }, zone) =>
      `${Z[zone].Place}, a line crosses two parallel lines. Angle P is ${a}${DEG} and angle Q is ${b}${DEG}. ` +
      `They are ${WHERE[k]}. Which fact explains their sizes?`,
    options: () => REASONS,
    expected: ({ k }) => REASONS[k],
    solution: ({ k, a, b }) =>
      `P and Q are ${WHERE[k]}. That position gives the rule: ${REASONS[k]}. ` +
      `Check with the sizes: ${a}${DEG} and ${b}${DEG} fit this rule.`,
  },
  {
    id: "u05-clock-01",
    unit: 5,
    difficulty: 2,
    resource: "wood",
    format: INT,
    params: (rng) => ({ h: pick(rng, [1, 2, 3, 4, 5, 7, 8, 9, 10, 11]) }),
    prompt: ({ h }, zone) =>
      `A sundial clock ${Z[zone].place} is marked like a clock face, with 12 hour marks equally spaced. ` +
      `At ${h} o'clock, what is the smaller angle between the hour hand and the minute hand pointing at 12?`,
    expected: ({ h }) => 30 * Math.min(h, 12 - h),
    solution: ({ h }) =>
      `There are 12 gaps around a full turn of 360${DEG}, so one gap is 30${DEG}. ` +
      `From 12 to ${h} the shorter way round is ${Math.min(h, 12 - h)} gaps: ${Math.min(h, 12 - h)} × 30 = ${30 * Math.min(h, 12 - h)}${DEG}.`,
  },
  {
    id: "u05-exterior-01",
    unit: 5,
    difficulty: 2,
    resource: "stone",
    format: INT,
    params(rng) {
      const e = int(rng, 90, 160);
      return { e, a: int(rng, 20, e - 25) };
    },
    prompt: ({ e, a }, zone) =>
      `In triangle ABC ${Z[zone].place}, side BC is extended past C to a point D. Angle ACD is ${e}${DEG} and angle A is ${a}${DEG}. ` +
      `What is angle B?`,
    expected: ({ e, a }) => e - a,
    solution: ({ e, a }) =>
      `Angle ACB is on a straight line with angle ACD, so it is 180 ${M} ${e} = ${180 - e}${DEG}. ` +
      `Then B = 180 ${M} ${a} ${M} ${180 - e} = ${e - a}${DEG}. (Shortcut: an outside angle equals the two far inside angles added.)`,
  },
  {
    id: "u05-line-three-01",
    unit: 5,
    difficulty: 2,
    resource: "water",
    format: INT,
    params: (rng) => ({ a: int(rng, 25, 55), b: int(rng, 25, 55), c: int(rng, 25, 55) }),
    prompt: ({ a, b, c }, zone) =>
      `Three ${Z[zone].wood} lean against a straight beam, all touching it at one point, so four angles fill one side of the beam. ` +
      `Three of the angles are ${a}${DEG}, ${b}${DEG} and ${c}${DEG}. What is the fourth angle?`,
    expected: ({ a, b, c }) => 180 - a - b - c,
    solution: ({ a, b, c }) =>
      `All four angles fill a straight line, so they add up to 180${DEG}. ${a} + ${b} + ${c} = ${a + b + c}, and 180 ${M} ${a + b + c} = ${180 - a - b - c}${DEG}.`,
  },
  {
    id: "u05-point-equal-01",
    unit: 5,
    difficulty: 2,
    resource: "food",
    format: INT,
    params(rng) {
      const x = int(rng, 80, 100);
      const a = int(rng, 70, 100);
      return { x, a, c: 360 - 2 * x - a };
    },
    prompt: ({ a, c }, zone) =>
      `Four tracks meet at a point ${Z[zone].place}. Two angles between tracks are ${a}${DEG} and ${c}${DEG}, and the other two angles are equal. ` +
      `How many degrees is each equal angle?`,
    expected: ({ x }) => x,
    solution: ({ x, a, c }) =>
      `The four angles add up to 360${DEG}. The two known angles total ${a} + ${c} = ${a + c}${DEG}, leaving 360 ${M} ${a + c} = ${360 - a - c}${DEG} for the equal pair. ` +
      `Each is ${360 - a - c} ÷ 2 = ${x}${DEG}.`,
  },

  {
    id: "u05-polygon-sum-01",
    unit: 5,
    difficulty: 2,
    resource: "water",
    format: INT,
    params: (rng) => ({ n: int(rng, 5, 10) }),
    prompt: ({ n }, zone) =>
      `A fence ${Z[zone].place} has ${n} straight sides and ${n} corners. What do the ${n} inside (interior) angles of the fence add up to, in degrees?`,
    expected: ({ n }) => (n - 2) * 180,
    solution: ({ n }) =>
      `Draw lines from one corner to the others to split the shape into ${n - 2} triangles. Each triangle has angles totalling 180${DEG}, so ${n - 2} ${"×"} 180 = ${(n - 2) * 180}${DEG}.`,
  },

  // ---------------- Difficulty 3 ----------------
  {
    id: "u05-ratio-triangle-01",
    unit: 5,
    difficulty: 3,
    resource: "wood",
    format: INT,
    params: (rng) => {
      const [a, b, c] = pick(rng, RATIOS);
      return { a, b, c, k: 180 / (a + b + c) };
    },
    prompt: ({ a, b, c }, zone) =>
      `The three angles of a triangular brace made ${Z[zone].place} are in the ratio ${a}:${b}:${c}. ` +
      `What is the size of the largest angle, in degrees?`,
    expected: ({ c, k }) => c * k,
    solution: ({ a, b, c, k }) =>
      `The ratio has ${a} + ${b} + ${c} = ${a + b + c} parts, and the angles total 180${DEG}, so one part is 180 ÷ ${a + b + c} = ${k}${DEG}. ` +
      `The largest angle is ${c} parts: ${c} × ${k} = ${c * k}${DEG}.`,
  },
  {
    id: "u05-line-algebra-01",
    unit: 5,
    difficulty: 3,
    resource: "stone",
    format: INT,
    params(rng) {
      const x = int(rng, 8, 20);
      const p = int(rng, 1, 3);
      const r = int(rng, 1, 3);
      const q = int(rng, 5, 30);
      return { x, p, r, q, s: 180 - (p + r) * x - q };
    },
    prompt: ({ p, q, r, s }, zone) =>
      `${Z[zone].Place}, two angles on a straight line measure (${co(p)}x + ${q})${DEG} and (${co(r)}x + ${s})${DEG}. ` +
      `What is the size of the larger of the two angles, in degrees?`,
    expected: ({ x, p, q, r, s }) => Math.max(p * x + q, r * x + s),
    solution: ({ x, p, q, r, s }) =>
      `Angles on a straight line total 180${DEG}: ${co(p)}x + ${q} + ${co(r)}x + ${s} = 180, so ${p + r}x + ${q + s} = 180 and ${p + r}x = ${180 - q - s}. ` +
      `So x = ${x}. The angles are ${p * x + q}${DEG} and ${r * x + s}${DEG}, and the larger is ${Math.max(p * x + q, r * x + s)}${DEG}.`,
  },
  {
    id: "u05-parallel-triangle-01",
    unit: 5,
    difficulty: 3,
    resource: "food",
    format: INT,
    params: (rng) => ({ p: int(rng, 35, 75), q: int(rng, 35, 75) }),
    prompt: ({ p, q }, zone) =>
      `A triangular frame ABC stands ${Z[zone].place}. A line DE through A is parallel to the base BC, with D on B's side and E on C's side. ` +
      `Angle DAB is ${p}${DEG} and angle EAC is ${q}${DEG}. What is angle BAC?`,
    expected: ({ p, q }) => 180 - p - q,
    solution: ({ p, q }) =>
      `Angle ABC is alternate to angle DAB, so it is ${p}${DEG}. Angle ACB is alternate to angle EAC, so it is ${q}${DEG}. ` +
      `In triangle ABC: 180 ${M} ${p} ${M} ${q} = ${180 - p - q}${DEG}.`,
  },
  {
    id: "u05-claim-01",
    unit: 5,
    difficulty: 3,
    resource: "stone",
    format: CHOICE,
    params(rng) {
      const t = int(rng, 0, 2);
      const a = int(rng, 30, 80);
      const b = int(rng, 30, 80);
      const d = int(rng, 5, 15);
      return { t, a, b, c: 180 - a - b + (t === 1 ? d : t === 2 ? -d : 0) };
    },
    prompt: ({ a, b, c }, zone) =>
      `A castaway measures the three angles of a triangular marker made ${Z[zone].place} as ${a}${DEG}, ${b}${DEG} and ${c}${DEG}. ` +
      `Could these be the three angles of a real triangle?`,
    options: () => ["Yes, they can form a triangle", "No, the angles add up to more than 180°", "No, the angles add up to less than 180°"],
    expected: ({ t }) =>
      ["Yes, they can form a triangle", "No, the angles add up to more than 180°", "No, the angles add up to less than 180°"][t],
    solution: ({ a, b, c, t }) =>
      `Add the angles: ${a} + ${b} + ${c} = ${a + b + c}. A triangle's angles must total exactly 180${DEG}. ` +
      `So: ${["Yes, they can form a triangle", "No, the angles add up to more than 180°", "No, the angles add up to less than 180°"][t]}.`,
  },
  {
    id: "u05-regular-interior-01",
    unit: 5,
    difficulty: 3,
    resource: "food",
    format: INT,
    params: (rng) => ({ n: pick(rng, [5, 6, 8, 9, 10, 12]) }),
    prompt: ({ n }, zone) =>
      `A regular ${n}-sided pen ${Z[zone].place} has all its sides and angles equal. How many degrees is one inside (interior) angle? Type the number only.`,
    expected: ({ n }) => 180 - 360 / n,
    solution: ({ n }) =>
      `The ${n} equal outside angles total 360${DEG}, so each is 360 ÷ ${n} = ${360 / n}${DEG}. An inside angle and its outside angle lie on a straight line, so 180 ${M} ${360 / n} = ${180 - 360 / n}${DEG}.`,
  },
  {
    id: "u05-polygon-missing-01",
    unit: 5,
    difficulty: 3,
    resource: "stone",
    format: INT,
    params(rng) {
      const n = pick(rng, [5, 6]);
      for (let i = 0; i < 80; i++) {
        const known = Array.from({ length: n - 1 }, () => int(rng, 95, 140));
        const last = (n - 2) * 180 - known.reduce((s, v) => s + v, 0);
        if (last >= 70 && last <= 165) return { n, a: known[0], b: known[1], c: known[2], d: known[3], e: n === 6 ? known[4] : 0 };
      }
      return n === 5 ? { n, a: 105, b: 110, c: 100, d: 115, e: 0 } : { n, a: 120, b: 125, c: 118, d: 122, e: 119 };
    },
    prompt: ({ n, a, b, c, d, e }, zone) =>
      `A ${n}-sided plot ${Z[zone].place} has ${n - 1} known corner angles: ${[a, b, c, d, ...(n === 6 ? [e] : [])].map((v) => `${v}${DEG}`).join(", ")}. What is the angle at the last corner?`,
    expected: ({ n, a, b, c, d, e }) => (n - 2) * 180 - a - b - c - d - e,
    solution: ({ n, a, b, c, d, e }) =>
      `A ${n}-sided shape splits into ${n - 2} triangles, so its angles total ${n - 2} ${"×"} 180 = ${(n - 2) * 180}${DEG}. ` +
      `The known angles total ${a + b + c + d + e}, so the last is ${(n - 2) * 180} ${M} ${a + b + c + d + e} = ${(n - 2) * 180 - a - b - c - d - e}${DEG}.`,
  },
];
