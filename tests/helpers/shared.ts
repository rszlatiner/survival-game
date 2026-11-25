import { describe, it, expect } from "vitest";
import type { QuestionTemplate } from "@/lib/questions/types";
import { SEEDS_200, eachQuestion, numsIn } from "./bank";

/**
 * Shared-coordinate guess check. For choice templates whose options are all points "(x, y)": the guess "pick the
 * option that shares an x or a y coordinate with the most other options" (hub rule), and its opposite "pick the one
 * that shares with the fewest", must each pick the key on at most 45% of questions (ties split evenly).
 */
export function sharedCoordChecks(bank: QuestionTemplate[], minTemplates = 1) {
  describe("shared-coordinate guesses do not find the key", () => {
    let applied = 0;
    for (const t of bank.filter((x) => x.format.kind === "choice")) {
      it(t.id, () => {
        let n = 0, most = 0, fewest = 0;
        eachQuestion(
          t,
          ({ publicQ, expected }) => {
            const opts = publicQ.options!;
            if (!opts.every((o) => /^\(.*\)$/.test(o) && numsIn(o).length === 2)) return;
            const v = opts.map((o) => numsIn(o));
            const share = v.map((a, i) => v.reduce((acc, b, j) => (i === j ? acc : acc + (a[0] === b[0] ? 1 : 0) + (a[1] === b[1] ? 1 : 0)), 0));
            const key = opts.indexOf(expected as string);
            const hi = Math.max(...share);
            const lo = Math.min(...share);
            n++;
            if (share[key] === hi) most += 1 / share.filter((s) => s === hi).length;
            if (share[key] === lo) fewest += 1 / share.filter((s) => s === lo).length;
          },
          SEEDS_200.slice(0, 80),
        );
        if (n === 0) return;
        applied++;
        expect(most / n, "most-shared guess finds the key too often").toBeLessThanOrEqual(0.45);
        expect(fewest / n, "least-shared guess finds the key too often").toBeLessThanOrEqual(0.45);
      });
    }
    it("applies to at least one template", () => {
      expect(applied).toBeGreaterThanOrEqual(minTemplates);
    });
  });
}

/**
 * Near-miss guess check. For choice templates whose options are all points "(x, y)": the guess "pick the option
 * with the most other options within 2 units in both coordinates" (the centre of the cluster) must pick the key on
 * at most 40% of questions (ties split evenly).
 */
export function nearMissChecks(bank: QuestionTemplate[], ids: string[]) {
  describe("near-miss neighbours do not find the key", () => {
    for (const t of bank.filter((x) => ids.includes(x.id))) {
      it(t.id, () => {
        let n = 0, hit = 0;
        eachQuestion(
          t,
          ({ publicQ, expected }) => {
            const opts = publicQ.options!;
            const v = opts.map((o) => numsIn(o));
            const near = v.map((a, i) => v.filter((b, j) => i !== j && Math.abs(a[0] - b[0]) <= 2 && Math.abs(a[1] - b[1]) <= 2).length);
            const key = opts.indexOf(expected as string);
            const hi = Math.max(...near);
            n++;
            if (near[key] === hi) hit += 1 / near.filter((x) => x === hi).length;
          },
          SEEDS_200.slice(0, 80),
        );
        expect(n).toBeGreaterThan(0);
        expect(hit / n, "cluster-centre guess finds the key too often").toBeLessThanOrEqual(0.4);
      });
    }
  });
}
