import { describe, expect, it } from "vitest";
import { UNIT_BANKS } from "@/content/units";
import { ROUNDS } from "@/lib/config";
import { simulateGame, simulateMany, summarize, type SimResult } from "@/scripts/simulate";
import { percentile, summarizeDelays } from "@/scripts/loadcheck";

/**
 * Whole-game balance checks (Task 15). Every game drives the real handlers
 * over an in-memory repo with seeded bot teams; no network.
 */

const GAMES = 200;
const seeds = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}-${i}`);

/** Exactly one winner, that winner is a real team, and nothing went negative. */
function expectSound(r: SimResult, teams: number, length: "quick" | "standard") {
  expect(r.winnerId, `seed ${r.seed}`).toMatch(/^t\d+$/);
  expect(Number(r.winnerId.slice(1)), `seed ${r.seed}`).toBeLessThanOrEqual(teams);
  expect(r.roundsPlayed, `seed ${r.seed}`).toBeGreaterThanOrEqual(1);
  expect(r.roundsPlayed, `seed ${r.seed}`).toBeLessThanOrEqual(ROUNDS[length]);
  expect(r.minResource, `seed ${r.seed}`).toBeGreaterThanOrEqual(0);
  // The raft ends the game at once; otherwise every round is played.
  if (!r.byRaft) expect(r.roundsPlayed, `seed ${r.seed}`).toBe(ROUNDS[length]);
}

describe("simulateGame", () => {
  it("is deterministic by seed", async () => {
    const opts = { teams: 5, length: "standard" as const, accuracy: 0.8, seed: "det-1" };
    const a = await simulateGame(opts);
    const b = await simulateGame(opts);
    expect(a).toEqual(b);
    const c = await simulateGame({ ...opts, seed: "det-2" });
    expect(c.actions).toBeGreaterThan(0);
  });

  it(`${GAMES} quick games of 5 teams: one winner each, at most 6 rounds, no negative resource`, async () => {
    const results = await simulateMany({ teams: 5, length: "quick", accuracy: 0.8 }, seeds("quick", GAMES));
    expect(results).toHaveLength(GAMES);
    for (const r of results) expectSound(r, 5, "quick");
    expect(Math.max(...results.map((r) => r.roundsPlayed))).toBeLessThanOrEqual(6);
  }, 60_000);

  it(`${GAMES} standard games of 5 teams at accuracy 0.8: balance targets`, async () => {
    const results = await simulateMany({ teams: 5, length: "standard", accuracy: 0.8 }, seeds("std", GAMES));
    expect(results).toHaveLength(GAMES);
    for (const r of results) expectSound(r, 5, "standard");
    expect(Math.max(...results.map((r) => r.roundsPlayed))).toBeLessThanOrEqual(11);

    const s = summarize(results);
    // At least half of standard games end by someone completing the raft.
    expect(s.raftRate).toBeGreaterThanOrEqual(0.5);
    // With equal bots, no team (by id or by zone) wins more than 60% of games.
    for (const share of Object.values(s.byId)) expect(share).toBeLessThanOrEqual(0.6);
    for (const share of Object.values(s.byZone)) expect(share).toBeLessThanOrEqual(0.6);
  }, 60_000);

  it("1-team and 8-team games finish with one winner", async () => {
    for (const teams of [1, 8]) {
      for (const length of ["quick", "standard"] as const) {
        const results = await simulateMany({ teams, length, accuracy: 0.8 }, seeds(`n${teams}-${length}`, 10));
        for (const r of results) expectSound(r, teams, length);
      }
    }
    const solo = await simulateGame({ teams: 1, length: "quick", accuracy: 0.8, seed: "solo" });
    expect(solo.winnerId).toBe("t1");
  }, 60_000);

  it("low-accuracy (0.5) and very low (0) games still finish with one winner", async () => {
    for (const accuracy of [0.5, 0]) {
      const results = await simulateMany({ teams: 5, length: "standard", accuracy }, seeds(`low${accuracy}`, 20));
      for (const r of results) expectSound(r, 5, "standard");
    }
  }, 60_000);

  it("runs over the whole question pool available", async () => {
    const units = Object.keys(UNIT_BANKS).map(Number);
    const results = await simulateMany({ teams: 5, length: "standard", accuracy: 0.8, units }, seeds("pool", 20));
    for (const r of results) expectSound(r, 5, "standard");
  }, 60_000);
});

describe("summarize", () => {
  it("computes raft rate, winner shares and the rounds histogram", () => {
    const mk = (winnerId: string, winnerZone: string, roundsPlayed: number, byRaft: boolean) =>
      ({ winnerId, winnerZone, roundsPlayed, byRaft }) as SimResult;
    const s = summarize([mk("t1", "beach", 8, true), mk("t1", "cave", 11, false), mk("t2", "beach", 9, true), mk("t3", "hills", 11, false)]);
    expect(s.games).toBe(4);
    expect(s.raftRate).toBe(0.5);
    expect(s.byId).toEqual({ t1: 0.5, t2: 0.25, t3: 0.25 });
    expect(s.byZone).toEqual({ beach: 0.5, cave: 0.25, hills: 0.25 });
    expect(s.meanRounds).toBe(9.75);
    expect(s.roundsHist).toEqual({ 8: 1, 9: 1, 11: 2 });
  });
});

describe("loadcheck helpers", () => {
  it("percentile uses nearest rank on a sorted copy", () => {
    const v = [5, 1, 4, 2, 3];
    expect(percentile(v, 50)).toBe(3);
    expect(percentile(v, 95)).toBe(5);
    expect(percentile(v, 100)).toBe(5);
    expect(percentile(v, 0)).toBe(1);
    expect(percentile([7], 95)).toBe(7);
    expect(v).toEqual([5, 1, 4, 2, 3]);
    expect(Number.isNaN(percentile([], 50))).toBe(true);
    const hundred = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(hundred, 95)).toBe(95);
    expect(percentile(hundred, 50)).toBe(50);
  });

  it("summarizeDelays reports p50, p95, max and pass/fail against 3 s", () => {
    expect(summarizeDelays([100, 200, 300, 400])).toEqual({ count: 4, p50: 200, p95: 400, max: 400, ok: true });
    const slow = summarizeDelays([...Array(19).fill(500), 3500]);
    expect(slow.ok).toBe(true); // p95 of 20 values is the 19th
    const slower = summarizeDelays([...Array(18).fill(500), 3500, 3600]);
    expect(slower.p95).toBe(3500);
    expect(slower.ok).toBe(false);
    expect(summarizeDelays([]).ok).toBe(false);
    expect(summarizeDelays([3000]).ok).toBe(true);
  });
});
