import { describe, it, expect, vi } from "vitest";
import {
  ApiError,
  createGameHandler,
  hostActionHandler,
  hostLoginHandler,
  joinHandler,
  TOKEN_TTL_MS,
  stateHandler,
  teamActionHandler,
  teamSuggestionsHandler,
  type HandlerEnv,
} from "@/lib/api/handlers";
import { TIMER_MAX_SECONDS, TIMER_MIN_SECONDS, parseCreateBody, parseHostAction, parseLoginBody, parseTeamAction } from "@/lib/api/parse";
import { signToken, verifyToken } from "@/lib/auth";
import { ROUNDS } from "@/lib/config";
import { checkWinner } from "@/lib/engine/win";
import { GameError, addTeam, createGame, startGame } from "@/lib/engine/game";
import { errorBody, toApiError } from "@/lib/api/errors";
import { memoryRepo } from "@/lib/repo/memory";
import { VersionConflict, type GameRepo } from "@/lib/repo/types";
import type { Notifier } from "@/lib/repo/notify";
import type { GameState, Stock } from "@/lib/types";
import { revealGame, withTeam } from "./helpers/game";

const PASSWORD = "teacher-pass";
const SECRET = "test-secret-0123456789-abcdefghijk";
const T0 = 1_000_000;
const HOUR = 3_600_000;
const stock = (s: Partial<Stock> = {}): Stock => ({ water: 0, food: 0, wood: 0, stone: 0, ...s });

function makeEnv(notifier?: Notifier) {
  const calls: [string, number][] = [];
  const n: Notifier = notifier ?? {
    notify: async (code, version) => {
      calls.push([code, version]);
      return true;
    },
  };
  const sleeps: number[] = [];
  const env: HandlerEnv = {
    teacherPassword: PASSWORD,
    tokenSecret: SECRET,
    notifier: n,
    // Conflict retries back off without real waiting; delays are recorded.
    retry: { sleep: async (ms) => void sleeps.push(ms), rand: () => 0.5 },
  };
  return { env, calls, sleeps };
}

/** Run `fn` and return the ApiError it rejects with. */
async function apiErr(p: Promise<unknown>): Promise<ApiError> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ApiError) return e;
    throw e;
  }
  throw new Error("expected an ApiError");
}

async function newGame(repo: GameRepo, env: HandlerEnv, units = [11]) {
  return createGameHandler(repo, env, { password: PASSWORD, units, length: "quick", timerSeconds: 60 }, T0);
}

/** Store a hand-built state directly and mint tokens for it. */
async function seeded(g: GameState) {
  const repo = memoryRepo(() => T0);
  await repo.create(g);
  const { env, calls } = makeEnv();
  const host = signToken({ role: "host", code: g.code, createdAt: g.createdAt }, SECRET, HOUR, T0);
  const team = (teamId: string, deviceId = g.teams.find((t) => t.id === teamId)!.devices[0]) =>
    signToken({ role: "team", code: g.code, teamId, deviceId, createdAt: g.createdAt }, SECRET, HOUR, T0);
  return { repo, env, calls, host, team };
}

describe("full flow through the handlers", () => {
  it("create, 5 teams join, start, round, 5 submits, reveal, build, end", async () => {
    const repo = memoryRepo(() => T0);
    const { env } = makeEnv();
    const { code, hostToken } = await newGame(repo, env);
    expect(code).toMatch(/^[A-Z2-9]{6}$/);

    const teams: { teamId: string; teamToken: string }[] = [];
    for (let i = 0; i < 5; i++) {
      teams.push(await joinHandler(repo, env, code, { teamName: `Team ${i}`, deviceId: `dev-${i}` }, T0));
    }
    expect(teams.map((t) => t.teamId)).toEqual(["t1", "t2", "t3", "t4", "t5"]);

    // One press of Start locks the lobby and opens round 1.
    const q = await hostActionHandler(repo, env, code, hostToken, { type: "start" }, T0);
    expect(q.phase).toBe("question");
    expect(q.round!.n).toBe(1);

    const stored = (await repo.get(code))!;
    for (const t of teams) {
      const answer = String(stored.round!.questions[t.teamId].expected);
      await teamActionHandler(repo, env, code, t.teamToken, { type: "submit", answer }, T0 + 1);
    }
    const r = await hostActionHandler(repo, env, code, hostToken, { type: "reveal" }, T0 + 2);
    expect(r.phase).toBe("reveal");
    for (const t of teams) expect(r.round!.results![t.teamId].correct).toBe(true);

    const b = await teamActionHandler(repo, env, code, teams[0].teamToken, { type: "build", item: "fire" }, T0 + 3);
    expect(b.teams.find((t) => t.id === "t1")!.builds).toEqual(["fire"]);

    const end = await hostActionHandler(repo, env, code, hostToken, { type: "end" }, T0 + 4);
    expect(end.phase).toBe("finished");
    expect(end.winnerId).toBe("t1");
  });
});

