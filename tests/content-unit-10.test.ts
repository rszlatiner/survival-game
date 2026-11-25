import { describe, it, expect } from "vitest";
import { UNIT_10 } from "@/content/units/unit-10";
import { isCorrect } from "@/lib/answers";
import { evalExpr, parseExpr } from "@/lib/mathexpr";
import { generateQuestion } from "@/lib/questions/generate";
import { bankChecks, overlapChecks, coordinateChecks, eachQuestion, numsIn } from "./helpers/bank";

bankChecks(10, UNIT_10);
overlapChecks(UNIT_10);
coordinateChecks(UNIT_10);

const get = (id: string) => UNIT_10.find((t) => t.id === id)!;
const format = (id: string) => get(id).format;
/** Value of a typed expression in x, using the app's own parser. */
function at(expr: string, x: number): number {
  const e = parseExpr(expr);
  expect(e, expr).not.toBeNull();
  return evalExpr(e!, { x }) as number;
}
/** All "(a, b)" pairs in a string. */
function pairs(s: string): [number, number][] {
  return [...s.replace(/−/g, "-").matchAll(/\((-?\d+), (-?\d+)\)/g)].map((m) => [Number(m[1]), Number(m[2])]);
}
/** The "y = ..." equation(s) in a prompt as functions of x: forms "y = mx + c", "y = c + mx", "y = x + c". */
function lineOf(s: string): (x: number) => number {
  const m = /y = (?:(\d*)x \+ (\d+)|(\d+) \+ (\d*)x)/.exec(s)!;
  const k = (t: string) => (t === "" ? 1 : Number(t));
  return m[2] !== undefined && m[2] !== "" && m[1] !== undefined ? (x) => k(m[1]) * x + Number(m[2]) : (x) => k(m[4]) * x + Number(m[3]);
}

