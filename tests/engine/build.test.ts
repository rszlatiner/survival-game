import { describe, it, expect } from "vitest";
import { BUILDS, MARKET } from "@/lib/config";
import { buildItem, canAfford, exchange, marketRate } from "@/lib/engine/build";
import { RESOURCES } from "@/lib/questions/types";
import type { Resource } from "@/lib/questions/types";
import { makeRng } from "@/lib/rng";
import type { BuildId, GameState, Stock } from "@/lib/types";
import { errCode, questionGame, revealGame, startedGame, withTeam } from "../helpers/game";

const stock = (s: Partial<Stock> = {}): Stock => ({ water: 0, food: 0, wood: 0, stone: 0, ...s });
const rich = stock({ water: 20, food: 20, wood: 20, stone: 20 });
const frozen = <T,>(x: T) => JSON.stringify(x);
const team = (g: GameState, id = "t1") => g.teams.find((t) => t.id === id)!;

function revealWith(s: Stock, bonus: Resource | null = null): GameState {
  const g = revealGame({ bonus });
  return withTeam(g, g.teams[0].id, { stock: s });
}

describe("canAfford", () => {
  it("compares each resource and ignores missing keys", () => {
    expect(canAfford(stock({ wood: 3, stone: 2 }), { wood: 3, stone: 2 })).toBe(true);
    expect(canAfford(stock({ wood: 2, stone: 2 }), { wood: 3 })).toBe(false);
    expect(canAfford(stock(), {})).toBe(true);
  });
});

describe("buildItem", () => {
  it("subtracts cost, appends the build, adds SP, bumps version, does not mutate", () => {
    const g = revealWith(stock({ wood: 5, stone: 4, water: 1 }));
    const id = g.teams[0].id;
    const before = frozen(g);
    const n = buildItem(g, id, "shelter");
    expect(frozen(g)).toBe(before);
    expect(n.version).toBe(g.version + 1);
    expect(n.teams[0].stock).toEqual(stock({ wood: 2, stone: 2, water: 1 }));
    expect(n.teams[0].builds).toEqual(["shelter"]);
    expect(n.teams[0].sp).toBe(g.teams[0].sp + BUILDS.shelter.sp);
    expect(n.teams[0].builds).not.toBe(g.teams[0].builds);
    expect(n.teams[1]).toBe(g.teams[1]);
    expect(n.winnerId).toBeNull();
  });

  it("throws CANNOT_AFFORD and leaves state unchanged", () => {
    const g = revealWith(stock({ wood: 2, stone: 2 }));
    const before = frozen(g);
    expect(errCode(() => buildItem(g, g.teams[0].id, "shelter"))).toBe("CANNOT_AFFORD");
    expect(frozen(g)).toBe(before);
  });

  it("throws MISSING_REQUIREMENT for raft2 before raft1, and for raft3 before raft2", () => {
    const g = revealWith(rich);
    const id = g.teams[0].id;
    expect(errCode(() => buildItem(g, id, "raft2"))).toBe("MISSING_REQUIREMENT");
    const g1 = buildItem(g, id, "raft1");
    expect(errCode(() => buildItem(g1, id, "raft3"))).toBe("MISSING_REQUIREMENT");
    const g2 = buildItem(g1, id, "raft2");
    const g3 = buildItem(g2, id, "raft3");
    expect(g3.teams[0].builds).toEqual(["raft1", "raft2", "raft3"]);
    expect(g3.winnerId).toBeNull();
  });

  it("throws ALREADY_BUILT on a second build of the same item (checked first)", () => {
    const g = revealWith(rich);
    const id = g.teams[0].id;
    const g1 = buildItem(g, id, "fire");
    expect(errCode(() => buildItem(g1, id, "fire"))).toBe("ALREADY_BUILT");
    const poor = withTeam(g1, id, { stock: stock() });
    expect(errCode(() => buildItem(poor, id, "fire"))).toBe("ALREADY_BUILT");
  });

  it("checks requirement before affordability", () => {
    const g = revealWith(stock());
    expect(errCode(() => buildItem(g, g.teams[0].id, "raft2"))).toBe("MISSING_REQUIREMENT");
  });

  it("throws NOT_FOUND for an unknown team and WRONG_PHASE outside reveal", () => {
    const g = revealWith(rich);
    expect(errCode(() => buildItem(g, "nope", "fire"))).toBe("NOT_FOUND");
    for (const bad of [startedGame(), questionGame()]) {
      expect(errCode(() => buildItem(bad, bad.teams[0].id, "fire"))).toBe("WRONG_PHASE");
    }
  });
});

