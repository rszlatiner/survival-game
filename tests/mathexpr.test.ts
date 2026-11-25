import { describe, it, expect } from "vitest";
import { parseExpr, evalExpr, variablesOf } from "@/lib/mathexpr";

/** Parse then evaluate; null if either step fails. */
function ev(s: string, vars: Record<string, number> = {}): number | null {
  const e = parseExpr(s);
  return e === null ? null : evalExpr(e, vars);
}
const close = (a: number | null, b: number) => {
  expect(a).not.toBeNull();
  expect(Math.abs((a as number) - b)).toBeLessThan(1e-9);
};

describe("numbers and precedence", () => {
  it("evaluates plain numbers and decimals", () => {
    expect(ev("42")).toBe(42);
    expect(ev("0.5")).toBe(0.5);
    expect(ev(".5")).toBe(0.5);
    expect(ev("5.")).toBe(5);
  });
  it("applies * and / before + and -", () => {
    expect(ev("2+3*4")).toBe(14);
    expect(ev("10-4/2")).toBe(8);
    expect(ev("2*3+4*5")).toBe(26);
  });
  it("is left associative for - and /", () => {
    expect(ev("10-3-2")).toBe(5);
    expect(ev("24/4/2")).toBe(3);
    expect(ev("8/2*3")).toBe(12);
  });
  it("respects brackets", () => {
    expect(ev("(2+3)*4")).toBe(20);
    expect(ev("(3+4)/7")).toBe(1);
    expect(ev("((2))")).toBe(2);
  });
});

describe("powers", () => {
  it("evaluates ^ and binds tighter than * and unary minus", () => {
    expect(ev("2^3")).toBe(8);
    expect(ev("2*3^2")).toBe(18);
    expect(ev("-2^2")).toBe(-4);
    expect(ev("(-2)^2")).toBe(4);
    expect(ev("-x^2", { x: 3 })).toBe(-9);
  });
  it("is right associative", () => {
    expect(ev("2^3^2")).toBe(512);
    expect(ev("2^2^3")).toBe(256);
  });
  it("supports negative and zero exponents", () => {
    expect(ev("2^-3")).toBe(0.125);
    expect(ev("2^0")).toBe(1);
    expect(ev("x^-1", { x: 4 })).toBe(0.25);
  });
  it("supports unicode superscripts", () => {
    expect(ev("x²", { x: 5 })).toBe(25);
    expect(ev("x³", { x: 2 })).toBe(8);
    expect(ev("3x²", { x: 2 })).toBe(12);
  });
  it("rejects exponents that are not small integers", () => {
    for (const s of ["2^99", "2^21", "2^-21", "2^0.5", "2^(1/2)", "2^(1/0)", "2^(2^5)", "x^y", "2^x", "x^x"]) {
      expect(parseExpr(s), s).toBeNull();
    }
    expect(ev("2^20")).toBe(1048576);
    expect(ev("2^-20")).toBeCloseTo(1 / 1048576, 15);
    expect(ev("2^(1+1)")).toBe(4);
  });
  it("0 to a negative power is undefined", () => {
    expect(ev("0^-1")).toBeNull();
    expect(ev("x^-2", { x: 0 })).toBeNull();
  });
});

