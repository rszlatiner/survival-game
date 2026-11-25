import { describe, it, expect } from "vitest";
import { UNIT_09 } from "@/content/units/unit-09";
import { isCorrect } from "@/lib/answers";
import { evalExpr, parseExpr } from "@/lib/mathexpr";
import { generateQuestion } from "@/lib/questions/generate";
import { coordRankChecks } from "./helpers/rank2";
import { bankChecks, overlapChecks, coordinateChecks, eachQuestion, numsIn } from "./helpers/bank";

bankChecks(9, UNIT_09);
overlapChecks(UNIT_09);
coordinateChecks(UNIT_09);
coordRankChecks(UNIT_09, ["u09-term-rule-01", "u09-member-03", "u09-constant-step-02"]);

const get = (id: string) => UNIT_09.find((t) => t.id === id)!;

/** Value of a typed expression in one letter, using the app's own parser. */
function at(expr: string, letter: string, v: number): number {
  const e = parseExpr(expr);
  expect(e, expr).not.toBeNull();
  return evalExpr(e!, { [letter]: v }) as number;
}

describe("unit 9 independent recompute", () => {
  const run = (id: string, check: (prompt: string, expected: number | string, options: string[] | undefined, where: string) => void) =>
    eachQuestion(get(id), ({ publicQ, expected }, where) => check(publicQ.prompt, expected, publicQ.options, where));
  const format = (id: string) => get(id).format;

  it("next-term-01: the four terms have a constant gap and the answer extends them", () =>
    run("u09-next-term-01", (p, e) => {
      const [a, b, c, d] = numsIn(p.split("How many")[0]).slice(0, 4);
      expect(b - a).toBe(c - b);
      expect(d - c).toBe(b - a);
      expect(Number(e)).toBe(d + (b - a));
    }));
  it("decreasing-01", () =>
    run("u09-decreasing-01", (p, e) => {
      const [a, b, c, d] = numsIn(p).slice(0, 4);
      expect(a - b).toBe(b - c);
      expect(b - c).toBe(c - d);
      expect(Number(e)).toBe(d - (a - b));
      expect(Number(e)).toBeGreaterThan(0);
    }));
  it("term-rule-01: exactly one rule fits all three gaps", () =>
    run("u09-term-rule-01", (p, e, opts, where) => {
      const t = numsIn(p.split("What is")[0]).slice(0, 4);
      const fits = (o: string) => {
        const m = /^(Add|Subtract|Multiply by|Divide by) (\d+)$/.exec(o)!;
        const k = Number(m[2]);
        const f = m[1] === "Add" ? (x: number) => x + k : m[1] === "Subtract" ? (x: number) => x - k : m[1] === "Divide by" ? (x: number) => x / k : (x: number) => x * k;
        return [0, 1, 2].every((i) => f(t[i]) === t[i + 1]);
      };
      expect(opts!.filter(fits), where).toEqual([e]);
    }));
  it("nth-term-gen-01", () =>
    run("u09-nth-term-gen-01", (p, e) => {
      const m = /is (\d+)n \+ (\d+)\. How many .*?section (\d+)\?/.exec(p)!;
      expect(Number(m[1]) * Number(m[3]) + Number(m[2])).toBe(e);
    }));
  it("machine-01", () =>
    run("u09-machine-01", (p, e) => {
      const [a, b, x] = numsIn(p);
      expect((x * a) + b).toBe(e);
    }));
  it("multiples-nth-01: the expression gives each listed term, a nearby one does not", () =>
    run("u09-multiples-nth-01", (p, e) => {
      const t = numsIn(p.split("Write")[0]);
      [1, 2, 3, 4].forEach((n, i) => expect(at(String(e), "n", n)).toBe(t[i]));
      expect(isCorrect(`${t[0] + 1}n`, e, format("u09-multiples-nth-01"))).toBe(false);
      expect(isCorrect(`n+${t[0] - 1}`, e, format("u09-multiples-nth-01"))).toBe(false);
    }));
  it("nth-term-find-02: matches all four terms; common wrong answers are rejected", () =>
    run("u09-nth-term-find-02", (p, e) => {
      const t = numsIn(p.split("Write")[0]).slice(0, 4);
      [1, 2, 3, 4].forEach((n, i) => expect(at(String(e), "n", n)).toBe(t[i]));
      const d = t[1] - t[0];
      expect(isCorrect(`${d}n`, e, format("u09-nth-term-find-02"))).toBe(false);
      expect(isCorrect(`n+${d}`, e, format("u09-nth-term-find-02"))).toBe(false);
      expect(isCorrect(`${d}n+${t[0]}`, e, format("u09-nth-term-find-02"))).toBe(false);
    }));
  it("nth-term-down-02", () =>
    run("u09-nth-term-down-02", (p, e) => {
      const t = numsIn(p.split("in weeks")[0]).slice(0, 4);
      [1, 2, 3, 4].forEach((n, i) => expect(at(String(e), "n", n)).toBe(t[i]));
      expect(t[3]).toBeGreaterThan(0);
      const d = t[0] - t[1];
      expect(isCorrect(`${d}n+${t[0]}`, e, format("u09-nth-term-down-02"))).toBe(false);
    }));
  it("position-02", () =>
    run("u09-position-02", (p, e) => {
      const m = /is (\d+)n \+ (\d+)\. .*?exactly (\d+)/.exec(p)!;
      expect(Number(m[1]) * Number(e) + Number(m[2])).toBe(Number(m[3]));
    }));
  it("inverse-machine-02", () =>
    run("u09-inverse-machine-02", (p, e) => {
      const [a, b, out] = numsIn(p);
      expect(Number(e) * a + b).toBe(out);
    }));
  it("table-rule-02: the rule reproduces the table", () =>
    run("u09-table-rule-02", (p, e) => {
      const t = numsIn(p.split("Write")[0].split("y is")[1]);
      [1, 2, 3, 4].forEach((x, i) => expect(at(String(e), "x", x)).toBe(t[i]));
    }));
  it("huts-02", () =>
    run("u09-huts-02", (p, e) => {
      const [first, extra, huts] = numsIn(p);
      expect(first + extra * (huts - 1)).toBe(e);
    }));
  it("sum-rule-02", () =>
    run("u09-sum-rule-02", (p, e) => {
      const m = /gather (\d+) .*? on day 1 and (\d+) on day 2/.exec(p)!;
      const t = [Number(m[1]), Number(m[2])];
      for (let i = 2; i < 6; i++) t.push(t[i - 1] + t[i - 2]);
      expect(t[5]).toBe(e);
    }));
  it("constant-step-02: exactly one plan has a constant gap", () =>
    run("u09-constant-step-02", (p, e, opts, where) => {
      const m = /give (\d+) on day 1 and (\d+) on day 2/.exec(p)!;
      const [a, a2] = [Number(m[1]), Number(m[2])];
      const constant = opts!.filter((o) => {
        const t = o.split(", ").map(Number);
        expect([t[0], t[1]], where).toEqual([a, a2]);
        return t.length === 4 && t[1] - t[0] === t[2] - t[1] && t[3] - t[2] === t[2] - t[1];
      });
      expect(constant, where).toEqual([e]);
    }));
  it("first-exceed-03: the day is the first one over the target", () =>
    run("u09-first-exceed-03", (p, e) => {
      const m = /is (\d+)n \+ (\d+)\. .*?more than (\d+)/.exec(p)!;
      const f = (n: number) => Number(m[1]) * n + Number(m[2]);
      const T = Number(m[3]);
      expect(f(Number(e))).toBeGreaterThan(T);
      expect(f(Number(e) - 1)).toBeLessThanOrEqual(T);
    }));
  it("member-03: exactly one option is of the form dn + c", () =>
    run("u09-member-03", (p, e, opts, where) => {
      const m = /is (\d+)n \+ (\d+)\./.exec(p)!;
      const d = Number(m[1]);
      const c = Number(m[2]);
      const isTerm = (o: string) => Number(o) > c && (Number(o) - c) % d === 0;
      expect(opts!.filter(isTerm), where).toEqual([e]);
    }));
  it("two-plans-03: both plans agree on the answer day and not on a neighbouring day", () =>
    run("u09-two-plans-03", (p, e, _o, where) => {
      const m = /has collected (\d*)n \+ (\d+) .*?Team B has collected (\d*)n \+ (\d+) /.exec(p)!;
      const A = (n: number) => (m[1] === "" ? 1 : Number(m[1])) * n + Number(m[2]);
      const B = (n: number) => (m[3] === "" ? 1 : Number(m[3])) * n + Number(m[4]);
      const n = Number(e);
      expect(A(n), where).toBe(B(n));
      expect(A(n + 1), where).not.toBe(B(n + 1));
    }));
  it("reverse-nth-03: matches both given days; the two-term shortcut is rejected", () =>
    run("u09-reverse-nth-03", (p, e) => {
      const m = /Day (\d+) has (\d+) litres and day (\d+) has (\d+) litres/.exec(p)!;
      expect(at(String(e), "n", Number(m[1]))).toBe(Number(m[2]));
      expect(at(String(e), "n", Number(m[3]))).toBe(Number(m[4]));
      const d = (Number(m[4]) - Number(m[2])) / (Number(m[3]) - Number(m[1]));
      expect(isCorrect(`${d}n`, e, format("u09-reverse-nth-03"))).toBe(false);
    }));
  it("square-nth-03", () =>
    run("u09-square-nth-03", (p, e) => {
      const t = numsIn(p.split("The gaps")[0]).slice(0, 4);
      [1, 2, 3, 4].forEach((n, i) => expect(at(String(e), "n", n)).toBe(t[i]));
      const d = t[1] - t[0];
      expect(isCorrect(`${d}n+${t[0] - d}`, e, format("u09-square-nth-03"))).toBe(false);
      expect(isCorrect(`n^2+${t[0] - 1}`, e, format("u09-square-nth-03"))).toBe(t[1] - t[0] === 3);
    }));
  it("chain-machine-03: running the answer forwards gives the output", () =>
    run("u09-chain-machine-03", (p, e) => {
      const [a, b, c, s, out] = numsIn(p);
      expect(c * (a * Number(e) + b) - s).toBe(out);
    }));
});

