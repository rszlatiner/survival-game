import { describe, it, expect } from "vitest";
import { UNIT_02 } from "@/content/units/unit-02";
import { bankChecks, overlapChecks, eachQuestion, numsIn } from "./helpers/bank";

bankChecks(2, UNIT_02);
overlapChecks(UNIT_02);

const get = (id: string) => UNIT_02.find((t) => t.id === id)!;

/** Evaluate a printed expression such as "3(2x + 4) − 5" with the test's own mini parser. */
function ev(text: string, vars: { x?: number; y?: number; T?: number } = {}): number {
  let s = text.includes("=") ? text.split("=")[1] : text;
  s = s
    .replace(/−/g, "-")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/²/g, "**2")
    .replace(/(\d|\))(?=[xyT(])/g, "$1*")
    .replace(/([xyT])(?=[xyT(\d])/g, "$1*")
    .replace(/\)(?=\()/g, ")*");
  return new Function("x", "y", "T", `return ${s};`)(vars.x ?? 0, vars.y ?? 0, vars.T ?? 0) as number;
}
const POINTS = [
  { x: 1, y: 2 },
  { x: 2, y: 5 },
  { x: 3, y: -1 },
  { x: 7, y: 4 },
];
const same = (a: string, b: string) => POINTS.every((p) => Math.abs(ev(a, p) - ev(b, p)) < 1e-9);

