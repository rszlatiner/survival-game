import type { GameState } from "@/lib/types";
import { VersionConflict, assertIncreasing, type GameRepo } from "./types";

/**
 * In-process repo for tests and local play. States are deep-copied on the
 * way in and out so callers can never alias stored data. The clock is
 * injectable so expiry can be tested without the real time.
 */
export function memoryRepo(now: () => number = Date.now): GameRepo {
  const games = new Map<string, GameState>();
  return {
    async create(g) {
      if (games.has(g.code)) throw new Error("DUPLICATE_CODE");
      games.set(g.code, structuredClone(g));
    },
    async get(code) {
      const g = games.get(code);
      return g ? structuredClone(g) : null;
    },
    async save(g, expectedVersion) {
      assertIncreasing(g, expectedVersion);
      const cur = games.get(g.code);
      if (!cur || cur.version !== expectedVersion) throw new VersionConflict(g.code, expectedVersion);
      games.set(g.code, structuredClone(g));
    },
    async activeCodes() {
      return new Set(games.keys());
    },
    async deleteStale(finishedMs, abandonedMs) {
      const t = now();
      let n = 0;
      for (const [code, g] of games) {
        const stale = g.phase === "finished" ? g.createdAt < t - finishedMs : g.createdAt < t - abandonedMs;
        if (stale) {
          games.delete(code);
          n++;
        }
      }
      return n;
    },
    async ping() {},
  };
}
