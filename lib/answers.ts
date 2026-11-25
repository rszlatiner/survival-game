import { evalExpr, parseExpr, variablesOf } from "@/lib/mathexpr";

export type AnswerFormat =
  | { kind: "integer" }
  | { kind: "decimal"; places: number }
  | { kind: "fraction" }
  | { kind: "percent" }
  | { kind: "choice"; options: string[] }
  /** `expected` is a string expression such as "3x+6"; any equivalent form is accepted. */
  | { kind: "expression" };

const NUM = /^[+-]?(\d+\.?\d*|\.\d+)$/;
const INT = /^[+-]?\d+$/;
const THOUSANDS = /^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/;
const EPS = 1e-9;

/** Parse one plain number (no exponent, no %, no fraction). Null if invalid. */
function parsePlain(s: string, allowThousands: boolean): number | null {
  let t = s;
  if (allowThousands && THOUSANDS.test(t)) t = t.replace(/,/g, "");
  else if (THOUSANDS.test(t) && !t.includes(".")) return null; // "1,000" is ambiguous
  else if ((t.match(/,/g) ?? []).length === 1 && !t.includes(".")) t = t.replace(",", ".");
  if (!NUM.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse a student's typed answer to a number. Never throws; returns null if
 * the text is not an acceptable spelling for the given format.
 * Percent spellings ("50%") yield the fraction value (0.5).
 *
 * Plain spellings ("12", "1,5", "3/4", "50%") are judged first, exactly as
 * before. Only when that fails and the text contains an operator, bracket or
 * "^" is it tried as a pure-number expression ("2^3", "(3+4)/7", "1/2+1/4"):
 * evaluated, then held to the format (integer must be whole). A variable makes
 * it invalid. Exception: for fraction and percent a slash-only text such as
 * "1/2/3" or "1.5/3" keeps the strict a/b rule and is not re-read as an
 * expression. For integer and decimal, "6/2" now evaluates to 3 and is accepted.
 */
export function parseNumeric(input: string, format: AnswerFormat): number | null {
  if (typeof input !== "string" || format.kind === "choice" || format.kind === "expression") return null;
  const s = input.replace(/[−‒-—]/g, "-").trim();
  if (s === "" || s.length > 40) return null;
  const plain = parsePlainAnswer(s, format);
  if (plain !== null) return plain;
  return parseNumericExpression(s, format);
}

/** Characters that mark text as an attempted expression rather than a malformed plain number. */
function looksLikeExpression(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if ("^()*+×÷·/²³√".includes(c)) return true;
    if (c === "-" && i > 0) return true;
  }
  return false;
}

function parseNumericExpression(s: string, format: AnswerFormat): number | null {
  if (!looksLikeExpression(s)) return null;
  const rational = format.kind === "fraction" || format.kind === "percent";
  if (rational && /^[+-]?[0-9.,/\s]*$/.test(s)) return null; // slash-only: strict legacy rule stands
  const e = parseExpr(s);
  if (e === null || variablesOf(e).length > 0) return null;
  const v = evalExpr(e, {});
  if (v === null) return null;
  if (format.kind === "integer") {
    const r = Math.round(v);
    return Math.abs(v - r) <= EPS * Math.max(1, Math.abs(v)) ? r : null;
  }
  return v;
}

function parsePlainAnswer(s: string, format: AnswerFormat): number | null {

  const rational = format.kind === "fraction" || format.kind === "percent";
  const slash = s.split("/");
  if (slash.length > 2) return null;
  if (slash.length === 2) {
    if (!rational) return null;
    const a = slash[0].trim();
    const b = slash[1].trim();
    if (!INT.test(a) || !/^\+?\d+$/.test(b)) return null;
    const den = Number(b);
    if (den === 0) return null;
    const v = Number(a) / den;
    return Number.isFinite(v) ? v : null;
  }
  if (s.endsWith("%")) {
    if (!rational) return null;
    const v = parsePlain(s.slice(0, -1).trim(), false);
    return v === null ? null : v / 100;
  }
  const v = parsePlain(s, format.kind === "integer");
  if (v === null) return null;
  if (format.kind === "integer" && !Number.isInteger(v)) return null;
  return v;
}

/** Decimal-safe rounding: toPrecision(15) strips binary-float noise (2.675 -> "2.67500000000000"). */
function roundHalfAwayFromZero(x: number, places: number): number {
  const clean = Number(x.toPrecision(15));
  const f = 10 ** places;
  const r = Math.round(Math.abs(clean) * f + 1e-9) / f;
  return clean < 0 ? -r : r;
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) <= EPS * Math.max(1, Math.abs(b));
}

/** Check a typed answer against the expected value. Never throws. */
export function isCorrect(input: string, expected: number | string, format: AnswerFormat): boolean {
  if (format.kind === "choice") return typeof expected === "string" && input === expected;
  if (format.kind === "expression") return typeof expected === "string" && expressionsEquivalent(input, expected);
  if (typeof expected !== "number" || !Number.isFinite(expected)) return false;
  const v = parseNumeric(input, format);
  if (v === null) return false;
  switch (format.kind) {
    case "integer":
      return v === expected;
    case "decimal": {
      const p = Math.max(0, Math.floor(format.places));
      return near(v, roundHalfAwayFromZero(expected, p));
    }
    case "fraction":
      return near(v, expected);
    case "percent": {
      if (near(v, expected)) return true;
      // A bare number such as "50" is read as a percentage; "50%" already divided.
      const bare = !input.includes("%") && !input.includes("/");
      return bare && near(v / 100, expected);
    }
  }
}

/** Fixed, deterministic sample values; variable j at sample i uses SAMPLES[(i + 3j) % 8]. */
const SAMPLES = [2, -3, 0.5, 7, 1.5, -1, 4, 11];
const MIN_VALID_POINTS = 5;

/**
 * True when `input` and the author's `expected` are the same function of the
 * same variables: both parse, the input uses only variables found in
 * `expected`, and they agree (relative tolerance 1e-9) at 8 fixed sample
 * points. Points where either side is undefined (1/0, sqrt of a negative) are
 * skipped, and at least 5 must remain. Equivalent forms are all accepted:
 * factorised and expanded answers are NOT distinguished, so (x+1)^2,
 * x^2+2x+1 and 1+2x+x*x are all correct for expected "(x+1)^2". Two constant
 * expressions compare as plain numbers.
 */
function expressionsEquivalent(input: string, expected: string): boolean {
  if (typeof input !== "string") return false;
  const a = parseExpr(input.trim());
  const b = parseExpr(expected);
  if (a === null || b === null) return false;
  const vars = variablesOf(b);
  if (variablesOf(a).some((v) => !vars.includes(v))) return false;
  let valid = 0;
  for (let i = 0; i < SAMPLES.length; i++) {
    const point: Record<string, number> = {};
    vars.forEach((v, j) => (point[v] = SAMPLES[(i + 3 * j) % SAMPLES.length]));
    const x = evalExpr(a, point);
    const y = evalExpr(b, point);
    if (x === null || y === null) continue;
    valid++;
    if (!near(x, y)) return false;
  }
  return valid >= MIN_VALID_POINTS;
}
