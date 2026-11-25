import { describe, it, expect } from "vitest";
import { isCorrect, parseNumeric, type AnswerFormat } from "@/lib/answers";

const frac: AnswerFormat = { kind: "fraction" };
const pct: AnswerFormat = { kind: "percent" };
const int: AnswerFormat = { kind: "integer" };
const dec2: AnswerFormat = { kind: "decimal", places: 2 };

describe("fraction format", () => {
  it("accepts fraction, decimal and percent spellings", () => {
    expect(isCorrect("1/2", 0.5, frac)).toBe(true);
    expect(isCorrect("0.5", 0.5, frac)).toBe(true);
    expect(isCorrect("50%", 0.5, frac)).toBe(true);
    expect(isCorrect(" 2 / 4 ", 0.5, frac)).toBe(true);
    expect(isCorrect("1/3", 1 / 3, frac)).toBe(true);
  });
  it("rejects wrong values", () => {
    expect(isCorrect("1/3", 0.5, frac)).toBe(false);
    expect(isCorrect("0.33", 1 / 3, frac)).toBe(false);
  });
  it("rejects malformed fractions", () => {
    for (const s of ["1/0", "1/", "/2", "1/2/3", "1.5/3", "1/2%", "0/0"]) {
      expect(parseNumeric(s, frac)).toBeNull();
      expect(isCorrect(s, 0.5, frac)).toBe(false);
    }
  });
  it("handles negative and zero numerators", () => {
    expect(isCorrect("-1/2", -0.5, frac)).toBe(true);
    expect(parseNumeric("0/5", frac)).toBe(0);
  });
});

describe("percent format", () => {
  it("accepts percent, with spaces, and other spellings", () => {
    expect(isCorrect("50%", 0.5, pct)).toBe(true);
    expect(isCorrect(" 50 % ", 0.5, pct)).toBe(true);
    expect(isCorrect("0.5", 0.5, pct)).toBe(true);
    expect(isCorrect("1/2", 0.5, pct)).toBe(true);
    expect(isCorrect("12,5%", 0.125, pct)).toBe(true);
  });
  it("accepts a bare percentage number (ambiguity decision)", () => {
    expect(isCorrect("50", 0.5, pct)).toBe(true);
    expect(isCorrect("25", 0.5, pct)).toBe(false);
  });
  it("does not accept bare x100 in fraction format", () => {
    expect(isCorrect("50", 0.5, frac)).toBe(false);
  });
  it("rejects wrong percentages", () => {
    expect(isCorrect("51%", 0.5, pct)).toBe(false);
    expect(isCorrect("5%%", 0.5, pct)).toBe(false);
    expect(isCorrect("%", 0.5, pct)).toBe(false);
  });
});

describe("parseNumeric robustness", () => {
  it("treats comma as decimal separator", () => {
    expect(parseNumeric("1,5", { kind: "decimal", places: 1 })).toBe(1.5);
    expect(parseNumeric("1,5", frac)).toBe(1.5);
  });
  it("returns null for empty, non-numeric and non-finite", () => {
    for (const s of ["", "   ", "abc", "1e999", "1e3", "Infinity", "NaN", "0x10", "1 2", "--1", "1.2.3", "1,2,3", "."]) {
      for (const f of [int, dec2, frac, pct]) {
        expect(parseNumeric(s, f)).toBeNull();
        expect(isCorrect(s, 1, f)).toBe(false);
      }
    }
    expect(parseNumeric("1/0", frac)).toBeNull();
    expect(isCorrect("1/0", 0.5, frac)).toBe(false);
  });
  it("never throws on odd input types", () => {
    expect(parseNumeric(undefined as unknown as string, int)).toBeNull();
    expect(parseNumeric(null as unknown as string, int)).toBeNull();
    expect(parseNumeric(5 as unknown as string, int)).toBeNull();
    expect(isCorrect(undefined as unknown as string, 5, int)).toBe(false);
  });
  it("normalises unicode minus and non-breaking spaces", () => {
    expect(parseNumeric("−3", int)).toBe(-3);
    expect(parseNumeric(" 4 ", int)).toBe(4);
  });
  it("accepts leading plus and bare-dot decimals", () => {
    expect(parseNumeric("+3", int)).toBe(3);
    expect(parseNumeric(".5", frac)).toBe(0.5);
    expect(parseNumeric("5.", dec2)).toBe(5);
  });
  it("returns null for choice format", () => {
    expect(parseNumeric("3", { kind: "choice", options: ["3"] })).toBeNull();
  });
});

