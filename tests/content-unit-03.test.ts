import { describe, it, expect } from "vitest";
import { UNIT_03 } from "@/content/units/unit-03";
import { bankChecks, eachQuestion, numsIn } from "./helpers/bank";

bankChecks(3, UNIT_03);

const get = (id: string) => UNIT_03.find((t) => t.id === id)!;
/** Round half up at a decimal place using exact whole-number arithmetic on a decimal string. */
function roundStr(s: string, places: number): number {
  const [i, f = ""] = s.split(".");
  const digits = (i + f.padEnd(places + 1, "0")).replace(/^0+(?=\d)/, "");
  const whole = Number(digits.slice(0, i.length + places)) + (Number(digits[i.length + places]) >= 5 ? 1 : 0);
  return whole / 10 ** places;
}
const roundSf = (v: number, sf: number) => {
  const pv = 10 ** (String(v).length - sf);
  return Math.floor((v + pv / 2) / pv) * pv;
};

describe("unit 3 independent recompute", () => {
  const run = (id: string, check: (prompt: string, expected: number | string, options: string[] | undefined, where: string) => void) =>
    eachQuestion(get(id), ({ publicQ, expected }, where) => check(publicQ.prompt, expected, publicQ.options, where));
  const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

  it("round-dp-01", () =>
    run("u03-round-dp-01", (p, e, _o, where) => {
      const len = /of length (\d\.\d{3}) m/.exec(p)![1];
      const dp = Number(/to (\d) decimal place/.exec(p)![1]);
      expect(close(Number(e), roundStr(len, dp)), `${where} ${len} ${dp} ${e}`).toBe(true);
    }));
  it("percent-of-01", () =>
    run("u03-percent-of-01", (p, e) => {
      const [pc, n] = numsIn(p);
      expect(e).toBe(Math.round((pc / 100) * n));
      expect(((pc / 100) * n) % 1).toBe(0);
    }));
  it("fraction-percent-01", () =>
    run("u03-fraction-percent-01", (p, e) => {
      const [k, n] = numsIn(p);
      expect(close(Number(e) * n, 100 * k)).toBe(true);
    }));
  it("decimal-mult-01", () =>
    run("u03-decimal-mult-01", (p, e) => {
      const [n, w] = numsIn(p);
      expect(close(Number(e), Math.round(n * w * 100) / 100)).toBe(true);
    }));
  it("order-decimals-01: the picked option really is the largest or smallest", () =>
    run("u03-order-decimals-01", (p, e, opts, where) => {
      const vals = opts!.map((o) => Number(o.replace(" L", "")));
      const target = /holds the least/.test(p) ? Math.min(...vals) : Math.max(...vals);
      expect(Number(String(e).replace(" L", "")), where).toBe(target);
    }));
  it("convert-km-01", () =>
    run("u03-convert-km-01", (p, e) => {
      const m = numsIn(p)[0];
      expect(close(Number(e), m / 1000)).toBe(true);
    }));
  it("percent-increase-01", () =>
    run("u03-percent-increase-01", (p, e) => {
      const [n, pc] = numsIn(p);
      expect(close(Number(e), n * (1 + pc / 100))).toBe(true);
    }));
  it("percent-decrease-01", () =>
    run("u03-percent-decrease-01", (p, e) => {
      const [n, pc] = numsIn(p);
      expect(close(Number(e), n * (1 - pc / 100))).toBe(true);
    }));
  it("express-percent-01", () =>
    run("u03-express-percent-01", (p, e) => {
      const [n, left] = numsIn(p);
      expect(close(Number(e), ((n - left) / n) * 100)).toBe(true);
    }));
  it("round-sf-01", () =>
    run("u03-round-sf-01", (p, e) => {
      const m = /holds (\d+) .*Round \d+ to (\d) significant/.exec(p)!;
      expect(e).toBe(roundSf(Number(m[1]), Number(m[2])));
    }));
  it("estimate-01: the correct option is the 1 s.f. product, and it is unique", () =>
    run("u03-estimate-01", (p, e, opts, where) => {
      const m = /estimate of (\d)\.(\d) × (\d+) for/.exec(p)!;
      const a = Number(`${m[1]}.${m[2]}`);
      const b = Number(m[3]);
      const r1 = (v: number) => {
        const mag = 10 ** (Math.floor(Math.log10(v)));
        return Math.round(v / mag + 1e-9) * mag;
      };
      expect(String(r1(a) * r1(b)), where).toBe(e);
      expect(opts!.filter((o) => o === String(r1(a) * r1(b))), where).toHaveLength(1);
    }));
  it("compare-percent-01", () =>
    run("u03-compare-percent-01", (p, e) => {
      const [a, n, b, m] = numsIn(p.replace("Team A", "").replace("Team B", ""));
      expect(a / n).not.toBe(b / m);
      expect(e).toBe(a / n > b / m ? "Team A" : "Team B");
    }));
  it("decimal-mult-02", () =>
    run("u03-decimal-mult-02", (p, e) => {
      const [a, b] = numsIn(p);
      expect(close(Number(e), Math.round(a * b * 100) / 100)).toBe(true);
    }));
  it("divide-decimals-01: portions times portion size gives the total", () =>
    run("u03-divide-decimals-01", (p, e) => {
      const [total, each] = numsIn(p);
      expect(close(Number(e) * each, total)).toBe(true);
    }));
  it("reverse-percent-01: re-applying the percentage to the answer gives the stated price", () =>
    run("u03-reverse-percent-01", (p, e, _o, where) => {
      const [pc, now] = numsIn(p);
      const factor = /reduced/.test(p) ? 1 - pc / 100 : 1 + pc / 100;
      expect(close(Number(e) * factor, now), where).toBe(true);
    }));
  it("successive-percent-01", () =>
    run("u03-successive-percent-01", (p, e) => {
      const [start, up, down] = numsIn(p);
      expect(close(Number(e), start * (1 + up / 100) * (1 - down / 100))).toBe(true);
    }));
  it("round-boundary-01: only one option rounds to the recorded length", () =>
    run("u03-round-boundary-01", (p, e, opts, where) => {
      const rec = Number(/recorded as (\d\.\d) m/.exec(p)![1]);
      const good = opts!.filter((o) => close(roundStr(o.replace(" m", ""), 1), rec));
      expect(good, where).toEqual([e]);
    }));
  it("mixed-order-01: the picked share is the greatest", () =>
    run("u03-mixed-order-01", (_p, e, opts, where) => {
      const val = (o: string) => (o.endsWith("%") ? parseFloat(o) / 100 : o.includes("/") ? Number(o.split("/")[0]) / Number(o.split("/")[1]) : Number(o));
      const vals = opts!.map(val);
      expect(new Set(vals).size, where).toBe(4);
      expect(val(String(e)), where).toBe(Math.max(...vals));
    }));
  it("percent-change-01", () =>
    run("u03-percent-change-01", (p, e) => {
      const [from, to] = numsIn(p.replace(/\bType.*/, ""));
      expect(close(Number(e), (Math.abs(to - from) / from) * 100)).toBe(true);
      expect(/decrease/.test(p)).toBe(to < from);
    }));
  it("best-buy-01", () =>
    run("u03-best-buy-01", (p, e) => {
      const m = /Pack A has (\d+) .* for ([\d.]+) shells\. Pack B has (\d+) for ([\d.]+) shells/.exec(p)!;
      const ua = Number(m[2]) / Number(m[1]);
      const ub = Number(m[4]) / Number(m[3]);
      expect(close(Number(e), Math.abs(ua - ub))).toBe(true);
    }));
});
