import { describe, it, expect } from "vitest";
import type { QuestionTemplate } from "@/lib/questions/types";
import { SEEDS_200, eachQuestion, numsIn } from "./bank";

/**
 * Coordinate-aware rank check for choice options made of numbers: points "(x, y)" (ranked by x, by y and by x + y),
 * rules such as "Add 7" or "Subtract 3" (ranked by the number), and any option whose numbers vary between options
 * (each varying number is ranked). Over 400 questions no single ranking may give the key the same rank on more than
 * 45% of them. Columns that are the same in every option are skipped.
 */
export function coordRankChecks(bank: QuestionTemplate[], ids: string[]) {
  describe("key rank by coordinate, sum and rule number is spread (rank2)", () => {
    for (const t of bank.filter((x) => ids.includes(x.id))) {
      it(t.id, () => {
        const tallies = new Map<string, number[]>();
        let n = 0;
        eachQuestion(
          t,
          ({ publicQ, expected }) => {
            const opts = publicQ.options!;
            if (opts.length !== 4) return;
            const nums = opts.map((o) => numsIn(o));
            const key = opts.indexOf(expected as string);
            const dim = Math.min(...nums.map((v) => v.length));
            const scores: Record<string, number[]> = {};
            for (let k = 0; k < dim; k++) {
              const col = nums.map((v) => v[k]);
              if (new Set(col).size > 1) scores[`number ${k + 1}`] = col;
            }
            if (opts.every((o) => /^\(/.test(o)) && dim === 2) scores.sum = nums.map((v) => v[0] + v[1]);
            n++;
            for (const [name, col] of Object.entries(scores)) {
              const rank = col.filter((v) => v < col[key]).length;
              const arr = tallies.get(name) ?? [0, 0, 0, 0];
              arr[rank]++;
              tallies.set(name, arr);
            }
          },
          SEEDS_200.slice(0, 80),
        );
        expect(tallies.size, "no numeric ranking found").toBeGreaterThan(0);
        for (const [name, arr] of tallies) expect(Math.max(...arr) / n, `${name}: ${arr}`).toBeLessThanOrEqual(0.45);
      });
    }
  });
}
