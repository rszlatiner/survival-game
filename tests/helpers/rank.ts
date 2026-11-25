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
