import { describe, it, expect } from "vitest";
import { UNIT_05 } from "@/content/units/unit-05";
import { bankChecks, eachQuestion, numsIn } from "./helpers/bank";

bankChecks(5, UNIT_05);

const get = (id: string) => UNIT_05.find((t) => t.id === id)!;

/** Independent recompute: read the numbers back out of the prompt and apply the test's own geometry. */
describe("unit 5 independent recompute", () => {
  const run = (id: string, check: (prompt: string, expected: number | string, options: string[] | undefined, where: string) => void) =>
    eachQuestion(get(id), ({ publicQ, expected }, where) => check(publicQ.prompt, expected, publicQ.options, where));

  it("straight-line-01", () => run("u05-straight-line-01", (p, e) => expect(Number(e) + numsIn(p)[0]).toBe(180)));
  it("at-point-01", () => run("u05-at-point-01", (p, e) => expect(numsIn(p).reduce((s, v) => s + v, Number(e))).toBe(360)));
  it("triangle-third-01", () => run("u05-triangle-third-01", (p, e) => expect(numsIn(p).reduce((s, v) => s + v, Number(e))).toBe(180)));
  it("opposite-01", () => run("u05-opposite-01", (p, e) => expect(e).toBe(numsIn(p)[0])));
  it("classify-01: the name matches the angle's range", () =>
    run("u05-classify-01", (p, e, opts) => {
      const a = numsIn(p)[0];
      const name = a < 90 ? "acute" : a === 90 ? "right" : a < 180 ? "obtuse" : "reflex";
      expect(e).toBe(name);
      expect(opts).toHaveLength(4);
    }));
  it("quad-fourth-01", () => run("u05-quad-fourth-01", (p, e) => expect(numsIn(p).reduce((s, v) => s + v, Number(e))).toBe(360)));
  it("isosceles-base-01", () => run("u05-isosceles-base-01", (p, e) => expect(numsIn(p)[0] + 2 * Number(e)).toBe(180)));
  it("isosceles-apex-01", () => run("u05-isosceles-apex-01", (p, e) => expect(2 * numsIn(p)[0] + Number(e)).toBe(180)));
  it("cointerior-01", () => run("u05-cointerior-01", (p, e) => expect(numsIn(p)[0] + Number(e)).toBe(180)));
  it("reason-01: given sizes agree with the rule named, and the other rules are false for those sizes or positions", () =>
    run("u05-reason-01", (p, e, opts, where) => {
      const [a, b] = numsIn(p);
      const pos = /They are (.+?)\. Which/.exec(p)![1];
      const rule = pos.startsWith("on opposite sides") ? "Alternate" : pos.startsWith("in matching") ? "Corresponding" : pos.startsWith("on the same side") ? "Co-interior" : "Vertically";
      expect(String(e).startsWith(rule), where).toBe(true);
      if (rule === "Co-interior") expect(a + b, where).toBe(180);
      else expect(a, where).toBe(b);
      expect(a, where).not.toBe(90);
      expect(opts, where).toHaveLength(4);
    }));
  it("clock-01", () =>
    run("u05-clock-01", (p, e) => {
      const h = Number(/At (\d+) o'clock/.exec(p)![1]);
      const hourAngle = (h % 12) * 30;
      const turn = Math.min(hourAngle, 360 - hourAngle);
      expect(e).toBe(turn);
      expect(Number(e)).toBeLessThanOrEqual(180);
    }));
  it("exterior-01: the three angles of the triangle add to 180", () =>
    run("u05-exterior-01", (p, e) => {
      const [e0, a] = numsIn(p.replace("triangle ABC", "triangle").replace("side BC", "side").replace("angle A ", "angle X "));
      const c = 180 - e0;
      expect(a + c + Number(e)).toBe(180);
    }));
  it("line-three-01", () => run("u05-line-three-01", (p, e) => expect(numsIn(p.replace("Four", "")).reduce((s, v) => s + v, Number(e))).toBe(180)));
  it("point-equal-01", () =>
    run("u05-point-equal-01", (p, e) => {
      const [a, c] = numsIn(p);
      expect(a + c + 2 * Number(e)).toBe(360);
    }));
  it("ratio-triangle-01", () =>
    run("u05-ratio-triangle-01", (p, e) => {
      const [a, b, c] = /ratio (\d+):(\d+):(\d+)/.exec(p)!.slice(1).map(Number);
      const parts = [a, b, c];
      const angles = parts.map((x) => (x * 180) / (a + b + c));
      expect(angles.every(Number.isInteger)).toBe(true);
      expect(e).toBe(Math.max(...angles));
    }));
  it("line-algebra-01: x solves the straight-line equation", () =>
    run("u05-line-algebra-01", (p, e) => {
      const m = /\((\d?)x \+ (\d+)\)° and \((\d?)x \+ (\d+)\)°/.exec(p)!;
      const [p1, q, r1, s] = [m[1] === "" ? 1 : Number(m[1]), Number(m[2]), m[3] === "" ? 1 : Number(m[3]), Number(m[4])];
      let found = -1;
      for (let x = 1; x <= 60; x++) if (p1 * x + q + r1 * x + s === 180) found = x;
      expect(found).toBeGreaterThan(0);
      expect(e).toBe(Math.max(p1 * found + q, r1 * found + s));
    }));
  it("quad-steps-01", () =>
    run("u05-quad-steps-01", (p, e) => {
      const d = numsIn(p)[0];
      const big = Number(e);
      expect(big + (big - d) + (big - 2 * d) + (big - 3 * d)).toBe(360);
    }));
  it("parallel-triangle-01", () =>
    run("u05-parallel-triangle-01", (p, e) => {
      const m = /DAB is (\d+)° and angle EAC is (\d+)°/.exec(p)!;
      expect(Number(e) + Number(m[1]) + Number(m[2])).toBe(180);
    }));
  it("claim-01: the verdict matches the angle total", () =>
    run("u05-claim-01", (p, e, _o, where) => {
      const [a, b, c] = numsIn(p.replace(/triangular .*? made/, "triangular marker made").replace(/made .*? as/, "made as"));
      const sum = a + b + c;
      const want = sum === 180 ? "Yes" : sum > 180 ? "No, the angles add up to more" : "No, the angles add up to less";
      expect(String(e).startsWith(want), where).toBe(true);
    }));
  it("pentagon-01", () => run("u05-pentagon-01", (p, e) => {
    const four = numsIn(p.replace("five-sided", "five sided")).slice(0, 4);
    expect(four.reduce((s, v) => s + v, Number(e))).toBe(540);
  }));
});