describe("implicit multiplication", () => {
  it("handles number-variable, number-bracket and bracket-bracket", () => {
    expect(ev("3x", { x: 4 })).toBe(12);
    expect(ev("2(x+1)", { x: 4 })).toBe(10);
    expect(ev("(x+1)(x+2)", { x: 1 })).toBe(6);
    expect(ev("x(x-1)", { x: 5 })).toBe(20);
    expect(ev("xy", { x: 3, y: 5 })).toBe(15);
    expect(ev("2x(x+1)", { x: 2 })).toBe(12);
  });
  it("makes 3x^2 mean 3*(x^2) and 2^3x mean (2^3)*x", () => {
    expect(ev("3x^2", { x: 2 })).toBe(12);
    expect(ev("2^3x", { x: 2 })).toBe(16);
    expect(ev("x^2y", { x: 2, y: 3 })).toBe(12);
  });
  it("binds tighter than division: 1/2x is 1/(2x)", () => {
    expect(ev("1/2x", { x: 2 })).toBe(0.25);
    expect(ev("6/2(1+2)")).toBe(1);
    expect(ev("(1/2)x", { x: 2 })).toBe(1);
    expect(ev("1/2*x", { x: 2 })).toBe(1);
  });
  it("does not glue adjacent numbers or a number after a variable or bracket", () => {
    for (const s of ["2 3", "1 000", "x2", "(x+1)2", "2.5 3"]) expect(parseExpr(s), s).toBeNull();
  });
  it("allows whitespace between implicit factors", () => {
    expect(ev("3 x", { x: 2 })).toBe(6);
    expect(ev("2 (x + 1)", { x: 2 })).toBe(6);
  });
});

describe("unary minus", () => {
  it("handles leading and operand minus", () => {
    expect(ev("-3")).toBe(-3);
    expect(ev("-(2+3)")).toBe(-5);
    expect(ev("2*-3")).toBe(-6);
    expect(ev("2--3")).toBe(5);
    expect(ev("-2x", { x: 3 })).toBe(-6);
  });
  it("rejects a doubled sign", () => {
    expect(parseExpr("--1")).toBeNull();
    expect(parseExpr("-(-x)")).not.toBeNull();
    expect(parseExpr("---x")).toBeNull();
  });
});

describe("sqrt", () => {
  it("evaluates sqrt( ) and the unicode sign", () => {
    expect(ev("sqrt(16)")).toBe(4);
    expect(ev("√(9)")).toBe(3);
    expect(ev("2sqrt(x)", { x: 9 })).toBe(6);
    expect(ev("sqrt(x^2)", { x: 3 })).toBe(3);
    close(ev("sqrt(2)*sqrt(2)"), 2);
  });
  it("is undefined for negatives and needs brackets", () => {
    expect(ev("sqrt(-1)")).toBeNull();
    expect(variablesOf(parseExpr("sqrt")!)).toEqual(["q", "r", "s", "t"]); // no bracket: just letters
    expect(parseExpr("sqrt 4")).toBeNull();
    expect(parseExpr("√")).toBeNull();
    expect(parseExpr("sqrt()")).toBeNull();
  });
});

describe("unicode, case and whitespace", () => {
  it("normalises × ÷ − · and case", () => {
    expect(ev("6×7")).toBe(42);
    expect(ev("8÷2")).toBe(4);
    expect(ev("5−3")).toBe(2);
    expect(ev("2·3")).toBe(6);
    expect(ev("X+x", { x: 2 })).toBe(4);
    expect(ev("SQRT(4)")).toBe(2);
  });
  it("ignores spaces and non-breaking spaces", () => {
    expect(ev("  1 +  2  ")).toBe(3);
    expect(ev("1 + 2")).toBe(3);
  });
});

describe("variables", () => {
  it("lists distinct variables sorted, lower-cased", () => {
    expect(variablesOf(parseExpr("3x+y-X*z")!)).toEqual(["x", "y", "z"]);
    expect(variablesOf(parseExpr("2+3")!)).toEqual([]);
    expect(variablesOf(parseExpr("sqrt(a)+a^2")!)).toEqual(["a"]);
  });
  it("returns null when a variable is missing or not finite", () => {
    const e = parseExpr("x+1")!;
    expect(evalExpr(e, {})).toBeNull();
    expect(evalExpr(e, { x: Infinity })).toBeNull();
    expect(evalExpr(e, { x: NaN })).toBeNull();
    expect(evalExpr(e, { x: 1 })).toBe(2);
  });
});

