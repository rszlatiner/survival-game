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
 * the highest SP wins and a shared top SP is a tie for `startTiebreak`.
 */
export function checkWinner(g: GameState): GameState {
  if (g.winnerId !== null || g.phase === "finished" || g.phase === "tiebreak") return g;

  const finished = g.teams.filter((t) => t.builds.includes("raft3"));
  if (finished.length > 0) {
    const best = topBy(topBy(finished, (t) => t.sp), (t) => stockTotal(t.stock));
    return best.length === 1 ? declareWinner(g, best[0].id) : declareTie(g, best.map((t) => t.id));
  }

  if (g.phase === "reveal" && g.roundsPlayed >= ROUNDS[g.length]) {
    const best = topBy(g.teams, (t) => t.sp);
    if (best.length === 0) return g;
    return best.length === 1 ? declareWinner(g, best[0].id) : declareTie(g, best.map((t) => t.id));
  }
  return g;
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
 * Marks the tiebreak answers. One correct team wins; otherwise the highest
 * stock among the correct teams (or all tied teams if none was correct) wins,
 * and a seeded pick settles any remaining tie.
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
  const candidates = correct.length >= 1 ? correct : tied;
  const best = topBy(candidates, (t) => stockTotal(t.stock)).sort((a, b) => idNum(a.id) - idNum(b.id));
  const winner =
    best.length === 1 ? best[0] : best[Math.floor(makeRng(`${g.seed}:tiebreak`)() * best.length)];

  return declareWinner(g, winner.id, { round: { ...round, submissions } });
}

/** End-of-game step: at the last revealed round, settle any hazard then pick the winner. */
export function endRoundIfLast(g: GameState): GameState {
  if (g.phase !== "reveal" || g.roundsPlayed < ROUNDS[g.length]) return g;
  return checkWinner(resolveHazard(g));
}
