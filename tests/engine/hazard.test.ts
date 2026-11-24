import { describe, it, expect } from "vitest";
import { HAZARD_THRESHOLD_PER_TEAM } from "@/lib/config";
import { contribute, resolveHazard, resolveRaider } from "@/lib/engine/hazard";
import type { GameState, Stock } from "@/lib/types";
import { errCode, questionGame, revealGame, withTeam } from "../helpers/game";

const stock = (s: Partial<Stock> = {}): Stock => ({ water: 0, food: 0, wood: 0, stone: 0, ...s });
const frozen = <T,>(x: T) => JSON.stringify(x);
const team = (g: GameState, id: string) => g.teams.find((t) => t.id === id)!;
const fundTotal = (g: GameState) => g.fund.water + g.fund.food + g.fund.wood + g.fund.stone;

/** Reveal-phase game with every team's stock set to `s`, and the round flags patched. */
function revealed(
  teams: number,
  s: Stock = stock({ water: 5, food: 3, wood: 1, stone: 0 }),
  flags: { hazard?: boolean; raider?: boolean } = {},
): GameState {
  let g = revealGame({ teams });
  for (const t of g.teams) g = withTeam(g, t.id, { stock: s, sp: 0, fundGiven: 0 });
  return { ...g, round: { ...g.round!, hazard: !!flags.hazard, raider: !!flags.raider } };
}

/** Contribute `units` water spread across the teams, one at a time from team 1 onward. */
function pool(g: GameState, units: number): GameState {
  let s = g;
  for (let i = 0; i < units; i++) s = contribute(s, s.teams[i % s.teams.length].id, "water", 1);
  return s;
}

describe("contribute", () => {
  it("moves stock into the fund and records fundGiven, without mutating", () => {
    const g = revealed(2);
    const before = frozen(g);
    const n = contribute(g, "t1", "water", 3);
    expect(frozen(g)).toBe(before);
    expect(n.version).toBe(g.version + 1);
    expect(team(n, "t1").stock).toEqual(stock({ water: 2, food: 3, wood: 1 }));
    expect(team(n, "t1").fundGiven).toBe(3);
    expect(n.fund).toEqual(stock({ water: 3 }));
    expect(team(n, "t2")).toBe(team(g, "t2"));
    const m = contribute(n, "t1", "food", 2);
    expect(team(m, "t1").fundGiven).toBe(5);
    expect(m.fund).toEqual(stock({ water: 3, food: 2 }));
  });

  it("rejects contributing more than held, bad amounts, unknown teams and wrong phase", () => {
    const g = revealed(2);
    expect(errCode(() => contribute(g, "t1", "wood", 2))).toBe("CANNOT_AFFORD");
    expect(errCode(() => contribute(g, "t1", "stone", 1))).toBe("CANNOT_AFFORD");
    expect(errCode(() => contribute(g, "t1", "water", 0))).toBe("BAD_AMOUNT");
    expect(errCode(() => contribute(g, "t1", "water", -1))).toBe("BAD_AMOUNT");
    expect(errCode(() => contribute(g, "t1", "water", 1.5))).toBe("BAD_AMOUNT");
    expect(errCode(() => contribute(g, "t9", "water", 1))).toBe("NOT_FOUND");
    expect(errCode(() => contribute(questionGame(), "t1", "water", 1))).toBe("WRONG_PHASE");
  });
});

