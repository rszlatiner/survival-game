import { supabaseRepo } from "@/lib/repo/supabase";
import { supabaseNotifier } from "@/lib/repo/notify";
import type { GameRepo } from "@/lib/repo/types";
import { ApiError, errorBody, toApiError } from "./errors";
import type { HandlerEnv } from "./handlers";

/**
 * Server-only wiring for the route files: repo and notifier built from the
 * environment with the service-role key, plus request/response helpers.
 * Never import this from client code.
 */

let deps: { repo: GameRepo; env: HandlerEnv } | null = null;

export function serverDeps(): { repo: GameRepo; env: HandlerEnv } {
  if (deps) return deps;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new ApiError(500, "SERVER_MISCONFIGURED");
  deps = {
    repo: supabaseRepo(url, serviceKey),
    env: {
      teacherPassword: process.env.TEACHER_PASSWORD ?? "",
      tokenSecret: process.env.TOKEN_SECRET ?? "",
      notifier: supabaseNotifier(url, serviceKey),
    },
  };
  return deps;
}

const MAX_BODY_BYTES = 16 * 1024;

export async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new ApiError(400, "BAD_REQUEST");
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "BAD_REQUEST");
  }
}

/** The token from `Authorization: Bearer <token>`, or "" (which never verifies). */
export function bearer(req: Request): string {
  const h = req.headers.get("authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}

const NO_STORE = { "Cache-Control": "no-store" };

/** Runs a handler and turns its result or error into a JSON response. Logs only error codes. */
export async function respond(fn: () => Promise<unknown>, okStatus = 200): Promise<Response> {
  try {
    return Response.json(await fn(), { status: okStatus, headers: NO_STORE });
  } catch (e) {
    const err = toApiError(e);
    if (err.status === 500) console.error(`api error ${err.code}`);
    return Response.json(errorBody(err), { status: err.status, headers: NO_STORE });
  }
}
