import { describe, it, expect } from "vitest";
import type { QuestionTemplate } from "@/lib/questions/types";
import { SEEDS_200, eachQuestion, numsIn } from "./bank";

/**
 * For choice templates whose options all contain numbers: in each numeric coordinate where the values are
 * all different, the key's rank (smallest = 0) must not be the same on nearly every seed (for example
 * "always the middle option" or "always third smallest").
 */
export function rankChecks(bank: QuestionTemplate[], allow: string[] = []) {
  describe("key rank in each numeric coordinate varies", () => {
    for (const t of bank.filter((x) => x.format.kind === "choice" && !allow.includes(x.id))) {
      it(`${t.id}`, () => {
        const ranks: Map<number, number>[] = [];
        const used: number[] = [];
        eachQuestion(t, ({ publicQ, expected }) => {
          const opts = publicQ.options!;
          const nums = opts.map((o) => numsIn(o));
          const key = opts.indexOf(expected as string);
          const dim = Math.min(...nums.map((n) => n.length));
          for (let k = 0; k < dim; k++) {
            const col = nums.map((n) => n[k]);
            if (new Set(col).size !== col.length) continue;
            const rank = col.filter((v) => v < col[key]).length;
            (ranks[k] ??= new Map()).set(rank, (ranks[k].get(rank) ?? 0) + 1);
            used[k] = (used[k] ?? 0) + 1;
          }
        }, SEEDS_200.slice(0, 100));
        for (let k = 0; k < ranks.length; k++) {
          if (!ranks[k] || used[k] < 100) continue;
          const top = Math.max(...ranks[k].values());
          expect(top / used[k], `key has the same rank in number ${k + 1} too often`).toBeLessThanOrEqual(0.85);
        }
      });
    }
  });
}

/** Numeric value of a fraction-style option ("3/4", "2 1/3", "5", "0.25"), or null if it is not one. */
export function optionValue(o: string): number | null {
  let m = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(o);
  if (m) return (m[1] ? Number(m[1]) : 0) + Number(m[2]) / Number(m[3]);
  m = /^\d+(?:\.\d+)?$/.exec(o);
  return m ? Number(o) : null;
}

/**
 * For choice templates whose options are all numbers or fractions: no other option has the key's value, the key's
 * rank by VALUE is not the same on most seeds, and the key is sometimes the smallest and sometimes the largest.
 */
export function valueRankChecks(bank: QuestionTemplate[], allow: string[] = []) {
  describe("key rank by value varies (fraction and number options)", () => {
    for (const t of bank.filter((x) => x.format.kind === "choice" && !allow.includes(x.id))) {
      it(`${t.id}`, () => {
        const counts = [0, 0, 0, 0];
        let n = 0;
        let applicable = true;
        eachQuestion(t, ({ publicQ, expected }, where) => {
          const opts = publicQ.options!;
          const vals = opts.map(optionValue);
          if (vals.some((v) => v === null)) {
            applicable = false;
            return;
          }
          const key = vals[opts.indexOf(expected as string)]!;
          expect(vals.filter((v) => Math.abs(v! - key) < 1e-9), `${where}: another option equals the key in value`).toHaveLength(1);
          const rank = vals.filter((v) => v! < key - 1e-9).length;
          if (opts.length === 4) {
            counts[rank]++;
            n++;
          }
        }, SEEDS_200.slice(0, 100));
        if (!applicable || n === 0) return;
        expect(Math.max(...counts) / n, `key has the same value rank too often: ${counts}`).toBeLessThanOrEqual(0.65);
        expect(counts[0] / n, `key is never the smallest: ${counts}`).toBeGreaterThanOrEqual(0.08);
        expect(counts[3] / n, `key is never the largest: ${counts}`).toBeGreaterThanOrEqual(0.08);
      });
    }
  });
}
