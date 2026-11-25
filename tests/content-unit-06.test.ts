import { describe, it, expect } from "vitest";
import { UNIT_06 } from "@/content/units/unit-06";
import { bankChecks, overlapChecks, coordinateChecks, eachQuestion, numsIn } from "./helpers/bank";
import { rankChecks, valueRankChecks } from "./helpers/rank";

bankChecks(6, UNIT_06);
overlapChecks(UNIT_06);
coordinateChecks(UNIT_06);
rankChecks(UNIT_06);
valueRankChecks(UNIT_06);

const get = (id: string) => UNIT_06.find((t) => t.id === id)!;
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
const sortedNums = (a: number[]) => a.slice().sort((x, y) => x - y);
const median = (a: number[]) => {
  const s = sortedNums(a);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};
const modes = (v: number[]) => {
  const counts = new Map<number, number>();
  for (const x of v) counts.set(x, (counts.get(x) ?? 0) + 1);
  const top = Math.max(...counts.values());
  return { top, winners: [...counts].filter(([, c]) => c === top).map(([x]) => x) };
};

describe("unit 6 independent recompute", () => {
  const run = (id: string, check: (prompt: string, expected: number | string, options: string[] | undefined, where: string) => void) =>
    eachQuestion(get(id), ({ publicQ, expected }, where) => check(publicQ.prompt, expected, publicQ.options, where));

  it("median-odd-01", () =>
    run("u06-median-odd-01", (p, e) => {
      const v = numsIn(p.replace("seven", ""));
      expect(v).toHaveLength(7);
      expect(e).toBe(median(v));
    }));
  it("mode-01: the stated mode appears most often, uniquely", () =>
    run("u06-mode-01", (p, e) => {
      const nums = numsIn(p.slice(p.indexOf("trips is")).replace("trips is", ""));
      expect(nums).toHaveLength(8);
      expect(modes(nums).winners).toEqual([e]);
    }));
  it("range-01", () =>
    run("u06-range-01", (p, e) => {
      const v = numsIn(p.slice(p.indexOf("six days")).replace("six days", ""));
      expect(v).toHaveLength(6);
      expect(Math.max(...v) - Math.min(...v)).toBe(e);
    }));
  it("pie-angle-01", () =>
    run("u06-pie-angle-01", (p, e) => {
      const [n, f] = numsIn(p);
      expect(Number(e) * n).toBe(360 * f);
    }));
  it("data-type-01", () =>
    run("u06-data-type-01", (p, e) => {
      const want = /colour/.test(p) ? "Categorical" : /how many/.test(p) ? "Discrete" : "Continuous";
      expect(e).toBe(want);
    }));
  it("data-source-01: only the do-it-yourself option is primary", () =>
    run("u06-data-source-01", (p, e, opts) => {
      expect(opts!.filter((o) => /^You (measure|time|count|ask) /.test(o))).toEqual([e]);
      expect(opts!.filter((o) => /^You (copy|read|use|look up) /.test(o))).toHaveLength(3);
    }));
  it("freq-mean-01", () =>
    run("u06-freq-mean-01", (p, e) => {
      const nums = numsIn(p.slice(p.indexOf("frequencies")));
      const values = nums.slice(0, 4);
      const freqs = nums.slice(4, 8);
      expect(values[1] - values[0]).toBe(values[2] - values[1]);
      const total = sum(values.map((v, i) => v * freqs[i]));
      expect(total / sum(freqs)).toBe(e);
      expect(Number.isInteger(e)).toBe(true);
    }));
  it("median-even-01", () =>
    run("u06-median-even-01", (p, e) => {
      const v = numsIn(p.replace("Six", ""));
      expect(v).toHaveLength(6);
      expect(e).toBe(median(v));
    }));
  it("compare-range-01: the named crew has the strictly smallest range", () =>
    run("u06-compare-range-01", (p, e, _o, where) => {
      const rows = ["A", "B", "C"].map((c) => {
        const m = new RegExp(`Crew ${c}: ([\\d, ]+)\\.`).exec(p)!;
        const v = numsIn(m[1]);
        expect(v).toHaveLength(4);
        return Math.max(...v) - Math.min(...v);
      });
      expect(new Set(rows).size, where).toBe(3);
      expect(e).toBe(`Crew ${"ABC"[rows.indexOf(Math.min(...rows))]}`);
    }));
  it("sample-01: fair means random from everyone, biased means asking only one kind of person", () =>
    run("u06-sample-01", (p, e, opts) => {
      expect(opts).toHaveLength(4);
      if (/fairest/.test(p)) {
        expect(String(e)).toContain("at random");
        expect(opts!.filter((o) => /random/.test(o))).toEqual([e]);
      } else {
        expect(/biased/.test(p)).toBe(true);
        expect(String(e)).toContain("fishing spot");
        expect(opts!.filter((o) => /fishing spot/.test(o))).toEqual([e]);
        const [total, size] = numsIn(p);
        expect(total).toBe(10 * size);
      }
    }));
  it("every-nth-01", () =>
    run("u06-every-nth-01", (p, e) => {
      const [names, sample] = numsIn(p);
      expect(Number(e) * sample).toBe(names);
    }));
  it("two-way-01", () =>
    run("u06-two-way-01", (p, e) => {
      const m = /, (\d+) islanders.*?\. (\d+) of them are adults\. (\d+) adults and (\d+) children/.exec(p)!;
      const [total, adults, , y] = m.slice(1).map(Number);
      expect(total - adults - y).toBe(e);
    }));
  it("stem-leaf-01", () =>
    run("u06-stem-leaf-01", (p, e) => {
      const stems = [1, 2, 3].map((s) => {
        const m = new RegExp(`Stem ${s}: ([\\d ]+)\\.`).exec(p)!;
        return numsIn(m[1]).map((leaf) => s * 10 + leaf);
      });
      const all = stems.flat();
      expect(Math.max(...all) - Math.min(...all)).toBe(e);
    }));
  it("pie-compare-01", () =>
    run("u06-pie-compare-01", (p, e) => {
      const [n, aFish, aBuild] = numsIn(p.slice(0, p.indexOf("How many")));
      expect((aFish - aBuild) / (360 / n)).toBe(e);
    }));
  it("mean-add-01", () =>
    run("u06-mean-add-01", (p, e) => {
      const [n, m, m2] = numsIn(p);
      expect(n * m + Number(e)).toBe((n + 1) * m2);
    }));
  it("combined-mean-01", () =>
    run("u06-combined-mean-01", (p, e) => {
      const [n1, m1, n2, m2] = numsIn(p.slice(0, p.indexOf("What is")));
      expect(e).toBe((n1 * m1 + n2 * m2) / (n1 + n2));
      expect(Number.isInteger(e)).toBe(true);
    }));
  it("median-freq-01: expand the table and take the middle value", () =>
    run("u06-median-freq-01", (p, e) => {
      const nums = numsIn(p.slice(p.indexOf("frequencies")));
      const fs = nums.slice(5, 10);
      const all = fs.flatMap((f, i) => Array(f).fill(i + 1));
      expect(all.length % 2).toBe(1);
      expect(e).toBe(median(all));
    }));
  it("best-average-01: exactly one average is defensible for the data given", () =>
    run("u06-best-average-01", (p, e, _o, where) => {
      const want = /in six days are/.test(p) ? "The median" : /vote on sail colour/.test(p) ? "The mode" : "The mean";
      expect(e).toBe(want);
      if (want === "The median") {
        const v = numsIn(p.slice(p.indexOf("days are")).replace("days are", ""));
        expect(v).toHaveLength(6);
        expect(Math.max(...v)).toBeGreaterThan(4 * median(v));
        // No repeated value, so there is no sensible mode either.
        expect(modes(v).top, where).toBe(1);
      }
      if (want === "The mode") {
        const [red, blue, green] = numsIn(p);
        expect(red).toBeGreaterThan(Math.max(blue, green));
      }
      if (want === "The mean") {
        const v = numsIn(p.slice(p.indexOf("days are")).replace("days are", "")).slice(0, 5);
        expect(v).toHaveLength(5);
        expect(modes(v).top, where).toBe(1);
        expect(Math.max(...v)).toBeLessThan(3 * median(v));
      }
    }));
  it("five-numbers-01: the whole list satisfies mean, median, range and the givens", () =>
    run("u06-five-numbers-01", (p, e) => {
      const m = /mean (\d+), median (\d+) and range (\d+)\. The smallest is (\d+) and the second smallest is (\d+)/.exec(p)!;
      const [mean, med, range, a, s] = m.slice(1).map(Number);
      const f = Number(e);
      const list = [a, s, med, f, a + range];
      expect(sum(list)).toBe(5 * mean);
      expect(list).toEqual(sortedNums(list));
      expect(median(list)).toBe(med);
    }));
  it("sample-estimate-01", () =>
    run("u06-sample-estimate-01", (p, e) => {
      const [s, x, total] = numsIn(p);
      expect((x * total) / s).toBe(e);
      expect(x).toBeLessThan(s);
    }));
});
