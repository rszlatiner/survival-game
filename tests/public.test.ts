import { describe, expect, it } from "vitest";
import { ROUNDS } from "@/lib/config";
import { toPublicState } from "@/lib/engine/public";
import { revealRound, startRound } from "@/lib/engine/round";
import type { GameState } from "@/lib/types";
import { EXPR_TEMPLATE, withExpressionQuestions } from "./helpers/expression";
import { captainOf, questionGame, startedGame, submitAnswer } from "./helpers/game";

/** Every string value and every key name anywhere in `v`. */
function collect(v: unknown, out = { strings: new Set<string>(), keys: new Set<string>() }) {
  if (typeof v === "string") out.strings.add(v);
  else if (Array.isArray(v)) v.forEach((x) => collect(x, out));
  else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) {
      out.keys.add(k);
      collect(x, out);
    }
  }
  return out;
}

const FORBIDDEN_BEFORE_REVEAL = ["expected", "solution", "answer", "seed", "correct", "log", "devices", "deviceId"];

/** Submit the right answer for team 1 and a wrong one for team 2 (others stay silent). */
function withSubmissions(g: GameState): GameState {
  const [a, b] = g.teams;
  g = submitAnswer(g, a.id, captainOf(a), String(g.round!.questions[a.id].expected), g.round!.startedAt + 1);
  g = submitAnswer(g, b.id, captainOf(b), "not it", g.round!.startedAt + 2);
  return g;
}

function assertNoLeak(g: GameState) {
  const pub = toPublicState(g, 5);
  const { strings, keys } = collect(pub);
  const json = JSON.stringify(pub);
  for (const k of FORBIDDEN_BEFORE_REVEAL) expect(keys.has(k), `key ${k}`).toBe(false);
  for (const q of Object.values(g.round!.questions)) {
    expect(strings.has(q.solution)).toBe(false);
    expect(json.includes(q.solution)).toBe(false);
    if (q.publicQ.format.kind !== "choice") expect(strings.has(String(q.expected))).toBe(false);
  }
  expect(strings.has(g.seed)).toBe(false);
  for (const t of g.teams) for (const d of t.devices) expect(strings.has(d)).toBe(false);
  return pub;
}

