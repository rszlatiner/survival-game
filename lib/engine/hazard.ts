import { HAZARD_THRESHOLD_PER_TEAM } from "@/lib/config";
import { GameError } from "@/lib/engine/game";
import { RESOURCES } from "@/lib/questions/types";
import type { Resource } from "@/lib/questions/types";
import type { GameState, Stock, Team } from "@/lib/types";

/** Units a team loses from its largest stock when a hazard or raider hits. */
const LOSS = 2;

function bump(g: GameState, patch: Partial<GameState>): GameState {
  return { ...g, ...patch, version: g.version + 1 };
}

export const stockTotal = (s: Stock) => RESOURCES.reduce((sum, r) => sum + s[r], 0);
export const idNum = (id: string) => Number(id.slice(1)) || 0;

const hazardMarker = (n: number) => `hazard resolved r${n}`;
const raiderMarker = (n: number) => `raider resolved r${n}`;

/** The team's single largest resource; ties go to the earlier one in RESOURCES. */
function largest(s: Stock): Resource {
  let best: Resource = RESOURCES[0];
  for (const r of RESOURCES) if (s[r] > s[best]) best = r;
  return best;
}

/** Takes up to LOSS units from the team's largest stock (never below 0). */
function hit(t: Team): Team {
  const r = largest(t.stock);
  const lose = Math.min(LOSS, t.stock[r]);
  if (lose === 0) return t;
  return { ...t, stock: { ...t.stock, [r]: t.stock[r] - lose } };
}

/** Moves `amount` of a team's `res` into the island fund (reveal phase only). */
export function contribute(g: GameState, teamId: string, res: Resource, amount: number): GameState {
  if (g.phase !== "reveal") throw new GameError("WRONG_PHASE");
  const t = g.teams.find((x) => x.id === teamId);
  if (!t) throw new GameError("NOT_FOUND", `team ${teamId}`);
  if (!Number.isInteger(amount) || amount <= 0) throw new GameError("BAD_AMOUNT", String(amount));
  if (t.stock[res] < amount) throw new GameError("CANNOT_AFFORD", `${amount} ${res}`);

  const next: Team = {
    ...t,
    stock: { ...t.stock, [res]: t.stock[res] - amount },
    fundGiven: t.fundGiven + amount,
  };
  return bump(g, {
    teams: g.teams.map((x) => (x.id === teamId ? next : x)),
    fund: { ...g.fund, [res]: g.fund[res] + amount },
  });
}

/**
 * Settles this round's hazard. Met (fund >= threshold): the top contributor
 * gains 1 SP. Not met: every team loses 2 of its largest stock. The fund and
 * every team's fundGiven are reset either way. Idempotent per round.
 */
export function resolveHazard(g: GameState): GameState {
  const round = g.round;
  if (!round || !round.hazard) return g;
  const marker = hazardMarker(round.n);
  if (g.log.includes(marker)) return g;
  if (g.phase !== "reveal") throw new GameError("WRONG_PHASE");

  const met = stockTotal(g.fund) >= HAZARD_THRESHOLD_PER_TEAM * g.teams.length;
  let topId: string | null = null;
  if (met) {
    const top = [...g.teams]
      .filter((t) => t.fundGiven > 0)
      .sort((a, b) => b.fundGiven - a.fundGiven || a.sp - b.sp || idNum(a.id) - idNum(b.id))[0];
    topId = top?.id ?? null;
  }

  const teams = g.teams.map((t) => {
    const base = met ? t : hit(t);
    return { ...base, sp: base.sp + (base.id === topId ? 1 : 0), fundGiven: 0 };
  });
  return bump(g, {
    teams,
    fund: { water: 0, food: 0, wood: 0, stone: 0 },
    log: [...g.log, marker],
  });
}

/**
 * The raider strikes the leader (highest SP, then highest total stock, then
 * lowest id), taking 2 of its largest stock. Idempotent per round.
 */
export function resolveRaider(g: GameState): GameState {
  const round = g.round;
  if (!round || !round.raider) return g;
  const marker = raiderMarker(round.n);
  if (g.log.includes(marker)) return g;
  if (g.phase !== "reveal") throw new GameError("WRONG_PHASE");

  const leader = [...g.teams].sort(
    (a, b) => b.sp - a.sp || stockTotal(b.stock) - stockTotal(a.stock) || idNum(a.id) - idNum(b.id),
  )[0];
  const teams = leader ? g.teams.map((t) => (t.id === leader.id ? hit(t) : t)) : g.teams;
  return bump(g, { teams, log: [...g.log, marker] });
}