describe("integer format", () => {
  it("accepts integers and x.0 but not fractional values", () => {
    expect(isCorrect("42", 42, int)).toBe(true);
    expect(isCorrect("-7", -7, int)).toBe(true);
    expect(isCorrect("3.0", 3, int)).toBe(true);
    expect(isCorrect("3,0", 3, int)).toBe(true);
    expect(parseNumeric("3.5", int)).toBeNull();
    expect(isCorrect("3.5", 3, int)).toBe(false);
    expect(isCorrect("3.5", 3.5, int)).toBe(false);
  });
  it("rejects fraction and percent spellings", () => {
    expect(parseNumeric("6/2", int)).toBeNull();
    expect(parseNumeric("300%", int)).toBeNull();
    expect(isCorrect("6/2", 3, int)).toBe(false);
  });
  it("treats comma groups as thousands separators (ambiguity decision)", () => {
    expect(isCorrect("1,500", 1500, int)).toBe(true);
    expect(isCorrect("1,500", 1, int)).toBe(false);
    expect(isCorrect("12,345,678", 12345678, int)).toBe(true);
  });
  it("rejects wrong values", () => {
    expect(isCorrect("41", 42, int)).toBe(false);
  });
});

describe("decimal format", () => {
  it("accepts the correctly rounded value only", () => {
    expect(isCorrect("3.14", 3.1416, dec2)).toBe(true);
    expect(isCorrect("3,14", 3.1416, dec2)).toBe(true);
    expect(isCorrect("3.140", 3.1416, dec2)).toBe(true);
    expect(isCorrect("3.2", 3.1416, dec2)).toBe(false);
    expect(isCorrect("3.1", 3.1416, dec2)).toBe(false);
    expect(isCorrect("3.1416", 3.1416, dec2)).toBe(false);
    expect(isCorrect("3", 3.1416, dec2)).toBe(false);
  });
  it("rejects fraction/percent spellings", () => {
    expect(parseNumeric("1/2", dec2)).toBeNull();
    expect(parseNumeric("50%", dec2)).toBeNull();
  });
  it("treats comma groups as ambiguous and rejects them", () => {
    expect(parseNumeric("1,000", dec2)).toBeNull();
  });
  it("rounds .5 ties half away from zero (binary-float safe)", () => {
    expect(isCorrect("2.68", 2.675, dec2)).toBe(true);
    expect(isCorrect("2.67", 2.675, dec2)).toBe(false);
    expect(isCorrect("1.01", 1.005, dec2)).toBe(true);
    expect(isCorrect("1", 1.005, dec2)).toBe(false);
    expect(isCorrect("-2.68", -2.675, dec2)).toBe(true);
    expect(isCorrect("-2.67", -2.675, dec2)).toBe(false);
    expect(isCorrect("1", 0.5, { kind: "decimal", places: 0 })).toBe(true);
    expect(isCorrect("-1", -0.5, { kind: "decimal", places: 0 })).toBe(true);
  });
  it("works with places 0", () => {
    expect(isCorrect("3", 3.4, { kind: "decimal", places: 0 })).toBe(true);
  });
});

describe("choice format", () => {
  const choice: AnswerFormat = { kind: "choice", options: ["A", "B", "C"] };
  it("compares the option string exactly", () => {
    expect(isCorrect("B", "B", choice)).toBe(true);
    expect(isCorrect("b", "B", choice)).toBe(false);
    expect(isCorrect("A", "B", choice)).toBe(false);
    expect(isCorrect(" B", "B", choice)).toBe(false);
  });
  it("requires expected to be a string", () => {
    expect(isCorrect("1", 1, choice)).toBe(false);
  });
});

describe("expected value validation", () => {
  it("never matches when expected is the wrong type or non-finite", () => {
    expect(isCorrect("1", "1", int)).toBe(false);
    expect(isCorrect("1", NaN, int)).toBe(false);
    expect(isCorrect("1", Infinity, frac)).toBe(false);
  });
});

