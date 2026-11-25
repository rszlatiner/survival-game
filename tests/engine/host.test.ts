import { describe, it, expect } from "vitest";
import { ROUNDS } from "@/lib/config";
import { endGame, extendTimer, overrideTeam, setTimerSeconds, shortenTimer, skipQuestion, suggestAnswer } from "@/lib/engine/host";
import { addTeam, createGame, joinTeam } from "@/lib/engine/game";
import { revealRound } from "@/lib/engine/round";
import { checkRaft, checkWinner } from "@/lib/engine/win";
import type { GameState, Stock } from "@/lib/types";
import { captainOf, errCode, questionGame, submitAnswer, revealGame, startedGame, withTeam } from "../helpers/game";

const stock = (s: Partial<Stock> = {}): Stock => ({ water: 0, food: 0, wood: 0, stone: 0, ...s });
const frozen = <T,>(x: T) => JSON.stringify(x);
const team = (g: GameState, id: string) => g.teams.find((t) => t.id === id)!;
const NOW = 50_000;

describe("extendTimer", () => {
  it("adds seconds to the round's end time and bumps the version", () => {
    const g = questionGame();
    const n = extendTimer(g, 30);
    expect(n.round!.endsAt).toBe(g.round!.endsAt + 30_000);
    expect(n.version).toBe(g.version + 1);
  });

  it("rejects a non-positive or non-integer amount and works only while a question is open", () => {
    const g = questionGame();
    expect(errCode(() => extendTimer(g, 0))).toBe("BAD_AMOUNT");
    expect(errCode(() => extendTimer(g, 1.5))).toBe("BAD_AMOUNT");
    expect(errCode(() => extendTimer(revealGame(), 30))).toBe("WRONG_PHASE");
    expect(errCode(() => extendTimer(startedGame(), 30))).toBe("WRONG_PHASE");
  });
});

describe("shortenTimer", () => {
  it("cuts the running question's time and bumps the version", () => {
    const g = questionGame();
    const now = g.round!.startedAt;
    const n = shortenTimer(g, 10, now);
    expect(n.round!.endsAt).toBe(g.round!.endsAt - 10_000);
    expect(n.version).toBe(g.version + 1);
  });

  it("never goes below now (the timer is simply expired)", () => {
    const g = questionGame();
    const now = g.round!.endsAt - 5_000;
    expect(shortenTimer(g, 600, now).round!.endsAt).toBe(now);
    const late = g.round!.endsAt + 9_000;
    expect(shortenTimer(g, 10, late).round!.endsAt).toBe(late);
  });

  it("rejects bad amounts and works only while a question is open", () => {
    const g = questionGame();
    for (const bad of [0, -1, 1.5, 601, NaN]) expect(errCode(() => shortenTimer(g, bad, NOW))).toBe("BAD_AMOUNT");
    expect(errCode(() => shortenTimer(revealGame(), 10, NOW))).toBe("WRONG_PHASE");
    expect(errCode(() => shortenTimer(startedGame(), 10, NOW))).toBe("WRONG_PHASE");
  });
});

describe("setTimerSeconds", () => {
  it("changes the timer for future rounds only, logs it and bumps the version", () => {
    const g = questionGame();
    const n = setTimerSeconds(g, 45);
    expect(n.timerSeconds).toBe(45);
    expect(n.round!.endsAt).toBe(g.round!.endsAt);
    expect(n.version).toBe(g.version + 1);
    expect(n.log[n.log.length - 1]).toBe("timer 45s");
  });

  it("is allowed in the lobby and at reveal, and the next skip uses it", () => {
    expect(setTimerSeconds(createGame({ units: [11], length: "quick", timerSeconds: 90, seed: "s", code: "ABC234", now: 0 }), 30).timerSeconds).toBe(30);
    expect(setTimerSeconds(revealGame(), 30).timerSeconds).toBe(30);
    const skipped = skipQuestion(setTimerSeconds(questionGame(), 20), NOW);
    expect(skipped.round!.endsAt).toBe(NOW + 20_000);
  });

  it("rejects out-of-range or non-integer values and a finished game", () => {
    const g = questionGame();
    for (const bad of [9, 601, 30.5, NaN, 0]) expect(errCode(() => setTimerSeconds(g, bad))).toBe("BAD_AMOUNT");
    const done = endGame(questionGame(), NOW);
    expect(done.phase).toBe("finished");
    expect(errCode(() => setTimerSeconds(done, 30))).toBe("WRONG_PHASE");
  });
});

