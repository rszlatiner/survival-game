import { describe, it, expect } from "vitest";
import { UNIT_15 } from "@/content/units/unit-15";
import { bankChecks, overlapChecks, coordinateChecks, eachQuestion, numsIn } from "./helpers/bank";
import { rankChecks, valueRankChecks } from "./helpers/rank";

bankChecks(15, UNIT_15);
overlapChecks(UNIT_15);
coordinateChecks(UNIT_15);
rankChecks(UNIT_15);
valueRankChecks(UNIT_15);

const get = (id: string) => UNIT_15.find((t) => t.id === id)!;
const near = (a: number, b: number | string) => Math.abs(a - Number(b)) < 1e-9;
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const rng = (a: number[]) => Math.max(...a) - Math.min(...a);
const med = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
/** Numbers in the text after the first occurrence of a label up to the next sentence end. */
const after = (p: string, label: string) => numsIn(p.slice(p.indexOf(label) + label.length).split(/\.\s/)[0]);

describe("unit 15 independent recompute", () => {
  const run = (id: string, check: (prompt: string, expected: number | string, options: string[] | undefined, where: string) => void) =>
    eachQuestion(get(id), ({ publicQ, expected }, where) => check(publicQ.prompt, expected, publicQ.options, where));

  it("mean-01", () => run("u15-mean-01", (p, e) => { const v = numsIn(p.split(": ")[1].split(".")[0]); expect(v).toHaveLength(5); expect(Math.min(...v)).toBeGreaterThan(0); expect(sum(v) / 5).toBe(e); }));
  it("median-01", () => run("u15-median-01", (p, e) => { const v = numsIn(p.split(": ")[1].split(".")[0]); expect(v).toHaveLength(7); expect(med(v)).toBe(e); }));
  it("mode-01: the stated mode is unique", () =>
    run("u15-mode-01", (p, e) => {
      const v = numsIn(p.split(": ")[1].split(".")[0]);
      const counts = new Map<number, number>();
      for (const x of v) counts.set(x, (counts.get(x) ?? 0) + 1);
      const top = Math.max(...counts.values());
      const modes = [...counts].filter(([, c]) => c === top).map(([x]) => x);
      expect(modes).toEqual([e]);
    }));
  it("range-01", () => run("u15-range-01", (p, e) => { const v = numsIn(p.split("was ")[1].split(".")[0]); expect(rng(v)).toBe(e); }));
  it("yes-percent-01", () => run("u15-yes-percent-01", (p, e) => { const [N, k] = numsIn(p); expect(near((k / N) * 100, e)).toBe(true); }));
  it("sample-choice-01: only the random draw is unbiased", () =>
    run("u15-sample-choice-01", (_p, e, opts) => {
      const fair = opts!.filter((o) => /random/.test(o));
      expect(fair).toEqual([e]);
    }));
  it("percent-increase-01", () => run("u15-percent-increase-01", (p, e) => { const m = /from (\d+) in week 1 to (\d+) in week 2/.exec(p)!; const [a, b] = [Number(m[1]), Number(m[2])]; expect(near(((b - a) / a) * 100, e)).toBe(true); }));
  it("compare-means-01: the key is the only option with the true higher site and difference", () =>
    run("u15-compare-means-01", (p, e, opts, where) => {
      const A = after(p, "Site A:").slice(0, 4);
      const B = after(p, "Site B:").slice(0, 4);
      const dA = sum(A) / 4;
      const dB = sum(B) / 4;
      const true_ = (o: string) => {
        const m = /^Site ([AB]) has the higher mean, by (\d+(?:\.\d+)?)$/.exec(o)!;
        return (m[1] === "A" ? dA > dB : dB > dA) && Math.abs(dA - dB) === Number(m[2]);
      };
      expect(opts!.filter(true_), where).toEqual([e]);
    }));
  it("missing-value-01", () => run("u15-missing-value-01", (p, e) => { const m = Number(/is (\d+)\. On four/.exec(p)![1]); const four = numsIn(/On four of the days you collect ([^.]*)\./.exec(p)![1]); expect(four).toHaveLength(4); expect(m * 5 - sum(four)).toBe(e); }));
  it("pie-angle-01", () => run("u15-pie-angle-01", (p, e) => { const [N, k] = numsIn(p); expect(near((k / N) * 360, e)).toBe(true); }));
  it("median-even-01", () => run("u15-median-even-01", (p, e) => { const v = numsIn(p.split("kg: ")[1].split(".")[0]); expect(v).toHaveLength(6); expect(med(v)).toBe(e); }));
  it("correlation-01: the key matches the sign of the sloped data, or neither", () =>
    run("u15-correlation-01", (p, e) => {
      const x = after(p, "Sun:");
      const y = after(p, "Height:");
      const mx = sum(x) / 5;
      const my = sum(y) / 5;
      const cov = sum(x.map((v, i) => (v - mx) * (y[i] - my)));
      const mono = (a: number[], dir: number) => a.every((v, i) => i === 0 || (v - a[i - 1]) * dir > 0);
      if (cov > 0) { expect(mono(y, 1)).toBe(true); expect(e).toBe("Positive correlation"); }
      else if (cov < 0) { expect(mono(y, -1)).toBe(true); expect(e).toBe("Negative correlation"); }
      else { expect(mono(y, 1) || mono(y, -1)).toBe(false); expect(e).toBe("No correlation"); }
    }));
  it("consistency-01", () =>
    run("u15-consistency-01", (p, e, opts, where) => {
      const A = after(p, "A:").slice(0, 5);
      const B = after(p, "B:").slice(0, 5);
      const want = rng(A) < rng(B) ? `Way A, range ${rng(A)}` : `Way B, range ${rng(B)}`;
      expect(rng(A)).not.toBe(rng(B));
      expect(e, where).toBe(want);
      expect(opts).toContain(want);
    }));
  it("freq-mean-01", () =>
    run("u15-freq-mean-01", (p, e) => {
      const m = /: (\d+) palms? (?:has|have) (\d+), (\d+) palms? (?:has|have) (\d+) and (\d+) palms? (?:has|have) (\d+)\./.exec(p)!;
      const [f1, v1, f2, v2, f3, v3] = m.slice(1).map(Number);
      expect((f1 * v1 + f2 * v2 + f3 * v3) / (f1 + f2 + f3)).toBe(e);
    }));
  it("percent-claim-01: verdict and percentage both follow from the counts", () =>
    run("u15-percent-claim-01", (p, e, opts, where) => {
      const [O, N, claim] = numsIn(p.replace(/Tom says/, "Tom says "));
      const fall = Math.round(((O - N) / O) * 1e9) / 1e7;
      const want = claim === fall ? `Tom is correct: the fall is ${fall}%` : `Tom is wrong: the fall is ${fall}%`;
      expect(e, where).toBe(want);
      // no other option states the true fall with the right verdict
      const sameVerdict = (o: string) => o.startsWith(claim === fall ? "Tom is correct" : "Tom is wrong") && o.endsWith(` ${fall}%`);
      expect(opts!.filter(sameVerdict), where).toEqual([e]);
    }));
  it("misleading-axis-01", () =>
    run("u15-misleading-axis-01", (p, e) => {
      const [S, a, b] = numsIn(p.replace(/not 0/, ""));
      expect((b - S) / (a - S)).toBe(e);
      expect(Number.isInteger(Number(e))).toBe(true);
    }));
  it("combined-mean-01", () =>
    run("u15-combined-mean-01", (p, e) => {
      const m = /mean of (\d+) [a-z ]+ a day over (\d+) days, then a mean of (\d+) a day over the next (\d+) days/.exec(p)!;
      const [m1, n1, m2, n2] = m.slice(1).map(Number);
      expect(m1).toBeGreaterThan(0);
      expect(m2).toBeGreaterThan(0);
      expect(near((m1 * n1 + m2 * n2) / (n1 + n2), e)).toBe(true);
    }));
  it("outlier-01", () =>
    run("u15-outlier-01", (p, e) => {
      const [mean6, bad] = numsIn(p.replace(/six/, ""));
      expect((6 * mean6 - bad) / 5).toBe(e);
    }));
  it("two-stat-01: exactly one statement fits the data", () =>
    run("u15-two-stat-01", (p, e, opts, where) => {
      const A = after(p, "Site A:").slice(0, 5);
      const B = after(p, "Site B:").slice(0, 5);
      const useMedian = opts![0].includes("median");
      const hi = (useMedian ? med(A) > med(B) : sum(A) > sum(B)) ? "A" : "B";
      const lg = rng(A) > rng(B) ? "A" : "B";
      const fits = (o: string) => o.endsWith(`Larger range: ${lg}`) && o.includes(`Higher ${useMedian ? "median" : "mean"}: ${hi}.`);
      expect(opts!.filter(fits), where).toEqual([e]);
    }));
  it("predict-01", () =>
    run("u15-predict-01", (p, e) => {
      const [N, k, M] = numsIn(p);
      expect(near(((N - k) / N) * M, e)).toBe(true);
    }));
});