describe("numeric formats accept pure-number expressions only when allowExpression is set", () => {
  const int = { kind: "integer", allowExpression: true } as AnswerFormat;
  const dec2 = { kind: "decimal", places: 2, allowExpression: true } as AnswerFormat;
  const frac = { kind: "fraction", allowExpression: true } as AnswerFormat;
  const pct = { kind: "percent", allowExpression: true } as AnswerFormat;
  it("is off by default: the student cannot retype 'work out' arithmetic and let the engine solve it", () => {
    const off: AnswerFormat[] = [
      { kind: "integer" }, { kind: "decimal", places: 2 }, { kind: "fraction" }, { kind: "percent" },
      { kind: "integer", allowExpression: false },
    ];
    for (const f of off) {
      const rational = f.kind === "fraction" || f.kind === "percent"; // a plain a/b is a valid fraction anyway
      for (const s of ["7+4*4", "2^3", "(3+4)/7", "1/2+1/4", "6/2", "2(3)", "3×4", "10-4", "3²"]) {
        if (rational && s === "6/2") continue;
        expect(parseNumeric(s, f), `${f.kind} ${s}`).toBeNull();
        expect(isCorrect(s, 23, f), `${f.kind} ${s}`).toBe(false);
      }
    }
    expect(isCorrect("23", 23, { kind: "integer" })).toBe(true);
    expect(isCorrect("1/2", 0.5, { kind: "fraction" })).toBe(true);
    expect(parseNumeric("7+4*4", int)).toBe(23);
  });
  it("integer with the flag accepts 6/2 as 3 and rejects 7/2; decimal with the flag evaluates 1/2", () => {
    expect(parseNumeric("6/2", int)).toBe(3);
    expect(isCorrect("6/2", 3, int)).toBe(true);
    expect(parseNumeric("7/2", int)).toBeNull();
    expect(parseNumeric("1/2", dec2)).toBe(0.5);
    expect(isCorrect("1/3", 1 / 3, dec2)).toBe(false);
    expect(isCorrect("33/100", 1 / 3, dec2)).toBe(true);
  });
  it("integer: exponents, brackets and arithmetic", () => {
    expect(isCorrect("2^3", 8, int)).toBe(true);
    expect(isCorrect("2^5", 32, int)).toBe(true);
    expect(isCorrect("(3+4)*2", 14, int)).toBe(true);
    expect(isCorrect("3×4", 12, int)).toBe(true);
    expect(isCorrect("10−4", 6, int)).toBe(true);
    expect(isCorrect("3²", 9, int)).toBe(true);
    expect(isCorrect("2(3+4)", 14, int)).toBe(true);
    expect(isCorrect("0.1*30", 3, int)).toBe(true); // float noise tolerated
    expect(isCorrect("2^3", 9, int)).toBe(false);
    expect(isCorrect("7/2", 3.5, int)).toBe(false); // not a whole number
  });
  it("fraction and percent compare the evaluated value", () => {
    expect(isCorrect("(3+4)/7", 1, frac)).toBe(true);
    expect(isCorrect("1/2+1/4", 0.75, frac)).toBe(true);
    expect(isCorrect("(1+2)/6", 0.5, frac)).toBe(true);
    expect(isCorrect("1/2+1/4", 0.5, frac)).toBe(false);
    expect(isCorrect("25+25", 0.5, pct)).toBe(true); // bare 50 is read as a percentage, as for plain "50"
    expect(isCorrect("(1+1)/4", 0.5, pct)).toBe(true); // a slash means a fraction value, not a percentage
    expect(isCorrect("1/2+1/2", 1, pct)).toBe(true);
  });
  it("decimal rounds the evaluated value per places", () => {
    expect(isCorrect("(1+2)/3*3.14159", 3.14, dec2)).toBe(false);
    expect(isCorrect("22/7", 22 / 7, { kind: "decimal", places: 2 })).toBe(false); // 3.142857 != 3.14
    expect(isCorrect("3.14", 22 / 7, { kind: "decimal", places: 2 })).toBe(true);
    expect(isCorrect("314/100", 3.14, dec2)).toBe(true);
    expect(isCorrect("2^-1", 0.5, dec2)).toBe(true);
  });
  it("rejects variables and invalid expressions in numeric answers", () => {
    for (const s of ["2x", "x+1", "3(x)", "2^x", "(1+2", "2^^3", "2^99", "1/(2-2)", "1+", "(3+4", "2^0.5"]) {
      for (const f of [int, dec2, frac, pct]) {
        expect(parseNumeric(s, f), s).toBeNull();
        expect(isCorrect(s, 1, f), s).toBe(false);
      }
    }
  });
  it("keeps strict legacy rules for slash-only text in fraction and percent formats", () => {
    for (const s of ["1/2/3", "1.5/3", "1/", "/2", "1/0"]) expect(parseNumeric(s, frac), s).toBeNull();
    expect(parseNumeric("1/2/3", pct)).toBeNull();
  });
  it("plain numbers behave exactly as before (the expression path is only a fallback)", () => {
    expect(parseNumeric("5", int)).toBe(5);
    expect(parseNumeric("-5", int)).toBe(-5);
    expect(parseNumeric("1,500", int)).toBe(1500);
    expect(parseNumeric("--1", int)).toBeNull();
    expect(parseNumeric("1 2", int)).toBeNull();
    expect(parseNumeric("2 3", int)).toBeNull();
  });
  it("never throws on hostile numeric input", () => {
    for (const s of ["(".repeat(500), "2^".repeat(30), "9".repeat(100) + "^2", "((((((((((1))))))))))"]) {
      for (const f of [int, dec2, frac, pct]) expect(parseNumeric(s, f)).toBeNull();
    }
  });
});