describe("auth", () => {
  it("rejects a wrong teacher password", async () => {
    const { env } = makeEnv();
    const e = await apiErr(
      createGameHandler(memoryRepo(), env, { password: "nope", units: [11], length: "quick", timerSeconds: 60 }, T0),
    );
    expect(e.status).toBe(401);
  });

  it("rejects units outside 1 to 15 and an empty unit list", async () => {
    const { env } = makeEnv();
    for (const units of [[16], [0], []]) {
      const e = await apiErr(
        createGameHandler(memoryRepo(), env, { password: PASSWORD, units, length: "quick", timerSeconds: 60 }, T0),
      );
      expect(e.status).toBe(400);
    }
  });

  it("join returns the caller's own deviceIndex, stable on re-join, with no other device ids", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code } = await newGame(repo, env);
    const a = await joinHandler(repo, env, code, { teamName: "A", deviceId: "capA" }, T0);
    const m = await joinHandler(repo, env, code, { teamId: a.teamId, deviceId: "mateA" }, T0);
    const again = await joinHandler(repo, env, code, { teamId: a.teamId, deviceId: "capA" }, T0);
    expect(a.deviceIndex).toBe(0);
    expect(m.deviceIndex).toBe(1);
    expect(again.deviceIndex).toBe(0);
    for (const r of [a, m, again]) {
      expect(Object.keys(r).sort()).toEqual(["deviceIndex", "teamId", "teamToken"]);
      expect(JSON.stringify(r)).not.toMatch(/capA|mateA/);
    }
  });

  it("a team token cannot call a host action", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code } = await newGame(repo, env);
    const { teamToken } = await joinHandler(repo, env, code, { teamName: "A", deviceId: "d" }, T0);
    expect((await apiErr(hostActionHandler(repo, env, code, teamToken, { type: "start" }, T0))).status).toBe(401);
  });

  it("a host token cannot call a team action", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code, hostToken } = await newGame(repo, env);
    const e = await apiErr(teamActionHandler(repo, env, code, hostToken, { type: "submit", answer: "1" }, T0));
    expect(e.status).toBe(401);
  });

  it("rejects a host token for another game", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const a = await newGame(repo, env);
    const b = await newGame(repo, env);
    expect((await apiErr(hostActionHandler(repo, env, b.code, a.hostToken, { type: "start" }, T0))).status).toBe(401);
  });

  it("rejects a token for a deleted and recreated game with the same code", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code, hostToken } = await newGame(repo, env);
    const old = (await repo.get(code))!;
    const fresh = memoryRepo();
    await fresh.create({ ...old, createdAt: old.createdAt + 1 });
    expect((await apiErr(hostActionHandler(fresh, env, code, hostToken, { type: "start" }, T0))).status).toBe(401);
  });

  it("rejects a team token whose device is not on the team", async () => {
    const g = revealGame({ teams: 2 });
    const { repo, env } = await seeded(g);
    const forged = signToken(
      { role: "team", code: g.code, teamId: "t1", deviceId: "stranger", createdAt: g.createdAt },
      SECRET,
      HOUR,
      T0,
    );
    const e = await apiErr(teamActionHandler(repo, env, g.code, forged, { type: "build", item: "fire" }, T0));
    expect(e.status).toBe(401);
  });

  it("refuses to run with a TOKEN_SECRET shorter than 32 characters", async () => {
    const { env } = makeEnv();
    const e = await apiErr(newGame(memoryRepo(), { ...env, tokenSecret: "short" }));
    expect(e.status).toBe(500);
    expect(e.message).not.toContain("short");
  });
});

