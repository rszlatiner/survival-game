import { ALL_TEMPLATES } from "@/content/units";
import { MAX_ANSWER_LENGTH, MAX_OVERRIDE } from "@/lib/config";
import { GameError } from "@/lib/engine/game";
import { resolveHazard, resolveRaider } from "@/lib/engine/hazard";
import { revealRound } from "@/lib/engine/round";
import { checkRaft, finalWinner, finishTiebreak, startTiebreak } from "@/lib/engine/win";
import { generateQuestion } from "@/lib/questions/generate";
import { RESOURCES } from "@/lib/questions/types";
import type { QuestionTemplate } from "@/lib/questions/types";
import { makeRng } from "@/lib/rng";
import type { GameState, RoundState, Stock, Team } from "@/lib/types";

/** Teacher controls and teammate suggestions (spec 7.3, 7.7). */

function bump(g: GameState, patch: Partial<GameState>): GameState {
  return { ...g, ...patch, version: g.version + 1 };
}

const isCount = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= MAX_OVERRIDE;

function openRound(g: GameState): RoundState {
  if ((g.phase !== "question" && g.phase !== "tiebreak") || !g.round) throw new GameError("WRONG_PHASE");
  return g.round;
}

/** Adds `seconds` to the open question's timer. */
export function extendTimer(g: GameState, seconds: number): GameState {
  const round = openRound(g);
  if (!Number.isInteger(seconds) || seconds <= 0) throw new GameError("BAD_AMOUNT", String(seconds));
  return bump(g, { round: { ...round, endsAt: round.endsAt + seconds * 1000 } });
}

const skipMarker = (n: number) => `skipped r${n}`;

/**
 * Replaces the open round's questions with fresh ones from another template of
 * the game's units (same difficulty when possible), restarts the timer and
 * clears submissions and suggestions. Deterministic in (seed, round, skip count).
 */
export function skipQuestion(g: GameState, now: number, bank: QuestionTemplate[] = ALL_TEMPLATES): GameState {
  const round = openRound(g);
  const current = Object.values(round.questions)[0]?.publicQ;
  if (!current) throw new GameError("NO_QUESTIONS");
  const k = g.log.filter((l) => l === skipMarker(round.n)).length;

  const inUnits = bank.filter((t) => g.units.includes(t.unit));
  const others = inUnits.filter((t) => t.id !== current.templateId);
  const sameLevel = others.filter((t) => t.difficulty === current.difficulty);
  const pool = sameLevel.length > 0 ? sameLevel : others.length > 0 ? others : inUnits;
  if (pool.length === 0) throw new GameError("NO_QUESTIONS");
  const template = pool[Math.floor(makeRng(`${g.seed}:skip:${round.n}:${k}`)() * pool.length)];

  const questions: RoundState["questions"] = {};
  for (const t of g.teams) {
    if (round.questions[t.id]) {
      questions[t.id] = generateQuestion(template, t.zone, `${g.seed}:${t.id}:${round.n}:skip${k}`);
    }
  }
  return bump(g, {
    round: {
      ...round,
      questions,
      startedAt: now,
      endsAt: now + g.timerSeconds * 1000,
      submissions: {},
      suggestions: {},
    },
    log: [...g.log, skipMarker(round.n)],
  });
}

/** Teacher's manual fix: set some of a team's stock and/or its SP. Logged. */
export function overrideTeam(
  g: GameState,
  teamId: string,
  patch: { stock?: Partial<Stock>; sp?: number },
): GameState {
  const t = g.teams.find((x) => x.id === teamId);
  if (!t) throw new GameError("NOT_FOUND", `team ${teamId}`);
  const stockPatch: Partial<Stock> = {};
  for (const r of RESOURCES) {
    const v = patch.stock?.[r];
    if (v === undefined) continue;
    if (!isCount(v)) throw new GameError("BAD_AMOUNT", `${r} ${v}`);
    stockPatch[r] = v;
  }
  if (patch.sp !== undefined && !isCount(patch.sp)) throw new GameError("BAD_AMOUNT", `sp ${patch.sp}`);
  if (Object.keys(stockPatch).length === 0 && patch.sp === undefined) return g;

  const next: Team = { ...t, stock: { ...t.stock, ...stockPatch }, sp: patch.sp ?? t.sp };
  const parts = [...Object.entries(stockPatch).map(([r, v]) => `${r}=${v}`), ...(patch.sp !== undefined ? [`sp=${patch.sp}`] : [])];
  return bump(g, {
    teams: g.teams.map((x) => (x.id === teamId ? next : x)),
    log: [...g.log, `override ${teamId} ${parts.join(" ")}`],
  });
}

/**
 * Ends the game now (teacher's "End game"; also used when time runs out).
 * - lobby: finishes with no winner (nothing was played).
 * - question: reveals the round first (harvest, then raider).
 * - reveal: settles any hazard; a pending tie (raft or final) goes to the
 *   tiebreak question; otherwise a raft finisher, else the final score, wins.
 * - tiebreak: decides it now (finishTiebreak: a correct tied team, else a
 *   seeded pick among the tied teams), exactly as the host's reveal would.
 * - finished: no-op.
 */
export function endGame(g: GameState, now: number): GameState {
  if (g.phase === "finished") return g;
  if (g.phase === "tiebreak") return finishTiebreak(g);
  if (g.phase === "lobby") return bump(g, { phase: "finished", log: [...g.log, "game ended"] });

  let s = g.phase === "question" ? resolveRaider(revealRound(g)) : g;
  s = checkRaft(resolveHazard(s));
  // A raft tie (found just now or earlier) goes to the tiebreak: never final scoring.
  if (s.tiedIds.length === 0) s = finalWinner(s);
  if (s.phase === "reveal" && s.tiedIds.length > 0) return startTiebreak(s, now);
  if (s.phase !== "finished") s = bump(s, { phase: "finished", log: [...s.log, "game ended"] });
  return s;
}

/** A teammate proposes an answer to the captain (question phase only). One per device. */
export function suggestAnswer(g: GameState, teamId: string, deviceId: string, answer: string): GameState {
  if (g.phase !== "question" || !g.round) throw new GameError("WRONG_PHASE");
  const t = g.teams.find((x) => x.id === teamId);
  if (!t || !t.devices.includes(deviceId)) throw new GameError("NOT_FOUND", `team ${teamId} / device`);
  const clean = String(answer).trim();
  if (!clean || clean.length > MAX_ANSWER_LENGTH) throw new GameError("BAD_ANSWER");

  const mine = (g.round.suggestions[teamId] ?? []).filter((s) => s.deviceId !== deviceId);
  return bump(g, {
    round: {
      ...g.round,
      suggestions: { ...g.round.suggestions, [teamId]: [...mine, { deviceId, answer: clean }] },
    },
  });
}
