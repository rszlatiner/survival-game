import type { AnswerFormat } from "@/lib/answers";
import { prettyMath } from "@/lib/mathpretty";
import { ROUNDS } from "@/lib/config";
import type { PublicQuestion, Resource, ZoneId } from "@/lib/questions/types";
import type { BuildId, GameLength, GameState, Phase, Stock } from "@/lib/types";

/**
 * What any browser may see (served by a Next.js endpoint to every player of
 * the game). Never contains the seed, the log, device ids, or team suggestions.
 * Before reveal (phases "question" and "tiebreak") it also contains no
 * expected answers, solutions, submitted answers or correctness, and nothing
 * marks which choice option is right: `results` is null and `submissions`
 * only says whether each team has submitted.
 */
export interface PublicTeam {
  id: string;
  name: string;
  zone: ZoneId;
  deviceCount: number;
  captainIndex: number;
  stock: Stock;
  builds: BuildId[];
  sp: number;
  fundGiven: number;
}

export interface PublicResult {
  /** The expected answer as display text. */
  expected: string;
  solution: string;
  /** The captain's submitted answer, or null if the team did not submit. */
  answer: string | null;
  correct: boolean;
}

export interface PublicRound {
  n: number;
  startedAt: number;
  endsAt: number;
  roll: number;
  bonusResource: Resource | null;
  raider: boolean;
  hazard: boolean;
  /** Keyed by team id. */
  questions: Record<string, PublicQuestion>;
  /** Keyed by team id (every team that has a question this round). */
  submissions: Record<string, { submitted: boolean }>;
  /** Keyed by team id; only in phases "reveal" and "finished", else null. */
  results: Record<string, PublicResult> | null;
}

export interface PublicGameState {
  code: string;
  version: number;
  phase: Phase;
  units: number[];
  length: GameLength;
  timerSeconds: number;
  roundsPlayed: number;
  totalRounds: number;
  teams: PublicTeam[];
  fund: Stock;
  winnerId: string | null;
  tiedIds: string[];
  /** Server clock (epoch ms) when this projection was made, for client clock skew. */
  serverNow: number;
  round: PublicRound | null;
}

const tidy = (x: number) => String(Number(x.toPrecision(12)));

/** Display text for an expected answer. */
export function displayExpected(expected: number | string, format: AnswerFormat): string {
  if (format.kind === "expression") return prettyMath(String(expected));
  if (typeof expected === "string") return expected;
  switch (format.kind) {
    case "decimal": {
      const p = Math.max(0, Math.floor(format.places));
      const f = 10 ** p;
      const r = Math.sign(expected) * (Math.round(Math.abs(expected) * f + 1e-9) / f);
      return r.toFixed(p);
    }
    case "percent":
      return `${tidy(expected * 100)}%`;
    default:
      return tidy(expected);
  }
}

/** Copy only the whitelisted PublicQuestion fields (never spread unknown keys). */
function publicQuestion(q: PublicQuestion): PublicQuestion {
  const out: PublicQuestion = {
    templateId: q.templateId,
    unit: q.unit,
    difficulty: q.difficulty,
    resource: q.resource,
    format: structuredClone(q.format),
    prompt: q.prompt,
  };
  if (q.options !== undefined) out.options = [...q.options];
  if (q.figureSvg !== undefined) out.figureSvg = q.figureSvg;
  return out;
}

export function toPublicState(g: GameState, now: number): PublicGameState {
  const revealed = g.phase === "reveal" || g.phase === "finished";
  let round: PublicRound | null = null;
  if (g.round) {
    const r = g.round;
    const questions: PublicRound["questions"] = {};
    const submissions: PublicRound["submissions"] = {};
    const results: Record<string, PublicResult> = {};
    for (const [tid, q] of Object.entries(r.questions)) {
      questions[tid] = publicQuestion(q.publicQ);
      const sub = r.submissions[tid];
      submissions[tid] = { submitted: sub !== undefined };
      if (revealed) {
        results[tid] = {
          expected: displayExpected(q.expected, q.publicQ.format),
          solution: q.solution,
          answer: sub ? sub.answer : null,
          correct: sub?.correct === true,
        };
      }
    }
    round = {
      n: r.n,
      startedAt: r.startedAt,
      endsAt: r.endsAt,
      roll: r.roll,
      bonusResource: r.bonusResource,
      raider: r.raider,
      hazard: r.hazard,
      questions,
      submissions,
      results: revealed ? results : null,
    };
  }

  return {
    code: g.code,
    version: g.version,
    phase: g.phase,
    units: [...g.units],
    length: g.length,
    timerSeconds: g.timerSeconds,
    roundsPlayed: g.roundsPlayed,
    totalRounds: ROUNDS[g.length],
    teams: g.teams.map((t) => ({
      id: t.id,
      name: t.name,
      zone: t.zone,
      deviceCount: t.devices.length,
      captainIndex: t.captainIndex,
      stock: { ...t.stock },
      builds: [...t.builds],
      sp: t.sp,
      fundGiven: t.fundGiven,
    })),
    fund: { ...g.fund },
    winnerId: g.winnerId,
    tiedIds: [...g.tiedIds],
    serverNow: now,
    round,
  };
}