describe("state and errors", () => {
  it("state for an unknown code is not found", async () => {
    expect((await apiErr(stateHandler(memoryRepo(), "ZZZZZZ", T0))).status).toBe(404);
  });

  it("join for an unknown code or team is not found", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code } = await newGame(repo, env);
    expect((await apiErr(joinHandler(repo, env, "ZZZZZZ", { teamName: "A", deviceId: "d" }, T0))).status).toBe(404);
    expect((await apiErr(joinHandler(repo, env, code, { teamId: "t9", deviceId: "d" }, T0))).status).toBe(404);
  });

  it("a non-captain submit before the timer ends is rejected", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code, hostToken } = await newGame(repo, env);
    const a = await joinHandler(repo, env, code, { teamName: "A", deviceId: "cap" }, T0);
    const b = await joinHandler(repo, env, code, { teamId: a.teamId, deviceId: "mate" }, T0);
    await hostActionHandler(repo, env, code, hostToken, { type: "start" }, T0);
    const e = await apiErr(teamActionHandler(repo, env, code, b.teamToken, { type: "submit", answer: "1" }, T0 + 1));
    expect(e.status).toBe(400);
    expect(e.code).toBe("NOT_CAPTAIN");
  });

  it("host reveal with zero submissions succeeds", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code, hostToken } = await newGame(repo, env);
    await joinHandler(repo, env, code, { teamName: "A", deviceId: "d" }, T0);
    await hostActionHandler(repo, env, code, hostToken, { type: "start" }, T0);
    const r = await hostActionHandler(repo, env, code, hostToken, { type: "reveal" }, T0);
    expect(r.phase).toBe("reveal");
    expect(r.round!.results!.t1.correct).toBe(false);
  });

  it("host next during the question phase fails without changing state", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code, hostToken } = await newGame(repo, env);
    await joinHandler(repo, env, code, { teamName: "A", deviceId: "d" }, T0);
    await hostActionHandler(repo, env, code, hostToken, { type: "start" }, T0);
    const before = await repo.get(code);
    const e = await apiErr(hostActionHandler(repo, env, code, hostToken, { type: "next" }, T0));
    expect(e.status).toBe(400);
    expect(e.code).toBe("WRONG_PHASE");
    expect(await repo.get(code)).toEqual(before);
  });

  it("end twice is harmless", async () => {
    const g = withTeam(revealGame({ teams: 2 }), "t2", { sp: 2 });
    const { repo, env, host, calls } = await seeded(g);
    const a = await hostActionHandler(repo, env, g.code, host, { type: "end" }, T0);
    const b = await hostActionHandler(repo, env, g.code, host, { type: "end" }, T0);
    expect(a.winnerId).toBe("t2");
    expect(b).toEqual({ ...a, serverNow: T0 });
    expect(calls.length).toBe(1);
  });

  it("override sets a team's stock and SP and is logged", async () => {
    const g = revealGame({ teams: 2 });
    const { repo, env, host } = await seeded(g);
    const s = await hostActionHandler(
      repo,
      env,
      g.code,
      host,
      { type: "override", teamId: "t2", stock: { stone: 7 }, sp: 3 },
      T0,
    );
    const t2 = s.teams.find((t) => t.id === "t2")!;
    expect(t2.stock.stone).toBe(7);
    expect(t2.sp).toBe(3);
    expect((await repo.get(g.code))!.log.some((l) => l.startsWith("override t2"))).toBe(true);
  });

  it("rejects an over-long answer", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code, hostToken } = await newGame(repo, env);
    const a = await joinHandler(repo, env, code, { teamName: "A", deviceId: "d" }, T0);
    await hostActionHandler(repo, env, code, hostToken, { type: "start" }, T0);
    const e = await apiErr(teamActionHandler(repo, env, code, a.teamToken, { type: "submit", answer: "9".repeat(41) }, T0));
    expect(e.status).toBe(400);
    expect(() => parseTeamAction({ type: "submit", answer: "9".repeat(41) })).toThrow(ApiError);
    expect(parseTeamAction({ type: "submit", answer: "9".repeat(40) })).toEqual({ type: "submit", answer: "9".repeat(40) });
  });
});

