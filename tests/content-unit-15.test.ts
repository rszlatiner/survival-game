import { describe, it, expect } from "vitest";
import { UNIT_15 } from "@/content/units/unit-15";
import { bankChecks, overlapChecks, coordinateChecks, eachQuestion, numsIn } from "./helpers/bank";
import { rankChecks, valueRankChecks } from "./helpers/rank";
import { coordRankChecks } from "./helpers/rank2";

bankChecks(15, UNIT_15);
overlapChecks(UNIT_15);
coordinateChecks(UNIT_15);
rankChecks(UNIT_15);
valueRankChecks(UNIT_15);
coordRankChecks(UNIT_15, ["u15-percent-claim-01", "u15-trend-choice-01", "u15-conclusion-01", "u15-consistency-01"]);

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
  it("yes-percent-01", () => run("u15-yes-percent-01", (p, e) => { const [N, k] = numsIn(p); expect(near((k / N) * 100, e)).toBe(true); }));
  it("sample-choice-01: only the random draw is unbiased, all options in one form", () =>
    run("u15-sample-choice-01", (_p, e, opts) => {
      expect(opts!.filter((o) => /random/.test(o))).toEqual([e]);
      for (const o of opts!) expect(o).toMatch(/^The \d+ (palms|tallest palms)/);
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
  it("correlation-01: the key matches the sign of the sloped data, or neither", () =>
    run("u15-correlation-01", (p, e) => {
      const x = after(p, "Sun:");
      const y = after(p, "Height:");
      const mx = sum(x) / 5;
      const my = sum(y) / 5;
      const cov = sum(x.map((v, i) => (v - mx) * (y[i] - my)));
      const mono = (a: number[], dir: number) => a.every((v, i) => i === 0 || (v - a[i - 1]) * dir > 0);
      const r = cov / Math.sqrt(sum(x.map((v) => (v - mx) ** 2)) * sum(y.map((v) => (v - my) ** 2)));
      if (cov > 0) { expect(r).toBeGreaterThan(0.9); expect(e).toBe("Positive correlation"); }
      else if (cov < 0) { expect(r).toBeLessThan(-0.9); expect(e).toBe("Negative correlation"); }
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
  it("stem-leaf-read-01", () =>
    run("u15-stem-leaf-read-01", (p, e) => {
      const T = Number(/more than (\d+)\?/.exec(p)![1]);
      const rows = [...p.matchAll(/(\d) \| (\d+)/g)].filter((m) => !p.includes("key 2 | 3 means 23") || m.index! > p.indexOf("means 23)"));
      const vals = rows.flatMap((m) => m[2].split("").map((l) => Number(m[1]) * 10 + Number(l)));
      expect(vals.filter((v) => v > T).length).toBe(e);
      expect(Number(e)).toBeGreaterThan(0);
    }));
  it("two-way-read-01", () =>
    run("u15-two-way-read-01", (p, e) => {
      const [a, b, c, d] = numsIn(p.split("table.")[1].split("How many")[0]);
      const q = p.split("How many ")[1];
      const want = q.startsWith("children") ? b + d : q.startsWith("adults") ? a + c : q.includes("fishing") ? a + b : c + d;
      expect(Number(e)).toBe(want);
    }));
  it("timeseries-read-01", () =>
    run("u15-timeseries-read-01", (p, e) => {
      const v = numsIn(p.split("was ")[1].split(". In")[0]);
      expect(new Set(v).size).toBe(6);
      const hi = p.includes("highest");
      expect(v.indexOf(hi ? Math.max(...v) : Math.min(...v)) + 1).toBe(e);
    }));
  it("backtoback-01", () =>
    run("u15-backtoback-01", (p, e) => {
      const rows = [...p.matchAll(/(\d) \| A: ([\d-]+) \| B: ([\d-]+)/g)];
      const val = (g: 2 | 3) => rows.flatMap((m) => (m[g] === "-" ? [] : m[g].split("").map((l) => Number(m[1]) * 10 + Number(l)))).sort((x, y) => x - y);
      const A = val(2), B = val(3);
      expect(A).toHaveLength(5);
      expect(B).toHaveLength(5);
      expect(Math.abs(A[2] - B[2])).toBe(e);
      expect(Number(e)).toBeGreaterThan(0);
    }));
  it("trend-choice-01: exactly one option has the true peak quarter and total direction", () =>
    run("u15-trend-choice-01", (p, e, opts, where) => {
      const y1 = after(p, "Year 1:").slice(0, 4);
      const y2 = after(p, "Year 2:").slice(0, 4);
      const peak1 = y1.indexOf(Math.max(...y1)) + 1;
      const peak2 = y2.indexOf(Math.max(...y2)) + 1;
      expect(peak1).toBe(peak2);
      const dir = sum(y2) > sum(y1) ? "higher" : "lower";
      expect(opts!.filter((o) => o === `Peak: quarter ${peak1}; year 2 total ${dir}`), where).toEqual([e]);
    }));
  it("twoway-percent-01", () =>
    run("u15-twoway-percent-01", (p, e) => {
      const m = /Fishing: (\d+) adults, \d+ children\. Building: (\d+) adults/.exec(p)!;
      expect(near((100 * Number(m[1])) / (Number(m[1]) + Number(m[2])), e)).toBe(true);
    }));
  it("pictogram-area-01", () =>
    run("u15-pictogram-area-01", (p, e) => {
      const m = /compares (\d+) [a-z ]+ on Monday with (\d+) on Tuesday/.exec(p)!;
      const k = Number(m[2]) / Number(m[1]);
      expect(Number.isInteger(k)).toBe(true);
      expect(Number(e)).toBe(k * k);
    }));
  it("conclusion-01: only the key is true of the data", () =>
    run("u15-conclusion-01", (p, e, opts, where) => {
      const v = numsIn(p.split("was ")[1].split(". Which")[0]);
      const steps = [v[1] - v[0], v[2] - v[1], v[3] - v[2]];
      const t = (o: string) =>
        o === "Rose every week" ? steps.every((x) => x > 0)
        : o === "Fell every week" ? steps.every((x) => x < 0)
        : o === "Rose by the same amount each week" ? steps.every((x) => x === steps[0])
        : o === "Highest in week 1" ? v[0] === Math.max(...v)
        : o === "Highest in week 2" ? v[1] === Math.max(...v)
        : o === "Highest in week 4" ? v[3] === Math.max(...v)
        : o === "Lowest in week 4" ? v[3] === Math.min(...v)
        : o === "Lowest in week 2" ? v[1] === Math.min(...v)
        : o === "At least doubled by week 4" ? v[3] >= 2 * v[0]
        : 2 * v[3] <= v[0];
      expect(opts!.filter(t), where).toEqual([e]);
    }));
  it("percent-claim-01: key is the actual fall, Tom's figure is wrong, all options are round percentages up to 100", () =>
    run("u15-percent-claim-01", (p, e, opts, where) => {
      const m = /fell from (\d+) to (\d+)\. Tom says the percentage fall is (\d+)%/.exec(p)!;
      const [O, N, tom] = [Number(m[1]), Number(m[2]), Number(m[3])];
      const fall = Math.round(((O - N) / O) * 1e7) / 1e5;
      expect(e, where).toBe(`${fall}%`);
      expect(tom, where).not.toBe(fall);
      for (const o of opts!) {
        const v = Number(o.replace("%", ""));
        expect(Number.isInteger(v) && v >= 5 && v <= 100, `${where} ${o}`).toBe(true);
      }
      expect(opts).toContain(`${tom}%`);
    }));
  it("misleading-axis-01", () =>
    run("u15-misleading-axis-01", (p, e) => {
      const [S, a, b] = numsIn(p.replace(/not 0/, ""));
      expect((b - S) / (a - S)).toBe(e);
      expect(Number.isInteger(Number(e))).toBe(true);
    }));
  it("outlier-01", () =>
    run("u15-outlier-01", (p, e) => {
      const [mean6, bad] = numsIn(p.replace(/six weighings/, ""));
      expect((6 * mean6 - bad) / 5).toBe(e);
    }));
  it("two-stat-01: the midrange order is opposite to the stat order in about half the seeds", () => {
    let flips = 0, n = 0;
    run("u15-two-stat-01", (p, e) => {
      const A = after(p, "Site A:").slice(0, 5);
      const B = after(p, "Site B:").slice(0, 5);
      const useMedian = String(e).includes("median");
      const d = useMedian ? med(A) - med(B) : sum(A) - sum(B);
      const midd = Math.max(...A) + Math.min(...A) - Math.max(...B) - Math.min(...B);
      n++;
      if (Math.sign(d) !== Math.sign(midd)) flips++;
    });
    expect(flips / n).toBeGreaterThan(0.4);
    expect(flips / n).toBeLessThan(0.6);
  });
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
});
