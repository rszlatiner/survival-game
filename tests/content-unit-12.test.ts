import { describe, it, expect } from "vitest";
import { UNIT_12 } from "@/content/units/unit-12";
import { generateQuestion } from "@/lib/questions/generate";
import { bankChecks, overlapChecks, coordinateChecks, eachQuestion, numsIn } from "./helpers/bank";

bankChecks(12, UNIT_12);
overlapChecks(UNIT_12);
coordinateChecks(UNIT_12);

const get = (id: string) => UNIT_12.find((t) => t.id === id)!;
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe("unit 12 independent recompute", () => {
  const run = (id: string, check: (prompt: string, expected: number | string, options: string[] | undefined, where: string) => void) =>
    eachQuestion(get(id), ({ publicQ, expected }, where) => check(publicQ.prompt, expected, publicQ.options, where));

  it("simple-prob-01", () =>
    run("u12-simple-prob-01", (p, e) => {
      const [N, r] = numsIn(p);
      expect(near(r / N, Number(e))).toBe(true);
    }));
  it("complement-01", () =>
    run("u12-complement-01", (p, e) => {
      const q = Number(/chance of a storm tomorrow is (0\.\d+)\./.exec(p)![1]);
      expect(near(1 - q, Number(e))).toBe(true);
    }));
  it("chance-words-01: the word matches the share of red counters", () =>
    run("u12-chance-words-01", (p, e) => {
      const m = /holds (?:no|(\d+)) red counters and (?:no|(\d+)) blue counters/.exec(p)!;
      const red = Number(m[1] ?? 0);
      const blue = Number(m[2] ?? 0);
      const share = red / (red + blue);
      const word = red === 0 ? "Impossible" : blue === 0 ? "Certain" : share === 0.5 ? "Even chance" : share < 0.5 ? "Unlikely" : "Likely";
      expect(word).toBe(e);
      // "unlikely" and "likely" are never borderline
      if (word === "Unlikely") expect(share).toBeLessThanOrEqual(0.2);
      if (word === "Likely") expect(share).toBeGreaterThanOrEqual(0.7);
    }));
  it("fraction-choice-01: exactly one option equals blue/total, in simplest form", () =>
    run("u12-fraction-choice-01", (p, e, opts, where) => {
      const [r, b, g] = numsIn(p).slice(0, 3);
      const N = r + b + g;
      const value = (o: string) => {
        const [n, d] = o.split("/").map(Number);
        return { n, d, simplest: gcd(n, d) === 1 };
      };
      const hits = opts!.filter((o) => {
        const v = value(o);
        return v.n * N === b * v.d;
      });
      expect(hits, where).toEqual([e]);
      for (const o of opts!) expect(value(o).simplest, `${where} ${o}`).toBe(true);
    }));
  it("die-01", () =>
    run("u12-die-01", (p, e) => {
      const m = /number (less|greater) than (\d+)\?/.exec(p)!;
      const k = Number(m[2]);
      let c = 0;
      for (let v = 1; v <= 10; v++) if (m[1] === "less" ? v < k : v > k) c++;
      expect(near(c / 10, Number(e))).toBe(true);
    }));
  it("relative-freq-01", () =>
    run("u12-relative-freq-01", (p, e) => {
      const [n, h] = numsIn(p);
      expect(near(h / n, Number(e))).toBe(true);
    }));
  it("outcomes-02: lists every pair", () =>
    run("u12-outcomes-02", (p, e) => {
      const [a, b] = numsIn(p).filter((_, i) => i === 1 || i === 3);
      let c = 0;
      for (let i = 1; i <= a; i++) for (let j = 1; j <= b; j++) c++;
      expect(c).toBe(e);
    }));
  it("expected-02", () =>
    run("u12-expected-02", (p, e) => {
      const m = /is (\d+)\/(\d+)\. Over (\d+) nights/.exec(p)!;
      expect(gcd(Number(m[1]), Number(m[2]))).toBe(1);
      expect((Number(m[1]) * Number(m[3])) / Number(m[2])).toBe(e);
    }));
  it("missing-prob-02", () =>
    run("u12-missing-prob-02", (p, e) => {
      const [a, b, c] = /is (0\.\d+), blue is (0\.\d+) and green is (0\.\d+)\./.exec(p)!.slice(1).map(Number);
      expect(a + b + c).toBeLessThan(1);
      expect(near(1 - a - b - c, Number(e))).toBe(true);
    }));
  it("total-from-prob-02", () =>
    run("u12-total-from-prob-02", (p, e) => {
      const m = /is (\d+)\/(\d+), and there are (\d+) white/.exec(p)!;
      const [a, b, whites] = m.slice(1).map(Number);
      expect(Number(e) * a).toBe(whites * b);
      expect(whites).toBeLessThan(Number(e));
    }));
  it("dice-sum-02: counts the pairs by brute force", () =>
    run("u12-dice-sum-02", (p, e) => {
      const s = Number(/total of (\d+)\?/.exec(p)![1]);
      let c = 0;
      for (let r = 1; r <= 6; r++) for (let b = 1; b <= 6; b++) if (r + b === s) c++;
      expect(c).toBe(e);
    }));
  it("predict-02", () =>
    run("u12-predict-02", (p, e) => {
      const [n, h, big] = numsIn(p);
      expect((h / n) * big).toBeCloseTo(Number(e), 9);
    }));
  it("compare-02: cross-multiplication picks the key", () =>
    run("u12-compare-02", (p, e) => {
      const [ra, na, rb, nb] = numsIn(p.replace(/bag [AB]/g, "")).slice(0, 4);
      const a = ra / na;
      const b = rb / nb;
      expect(e).toBe(near(a, b) ? "Both the same" : a > b ? "Bag A" : "Bag B");
    }));
  it("compare-02: the better bag has the fewer reds on some seeds and the more reds on others", () => {
    const sawMore = new Set<string>();
    eachQuestion(get("u12-compare-02"), ({ publicQ, expected }) => {
      const [ra, , rb] = numsIn(publicQ.prompt.replace(/bag [AB]/g, ""));
      if (expected === "Bag A" || expected === "Bag B") sawMore.add((expected === "Bag A") === ra > rb ? "more-reds" : "fewer-reds");
    });
    expect([...sawMore].sort()).toEqual(["fewer-reds", "more-reds"]);
  });
  it("fair-check-02", () =>
    run("u12-fair-check-02", (p, e) => {
      const m = /die (\d+) times and get a six (\d+) times/.exec(p)!;
      expect(Number(m[2]) - Number(m[1]) / 6).toBe(e);
    }));
  it("overlap-03: inclusion-exclusion", () =>
    run("u12-overlap-03", (p, e) => {
      const [N, f, g, b] = numsIn(p).slice(0, 4);
      const neither = N - (f + g - b);
      expect(neither).toBeGreaterThan(0);
      expect(near(neither / N, Number(e))).toBe(true);
    }));
  it("claim-03: only the right verdict with the right total is the key", () =>
    run("u12-claim-03", (p, e, opts, where) => {
      const [a, b, c] = /probabilities (0\.\d+) for red, (0\.\d+) for blue and (0\.\d+) for green/.exec(p)!.slice(1).map(Number);
      const total = (Math.round((a + b + c) * 100) / 100).toFixed(2);
      const verdict = total === "1.00" ? "Possible" : "Not possible";
      const good = opts!.filter((o) => o === `${verdict}, the total is ${total}`);
      expect(good, where).toEqual([e]);
      expect(new Set(opts!.map((o) => o.split(", ")[0])).size).toBe(2);
    }));
  it("expected-either-03", () =>
    run("u12-expected-either-03", (p, e) => {
      const [a, b, n] = /probability (0\.\d+) and on blue with probability (0\.\d+)\. You spin it (\d+) times/.exec(p)!.slice(1).map(Number);
      expect(near(n * (a + b), Number(e))).toBe(true);
    }));
  it("add-red-03: after adding, the red share is the target", () =>
    run("u12-add-red-03", (p, e) => {
      const m = /has (\d+) red and (\d+) blue counters\..*? is (\d+)\/(\d+)\?/.exec(p)!;
      const [r, b, pn, qd] = m.slice(1).map(Number);
      const x = Number(e);
      expect((r + x) * qd).toBe(pn * (r + x + b));
      expect((r + x - 1) * qd).not.toBe(pn * (r + x - 1 + b));
    }));
  it("two-spinners-03: brute force over all 25 pairs", () =>
    run("u12-two-spinners-03", (p, e) => {
      const k = Number(/more than (\d+)\?/.exec(p)![1]);
      let c = 0;
      for (let a = 1; a <= 5; a++) for (let b = 1; b <= 5; b++) if (a + b > k) c++;
      expect(near(c / 25, Number(e))).toBe(true);
    }));
  it("combine-bags-03: pooled share over unequal bags", () =>
    run("u12-combine-bags-03", (p, e) => {
      const m = /holds (\d+) counters and (\d+) are red\. Bag B holds (\d+) counters and (\d+) are red/.exec(p)!;
      const [na, ra, nb, rb] = m.slice(1).map(Number);
      expect(near((ra + rb) / (na + nb), Number(e))).toBe(true);
      expect([20, 25, 50]).toContain(na + nb);
      expect(na).not.toBe(nb);
    }));
});

describe("unit 12 prompts read well in every zone", () => {
  it("no doubled nouns, bad articles or stray 1-plurals", () => {
    for (const t of UNIT_12)
      eachQuestion(t, ({ publicQ }, where) => {
        expect(publicQ.prompt, where).not.toMatch(/\b(\w+) \1\b/i);
        expect(publicQ.prompt, where).not.toMatch(/\b1 (shells|counters|seeds|nights|hours)\b/);
        expect(publicQ.prompt, where).not.toMatch(/\ba [aeiou]/i);
      });
  });
  it("decimal-answer prompts ask for a decimal", () => {
    for (const t of UNIT_12.filter((x) => x.format.kind === "decimal"))
      eachQuestion(t, ({ publicQ }, where) => expect(publicQ.prompt, where).toContain("Give a decimal"), ["1", "2", "3"]);
  });
  it("different seeds change numbers inside the prompt, not only the options", () => {
    for (const t of UNIT_12) {
      const prompts = new Set(Array.from({ length: 40 }, (_, i) => generateQuestion(t, "beach", String(i + 1)).publicQ.prompt));
      expect(prompts.size, t.id).toBeGreaterThanOrEqual(6);
    }
  });
});