describe("round ordering rulings", () => {
  it("next starts the tiebreak instead of advancing while tiedIds is non-empty", async () => {
    let g = revealGame({ teams: 3 });
    const raft = ["raft1", "raft2", "raft3"] as const;
    g = withTeam(g, "t1", { builds: [...raft], sp: 3, stock: stock() });
    g = withTeam(g, "t2", { builds: [...raft], sp: 3, stock: stock() });
    g = checkWinner(g);
    expect(g.tiedIds).toEqual(["t1", "t2"]);
    const { repo, env, host } = await seeded(g);
    const s = await hostActionHandler(repo, env, g.code, host, { type: "next" }, T0);
    expect(s.phase).toBe("tiebreak");
    expect(s.roundsPlayed).toBe(g.roundsPlayed);
    expect(Object.keys(s.round!.questions).sort()).toEqual(["t1", "t2"]);
  });

  it("next with a pending tie goes to the tiebreak even if a hazard would break the tie", async () => {
    let g = revealGame({ teams: 2 });
    g = { ...g, round: { ...g.round!, hazard: true } };
    const raft = ["raft1", "raft2", "raft3"] as const;
    // Equal SP and stock; an unmet hazard takes 1 from t1 but 2 from t2.
    g = withTeam(g, "t1", { builds: [...raft], sp: 3, stock: stock({ wood: 1, stone: 1 }) });
    g = withTeam(g, "t2", { builds: [...raft], sp: 3, stock: stock({ wood: 2 }) });
    g = checkWinner(g);
    expect(g.tiedIds).toEqual(["t1", "t2"]);
    const { repo, env, host } = await seeded(g);
    const s = await hostActionHandler(repo, env, g.code, host, { type: "next" }, T0);
    expect(s.phase).toBe("tiebreak");
    expect(s.winnerId).toBeNull();
  });

  it("end with a pending raft tie starts the tiebreak; a non-finisher cannot win", async () => {
    let g = revealGame({ teams: 3 });
    const raft = ["raft1", "raft2", "raft3"] as const;
    g = withTeam(g, "t1", { builds: [...raft], sp: 3, stock: stock() });
    g = withTeam(g, "t2", { builds: [...raft], sp: 3, stock: stock() });
    g = withTeam(g, "t3", { sp: 20, stock: stock({ wood: 9 }) });
    g = checkWinner(g);
    const { repo, env, host, team } = await seeded(g);
    const s = await hostActionHandler(repo, env, g.code, host, { type: "end" }, T0);
    expect(s.phase).toBe("tiebreak");
    expect(s.winnerId).toBeNull();
    // Tied teams answer, the host reveals the tiebreak, and a finisher wins.
    const stored = (await repo.get(g.code))!;
    const right = String(stored.round!.questions.t2.expected);
    await teamActionHandler(repo, env, g.code, team("t2"), { type: "submit", answer: right }, T0 + 1);
    const f = await hostActionHandler(repo, env, g.code, host, { type: "reveal" }, T0 + 2);
    expect(f.phase).toBe("finished");
    expect(f.winnerId).toBe("t2");
  });

  it("the last round keeps its spend phase; next then scores the game", async () => {
    const g = { ...revealGame({ teams: 2 }), roundsPlayed: ROUNDS.quick - 1 };
    const { repo, env, host, team } = await seeded({ ...g, phase: "reveal" });
    await hostActionHandler(repo, env, g.code, host, { type: "next" }, T0);
    const r = await hostActionHandler(repo, env, g.code, host, { type: "reveal" }, T0);
    expect(r.phase).toBe("reveal");
    expect(r.roundsPlayed).toBe(ROUNDS.quick);
    const b = await teamActionHandler(repo, env, g.code, team("t1"), { type: "build", item: "fire" }, T0);
    expect(b.phase).toBe("reveal");
    const n = await hostActionHandler(repo, env, g.code, host, { type: "next" }, T0);
    expect(n.phase).toBe("finished");
    expect(n.winnerId).toBe("t1");
  });

  it("a hazard is resolved on next, after contributions, not at reveal", async () => {
    let g = revealGame({ teams: 2 });
    g = { ...g, round: { ...g.round!, hazard: true } };
    const { repo, env, host, team } = await seeded(g);
    await teamActionHandler(repo, env, g.code, team("t1"), { type: "contribute", resource: "wood", amount: 2 }, T0);
    await teamActionHandler(repo, env, g.code, team("t2"), { type: "contribute", resource: "wood", amount: 2 }, T0);
    const n = await hostActionHandler(repo, env, g.code, host, { type: "next" }, T0);
    expect(n.phase).toBe("question");
    const stored = (await repo.get(g.code))!;
    expect(stored.log).toContain(`hazard resolved r${g.round!.n}`);
    expect(n.fund).toEqual(stock());
  });

  it("building raft3 wins at once", async () => {
    let g = revealGame({ teams: 2 });
    g = withTeam(g, "t1", { builds: ["raft1", "raft2"], stock: stock({ wood: 5, stone: 2, food: 2 }) });
    const { repo, env, team } = await seeded(g);
    const s = await teamActionHandler(repo, env, g.code, team("t1"), { type: "build", item: "raft3" }, T0);
    expect(s.phase).toBe("finished");
    expect(s.winnerId).toBe("t1");
  });
});

describe("persistence rulings", () => {
  it("a same-device re-join saves nothing and notifies nobody", async () => {
    const repo = memoryRepo();
    const { env, calls } = makeEnv();
    const { code } = await newGame(repo, env);
    const a = await joinHandler(repo, env, code, { teamName: "A", deviceId: "d" }, T0);
    const save = vi.spyOn(repo, "save");
    const n = calls.length;
    const again = await joinHandler(repo, env, code, { teamId: a.teamId, deviceId: "d" }, T0);
    expect(again.teamId).toBe(a.teamId);
    expect(save).not.toHaveBeenCalled();
    expect(calls.length).toBe(n);
  });

  it("notifies with the new version after each save", async () => {
    const repo = memoryRepo();
    const { env, calls } = makeEnv();
    const { code } = await newGame(repo, env);
    await joinHandler(repo, env, code, { teamName: "A", deviceId: "d" }, T0);
    const v = (await repo.get(code))!.version;
    expect(calls[calls.length - 1]).toEqual([code, v]);
  });

  it("ignores a notifier that throws", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv({ notify: () => Promise.reject(new Error("boom")) });
    const { code } = await newGame(repo, env);
    await expect(joinHandler(repo, env, code, { teamName: "A", deviceId: "d" }, T0)).resolves.toMatchObject({
      teamId: "t1",
    });
  });

  it("retries once on VersionConflict by reloading and reapplying", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code } = await newGame(repo, env);
    let raced = false;
    const racing: GameRepo = {
      ...repo,
      async save(g, v) {
        if (!raced) {
          raced = true;
          // Another request lands first.
          await joinHandler(repo, env, code, { teamName: "Other", deviceId: "x" }, T0);
        }
        return repo.save(g, v);
      },
    };
    const mine = await joinHandler(racing, env, code, { teamName: "Mine", deviceId: "y" }, T0);
    expect(mine.teamId).toBe("t2");
    expect((await repo.get(code))!.teams.map((t) => t.name)).toEqual(["Other", "Mine"]);
  });

  it("gives 409 after the fourth VersionConflict, with the current state", async () => {
    const repo = memoryRepo();
    const { env, sleeps } = makeEnv();
    const { code } = await newGame(repo, env);
    let saves = 0;
    const always: GameRepo = {
      ...repo,
      async save(g, v) {
        saves++;
        throw new VersionConflict(g.code, v);
      },
    };
    const e = await apiErr(joinHandler(always, env, code, { teamName: "A", deviceId: "d" }, T0));
    expect(e.status).toBe(409);
    expect(e.code).toBe("CONFLICT");
    expect(saves).toBe(4);
    expect(sleeps).toHaveLength(3);
    expect(e.state?.version).toBe(0);
  });

  it("re-reads the game after another save error and reports it", async () => {
    const repo = memoryRepo();
    const { env, calls } = makeEnv();
    const { code } = await newGame(repo, env);
    const get = vi.fn(repo.get);
    const broken: GameRepo = {
      ...repo,
      get,
      async save() {
        throw new Error("network down: secret-ish detail");
      },
    };
    const n = calls.length;
    const e = await apiErr(joinHandler(broken, env, code, { teamName: "A", deviceId: "d" }, T0));
    expect(e.status).toBe(500);
    expect(e.message).not.toContain("secret-ish");
    expect(get).toHaveBeenCalledTimes(2);
    expect(e.state?.version).toBe(0);
    expect(calls.length).toBe(n);
  });
});

