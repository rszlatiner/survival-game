import { describe, it, expect } from "vitest";
import { UNIT_08 } from "@/content/units/unit-08";
import { bankChecks, overlapChecks, coordinateChecks, eachQuestion, numsIn } from "./helpers/bank";
import { rankChecks } from "./helpers/rank";

bankChecks(8, UNIT_08);
overlapChecks(UNIT_08);
coordinateChecks(UNIT_08);
rankChecks(UNIT_08);

const get = (id: string) => UNIT_08.find((t) => t.id === id)!;
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
/** Value of "n/d", "w n/d" or "w" as an exact [numerator, denominator] pair. */
function parse(s: string): [number, number] {
  const m = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(s);
  if (m) {
    const w = m[1] ? Number(m[1]) : 0;
    return [w * Number(m[3]) + Number(m[2]), Number(m[3])];
  }
  return [Number(s), 1];
}
const same = (a: [number, number], b: [number, number]) => a[0] * b[1] === b[0] * a[1];
/** True when the string is written in simplest form (and a mixed number when above 1). */
function isSimplest(s: string): boolean {
  const m = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(s);
  if (!m) return /^\d+$/.test(s);
  const n = Number(m[2]);
  const d = Number(m[3]);
  return gcd(n, d) === 1 && n < d;
}

