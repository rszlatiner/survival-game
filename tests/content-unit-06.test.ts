import { describe, it, expect } from "vitest";
import { UNIT_06 } from "@/content/units/unit-06";
import { bankChecks, eachQuestion, numsIn } from "./helpers/bank";

bankChecks(6, UNIT_06);

const get = (id: string) => UNIT_06.find((t) => t.id === id)!;
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
const sortedNums = (a: number[]) => a.slice().sort((x, y) => x - y);
const median = (a: number[]) => {
  const s = sortedNums(a);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

describe("unit 6 independent recompute", () => {
  const run = (id: string, check: (prompt: string, expected: number | string, options: string[] | undefined, where: string) => void) =>
    eachQuestion(get(id), ({ publicQ, expected }, where) => check(publicQ.prompt, expected, publicQ.options, where));

  it("mean-01", () =>
    run("u06-mean-01", (p, e) => {
      const v = numsIn(p.slice(p.indexOf("land")));
      expect(v).toHaveLength(5);
      expect(sum(v) / 5).toBe(e);
    }));
  it("median-odd-01", () =>
    run("u06-median-odd-01", (p, e) => {
      const v = numsIn(p.replace("Seven", ""));
      expect(v).toHaveLength(7);
      expect(e).toBe(median(v));
    }));
  it("mode-01: the stated mode appears most often, uniquely", () =>
    run("u06-mode-01", (p, e) => {
      const nums = numsIn(p.slice(p.indexOf("trips is")).replace("trips is", ""));
      expect(nums).toHaveLength(8);
      const counts = new Map<number, number>();
      for (const x of nums) counts.set(x, (counts.get(x) ?? 0) + 1);
      const top = Math.max(...counts.values());
      const winners = [...counts].filter(([, c]) => c === top).map(([x]) => x);
      expect(winners).toEqual([e]);
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
  it("median-even-01", () =>
    run("u06-median-even-01", (p, e) => {
      const v = numsIn(p.replace("Six", ""));
      expect(v).toHaveLength(6);
      expect(e).toBe(median(v));
    }));
  it("freq-mean-01", () =>
    run("u06-freq-mean-01", (p, e) => {
      // The first numbers after "frequencies" are the values 1 to 4, then the four frequencies.
      const [, , , , f1, f2, f3, f4] = numsIn(p.slice(p.indexOf("frequencies")));
      const total = f1 + 2 * f2 + 3 * f3 + 4 * f4;
      expect(total / (f1 + f2 + f3 + f4)).toBe(e);
      expect(Number.isInteger(e)).toBe(true);
    }));
  it("missing-value-01", () =>
    run("u06-missing-value-01", (p, e) => {
      const [a, b, c, d, m] = numsIn(p.replace("first four days", "").replace("fifth day", "").replace("five days", ""));
      expect(a + b + c + d + Number(e)).toBe(5 * m);
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
  it("pie-reverse-01", () =>
    run("u06-pie-reverse-01", (p, e) => {
      const [n, angle] = numsIn(p);
      expect((Number(e) * 360) / n).toBe(angle);
    }));
  it("sample-01: only the random-list method is correct", () =>
    run("u06-sample-01", (p, e, opts) => {
      const [total, s] = numsIn(p);
      expect(String(e)).toContain("at random");
      expect(opts!.filter((o) => /random/.test(o))).toEqual([e]);
      expect(String(e)).toContain(String(s));
      expect(total).toBeGreaterThan(s);
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
  it("best-average-01: outlier gives median, categories give mode, totals give mean", () =>
    run("u06-best-average-01", (p, e) => {
      const want = /in six days are/.test(p) ? "The median" : /vote on sail colour/.test(p) ? "The mode" : "The mean";
      expect(e).toBe(want);
      if (want === "The median") {
        const v = numsIn(p.slice(p.indexOf("days are")).replace("days are", ""));
        expect(v).toHaveLength(6);
        expect(Math.max(...v)).toBeGreaterThan(4 * median(v));
      }
      if (want === "The mode") {
        const [red, blue, green] = numsIn(p);
        expect(red).toBeGreaterThan(Math.max(blue, green));
      }
    }));
  it("pie-compare-01", () =>
    run("u06-pie-compare-01", (p, e) => {
      const [n, aFish, aWood] = numsIn(p.slice(0, p.indexOf("How many")));
      const perPerson = 360 / n;
      expect((aFish - aWood) / perPerson).toBe(e);
    }));
  it("five-numbers-01: the whole list satisfies mean, median, range and the givens", () =>
    run("u06-five-numbers-01", (p, e) => {
      const m = /mean (\d+), median (\d+) and range (\d+)\. The smallest is (\d+) and the second smallest is (\d+)/.exec(p)!;
      const [mean, med, range, a, s] = m.slice(1).map(Number);
      const largest = a + range;
      const f = Number(e);
      const list = [a, s, med, f, largest];
      expect(sum(list)).toBe(5 * mean);
      expect(list).toEqual(sortedNums(list));
      expect(median(list)).toBe(med);
    }));
});