describe("unit 10 independent recompute", () => {
  const run = (id: string, check: (prompt: string, expected: number | string, options: string[] | undefined, where: string) => void) =>
    eachQuestion(get(id), ({ publicQ, expected }, where) => check(publicQ.prompt, expected, publicQ.options, where));

  it("distance-axis-01: same row or column, answer is the gap", () =>
    run("u10-distance-axis-01", (p, e) => {
      const [a, b] = pairs(p);
      expect(a[0] === b[0] || a[1] === b[1]).toBe(true);
      expect(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])).toBe(e);
    }));
  it("quadrant-01: signs of the point decide the quadrant", () =>
    run("u10-quadrant-01", (p, e) => {
      const m = /\((−?)(\d+), (−?)(\d+)\)/.exec(p)!;
      const side = m[3] === "−" ? "Bottom" : "Top";
      const lr = m[1] === "−" ? "left" : "right";
      expect(e).toBe(`${side}-${lr}`);
    }));
  it("evaluate-line-01", () =>
    run("u10-evaluate-line-01", (p, e) => {
      const x = Number(/x = (\d+)\?/.exec(p)![1]);
      expect(lineOf(p)(x)).toBe(e);
    }));
  it("y-intercept-01: the answer is the value of the line at x = 0", () =>
    run("u10-y-intercept-01", (p, e) => {
      expect(lineOf(p)(0)).toBe(e);
    }));
  it("vertical-horizontal-01: exactly one option is the line through the point", () =>
    run("u10-vertical-horizontal-01", (p, e, opts, where) => {
      const [[a, b]] = pairs(p);
      const vertical = p.includes("straight up and down");
      const ok = (o: string) => {
        const m = /^([xy]) = (\d+)$/.exec(o)!;
        return vertical ? m[1] === "x" && Number(m[2]) === a : m[1] === "y" && Number(m[2]) === b;
      };
      expect(opts!.filter(ok), where).toEqual([e]);
    }));
  it("distance-time-01", () =>
    run("u10-distance-time-01", (p, e) => {
      const m = /gone (\d+) km, after 2 hours (\d+) km and after 3 hours (\d+) km\. How far will you have gone after (\d+) hours/.exec(p)!;
      const [s, s2, s3, t] = m.slice(1).map(Number);
      expect(s2).toBe(2 * s);
      expect(s3).toBe(3 * s);
      expect(s * t).toBe(e);
    }));
  it("gradient-02", () =>
    run("u10-gradient-02", (p, e) => {
      const [a, b] = pairs(p);
      expect((b[1] - a[1]) / (b[0] - a[0])).toBe(e);
    }));
  it("line-equation-02: gradient and intercept of the answer match the prompt", () =>
    run("u10-line-equation-02", (p, e) => {
      const m = /gradient (−?)(\d+) and crosses the y-axis at \(0, (\d+)\)/.exec(p)!;
      const grad = (m[1] ? -1 : 1) * Number(m[2]);
      expect(at(String(e), 0)).toBe(Number(m[3]));
      expect(at(String(e), 1) - at(String(e), 0)).toBe(grad);
      expect(isCorrect(`${Math.abs(grad)}x+${m[3]}`, e, format("u10-line-equation-02"))).toBe(grad > 0);
      expect(isCorrect(`${m[3]}x+${Math.abs(grad)}`, e, format("u10-line-equation-02"))).toBe(grad > 0 && Math.abs(grad) === Number(m[3]));
    }));
  it("midpoint-02: exactly one option is the midpoint", () =>
    run("u10-midpoint-02", (p, e, opts, where) => {
      const [a, b] = pairs(p);
      const mid = `(${(a[0] + b[0]) / 2}, ${(a[1] + b[1]) / 2})`;
      expect(opts!.filter((o) => o === mid), where).toEqual([e]);
    }));
  it("on-line-02: exactly one option satisfies the equation", () =>
    run("u10-on-line-02", (p, e, opts, where) => {
      const f = lineOf(p);
      const on = opts!.filter((o) => {
        const [[x, y]] = pairs(o);
        return f(x) === y;
      });
      expect(on, where).toEqual([e]);
    }));
  it("find-c-02: c fits the point", () =>
    run("u10-find-c-02", (p, e) => {
      const m = /y = (\d+)x \+ c passes through the point \((\d+), (\d+)\)/.exec(p)!;
      expect(Number(m[1]) * Number(m[2]) + Number(e)).toBe(Number(m[3]));
    }));
  it("speed-02", () =>
    run("u10-speed-02", (p, e) => {
      const [a, b] = pairs(p);
      expect(((b[1] - a[1]) / (b[0] - a[0]))).toBe(e);
    }));
  it("x-intercept-02: the line is zero at the answer and not at a neighbour", () =>
    run("u10-x-intercept-02", (p, e) => {
      const m = /y = (\d+)x − (\d+)\./.exec(p)!;
      const f = (x: number) => Number(m[1]) * x - Number(m[2]);
      expect(f(Number(e))).toBe(0);
      expect(f(Number(e) + 1)).not.toBe(0);
    }));
  it("rectangle-02: exactly one option completes a rectangle with sides parallel to the axes", () =>
    run("u10-rectangle-02", (p, e, opts, where) => {
      const [A, B, C] = pairs(p);
      const xs = [A[0], B[0], C[0]];
      const ys = [A[1], B[1], C[1]];
      const D: [number, number] = [xs.find((x) => xs.filter((v) => v === x).length === 1)!, ys.find((y) => ys.filter((v) => v === y).length === 1)!];
      expect(opts!.filter((o) => o === `(${D[0]}, ${D[1]})`), where).toEqual([e]);
    }));
  it("line-two-points-03: the answer passes through both points; gradient-only and intercept-only answers fail", () =>
    run("u10-line-two-points-03", (p, e) => {
      const [A, B] = pairs(p);
      expect(at(String(e), A[0])).toBe(A[1]);
      expect(at(String(e), B[0])).toBe(B[1]);
      const m = (B[1] - A[1]) / (B[0] - A[0]);
      expect(isCorrect(`${m}x`, e, format("u10-line-two-points-03"))).toBe(false);
      expect(isCorrect(`${m}x+${A[1]}`, e, format("u10-line-two-points-03"))).toBe(false);
    }));
  it("intersection-03: at the answer both lines agree, and the lines differ elsewhere", () =>
    run("u10-intersection-03", (p, e) => {
      const m = /y = (\d*)x \+ (\d+) and y = (\d*)x \+ (\d+) on/.exec(p)!;
      const k = (t: string) => (t === "" ? 1 : Number(t));
      const A = (x: number) => k(m[1]) * x + Number(m[2]);
      const B = (x: number) => k(m[3]) * x + Number(m[4]);
      const xs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((x) => A(x) === B(x));
      expect(xs).toHaveLength(1);
      expect(A(xs[0])).toBe(e);
    }));
  it("claim-03: exactly one option is both the right verdict and the right value", () =>
    run("u10-claim-03", (p, e, opts, where) => {
      const m = /point \((\d+), (\d+)\) is on the line y = (\d+)x \+ (\d+)\./.exec(p)!;
      const [x, y, a, b] = m.slice(1).map(Number);
      const actual = a * x + b;
      const verdict = actual === y ? "Yes" : "No";
      const good = opts!.filter((o) => o === `${verdict}, y = ${actual} when x = ${x}`);
      expect(good, where).toEqual([e]);
      // no other option states the true value with the true verdict, and every option names the same x
      for (const o of opts!) expect(numsIn(o)[1], where).toBe(x);
    }));
  it("tank-03", () =>
    run("u10-tank-03", (p, e) => {
      const [start, after, mins] = (() => {
        const n = numsIn(p.replace(/stream|spring|rain|fresh|pond/g, ""));
        return [n[0], n[1], n[2]];
      })();
      const rate = (start - after) / mins;
      expect(Number.isInteger(rate)).toBe(true);
      expect(start - rate * Number(e)).toBe(0);
    }));
  it("triangle-area-03", () =>
    run("u10-triangle-area-03", (p, e) => {
      const [A, B] = pairs(p);
      expect(Math.abs(A[0] * B[1] - A[1] * B[0]) / 2).toBe(e);
    }));
  it("journey-03: total distance over total time including the rest", () =>
    run("u10-journey-03", (p, e) => {
      const m = /walk for (\d+) hours? at (\d+) km\/h, rest for (\d+) hours?, then walk for (\d+) hours? at (\d+) km\/h/.exec(p)!;
      const [t1, s1, r, t2, s2] = m.slice(1).map(Number);
      expect((s1 * t1 + s2 * t2) / (t1 + r + t2)).toBe(e);
      expect(isCorrect(String((s1 + s2) / 2), e, format("u10-journey-03"))).toBe((s1 + s2) / 2 === e);
    }));
});

describe("unit 10 prompts read well in every zone", () => {
  it("no doubled nouns, bad articles or stray 1-plurals", () => {
    for (const t of UNIT_10)
      eachQuestion(t, ({ publicQ }, where) => {
        expect(publicQ.prompt, where).not.toMatch(/\b(\w+) \1\b/i);
        expect(publicQ.prompt, where).not.toMatch(/\b1 (hours|litres|metres|minutes)\b/);
        expect(publicQ.prompt, where).not.toMatch(/\ba [aeiou]/i);
      });
  });
  it("typed-expression templates name the letter the answer uses", () => {
    for (const t of UNIT_10.filter((x) => x.format.kind === "expression"))
      eachQuestion(t, ({ publicQ }, where) => expect(publicQ.prompt, where).toContain("in terms of x"));
  });
  it("different seeds change numbers inside the prompt, not only the options", () => {
    for (const t of UNIT_10) {
      const prompts = new Set(Array.from({ length: 40 }, (_, i) => generateQuestion(t, "beach", String(i + 1)).publicQ.prompt));
      expect(prompts.size, t.id).toBeGreaterThanOrEqual(6);
    }
  });
});