describe("unit 9 keys are not guessable", () => {
  it("term-rule-01: all three rule kinds are keys, and the key's number is not in every wrong option", () => {
    const kinds = new Map<string, number>();
    let repeatsAll = 0;
    let n = 0;
    eachQuestion(get("u09-term-rule-01"), ({ publicQ, expected }) => {
      const key = String(expected);
      kinds.set(key.split(" ")[0], (kinds.get(key.split(" ")[0]) ?? 0) + 1);
      const num = numsIn(key)[0];
      n++;
      if (publicQ.options!.filter((o) => o !== key).every((o) => numsIn(o)[0] === num)) repeatsAll++;
    });
    expect([...kinds.keys()].sort()).toEqual(["Add", "Multiply", "Subtract"]);
    expect((kinds.get("Subtract") ?? 0) / n).toBeGreaterThan(0.4);
    expect(repeatsAll / n).toBeLessThan(0.05);
  });
  it("member-03: never both neighbours of the key, and the key's rank varies", () => {
    const ranks = new Set<number>();
    eachQuestion(get("u09-member-03"), ({ publicQ, expected }, where) => {
      const vals = publicQ.options!.map(Number);
      const key = Number(expected);
      expect(vals.includes(key - 1) && vals.includes(key + 1), where).toBe(false);
      ranks.add([...vals].sort((a, b) => a - b).indexOf(key));
    });
    expect(ranks.size).toBeGreaterThanOrEqual(3);
  });
});

