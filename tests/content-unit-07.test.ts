import { describe, it, expect } from "vitest";
import { UNIT_07 } from "@/content/units/unit-07";
import { bankChecks, overlapChecks, coordinateChecks, eachQuestion, numsIn } from "./helpers/bank";
import { rankChecks, valueRankChecks } from "./helpers/rank";

bankChecks(7, UNIT_07);
overlapChecks(UNIT_07);
coordinateChecks(UNIT_07);
rankChecks(UNIT_07);
valueRankChecks(UNIT_07);

const get = (id: string) => UNIT_07.find((t) => t.id === id)!;
/** Exact hundredths: work in integers (pi = 314 hundredths) to avoid float noise. */
const piTimes = (n: number) => (314 * n) / 100;
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe("unit 7 independent recompute", () => {
  const run = (id: string, check: (prompt: string, expected: number | string, options: string[] | undefined, where: string) => void) =>
    eachQuestion(get(id), ({ publicQ, expected }, where) => check(publicQ.prompt, expected, publicQ.options, where));

  it("rect-perimeter-01", () =>
    run("u07-rect-perimeter-01", (p, e) => {
      const [l, w] = numsIn(p);
      expect(e).toBe(l + w + l + w);
    }));
  it("area-method-01: the half-base-times-height option is the only one equal to the triangle area", () =>
    run("u07-area-method-01", (p, e, opts) => {
      const [b, h] = numsIn(p);
      const value = (o: string) => (o.startsWith("½") ? (b * h) / 2 : o.startsWith("2") ? 2 * (b + h) : o.includes("+") ? b + h : b * h);
      expect(opts!.filter((o) => value(o) === (b * h) / 2)).toEqual([e]);
    }));
  it("triangle-area-01", () =>
    run("u07-triangle-area-01", (p, e) => {
      const [b, h] = numsIn(p);
      expect(Number(e) * 2).toBe(b * h);
    }));
  it("parallelogram-area-01: uses the perpendicular height, not the slope", () =>
    run("u07-parallelogram-area-01", (p, e) => {
      const m = /base of (\d+) cm, a sloping side of (\d+) cm and a perpendicular height of (\d+) cm/.exec(p)!;
      const [b, s, h] = m.slice(1).map(Number);
      expect(e).toBe(b * h);
      expect(e).not.toBe(b * s);
    }));
  it("convert-length-01", () =>
    run("u07-convert-length-01", (p, e) => {
      const v = numsIn(p)[0];
      const factor = /how many centimetres|How many centimetres/.test(p) ? 100 : /metres is that/.test(p) && /km/.test(p) ? 1000 : 10;
      expect(close(Number(e), v * factor)).toBe(true);
      expect(Number.isInteger(e)).toBe(true);
    }));
  it("circumference-01", () =>
    run("u07-circumference-01", (p, e) => {
      const d = numsIn(p)[0];
      expect(close(Number(e), piTimes(d))).toBe(true);
    }));
  it("trapezium-area-01", () =>
    run("u07-trapezium-area-01", (p, e) => {
      const [a, b, h] = numsIn(p);
      expect(Number(e) * 2).toBe((a + b) * h);
    }));
  it("circle-area-01", () =>
    run("u07-circle-area-01", (p, e) => {
      const r = numsIn(p)[0];
      expect(close(Number(e), piTimes(r * r))).toBe(true);
    }));
  it("circle-area-02: the prompt gives the diameter", () =>
    run("u07-circle-area-02", (p, e) => {
      const dia = numsIn(p)[0];
      const r = dia / 2;
      expect(Number.isInteger(r)).toBe(true);
      expect(close(Number(e), piTimes(r * r))).toBe(true);
    }));
  it("l-area-01", () =>
    run("u07-l-area-01", (p, e) => {
      const [l, w, a, b] = numsIn(p);
      expect(e).toBe(l * w - a * b);
      expect(a).toBeLessThan(l);
      expect(b).toBeLessThan(w);
    }));
  it("triangle-height-01", () =>
    run("u07-triangle-height-01", (p, e) => {
      const [b, area] = numsIn(p);
      expect((b * Number(e)) / 2).toBe(area);
    }));
  it("compare-shapes-01: the named rack has the strictly greatest area", () =>
    run("u07-compare-shapes-01", (p, e) => {
      const [rl, rw, tb, th, pb, ph] = numsIn(p);
      const areas = { "The rectangle": rl * rw, "The triangle": (tb * th) / 2, "The parallelogram": pb * ph };
      const vals = Object.values(areas).sort((x, y) => y - x);
      expect(vals[0]).toBeGreaterThan(vals[1]);
      expect(areas[e as keyof typeof areas]).toBe(vals[0]);
    }));
  it("house-shape-01", () =>
    run("u07-house-shape-01", (p, e) => {
      const [w, h, , t] = numsIn(p);
      expect(e).toBe(w * h + (w * t) / 2);
    }));
  it("radius-reverse-01", () =>
    run("u07-radius-reverse-01", (p, e) => {
      const c = numsIn(p)[0];
      expect(close(piTimes(2 * Number(e)), c)).toBe(true);
    }));
  it("path-area-01", () =>
    run("u07-path-area-01", (p, e) => {
      const [r, w] = numsIn(p.replace("3.14", ""));
      expect(close(Number(e), piTimes((r + w) ** 2) - piTimes(r ** 2))).toBe(true);
    }));
  it("tiles-01", () =>
    run("u07-tiles-01", (p, e) => {
      const [l, w, t] = numsIn(p.replace(/ by (\d+) m /, " by $1 m ").replace("tiles", "tiles"));
      const floorCm2 = l * 100 * (w * 100);
      expect(floorCm2 % (t * t)).toBe(0);
      expect(e).toBe(floorCm2 / (t * t));
    }));
  it("mixed-units-01", () =>
    run("u07-mixed-units-01", (p, e) => {
      const [l, c] = numsIn(p);
      expect(close(Number(e), l * (c / 100))).toBe(true);
    }));
  it("area-units-01", () =>
    run("u07-area-units-01", (p, e) => {
      const a = numsIn(p)[0];
      // 1 m by 1 m is 100 cm by 100 cm.
      if (/in cm²/.test(p)) expect(e).toBe(a * 100 * 100);
      else expect(Number(e) * 100 * 100).toBe(a);
    }));
  it("window-01: rectangle plus half a circle of the stated diameter", () =>
    run("u07-window-01", (p, e) => {
      const [wide, h] = numsIn(p.replace("3.14", ""));
      const r = wide / 2;
      expect(close(Number(e), wide * h + piTimes(r * r) / 2)).toBe(true);
    }));
  it("scale-claim-01: only the true area or radius factor matches, and the key is not always in the same place", () =>
    run("u07-scale-claim-01", (p, e, opts, where) => {
      const [r, n] = numsIn(p);
      const factor = /radius \d+ times as long/.test(p) ? n * n : Math.sqrt(n);
      void r;
      expect(opts!.filter((o) => numsIn(o)[0] === factor), where).toEqual([e]);
      expect(opts).toHaveLength(4);
    }));
});
