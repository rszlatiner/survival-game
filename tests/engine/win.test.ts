import { describe, it, expect } from "vitest";
import { ROUNDS } from "@/lib/config";
import { contribute } from "@/lib/engine/hazard";
import { revealRound, startRound } from "@/lib/engine/round";
import { checkWinner, endRoundIfLast, finishTiebreak, startTiebreak } from "@/lib/engine/win";
import type { BuildId, GameState, Stock } from "@/lib/types";
import { captainOf, errCode, revealGame, startedGame, submitAnswer, withTeam } from "../helpers/game";

const stock = (s: Partial<Stock> = {}): Stock => ({ water: 0, food: 0, wood: 0, stone: 0, ...s });
const frozen = <T,>(x: T) => JSON.stringify(x);
const team = (g: GameState, id: string) => g.teams.find((t) => t.id === id)!;
const RAFT: BuildId[] = ["raft1", "raft2", "raft3"];
const LAST = ROUNDS.quick;
const T = 500_000;

/** Reveal phase of round 1 with every team at SP 0 and stock `s`. */
function revealed(teams: number, s: Stock = stock({ water: 2, food: 2, wood: 2, stone: 2 }), seed = "s1"): GameState {
  let g = revealGame({ teams, seed });
  for (const t of g.teams) g = withTeam(g, t.id, { stock: s, sp: 0 });
  return g;
}

/** Same, but the final round has just been revealed. */
function lastReveal(teams: number, s?: Stock, seed?: string): GameState {
  return { ...revealed(teams, s, seed), roundsPlayed: LAST };
}

/** Last round revealed with the given SP per team (t1, t2, ...), then checkWinner. */
function tiedAt(sps: number[], seed?: string): GameState {
  let g = lastReveal(sps.length, undefined, seed);
  sps.forEach((sp, i) => (g = withTeam(g, `t${i + 1}`, { sp })));
  return checkWinner(g);
}

/** Captain of `tid` answers the tiebreak question right or wrong. */
function answer(g: GameState, tid: string, right: boolean): GameState {
  const expected = String(g.round!.questions[tid].expected);
  return submitAnswer(g, tid, captainOf(team(g, tid)), right ? expected : "definitely wrong", T + 1);
}

describe("checkWinner: raft", () => {
  it("ends the game immediately when a team has raft3", () => {
    const g = withTeam(revealed(3), "t2", { builds: ["shelter", ...RAFT] });
    const before = frozen(g);
    const n = checkWinner(g);
    expect(frozen(g)).toBe(before);
    expect(n.version).toBe(g.version + 1);
    expect(n.winnerId).toBe("t2");
    expect(n.phase).toBe("finished");
    expect(n.tiedIds).toEqual([]);
    expect(n.log[n.log.length - 1]).toBe("winner t2");
  });

  it("raft1 and raft2 alone do not finish", () => {
    const g = withTeam(revealed(2), "t1", { builds: ["raft1", "raft2"] });
    expect(checkWinner(g)).toBe(g);
  });

  it("two simultaneous finishers: more SP wins, even if a non-finisher has more", () => {
    let g = revealed(3);
    g = withTeam(g, "t1", { builds: RAFT, sp: 4 });
    g = withTeam(g, "t2", { builds: RAFT, sp: 5 });
    g = withTeam(g, "t3", { sp: 9 });
    expect(checkWinner(g).winnerId).toBe("t2");
  });

  it("two simultaneous finishers with equal SP: more stock wins", () => {
    let g = revealed(2);
    g = withTeam(g, "t1", { builds: RAFT, sp: 3, stock: stock({ wood: 4 }) });
    g = withTeam(g, "t2", { builds: RAFT, sp: 3, stock: stock({ wood: 3 }) });
    expect(checkWinner(g).winnerId).toBe("t1");
  });

  it("two simultaneous finishers with equal SP and stock go to tiedIds", () => {
    let g = revealed(3);
    g = withTeam(g, "t1", { builds: RAFT, sp: 3 });
    g = withTeam(g, "t3", { builds: RAFT, sp: 3 });
    const n = checkWinner(g);
    expect(n.winnerId).toBeNull();
    expect(n.tiedIds).toEqual(["t1", "t3"]);
    expect(n.phase).toBe("reveal");
    expect(n.version).toBe(g.version + 1);
    expect(checkWinner(n)).toBe(n);
  });
});

