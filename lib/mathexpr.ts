/**
 * Safe maths expression engine: tokenizer, recursive-descent parser and
 * evaluator. No eval, no Function, no regex on user input. Every public
 * function returns null instead of throwing.
 *
 * Syntax (case-insensitive, spaces ignored):
 *   numbers      non-negative decimals: 3, 0.5, .5, 5.
 *   variables    single letters a-z (x and X are the same variable)
 *   operators    + - * / ^   (also unicode × ÷ − ·)
 *   superscripts ² ³ (x² means x^2)
 *   brackets     ( )
 *   functions    sqrt( ) or √( )
 *
 * Conventions (all tested):
 *   - Precedence, loosest to tightest: + -  |  * /  |  implicit multiplication
 *     |  unary minus  |  ^.  So 1/2x is 1/(2x), NOT (1/2)x. Write (1/2)x or
 *     1/2*x for the other reading. 6/2(1+2) is 6/(2*3) = 1.
 *   - Implicit multiplication happens only before a variable, "(" or sqrt:
 *     3x, 2(x+1), (x+1)(x+2), x(x-1), xy. A number can never follow a number,
 *     variable or ")" so "2 3", "x2" and "(x+1)2" are invalid.
 *   - 3x^2 is 3*(x^2); 2^3x is (2^3)*x; -x^2 is -(x^2); ^ is right
 *     associative (2^3^2 = 2^9).
 *   - At most one unary minus per operand (so "--1" is invalid; "2--3" is
 *     fine because the second minus is unary on 3).
 *   - The exponent must be a constant integer from -20 to 20 (it may be an
 *     expression of numbers such as 2^(1+1)); anything else is invalid.
 *
 * Hard limits: input <= 40 chars, nesting depth <= 8, tokens <= 60, results
 * must be finite.
 */

export type Expr =
  | { t: "num"; v: number }
  | { t: "var"; name: string }
  | { t: "neg"; a: Expr }
  | { t: "bin"; op: "+" | "-" | "*" | "/"; a: Expr; b: Expr }
  | { t: "pow"; base: Expr; exp: number }
  | { t: "sqrt"; a: Expr };

const MAX_LEN = 40;
const MAX_DEPTH = 8;
const MAX_TOKENS = 60;
const MAX_EXP = 20;

type Tok =
  | { k: "num"; v: number }
  | { k: "var"; name: string }
  | { k: "op"; c: "+" | "-" | "*" | "/" | "^" }
  | { k: "sup"; n: 2 | 3 }
  | { k: "lp" }
  | { k: "rp" }
  | { k: "sqrt" };

class Fail extends Error {}
const fail = (): never => {
  throw new Fail();
};

const isDigit = (c: string) => c >= "0" && c <= "9";
const isLetter = (c: string) => c >= "a" && c <= "z";

function tokenize(src: string): Tok[] {
  const s = src.toLowerCase();
  const out: Tok[] = [];
  let i = 0;
  const push = (t: Tok) => {
    if (out.length >= MAX_TOKENS) fail();
    out.push(t);
  };
  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === " " || c === "\t") {
      i++;
    } else if (isDigit(c) || c === ".") {
      let j = i;
      let digits = 0;
      while (j < s.length && isDigit(s[j])) (j++, digits++);
      if (s[j] === ".") {
        j++;
        while (j < s.length && isDigit(s[j])) (j++, digits++);
      }
      if (digits === 0) fail();
      const v = Number(s.slice(i, j));
      if (!Number.isFinite(v)) fail();
      push({ k: "num", v });
      i = j;
    } else if (isLetter(c)) {
      if (s.startsWith("sqrt", i)) {
        let j = i + 4;
        while (s[j] === " ") j++;
        if (s[j] === "(") {
          push({ k: "sqrt" });
          i += 4;
          continue;
        }
      }
      push({ k: "var", name: c });
      i++;
    } else if (c === "+" || c === "-" || c === "*" || c === "/" || c === "^") {
      push({ k: "op", c });
      i++;
    } else if (c === "−" || c === "‒" || c === "–" || c === "—") {
      push({ k: "op", c: "-" });
      i++;
    } else if (c === "×" || c === "·") {
      push({ k: "op", c: "*" });
      i++;
    } else if (c === "÷") {
      push({ k: "op", c: "/" });
      i++;
    } else if (c === "²" || c === "³") {
      push({ k: "sup", n: c === "²" ? 2 : 3 });
      i++;
    } else if (c === "(") {
      push({ k: "lp" });
      i++;
    } else if (c === ")") {
      push({ k: "rp" });
      i++;
    } else if (c === "√") {
      push({ k: "sqrt" });
      i++;
    } else {
      fail();
    }
  }
  return out;
}

class Parser {
  private pos = 0;
  private depth = 0;
  constructor(private readonly toks: Tok[]) {}

  parse(): Expr {
    const e = this.sum();
    if (this.pos !== this.toks.length) fail();
    return e;
  }

  private peek(): Tok | undefined {
    return this.toks[this.pos];
  }
  private isOp(...cs: string[]): boolean {
    const t = this.peek();
    return t !== undefined && t.k === "op" && cs.includes(t.c);
  }
  private nest<T>(fn: () => T): T {
    if (++this.depth > MAX_DEPTH) fail();
    const r = fn();
    this.depth--;
    return r;
  }

