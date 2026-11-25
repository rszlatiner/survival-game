import { describe, it, expect } from "vitest";
import { UNIT_01 } from "@/content/units/unit-01";
import { bankChecks, eachQuestion, numsIn } from "./helpers/bank";

bankChecks(1, UNIT_01);

const get = (id: string) => UNIT_01.find((t) => t.id === id)!;
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number) => (a * b) / gcd(a, b);
const prime = (n: number) => n > 1 && Array.from({ length: n - 2 }, (_, i) => i + 2).every((d) => n % d !== 0);

/** Independent recompute: read numbers back out of the prompt and use the test's own formula. */
describe("unit 1 independent recompute", () => {
  const run = (id: string, check: (prompt: string, expected: number | string, options: string[] | undefined, where: string) => void) =>
    eachQuestion(get(id), ({ publicQ, expected }, where) => check(publicQ.prompt, expected, publicQ.options, where));

  it("negative-rise: gap from the cold reading up to the warm one", () =>
    run("u01-negative-rise-01", (p, e) => {
      const [lo, hi] = numsIn(p);
      expect(e).toBe(hi - lo);
    }));
  it("square-root-01", () =>
    run("u01-square-root-01", (p, e) => {
      expect(Number(e) ** 2).toBe(numsIn(p)[0]);
    }));
  it("multiples-01", () =>
    run("u01-multiples-01", (p, e) => {
      const ns = numsIn(p);
      const m = ns[0];
      const after = ns[ns.length - 1];
      const exp = Math.floor(after / m) * m + m;
      expect(e).toBe(exp);
      expect(exp).toBeGreaterThan(after);
      expect(exp - after).toBeLessThanOrEqual(m);
    }));
  it("powers-01", () =>
    run("u01-powers-01", (p, e) => {
      const m = /written as (\d)(\S)\./.exec(p)!;
      const exp = { "²": 2, "³": 3, "⁴": 4 }[m[2] as "²"];
      expect(e).toBe(Number(m[1]) ** exp);
    }));
  it("factor-count-01", () =>
    run("u01-factor-count-01", (p, e) => {
      const n = numsIn(p)[0];
      expect(e).toBe([...Array(n).keys()].filter((i) => n % (i + 1) === 0).length);
    }));
  it("order-ops-01", () =>
    run("u01-order-ops-01", (p, e) => {
      const m = /Work out (\d+) \+ (\d+) × (\d+)/.exec(p)!;
      expect(e).toBe(Number(m[1]) + Number(m[2]) * Number(m[3]));
      // Prompt wording agrees with the expression.
      expect(numsIn(p).slice(0, 3)).toEqual([Number(m[1]), Number(m[2]), Number(m[3])]);
    }));
  it("hcf-01", () =>
    run("u01-hcf-01", (p, e) => {
      const [x, y] = numsIn(p);
      expect(e).toBe(gcd(x, y));
    }));
  it("lcm-01", () =>
    run("u01-lcm-01", (p, e) => {
      const [x, y] = numsIn(p);
      let l = x;
      while (l % y !== 0) l += x;
      expect(e).toBe(l);
    }));
  it("prime-factor-01: the correct option multiplies back to the number; the others do not", () =>
    run("u01-prime-factor-01", (p, e, opts, where) => {
      const N = numsIn(p)[0];
      const sup: Record<string, number> = { "²": 2, "³": 3, "⁴": 4 };
      const val = (o: string) =>
        o.split(" × ").reduce((acc, f) => {
          const m = /^(\d+)(\S)?$/.exec(f)!;
          return acc * Number(m[1]) ** (m[2] ? sup[m[2]] : 1);
        }, 1);
      const good = opts!.filter((o) => val(o) === N);
      expect(good, where).toEqual([e]);
      for (const o of opts!) for (const f of o.split(" × ")) expect(prime(Number(/^\d+/.exec(f)![0])), where).toBe(true);
    }));
  it("negative-calc-01: one correct final temperature; the options differ", () =>
    run("u01-negative-calc-01", (p, e, opts, where) => {
      const [t, d, n] = numsIn(p.replace(/°C/g, ""));
      expect(e, where).toBe(`${t - n * d < 0 ? "−" : ""}${Math.abs(t - n * d)} °C`);
      expect(opts!.length, where).toBe(4);
    }));
  it("sqrt-between-01: only the correct pair brackets the root", () =>
    run("u01-sqrt-between-01", (p, e, opts, where) => {
      const N = numsIn(p)[0];
      const good = opts!.filter((o) => {
        const [a, b] = numsIn(o);
        return a * a < N && N < b * b && b === a + 1;
      });
      expect(good, where).toEqual([e]);
    }));
  it("cube-root-01", () =>
    run("u01-cube-root-01", (p, e) => {
      const v = numsIn(p)[0];
      const edge = Math.round(Math.cbrt(v));
      expect(edge ** 3).toBe(v);
      expect(e).toBe(edge * edge);
    }));
  it("divisible-nine-01: exactly one option is a multiple of 9", () =>
    run("u01-divisible-nine-01", (_p, e, opts, where) => {
      const good = opts!.filter((o) => Number(o) % 9 === 0);
      expect(good, where).toEqual([e]);
    }));
  it("prime-count-01", () =>
    run("u01-prime-count-01", (p, e) => {
      const [lo, hi] = numsIn(p);
      let c = 0;
      for (let n = lo; n <= hi; n++) if (prime(n)) c++;
      expect(e).toBe(c);
    }));
  it("hcf-lcm-reverse-01: the other number has the stated HCF and LCM with the given one", () =>
    run("u01-hcf-lcm-reverse-01", (p, e) => {
      const [h, l, x] = numsIn(p);
      const y = Number(e);
      expect(gcd(x, y)).toBe(h);
      expect(lcm(x, y)).toBe(l);
    }));
  it("lcm-three-01", () =>
    run("u01-lcm-three-01", (p, e) => {
      const [a, b, c] = numsIn(p);
      let n = Math.max(a, b, c);
      while (n % a || n % b || n % c) n++;
      expect(e).toBe(n);
    }));
  it("power-grow-01", () =>
    run("u01-power-grow-01", (p, e) => {
      const [start, target] = numsIn(p.replace(/day 0/, "day zero")).slice(0, 2);
      const factor = /doubles/.test(p) ? 2 : 3;
      let v = start;
      let day = 0;
      while (v < target) {
        v *= factor;
        day++;
      }
      expect(v).toBe(target);
      expect(e).toBe(day);
    }));
  it("claim-01: exactly one statement is true", () =>
    run("u01-claim-01", (p, e, opts, where) => {
      const N = numsIn(p)[0];
      const truth = (o: string) => {
        if (/prime number$/.test(o)) return prime(N);
        if (/square number$/.test(o)) return Number.isInteger(Math.sqrt(N));
        return N % numsIn(o)[1] === 0;
      };
      expect(opts!.filter(truth), where).toEqual([e]);
    }));
  it("order-ops-02", () =>
    run("u01-order-ops-02", (p, e) => {
      const m = /\((\d+) \+ (\d+)\)² − (\d+) × (\d+)/.exec(p)!.map(Number);
      expect(e).toBe((m[1] + m[2]) * (m[1] + m[2]) - m[3] * m[4]);
    }));
  it("negative-mean-01", () =>
    run("u01-negative-mean-01", (p, e) => {
      const list = numsIn(p.split("recorded:")[1]);
      expect(list).toHaveLength(4);
      expect(list.reduce((a, b) => a + b, 0) / 4).toBe(e);
    }));
});
