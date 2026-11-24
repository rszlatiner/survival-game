import { describe, it, expect } from "vitest";
import {
  GameError,
  createGame,
  generateCode,
  addTeam,
  joinTeam,
  startGame,
  captainOf,
  setCaptain,
  renameTeam,
  removeTeam,
  isLocked,
} from "@/lib/engine/game";
import { makeRng } from "@/lib/rng";
import { ZONE_IDS } from "@/lib/questions/types";
import { START_STOCK } from "@/lib/config";

const mk = (seed = "s1") =>
  createGame({ units: [1, 2], length: "quick", timerSeconds: 60, seed, code: "ABC234", now: 1000 });

function withTeams(n: number, seed = "s1") {
  let g = mk(seed);
  for (let i = 0; i < n; i++) g = addTeam(g, `Team ${i + 1}`, `d${i}`).g;
  return g;
}
function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof GameError ? e.code : "OTHER";
  }
  return undefined;
}

describe("createGame", () => {
  it("sets initial state", () => {
    const g = mk();
    expect(g).toMatchObject({
      code: "ABC234", version: 0, createdAt: 1000, phase: "lobby", teams: [], round: null,
      roundsPlayed: 0, winnerId: null, tiedIds: [], log: [], units: [1, 2], length: "quick",
      timerSeconds: 60, seed: "s1",
    });
    expect(g.fund).toEqual({ water: 0, food: 0, wood: 0, stone: 0 });
  });
  it("validates units", () => {
    const o = { length: "quick" as const, timerSeconds: 60, seed: "s", code: "ABC234", now: 1 };
    expect(code(() => createGame({ ...o, units: [] }))).toBe("BAD_UNITS");
    expect(code(() => createGame({ ...o, units: [0] }))).toBe("BAD_UNITS");
    expect(code(() => createGame({ ...o, units: [16] }))).toBe("BAD_UNITS");
    expect(code(() => createGame({ ...o, units: [1.5] }))).toBe("BAD_UNITS");
  });
});

describe("generateCode", () => {
  it("uses safe alphabet and avoids taken", () => {
    const rng = makeRng("codes");
    const taken = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const c = generateCode(rng, taken);
      expect(c).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
      expect(c).not.toMatch(/[O0I1]/);
      expect(taken.has(c)).toBe(false);
      taken.add(c);
    }
  });
  it("skips taken codes", () => {
    const first = generateCode(makeRng("x"), new Set());
    const second = generateCode(makeRng("x"), new Set([first]));
    expect(second).not.toBe(first);
  });
});

describe("addTeam / joinTeam", () => {
  it("adds teams with deterministic ids and defaults", () => {
    const { g, teamId } = addTeam(mk(), "Sharks", "dev1");
    expect(teamId).toBe("t1");
    expect(g.version).toBe(1);
    const t = g.teams[0];
    expect(t).toMatchObject({ id: "t1", name: "Sharks", devices: ["dev1"], captainIndex: 0, sp: 0, fundGiven: 0, builds: [], zone: "beach" });
    expect(t.stock).toEqual(START_STOCK);
    expect(t.stock).not.toBe(START_STOCK);
    expect(captainOf(t)).toBe("dev1");
  });
  it("normalises names", () => {
    expect(addTeam(mk(), "  Sea   Dogs \t United ", "d").g.teams[0].name).toBe("Sea Dogs United");
    expect(addTeam(mk(), "x".repeat(40), "d").g.teams[0].name).toBe("x".repeat(24));
    expect(code(() => addTeam(mk(), "   ", "d"))).toBe("EMPTY_NAME");
  });
  it("rejects 9th team", () => {
    expect(code(() => addTeam(withTeams(8), "Nine", "d9"))).toBe("TOO_MANY_TEAMS");
  });
  it("joins idempotently and caps devices", () => {
    let g = withTeams(1);
    const same = joinTeam(g, "t1", "d0");
    expect(same).toBe(g);
    expect(same.teams[0].devices).toEqual(["d0"]);
    for (let i = 1; i < 6; i++) g = joinTeam(g, "t1", `x${i}`);
    expect(g.teams[0].devices).toHaveLength(6);
    expect(code(() => joinTeam(g, "t1", "x7"))).toBe("TOO_MANY_DEVICES");
    expect(code(() => joinTeam(g, "nope", "x7"))).toBe("NOT_FOUND");
  });
  it("late join works, addTeam throws LOCKED", () => {
    const g = startGame(withTeams(2));
    expect(joinTeam(g, "t1", "late").teams[0].devices).toEqual(["d0", "late"]);
    expect(code(() => addTeam(g, "Late", "z"))).toBe("LOCKED");
  });
  it("join rejected when finished", () => {
    const g = { ...startGame(withTeams(1)), phase: "finished" as const };
    expect(code(() => joinTeam(g, "t1", "late"))).toBe("WRONG_PHASE");
  });
});

