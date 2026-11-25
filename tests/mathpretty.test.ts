import { describe, expect, it } from "vitest";
import { prettyMath } from "@/lib/mathpretty";

describe("prettyMath", () => {
  it("turns single-digit exponents into superscripts", () => {
    expect(prettyMath("x^2")).toBe("x²");
    expect(prettyMath("x^0+x^9")).toBe("x⁰+x⁹");
    expect(prettyMath("(x+1)^2")).toBe("(x+1)²");
    expect(prettyMath("2^5")).toBe("2⁵");
    expect(prettyMath("x^2y")).toBe("x²y");
  });
  it("keeps exponents it cannot render faithfully", () => {
    expect(prettyMath("x^10")).toBe("x^10");
    expect(prettyMath("x^2.5")).toBe("x^2.5");
    expect(prettyMath("x^-1")).toBe("x^-1");
    expect(prettyMath("x^(2)")).toBe("x^(2)");
    expect(prettyMath("x^")).toBe("x^");
    expect(prettyMath("^2")).toBe("²");
  });
  it("renders * as × between numbers and · otherwise", () => {
    expect(prettyMath("2*3")).toBe("2×3");
    expect(prettyMath("2 * 3")).toBe("2 × 3");
    expect(prettyMath("3*x")).toBe("3·x");
    expect(prettyMath("x*(x+1)")).toBe("x·(x+1)");
  });
  it("renders sqrt( as √(", () => {
    expect(prettyMath("sqrt(9)")).toBe("√(9)");
    expect(prettyMath("2SQRT(x)")).toBe("2√(x)");
    expect(prettyMath("sqrt 9")).toBe("sqrt 9");
  });
  it("keeps everything else, including HTML-looking text, as plain characters", () => {
    expect(prettyMath("1/2 + (3-4)")).toBe("1/2 + (3-4)");
    expect(prettyMath("<b>x</b>")).toBe("<b>x</b>");
    expect(prettyMath("")).toBe("");
    expect(prettyMath(undefined as unknown as string)).toBe("");
  });
  it("is idempotent", () => {
    for (const s of ["x^2+3*x", "2*3^2", "sqrt(x)^2"]) expect(prettyMath(prettyMath(s))).toBe(prettyMath(s));
  });
});
