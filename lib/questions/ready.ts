import { ALL_TEMPLATES } from "@/content/units";
import type { Difficulty, QuestionTemplate } from "@/lib/questions/types";

export const READY_MIN_TEMPLATES = 12;
export const READY_MIN_PER_DIFFICULTY = 4;

export function unitReadiness(
  unit: number,
  bank: QuestionTemplate[] = ALL_TEMPLATES,
): { ready: boolean; count: number; perDifficulty: Record<Difficulty, number> } {
  const perDifficulty: Record<Difficulty, number> = { 1: 0, 2: 0, 3: 0 };
  let count = 0;
  for (const t of bank) {
    if (t.unit !== unit) continue;
    count++;
    perDifficulty[t.difficulty]++;
  }
  const ready =
    count >= READY_MIN_TEMPLATES &&
    ([1, 2, 3] as Difficulty[]).every((d) => perDifficulty[d] >= READY_MIN_PER_DIFFICULTY);
  return { ready, count, perDifficulty };
}
