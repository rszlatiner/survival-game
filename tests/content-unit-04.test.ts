import { describe, it, expect } from "vitest";
import { UNIT_04 } from "@/content/units/unit-04";
import { bankChecks, overlapChecks, eachQuestion, numsIn } from "./helpers/bank";

bankChecks(4, UNIT_04);
overlapChecks(UNIT_04);

const get = (id: string) => UNIT_04.find((t) => t.id === id)!;
const norm = (s: string) => s.replace(/−/g, "-").replace(/×/g, "*").replace(/÷/g, "/").replace(/≥/g, ">=").replace(/≤/g, "<=");
/** Evaluate one side of an equation or inequality, with implicit multiplication. */
function side(s: string, v: { x?: number; n?: number; L?: number }): number {
  const e = norm(s)
    .replace(/(\d|\))(?=[xnL(])/g, "$1*")
    .replace(/([xnL])(?=\()/g, "$1*");
  return new Function("x", "n", "L", `return ${e};`)(v.x ?? 0, v.n ?? 0, v.L ?? 0) as number;
}
/** Truth of "lhs OP rhs" at a value of the variable. */
function holds(stmt: string, name: "x" | "n" | "L", val: number): boolean {
  const m = /^(.*?)\s*(>=|<=|>|<|=)\s*(.*)$/.exec(norm(stmt))!;
  const v = { [name]: val };
  const a = side(m[1], v);
  const b = side(m[3], v);
  return { ">=": a >= b, "<=": a <= b, ">": a > b, "<": a < b, "=": a === b }[m[2] as ">="];
}
/** Statement text after the last "Solve" or the given marker. */
const after = (p: string, re: RegExp) => re.exec(p)![1];

describe("unit 4 independent recompute", () => {
  const run = (id: string, check: (prompt: string, expected: number | string, options: string[] | undefined, where: string) => void) =>
    eachQuestion(get(id), ({ publicQ, expected }, where) => check(publicQ.prompt, expected, publicQ.options, where));
  /** The numeric answer satisfies the equation printed in the prompt, and a nearby value does not. */
  const satisfies = (id: string, re: RegExp) =>
    run(id, (p, e, _o, where) => {
      const eq = after(p, re);
      expect(holds(eq, "x", Number(e)), `${where}: ${eq}`).toBe(true);
      expect(holds(eq, "x", Number(e) + 1), where).toBe(false);
    });

  it("one-step-add-01", () => satisfies("u04-one-step-add-01", /Solve (x \+ \d+ = \d+) to find/));
  it("one-step-mult-01", () => satisfies("u04-one-step-mult-01", /Solve (\d+x = \d+) to find/));
  it("two-step-01", () => satisfies("u04-two-step-01", /Solve (\d+x \+ \d+ = \d+) to find/));
  it("two-step-sub-01", () => satisfies("u04-two-step-sub-01", /Solve (\d+x − \d+ = \d+) to find/));
  it("inequality-read-01: the right sign for the phrase, the others wrong for some value", () =>
    run("u04-inequality-read-01", (p, e, opts, where) => {
      const phrase = /must carry (at least|more than|at most|less than) (\d+)/.exec(p)!;
      const N = Number(phrase[2]);
      const truth: Record<string, (L: number) => boolean> = {
        "at least": (L) => L >= N,
        "more than": (L) => L > N,
        "at most": (L) => L <= N,
        "less than": (L) => L < N,
      };
      const agrees = (o: string) => [N - 1, N, N + 1].every((L) => holds(o, "L", L) === truth[phrase[1]](L));
      expect(opts!.filter(agrees), where).toEqual([e]);
    }));
  it("divide-eq-01", () =>
    run("u04-divide-eq-01", (p, e, _o, where) => {
      const m = /Solve n ÷ (\d+) = (\d+) to find n/.exec(p)!;
      expect(Number(e) / Number(m[1]), where).toBe(Number(m[2]));
    }));
  it("both-sides-01", () => satisfies("u04-both-sides-01", /Solve (.+?) to find x/));
  it("brackets-01", () => satisfies("u04-brackets-01", /Solve (\d+\(x \+ \d+\) = \d+) to find/));
  it("perimeter-eq-01: x reproduces the stated perimeter", () =>
    run("u04-perimeter-eq-01", (p, e) => {
      const [a, perim] = numsIn(p.replace("x m wide and (x + ", "w ").replace(/\) m long/, " m long"));
      const x = Number(e);
      expect(2 * (x + (x + a))).toBe(perim);
    }));
  it("solve-ineq-01: one option describes exactly the values that satisfy the inequality", () =>
    run("u04-solve-ineq-01", (p, e, opts, where) => {
      const stmt = /when (.+?), where x/.exec(p)![1];
      const agrees = (o: string) => Array.from({ length: 60 }, (_, i) => i - 5).every((x) => holds(o, "x", x) === holds(stmt, "x", x));
      expect(opts!.filter(agrees), where).toEqual([e]);
    }));
  it("ineq-integers-01", () =>
    run("u04-ineq-integers-01", (p, e) => {
      const m = /satisfies (\d+) (<|≤) x (<|≤) (\d+)\./.exec(p)!;
      let c = 0;
      for (let v = 0; v <= 40; v++) {
        const lo = m[2] === "<" ? v > Number(m[1]) : v >= Number(m[1]);
        const hi = m[3] === "<" ? v < Number(m[4]) : v <= Number(m[4]);
        if (lo && hi) c++;
      }
      expect(e).toBe(c);
    }));
  it("fraction-eq-01", () =>
    run("u04-fraction-eq-01", (p, e) => {
      const m = /\(x \+ (\d+)\) ÷ (\d+) = (\d+) to find/.exec(p)!.slice(1).map(Number);
      expect((Number(e) + m[0]) / m[1]).toBe(m[2]);
    }));
  it("number-line-01: only the matching inequality has the right boundary behaviour", () =>
    run("u04-number-line-01", (p, e, opts, where) => {
      const n = Number(/circle at (\d+) and/.exec(p)![1]);
      const closed = /closed circle/.test(p);
      const right = /pointing right/.test(p);
      const wanted = (v: number) => (right ? (closed ? v >= n : v > n) : closed ? v <= n : v < n);
      const agrees = (o: string) => [n - 2, n - 1, n, n + 1, n + 2].every((v) => holds(o, "x", v) === wanted(v));
      expect(opts!.filter(agrees), where).toEqual([e]);
    }));
  it("write-equation-01: only one option's left side is a x minus b, with the stated result", () =>
    run("u04-write-equation-01", (p, e, opts, where) => {
      const [a, b, c] = numsIn(p.replace(/number x of/, "number of"));
      const good = opts!.filter((o) => {
        const [lhs, rhs] = o.split(" = ");
        return Number(rhs) === c && [1, 2, 3, 6].every((x) => side(lhs, { x }) === a * x - b);
      });
      expect(good, where).toEqual([e]);
    }));
  it("both-sides-02", () => satisfies("u04-both-sides-02", /Solve (.+?) to find x/));
  it("construct-02: rope B satisfies the story", () =>
    run("u04-construct-02", (p, e) => {
      const m = /Rope B is (\d+) m longer than (\d+) times rope A\. Together they measure (\d+) m/.exec(p)!.slice(1).map(Number);
      const [b, c, total] = m;
      const B = Number(e);
      const A = (B - b) / c;
      expect(Number.isInteger(A)).toBe(true);
      expect(A + B).toBe(total);
    }));
  it("ineq-largest-01: n works, n + 1 does not", () =>
    run("u04-ineq-largest-01", (p, e, _o, where) => {
      const stmt = /safe when (.+?), where n/.exec(p)![1];
      expect(holds(stmt, "n", Number(e)), where).toBe(true);
      expect(holds(stmt, "n", Number(e) + 1), where).toBe(false);
    }));
  it("ineq-smallest-01: n works, n - 1 does not", () =>
    run("u04-ineq-smallest-01", (p, e, _o, where) => {
      const stmt = /week when (.+?), where n/.exec(p)![1];
      expect(holds(stmt, "n", Number(e)), where).toBe(true);
      expect(holds(stmt, "n", Number(e) - 1), where).toBe(false);
    }));
  it("claim-solution-01: exactly one equation is true at the stated value", () =>
    run("u04-claim-solution-01", (p, e, opts, where) => {
      const n = Number(/solution x = (\d+)\?/.exec(p)![1]);
      expect(opts!.filter((o) => holds(o, "x", n)), where).toEqual([e]);
    }));
  it("ineq-context-01: the right inequality matches the spending rule at test values", () =>
    run("u04-ineq-context-01", (p, e, opts, where) => {
      const m = /cost (\d+) shells each\. You have already spent (\d+) shells.*at most (\d+) shells/.exec(p)!.slice(1).map(Number);
      const [a, c, B] = m;
      const affordable = (n: number) => a * n + c <= B;
      const agrees = (o: string) => Array.from({ length: 30 }, (_, n) => n).every((n) => holds(o, "n", n) === affordable(n));
      expect(opts!.filter(agrees), where).toEqual([e]);
    }));
});