describe("unit 8 independent recompute", () => {
  const run = (id: string, check: (prompt: string, expected: number | string, options: string[] | undefined, where: string) => void) =>
    eachQuestion(get(id), ({ publicQ, expected }, where) => check(publicQ.prompt, expected, publicQ.options, where));
  /** The key is the only option with the right value, and it is in simplest form (a mixed number above 1); every option is in that form. */
  const onlyRight = (opts: string[] | undefined, value: [number, number], e: string | number, where: string) => {
    expect(opts!.filter((o) => same(parse(o), value)), where).toEqual([e]);
    expect(isSimplest(e as string), where).toBe(true);
    for (const o of opts!) expect(isSimplest(o) || /^1\/\d+$/.test(o), `${where} ${o} not in simplest form`).toBe(true);
  };

  it("fraction-of-01", () =>
    run("u08-fraction-of-01", (p, e) => {
      const [total, n, d] = numsIn(p);
      expect((total * n) / d).toBe(e);
    }));
  it("equivalent-01", () =>
    run("u08-equivalent-01", (p, e) => {
      const [a, b, bm] = numsIn(p);
      expect(a * bm).toBe(Number(e) * b);
    }));
  it("simplify-01", () =>
    run("u08-simplify-01", (p, e, opts, where) => {
      const m = /Write (\d+)\/(\d+) in/.exec(p)!;
      onlyRight(opts, [Number(m[1]), Number(m[2])], e, where);
    }));
  it("to-decimal-01", () =>
    run("u08-to-decimal-01", (p, e) => {
      const m = /uses (\d+)\/(\d+) of/.exec(p)!;
      expect(Math.abs(Number(e) * Number(m[2]) - Number(m[1]))).toBeLessThan(1e-9);
    }));
  it("add-like-01", () =>
    run("u08-add-like-01", (p, e, opts, where) => {
      const m = /eat (\d+)\/(\d+) of your .*? and (\d+)\/(\d+) in/.exec(p)!;
      expect(m[2]).toBe(m[4]);
      onlyRight(opts, [Number(m[1]) + Number(m[3]), Number(m[2])], e, where);
    }));
  it("remaining-01", () =>
    run("u08-remaining-01", (p, e) => {
      const [a, b, total] = numsIn(p.replace("-litre", " litre"));
      expect(((b - a) * total) / b).toBe(e);
    }));
  it("add-unlike-01", () =>
    run("u08-add-unlike-01", (p, e, opts, where) => {
      const [a, b, c, d] = numsIn(p);
      onlyRight(opts, [a * d + c * b, b * d], e, where);
    }));
  it("subtract-unlike-01", () =>
    run("u08-subtract-unlike-01", (p, e, opts, where) => {
      const [a, b, c, d] = numsIn(p);
      expect(a * d).toBeGreaterThan(b * c);
      onlyRight(opts, [a * d - c * b, b * d], e, where);
    }));
  it("improper-01", () =>
    run("u08-improper-01", (p, e) => {
      const m = /is (\d+) (\d+)\/(\d+) lengths/.exec(p)!;
      const [w, n, d] = m.slice(1).map(Number);
      expect(e).toBe(w * d + n);
      expect(n).toBeLessThan(d);
    }));
  it("remaining-02", () =>
    run("u08-remaining-02", (p, e) => {
      const [total, a, b, c] = numsIn(p);
      const left = total - (total * a) / b - (total * c) / b;
      expect(left).toBe(e);
      expect(left).toBeGreaterThan(0);
    }));
  it("multiply-01", () =>
    run("u08-multiply-01", (p, e, opts, where) => {
      const [c, d, a, b] = numsIn(p);
      onlyRight(opts, [a * c, b * d], e, where);
    }));
  it("divide-fraction-01", () =>
    run("u08-divide-fraction-01", (p, e) => {
      const [n, d, total] = numsIn(p);
      expect(Number(e) * n).toBe(total * d);
    }));
  it("order-01: the chosen fraction beats the other three", () =>
    run("u08-order-01", (p, e, opts, where) => {
      const fr = (opts as string[]).map(parse);
      const win = parse(e as string);
      for (const f of fr) if (f !== win && !(f[0] === win[0] && f[1] === win[1])) expect(f[0] * win[1], where).toBeLessThan(win[0] * f[1]);
      expect(opts).toHaveLength(4);
      expect(numsIn(p).length).toBe(8);
    }));
  it("decimal-to-fraction-01", () =>
    run("u08-decimal-to-fraction-01", (p, e, opts, where) => {
      const h = Math.round(numsIn(p)[0] * 100);
      onlyRight(opts, [h, 100], e, where);
    }));
  it("whole-from-part-01", () =>
    run("u08-whole-from-part-01", (p, e) => {
      const [n, d, part] = numsIn(p);
      expect((Number(e) * n) / d).toBe(part);
    }));
  it("two-stage-01", () =>
    run("u08-two-stage-01", (p, e) => {
      const [total, a, b, c, d] = numsIn(p.replace("day 1", "day").replace("day 2", "day"));
      const afterOne = total - (total * a) / b;
      expect(afterOne - (afterOne * c) / d).toBe(e);
    }));
  it("mixed-add-01", () =>
    run("u08-mixed-add-01", (p, e, opts, where) => {
      const m = /carry (\d+) (\d+)\/(\d+) kg of .*? to camp, then (\d+) (\d+)\/(\d+) kg more/.exec(p)!;
      const [w1, a, b, w2, c, d] = m.slice(1).map(Number);
      onlyRight(opts, [(w1 * b + a) * d + (w2 * d + c) * b, b * d], e, where);
    }));
  it("mixed-divide-01", () =>
    run("u08-mixed-divide-01", (p, e) => {
      const m = /is (?:(\d+) )?(\d+)\/(\d+) km long.*each (\d+)\/(\d+) km long/.exec(p)!;
      const len: [number, number] = [(m[1] ? Number(m[1]) : 0) * Number(m[3]) + Number(m[2]), Number(m[3])];
      const sec: [number, number] = [Number(m[4]), Number(m[5])];
      expect(Number(e) * sec[0] * len[1]).toBe(len[0] * sec[1]);
    }));
  it("between-01: exactly one option lies strictly between the two fractions", () =>
    run("u08-between-01", (p, e, opts, where) => {
      const [a, b, c, d] = numsIn(p);
      const inside = (o: string) => {
        const [n, m] = parse(o);
        return n * b > a * m && n * d < c * m;
      };
      expect(opts!.filter(inside), where).toEqual([e]);
    }));
  it("mixed-multiply-01", () =>
    run("u08-mixed-multiply-01", (p, e, opts, where) => {
      const m = /is (\d+) (\d+)\/(\d+) m long and (\d+) (\d+)\/(\d+) m wide/.exec(p)!;
      const [w1, a, b, w2, c, d] = m.slice(1).map(Number);
      // Decimal check of the area, then the exact check.
      onlyRight(opts, [(w1 * b + a) * (w2 * d + c), b * d], e, where);
      expect(parse(e as string)[0] / parse(e as string)[1]).toBeCloseTo((w1 + a / b) * (w2 + c / d), 9);
    }));
});
