import { randomBytes } from "node:crypto";
import { MIN_SECRET_LENGTH, checkPassword, signToken, verifyToken, type VerifiedToken } from "@/lib/auth";
import { buildItem, exchange } from "@/lib/engine/build";
import {
  addTeam,
  createGame,
  generateCode,
  joinTeam,
  removeTeam,
  renameTeam,
  setCaptain,
  startGame,
} from "@/lib/engine/game";
import { contribute, resolveHazard, resolveRaider } from "@/lib/engine/hazard";
import { endGame, extendTimer, overrideTeam, skipQuestion, suggestAnswer } from "@/lib/engine/host";
import { toPublicState, type PublicGameState } from "@/lib/engine/public";
import { revealRound, startRound, submitAnswer } from "@/lib/engine/round";
import { checkRaft, checkWinner, finishTiebreak, startTiebreak } from "@/lib/engine/win";
import type { Notifier } from "@/lib/repo/notify";
import { VersionConflict, type GameRepo } from "@/lib/repo/types";
import { makeRng } from "@/lib/rng";
import type { GameState } from "@/lib/types";
import { ApiError, toApiError } from "./errors";
import {
  normalizeCode,
  parseCreateBody,
  parseHostAction,
  parseJoinBody,
  parseLoginBody,
  parseTeamAction,
  type CreateBody,
  type HostAction,
  type JoinBody,
  type TeamAction,
} from "./parse";

export { ApiError } from "./errors";
export type { CreateBody, HostAction, JoinBody, TeamAction } from "./parse";

/**
 * Framework-free request handlers: each loads the game, applies engine
 * functions, saves with the version check (retrying once on a conflict),
 * then pings browsers. Every result a browser sees comes from toPublicState.
 */

export interface HandlerEnv {
  teacherPassword: string;
  tokenSecret: string;
  notifier: Notifier;
}

/** Token lifetime; games themselves are deleted after 24 hours. */
export const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const CREATE_ATTEMPTS = 5;

const unauthorized = () => new ApiError(401, "UNAUTHORIZED");
const notFound = () => new ApiError(404, "NOT_FOUND");

async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    throw toApiError(e);
  }
}

function requireSecret(env: HandlerEnv): void {
  if (typeof env.tokenSecret !== "string" || env.tokenSecret.length < MIN_SECRET_LENGTH) {
    throw new ApiError(500, "SERVER_MISCONFIGURED");
  }
}

const newSeed = () => randomBytes(16).toString("hex");

async function notify(n: Notifier, code: string, version: number): Promise<void> {
  try {
    await n.notify(code, version);
  } catch {
    // A missed ping only delays browsers until their next poll.
  }
}

