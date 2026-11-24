import { describe, expect, it } from "vitest";
import { memoryRepo } from "@/lib/repo/memory";
import { supabaseRepo } from "@/lib/repo/supabase";
import { VersionConflict, type GameRepo } from "@/lib/repo/types";
import type { GameState } from "@/lib/types";
import { questionGame, startedGame } from "./helpers/game";
import { fakeSupabase } from "./helpers/supabaseFake";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 10, 24, 9, 0, 0);

/** A new version of `g`, as an engine step would produce. */
function bumped(g: GameState, patch: Partial<GameState> = {}): GameState {
  return { ...g, ...patch, version: g.version + 1 };
}

function game(code: string, createdAt: number, base: GameState = startedGame(2)): GameState {
  return { ...base, code, createdAt };
}

/** Each factory returns a fresh repo and a settable clock. */
const factories: [string, () => { repo: GameRepo; setNow: (n: number) => void }][] = [
  [
    "memoryRepo",
    () => {
      let now = T0;
      return { repo: memoryRepo(() => now), setNow: (n) => (now = n) };
    },
  ],
  [
    "supabaseRepo (fake client)",
    () => {
      let now = T0;
      const repo = supabaseRepo("http://unused.invalid", "unused-key", fakeSupabase().client, () => now);
      return { repo, setNow: (n) => (now = n) };
    },
  ],
];

describe.each(factories)("%s", (_name, make) => {
  it("creates, gets and saves a game", async () => {
    const { repo } = make();
    const g = game("AAA222", T0);
    await repo.create(g);
    expect(await repo.get("AAA222")).toStrictEqual(g);
    expect(await repo.get("ZZZ999")).toBeNull();

    const next = bumped(g, { roundsPlayed: 2 });
    expect(next.version).toBe(g.version + 1);
    await repo.save(next, g.version);
    expect(await repo.get("AAA222")).toStrictEqual(next);
  });

  it("rejects a duplicate code on create", async () => {
    const { repo } = make();
    await repo.create(game("AAA222", T0));
    await expect(repo.create(game("AAA222", T0))).rejects.toThrow("DUPLICATE_CODE");
  });

  it("throws VersionConflict on a stale save and keeps the stored state", async () => {
    const { repo } = make();
    const g = game("AAA222", T0);
    await repo.create(g);
    const a = bumped(g, { winnerId: "t1" });
    const b = bumped(g, { winnerId: "t2" }); // a second writer that read the same version
    await repo.save(a, g.version);
    await expect(repo.save(b, g.version)).rejects.toBeInstanceOf(VersionConflict);
    expect(await repo.get("AAA222")).toStrictEqual(a);
  });

  it("throws VersionConflict when saving a game that does not exist", async () => {
    const { repo } = make();
    const g = game("AAA222", T0);
    await expect(repo.save({ ...g, version: g.version + 1 }, g.version)).rejects.toBeInstanceOf(VersionConflict);
  });

  it("rejects a save whose version does not increase", async () => {
    const { repo } = make();
    const g = game("AAA222", T0);
    await repo.create(g);
    await expect(repo.save(g, g.version)).rejects.toThrow("BAD_VERSION");
    await expect(repo.save({ ...g, version: g.version - 1 }, g.version)).rejects.toThrow("BAD_VERSION");
    const err = await repo.save(g, g.version).catch((e) => e);
    expect(err).not.toBeInstanceOf(VersionConflict);
    expect(await repo.get("AAA222")).toStrictEqual(g);
  });

  it("lists active codes", async () => {
    const { repo } = make();
    expect(await repo.activeCodes()).toEqual(new Set());
    await repo.create(game("AAA222", T0));
    await repo.create(game("BBB333", T0));
    expect(await repo.activeCodes()).toEqual(new Set(["AAA222", "BBB333"]));
  });

  it("deleteOlderThan removes only games created before now - ms", async () => {
    const { repo, setNow } = make();
    await repo.create(game("OLD222", T0 - 1));
    await repo.create(game("EDG333", T0)); // exactly at the cutoff: kept
    await repo.create(game("NEW444", T0 + 1000));
    setNow(T0 + DAY);
    expect(await repo.deleteOlderThan(DAY)).toBe(1);
    expect(await repo.activeCodes()).toEqual(new Set(["EDG333", "NEW444"]));
    expect(await repo.get("OLD222")).toBeNull();
    expect(await repo.deleteOlderThan(DAY)).toBe(0);
    setNow(T0 + DAY + 1);
    expect(await repo.deleteOlderThan(DAY)).toBe(1);
    expect(await repo.activeCodes()).toEqual(new Set(["NEW444"]));
  });

  it("pings", async () => {
    const { repo } = make();
    await expect(repo.ping()).resolves.toBeUndefined();
  });

  it("does not alias stored state with created, fetched or saved objects", async () => {
    const { repo } = make();
    const g = game("AAA222", T0, questionGame(2));
    await repo.create(g);
    g.teams[0].stock.water = 500; // mutate the object passed to create
    const got = (await repo.get("AAA222"))!;
    expect(got.teams[0].stock.water).not.toBe(500);
    got.teams[0].name = "Hacked";
    got.round!.questions.t1.solution = "changed";
    const again = (await repo.get("AAA222"))!;
    expect(again.teams[0].name).not.toBe("Hacked");
    expect(again.round!.questions.t1.solution).not.toBe("changed");

    const next = { ...again, version: again.version + 1, roundsPlayed: 3 };
    await repo.save(next, again.version);
    next.roundsPlayed = 9;
    expect((await repo.get("AAA222"))!.roundsPlayed).toBe(3);
  });
});