  private sum(): Expr {
    let a = this.product();
    while (this.isOp("+", "-")) {
      const op = (this.toks[this.pos++] as { c: "+" | "-" }).c;
      a = { t: "bin", op, a, b: this.product() };
    }
    return a;
  }

  private product(): Expr {
    let a = this.signed();
    while (this.isOp("*", "/")) {
      const op = (this.toks[this.pos++] as { c: "*" | "/" }).c;
      a = { t: "bin", op, a, b: this.signed() };
    }
    return a;
  }

  /** One optional sign, then an implicit product. -x^2 is -(x^2). */
  private signed(): Expr {
    if (this.isOp("-")) {
      this.pos++;
      return this.nest(() => ({ t: "neg", a: this.implicit() }) as Expr);
    }
    if (this.isOp("+")) this.pos++;
    return this.implicit();
  }

  private implicit(): Expr {
    let a = this.power();
    for (;;) {
      const t = this.peek();
      if (t && (t.k === "var" || t.k === "lp" || t.k === "sqrt")) {
        a = { t: "bin", op: "*", a, b: this.power() };
      } else return a;
    }
  }

  private power(): Expr {
    const base = this.atom();
    const t = this.peek();
    if (t && t.k === "sup") {
      this.pos++;
      return { t: "pow", base, exp: t.n };
    }
    if (this.isOp("^")) {
      this.pos++;
      const exp = this.nest(() => {
        let neg = false;
        if (this.isOp("-")) {
          this.pos++;
          neg = true;
        }
        const e = this.power();
        return neg ? ({ t: "neg", a: e } as Expr) : e;
      });
      const n = evalNode(exp, {});
      if (n === null || !Number.isInteger(n) || Math.abs(n) > MAX_EXP) fail();
      return { t: "pow", base, exp: n as number };
    }
    return base;
  }

  private atom(): Expr {
    const t = this.toks[this.pos++];
    if (!t) return fail();
    if (t.k === "num") return { t: "num", v: t.v };
    if (t.k === "var") return { t: "var", name: t.name };
    if (t.k === "lp") {
      const e = this.nest(() => this.sum());
      this.expectRp();
      return e;
    }
    if (t.k === "sqrt") {
      const nt = this.toks[this.pos++];
      if (!nt || nt.k !== "lp") return fail();
      const e = this.nest(() => this.sum());
      this.expectRp();
      return { t: "sqrt", a: e };
    }
    return fail();
  }

  private expectRp() {
    const t = this.toks[this.pos++];
    if (!t || t.k !== "rp") fail();
  }
}

/** Parse text to an expression tree; null if it is not valid or breaks a limit. Never throws. */
export function parseExpr(input: string): Expr | null {
  try {
    if (typeof input !== "string" || input.length > MAX_LEN) return null;
    const toks = tokenize(input);
    if (toks.length === 0) return null;
    return new Parser(toks).parse();
  } catch {
    return null;
  }
}

function evalNode(e: Expr, vars: Record<string, number>): number | null {
  switch (e.t) {
    case "num":
      return e.v;
    case "var": {
      const v = Object.prototype.hasOwnProperty.call(vars, e.name) ? vars[e.name] : undefined;
      return typeof v === "number" && Number.isFinite(v) ? v : null;
    }
    case "neg": {
      const a = evalNode(e.a, vars);
      return a === null ? null : -a;
    }
    case "sqrt": {
      const a = evalNode(e.a, vars);
      return a === null || a < 0 ? null : Math.sqrt(a);
    }
    case "pow": {
      const b = evalNode(e.base, vars);
      if (b === null || (b === 0 && e.exp < 0)) return null;
      const r = b ** e.exp;
      return Number.isFinite(r) ? r : null;
    }
    case "bin": {
      const a = evalNode(e.a, vars);
      if (a === null) return null;
      const b = evalNode(e.b, vars);
      if (b === null) return null;
      let r: number;
      if (e.op === "+") r = a + b;
      else if (e.op === "-") r = a - b;
      else if (e.op === "*") r = a * b;
      else {
        if (b === 0) return null;
        r = a / b;
      }
      return Number.isFinite(r) ? r : null;
    }
  }
}

/** Evaluate with the given variable values (keys lower-case). Null if undefined or not finite. Never throws. */
export function evalExpr(expr: Expr, vars: Record<string, number>): number | null {
  try {
    const r = evalNode(expr, vars);
    return r !== null && Number.isFinite(r) ? r : null;
  } catch {
    return null;
  }
}

/** Distinct variable names used by the expression, sorted. */
export function variablesOf(expr: Expr): string[] {
  const seen = new Set<string>();
  const walk = (e: Expr): void => {
    switch (e.t) {
      case "var":
        seen.add(e.name);
        return;
      case "neg":
      case "sqrt":
        return walk(e.a);
      case "pow":
        return walk(e.base);
      case "bin":
        walk(e.a);
        return walk(e.b);
    }
  };
  walk(expr);
  return [...seen].sort();
}