describe("resolveHazard", () => {
  it("does nothing when the round has no hazard", () => {
    const g = revealed(2);
    expect(resolveHazard(g)).toBe(g);
    const noRound = { ...g, round: null };
    expect(resolveHazard(noRound)).toBe(noRound);
  });

  it("with 5 teams 9 units fails: every team loses 2 of its largest stock", () => {
    const g = pool(revealed(5, undefined, { hazard: true }), 9);
    expect(fundTotal(g)).toBe(9);
    const n = resolveHazard(g);
    expect(n.version).toBe(g.version + 1);
    for (const t of n.teams) {
      const old = team(g, t.id);
      expect(t.stock).toEqual({ ...old.stock, water: old.stock.water - 2 });
      expect(t.sp).toBe(0);
      expect(t.fundGiven).toBe(0);
    }
    expect(n.fund).toEqual(stock());
  });

  it("with 5 teams 10 units passes: the top contributor gains 1 SP", () => {
    let g = revealed(5, undefined, { hazard: true });
    g = contribute(g, "t3", "water", 4);
    g = contribute(g, "t1", "water", 3);
    g = contribute(g, "t5", "food", 3);
    expect(fundTotal(g)).toBe(5 * HAZARD_THRESHOLD_PER_TEAM);
    const n = resolveHazard(g);
    expect(team(n, "t3").sp).toBe(1);
    for (const id of ["t1", "t2", "t4", "t5"]) expect(team(n, id).sp).toBe(0);
    for (const t of n.teams) {
      expect(t.fundGiven).toBe(0);
      expect(t.stock).toEqual(team(g, t.id).stock);
    }
    expect(n.fund).toEqual(stock());
  });

  it("with 1 team the threshold is 2", () => {
    const g = revealed(1, undefined, { hazard: true });
    const fail = resolveHazard(contribute(g, "t1", "water", 1));
    expect(team(fail, "t1").stock.water).toBe(5 - 1 - 2);
    expect(team(fail, "t1").sp).toBe(0);
    const pass = resolveHazard(contribute(g, "t1", "water", 2));
    expect(team(pass, "t1").stock.water).toBe(3);
    expect(team(pass, "t1").sp).toBe(1);
  });

  it("breaks top-contributor ties by lowest SP then lowest id; no bonus if nobody gave", () => {
    let g = revealed(3, undefined, { hazard: true });
    g = withTeam(g, "t1", { sp: 4 });
    g = contribute(contribute(contribute(g, "t1", "water", 2), "t2", "water", 2), "t3", "water", 2);
    const n = resolveHazard(g);
    expect([1, 2, 3].map((i) => team(n, `t${i}`).sp)).toEqual([4, 1, 0]);

    const z = revealed(1, undefined, { hazard: true });
    const zz = resolveHazard({ ...z, fund: stock({ wood: 5 }) });
    expect(team(zz, "t1").sp).toBe(0);
    expect(zz.fund).toEqual(stock());
  });

  it("loss uses RESOURCES order on ties, never goes below 0", () => {
    let g = revealed(3, undefined, { hazard: true });
    g = withTeam(g, "t1", { stock: stock({ water: 3, wood: 3 }) });
    g = withTeam(g, "t2", { stock: stock({ stone: 1 }) });
    g = withTeam(g, "t3", { stock: stock() });
    const n = resolveHazard(g);
    expect(team(n, "t1").stock).toEqual(stock({ water: 1, wood: 3 }));
    expect(team(n, "t2").stock).toEqual(stock());
    expect(team(n, "t3").stock).toEqual(stock());
  });

  it("is idempotent per round: a second call returns the same object", () => {
    const g = pool(revealed(2, undefined, { hazard: true }), 1);
    const once = resolveHazard(g);
    expect(once.log).toContain(`hazard resolved r${g.round!.n}`);
    expect(resolveHazard(once)).toBe(once);
    const passed = resolveHazard(pool(revealed(2, undefined, { hazard: true }), 4));
    expect(resolveHazard(passed)).toBe(passed);
  });

  it("is pure", () => {
    const g = pool(revealed(3, undefined, { hazard: true }), 2);
    const before = frozen(g);
    resolveHazard(g);
    expect(frozen(g)).toBe(before);
  });

  it("rejects a hazard round outside reveal", () => {
    const q = questionGame();
    expect(errCode(() => resolveHazard({ ...q, round: { ...q.round!, hazard: true } }))).toBe("WRONG_PHASE");
  });
});

describe("resolveRaider", () => {
  it("does nothing when the round has no raider", () => {
    const g = revealed(2);
    expect(resolveRaider(g)).toBe(g);
  });

  it("hits only the SP leader, taking 2 of its largest stock", () => {
    let g = revealed(3, undefined, { raider: true });
    g = withTeam(g, "t2", { sp: 3, stock: stock({ wood: 6, stone: 1 }) });
    g = withTeam(g, "t3", { sp: 1 });
    const before = frozen(g);
    const n = resolveRaider(g);
    expect(frozen(g)).toBe(before);
    expect(n.version).toBe(g.version + 1);
    expect(team(n, "t2").stock).toEqual(stock({ wood: 4, stone: 1 }));
    expect(team(n, "t1")).toBe(team(g, "t1"));
    expect(team(n, "t3")).toBe(team(g, "t3"));
    expect(n.log).toContain(`raider resolved r${g.round!.n}`);
  });

  it("breaks SP ties by highest total stock, then lowest id", () => {
    let g = revealed(3, undefined, { raider: true });
    for (const id of ["t1", "t2", "t3"]) g = withTeam(g, id, { sp: 2 });
    g = withTeam(g, "t3", { stock: stock({ food: 20 }) });
    expect(team(resolveRaider(g), "t3").stock.food).toBe(18);

    let h = revealed(3, undefined, { raider: true });
    h = withTeam(h, "t2", { sp: 2 });
    h = withTeam(h, "t3", { sp: 2 });
    const n = resolveRaider(h);
    expect(team(n, "t2").stock.water).toBe(3);
    expect(team(n, "t3").stock.water).toBe(5);
  });

  it("still hits the only team in a 1-team game", () => {
    const g = revealed(1, stock({ stone: 1 }), { raider: true });
    expect(team(resolveRaider(g), "t1").stock).toEqual(stock());
  });

  it("is idempotent per round", () => {
    const once = resolveRaider(revealed(2, undefined, { raider: true }));
    expect(resolveRaider(once)).toBe(once);
  });

  it("rejects a raider round outside reveal", () => {
    const q = questionGame();
    expect(errCode(() => resolveRaider({ ...q, round: { ...q.round!, raider: true } }))).toBe("WRONG_PHASE");
  });
});

describe("teams 1..8", () => {
  it("contribute, resolveHazard and resolveRaider do not crash", () => {
    for (let n = 1; n <= 8; n++) {
      const g = revealed(n, undefined, { hazard: true, raider: true });
      const h = resolveHazard(pool(g, n));
      expect(h.teams).toHaveLength(n);
      const r = resolveRaider(h);
      expect(r.teams).toHaveLength(n);
    }
  });
});
