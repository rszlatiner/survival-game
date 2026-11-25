import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isCorrect, parseNumeric } from "@/lib/answers";
import { parseExpr } from "@/lib/mathexpr";
import { ZONE_IDS, RESOURCES, type QuestionTemplate, type ZoneId } from "@/lib/questions/types";
import { generateQuestion } from "@/lib/questions/generate";
import { unitReadiness } from "@/lib/questions/ready";
import { ALL_TEMPLATES } from "@/content/units";

export const SEEDS_200 = Array.from({ length: 200 }, (_, i) => String(i + 1));

/** Generate for one template over many seeds and all zones. */
export function eachQuestion(
  t: QuestionTemplate,
  fn: (q: ReturnType<typeof generateQuestion>, where: string, zone: ZoneId) => void,
  seeds = SEEDS_200,
) {
  for (const zone of ZONE_IDS)
    for (const seed of seeds) fn(generateQuestion(t, zone, seed), `${t.id} ${zone} seed ${seed}`, zone);
}

/** Numbers (with U+2212 minus read as minus) found in a string. */
export function numsIn(s: string): number[] {
  return (s.replace(/−/g, "-").match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

function words(s: string): string[] {
  return s.split(/\s+/).filter(Boolean);
}

/** Structural checks shared by every unit bank. */
export function bankChecks(unit: number, bank: QuestionTemplate[]) {
  const nn = String(unit).padStart(2, "0");

  describe(`unit ${unit} bank shape`, () => {
    it("has 20 templates, unique ids, tagged with the unit, split 6/8/6", () => {
      expect(bank).toHaveLength(20);
      expect(new Set(bank.map((t) => t.id)).size).toBe(20);
      for (const t of bank) {
        expect(t.unit).toBe(unit);
        expect(t.id).toMatch(new RegExp(`^u${nn}-[a-z0-9-]+-\\d{2}$`));
      }
      expect([1, 2, 3].map((d) => bank.filter((t) => t.difficulty === d).length)).toEqual([6, 8, 6]);
    });
    it("spreads resources (4 to 6 of each)", () => {
      for (const r of RESOURCES) {
        const n = bank.filter((t) => t.resource === r).length;
        expect(n, r).toBeGreaterThanOrEqual(4);
        expect(n, r).toBeLessThanOrEqual(6);
      }
    });
    it("is registered and ready", () => {
      for (const t of bank) expect(ALL_TEMPLATES).toContain(t);
      const r = unitReadiness(unit);
      expect(r.ready).toBe(true);
      expect(r.perDifficulty).toEqual({ 1: 6, 2: 8, 3: 6 });
    });
    it("includes a mix of answer formats (some choice, some typed)", () => {
      expect(bank.filter((t) => t.format.kind === "choice").length).toBeGreaterThanOrEqual(3);
      expect(bank.filter((t) => t.format.kind !== "choice").length).toBeGreaterThanOrEqual(8);
    });
    it("never uses the percent or fraction format (their parser cannot take the exact answer string)", () => {
      for (const t of bank) expect(["integer", "decimal", "choice", "expression"]).toContain(t.format.kind);
    });
  });

  describe(`unit ${unit} generation, 200 seeds x 5 zones`, () => {
    for (const t of bank) {
      it(`${t.id} is clean and exact`, () => {
        let positions = new Set<number>();
        let longest = 0, shortest = 0, largest = 0, smallest = 0, numericCases = 0, total = 0;
        eachQuestion(t, ({ publicQ, expected, solution }, where) => {
          const prompt = publicQ.prompt;
          expect(prompt.length, where).toBeGreaterThan(15);
          expect(words(prompt).length, where).toBeLessThanOrEqual(45);
          expect(prompt, where).not.toMatch(/undefined|NaN|\[object|\$\{|\{|\}|Infinity/);
          expect(solution, where).not.toMatch(/undefined|NaN|\$\{|\{|\}|Infinity/);
          expect(solution, where).not.toMatch(/(?<![\d.])[-−]0(?![.\d])/);
          expect(solution.length, where).toBeGreaterThan(20);
          if (t.format.kind === "choice") {
            expect(typeof expected, where).toBe("string");
            const opts = publicQ.options!;
            expect(opts.length, where).toBeGreaterThanOrEqual(3);
            expect(new Set(opts).size, where).toBe(opts.length);
            for (const o of opts) expect(o.trim().length, where).toBeGreaterThan(0);
            expect(opts.filter((o) => o === expected).length, where).toBe(1);
            expect(solution, where).toContain(expected as string);
            total++;
            positions.add(opts.indexOf(expected as string));
            const lens = opts.map((o) => o.length);
            const el = (expected as string).length;
            if (el > Math.max(...opts.filter((o) => o !== expected).map((o) => o.length))) longest++;
            if (el < Math.min(...opts.filter((o) => o !== expected).map((o) => o.length))) shortest++;
            const vals = opts.map((o) => numsIn(o)[0]);
            if (vals.every((v) => Number.isFinite(v))) {
              numericCases++;
              const ev = numsIn(expected as string)[0];
              const others = opts.filter((o) => o !== expected).map((o) => numsIn(o)[0]);
              if (ev > Math.max(...others)) largest++;
              if (ev < Math.min(...others)) smallest++;
            }
            void lens;
          } else if (t.format.kind === "expression") {
            // Typed algebra: expected is expression text that parses and accepts itself.
            expect(typeof expected, where).toBe("string");
            expect(parseExpr(expected as string), where).not.toBeNull();
            expect(isCorrect(expected as string, expected, publicQ.format), where).toBe(true);
            expect(solution, where).toContain(expected as string);
          } else {
            expect(typeof expected, where).toBe("number");
            const n = expected as number;
            expect(Number.isFinite(n), where).toBe(true);
            expect(n, where).toBeGreaterThan(0);
            const places = t.format.kind === "decimal" ? t.format.places : 0;
            expect(places).toBeLessThanOrEqual(2);
            const scaled = n * 10 ** places;
            expect(Math.abs(scaled - Math.round(scaled)), where).toBeLessThan(1e-6);
            if (t.format.kind === "integer") expect(Number.isInteger(n), where).toBe(true);
            const typed = String(n);
            expect(typed, where).not.toMatch(/e/);
            expect(parseNumeric(typed, t.format), where).not.toBeNull();
            expect(isCorrect(typed, n, t.format), where).toBe(true);
            expect(isCorrect(String(n + 1), n, t.format), where).toBe(false);
            expect(solution, where).toContain(typed);
          }
        });
        if (t.format.kind === "choice") {
          expect(positions.size, "correct option position varies").toBeGreaterThanOrEqual(3);
          // The correct option may be the uniquely longest/shortest/largest/smallest only occasionally.
          expect(longest / total, "longest").toBeLessThanOrEqual(0.55);
          expect(shortest / total, "shortest").toBeLessThanOrEqual(0.55);
          if (numericCases > 0) {
            expect(largest / numericCases, "largest").toBeLessThanOrEqual(0.55);
            expect(smallest / numericCases, "smallest").toBeLessThanOrEqual(0.55);
          }
        }
        positions = new Set();
      });
    }

    it("no two templates give the same prompt for the same seed and zone", () => {
      for (const zone of ZONE_IDS) {
        for (let s = 1; s <= 50; s++) {
          const prompts = bank.map((t) => generateQuestion(t, zone, String(s)).publicQ.prompt);
          expect(new Set(prompts).size, `${zone} seed ${s}`).toBe(bank.length);
        }
      }
    });

    it("different seeds give different questions for most seeds", () => {
      for (const t of bank) {
        const prompts = new Set(
          SEEDS_200.slice(0, 40).map((s) => {
            const { publicQ } = generateQuestion(t, "beach", s);
            return `${publicQ.prompt} | ${(publicQ.options ?? []).slice().sort().join(",")}`;
          }),
        );
        expect(prompts.size, t.id).toBeGreaterThanOrEqual(6);
      }
    });
  });

  describe(`unit ${unit} no copied text`, () => {
    it("shares no run of 9 or more words with any other tracked text file", () => {
      const file = `content/units/unit-${nn}.ts`;
      const src = readFileSync(file, "utf8");
      // Compare only string literals, split at interpolations, so code is never compared.
      const literals = src.match(/`(?:[^`\\]|\\.)*`|"(?:[^"\\\n]|\\.)*"/g) ?? [];
      const chunks = literals.flatMap((l) => l.slice(1, -1).split(/\$\{[^}]*\}/));
      const grams = new Set<string>();
      for (const c of chunks) {
        const w = words(c.toLowerCase().replace(/[^a-z0-9\u00c0-\u024f' ]+/g, " "));
        for (let i = 0; i + 9 <= w.length; i++) grams.add(w.slice(i, i + 9).join(" "));
      }
      const listed = (args: string[]) => execFileSync("git", args, { encoding: "utf8" }).split("\0").filter(Boolean);
      const files = [...new Set([...listed(["ls-files", "-z"]), ...listed(["ls-files", "-z", "--others", "--exclude-standard"])])]
        .filter((f) => /\.(ts|tsx|md|mjs|js|json|sql|css)$/.test(f))
        .filter((f) => f !== file && f !== "content/units/zones.ts" && !f.startsWith(".superpowers/") && !f.includes("package-lock"));
      const hay = files
        .map((f) => readFileSync(f, "utf8").toLowerCase().replace(/[^a-z0-9À-ɏ' ]+/g, " ").replace(/\s+/g, " "))
        .join(" \n ");
      const hits = [...grams].filter((g) => hay.includes(g));
      expect(hits).toEqual([]);
    });
  });
}