async function publicOrNull(repo: GameRepo, code: string, now: number): Promise<PublicGameState | undefined> {
  try {
    const g = await repo.get(code);
    return g ? toPublicState(g, now) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Load, apply, save. `apply` must be pure in the loaded state (it is re-run on
 * a VersionConflict). An unchanged result (same object or same version) is not
 * saved and nobody is notified. Returns the state now stored.
 */
async function mutate(
  repo: GameRepo,
  env: HandlerEnv,
  code: string,
  now: number,
  apply: (g: GameState) => GameState,
): Promise<GameState> {
  for (let attempt = 0; ; attempt++) {
    const g = await repo.get(code);
    if (!g) throw notFound();
    const next = apply(g);
    if (next === g || next.version === g.version) return g;
    try {
      await repo.save(next, g.version);
    } catch (e) {
      if (e instanceof VersionConflict && attempt === 0) continue;
      // Re-read so the caller sees the true stored state, then report.
      const state = await publicOrNull(repo, code, now);
      if (e instanceof VersionConflict) throw new ApiError(409, "CONFLICT", undefined, state);
      throw new ApiError(500, "SAVE_FAILED", undefined, state);
    }
    await notify(env.notifier, code, next.version);
    return next;
  }
}

function verify(env: HandlerEnv, token: string, code: string, now: number, role: "host" | "team"): VerifiedToken {
  const claims = verifyToken(token, env.tokenSecret, now, code);
  if (!claims || claims.role !== role || claims.createdAt === undefined) throw unauthorized();
  if (role === "team" && (!claims.teamId || !claims.deviceId)) throw unauthorized();
  return claims;
}

/** The token must be for this exact game (not an earlier game with the same code). */
function sameGame(claims: VerifiedToken, g: GameState): void {
  if (claims.createdAt !== g.createdAt) throw unauthorized();
}

/** Team tokens authorise only while the device is still on the team. */
function teamMember(claims: VerifiedToken, g: GameState): { teamId: string; deviceId: string } {
  sameGame(claims, g);
  const team = g.teams.find((t) => t.id === claims.teamId);
  if (!team || !team.devices.includes(claims.deviceId!)) throw unauthorized();
  return { teamId: team.id, deviceId: claims.deviceId! };
}

export function createGameHandler(
  repo: GameRepo,
  env: HandlerEnv,
  body: CreateBody,
  now: number,
): Promise<{ code: string; hostToken: string }> {
  return guard(async () => {
    requireSecret(env);
    if (!env.teacherPassword) throw new ApiError(500, "SERVER_MISCONFIGURED");
    const b = parseCreateBody(body);
    if (!checkPassword(b.password, env.teacherPassword)) throw unauthorized();

    for (let i = 0; i < CREATE_ATTEMPTS; i++) {
      const code = generateCode(makeRng(newSeed()), await repo.activeCodes());
      const g = createGame({ units: b.units, length: b.length, timerSeconds: b.timerSeconds, seed: newSeed(), code, now });
      try {
        await repo.create(g);
      } catch (e) {
        if (e instanceof Error && e.message === "DUPLICATE_CODE") continue;
        throw e;
      }
      const hostToken = signToken({ role: "host", code, createdAt: g.createdAt }, env.tokenSecret, TOKEN_TTL_MS, now);
      return { code, hostToken };
    }
    throw new ApiError(409, "CONFLICT");
  });
}

/** Teacher signs in again to a running game with the teacher password (lost or expired host token). */
export function hostLoginHandler(
  repo: GameRepo,
  env: HandlerEnv,
  code: string,
  password: string,
  now: number,
): Promise<{ hostToken: string }> {
  return guard(async () => {
    requireSecret(env);
    if (!env.teacherPassword) throw new ApiError(500, "SERVER_MISCONFIGURED");
    const c = normalizeCode(code);
    const b = parseLoginBody({ password });
    if (!checkPassword(b.password, env.teacherPassword)) throw unauthorized();
    const g = await repo.get(c);
    if (!g) throw notFound();
    const hostToken = signToken({ role: "host", code: c, createdAt: g.createdAt }, env.tokenSecret, TOKEN_TTL_MS, now);
    return { hostToken };
  });
}

export function joinHandler(
  repo: GameRepo,
  env: HandlerEnv,
  code: string,
  body: JoinBody,
  now: number,
): Promise<{ teamId: string; teamToken: string; deviceIndex: number }> {
  return guard(async () => {
    requireSecret(env);
    const c = normalizeCode(code);
    const b = parseJoinBody(body);
    let teamId = "";
    const g = await mutate(repo, env, c, now, (g) => {
      if (b.teamId !== undefined) {
        teamId = b.teamId;
        return joinTeam(g, b.teamId, b.deviceId);
      }
      const added = addTeam(g, b.teamName!, b.deviceId);
      teamId = added.teamId;
      return added.g;
    });
    const teamToken = signToken(
      { role: "team", code: c, teamId, deviceId: b.deviceId, createdAt: g.createdAt },
      env.tokenSecret,
      TOKEN_TTL_MS,
      now,
    );
    // Join-order position of this device on its team; lets the device tell whether it is the captain.
    const deviceIndex = g.teams.find((t) => t.id === teamId)?.devices.indexOf(b.deviceId) ?? -1;
    return { teamId, teamToken, deviceIndex };
  });
}

/**
 * Host "next": from the lobby, round 1. From reveal: a pending tie starts the
 * tiebreak; otherwise settle this round's hazard, check the winner (on the last
 * round that is endRoundIfLast, i.e. final scoring), then start the next round,
 * or the tiebreak if final scoring tied.
 */
function next(g: GameState, now: number): GameState {
  if (g.phase !== "reveal") return startRound(g, now);
  if (g.tiedIds.length > 0) return startTiebreak(g, now);
  const s = checkWinner(resolveHazard(g));
  if (s.phase === "finished") return s;
  if (s.tiedIds.length > 0) return startTiebreak(s, now);
  return startRound(s, now);
}

/** Host "reveal": mark answers and harvest, then the raider, then a raft check. In a tiebreak, decide it. */
function reveal(g: GameState): GameState {
  if (g.phase === "tiebreak") return finishTiebreak(g);
  return checkRaft(resolveRaider(revealRound(g)));
}

function applyHost(g: GameState, a: HostAction, now: number): GameState {
  switch (a.type) {
    case "start":
      return startGame(g);
    case "next":
      return next(g, now);
    case "reveal":
      return reveal(g);
    case "extend":
      return extendTimer(g, a.seconds);
    case "skip":
      return skipQuestion(g, now);
    case "end":
      return endGame(g, now);
    case "setCaptain":
      return setCaptain(g, a.teamId, a.deviceIndex);
    case "rename":
      return renameTeam(g, a.teamId, a.name);
    case "remove":
      return removeTeam(g, a.teamId);
    case "override":
      return overrideTeam(g, a.teamId, { stock: a.stock, sp: a.sp });
  }
}

export function hostActionHandler(
  repo: GameRepo,
  env: HandlerEnv,
  code: string,
  token: string,
  action: HostAction,
  now: number,
): Promise<PublicGameState> {
  return guard(async () => {
    requireSecret(env);
    const c = normalizeCode(code);
    const a = parseHostAction(action);
    const claims = verify(env, token, c, now, "host");
    const g = await mutate(repo, env, c, now, (g) => {
      sameGame(claims, g);
      return applyHost(g, a, now);
    });
    return toPublicState(g, now);
  });
}

function applyTeam(g: GameState, teamId: string, deviceId: string, a: TeamAction, now: number): GameState {
  switch (a.type) {
    case "submit":
      return submitAnswer(g, teamId, deviceId, a.answer, now);
    case "suggest":
      return suggestAnswer(g, teamId, deviceId, a.answer);
    case "build":
      return checkRaft(buildItem(g, teamId, a.item));
    case "exchange":
      return checkRaft(exchange(g, teamId, a.give, a.get, a.amount));
    case "contribute":
      return checkRaft(contribute(g, teamId, a.resource, a.amount));
  }
}

export function teamActionHandler(
  repo: GameRepo,
  env: HandlerEnv,
  code: string,
  token: string,
  action: TeamAction,
  now: number,
): Promise<PublicGameState> {
  return guard(async () => {
    requireSecret(env);
    const c = normalizeCode(code);
    const a = parseTeamAction(action);
    const claims = verify(env, token, c, now, "team");
    const g = await mutate(repo, env, c, now, (g) => {
      const { teamId, deviceId } = teamMember(claims, g);
      return applyTeam(g, teamId, deviceId, a, now);
    });
    return toPublicState(g, now);
  });
}

/** Public state for any browser of the game; no token needed. */
export function stateHandler(repo: GameRepo, code: string, now: number): Promise<PublicGameState> {
  return guard(async () => {
    const g = await repo.get(normalizeCode(code));
    if (!g) throw notFound();
    return toPublicState(g, now);
  });
}

/** The caller's own team's suggestions for the current round (answers only, no device ids). */
export function teamSuggestionsHandler(
  repo: GameRepo,
  env: HandlerEnv,
  code: string,
  token: string,
  now: number = Date.now(),
): Promise<{ suggestions: { answer: string }[] }> {
  return guard(async () => {
    requireSecret(env);
    const c = normalizeCode(code);
    const claims = verify(env, token, c, now, "team");
    const g = await repo.get(c);
    if (!g) throw notFound();
    const { teamId } = teamMember(claims, g);
    const mine = g.round?.suggestions[teamId] ?? [];
    return { suggestions: mine.map((s) => ({ answer: s.answer })) };
  });
}