describe("skipQuestion", () => {
  it("replaces every team's question with a different template from the game's units", () => {
    const g = questionGame(3);
    const n = skipQuestion(g, NOW);
    const oldId = g.round!.questions.t1.publicQ.templateId;
    for (const t of n.teams) {
      const q = n.round!.questions[t.id];
      expect(q.publicQ.templateId).not.toBe(oldId);
      expect(g.units).toContain(q.publicQ.unit);
    }
    expect(n.round!.startedAt).toBe(NOW);
    expect(n.round!.endsAt).toBe(NOW + g.timerSeconds * 1000);
    expect(n.round!.n).toBe(g.round!.n);
    expect(n.version).toBe(g.version + 1);
  });

  it("clears submissions and suggestions and is deterministic", () => {
    let g = questionGame(2);
    g = joinTeam(g, "t1", "extra");
    g = suggestAnswer(g, "t1", "extra", "5");
    const n = skipQuestion(g, NOW);
    expect(n.round!.submissions).toEqual({});
    expect(n.round!.suggestions).toEqual({});
    expect(frozen(skipQuestion(g, NOW))).toBe(frozen(n));
  });

  it("a second skip in the same round gives yet another question", () => {
    const g = questionGame(1);
    const a = skipQuestion(g, NOW);
    const b = skipQuestion(a, NOW);
    expect(frozen(b.round!.questions)).not.toBe(frozen(a.round!.questions));
  });

  it("works only in the question or tiebreak phase", () => {
    expect(errCode(() => skipQuestion(revealGame(), NOW))).toBe("WRONG_PHASE");
    expect(errCode(() => skipQuestion(startedGame(), NOW))).toBe("WRONG_PHASE");
  });
});

describe("overrideTeam", () => {
  it("sets some of a team's stock and its SP, and logs the change", () => {
    const g = revealGame();
    const n = overrideTeam(g, "t1", { stock: { wood: 9 }, sp: 4 });
    expect(team(n, "t1").stock).toEqual({ ...team(g, "t1").stock, wood: 9 });
    expect(team(n, "t1").sp).toBe(4);
    expect(team(n, "t2")).toEqual(team(g, "t2"));
    expect(n.log.length).toBe(g.log.length + 1);
    expect(n.log[n.log.length - 1]).toMatch(/^override t1/);
  });

  it("rejects negative or fractional values and unknown teams", () => {
    const g = revealGame();
    expect(errCode(() => overrideTeam(g, "t1", { sp: -1 }))).toBe("BAD_AMOUNT");
    expect(errCode(() => overrideTeam(g, "t1", { stock: { water: 1.5 } }))).toBe("BAD_AMOUNT");
    expect(errCode(() => overrideTeam(g, "t9", { sp: 1 }))).toBe("NOT_FOUND");
    expect(errCode(() => overrideTeam(g, "t1", { sp: 10_000 }))).toBe("BAD_AMOUNT");
    expect(errCode(() => overrideTeam(g, "t1", { stock: { wood: 10_000 } }))).toBe("BAD_AMOUNT");
    expect(team(overrideTeam(g, "t1", { sp: 9999, stock: { wood: 9999 } }), "t1").sp).toBe(9999);
  });

  it("an empty patch changes nothing", () => {
    const g = revealGame();
    expect(overrideTeam(g, "t1", {})).toBe(g);
  });
});

describe("suggestAnswer", () => {
  it("stores a teammate's suggestion, one per device (latest wins)", () => {
    let g = joinTeam(questionGame(2), "t1", "extra");
    g = suggestAnswer(g, "t1", "extra", " 12 ");
    g = suggestAnswer(g, "t1", "extra", "13");
    g = suggestAnswer(g, "t1", "d0", "14");
    expect(g.round!.suggestions.t1).toEqual([
      { deviceId: "extra", answer: "13" },
      { deviceId: "d0", answer: "14" },
    ]);
    expect(g.round!.suggestions.t2).toBeUndefined();
  });

  it("rejects a device from another team, an empty or over-long answer, and other phases", () => {
    const g = questionGame(2);
    expect(errCode(() => suggestAnswer(g, "t1", "d1", "1"))).toBe("NOT_FOUND");
    expect(errCode(() => suggestAnswer(g, "t1", "d0", "  "))).toBe("BAD_ANSWER");
    expect(errCode(() => suggestAnswer(g, "t1", "d0", "1".repeat(41)))).toBe("BAD_ANSWER");
    expect(errCode(() => suggestAnswer(revealGame(), "t1", "d0", "1"))).toBe("WRONG_PHASE");
  });
});

