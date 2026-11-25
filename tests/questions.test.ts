import { describe, it, expect } from "vitest";
import { isCorrect, parseNumeric } from "@/lib/answers";
import { parseExpr } from "@/lib/mathexpr";
import { ZONE_IDS, RESOURCES, type QuestionTemplate, type Difficulty } from "@/lib/questions/types";
import { generateQuestion, pickTemplates } from "@/lib/questions/generate";
import { unitReadiness } from "@/lib/questions/ready";
import { ALL_TEMPLATES } from "@/content/units";
import { UNIT_11 } from "@/content/units/unit-11";

const SEEDS = Array.from({ length: 20 }, (_, i) => String(i + 1));

function allKeys(v: unknown, out: string[] = []): string[] {
  if (Array.isArray(v)) v.forEach((x) => allKeys(x, out));
  else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) {
      out.push(k);
      allKeys(x, out);
    }
  }
  return out;
}

function decimalsOf(t: QuestionTemplate): number {
  if (t.format.kind === "decimal") return t.format.places;
  return 0;
}

describe("unit 11 bank", () => {
  it("has about 20 templates with unique ids, all tagged unit 11", () => {
    expect(UNIT_11.length).toBeGreaterThanOrEqual(18);
    const ids = new Set(UNIT_11.map((t) => t.id));
    expect(ids.size).toBe(UNIT_11.length);
    for (const t of UNIT_11) {
      expect(t.unit).toBe(11);
      expect(t.id).toMatch(/^u11-[a-z0-9-]+-\d{2}$/);
    }
  });

  it("spreads difficulty at least 6/8/6 and covers every resource", () => {
    const per = { 1: 0, 2: 0, 3: 0 } as Record<Difficulty, number>;
    for (const t of UNIT_11) per[t.difficulty]++;
    expect(per[1]).toBeGreaterThanOrEqual(6);
    expect(per[2]).toBeGreaterThanOrEqual(8);
    expect(per[3]).toBeGreaterThanOrEqual(6);
    for (const r of RESOURCES) {
      expect(UNIT_11.filter((t) => t.resource === r).length).toBeGreaterThanOrEqual(4);
    }
  });

  it("includes some multiple-choice templates", () => {
    expect(UNIT_11.filter((t) => t.format.kind === "choice").length).toBeGreaterThanOrEqual(3);
  });

  it("ALL_TEMPLATES contains the unit 11 bank", () => {
    for (const t of UNIT_11) expect(ALL_TEMPLATES).toContain(t);
  });
});

describe("every template, every zone, seeds 1..20", () => {
  for (const t of ALL_TEMPLATES) {
    it(`${t.id} gives clean, self-consistent questions`, () => {
      for (const zone of ZONE_IDS) {
        for (const seed of SEEDS) {
          const { publicQ, expected, solution } = generateQuestion(t, zone, seed);
          const where = `${t.id} ${zone} seed ${seed}`;

          // Prompt: non-empty and short enough for a phone.
          expect(publicQ.prompt.length, where).toBeGreaterThan(10);
          expect(publicQ.prompt.split(/\s+/).length, where).toBeLessThanOrEqual(45);
          expect(solution.length, where).toBeGreaterThan(10);

          if (t.format.kind === "choice") {
            expect(typeof expected, where).toBe("string");
            expect((expected as string).length, where).toBeGreaterThan(0);
            const opts = publicQ.options!;
            expect(opts, where).toBeDefined();
            expect(opts.length, where).toBeGreaterThanOrEqual(3);
            expect(new Set(opts).size, where).toBe(opts.length);
            expect(opts, where).toContain(expected);
            expect(publicQ.format, where).toEqual({ kind: "choice", options: opts });
            expect(isCorrect(expected as string, expected, publicQ.format), where).toBe(true);
            expect(solution, where).toContain(expected as string);
          } else if (t.format.kind === "expression") {
            expect(typeof expected, where).toBe("string");
            expect(parseExpr(expected as string), where).not.toBeNull();
            expect(isCorrect(expected as string, expected, publicQ.format), where).toBe(true);
            expect(solution, where).toContain(expected as string);
            expect(publicQ.options, where).toBeUndefined();
          } else {
            expect(typeof expected, where).toBe("number");
            const n = expected as number;
            expect(Number.isFinite(n), where).toBe(true);
            expect(n, where).toBeGreaterThan(0);
            const places = decimalsOf(t);
            const scaled = n * 10 ** places;
            // Clean: exactly representable at the stated places, so never a .5 tie.
            expect(Math.abs(scaled - Math.round(scaled)), where).toBeLessThan(1e-6);
            expect(places, where).toBeLessThanOrEqual(2);
            if (t.format.kind === "integer") expect(Number.isInteger(n), where).toBe(true);
            const typed = String(n);
            expect(parseNumeric(typed, t.format), where).not.toBeNull();
            expect(isCorrect(typed, n, t.format), where).toBe(true);
            expect(solution, where).toContain(typed);
          }
        }
      }
    });
  }
});

