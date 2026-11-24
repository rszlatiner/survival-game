import { HAZARD_EVERY, ROUNDS, YIELD, ZONES } from "@/lib/config";
import { GameError, isLocked } from "@/lib/engine/game";
import { isCorrect } from "@/lib/answers";
import { generateQuestion, pickTemplates } from "@/lib/questions/generate";
import type { Resource } from "@/lib/questions/types";
import { makeRng } from "@/lib/rng";
import type { GameState, RoundState, Stock } from "@/lib/types";

const ROLL_RESOURCES: Resource[] = ["water", "food", "wood", "stone"];

function bump(g: GameState, patch: Partial<GameState>): GameState {
  return { ...g, ...patch, version: g.version + 1 };
}

/** Island roll for round `n`: an integer 1..6, deterministic in (seed, n). */
export function rollFor(seed: string, n: number): number {
  return Math.floor(makeRng(`${seed}:roll:${n}`)() * 6) + 1;
}

/** 1 to 4: bonus water, food, wood, stone. 5: calm. 6: raider. */
export function outcomeForRoll(roll: number): { bonusResource: Resource | null; raider: boolean } {
  if (roll >= 1 && roll <= 4) return { bonusResource: ROLL_RESOURCES[roll - 1], raider: false };
  return { bonusResource: null, raider: roll === 6 };
}

export function startRound(g: GameState, now: number): GameState {
  const fromLobby = g.phase === "lobby" && g.round === null && g.roundsPlayed === 0 && isLocked(g);
  const fromReveal = g.phase === "reveal" && g.roundsPlayed < ROUNDS[g.length];
  if (!fromLobby && !fromReveal) throw new GameError("WRONG_PHASE");

  const n = g.roundsPlayed + 1;
  const templates = pickTemplates(g.units, ROUNDS[g.length], g.seed);
  const template = templates[n - 1];
  if (!template || templates.length < ROUNDS[g.length]) throw new GameError("NO_QUESTIONS");

  const questions: RoundState["questions"] = {};
  for (const t of g.teams) {
    questions[t.id] = generateQuestion(template, t.zone, `${g.seed}:${t.id}:${n}`);
  }
  const roll = rollFor(g.seed, n);
  const round: RoundState = {
    n,
    startedAt: now,
    endsAt: now + g.timerSeconds * 1000,
    roll,
    ...outcomeForRoll(roll),
    hazard: n % HAZARD_EVERY === 0,
    questions,
    submissions: {},
    suggestions: {},
  };
  const teams = g.teams.map((t) =>
    n >= 2 && t.devices.length > 0
      ? { ...t, captainIndex: (t.captainIndex + 1) % t.devices.length }
      : t,
  );
  return bump(g, { phase: "question", round, teams });
}

export function submitAnswer(
  g: GameState,
  teamId: string,
  deviceId: string,
  answer: string,
  now: number,
): GameState {
  if (g.phase !== "question" || !g.round) throw new GameError("WRONG_PHASE");
  const team = g.teams.find((t) => t.id === teamId);
  if (!team || !team.devices.includes(deviceId)) {
    throw new GameError("NOT_FOUND", `team ${teamId} / device ${deviceId}`);
  }
  if (g.round.submissions[teamId]) throw new GameError("ALREADY_SUBMITTED");
  if (now < g.round.endsAt && team.devices[team.captainIndex] !== deviceId) {
    throw new GameError("NOT_CAPTAIN");
  }
  const round: RoundState = {
    ...g.round,
    submissions: {
      ...g.round.submissions,
      [teamId]: { answer: String(answer).trim(), deviceId, at: now },
    },
  };
  return bump(g, { round });
}

const total = (s: Stock) => s.water + s.food + s.wood + s.stone;
const idNum = (id: string) => Number(id.slice(1)) || 0;

export function revealRound(g: GameState): GameState {
  if (g.phase === "reveal") return g;
  if (g.phase !== "question" || !g.round) throw new GameError("WRONG_PHASE");
  const round = g.round;

  // Catch-up team is chosen from the state before any harvesting.
  let catchUp: string | null = null;
  if (g.teams.length > 0) {
    const sorted = [...g.teams].sort(
      (a, b) => a.sp - b.sp || total(a.stock) - total(b.stock) || idNum(a.id) - idNum(b.id),
    );
    catchUp = sorted[0].id;
  }

  const submissions: RoundState["submissions"] = {};
  for (const [tid, sub] of Object.entries(round.submissions)) {
    const q = round.questions[tid];
    submissions[tid] = {
      ...sub,
      correct: q ? isCorrect(sub.answer, q.expected, q.publicQ.format) : false,
    };
  }

  const teams = g.teams.map((t) => {
    const stock: Stock = { ...t.stock };
    const q = round.questions[t.id];
    if (q && submissions[t.id]?.correct) {
      const r = q.publicQ.resource;
      stock[r] += YIELD[q.publicQ.difficulty] + (round.bonusResource === r ? 1 : 0);
    }
    if (t.id === catchUp) stock[ZONES[t.zone].easy[0]] += 1;
    return { ...t, stock };
  });

  return bump(g, {
    phase: "reveal",
    round: { ...round, submissions },
    teams,
    roundsPlayed: g.roundsPlayed + 1,
  });
}

export function nextAllowed(g: GameState): boolean {
  if (g.phase === "reveal") return true;
  if (g.phase === "lobby") return g.round === null && isLocked(g);
  return false;
}