describe("checkRaft", () => {
  it("declares a raft winner but never runs final scoring on the last round", () => {
    const last = { ...revealGame({ teams: 2 }), roundsPlayed: ROUNDS.quick };
    const scored = withTeam(last, "t1", { sp: 5 });
    expect(checkRaft(scored)).toBe(scored);
    expect(checkWinner(scored).winnerId).toBe("t1");
    const raft = withTeam(last, "t2", { builds: ["raft1", "raft2", "raft3"] });
    expect(checkRaft(raft).winnerId).toBe("t2");
  });
});

describe("endGame", () => {
  it("from reveal: settles the hazard then the SP leader wins; idempotent", () => {
    let g = withTeam(revealGame({ teams: 3 }), "t2", { sp: 3 });
    g = { ...g, round: { ...g.round!, hazard: true } };
    const e = endGame(g, NOW);
    expect(e.phase).toBe("finished");
    expect(e.winnerId).toBe("t2");
    expect(e.log).toContain(`hazard resolved r${g.round!.n}`);
    expect(endGame(e, NOW)).toBe(e);
  });

  it("from the question phase: reveals the round first", () => {
    const g = questionGame(2);
    const e = endGame(withTeam(g, "t1", { sp: 2 }), NOW);
    expect(e.phase).toBe("finished");
    expect(e.roundsPlayed).toBe(1);
    expect(e.winnerId).toBe("t1");
  });

  it("an SP and stock tie goes to a tiebreak question; ending again decides it", () => {
    const g = revealGame({ teams: 3 });
    let s = g;
    for (const t of g.teams) s = withTeam(s, t.id, { sp: 0, stock: stock({ wood: 1 }) });
    s = withTeam(s, "t3", { sp: 0, stock: stock() });
    const e = endGame(s, NOW);
    expect(e.phase).toBe("tiebreak");
    expect(e.tiedIds).toEqual(["t1", "t2"]);
    expect(Object.keys(e.round!.questions).sort()).toEqual(["t1", "t2"]);
    const f = endGame(e, NOW);
    expect(f.phase).toBe("finished");
    expect(["t1", "t2"]).toContain(f.winnerId);
    expect(endGame(f, NOW)).toBe(f);
  });

  it("ending during a tiebreak gives it to the tied team that answered correctly", () => {
    let s = revealGame({ teams: 2 });
    for (const t of s.teams) s = withTeam(s, t.id, { sp: 1, stock: stock({ wood: 1 }) });
    const e = endGame(s, NOW);
    const right = String(e.round!.questions.t2.expected);
    const answered = submitAnswer(e, "t2", captainOf(team(e, "t2")), right, NOW + 1);
    expect(endGame(answered, NOW).winnerId).toBe("t2");
  });

  it("a raft tie found at the end (tiedIds empty before) starts the tiebreak, not final scoring", () => {
    let g = revealGame({ teams: 3 });
    const raft = ["raft1", "raft2", "raft3"] as const;
    g = withTeam(g, "t1", { builds: [...raft], sp: 3, stock: stock() });
    g = withTeam(g, "t2", { builds: [...raft], sp: 3, stock: stock() });
    g = withTeam(g, "t3", { sp: 20, stock: stock({ wood: 9 }) });
    expect(g.tiedIds).toEqual([]);
    const e = endGame(g, NOW);
    expect(e.phase).toBe("tiebreak");
    expect(e.winnerId).toBeNull();
    expect(e.tiedIds).toEqual(["t1", "t2"]);
  });

  it("a pending raft tie starts the tiebreak without final scoring", () => {
    let g = revealGame({ teams: 3 });
    const raft = ["raft1", "raft2", "raft3"] as const;
    g = withTeam(g, "t1", { builds: [...raft], sp: 3, stock: stock() });
    g = withTeam(g, "t2", { builds: [...raft], sp: 3, stock: stock() });
    g = withTeam(g, "t3", { sp: 10, stock: stock({ wood: 9 }) });
    g = checkWinner(g);
    expect(g.tiedIds).toEqual(["t1", "t2"]);
    const e = endGame(g, NOW);
    expect(e.phase).toBe("tiebreak");
    expect(e.winnerId).toBeNull();
    expect(Object.keys(e.round!.questions).sort()).toEqual(["t1", "t2"]);
  });

  it("from the lobby: finishes with no winner", () => {
    let g = createGame({ units: [11], length: "quick", timerSeconds: 60, seed: "s", code: "ABC234", now: 1 });
    g = addTeam(g, "A", "d0").g;
    const e = endGame(g, NOW);
    expect(e.phase).toBe("finished");
    expect(e.winnerId).toBeNull();
    expect(endGame(e, NOW)).toBe(e);
  });

  it("does not undo an earlier reveal", () => {
    const g = revealRound(questionGame(2));
    expect(endGame(g, NOW).roundsPlayed).toBe(g.roundsPlayed);
  });
});