describe("u11-inverse-choice-01 cannot be guessed from 'more people, less time'", () => {
  it("has two or more options below the original time, and the correct one is not always the smallest", () => {
    const t = UNIT_11.find((x) => x.id === "u11-inverse-choice-01")!;
    const ranks = new Set<number>();
    for (const zone of ZONE_IDS) {
      for (let s = 1; s <= 200; s++) {
        const { publicQ, expected } = generateQuestion(t, zone, String(s));
        const where = `${zone} seed ${s}`;
        const opts = publicQ.options!;
        expect(opts, where).toHaveLength(4);
        expect(new Set(opts).size, where).toBe(4);
        expect(opts.filter((o) => o === expected).length, where).toBe(1);
        const original = Number(/take (\d+) days/.exec(publicQ.prompt)![1]);
        const nums = opts.map((o) => Number(/^(\d+) days$/.exec(o)![1]));
        expect(nums.filter((n) => n < original).length, where).toBeGreaterThanOrEqual(2);
        const sorted = [...nums].sort((a, b) => a - b);
        ranks.add(sorted.indexOf(Number(/^(\d+)/.exec(expected as string)![1])));
      }
    }
    expect(ranks.has(0) && ranks.size >= 2).toBe(true);
    expect([...ranks].some((r) => r > 0)).toBe(true);
  });
});

describe("generateQuestion", () => {
  it("is deterministic for (template, zone, seed)", () => {
    for (const t of ALL_TEMPLATES) {
      const a = generateQuestion(t, "cave", "team1:r3");
      const b = generateQuestion(t, "cave", "team1:r3");
      expect(a).toEqual(b);
    }
  });

  it("different seeds give different prompts for at least 90% of templates", () => {
    const differ = ALL_TEMPLATES.filter(
      (t) => generateQuestion(t, "beach", "a").publicQ.prompt !== generateQuestion(t, "beach", "b").publicQ.prompt,
    ).length;
    expect(differ / ALL_TEMPLATES.length).toBeGreaterThanOrEqual(0.9);
  });

  it("zone changes the wording but never the maths", () => {
    for (const t of ALL_TEMPLATES) {
      const qs = ZONE_IDS.map((z) => generateQuestion(t, z, "same-seed"));
      expect(new Set(qs.map((q) => q.publicQ.prompt)).size, t.id).toBe(ZONE_IDS.length);
      for (const q of qs) expect(q.expected, t.id).toEqual(qs[0].expected);
    }
  });

  it("publicQ carries no answer fields (deep key scan) and the right metadata", () => {
    for (const t of ALL_TEMPLATES) {
      for (const seed of ["a", "b", "c"]) {
        const { publicQ } = generateQuestion(t, "lagoon", seed);
        const keys = allKeys(publicQ);
        expect(keys).not.toContain("expected");
        expect(keys).not.toContain("solution");
        expect(publicQ.templateId).toBe(t.id);
        expect(publicQ.unit).toBe(t.unit);
        expect(publicQ.difficulty).toBe(t.difficulty);
        expect(publicQ.resource).toBe(t.resource);
        if (t.format.kind !== "choice") {
          expect(publicQ.format).toEqual(t.format);
          expect(publicQ.options).toBeUndefined();
        }
      }
    }
  });
});

function fakeTemplate(unit: number, n: number, difficulty: Difficulty): QuestionTemplate {
  return {
    id: `u${unit}-fake-${String(n).padStart(2, "0")}`,
    unit,
    difficulty,
    resource: "water",
    format: { kind: "integer" },
    params: () => ({ x: 1 }),
    prompt: () => "fake prompt text",
    expected: () => 1,
    solution: () => "fake solution 1",
  };
}

function fakeBank(spec: Record<number, number>): QuestionTemplate[] {
  const out: QuestionTemplate[] = [];
  for (const [unit, count] of Object.entries(spec)) {
    for (let i = 0; i < count; i++) out.push(fakeTemplate(Number(unit), i + 1, ((i % 3) + 1) as Difficulty));
  }
  return out;
}

function nonDecreasing(ds: number[]): boolean {
  return ds.every((d, i) => i === 0 || ds[i - 1] <= d);
}

function thirds(ds: number[]): [number[], number[], number[]] {
  const n = ds.length;
  const a = Math.floor(n / 3);
  const b = Math.ceil((2 * n) / 3);
  return [ds.slice(0, a), ds.slice(a, b), ds.slice(b)];
}

