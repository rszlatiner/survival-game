import { generateQuestion } from "@/lib/questions/generate";
import type { QuestionTemplate } from "@/lib/questions/types";
import type { GameState } from "@/lib/types";

/** Test-only expression template (NOT part of content/units). Expected answer: 3x+6. */
export const EXPR_TEMPLATE: QuestionTemplate = {
  id: "test-expand-2",
  unit: 11,
  difficulty: 2,
  resource: "wood",
  format: { kind: "expression" },
  params: () => ({ a: 2, b: 3 }),
  prompt: (p) => `Expand and simplify ${p.a}(x+${p.b})+x`,
  expected: (p) => `${p.a + 1}x+${p.a * p.b}`,
  solution: (p) => `${p.a}(x+${p.b})+x = ${p.a}x+${p.a * p.b}+x = ${p.a + 1}x+${p.a * p.b}`,
};

/** Replace every team's question in the current round with the expression fixture. */
export function withExpressionQuestions(g: GameState, t: QuestionTemplate = EXPR_TEMPLATE): GameState {
  const questions = Object.fromEntries(
    g.teams.map((team) => {
      const q = generateQuestion(t, "beach", `${g.seed}:${team.id}`);
      return [team.id, { publicQ: q.publicQ, expected: q.expected, solution: q.solution }];
    }),
  );
  return { ...g, round: { ...g.round!, questions } };
}
