import { createHash, timingSafeEqual } from "node:crypto";
import { MIN_SECRET_LENGTH } from "@/lib/auth";
import { ABANDONED_GAME_MAX_AGE_MS, FINISHED_GAME_MAX_AGE_MS } from "@/lib/config";
import type { GameRepo } from "@/lib/repo/types";
import { ApiError } from "./errors";

/** Framework-free cron logic. Routes only wire serverDeps and the request header. */

export interface CronEnv {
  cronSecret: string | undefined;
}


const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest();

/**
 * Fails closed: a missing or short CRON_SECRET is a 500 (nothing is ever
 * accepted); a missing or wrong Bearer header is a 401 with no detail.
 */
function authorize(env: CronEnv, authHeader: string | null): void {
  const secret = env.cronSecret;
  if (typeof secret !== "string" || secret.length < MIN_SECRET_LENGTH) {
    throw new ApiError(500, "SERVER_MISCONFIGURED");
  }
  const h = typeof authHeader === "string" ? authHeader : "";
  const given = h.startsWith("Bearer ") ? h.slice(7) : "";
  // Both sides hashed so lengths always match for the constant-time compare.
  if (given === "" || !timingSafeEqual(sha256(given), sha256(secret))) {
    throw new ApiError(401, "UNAUTHORIZED");
  }
}

/** Touches the database so the free-tier project is not paused for inactivity. */
export async function keepaliveHandler(
  repo: GameRepo,
  env: CronEnv,
  authHeader: string | null,
): Promise<{ ok: true }> {
  authorize(env, authHeader);
  await repo.ping();
  return { ok: true };
}

/** Deletes finished games after 24 hours and never-finished games after 90 days; running games are kept. */
export async function cleanupHandler(
  repo: GameRepo,
  env: CronEnv,
  authHeader: string | null,
): Promise<{ deleted: number }> {
  authorize(env, authHeader);
  return { deleted: await repo.deleteStale(FINISHED_GAME_MAX_AGE_MS, ABANDONED_GAME_MAX_AGE_MS) };
}