describe("expression format", () => {
  const ex: AnswerFormat = { kind: "expression" };
  it("accepts every equivalent form (factorised vs expanded are not distinguished)", () => {
    for (const s of ["(x+1)^2", "x^2+2x+1", "1+2x+x*x", "(x+1)(x+1)", "x²+2x+1", "1 + 2*x + x^2", "(1+x)^2", "X^2+2X+1"]) {
      expect(isCorrect(s, "(x+1)^2", ex), s).toBe(true);
    }
    expect(isCorrect("3x+6", "3x+6", ex)).toBe(true);
    expect(isCorrect("x*3+6", "3x+6", ex)).toBe(true);
    expect(isCorrect("6+3x", "3x+6", ex)).toBe(true);
    expect(isCorrect("3(x+2)", "3x+6", ex)).toBe(true);
    expect(isCorrect("(x-2)(x+2)", "x^2-4", ex)).toBe(true);
    expect(isCorrect("x(x-1)", "x^2-x", ex)).toBe(true);
    expect(isCorrect("x/2", "0.5x", ex)).toBe(true);
    expect(isCorrect("2sqrt(x)", "sqrt(4x)", ex)).toBe(true);
  });
  it("rejects near-misses and the separating points work (2x vs x^2 coincide at x=2)", () => {
    expect(isCorrect("x^2+2x", "(x+1)^2", ex)).toBe(false);
    expect(isCorrect("x^2+1", "(x+1)^2", ex)).toBe(false);
    expect(isCorrect("2x", "x^2", ex)).toBe(false);
    expect(isCorrect("x^2", "2x", ex)).toBe(false);
    expect(isCorrect("3x+5", "3x+6", ex)).toBe(false);
    expect(isCorrect("x^3", "x^2", ex)).toBe(false);
    expect(isCorrect("x^2-4", "(x-2)^2", ex)).toBe(false);
    expect(isCorrect("x^4", "x^2*x^2*x", ex)).toBe(false);
    expect(isCorrect("1/2x", "(1/2)x", ex)).toBe(false); // documented convention: 1/2x is 1/(2x)
    expect(isCorrect("1/2*x", "(1/2)x", ex)).toBe(true);
  });
  it("does not alias when there are more than 8 variables", () => {
    // a and i would share a sample value if values simply wrapped around every 8 variables.
    const e = "a-i+0b+0c+0d+0e+0f+0g+0h";
    expect(isCorrect(e, e, ex)).toBe(true);
    expect(isCorrect("i-a+0b+0c+0d+0e+0f+0g+0h", e, ex)).toBe(false);
    expect(isCorrect("0+a-i+0h+0g+0f+0e+0d+0c+0b", e, ex)).toBe(true);
  });
  it("rejects a different variable set", () => {
    expect(isCorrect("y+1", "x+1", ex)).toBe(false);
    expect(isCorrect("x+y", "x+1", ex)).toBe(false);
    expect(isCorrect("x+x-x", "x+1", ex)).toBe(false);
    expect(isCorrect("5", "x+1", ex)).toBe(false);
  });
  it("two variables work", () => {
    expect(isCorrect("a*b+b*a", "2ab", ex)).toBe(true);
    expect(isCorrect("a+b", "b+a", ex)).toBe(true);
    expect(isCorrect("ab", "a+b", ex)).toBe(false);
    expect(isCorrect("a-b", "b-a", ex)).toBe(false);
  });
  it("constants: both constant means an ordinary numeric comparison", () => {
    expect(isCorrect("2^5", "32", ex)).toBe(true);
    expect(isCorrect("(3+4)/7", "1", ex)).toBe(true);
    expect(isCorrect("31", "32", ex)).toBe(false);
    expect(isCorrect("x", "5", ex)).toBe(false);
  });
  it("skips undefined points but needs at least 5 valid ones", () => {
    expect(isCorrect("1/x", "1/x", ex)).toBe(true);
    expect(isCorrect("sqrt(x)^2", "x", ex)).toBe(true); // negative points skipped, 6 valid remain
    expect(isCorrect("1/(x-x)", "1/(x-x)", ex)).toBe(false); // never defined
    expect(isCorrect("sqrt(x-3)", "sqrt(x-3)", ex)).toBe(false); // fewer than 5 valid points
  });
  it("rejects invalid input, over-long input and non-string expected", () => {
    for (const s of ["", "  ", "(x+1", "x^y", "2^^3", "x^99", "x=3", "3x+", "1/0"]) expect(isCorrect(s, "3x+6", ex), s).toBe(false);
    expect(isCorrect("x+".repeat(30) + "1", "x", ex)).toBe(false);
    expect(isCorrect("x", 5 as unknown as string, ex)).toBe(false);
    expect(isCorrect("x", "x+", ex)).toBe(false); // broken author expression never matches
    expect(isCorrect(undefined as unknown as string, "x", ex)).toBe(false);
  });
  it("parseNumeric returns null for the expression format", () => {
    expect(parseNumeric("3", ex)).toBeNull();
  });
});
