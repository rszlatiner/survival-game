import { describe, it, expect, vi } from "vitest";
import * as generate from "@/lib/questions/generate";
import { GameError, createGame, addTeam, joinTeam, startGame, captainOf, setCaptain } from "@/lib/engine/game";
import { startRound, submitAnswer, revealRound, nextAllowed, rollFor, outcomeForRoll } from "@/lib/engine/round";
import { YIELD, ZONES } from "@/lib/config";
import type { GameState } from "@/lib/types";

const T0 = 10_000;

function started(teams = 2, seed = "s1", length: "quick" | "standard" = "quick"): GameState {
  let g = createGame({ units: [11], length, timerSeconds: 60, seed, code: "ABC234", now: 1000 });
  for (let i = 0; i < teams; i++) g = addTeam(g, `Team ${i + 1}`, `d${i}`).g;
  return startGame(g);
}
function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof GameError ? e.code : "OTHER";
  }
  return undefined;
}
const frozen = <T,>(x: T): string => JSON.stringify(x);
const ansOf = (g: GameState, tid: string) => String(g.round!.questions[tid].expected);

/** Play round to reveal with every team answering correctly. */
function playRound(g: GameState, now: number, correct = true): GameState {
  let s = startRound(g, now);
  for (const t of s.teams) {
    s = submitAnswer(s, t.id, captainOf(t), correct ? ansOf(s, t.id) : "definitely wrong", now + 1);
  }
  return revealRound(s);
}