describe("invalid input", () => {
  it("returns null, never throws", () => {
    const bad = [
      "", "   ", "(", ")", "(1+2", "1+2)", "()", "2^^3", "2^", "^2", "*3", "3*", "1+", "+", "/", "1//2",
      "1/0", "0/0", "1/(2-2)", "x^y", "2^99", "abc!", "1,5", "1e3", "$", "x=2", "2%", "1.2.3", ".", "..", "2..3",
      "x y z w v u t s r q p o n m l k j i h g f e d c b a ", "\u0000", "💥", "sqrt(", "(x", "x)",
    ];
    for (const s of bad) {
      expect(() => parseExpr(s)).not.toThrow();
      expect(ev(s), JSON.stringify(s)).toBeNull();
    }
  });
  it("rejects non-strings", () => {
    expect(parseExpr(undefined as unknown as string)).toBeNull();
    expect(parseExpr(null as unknown as string)).toBeNull();
    expect(parseExpr(5 as unknown as string)).toBeNull();
    expect(parseExpr({} as unknown as string)).toBeNull();
  });
  it("rejects over-long input (> 40 chars)", () => {
    expect(parseExpr("1+".repeat(20) + "1")).toBeNull(); // 41 chars
    expect(parseExpr("1+".repeat(19) + "1")).not.toBeNull(); // 39 chars
    expect(parseExpr("9".repeat(1000))).toBeNull();
  });
  it("rejects nesting deeper than 8", () => {
    expect(parseExpr("(".repeat(8) + "1" + ")".repeat(8))).not.toBeNull();
    expect(parseExpr("(".repeat(9) + "1" + ")".repeat(9))).toBeNull();
    expect(parseExpr("sqrt(".repeat(9) + "1" + ")".repeat(9))).toBeNull();
    expect(parseExpr("2^-".repeat(9) + "2")).toBeNull();
    expect(parseExpr("(".repeat(500) + "1" + ")".repeat(500))).toBeNull();
  });
  it("a dense input of 39 one-char tokens is fine (the 60-token cap sits behind the 40-char cap)", () => {
    expect(parseExpr("x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x+x")).not.toBeNull();
  });
  it("rejects results that overflow", () => {
    expect(ev("99999999999999999999^20")).toBeNull();
    expect(ev("9999999999^20*9999999999^20*9999999999^20*9999999999^20")).toBeNull();
  });
  it("evaluates in well under a second for adversarial input", () => {
    const t0 = Date.now();
    for (let i = 0; i < 200; i++) {
      parseExpr("(((((((1+".repeat(5) + "1");
      parseExpr("x^".repeat(20));
      parseExpr("2^3^2^1^1^1^1^1^1^1^1^1^1^1^1^1");
    }
    expect(Date.now() - t0).toBeLessThan(1000);
  });
});

describe("fuzz", () => {
  it("never throws on 5000 random strings from the allowed alphabet, and is fast", () => {
    const alphabet = "0123456789.+-*/^()xyzXsqrt√×÷−²³· ";
    let seed = 123456789;
    const rnd = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    const t0 = Date.now();
    let parsed = 0;
    for (let i = 0; i < 5000; i++) {
      const len = Math.floor(rnd() * 48);
      let s = "";
      for (let j = 0; j < len; j++) s += alphabet[Math.floor(rnd() * alphabet.length)];
      let e;
      expect(() => (e = parseExpr(s))).not.toThrow();
      if (e) {
        parsed++;
        expect(() => evalExpr(e!, { x: 2, y: -3, z: 0.5, s: 1, q: 2, r: 3, t: 4 })).not.toThrow();
        const r = evalExpr(e!, { x: 0, y: 0, z: 0, s: 0, q: 0, r: 0, t: 0 });
        expect(r === null || Number.isFinite(r)).toBe(true);
      }
    }
    expect(parsed).toBeGreaterThan(50); // the fuzz really reaches the evaluator
    expect(Date.now() - t0).toBeLessThan(3000);
  });
});
