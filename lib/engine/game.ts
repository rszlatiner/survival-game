import { MAX_DEVICES, MAX_TEAMS, START_STOCK } from "@/lib/config";
import { ZONE_IDS } from "@/lib/questions/types";
import { makeRng } from "@/lib/rng";
import type { GameLength, GameState, Stock, Team } from "@/lib/types";

export type GameErrorCode =
  | "LOCKED"
  | "TOO_MANY_TEAMS"
  | "TOO_MANY_DEVICES"
  | "EMPTY_NAME"
  | "NOT_FOUND"
  | "BAD_INDEX"
  | "NO_TEAMS"
  | "WRONG_PHASE"
  | "BAD_UNITS";

export class GameError extends Error {
  code: GameErrorCode;
  constructor(code: GameErrorCode, message?: string) {
    super(message ?? code);
    this.name = "GameError";
    this.code = code;
  }
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const NAME_MAX = 24;
const STARTED = "game started";

/** Returns a new state with `patch` applied and `version + 1`. */
function bump(g: GameState, patch: Partial<GameState>): GameState {
  return { ...g, ...patch, version: g.version + 1 };
}

function cleanName(name: string): string {
  const n = name.trim().replace(/\s+/g, " ").slice(0, NAME_MAX).trim();
  if (!n) throw new GameError("EMPTY_NAME");
  return n;
}

function findTeam(g: GameState, teamId: string): Team {
  const t = g.teams.find((x) => x.id === teamId);
  if (!t) throw new GameError("NOT_FOUND", `team ${teamId}`);
  return t;
}

function replaceTeam(g: GameState, team: Team): Team[] {
  return g.teams.map((t) => (t.id === team.id ? team : t));
}

/** True once the game has started: no new teams, renames or removals. */
export function isLocked(g: GameState): boolean {
  return g.roundsPlayed > 0 || g.round !== null || g.log.includes(STARTED);
}

export function createGame(opts: {
  units: number[];
  length: GameLength;
  timerSeconds: number;
  seed: string;
  code: string;
  now: number;
}): GameState {
  if (
    !opts.units.length ||
    !opts.units.every((u) => Number.isInteger(u) && u >= 1 && u <= 15)
  ) {
    throw new GameError("BAD_UNITS");
  }
  const fund: Stock = { water: 0, food: 0, wood: 0, stone: 0 };
  return {
    code: opts.code,
    version: 0,
    createdAt: opts.now,
    units: [...opts.units],
    length: opts.length,
    timerSeconds: opts.timerSeconds,
    seed: opts.seed,
    phase: "lobby",
    teams: [],
    round: null,
    roundsPlayed: 0,
    fund,
    winnerId: null,
    tiedIds: [],
    log: [],
  };
}

export function generateCode(rng: () => number, taken: Set<string>): string {
  for (;;) {
    let c = "";
    for (let i = 0; i < 6; i++) c += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
    if (!taken.has(c)) return c;
  }
}

export function addTeam(
  g: GameState,
  name: string,
  deviceId: string,
): { g: GameState; teamId: string } {
  if (isLocked(g)) throw new GameError("LOCKED");
  const clean = cleanName(name);
  if (g.teams.length >= MAX_TEAMS) throw new GameError("TOO_MANY_TEAMS");
  const maxId = g.teams.reduce((m, t) => Math.max(m, Number(t.id.slice(1)) || 0), 0);
  const teamId = `t${maxId + 1}`;
  const team: Team = {
    id: teamId,
    name: clean,
    // Placeholder: zones are only meaningful once startGame has run.
    zone: ZONE_IDS[0],
    devices: [deviceId],
    captainIndex: 0,
    stock: { ...START_STOCK },
    builds: [],
    sp: 0,
    fundGiven: 0,
  };
  return { g: bump(g, { teams: [...g.teams, team] }), teamId };
}

/** Joins an existing team. Allowed in any phase except "finished". */
export function joinTeam(g: GameState, teamId: string, deviceId: string): GameState {
  if (g.phase === "finished") throw new GameError("WRONG_PHASE");
  const t = findTeam(g, teamId);
  if (t.devices.includes(deviceId)) return g; // idempotent no-op: no version bump
  if (t.devices.length >= MAX_DEVICES) throw new GameError("TOO_MANY_DEVICES");
  return bump(g, { teams: replaceTeam(g, { ...t, devices: [...t.devices, deviceId] }) });
}

/**
 * Locks joining of new teams and assigns zones. Does not start a round or
 * change phase; locking is derived via `isLocked`.
 */
export function startGame(g: GameState): GameState {
  if (g.teams.length < 1) throw new GameError("NO_TEAMS");
  if (g.phase !== "lobby" || isLocked(g)) throw new GameError("WRONG_PHASE");
  const rng = makeRng(`${g.seed}:zones`);
  const zones = [...ZONE_IDS];
  for (let i = zones.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [zones[i], zones[j]] = [zones[j], zones[i]];
  }
  const teams = g.teams.map((t, i) => ({ ...t, zone: zones[i % zones.length] }));
  return bump(g, { teams, log: [...g.log, STARTED] });
}

export function captainOf(t: Team): string {
  return t.devices[t.captainIndex];
}

export function setCaptain(g: GameState, teamId: string, deviceIndex: number): GameState {
  const t = findTeam(g, teamId);
  if (!Number.isInteger(deviceIndex) || deviceIndex < 0 || deviceIndex >= t.devices.length) {
    throw new GameError("BAD_INDEX");
  }
  return bump(g, { teams: replaceTeam(g, { ...t, captainIndex: deviceIndex }) });
}

export function renameTeam(g: GameState, teamId: string, name: string): GameState {
  if (isLocked(g)) throw new GameError("LOCKED");
  const t = findTeam(g, teamId);
  return bump(g, { teams: replaceTeam(g, { ...t, name: cleanName(name) }) });
}

export function removeTeam(g: GameState, teamId: string): GameState {
  if (isLocked(g)) throw new GameError("LOCKED");
  findTeam(g, teamId);
  return bump(g, { teams: g.teams.filter((t) => t.id !== teamId) });
}