describe("suggestions and leaks", () => {
  async function questionWithMates() {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code, hostToken } = await newGame(repo, env);
    const a = await joinHandler(repo, env, code, { teamName: "A", deviceId: "capA" }, T0);
    const a2 = await joinHandler(repo, env, code, { teamId: a.teamId, deviceId: "mateA" }, T0);
    const b = await joinHandler(repo, env, code, { teamName: "B", deviceId: "capB" }, T0);
    const b2 = await joinHandler(repo, env, code, { teamId: b.teamId, deviceId: "mateB" }, T0);
    await hostActionHandler(repo, env, code, hostToken, { type: "start" }, T0);
    return { repo, env, code, hostToken, a, a2, b, b2 };
  }

  it("returns only the caller's own team's suggestions, without device ids", async () => {
    const { repo, env, code, a, a2, b2 } = await questionWithMates();
    await teamActionHandler(repo, env, code, a2.teamToken, { type: "suggest", answer: "12" }, T0);
    await teamActionHandler(repo, env, code, b2.teamToken, { type: "suggest", answer: "99" }, T0);
    expect(await teamSuggestionsHandler(repo, env, code, a.teamToken, T0)).toEqual({ suggestions: [{ answer: "12" }] });
    expect(await teamSuggestionsHandler(repo, env, code, b2.teamToken, T0)).toEqual({
      suggestions: [{ answer: "99" }],
    });
    const { hostToken } = await createGameHandler(
      repo,
      env,
      { password: PASSWORD, units: [11], length: "quick", timerSeconds: 60 },
      T0,
    );
    expect((await apiErr(teamSuggestionsHandler(repo, env, code, hostToken, T0))).status).toBe(401);
  });

  it("public state before reveal leaks no answers, device ids, suggestions, tokens or the password", async () => {
    const { repo, env, code, hostToken, a, a2 } = await questionWithMates();
    const s = await teamActionHandler(repo, env, code, a2.teamToken, { type: "suggest", answer: "777" }, T0);
    const stored = (await repo.get(code))!;
    for (const out of [s, await stateHandler(repo, code, T0)]) {
      const text = JSON.stringify(out);
      for (const bad of ["capA", "mateA", "capB", "mateB", PASSWORD, SECRET, hostToken, a.teamToken, stored.seed]) {
        expect(text).not.toContain(bad);
      }
      expect(text).not.toMatch(/"expected"|"solution"|"suggestions"|"devices"/);
      expect(out.round!.results).toBeNull();
    }
  });
});

describe("route layer", () => {
  const ctx = { params: Promise.resolve({ code: "ABC234" }) };
  const post = (body: string) =>
    new Request("http://x/api/games/ABC234/team", { method: "POST", body, headers: { authorization: "Bearer t" } });

  it("the team route rejects an over-long answer and bad JSON with 400", async () => {
    const { POST } = await import("@/app/api/games/[code]/team/route");
    const long = await POST(post(JSON.stringify({ type: "submit", answer: "9".repeat(41) })), ctx);
    expect(long.status).toBe(400);
    expect(await long.json()).toEqual({ error: "BAD_REQUEST" });
    expect((await POST(post("{not json"), ctx)).status).toBe(400);
  });
});

