import { makeRng } from "@/lib/rng";
import { ALL_TEMPLATES } from "@/content/units";
import type { AnswerFormat } from "@/lib/answers";
import { parseExpr } from "@/lib/mathexpr";
import type {
  Difficulty,
  GeneratedQuestion,
  PublicQuestion,
  QuestionTemplate,
  ZoneId,
} from "@/lib/questions/types";

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build one concrete question. Deterministic for (template, zone, seed); the
 * caller passes a different seed per team per round. The zone only changes
 * the wording, so `expected` depends on (template, seed) alone.
 */
export function generateQuestion(t: QuestionTemplate, zone: ZoneId, seed: string): GeneratedQuestion {
  const p = t.params(makeRng(`${seed}:${t.id}`));
  const expected = t.expected(p);
  // An author's expression must parse, or no student answer could ever match it.
  if (t.format.kind === "expression" && (typeof expected !== "string" || parseExpr(expected) === null)) {
    throw new Error(`template ${t.id}: expected must be a valid expression string, got ${JSON.stringify(expected)}`);
  }
  let format: AnswerFormat = t.format;
  const publicQ: PublicQuestion = {
    templateId: t.id,
    unit: t.unit,
    difficulty: t.difficulty,
    resource: t.resource,
    format,
    prompt: t.prompt(p, zone),
  };
  if (t.format.kind === "choice") {
    const raw = t.options ? t.options(p) : t.format.options;
    const options = shuffle(raw, makeRng(`${seed}:${t.id}:options`));
    format = { kind: "choice", options };
    publicQ.format = format;
    publicQ.options = options;
  }
  if (t.figureSvg) publicQ.figureSvg = t.figureSvg(p);
  return { publicQ, expected, solution: t.solution(p) };
}

/**
 * Choose `count` templates for a game.
 * - Units are visited round robin (order shuffled by seed), so every selected
 *   unit is used before any unit is used again and per-unit counts differ by
 *   at most one. Units with no templates in the bank are skipped.
 * - Each pick aims at a difficulty for its position (first third 1, middle 2,
 *   last third 3) and prefers templates of that unit not yet used; once a
 *   unit's templates are all used it wraps round and reuses them.
 * - The result is sorted by difficulty (stable), so difficulty never falls
 *   as the game goes on.
 */
export function pickTemplates(
  units: number[],
  count: number,
  seed: string,
  bank: QuestionTemplate[] = ALL_TEMPLATES,
): QuestionTemplate[] {
  if (!(count > 0)) return [];
  const rng = makeRng(`pick:${seed}`);
  const byUnit = new Map<number, QuestionTemplate[]>();
  for (const u of new Set(units)) {
    const ts = bank.filter((t) => t.unit === u);
    if (ts.length > 0) byUnit.set(u, shuffle(ts, rng));
  }
  if (byUnit.size === 0) return [];

  const order = shuffle([...byUnit.keys()], rng);
  const used = new Map<number, Set<string>>(order.map((u) => [u, new Set<string>()]));
  const picks: QuestionTemplate[] = [];

  for (let i = 0; i < count; i++) {
    const unit = order[i % order.length];
    const pool = byUnit.get(unit)!;
    let seen = used.get(unit)!;
    if (seen.size >= pool.length) {
      seen = new Set<string>();
      used.set(unit, seen);
    }
    const target = (1 + Math.min(2, Math.floor((3 * i) / count))) as Difficulty;
    let best: QuestionTemplate | null = null;
    for (const t of pool) {
      if (seen.has(t.id)) continue;
      if (!best || Math.abs(t.difficulty - target) < Math.abs(best.difficulty - target)) best = t;
    }
    seen.add(best!.id);
    picks.push(best!);
  }

  return picks
    .map((t, i) => ({ t, i }))
    .sort((a, b) => a.t.difficulty - b.t.difficulty || a.i - b.i)
    .map((x) => x.t);
}
