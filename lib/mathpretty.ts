/**
 * Display-only prettifier for typed maths. Pure text in, plain text out; the
 * result is meant to be rendered as a React text node, never as HTML.
 *   x^2 -> x²   (single digit exponents 0-9, not followed by another digit or ".")
 *   3*x -> 3·x, 2*3 -> 2×3
 *   sqrt( -> √(
 * Everything else is kept as typed.
 */
const SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹";

const isDigit = (c: string | undefined) => c !== undefined && c >= "0" && c <= "9";

function neighbour(s: string, from: number, step: 1 | -1): string | undefined {
  for (let i = from + step; i >= 0 && i < s.length; i += step) if (s[i] !== " ") return s[i];
  return undefined;
}

export function prettyMath(s: string): string {
  if (typeof s !== "string") return "";
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    // A tower such as x^2^3 is ambiguous when flattened, so it is left exactly as typed.
    const inTower = (isDigit(s[i - 1]) && s[i - 2] === "^") || (out !== "" && SUPERSCRIPT.includes(out[out.length - 1]));
    if (c === "^" && isDigit(s[i + 1]) && !isDigit(s[i + 2]) && s[i + 2] !== "." && s[i + 2] !== "^" && !inTower) {
      out += SUPERSCRIPT[Number(s[i + 1])];
      i++;
    } else if (c === "*") {
      const a = neighbour(s, i, -1);
      const b = neighbour(s, i, 1);
      const numeric = (ch: string | undefined) => isDigit(ch) || ch === ".";
      out += numeric(a) && numeric(b) ? "×" : "·";
    } else if ((c === "s" || c === "S") && s.slice(i, i + 5).toLowerCase() === "sqrt(") {
      out += "√(";
      i += 4;
    } else {
      out += c;
    }
  }
  return out;
}
