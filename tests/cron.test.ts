// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, it, expect, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { cleanupHandler, keepaliveHandler } from "@/lib/api/cron";
import { memoryRepo } from "@/lib/repo/memory";
import type { GameRepo } from "@/lib/repo/types";
import type { GameState } from "@/lib/types";
import { startedGame } from "./helpers/game";

const SECRET = "cron-secret-0123456789-abcdefghijk";
const HOUR = 3_600_000;
const NOW = 100 * HOUR;

function status(fn: () => Promise<unknown>): Promise<number | "ok"> {
  return fn().then(
    () => "ok" as const,
    (e) => (e instanceof ApiError ? e.status : 0),
  );
}

function spyRepo(): GameRepo & { ping: ReturnType<typeof vi.fn> } {
  const base = memoryRepo(() => NOW);
  return { ...base, ping: vi.fn(async () => {}) };
}

const at = (code: string, createdAt: number): GameState => ({ ...startedGame(), code, createdAt });

describe.each([
  ["keepalive", (repo: GameRepo, secret: string, h: string | null) => keepaliveHandler(repo, { cronSecret: secret }, h)],
  ["cleanup", (repo: GameRepo, secret: string, h: string | null) => cleanupHandler(repo, { cronSecret: secret }, h)],
])("%s auth", (_name, run) => {
  it("401 on missing or wrong header", async () => {
    const repo = spyRepo();
    expect(await status(() => run(repo, SECRET, null))).toBe(401);
    expect(await status(() => run(repo, SECRET, ""))).toBe(401);
    expect(await status(() => run(repo, SECRET, "Bearer wrong"))).toBe(401);
    expect(await status(() => run(repo, SECRET, SECRET))).toBe(401);
    expect(repo.ping).not.toHaveBeenCalled();
  });
  it("500 when the secret is unset or short, even with a matching header", async () => {
    const repo = spyRepo();
    for (const s of ["", "short-secret", "x".repeat(31), undefined as unknown as string]) {
      expect(await status(() => run(repo, s, `Bearer ${s}`))).toBe(500);
      expect(await status(() => run(repo, s, null))).toBe(500);
      expect(await status(() => run(repo, s, "Bearer "))).toBe(500);
    }
    expect(repo.ping).not.toHaveBeenCalled();
  });
});

describe("keepalive", () => {
  it("pings once and returns ok", async () => {
    const repo = spyRepo();
    expect(await keepaliveHandler(repo, { cronSecret: SECRET }, `Bearer ${SECRET}`)).toEqual({ ok: true });
    expect(repo.ping).toHaveBeenCalledTimes(1);
  });
});

describe("cleanup", () => {
  it("deletes only games older than 24 hours", async () => {
    const repo = spyRepo();
    await repo.create(at("OLD1", NOW - 24 * HOUR - 1));
    await repo.create(at("OLD2", NOW - 48 * HOUR));
    await repo.create(at("EDGE", NOW - 24 * HOUR));
    await repo.create(at("NEW1", NOW - 23 * HOUR));
    await repo.create(at("NEW2", NOW));
    const out = await cleanupHandler(repo, { cronSecret: SECRET }, `Bearer ${SECRET}`);
    expect(out).toEqual({ deleted: 2 });
    expect([...(await repo.activeCodes())].sort()).toEqual(["EDGE", "NEW1", "NEW2"]);
  });
});

describe("vercel.json", () => {
  const cfg = JSON.parse(readFileSync("vercel.json", "utf8")) as { crons: { path: string; schedule: string }[] };
  it.each(["/api/cron/keepalive", "/api/cron/cleanup"])("schedules %s daily", (path) => {
    const hits = cfg.crons.filter((c) => c.path === path);
    expect(hits).toHaveLength(1);
    const f = hits[0].schedule.split(" ");
    expect(f).toHaveLength(5);
    expect(f[0]).toMatch(/^\d+$/);
    expect(f[1]).toMatch(/^\d+$/);
    expect(f.slice(2)).toEqual(["*", "*", "*"]);
  });
  it("uses distinct times", () => {
    expect(new Set(cfg.crons.map((c) => c.schedule)).size).toBe(cfg.crons.length);
  });
});
