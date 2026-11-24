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