describe("rollFor / outcomeForRoll", () => {
  it("is deterministic and in 1..6, and all six values occur", () => {
    const seen = new Set<number>();
    for (let n = 1; n <= 200; n++) {
      const r = rollFor("seed", n);
      expect(r).toBe(rollFor("seed", n));
      expect(Number.isInteger(r) && r >= 1 && r <= 6).toBe(true);
      seen.add(r);
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it("maps rolls to outcomes", () => {
    expect(outcomeForRoll(1)).toEqual({ bonusResource: "water", raider: false });
    expect(outcomeForRoll(2)).toEqual({ bonusResource: "food", raider: false });
    expect(outcomeForRoll(3)).toEqual({ bonusResource: "wood", raider: false });
    expect(outcomeForRoll(4)).toEqual({ bonusResource: "stone", raider: false });
    expect(outcomeForRoll(5)).toEqual({ bonusResource: null, raider: false });
    expect(outcomeForRoll(6)).toEqual({ bonusResource: null, raider: true });
  });
});

describe("startRound", () => {
  it("opens round 1 in question phase with a roll, timer and one question per team", () => {
    const g = started(3);
    const s = startRound(g, T0);
    expect(s.phase).toBe("question");
    expect(s.version).toBe(g.version + 1);
    const r = s.round!;
    expect(r.n).toBe(1);
    expect(r.startedAt).toBe(T0);
    expect(r.endsAt).toBe(T0 + 60_000);
    expect(r.roll).toBe(rollFor("s1", 1));
    expect(r.hazard).toBe(false);
    expect(Object.keys(r.questions).sort()).toEqual(["t1", "t2", "t3"]);
    expect(r.submissions).toEqual({});
    expect(r.suggestions).toEqual({});
  });
  it("same seed and round number give the same roll and state", () => {
    expect(frozen(startRound(started(2), T0))).toBe(frozen(startRound(started(2), T0)));
  });
  it("is pure", () => {
    const g = started(2);
    const before = frozen(g);
    startRound(g, T0);
    expect(frozen(g)).toBe(before);
  });
  it("throws during question phase, before game start, and when the game is finished", () => {
    const g = startRound(started(2), T0);
    expect(code(() => startRound(g, T0 + 1))).toBe("WRONG_PHASE");
    let lobby = createGame({ units: [11], length: "quick", timerSeconds: 60, seed: "s", code: "ABC234", now: 1 });
    lobby = addTeam(lobby, "A", "d0").g;
    expect(code(() => startRound(lobby, T0))).toBe("WRONG_PHASE");
    expect(code(() => startRound({ ...revealRound(g), phase: "finished" }, T0))).toBe("WRONG_PHASE");
  });
  it("throws when all rounds are played", () => {
    let g = started(1);
    for (let i = 0; i < 6; i++) g = playRound(g, T0 + i * 1000);
    expect(g.roundsPlayed).toBe(6);
    expect(code(() => startRound(g, T0))).toBe("WRONG_PHASE");
  });
  it("throws NO_QUESTIONS when no unit has ready templates", () => {
    // Every unit now has a bank, so simulate a unit with none: the picker finds nothing.
    let g = createGame({ units: [15], length: "quick", timerSeconds: 60, seed: "s", code: "ABC234", now: 1 });
    g = startGame(addTeam(g, "A", "d0").g);
    const spy = vi.spyOn(generate, "pickTemplates").mockReturnValue([]);
    try {
      expect(code(() => startRound(g, T0))).toBe("NO_QUESTIONS");
    } finally {
      spy.mockRestore();
    }
  });
  it("sets hazard on rounds 4 and 8 only", () => {
    let g = started(1, "s1", "standard");
    const hazards: number[] = [];
    for (let n = 1; n <= 8; n++) {
      g = startRound(g, T0 + n * 1000);
      if (g.round!.hazard) hazards.push(g.round!.n);
      g = revealRound(g);
    }
    expect(hazards).toEqual([4, 8]);
  });
  it("applies the roll outcome to the round", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"]) {
      const r = startRound(started(1, seed), T0).round!;
      expect({ bonusResource: r.bonusResource, raider: r.raider }).toEqual(outcomeForRoll(r.roll));
    }
  });
  it("rotates captains from round 2, wrapping, overriding setCaptain; 1-device team stays 0", () => {
    let g = started(2);
    g = joinTeam(joinTeam(g, "t1", "x1"), "t1", "x2"); // t1 has 3 devices
    g = playRound(g, T0);
    expect(g.teams.map((t) => t.captainIndex)).toEqual([0, 0]);
    g = startRound(g, T0 + 5000);
    expect(g.teams.map((t) => t.captainIndex)).toEqual([1, 0]);
    g = revealRound(g);
    g = setCaptain(g, "t1", 0); // manual override is itself overridden next round
    g = startRound(g, T0 + 9000);
    expect(g.teams[0].captainIndex).toBe(1);
    g = revealRound(g);
    g = setCaptain(g, "t1", 2);
    g = startRound(g, T0 + 12000);
    expect(g.teams[0].captainIndex).toBe(0);
  });
  it("gives different teams different prompts in the same round", () => {
    const g = startRound(started(4), T0);
    const qs = Object.values(g.round!.questions);
    const ids = new Set(qs.map((q) => q.publicQ.templateId));
    expect(ids.size).toBe(1); // same template for every team
    const prompts = new Set(qs.map((q) => q.publicQ.prompt));
    expect(prompts.size).toBeGreaterThan(1);
  });
});

describe("submitAnswer", () => {
  const open = () => {
    let g = started(2);
    g = joinTeam(g, "t1", "mate");
    return startRound(g, T0);
  };
  it("accepts the captain before endsAt and trims", () => {
    const g = open();
    const s = submitAnswer(g, "t1", "d0", "  42 ", T0 + 5);
    expect(s.round!.submissions.t1).toEqual({ answer: "42", deviceId: "d0", at: T0 + 5 });
    expect(s.version).toBe(g.version + 1);
  });
  it("rejects a non-captain before endsAt, accepts after", () => {
    const g = open();
    expect(code(() => submitAnswer(g, "t1", "mate", "1", T0 + 59_999))).toBe("NOT_CAPTAIN");
    const s = submitAnswer(g, "t1", "mate", "1", g.round!.endsAt);
    expect(s.round!.submissions.t1.deviceId).toBe("mate");
  });
  it("rejects unknown device or team", () => {
    const g = open();
    expect(code(() => submitAnswer(g, "t1", "d1", "1", T0 + 1))).toBe("NOT_FOUND");
    expect(code(() => submitAnswer(g, "nope", "d0", "1", T0 + 1))).toBe("NOT_FOUND");
  });
  it("throws ALREADY_SUBMITTED on a second submission and leaves state unchanged", () => {
    const g = submitAnswer(open(), "t1", "d0", "1", T0 + 1);
    const before = frozen(g);
    expect(code(() => submitAnswer(g, "t1", "d0", "2", T0 + 2))).toBe("ALREADY_SUBMITTED");
    expect(code(() => submitAnswer(g, "t1", "mate", "2", T0 + 70_000))).toBe("ALREADY_SUBMITTED");
    expect(frozen(g)).toBe(before);
    expect(g.round!.submissions.t1.answer).toBe("1");
  });
  it("requires question phase", () => {
    const g = revealRound(open());
    expect(code(() => submitAnswer(g, "t1", "d0", "1", T0 + 1))).toBe("WRONG_PHASE");
  });
  it("does not throw on odd input", () => {
    const g = open();
    const long = "x".repeat(200);
    expect(submitAnswer(g, "t1", "d0", long, T0 + 1).round!.submissions.t1.answer).toBe(long);
    expect(submitAnswer(g, "t1", "d0", "", T0 + 1).round!.submissions.t1.answer).toBe("");
  });
  it("is pure", () => {
    const g = open();
    const before = frozen(g);
    submitAnswer(g, "t1", "d0", "1", T0 + 1);
    expect(frozen(g)).toBe(before);
  });
});

describe("revealRound", () => {
  /** Find a seed where round 1's bonus resource matches (or not) team t1's question resource. */
  function scenario(wantBonus: boolean): GameState {
    for (let i = 0; i < 300; i++) {
      const s = startRound(started(1, `bx${i}`), T0);
      const q = s.round!.questions.t1.publicQ;
      if ((s.round!.bonusResource === q.resource) === wantBonus) return s;
    }
    throw new Error("no scenario");
  }
  it("correct answer yields YIELD[difficulty] (plus 1 on the bonus resource)", () => {
    for (const bonus of [false, true]) {
      const s = scenario(bonus);
      const q = s.round!.questions.t1.publicQ;
      const before = s.teams[0].stock[q.resource];
      const catchUp = ZONES[s.teams[0].zone].easy[0] === q.resource ? 1 : 0;
      const r = revealRound(submitAnswer(s, "t1", "d0", ansOf(s, "t1"), T0 + 1));
      expect(r.round!.submissions.t1.correct).toBe(true);
      expect(r.teams[0].stock[q.resource] - before).toBe(YIELD[q.difficulty] + (bonus ? 1 : 0) + catchUp);
    }
  });
  it("difficulty 3 correct gives 4, or 5 on the bonus resource", () => {
    let found = 0;
    for (let i = 0; i < 400 && found < 2; i++) {
      let g = started(1, `d3${i}`);
      for (let k = 0; k < 5; k++) g = playRound(g, T0 + k * 1000);
      const s = startRound(g, T0 + 9000);
      const q = s.round!.questions.t1.publicQ;
      if (q.difficulty !== 3) continue;
      const bonus = s.round!.bonusResource === q.resource;
      const catchUp = ZONES[s.teams[0].zone].easy[0] === q.resource ? 1 : 0;
      const before = s.teams[0].stock[q.resource];
      const r = revealRound(submitAnswer(s, "t1", "d0", ansOf(s, "t1"), T0 + 9001));
      expect(r.teams[0].stock[q.resource] - before).toBe((bonus ? 5 : 4) + catchUp);
      found++;
    }
    expect(found).toBeGreaterThan(0);
  });
  it("wrong answer yields nothing but is marked incorrect", () => {
    const s = startRound(started(2), T0);
    const r = revealRound(submitAnswer(s, "t1", "d0", "definitely wrong", T0 + 1));
    expect(r.round!.submissions.t1.correct).toBe(false);
    const res = s.round!.questions.t1.publicQ.resource;
    // t1 and t2 start equal; one catch-up goes to t1 (lowest id), so only that resource may rise.
    const gain = r.teams[0].stock[res] - s.teams[0].stock[res];
    expect(gain).toBe(ZONES[s.teams[0].zone].easy[0] === res ? 1 : 0);
  });
  it("zero submissions: no throw, no entries, only the catch-up bonus", () => {
    const s = startRound(started(3), T0);
    const r = revealRound(s);
    expect(r.phase).toBe("reveal");
    expect(r.roundsPlayed).toBe(1);
    expect(r.round!.submissions).toEqual({});
    const total = (t: GameState["teams"][number]) => Object.values(t.stock).reduce((a, b) => a + b, 0);
    const diffs = r.teams.map((t, i) => total(t) - total(s.teams[i]));
    expect(diffs).toEqual([1, 0, 0]);
    const z = ZONES[s.teams[0].zone].easy[0];
    expect(r.teams[0].stock[z]).toBe(s.teams[0].stock[z] + 1);
  });
  it("catch-up goes to the lowest SP team", () => {
    let s = startRound(started(3), T0);
    s = { ...s, teams: s.teams.map((t, i) => ({ ...t, sp: [3, 1, 2][i] })) };
    const r = revealRound(s);
    const z = ZONES[s.teams[1].zone].easy[0];
    expect(r.teams[1].stock[z]).toBe(s.teams[1].stock[z] + 1);
    expect(r.teams[0].stock).toEqual(s.teams[0].stock);
    expect(r.teams[2].stock).toEqual(s.teams[2].stock);
  });
  it("ties on SP go to lowest total stock, then lowest team id", () => {
    let s = startRound(started(3), T0);
    s = { ...s, teams: s.teams.map((t, i) => ({ ...t, sp: 1, stock: { ...t.stock, wood: [5, 3, 3][i] } })) };
    const r = revealRound(s);
    const z = ZONES[s.teams[1].zone].easy[0]; // t2 and t3 tie on stock; t2 has lower id
    expect(r.teams[1].stock[z]).toBe(s.teams[1].stock[z] + 1);
    expect(r.teams[2].stock).toEqual(s.teams[2].stock);
    expect(r.teams[0].stock).toEqual(s.teams[0].stock);
  });
  it("picks the catch-up team from pre-harvest stock", () => {
    // t1 has lowest stock before harvest but harvests a lot; it must still get the bonus.
    let s = startRound(started(2, "ph"), T0);
    s = { ...s, teams: s.teams.map((t, i) => ({ ...t, sp: 0, stock: { ...t.stock, wood: i === 0 ? 0 : 9 } })) };
    const q = s.round!.questions.t1.publicQ;
    const before = s.teams[0].stock[q.resource];
    const r = revealRound(submitAnswer(s, "t1", "d0", ansOf(s, "t1"), T0 + 1));
    const catchUp = ZONES[s.teams[0].zone].easy[0] === q.resource ? 1 : 0;
    expect(r.teams[0].stock[q.resource] - before).toBeGreaterThanOrEqual(YIELD[q.difficulty] + catchUp);
    expect(r.teams[1].stock).toEqual(s.teams[1].stock); // t2 (rich) gets no catch-up
  });
  it("revealing twice equals revealing once", () => {
    const s = submitAnswer(startRound(started(2), T0), "t1", "d0", "7", T0 + 1);
    const once = revealRound(s);
    const twice = revealRound(once);
    expect(twice).toBe(once);
    expect(frozen(twice)).toBe(frozen(once));
  });
  it("throws outside question/reveal phases", () => {
    expect(code(() => revealRound(started(1)))).toBe("WRONG_PHASE");
  });
  it("is pure and bumps version", () => {
    const s = startRound(started(2), T0);
    const before = frozen(s);
    const r = revealRound(s);
    expect(frozen(s)).toBe(before);
    expect(r.version).toBe(s.version + 1);
    expect(r.roundsPlayed).toBe(1);
  });
  it("allows the next round after reveal", () => {
    const g = playRound(started(2), T0);
    expect(startRound(g, T0 + 9000).round!.n).toBe(2);
  });
});

describe("nextAllowed", () => {
  it("is false in question and finished, true in reveal and started lobby", () => {
    const g = started(1);
    expect(nextAllowed(g)).toBe(true);
    const q = startRound(g, T0);
    expect(nextAllowed(q)).toBe(false);
    expect(nextAllowed(revealRound(q))).toBe(true);
    expect(nextAllowed({ ...q, phase: "finished" })).toBe(false);
  });
  it("is false in an unstarted lobby", () => {
    const g = createGame({ units: [11], length: "quick", timerSeconds: 60, seed: "s", code: "ABC234", now: 1 });
    expect(nextAllowed(g)).toBe(false);
  });
});