describe("toPublicState", () => {
  it("never leaks answers, solutions, seed or devices during question phases (5 teams, every round, several seeds)", () => {
    let sawChoice = false;
    let sawOther = false;
    for (const seed of ["s1", "s2", "s3", "s4"]) {
      let g = startedGame(5, seed);
      for (let n = 1; n <= ROUNDS[g.length]; n++) {
        g = withSubmissions(startRound(g, 10_000 * n));
        const pub = assertNoLeak(g);
        for (const t of g.teams) {
          const q = g.round!.questions[t.id];
          if (q.publicQ.format.kind === "choice") sawChoice = true;
          else sawOther = true;
          // The public question is exactly the publicQ: nothing marks the right option.
          expect(pub.round!.questions[t.id]).toStrictEqual(q.publicQ);
        }
        expect(pub.round!.submissions).toStrictEqual({
          t1: { submitted: true },
          t2: { submitted: true },
          t3: { submitted: false },
          t4: { submitted: false },
          t5: { submitted: false },
        });
        expect(pub.round!.results).toBeNull();
        g = revealRound(g);
      }
    }
    expect(sawChoice && sawOther).toBe(true);
  });

  it("expression questions expose only the kind before reveal, never the expected expression", () => {
    let g = withExpressionQuestions(questionGame(3));
    const [a] = g.teams;
    g = submitAnswer(g, a.id, captainOf(a), "3x+6", g.round!.startedAt + 1);
    const pub = assertNoLeak(g);
    for (const t of g.teams) {
      expect(g.round!.questions[t.id].expected).toBe("3x+6");
      expect(pub.round!.questions[t.id].format).toStrictEqual({ kind: "expression" });
      expect(Object.keys(pub.round!.questions[t.id]).sort()).toEqual(
        ["difficulty", "format", "prompt", "resource", "templateId", "unit"],
      );
      expect(pub.round!.questions[t.id].templateId).toBe(EXPR_TEMPLATE.id);
    }
    // The captain's own typed answer is not echoed back before reveal either.
    expect(JSON.stringify(pub)).not.toContain("3x+6");
    expect(pub.round!.results).toBeNull();
  });

  it("treats the tiebreak phase like a question phase", () => {
    const g0 = withSubmissions(questionGame(5));
    const g: GameState = { ...g0, phase: "tiebreak" };
    const pub = assertNoLeak(g);
    expect(pub.round!.results).toBeNull();
  });

  it("includes solutions, expected answers, submitted answers and correctness at reveal", () => {
    const q = withSubmissions(questionGame(5));
    const g = revealRound(q);
    const pub = toPublicState(g, 99);
    const res = pub.round!.results!;
    expect(Object.keys(res).sort()).toEqual(["t1", "t2", "t3", "t4", "t5"]);
    for (const t of g.teams) {
      const gq = g.round!.questions[t.id];
      expect(res[t.id].solution).toBe(gq.solution);
      expect(typeof res[t.id].expected).toBe("string");
    }
    // Correctness is the engine's verdict, copied through.
    expect(res.t1).toMatchObject({ correct: g.round!.submissions.t1.correct, answer: String(g.round!.questions.t1.expected) });
    expect(res.t2).toMatchObject({ correct: false, answer: "not it" });
    expect(res.t3).toMatchObject({ correct: false, answer: null });
    const { keys, strings } = collect(pub);
    expect(keys.has("seed") || keys.has("log") || keys.has("devices") || keys.has("deviceId")).toBe(false);
    expect(strings.has(g.seed)).toBe(false);
  });

  it("includes results once finished", () => {
    const g0 = revealRound(withSubmissions(questionGame(3)));
    const g: GameState = { ...g0, phase: "finished", winnerId: "t1" };
    const pub = toPublicState(g, 1);
    expect(pub.round!.results!.t1.correct).toBe(g.round!.submissions.t1.correct);
    expect(pub.round!.results!.t3).toMatchObject({ answer: null, correct: false });
    expect(pub.winnerId).toBe("t1");
  });

  it("projects the top-level fields and teams without device ids", () => {
    const g = withSubmissions(questionGame(2));
    const pub = toPublicState(g, 12345);
    expect(pub).toMatchObject({
      code: g.code,
      version: g.version,
      phase: "question",
      units: g.units,
      length: g.length,
      timerSeconds: g.timerSeconds,
      roundsPlayed: 0,
      totalRounds: ROUNDS[g.length],
      fund: g.fund,
      winnerId: null,
      tiedIds: [],
      serverNow: 12345,
    });
    expect(pub.round).toMatchObject({
      n: 1,
      startedAt: g.round!.startedAt,
      endsAt: g.round!.endsAt,
      roll: g.round!.roll,
      bonusResource: g.round!.bonusResource,
      raider: g.round!.raider,
      hazard: g.round!.hazard,
    });
    const t = g.teams[0];
    expect(pub.teams[0]).toStrictEqual({
      id: t.id,
      name: t.name,
      zone: t.zone,
      deviceCount: t.devices.length,
      captainIndex: t.captainIndex,
      stock: t.stock,
      builds: t.builds,
      sp: t.sp,
      fundGiven: t.fundGiven,
    });
  });

  it("has a null round in the lobby", () => {
    const pub = toPublicState(startedGame(2), 0);
    expect(pub.round).toBeNull();
  });

  it("is JSON round-trip stable in every phase", () => {
    const q = withSubmissions(questionGame(4));
    for (const g of [startedGame(2), q, revealRound(q), { ...revealRound(q), phase: "finished" as const }]) {
      const pub = toPublicState(g, 7);
      expect(JSON.parse(JSON.stringify(pub))).toStrictEqual(pub);
    }
  });

  it("does not share structure with the game state", () => {
    const g = questionGame(2);
    const pub = toPublicState(g, 0);
    pub.teams[0].stock.water = 999;
    pub.round!.questions.t1.prompt = "x";
    expect(g.teams[0].stock.water).not.toBe(999);
    expect(g.round!.questions.t1.publicQ.prompt).not.toBe("x");
  });
});