describe("parse", () => {
  it("rejects empty or whitespace-only submit answers", () => {
    for (const answer of ["", "   "]) expect(() => parseTeamAction({ type: "submit", answer })).toThrow(ApiError);
  });

  it("rejects an over-long password instead of truncating it", () => {
    const body = { units: [11], length: "quick", timerSeconds: 60 };
    expect(() => parseCreateBody({ ...body, password: "p".repeat(201) })).toThrow(ApiError);
    expect(parseCreateBody({ ...body, password: "p".repeat(200) }).password).toBe("p".repeat(200));
  });

  it("bounds override values at 9999", () => {
    const o = { type: "override", teamId: "t1" };
    expect(() => parseHostAction({ ...o, sp: 10_000 })).toThrow(ApiError);
    expect(() => parseHostAction({ ...o, stock: { wood: 10_000 } })).toThrow(ApiError);
    expect(() => parseHostAction({ ...o, sp: -1 })).toThrow(ApiError);
    expect(parseHostAction({ ...o, sp: 9999, stock: { wood: 9999 } })).toEqual({ ...o, sp: 9999, stock: { wood: 9999 } });
  });
});

describe("end during a tiebreak (handler)", () => {
  it("end decides the tiebreak instead of silently doing nothing", async () => {
    let g = revealGame({ teams: 2 });
    for (const t of g.teams) g = withTeam(g, t.id, { sp: 1, stock: stock({ wood: 1 }) });
    const { repo, env, host } = await seeded(g);
    const a = await hostActionHandler(repo, env, g.code, host, { type: "end" }, T0);
    expect(a.phase).toBe("tiebreak");
    const b = await hostActionHandler(repo, env, g.code, host, { type: "end" }, T0);
    expect(b.phase).toBe("finished");
    expect(["t1", "t2"]).toContain(b.winnerId);
  });
});

describe("host login", () => {
  it("a correct password returns a host token that works for a host action", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code } = await newGame(repo, env);
    const { hostToken } = await hostLoginHandler(repo, env, code, PASSWORD, T0 + 1000);
    const s = await hostActionHandler(repo, env, code, hostToken, { type: "extend", seconds: 5 }, T0 + 1000).catch((e) => e);
    // extend is WRONG_PHASE in the lobby, but that is an engine error, not an auth error
    expect(s).toBeInstanceOf(ApiError);
    expect((s as ApiError).status).toBe(400);
    const ok = await hostActionHandler(repo, env, code, hostToken, { type: "end" }, T0 + 1000);
    expect(ok.phase).toBe("finished");
  });

  it("token lifetime is 24 hours (the maximum allowed) and host login tokens last that long", async () => {
    expect(TOKEN_TTL_MS).toBe(24 * 60 * 60 * 1000);
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code } = await newGame(repo, env);
    const { hostToken } = await hostLoginHandler(repo, env, code, PASSWORD, T0);
    expect(verifyToken(hostToken, env.tokenSecret, T0 + 23 * 3600 * 1000)).not.toBeNull();
    expect(verifyToken(hostToken, env.tokenSecret, T0 + TOKEN_TTL_MS + 1)).toBeNull();
  });

  it("a wrong password gets the same 401 as create", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code } = await newGame(repo, env);
    const e = await apiErr(hostLoginHandler(repo, env, code, "nope", T0));
    expect(e.status).toBe(401);
    expect(e.code).toBe("UNAUTHORIZED");
  });

  it("an unknown code is not found", async () => {
    const { env } = makeEnv();
    const e = await apiErr(hostLoginHandler(memoryRepo(), env, "ABCDEF", PASSWORD, T0));
    expect(e.status).toBe(404);
  });

  it("a token minted for an earlier game with the same code is rejected", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code } = await newGame(repo, env);
    const { hostToken } = await hostLoginHandler(repo, env, code, PASSWORD, T0);
    const old = await repo.get(code);
    const fresh = memoryRepo(() => T0);
    await fresh.create({ ...old!, createdAt: old!.createdAt + 5 });
    const e = await apiErr(hostActionHandler(fresh, env, code, hostToken, { type: "end" }, T0));
    expect(e.status).toBe(401);
  });

  it("parseLoginBody needs a non-empty string of at most 200 characters", () => {
    expect(parseLoginBody({ password: "x" })).toEqual({ password: "x" });
    for (const b of [{}, { password: "" }, { password: "x".repeat(201) }, { password: 5 }, null]) {
      expect(() => parseLoginBody(b)).toThrow();
    }
  });
});

