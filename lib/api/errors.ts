import { GameError } from "@/lib/engine/game";
import type { PublicGameState } from "@/lib/engine/public";
import { VersionConflict } from "@/lib/repo/types";

export type ApiStatus = 400 | 401 | 404 | 409 | 500;

/**
 * The one error type handlers throw. `code` is safe to show to a browser;
 * `state` (on 409 and failed saves) is the game's current public state so the
 * caller can resync. Messages never carry secrets or internal error text.
 */
export class ApiError extends Error {
  status: ApiStatus;
  code: string;
  state?: PublicGameState;
  constructor(status: ApiStatus, code: string, detail?: string, state?: PublicGameState) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.state = state;
  }
}

/** Maps anything thrown inside a handler to an ApiError (engine 400/404, conflict 409, else 500). */
export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  if (e instanceof GameError) return new ApiError(e.code === "NOT_FOUND" ? 404 : 400, e.code);
  if (e instanceof VersionConflict) return new ApiError(409, "CONFLICT");
  return new ApiError(500, "INTERNAL");
}

/** JSON body for an error response. */
export function errorBody(e: ApiError): { error: string; state?: PublicGameState } {
  return e.state ? { error: e.code, state: e.state } : { error: e.code };
}
