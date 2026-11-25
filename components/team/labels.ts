import type { Resource, ZoneId } from "@/lib/questions/types";
import type { BuildId } from "@/lib/types";

export const RESOURCE_LABEL: Record<Resource, string> = {
  water: "Water",
  food: "Food",
  wood: "Wood",
  stone: "Stone",
};

export const BUILD_LABEL: Record<BuildId, string> = {
  shelter: "Shelter",
  fire: "Fire",
  waterStore: "Water store",
  watchtower: "Watchtower",
  raft1: "Raft 1",
  raft2: "Raft 2",
  raft3: "Raft 3",
};

export const ZONE_STORY: Record<ZoneId, string> = {
  beach: "You washed up on the sandy beach. Fish and shellfish are easy to find, but fresh water is scarce.",
  forest: "You woke in the dense forest. Timber is everywhere, but good stone is hard to come by.",
  cave: "You sheltered in the sea cave. Springs and rock are close by, but food is hard to find.",
  hills: "You climbed to the rocky hills. Stone is plentiful, but water and wood are far away.",
  lagoon: "You landed by the calm lagoon. Fresh water is plentiful, but trees are few.",
};

/** Plain-text messages for server error codes; the server sends only a code. */
const ERRORS: Record<string, string> = {
  ALREADY_SUBMITTED: "Your team already submitted an answer.",
  NOT_CAPTAIN: "Only the captain can submit right now. Use Suggest.",
  WRONG_PHASE: "That is not possible at this stage of the round.",
  CANNOT_AFFORD: "Your team does not have enough resources.",
  ALREADY_BUILT: "Your team has already built that.",
  MISSING_REQUIREMENT: "Build the earlier raft stage first.",
  BAD_AMOUNT: "Enter a whole number above zero.",
  BAD_ANSWER: "Enter an answer first.",
  LOCKED: "The game has started, so new teams cannot join. Pick an existing team.",
  TOO_MANY_TEAMS: "The island is full.",
  TOO_MANY_DEVICES: "That team already has the most devices allowed.",
  NOT_FOUND: "Not found. Check the game code.",
  UNAUTHORIZED: "Your session expired. Please join again.",
  CONFLICT: "The game changed at the same moment. Try again.",
  BAD_REQUEST: "That did not look right. Check and try again.",
  INTERNAL: "Something went wrong. Try again.",
};

export function errorText(e: unknown): string {
  const code = e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
  return ERRORS[code] ?? "Something went wrong. Try again.";
}