describe("checkWinner: last round", () => {
  it("does nothing before the last round", () => {
    let g = revealed(2);
    g = withTeam(g, "t1", { sp: 5 });
    expect(checkWinner(g)).toBe(g);
  });

  it("does nothing outside reveal even after the last round", () => {
    const g = { ...lastReveal(2), phase: "question" as const };
    expect(checkWinner(g)).toBe(g);
  });

  it("highest SP wins: 5 beats 4", () => {
    const n = tiedAt([4, 5]);
    expect(n.winnerId).toBe("t2");
    expect(n.phase).toBe("finished");
    expect(n.log).toContain("winner t2");
  });

  it("equal top SP goes to tiedIds with phase still reveal", () => {
    const n = tiedAt([5, 5, 4]);
    expect(n.winnerId).toBeNull();
    expect(n.tiedIds).toEqual(["t1", "t2"]);
    expect(n.phase).toBe("reveal");
  });

  it("is idempotent", () => {
    const won = tiedAt([4, 5]);
    expect(checkWinner(won)).toBe(won);
    const tied = tiedAt([5, 5]);
    expect(checkWinner(tied)).toBe(tied);
    const finished = { ...revealed(2), phase: "finished" as const };
    expect(checkWinner(finished)).toBe(finished);
  });
});

describe("tiebreak", () => {
  it("startTiebreak opens a one-question round for the tied teams only", () => {
    const g = tiedAt([5, 5, 4]);
    const before = frozen(g);
    const n = startTiebreak(g, T);
    expect(frozen(g)).toBe(before);
    expect(n.version).toBe(g.version + 1);
    expect(n.phase).toBe("tiebreak");
    expect(n.roundsPlayed).toBe(LAST);
    expect(Object.keys(n.round!.questions).sort()).toEqual(["t1", "t2"]);
    expect(n.round).toMatchObject({
      n: LAST + 1,
      startedAt: T,
      endsAt: T + g.timerSeconds * 1000,
      roll: 0,
      bonusResource: null,
      raider: false,
      hazard: false,
      submissions: {},
      suggestions: {},
    });
  });

  it("startTiebreak needs at least 2 tied teams in reveal", () => {
    expect(errCode(() => startTiebreak(lastReveal(2), T))).toBe("WRONG_PHASE");
    expect(errCode(() => startTiebreak({ ...lastReveal(2), tiedIds: ["t1"] }, T))).toBe("WRONG_PHASE");
    const tied = tiedAt([5, 5]);
    expect(errCode(() => startTiebreak({ ...tied, phase: "question" }, T))).toBe("WRONG_PHASE");
  });

  it("startTiebreak throws NO_QUESTIONS when the units have no templates", () => {
    const tied = tiedAt([5, 5]);
    expect(errCode(() => startTiebreak({ ...tied, units: [5] }, T))).toBe("NO_QUESTIONS");
  });

  it("submitAnswer accepts tied captains only during a tiebreak", () => {
    const g = startTiebreak(tiedAt([5, 5, 4]), T);
    const t3 = team(g, "t3");
    expect(errCode(() => submitAnswer(g, "t3", captainOf(t3), "1", T + 1))).toBe("NOT_FOUND");
    const s = answer(g, "t1", true);
    expect(s.version).toBe(g.version + 1);
    expect(s.round!.submissions.t1.answer).toBe(String(g.round!.questions.t1.expected));
    expect(errCode(() => answer(s, "t1", true))).toBe("ALREADY_SUBMITTED");
  });

  it("one correct team wins, even with less stock", () => {
    let g = tiedAt([5, 5]);
    g = withTeam(g, "t1", { stock: stock({ wood: 9 }) });
    g = startTiebreak(g, T);
    g = answer(answer(g, "t1", false), "t2", true);
    const before = frozen(g);
    const n = finishTiebreak(g);
    expect(frozen(g)).toBe(before);
    expect(n.version).toBe(g.version + 1);
    expect(n.winnerId).toBe("t2");
    expect(n.phase).toBe("finished");
    expect(n.tiedIds).toEqual([]);
    expect(n.log[n.log.length - 1]).toBe("winner t2");
    expect(n.round!.submissions.t1.correct).toBe(false);
    expect(n.round!.submissions.t2.correct).toBe(true);
    expect(finishTiebreak(n)).toBe(n);
  });

  it("nobody correct (or nobody answering): highest stock among tied teams wins", () => {
    let g = tiedAt([5, 5, 4]);
    g = withTeam(g, "t2", { stock: stock({ food: 9 }) });
    g = withTeam(g, "t3", { stock: stock({ food: 50 }) });
    g = startTiebreak(g, T);
    expect(finishTiebreak(answer(g, "t1", false)).winnerId).toBe("t2");
    expect(finishTiebreak(g).winnerId).toBe("t2");
  });

  it("several correct: highest stock among the correct teams wins", () => {
    let g = tiedAt([5, 5, 5]);
    g = withTeam(g, "t1", { stock: stock({ stone: 9 }) });
    g = withTeam(g, "t3", { stock: stock({ stone: 20 }) });
    g = startTiebreak(g, T);
    g = answer(answer(answer(g, "t1", true), "t2", true), "t3", false);
    expect(finishTiebreak(g).winnerId).toBe("t1");
  });

  it("still tied on stock: a seeded pick, deterministic and varying by seed", () => {
    const winners = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const g = answer(answer(startTiebreak(tiedAt([5, 5], `seed${i}`), T), "t1", true), "t2", true);
      const w = finishTiebreak(g).winnerId!;
      expect(["t1", "t2"]).toContain(w);
      expect(finishTiebreak(g).winnerId).toBe(w);
      winners.add(w);
    }
    expect(winners.size).toBe(2);
  });

  it("finishTiebreak rejects other phases", () => {
    expect(errCode(() => finishTiebreak(tiedAt([5, 5])))).toBe("WRONG_PHASE");
  });
});