describe("unit 2 independent recompute", () => {
  const run = (id: string, check: (prompt: string, expected: number | string, options: string[] | undefined, where: string) => void) =>
    eachQuestion(get(id), ({ publicQ, expected }, where) => check(publicQ.prompt, expected, publicQ.options, where));
  /** Exactly one option is equivalent to the expression printed in the prompt, and it is the expected one. */
  const equivalence = (id: string, re: RegExp) =>
    run(id, (p, e, opts, where) => {
      const src = re.exec(p);
      expect(src, where).not.toBeNull();
      const good = opts!.filter((o) => same(o, src![1]));
      expect(good, where).toEqual([e]);
    });

  it("substitute-01", () =>
    run("u02-substitute-01", (p, e) => {
      const m = /L = (\d+)d \+ (\d+), .*d = (\d+)\./.exec(p)!.map(Number);
      expect(e).toBe(m[1] * m[3] + m[2]);
    }));
  it("collect-01", () => equivalence("u02-collect-01", /tally of \S+(?: \S+)? is (.+?), where x/));
  it("write-expression-01: the expression gives the stock left after r rafts", () =>
    run("u02-write-expression-01", (p, e, opts, where) => {
      const [stock, per] = numsIn(p);
      const good = opts!.filter((o) => [1, 2, 5].every((r) => ev(o.replace(/r/g, `*${r}`).replace(/^(\d+) /, "$1 "), {}) === stock - per * r));
      expect(good, where).toEqual([e]);
    }));
  it("expand-01", () => equivalence("u02-expand-01", /counted as (\d+\(.+?\))\. Which/));
  it("substitute-02", () =>
    run("u02-substitute-02", (p, e) => {
      const [b, h] = numsIn(p.split("Find A")[1]);
      expect(e).toBe((b * h) / 2);
    }));
  it("substitute-03", () =>
    run("u02-substitute-03", (p, e) => {
      const k = Number(/R = n² \+ (\d+)/.exec(p)![1]);
      const n = Number(/when n = (\d+)/.exec(p)![1]);
      expect(e).toBe(n ** 2 + k);
    }));
  it("collect-02", () => equivalence("u02-collect-02", /tally of .+? is (.+?)\. Which/));
  it("expand-simplify-01", () => equivalence("u02-expand-simplify-01", /count of .+? is (.+?)\. Which/));
  it("formula-solve-01: the answer reproduces the stated cost", () =>
    run("u02-formula-solve-01", (p, e) => {
      const m = /C = (\d+)n \+ (\d+) shells.*cost (\d+) shells/.exec(p)!.map(Number);
      expect(m[1] * Number(e) + m[2]).toBe(m[3]);
    }));
  it("factorise-01: expands back to the expression, and only the highest factor is out", () =>
    run("u02-factorise-01", (p, e, opts, where) => {
      const [A, B] = /count of .+? is (\d+)x \+ (\d+)\./.exec(p)!.slice(1).map(Number);
      const g = (a: number, b: number): number => (b ? g(b, a % b) : a);
      const good = opts!.filter((o) => same(o, `${A}x + ${B}`) && ev(o, { x: 1 }) === A + B);
      // Two options expand back to the expression; only one has the full highest common factor out.
      const lead = (o: string) => Number(/^(\d+)\(/.exec(o)![1]);
      const full = good.filter((o) => lead(o) === g(A, B));
      expect(full, where).toEqual([e]);
    }));
  it("substitute-bracket-01", () =>
    run("u02-substitute-bracket-01", (p, e) => {
      const [a, b] = /S = (\d+)\(2n \+ (\d+)\)/.exec(p)!.slice(1).map(Number);
      const n = Number(/when n = (\d+)/.exec(p)![1]);
      expect(e).toBe(a * (2 * n + b));
    }));
  it("words-02: only one option equals the real total", () =>
    run("u02-words-02", (p, e, opts, where) => {
      const [k, e1, l] = numsIn(p);
      const good = opts!.filter((o) => POINTS.every((pt) => ev(o, pt) === k * (pt.x - e1) + l));
      expect(good, where).toEqual([e]);
    }));
  it("expand-02", () =>
    run("u02-expand-02", (p, e) => {
      const m = /is (\d+)\((\d+)x \+ (\d+)\) − (\d+)\(x − (\d+)\) litres/.exec(p)!.slice(1).map(Number);
      const f = (x: number) => m[0] * (m[1] * x + m[2]) - m[3] * (x - m[4]);
      expect(f(1) - f(0)).toBe(e);
    }));
  it("perimeter-expr-01", () =>
    run("u02-perimeter-expr-01", (p, e, opts, where) => {
      const [s1, s2] = [...p.matchAll(/\(([^)]*)\) m/g)].map((m) => m[1]);
      const good = opts!.filter((o) => POINTS.every((pt) => ev(o, pt) === 2 * (ev(s1, pt) + ev(s2, pt))));
      expect(good, where).toEqual([e]);
    }));
  it("rearrange-01: only one option gives back n", () =>
    run("u02-rearrange-01", (p, e, opts, where) => {
      const [a, b] = /T = (\d+)n \+ (\d+)/.exec(p)!.slice(1).map(Number);
      const good = opts!.filter((o) => [1, 2, 5, 9].every((n) => ev(o, { T: a * n + b }) === n));
      expect(good, where).toEqual([e]);
    }));
  it("trapezium-reverse-01: the answer reproduces the area", () =>
    run("u02-trapezium-reverse-01", (p, e) => {
      const [A, a, h] = numsIn(p.split("Its area is")[1]);
      expect(0.5 * (a + Number(e)) * h).toBe(A);
    }));
  it("equivalent-01", () => equivalence("u02-equivalent-01", /count of .+? is (.+?)\. Which/));
  it("substitute-negative-01: only one option is the value", () =>
    run("u02-substitute-negative-01", (p, e, opts, where) => {
      const [pp, q, k, m] = /is (\d+)a² − (\d+)b\. Find its value when a = −(\d+) and b = (\d+)/.exec(p)!.slice(1).map(Number);
      const val = pp * (-k) * (-k) - q * m;
      expect(opts!.filter((o) => ev(o) === val), where).toEqual([e]);
    }));
  it("simplify-reverse-01: the answer makes both sides agree", () =>
    run("u02-simplify-reverse-01", (p, e, _o, where) => {
      const m = /count of .+?, (\d+)\((\d+)x \+ (\d+)\) − (\d+)\(x \+ k\) simplifies to (\d+)x \+ (\d+)\./.exec(p)!.slice(1).map(Number);
      const [a, d, b, c, X, K] = m;
      const k = Number(e);
      for (const x of [0, 1, 4]) expect(a * (d * x + b) - c * (x + k), where).toBe(X * x + K);
    }));
  it("chained-formula-01", () =>
    run("u02-chained-formula-01", (p, e) => {
      const [a, b, c, d] = /h = (\d+)n \+ (\d+) and L = (\d+)h − (\d+)/.exec(p)!.slice(1).map(Number);
      const n = Number(/when n = (\d+)/.exec(p)![1]);
      expect(e).toBe(c * (a * n + b) - d);
    }));
});
