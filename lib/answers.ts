export type AnswerFormat =
  | { kind: "integer" }
  | { kind: "decimal"; places: number }
  | { kind: "fraction" }
  | { kind: "percent" }
  | { kind: "choice"; options: string[] };

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
 */
export function parseNumeric(input: string, format: AnswerFormat): number | null {
  if (typeof input !== "string" || format.kind === "choice") return null;
  const s = input.replace(/[−‒-—]/g, "-").trim();
  if (s === "" || s.length > 40) return null;

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

function near(a: number, b: number): boolean {
  return Math.abs(a - b) <= EPS * Math.max(1, Math.abs(b));
}

/** Check a typed answer against the expected value. Never throws. */
export function isCorrect(input: string, expected: number | string, format: AnswerFormat): boolean {
  if (format.kind === "choice") return typeof expected === "string" && input === expected;
  if (typeof expected !== "number" || !Number.isFinite(expected)) return false;
  const v = parseNumeric(input, format);
  if (v === null) return false;
  switch (format.kind) {
    case "integer":
      return v === expected;
    case "decimal": {
      const p = Math.max(0, Math.floor(format.places));
      return near(v, Number(expected.toFixed(p)));
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