describe("marketRate", () => {
  it("returns base 3, bonusGet 4, bonusGive 2", () => {
    const g = revealGame({ bonus: "wood" });
    expect(marketRate(g, "water", "food")).toBe(MARKET.base);
    expect(marketRate(g, "water", "food")).toBe(3);
    expect(marketRate(g, "water", "wood")).toBe(4);
    expect(marketRate(g, "wood", "water")).toBe(2);
  });

  it("uses base when there is no bonus resource or no round", () => {
    expect(marketRate(revealGame({ bonus: null }), "water", "wood")).toBe(3);
    expect(marketRate({ ...revealGame(), round: null }, "water", "wood")).toBe(3);
  });

  it("throws SAME_RESOURCE when give === get", () => {
    expect(errCode(() => marketRate(revealGame({ bonus: "wood" }), "wood", "wood"))).toBe("SAME_RESOURCE");
  });
});

describe("exchange", () => {
  it("2 food for water at base rate costs 6 food", () => {
    const g = revealWith(stock({ food: 7 }), null);
    const id = g.teams[0].id;
    // Brief example: give food, get water, amountGet 2, rate 3 => 6 food.
    const before = frozen(g);
    const n = exchange(g, id, "food", "water", 2);
    expect(frozen(g)).toBe(before);
    expect(n.teams[0].stock).toEqual(stock({ food: 1, water: 2 }));
    expect(n.version).toBe(g.version + 1);
  });

  it("applies bonus rates", () => {
    const g = revealWith(stock({ water: 10, wood: 10 }), "wood");
    const id = g.teams[0].id;
    expect(exchange(g, id, "water", "wood", 2).teams[0].stock).toEqual(stock({ water: 2, wood: 12 }));
    expect(exchange(g, id, "wood", "water", 2).teams[0].stock).toEqual(stock({ water: 12, wood: 6 }));
  });

  it("throws CANNOT_AFFORD, leaving state unchanged", () => {
    const g = revealWith(stock({ food: 5 }));
    const before = frozen(g);
    expect(errCode(() => exchange(g, g.teams[0].id, "food", "water", 2))).toBe("CANNOT_AFFORD");
    expect(frozen(g)).toBe(before);
  });

  it("throws BAD_AMOUNT for non-positive-integer amounts", () => {
    const g = revealWith(rich);
    const id = g.teams[0].id;
    for (const a of [0, -1, 1.5, NaN, Infinity, -Infinity]) {
      expect(errCode(() => exchange(g, id, "food", "water", a))).toBe("BAD_AMOUNT");
    }
  });

  it("throws SAME_RESOURCE, NOT_FOUND and WRONG_PHASE", () => {
    const g = revealWith(rich);
    expect(errCode(() => exchange(g, g.teams[0].id, "food", "food", 1))).toBe("SAME_RESOURCE");
    expect(errCode(() => exchange(g, "nope", "food", "water", 1))).toBe("NOT_FOUND");
    for (const bad of [startedGame(), questionGame()]) {
      expect(errCode(() => exchange(bad, bad.teams[0].id, "food", "water", 1))).toBe("WRONG_PHASE");
    }
  });
});

describe("property: random build/exchange attempts", () => {
  it("never goes negative and stock plus spend balances", () => {
    const rng = makeRng("build-property");
    const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rng() * xs.length)];
    const ids = Object.keys(BUILDS) as BuildId[];
    const amounts = [1, 2, 3, 0, -1, 1.5, NaN, 5];
    let g = revealGame({ bonus: "stone" });
    const tid = g.teams[0].id;
    g = withTeam(g, tid, { stock: stock({ water: 6, food: 6, wood: 6, stone: 6 }) });
    // Conservation: expected stock tracked independently.
    const expected: Stock = { ...team(g, tid).stock };
    let ok = 0;
    for (let i = 0; i < 200; i++) {
      const prev = g;
      try {
        if (rng() < 0.5) {
          const id = pick(ids);
          g = buildItem(g, tid, id);
          for (const r of RESOURCES) expected[r] -= BUILDS[id].cost[r] ?? 0;
        } else {
          const give = pick(RESOURCES);
          const get = pick(RESOURCES);
          const amt = pick(amounts);
          const rate = give === get ? 0 : marketRate(g, give, get);
          g = exchange(g, tid, give, get, amt);
          expected[give] -= rate * amt;
          expected[get] += amt;
        }
        ok++;
        expect(g.version).toBe(prev.version + 1);
      } catch (e) {
        expect(e).toHaveProperty("name", "GameError");
        expect(g).toBe(prev);
      }
      const s = team(g, tid).stock;
      for (const r of RESOURCES) expect(s[r]).toBeGreaterThanOrEqual(0);
      expect(s).toEqual(expected);
      // Occasionally top up to keep the loop exercising successes.
      if (i % 40 === 39) {
        g = withTeam(g, tid, { stock: { ...s, water: s.water + 6, food: s.food + 6 } });
        expected.water += 6;
        expected.food += 6;
      }
    }
    expect(ok).toBeGreaterThan(10);
  });
});
