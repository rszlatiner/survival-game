import type { GameState } from "@/lib/types";

/**
 * Storage for whole game states, with optimistic locking on `version`.
 *
 * `save(g, expectedVersion)` writes `g` only if the stored version equals
 * `expectedVersion` (otherwise, or if the game is missing, it throws
 * `VersionConflict`); the stored version becomes `g.version`. Callers must
 * skip `save` for engine no-ops (`next === g` / unchanged version): a save
 * whose `g.version <= expectedVersion` is a caller bug and throws
 * `Error("BAD_VERSION")`.
 */
export interface GameRepo {
  /** Throws Error("DUPLICATE_CODE") if the code is already stored. */
  create(g: GameState): Promise<void>;
  get(code: string): Promise<GameState | null>;
  save(g: GameState, expectedVersion: number): Promise<void>;
  activeCodes(): Promise<Set<string>>;
  /** Deletes games with createdAt < now - ms; returns how many were deleted. */
  deleteOlderThan(ms: number): Promise<number>;
  ping(): Promise<void>;
}

export class VersionConflict extends Error {
  constructor(code: string, expectedVersion: number) {
    super(`version conflict on ${code}: expected stored version ${expectedVersion}`);
    this.name = "VersionConflict";
  }
}

export function assertIncreasing(g: GameState, expectedVersion: number): void {
  if (!(g.version > expectedVersion)) {
    throw Object.assign(new Error("BAD_VERSION"), { code: "BAD_VERSION" });
  }
}
