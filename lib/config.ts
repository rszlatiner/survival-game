import type { Difficulty, Resource, ZoneId } from "@/lib/questions/types";
import type { BuildId, GameLength, Stock } from "@/lib/types";

/** Single home for every tunable game number. */

export const ROUNDS: Record<GameLength, number> = { quick: 6, standard: 11 };

/** `easy[0]` is the zone's catch-up resource, so keep it first. */
export const ZONES: Record<
  ZoneId,
  { name: string; easy: Resource[]; short: Resource[] }
> = {
  beach: { name: "Beach", easy: ["food"], short: ["water"] },
  forest: { name: "Forest", easy: ["wood"], short: ["stone"] },
  cave: { name: "Cave", easy: ["water", "stone"], short: ["food"] },
  hills: { name: "Hills", easy: ["stone"], short: ["water", "wood"] },
  lagoon: { name: "Lagoon", easy: ["water"], short: ["wood"] },
};

export const START_STOCK: Readonly<Stock> = { water: 2, food: 2, wood: 2, stone: 2 };

/** Resources earned for a correct answer, by question difficulty. */
export const YIELD: Record<Difficulty, number> = { 1: 2, 2: 3, 3: 4 };

export const BUILDS: Record<
  BuildId,
  { cost: Partial<Stock>; sp: number; requires?: BuildId }
> = {
  shelter: { cost: { wood: 3, stone: 2 }, sp: 2 },
  fire: { cost: { wood: 2, stone: 1 }, sp: 1 },
  waterStore: { cost: { stone: 3, water: 2 }, sp: 2 },
  watchtower: { cost: { wood: 4, stone: 4 }, sp: 3 },
  raft1: { cost: { wood: 3, food: 2 }, sp: 1 },
  raft2: { cost: { wood: 4, water: 2 }, sp: 1, requires: "raft1" },
  raft3: { cost: { wood: 5, stone: 2, food: 2 }, sp: 1, requires: "raft2" },
};

/** Market trade rates (resources per unit). */
export const MARKET = { base: 3, bonusGet: 4, bonusGive: 2 };

/** A hazard fires every this many rounds. */
export const HAZARD_EVERY = 4;
/** Fund needed to survive a hazard, per team. */
export const HAZARD_THRESHOLD_PER_TEAM = 2;
export const MAX_TEAMS = 8;
export const MAX_DEVICES = 6;