describe("host start opens round 1 (fix wave C1)", () => {
  it("one Start from the lobby gives the question phase of round 1", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code, hostToken } = await newGame(repo, env);
    await joinHandler(repo, env, code, { teamName: "A", deviceId: "d" }, T0);
    const s = await hostActionHandler(repo, env, code, hostToken, { type: "start" }, T0);
    expect(s.phase).toBe("question");
    expect(s.round!.n).toBe(1);
    expect(s.round!.questions.t1).toBeDefined();
    const stored = (await repo.get(code))!;
    expect(stored.log).toContain("game started");
  });

  it("a second Start (double click) is a harmless WRONG_PHASE that changes nothing", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code, hostToken } = await newGame(repo, env);
    await joinHandler(repo, env, code, { teamName: "A", deviceId: "d" }, T0);
    await hostActionHandler(repo, env, code, hostToken, { type: "start" }, T0);
    const before = await repo.get(code);
    const e = await apiErr(hostActionHandler(repo, env, code, hostToken, { type: "start" }, T0));
    expect(e.code).toBe("WRONG_PHASE");
    expect(await repo.get(code)).toEqual(before);
  });

  it("a lobby game that is already locked (an earlier partial start) also proceeds to round 1", async () => {
    let g = createGame({ units: [11], length: "quick", timerSeconds: 60, seed: "s", code: "ABC234", now: T0 });
    g = addTeam(g, "A", "d0").g;
    g = startGame(g);
    expect(g.phase).toBe("lobby");
    const { repo, env, host } = await seeded(g);
    const s = await hostActionHandler(repo, env, g.code, host, { type: "start" }, T0);
    expect(s.phase).toBe("question");
    expect(s.round!.n).toBe(1);
  });

  it("Start with no teams is NO_TEAMS", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code, hostToken } = await newGame(repo, env);
    expect((await apiErr(hostActionHandler(repo, env, code, hostToken, { type: "start" }, T0))).code).toBe("NO_TEAMS");
  });
});

describe("one team per device (fix wave I2)", () => {
  it("joining a different team with the same device is a 409 ALREADY_ON_TEAM; same-team rejoin is fine", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code } = await newGame(repo, env);
    const a = await joinHandler(repo, env, code, { teamName: "A", deviceId: "d" }, T0);
    const b = await joinHandler(repo, env, code, { teamName: "B", deviceId: "other" }, T0);
    const byId = await apiErr(joinHandler(repo, env, code, { teamId: b.teamId, deviceId: "d" }, T0));
    expect(byId.status).toBe(409);
    expect(byId.code).toBe("ALREADY_ON_TEAM");
    const byName = await apiErr(joinHandler(repo, env, code, { teamName: "C", deviceId: "d" }, T0));
    expect(byName.code).toBe("ALREADY_ON_TEAM");
    expect((await joinHandler(repo, env, code, { teamId: a.teamId, deviceId: "d" }, T0)).deviceIndex).toBe(0);
  });

  it("toApiError maps ALREADY_ON_TEAM to 409", () => {
    const e = toApiError(new GameError("ALREADY_ON_TEAM"));
    expect(e.status).toBe(409);
    expect(errorBody(e)).toEqual({ error: "ALREADY_ON_TEAM" });
  });

  it("host resetDevices keeps device 0, cuts off the others, and frees them to join another team", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code, hostToken } = await newGame(repo, env);
    const a = await joinHandler(repo, env, code, { teamName: "A", deviceId: "cap" }, T0);
    const mate = await joinHandler(repo, env, code, { teamId: a.teamId, deviceId: "mate" }, T0);
    const b = await joinHandler(repo, env, code, { teamName: "B", deviceId: "b0" }, T0);
    const s = await hostActionHandler(repo, env, code, hostToken, { type: "resetDevices", teamId: a.teamId }, T0);
    expect(s.teams.find((t) => t.id === a.teamId)!.deviceCount).toBe(1);
    expect((await repo.get(code))!.log).toContain(`reset devices ${a.teamId} (1 removed)`);
    expect((await apiErr(teamSuggestionsHandler(repo, env, code, mate.teamToken, T0))).status).toBe(401);
    await expect(teamSuggestionsHandler(repo, env, code, a.teamToken, T0)).resolves.toEqual({ suggestions: [] });
    expect((await joinHandler(repo, env, code, { teamId: b.teamId, deviceId: "mate" }, T0)).deviceIndex).toBe(1);
  });

  it("parseHostAction accepts resetDevices with a team id only", () => {
    expect(parseHostAction({ type: "resetDevices", teamId: "t1" })).toEqual({ type: "resetDevices", teamId: "t1" });
    expect(() => parseHostAction({ type: "resetDevices" })).toThrow(ApiError);
  });
});

