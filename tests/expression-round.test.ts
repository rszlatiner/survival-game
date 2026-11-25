import { describe, expect, it } from "vitest";
import { toPublicState } from "@/lib/engine/public";
import { revealRound } from "@/lib/engine/round";
import { generateQuestion } from "@/lib/questions/generate";
import type { QuestionTemplate } from "@/lib/questions/types";
import { EXPR_TEMPLATE, withExpressionQuestions } from "./helpers/expression";
import { captainOf, questionGame, submitAnswer } from "./helpers/game";

describe("expression question, full round", () => {
  it("generates a public question with only the kind and an expected string", () => {
    const q = generateQuestion(EXPR_TEMPLATE, "beach", "seed");
    expect(q.expected).toBe("3x+6");
    expect(q.publicQ.format).toStrictEqual({ kind: "expression" });
    expect(q.publicQ.options).toBeUndefined();
    expect(JSON.stringify(q.publicQ)).not.toContain("3x+6");
    expect(q.publicQ.prompt).toBe("Expand and simplify 2(x+3)+x");
  });

  it("throws at generation for an unparseable or non-string expected", () => {
    const bad = (expected: QuestionTemplate["expected"]): QuestionTemplate => ({ ...EXPR_TEMPLATE, expected });
    expect(() => generateQuestion(bad(() => "3x+"), "beach", "s")).toThrow(/valid expression/);
    expect(() => generateQuestion(bad(() => 5), "beach", "s")).toThrow(/valid expression/);
    expect(() => generateQuestion(bad(() => "x^y"), "beach", "s")).toThrow(/valid expression/);
  });

  it("accepts equivalent forms, rejects a near-miss, and reveals the prettified expected text", () => {
    const base = withExpressionQuestions(questionGame(5));
    const answers = ["3x + 6", "x*3+6", "6+3x", "3x+5", "3(x+2)"];
    let g = base;
    g.teams.forEach((t, i) => {
      g = submitAnswer(g, t.id, captainOf(t), answers[i], g.round!.startedAt + 1 + i);
    });

    const before = toPublicState(g, 5);
    expect(before.round!.results).toBeNull();
    for (const t of g.teams) expect(before.round!.questions[t.id].format).toStrictEqual({ kind: "expression" });
    expect(JSON.stringify(before)).not.toContain("3x+6");

    const revealed = revealRound(g);
    const pub = toPublicState(revealed, 9);
    const res = pub.round!.results!;
    expect(res.t1).toMatchObject({ correct: true, answer: "3x + 6", expected: "3x+6" });
    expect(res.t2.correct).toBe(true);
    expect(res.t3.correct).toBe(true);
    expect(res.t4.correct).toBe(false);
    expect(res.t5.correct).toBe(true);
  });

  it("reveal text prettifies exponents and products", () => {
    const t: QuestionTemplate = { ...EXPR_TEMPLATE, expected: () => "x^2+2*x+1" };
    const g = revealRound(withExpressionQuestions(questionGame(2), t));
    expect(toPublicState(g, 1).round!.results!.t1.expected).toBe("x²+2·x+1");
  });
});
