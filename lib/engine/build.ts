import { BUILDS, MARKET } from "@/lib/config";
import { GameError } from "@/lib/engine/game";
import { RESOURCES } from "@/lib/questions/types";
import type { Resource } from "@/lib/questions/types";
import type { BuildId, GameState, Stock, Team } from "@/lib/types";

function bump(g: GameState, patch: Partial<GameState>): GameState {
  return { ...g, ...patch, version: g.version + 1 };
}

function revealTeam(g: GameState, teamId: string): Team {
  if (g.phase !== "reveal") throw new GameError("WRONG_PHASE");
  const t = g.teams.find((x) => x.id === teamId);
  if (!t) throw new GameError("NOT_FOUND", `team ${teamId}`);
  return t;
}

function replaceTeam(g: GameState, team: Team): Team[] {
  return g.teams.map((t) => (t.id === team.id ? team : t));
}

export function canAfford(stock: Stock, cost: Partial<Stock>): boolean {
  return RESOURCES.every((r) => stock[r] >= (cost[r] ?? 0));
}

/** Builds an item for a team. Winner detection is left to `checkWinner`. */
export function buildItem(g: GameState, teamId: string, id: BuildId): GameState {
  const team = revealTeam(g, teamId);
  const def = BUILDS[id];
  if (team.builds.includes(id)) throw new GameError("ALREADY_BUILT", id);
  if (def.requires && !team.builds.includes(def.requires)) {
    throw new GameError("MISSING_REQUIREMENT", `${id} needs ${def.requires}`);
  }
  if (!canAfford(team.stock, def.cost)) throw new GameError("CANNOT_AFFORD", id);

  const stock: Stock = { ...team.stock };
  for (const r of RESOURCES) stock[r] -= def.cost[r] ?? 0;
  const next: Team = { ...team, stock, builds: [...team.builds, id], sp: team.sp + def.sp };
  return bump(g, { teams: replaceTeam(g, next) });
}

/** Units of `give` per 1 unit of `get` this round. */
export function marketRate(g: GameState, give: Resource, get: Resource): number {
  if (give === get) throw new GameError("SAME_RESOURCE", give);
  const bonus = g.round?.bonusResource ?? null;
  if (bonus === null) return MARKET.base;
  if (get === bonus) return MARKET.bonusGet;
  if (give === bonus) return MARKET.bonusGive;
  return MARKET.base;
}

export function exchange(
  g: GameState,
  teamId: string,
  give: Resource,
  get: Resource,
  amountGet: number,
): GameState {
  const team = revealTeam(g, teamId);
  if (give === get) throw new GameError("SAME_RESOURCE", give);
  if (!Number.isInteger(amountGet) || amountGet <= 0) throw new GameError("BAD_AMOUNT", String(amountGet));
  const cost = marketRate(g, give, get) * amountGet;
  if (team.stock[give] < cost) throw new GameError("CANNOT_AFFORD", `${cost} ${give}`);

  const stock: Stock = { ...team.stock, [give]: team.stock[give] - cost, [get]: team.stock[get] + amountGet };
  return bump(g, { teams: replaceTeam(g, { ...team, stock }) });
}
