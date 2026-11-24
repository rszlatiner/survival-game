import { GameError, addTeam, captainOf, createGame, startGame } from "@/lib/engine/game";
import { revealRound, startRound, submitAnswer } from "@/lib/engine/round";
import type { Resource } from "@/lib/questions/types";
import type { GameState, Stock } from "@/lib/types";

/** Run `fn` and return the GameError code it throws (undefined if it does not throw). */
export function errCode(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof GameError ? e.code : "OTHER";
  }
  return undefined;
}

/** A started game in the lobby-locked state (no round yet). */
export function startedGame(teams = 2, seed = "s1"): GameState {
  let g = createGame({ units: [11], length: "quick", timerSeconds: 60, seed, code: "ABC234", now: 1000 });
  for (let i = 0; i < teams; i++) g = addTeam(g, `Team ${i + 1}`, `d${i}`).g;
  return startGame(g);
}

/** A game in the question phase of round 1. */
export function questionGame(teams = 2, seed = "s1"): GameState {
  return startRound(startedGame(teams, seed), 10_000);
}

/** A game in the reveal phase after round 1 (nobody answered). Optionally force the bonus resource. */
export function revealGame(opts: { teams?: number; seed?: string; bonus?: Resource | null } = {}): GameState {
  let g = questionGame(opts.teams ?? 2, opts.seed ?? "s1");
  g = revealRound(g);
  if (opts.bonus !== undefined) g = { ...g, round: { ...g.round!, bonusResource: opts.bonus } };
  return g;
}

/** Replace one team's stock (and optionally other fields) without touching the rest. */
export function withTeam(g: GameState, teamId: string, patch: { stock?: Stock; builds?: GameState["teams"][number]["builds"] }): GameState {
  return { ...g, teams: g.teams.map((t) => (t.id === teamId ? { ...t, ...patch } : t)) };
}

export { captainOf, submitAnswer };
