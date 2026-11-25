import type { AnswerFormat } from "@/lib/answers";

export const RESOURCES = ["water", "food", "wood", "stone"] as const;
export type Resource = (typeof RESOURCES)[number];

export const ZONE_IDS = ["beach", "forest", "cave", "hills", "lagoon"] as const;
export type ZoneId = (typeof ZONE_IDS)[number];

export type Difficulty = 1 | 2 | 3;

export type Params = Record<string, number>;

/**
 * A parameterised question. `params` draws the numbers from a seeded rng;
 * every other function is pure in those numbers (and the zone, for wording).
 * For `choice` templates, `options(p)` lists the option strings and
 * `expected(p)` returns the exact correct option string. For `expression`
 * templates `expected(p)` returns the answer as an expression string in the
 * student syntax (e.g. "3x+6"); any equivalent form a student types is accepted.
 */
export interface QuestionTemplate {
  id: string;
  unit: number;
  difficulty: Difficulty;
  resource: Resource;
  format: AnswerFormat;
  params(rng: () => number): Params;
  prompt(p: Params, zone: ZoneId): string;
  expected(p: Params): number | string;
  solution(p: Params): string;
  options?(p: Params): string[];
  figureSvg?(p: Params): string;
}

/** What a team's browser may see before reveal: no answer or solution. */
export interface PublicQuestion {
  templateId: string;
  unit: number;
  difficulty: Difficulty;
  resource: Resource;
  format: AnswerFormat;
  prompt: string;
  options?: string[];
  figureSvg?: string;
}

export interface GeneratedQuestion {
  publicQ: PublicQuestion;
  expected: number | string;
  solution: string;
}