describe("unit 9 prompts read well in every zone", () => {
  it("no doubled nouns, bad articles or stray 1-plurals", () => {
    for (const t of UNIT_09)
      eachQuestion(t, ({ publicQ }, where) => {
        expect(publicQ.prompt, where).not.toMatch(/\b(\w+) \1\b/i);
        expect(publicQ.prompt, where).not.toMatch(/\b1 (hours|litres|days|planks|logs|mangoes)\b/);
        expect(publicQ.prompt, where).not.toMatch(/\ba [aeiou]/i);
      });
  });
  it("expression templates ask for the same letter the answer uses", () => {
    for (const t of UNIT_09.filter((x) => x.format.kind === "expression"))
      eachQuestion(t, ({ publicQ, expected }, where) => {
        const letter = /[a-z]/.exec(String(expected))![0];
        expect(publicQ.prompt, where).toContain(letter === "n" ? "in terms of n" : "in x");
      });
  });
  it("different seeds change numbers inside the prompt, not only the options", () => {
    for (const t of UNIT_09) {
      const prompts = new Set(Array.from({ length: 40 }, (_, i) => generateQuestion(t, "beach", String(i + 1)).publicQ.prompt));
      expect(prompts.size, t.id).toBeGreaterThanOrEqual(6);
    }
  });
});