describe("pickTemplates", () => {
  it("pickTemplates([11], 11, 's') returns 11 distinct unit-11 templates, difficulty rising by thirds", () => {
    const picks = pickTemplates([11], 11, "s");
    expect(picks).toHaveLength(11);
    expect(new Set(picks.map((t) => t.id)).size).toBe(11);
    for (const t of picks) expect(t.unit).toBe(11);
    const ds = picks.map((t) => t.difficulty);
    const [first, , last] = thirds(ds);
    expect(Math.max(...first)).toBeLessThanOrEqual(Math.min(...last));
    expect(nonDecreasing(ds)).toBe(true);
    // An 11-question game gets easy questions first and hard ones last.
    expect(first.every((d) => d === 1)).toBe(true);
    expect(last.every((d) => d === 3)).toBe(true);
  });

  it("is deterministic for a seed and varies between seeds", () => {
    const a = pickTemplates([11], 12, "game-1").map((t) => t.id);
    const b = pickTemplates([11], 12, "game-1").map((t) => t.id);
    const c = pickTemplates([11], 12, "game-2").map((t) => t.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("uses every template once before any repeats, then wraps without throwing", () => {
    const n = UNIT_11.length;
    const picks = pickTemplates([11], n, "x");
    expect(new Set(picks.map((t) => t.id)).size).toBe(n);
    const more = pickTemplates([11], n * 2 + 3, "x");
    expect(more).toHaveLength(n * 2 + 3);
    const counts = new Map<string, number>();
    for (const t of more) counts.set(t.id, (counts.get(t.id) ?? 0) + 1);
    expect(counts.size).toBe(n);
    for (const c of counts.values()) expect(c === 2 || c === 3).toBe(true);
    expect(nonDecreasing(more.map((t) => t.difficulty))).toBe(true);
  });

  it("covers every selected unit before any unit repeats (balanced round robin)", () => {
    const bank = fakeBank({ 1: 6, 2: 6, 3: 6, 4: 6 });
    const units = [1, 2, 3, 4];
    for (const count of [4, 5, 8, 10]) {
      const picks = pickTemplates(units, count, "cover", bank);
      expect(picks).toHaveLength(count);
      const perUnit = units.map((u) => picks.filter((t) => t.unit === u).length);
      expect(Math.min(...perUnit)).toBeGreaterThanOrEqual(1);
      expect(Math.max(...perUnit) - Math.min(...perUnit)).toBeLessThanOrEqual(1);
      expect(nonDecreasing(picks.map((t) => t.difficulty))).toBe(true);
    }
    // Fewer picks than units: no unit is picked twice.
    const two = pickTemplates(units, 2, "cover", bank);
    expect(new Set(two.map((t) => t.unit)).size).toBe(2);
  });

  it("wraps a small unit, skips empty units, and returns [] when nothing remains", () => {
    const bank = fakeBank({ 1: 2, 2: 6 });
    const picks = pickTemplates([1, 2, 9], 10, "wrap", bank);
    expect(picks).toHaveLength(10);
    expect(picks.filter((t) => t.unit === 1).length).toBe(5);
    expect(picks.filter((t) => t.unit === 2).length).toBe(5);
    expect(picks.some((t) => t.unit === 9)).toBe(false);
    expect(pickTemplates([9], 5, "none", bank)).toEqual([]);
    expect(pickTemplates([], 5, "none", bank)).toEqual([]);
    expect(pickTemplates([1], 0, "none", bank)).toEqual([]);
  });

  it("ignores duplicate unit ids in the selection", () => {
    const bank = fakeBank({ 1: 6, 2: 6 });
    const picks = pickTemplates([1, 1, 1, 2], 4, "dup", bank);
    expect(picks.filter((t) => t.unit === 1).length).toBe(2);
    expect(picks.filter((t) => t.unit === 2).length).toBe(2);
  });
});

describe("unitReadiness", () => {
  it("unit 11 is ready with at least 12 templates and 4 per difficulty", () => {
    const r = unitReadiness(11);
    expect(r.ready).toBe(true);
    expect(r.count).toBeGreaterThanOrEqual(12);
    for (const d of [1, 2, 3] as Difficulty[]) expect(r.perDifficulty[d]).toBeGreaterThanOrEqual(4);
  });

  it("unit 5 is not ready (no templates yet)", () => {
    expect(unitReadiness(5)).toEqual({ ready: false, count: 0, perDifficulty: { 1: 0, 2: 0, 3: 0 } });
  });

  it("needs both 12 templates and 4 of each difficulty", () => {
    const lopsided = [
      ...Array.from({ length: 10 }, (_, i) => fakeTemplate(7, i, 1)),
      ...Array.from({ length: 3 }, (_, i) => fakeTemplate(7, 20 + i, 2)),
      ...Array.from({ length: 4 }, (_, i) => fakeTemplate(7, 30 + i, 3)),
    ];
    expect(unitReadiness(7, lopsided).ready).toBe(false);
    const few = fakeBank({ 8: 11 });
    expect(unitReadiness(8, few).ready).toBe(false);
    const ok = fakeBank({ 8: 12 });
    expect(unitReadiness(8, ok)).toEqual({ ready: true, count: 12, perDifficulty: { 1: 4, 2: 4, 3: 4 } });
  });
});

/**
 * Independent recompute (fix wave): read the numbers a student sees in the
 * prompt and work the answer out with the test's own formula, never by
 * calling the template's expected() or solution().
 */
describe("independent recompute from the prompt", () => {
  const hcf = (a: number, b: number): number => (b === 0 ? a : hcf(b, a % b));
  const nums = (re: RegExp, text: string, where: string) => {
    const m = re.exec(text);
    expect(m, `${where}: ${text}`).not.toBeNull();
    return m!.slice(1).map(Number);
  };
  const each = (id: string, check: (prompt: string, expected: number | string, where: string) => void) => {
    const t = UNIT_11.find((x) => x.id === id)!;
    for (const zone of ZONE_IDS) {
      for (let s = 1; s <= 100; s++) {
        const { publicQ, expected } = generateQuestion(t, zone, String(s));
        check(publicQ.prompt, expected, `${id} ${zone} seed ${s}`);
      }
    }
  };

  it("u11-ratio-change-01: target ratio in lowest terms, answer = (c - a) x stone / b", () => {
    each("u11-ratio-change-01", (p, expected, where) => {
      const [a, b, stone] = nums(/in the ratio (\d+):(\d+)\. You have (\d+) /, p, where);
      const [c, d] = nums(/make the ratio (\d+):(\d+)\?/, p, where);
      expect(hcf(a, b), where).toBe(1);
      expect(hcf(c, d), `${where}: target ${c}:${d} not in lowest terms`).toBe(1);
      expect(d, where).toBe(b); // the stone part is unchanged
      expect(c, where).toBeGreaterThan(a);
      const woodNow = (a * stone) / b;
      const woodNeeded = (c * stone) / d;
      expect(expected, where).toBe(woodNeeded - woodNow);
    });
  });

  it("u11-inverse-workers-01: unambiguous total workforce, answer = people x hours / new hours", () => {
    each("u11-inverse-workers-01", (p, expected, where) => {
      expect(p, where).not.toMatch(/in total/);
      const [people, hours] = nums(/(\d+) people can cut enough .*? in (\d+) hours/, p, where);
      const [newHours] = nums(/must be done in (\d+) hours/, p, where);
      const [counted] = nums(/including the first (\d+)/, p, where);
      expect(counted, where).toBe(people);
      expect(expected, where).toBe((people * hours) / newHours);
    });
  });

  it("u11-inverse-leave-01: answer = people x days / people left", () => {
    each("u11-inverse-leave-01", (p, expected, where) => {
      const [people, days] = nums(/feed (\d+) people for (\d+) days/, p, where);
      const [leave] = nums(/\. (\d+) (?:person|people) leaves?/, p, where);
      expect(expected, where).toBe((people * days) / (people - leave));
    });
  });

  it("u11-inverse-arrive-01: answer = people x days / (people + arrivals)", () => {
    each("u11-inverse-arrive-01", (p, expected, where) => {
      const [people, days] = nums(/will last (\d+) people for (\d+) days/, p, where);
      const [arrive] = nums(/(\d+) rescued sailors? joins?/, p, where);
      expect(expected, where).toBe((people * days) / (people + arrive));
    });
  });

  it("u11-inverse-choice-01: answer = days x people / new people", () => {
    each("u11-inverse-choice-01", (p, expected, where) => {
      const [people, days] = nums(/^(\d+) people take (\d+) days/, p, where);
      const [more] = nums(/If (\d+) people work/, p, where);
      expect(expected, where).toBe(`${(days * people) / more} days`);
    });
  });

  it("u11-share-ratio-01: answer = total x a / (a + b)", () => {
    each("u11-share-ratio-01", (p, expected, where) => {
      const [total] = nums(/catches (\d+) /, p, where);
      const [a, b] = nums(/in the ratio (\d+):(\d+) \(yours first\)/, p, where);
      expect(expected, where).toBe((total * a) / (a + b));
    });
  });
});
