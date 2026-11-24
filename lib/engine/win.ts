import { ROUNDS } from "@/lib/config";
import { isCorrect } from "@/lib/answers";
import { GameError } from "@/lib/engine/game";
import { idNum, resolveHazard, stockTotal } from "@/lib/engine/hazard";
import { generateQuestion, pickTemplates } from "@/lib/questions/generate";
import { makeRng } from "@/lib/rng";
import type { GameState, RoundState, Team } from "@/lib/types";

function bump(g: GameState, patch: Partial<GameState>): GameState {
  return { ...g, ...patch, version: g.version + 1 };
}

/** Teams sharing the maximum of `score`, in team order. */
function topBy(teams: Team[], score: (t: Team) => number): Team[] {
  if (teams.length === 0) return [];
  const best = Math.max(...teams.map(score));
  return teams.filter((t) => score(t) === best);
}

function declareWinner(g: GameState, teamId: string, patch: Partial<GameState> = {}): GameState {
  return bump(g, {
    ...patch,
    winnerId: teamId,
    phase: "finished",
    tiedIds: [],
    log: [...g.log, `winner ${teamId}`],
  });
}

function declareTie(g: GameState, ids: string[]): GameState {
  const same = ids.length === g.tiedIds.length && ids.every((id, i) => g.tiedIds[i] === id);
  return same ? g : bump(g, { tiedIds: ids });
}

/**
 * Raft: a team with raft3 wins at once (several finishing together: more SP,
 * then more stock, else tied). Otherwise, once the last round is revealed,
 * `finalWinner` scores the game.
 */
export function checkWinner(g: GameState): GameState {
  if (g.winnerId !== null || g.phase === "finished" || g.phase === "tiebreak") return g;

  const finished = g.teams.filter((t) => t.builds.includes("raft3"));
  if (finished.length > 0) {
    const best = topBy(topBy(finished, (t) => t.sp), (t) => stockTotal(t.stock));
    return best.length === 1 ? declareWinner(g, best[0].id) : declareTie(g, best.map((t) => t.id));
  }

  if (g.phase === "reveal" && g.roundsPlayed >= ROUNDS[g.length]) return finalWinner(g);
  return g;
}

/**
 * Final scoring (spec 7.2): highest SP wins, ties broken by total stock held;
 * teams equal on both go to `tiedIds` for the tiebreak question. No round or
 * phase gate, so the teacher can end the game early. No-op once decided.
 */
export function finalWinner(g: GameState): GameState {
  if (g.winnerId !== null || g.phase === "finished") return g;
  const best = topBy(topBy(g.teams, (t) => t.sp), (t) => stockTotal(t.stock));
  if (best.length === 0) return g;
  return best.length === 1 ? declareWinner(g, best[0].id) : declareTie(g, best.map((t) => t.id));
}

/** Opens a one-question round for the tied teams only. Does not advance roundsPlayed. */
export function startTiebreak(g: GameState, now: number): GameState {
  if (g.phase !== "reveal" || g.tiedIds.length < 2) throw new GameError("WRONG_PHASE");
  const last = ROUNDS[g.length];
  const templates = pickTemplates(g.units, last + 1, g.seed);
  const template = templates[last] ?? templates[templates.length - 1];
  if (!template) throw new GameError("NO_QUESTIONS");

  const questions: RoundState["questions"] = {};
  for (const t of g.teams) {
    if (g.tiedIds.includes(t.id)) questions[t.id] = generateQuestion(template, t.zone, `${g.seed}:${t.id}:tb`);
  }
  const round: RoundState = {
    n: g.roundsPlayed + 1,
    startedAt: now,
    endsAt: now + g.timerSeconds * 1000,
    roll: 0,
    bonusResource: null,
    raider: false,
    hazard: false,
    questions,
    submissions: {},
    suggestions: {},
  };
  return bump(g, { phase: "tiebreak", round });
}

/**
 * Marks the tiebreak answers. One correct team wins; otherwise a seeded pick
 * among the correct teams (or among all tied teams if none was correct).
 */
export function finishTiebreak(g: GameState): GameState {
  if (g.phase === "finished") return g;
  if (g.phase !== "tiebreak" || !g.round) throw new GameError("WRONG_PHASE");
  const round = g.round;

  const submissions: RoundState["submissions"] = {};
  for (const [tid, sub] of Object.entries(round.submissions)) {
    const q = round.questions[tid];
    submissions[tid] = { ...sub, correct: q ? isCorrect(sub.answer, q.expected, q.publicQ.format) : false };
  }

  const tied = g.teams.filter((t) => g.tiedIds.includes(t.id));
  if (tied.length === 0) throw new GameError("WRONG_PHASE");
  const correct = tied.filter((t) => submissions[t.id]?.correct);
  // Tied teams are already equal on SP and stock, so only the answer and a seeded pick remain.
  const candidates = (correct.length >= 1 ? correct : tied).sort((a, b) => idNum(a.id) - idNum(b.id));
  const winner =
    candidates.length === 1
      ? candidates[0]
      : candidates[Math.floor(makeRng(`${g.seed}:tiebreak`)() * candidates.length)];

  return declareWinner(g, winner.id, { round: { ...round, submissions } });
}

/** End-of-game step: at the last revealed round, settle any hazard then pick the winner. */
export function endRoundIfLast(g: GameState): GameState {
  if (g.phase !== "reveal" || g.roundsPlayed < ROUNDS[g.length]) return g;
  return checkWinner(resolveHazard(g));
}
