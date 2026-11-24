import type { ZoneId } from "@/lib/questions/types";

/**
 * Zone flavour for question wording. Templates swap these nouns in; the
 * numbers and the maths never depend on the zone. Plural nouns throughout.
 */
export interface ZoneWords {
  /** Sentence-start location, e.g. "On the beach". */
  Place: string;
  /** Mid-sentence location, e.g. "on the beach". */
  place: string;
  food: string;
  /** Used after "litres of". */
  water: string;
  wood: string;
  stone: string;
  rope: string;
  landmark: string;
}

export const ZONE_WORDS: Record<ZoneId, ZoneWords> = {
  beach: {
    Place: "On the beach",
    place: "on the beach",
    food: "fish",
    water: "rainwater",
    wood: "driftwood planks",
    stone: "pebbles",
    rope: "palm rope",
    landmark: "the shipwreck",
  },
  forest: {
    Place: "In the forest",
    place: "in the forest",
    food: "mangoes",
    water: "stream water",
    wood: "logs",
    stone: "stones",
    rope: "vine rope",
    landmark: "the giant fig tree",
  },
  cave: {
    Place: "In the cave",
    place: "in the cave",
    food: "mushrooms",
    water: "spring water",
    wood: "dry sticks",
    stone: "rock slabs",
    rope: "old rope",
    landmark: "the echo chamber",
  },
  hills: {
    Place: "On the hills",
    place: "on the hills",
    food: "wild yams",
    water: "pond water",
    wood: "branches",
    stone: "boulders",
    rope: "grass rope",
    landmark: "the lookout rock",
  },
  lagoon: {
    Place: "By the lagoon",
    place: "by the lagoon",
    food: "crabs",
    water: "fresh water",
    wood: "bamboo poles",
    stone: "flat stones",
    rope: "reed rope",
    landmark: "the reed beds",
  },
};