describe("endRoundIfLast", () => {
  it("does nothing before the last round or outside reveal", () => {
    const g = withTeam(revealed(2), "t1", { sp: 3 });
    expect(endRoundIfLast(g)).toBe(g);
    const q = { ...lastReveal(2), phase: "question" as const };
    expect(endRoundIfLast(q)).toBe(q);
  });

  it("resolves an unresolved hazard, then picks the winner", () => {
    let g = lastReveal(2, stock({ water: 5 }));
    g = { ...g, round: { ...g.round!, hazard: true } };
    g = withTeam(g, "t1", { sp: 2 });
    g = withTeam(g, "t2", { sp: 2 });
    g = contribute(contribute(g, "t1", "water", 2), "t2", "water", 2);
    const n = endRoundIfLast(g);
    expect(n.log).toContain(`hazard resolved r${g.round!.n}`);
    expect(team(n, "t1").sp).toBe(3);
    expect(n.winnerId).toBe("t1");
    expect(n.phase).toBe("finished");
    expect(endRoundIfLast(n)).toBe(n);
  });

  it("works after a full game played with the real engine", () => {
    let g = startedGame(1);
    for (let r = 1; r <= LAST; r++) g = revealRound(startRound(g, r * 100_000));
    expect(g.roundsPlayed).toBe(LAST);
    const n = endRoundIfLast(g);
    expect(n.winnerId).toBe("t1");
    expect(n.phase).toBe("finished");
  });
});

describe("teams 1..8", () => {
  it("checkWinner, endRoundIfLast and the tiebreak never crash", () => {
    for (let k = 1; k <= 8; k++) {
      let g = endRoundIfLast(lastReveal(k));
      expect(checkWinner(g)).toBe(g);
      if (k === 1) {
        expect(g.winnerId).toBe("t1");
        continue;
      }
      expect(g.tiedIds).toHaveLength(k);
      g = startTiebreak(g, T);
      g = answer(g, "t1", false);
      g = finishTiebreak(g);
      expect(g.phase).toBe("finished");
      expect(g.winnerId).not.toBeNull();
      expect(g.teams).toHaveLength(k);
    }
  });
});