describe("timer host actions", () => {
  it("parseHostAction validates shorten and setTimer strictly", () => {
    expect(parseHostAction({ type: "shorten", seconds: 10 })).toEqual({ type: "shorten", seconds: 10 });
    expect(parseHostAction({ type: "setTimer", seconds: TIMER_MIN_SECONDS })).toEqual({ type: "setTimer", seconds: TIMER_MIN_SECONDS });
    expect(parseHostAction({ type: "setTimer", seconds: TIMER_MAX_SECONDS })).toEqual({ type: "setTimer", seconds: TIMER_MAX_SECONDS });
    for (const seconds of [0, -5, 601, 1.5, "30", null, undefined, NaN]) {
      expect(() => parseHostAction({ type: "shorten", seconds })).toThrow(ApiError);
    }
    for (const seconds of [0, TIMER_MIN_SECONDS - 1, TIMER_MAX_SECONDS + 1, 30.5, "30", null, undefined, NaN]) {
      expect(() => parseHostAction({ type: "setTimer", seconds })).toThrow(ApiError);
    }
    expect(() => parseHostAction({ type: "setTimer" })).toThrow(ApiError);
  });

  it("setTimer works in the lobby, is saved, logged and shown in the public state", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code, hostToken } = await newGame(repo, env);
    const s = await hostActionHandler(repo, env, code, hostToken, { type: "setTimer", seconds: 30 }, T0 + 1);
    expect(s.timerSeconds).toBe(30);
    const stored = (await repo.get(code))!;
    expect(stored.timerSeconds).toBe(30);
    expect(stored.log).toContain("timer 30s");
    await joinHandler(repo, env, code, { teamName: "A", deviceId: "d1" }, T0);
    const q = await hostActionHandler(repo, env, code, hostToken, { type: "start" }, T0 + 2);
    expect(q.round!.endsAt - q.round!.startedAt).toBe(30_000);
  });

  it("shorten cuts the running round, notifies, and does not touch the timer for later rounds", async () => {
    const repo = memoryRepo();
    const { env, calls } = makeEnv();
    const { code, hostToken } = await newGame(repo, env);
    await joinHandler(repo, env, code, { teamName: "A", deviceId: "d1" }, T0);
    const q = await hostActionHandler(repo, env, code, hostToken, { type: "start" }, T0);
    const before = calls.length;
    const s = await hostActionHandler(repo, env, code, hostToken, { type: "shorten", seconds: 10 }, T0 + 1000);
    expect(s.round!.endsAt).toBe(q.round!.endsAt - 10_000);
    expect(s.timerSeconds).toBe(60);
    expect(calls.length).toBeGreaterThan(before);
    const expired = await hostActionHandler(repo, env, code, hostToken, { type: "shorten", seconds: 600 }, T0 + 2000);
    expect(expired.round!.endsAt).toBe(T0 + 2000);
  });

  it("shorten is WRONG_PHASE in the lobby", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code, hostToken } = await newGame(repo, env);
    const e = await hostActionHandler(repo, env, code, hostToken, { type: "shorten", seconds: 10 }, T0).catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect((e as ApiError).code).toBe("WRONG_PHASE");
  });

  it("setTimer is refused once the game is finished", async () => {
    const repo = memoryRepo();
    const { env } = makeEnv();
    const { code, hostToken } = await newGame(repo, env);
    await hostActionHandler(repo, env, code, hostToken, { type: "end" }, T0);
    const e = await hostActionHandler(repo, env, code, hostToken, { type: "setTimer", seconds: 30 }, T0).catch((x) => x);
    expect((e as ApiError).code).toBe("WRONG_PHASE");
  });
});

describe("conflict retries (fix wave I3)", () => {
  /** A repo whose first `n` saves lose the race (throw VersionConflict) before succeeding. */
  function flaky(repo: GameRepo, n: number) {
    let saves = 0;
    const r: GameRepo = {
      ...repo,
      async save(g, v) {
        saves++;
        if (saves <= n) throw new VersionConflict(g.code, v);
        return repo.save(g, v);
      },
    };
    return { r, saves: () => saves };
  }

  it("succeeds on the 2nd attempt after one jittered wait", async () => {
    const repo = memoryRepo();
    const { env, sleeps } = makeEnv();
    const { code } = await newGame(repo, env);
    const f = flaky(repo, 1);
    await expect(joinHandler(f.r, env, code, { teamName: "A", deviceId: "d" }, T0)).resolves.toMatchObject({ teamId: "t1" });
    expect(f.saves()).toBe(2);
    expect(sleeps).toHaveLength(1);
  });

  it("succeeds on the 3rd attempt", async () => {
    const repo = memoryRepo();
    const { env, sleeps } = makeEnv();
    const { code } = await newGame(repo, env);
    const f = flaky(repo, 2);
    await expect(joinHandler(f.r, env, code, { teamName: "A", deviceId: "d" }, T0)).resolves.toMatchObject({ teamId: "t1" });
    expect(f.saves()).toBe(3);
    expect(sleeps).toHaveLength(2);
    expect((await repo.get(code))!.teams).toHaveLength(1);
  });

  it("waits between 20 and 80 ms, chosen by the injected random source", async () => {
    for (const [rand, want] of [[0, 20], [0.999999, 80], [0.5, 50]] as const) {
      const repo = memoryRepo();
      const { env } = makeEnv();
      const waits: number[] = [];
      const e2 = { ...env, retry: { sleep: async (ms: number) => void waits.push(ms), rand: () => rand } };
      const { code } = await newGame(repo, e2);
      await joinHandler(flaky(repo, 3).r, e2, code, { teamName: "A", deviceId: "d" }, T0);
      expect(waits).toEqual([want, want, want]);
    }
  });

  it("an engine error is not retried", async () => {
    const repo = memoryRepo();
    const { env, sleeps } = makeEnv();
    const { code, hostToken } = await newGame(repo, env);
    expect((await apiErr(hostActionHandler(repo, env, code, hostToken, { type: "start" }, T0))).code).toBe("NO_TEAMS");
    expect(sleeps).toHaveLength(0);
  });
});