describe("startGame", () => {
  it("needs a team and lobby phase", () => {
    expect(code(() => startGame(mk()))).toBe("NO_TEAMS");
    const g = { ...withTeams(1), phase: "question" as const };
    expect(code(() => startGame(g))).toBe("WRONG_PHASE");
  });
  it("assigns valid zones, max 2 per zone at 8 teams", () => {
    for (let n = 1; n <= 8; n++) {
      const g = startGame(withTeams(n));
      const counts: Record<string, number> = {};
      for (const t of g.teams) {
        expect(ZONE_IDS).toContain(t.zone);
        counts[t.zone] = (counts[t.zone] ?? 0) + 1;
      }
      expect(Math.max(...Object.values(counts))).toBeLessThanOrEqual(Math.ceil(n / 5));
      expect(g.log).toContain("game started");
      expect(g.phase).toBe("lobby");
      expect(isLocked(g)).toBe(true);
    }
  });
  it("is deterministic per seed", () => {
    const z = (s: string) => startGame(withTeams(5, s)).teams.map((t) => t.zone);
    expect(z("a")).toEqual(z("a"));
    const all = new Set(["a", "b", "c", "d", "e", "f"].map((s) => z(s).join()));
    expect(all.size).toBeGreaterThan(1);
  });
});

describe("captain", () => {
  it("defaults, changes, validates", () => {
    let g = joinTeam(withTeams(1), "t1", "d1");
    expect(captainOf(g.teams[0])).toBe("d0");
    g = setCaptain(g, "t1", 1);
    expect(captainOf(g.teams[0])).toBe("d1");
    expect(code(() => setCaptain(g, "t1", 2))).toBe("BAD_INDEX");
    expect(code(() => setCaptain(g, "t1", -1))).toBe("BAD_INDEX");
    expect(code(() => setCaptain(g, "zz", 0))).toBe("NOT_FOUND");
  });
});

describe("rename / remove", () => {
  it("works in lobby, LOCKED after start", () => {
    let g = renameTeam(withTeams(2), "t1", "  New  Name ");
    expect(g.teams[0].name).toBe("New Name");
    expect(code(() => renameTeam(g, "t1", " "))).toBe("EMPTY_NAME");
    expect(code(() => renameTeam(g, "zz", "a"))).toBe("NOT_FOUND");
    g = removeTeam(g, "t1");
    expect(g.teams.map((t) => t.id)).toEqual(["t2"]);
    expect(code(() => removeTeam(g, "t1"))).toBe("NOT_FOUND");
    const s = startGame(g);
    expect(code(() => renameTeam(s, "t2", "a"))).toBe("LOCKED");
    expect(code(() => removeTeam(s, "t2"))).toBe("LOCKED");
  });
  it("keeps ids unique after removal", () => {
    let g = withTeams(3);
    g = removeTeam(g, "t3");
    g = addTeam(g, "Again", "n1").g;
    expect(g.teams.map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
    g = removeTeam(g, "t1");
    const r = addTeam(g, "More", "n2");
    expect(r.teamId).toBe("t4");
    expect(new Set(r.g.teams.map((t) => t.id)).size).toBe(r.g.teams.length);
  });
});

describe("purity", () => {
  it("does not mutate inputs and bumps version by 1", () => {
    const g0 = withTeams(2);
    const snap = JSON.stringify(g0);
    const steps = [
      (g: typeof g0) => addTeam(g, "N", "n").g,
      (g: typeof g0) => joinTeam(g, "t1", "j"),
      (g: typeof g0) => setCaptain(joinTeam(g, "t1", "j"), "t1", 1),
      (g: typeof g0) => renameTeam(g, "t1", "R"),
      (g: typeof g0) => removeTeam(g, "t1"),
      (g: typeof g0) => startGame(g),
    ];
    const deltas = [1, 1, 2, 1, 1, 1];
    steps.forEach((f, i) => {
      const out = f(g0);
      expect(JSON.stringify(g0)).toBe(snap);
      expect(out).not.toBe(g0);
      expect(out.version).toBe(g0.version + deltas[i]);
    });
  });
});