describe("supabaseRepo specifics", () => {
  it("writes a sanitised game_public row on create and after every save", async () => {
    const fake = fakeSupabase();
    const repo = supabaseRepo("http://unused.invalid", "k", fake.client, () => T0);
    const g = game("AAA222", T0, questionGame(2));
    await repo.create(g);
    const pub1 = fake.table("game_public").get("AAA222")!;
    expect((pub1.state as { version: number }).version).toBe(g.version);

    const next = { ...g, version: g.version + 1, roundsPlayed: 1 };
    await repo.save(next, g.version);
    const pub2 = fake.table("game_public").get("AAA222")!;
    expect(pub2.state).toMatchObject({ version: next.version, roundsPlayed: 1, serverNow: T0 });
    const json = JSON.stringify(pub2.state);
    expect(json).not.toContain('"seed"');
    expect(json).not.toContain('"log"');
    for (const q of Object.values(g.round!.questions)) expect(json).not.toContain(q.solution);

    const row = fake.table("games").get("AAA222")!;
    expect(row.version).toBe(next.version);
    expect(row.created_at).toBe(new Date(T0).toISOString());
  });

  it("does not write game_public after a version conflict", async () => {
    const fake = fakeSupabase();
    const repo = supabaseRepo("http://unused.invalid", "k", fake.client, () => T0);
    const g = game("AAA222", T0);
    await repo.create(g);
    await repo.save({ ...g, version: g.version + 1 }, g.version);
    const before = structuredClone(fake.table("game_public").get("AAA222"));
    await expect(repo.save({ ...g, version: g.version + 2, roundsPlayed: 5 }, g.version)).rejects.toBeInstanceOf(
      VersionConflict,
    );
    expect(fake.table("game_public").get("AAA222")).toStrictEqual(before);
  });

  it("deleteOlderThan also removes the matching game_public rows", async () => {
    const fake = fakeSupabase();
    let now = T0;
    const repo = supabaseRepo("http://unused.invalid", "k", fake.client, () => now);
    await repo.create(game("OLD222", T0 - DAY));
    await repo.create(game("NEW444", T0));
    now = T0 + 1;
    expect(await repo.deleteOlderThan(DAY)).toBe(1);
    expect([...fake.table("game_public").keys()]).toEqual(["NEW444"]);
  });
});
