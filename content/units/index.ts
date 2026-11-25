import type { QuestionTemplate } from "@/lib/questions/types";
import { UNIT_01 } from "@/content/units/unit-01";
import { UNIT_11 } from "@/content/units/unit-11";

/** Question banks by unit number. Add each new unit's file here. */
export const UNIT_BANKS: Record<number, QuestionTemplate[]> = {
  1: UNIT_01,
  11: UNIT_11,
};

export const ALL_TEMPLATES: QuestionTemplate[] = Object.values(UNIT_BANKS).flat();
