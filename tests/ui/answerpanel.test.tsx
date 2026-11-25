// @vitest-environment jsdom
import { act } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnswerPanel } from "@/components/team/AnswerPanel";
import type { AnswerFormat } from "@/lib/answers";
import type { PublicQuestion } from "@/lib/questions/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(cleanup);

const q = (format: AnswerFormat): PublicQuestion => ({
  templateId: "t",
  unit: 1,
  difficulty: 1,
  resource: "food",
  format,
  prompt: "Do the maths",
});

function setup(format: AnswerFormat, onSend = vi.fn()) {
  const user = userEvent.setup();
  render(<AnswerPanel question={q(format)} canSubmit submitted={false} suggestions={[]} busy={false} onSend={onSend} />);
  const input = screen.getByLabelText(/your answer/i) as HTMLInputElement;
  const key = (name: string) => screen.getByRole("button", { name });
  /** Put the caret / selection where a finger would, then fire the select event the browser sends. */
  const select = (start: number, end = start) => {
    act(() => {
      input.focus();
      input.setSelectionRange(start, end);
      fireEvent.select(input);
    });
  };
  return { user, input, key, select, onSend };
}

const INT: AnswerFormat = { kind: "integer", allowExpression: true };
const INT_PLAIN: AnswerFormat = { kind: "integer" };
const EXPR: AnswerFormat = { kind: "expression" };

describe("keypad", () => {
  it("every button has an accessible label and is at least 44px tall", () => {
    for (const f of [INT, { kind: "decimal", places: 2, allowExpression: true } as AnswerFormat, { kind: "fraction", allowExpression: true } as AnswerFormat, { kind: "percent", allowExpression: true } as AnswerFormat, EXPR]) {
      const { unmount } = render(<AnswerPanel question={q(f)} canSubmit submitted={false} suggestions={[]} busy={false} onSend={() => {}} />);
      const group = screen.getByRole("group", { name: /maths keypad/i });
      const buttons = Array.from(group.querySelectorAll("button"));
      expect(buttons.length).toBeGreaterThanOrEqual(6);
      for (const b of buttons) {
        expect(b.getAttribute("aria-label"), b.textContent ?? "").toMatch(/\S/);
        expect(b.className).toMatch(/min-h-11|min-h-12/);
        expect(b.getAttribute("type")).toBe("button");
      }
      unmount();
    }
  });

  it("numeric questions WITHOUT allowExpression keep the original keypad and filter, no powers or brackets", async () => {
    const { user, input } = setup(INT_PLAIN);
    expect(screen.queryByRole("button", { name: "Insert power" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Insert open bracket" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Insert fraction slash" })).toBeNull();
    expect(screen.getByRole("button", { name: "Insert -" })).toBeTruthy();
    await user.type(input, "2^(3)+4*5/6");
    expect(input.value).toBe("23456");
    cleanup();
    for (const f of [{ kind: "decimal", places: 1 }, { kind: "fraction" }, { kind: "percent" }] as AnswerFormat[]) {
      render(<AnswerPanel question={q(f)} canSubmit submitted={false} suggestions={[]} busy={false} onSend={() => {}} />);
      expect(screen.queryByRole("button", { name: "Insert power" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Insert close bracket" })).toBeNull();
      cleanup();
    }
  });

  it("expression questions always show power and brackets", () => {
    setup(EXPR);
    for (const n of ["Insert power", "Insert open bracket", "Insert close bracket", "Insert fraction slash"]) {
      expect(screen.getByRole("button", { name: n })).toBeTruthy();
    }
  });

  it("numeric formats with allowExpression get fraction, power and brackets; expression-only keys stay off them", () => {
    const { key } = setup(INT);
    for (const n of ["Insert fraction slash", "Insert power", "Insert open bracket", "Insert close bracket", "Insert -", "Delete character before cursor"]) {
      expect(key(n)).toBeTruthy();
    }
    expect(screen.queryByRole("button", { name: "Insert x" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Insert times" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Insert square root" })).toBeNull();
  });

  it("keeps the original button labels for fraction and percent", () => {
    cleanup();
    setup({ kind: "fraction", allowExpression: true });
    expect(screen.getByRole("button", { name: "Insert /" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Insert -" })).toBeTruthy();
    cleanup();
    setup({ kind: "percent" });
    for (const n of ["Insert /", "Insert %", "Insert ."]) expect(screen.getByRole("button", { name: n })).toBeTruthy();
    cleanup();
    setup({ kind: "decimal", places: 1 });
    for (const n of ["Insert -", "Insert ."]) expect(screen.getByRole("button", { name: n })).toBeTruthy();
  });

  it("expression questions add x, times and square root keys", () => {
    const { key } = setup(EXPR);
    for (const n of ["Insert x", "Insert times", "Insert square root", "Insert power", "Insert open bracket"]) expect(key(n)).toBeTruthy();
  });

  it("no keypad on choice questions", () => {
    render(<AnswerPanel question={{ ...q({ kind: "choice", options: ["a", "b"] }), options: ["a", "b"] }} canSubmit submitted={false} suggestions={[]} busy={false} onSend={() => {}} />);
    expect(screen.queryByRole("group", { name: /maths keypad/i })).toBeNull();
    expect(screen.queryByLabelText(/your answer/i)).toBeNull();
  });
});

describe("insertion at the caret", () => {
  it("inserts in the middle, keeps focus, and typing continues after the inserted key", async () => {
    const { user, input, key, select } = setup(INT);
    await user.type(input, "12");
    select(1);
    await user.click(key("Insert power"));
    expect(input.value).toBe("1^2");
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(2);
    await user.keyboard("3");
    expect(input.value).toBe("1^32");
  });

  it("inserts at the start", async () => {
    const { user, input, key, select } = setup(INT);
    await user.type(input, "5");
    select(0);
    await user.click(key("Insert open bracket"));
    expect(input.value).toBe("(5");
    expect(input.selectionStart).toBe(1);
  });

  it("inserts at the end when the caret is at the end, and when the input was never touched", async () => {
    const { user, input, key } = setup(INT);
    await user.click(key("Insert open bracket"));
    expect(input.value).toBe("(");
    await user.type(input, "3");
    await user.click(key("Insert close bracket"));
    expect(input.value).toBe("(3)");
    expect(document.activeElement).toBe(input);
  });

  it("replaces a selection", async () => {
    const { user, input, key, select } = setup(INT);
    await user.type(input, "1234");
    select(1, 3);
    await user.click(key("Insert open bracket"));
    expect(input.value).toBe("1(4");
    expect(input.selectionStart).toBe(2);
  });

  it("several taps in a row advance the caret", async () => {
    const { user, input, key, select } = setup(INT);
    await user.type(input, "29");
    select(1);
    await user.click(key("Insert open bracket"));
    await user.click(key("Insert open bracket"));
    await user.click(key("Insert close bracket"));
    expect(input.value).toBe("2(()9");
  });

  it("still inserts at the remembered caret after the input lost focus", async () => {
    const { user, input, key, select } = setup(INT);
    await user.type(input, "12");
    select(1);
    act(() => input.blur());
    await user.click(key("Insert power"));
    expect(input.value).toBe("1^2");
  });

  it("the fraction key inserts a slash and the square-root key inserts sqrt(", async () => {
    const { user, input, key } = setup(EXPR);
    await user.type(input, "3");
    await user.click(key("Insert fraction slash"));
    await user.click(key("Insert square root"));
    expect(input.value).toBe("3/sqrt(");
  });

  it("times inserts * and shows a dot in the preview", async () => {
    const { user, input, key } = setup(EXPR);
    await user.type(input, "3");
    await user.click(key("Insert times"));
    await user.click(key("Insert x"));
    expect(input.value).toBe("3*x");
    expect(screen.getByTestId("answer-preview").textContent).toBe("You typed: 3·x");
  });

  it("ignores a key that would push the answer past 40 characters", async () => {
    const { user, input, key } = setup(INT);
    await user.type(input, "1".repeat(40));
    expect(input.value).toHaveLength(40);
    await user.click(key("Insert power"));
    expect(input.value).toBe("1".repeat(40));
  });

  it("a multi-character key (sqrt followed by a bracket) is dropped whole if it does not fit", async () => {
    const { user, input, key } = setup(EXPR);
    await user.type(input, "1".repeat(37));
    await user.click(key("Insert square root"));
    expect(input.value).toBe("1".repeat(37));
  });
});

describe("backspace key", () => {
  it("deletes the character before the caret", async () => {
    const { user, input, key, select } = setup(INT);
    await user.type(input, "123");
    select(2);
    await user.click(key("Delete character before cursor"));
    expect(input.value).toBe("13");
    expect(input.selectionStart).toBe(1);
    expect(document.activeElement).toBe(input);
  });
  it("deletes the selection", async () => {
    const { user, input, key, select } = setup(INT);
    await user.type(input, "12345");
    select(1, 4);
    await user.click(key("Delete character before cursor"));
    expect(input.value).toBe("15");
    expect(input.selectionStart).toBe(1);
  });
  it("does nothing at the start, and deletes the last character from an untouched end", async () => {
    const { user, input, key, select } = setup(INT);
    await user.type(input, "12");
    select(0);
    await user.click(key("Delete character before cursor"));
    expect(input.value).toBe("12");
    select(2);
    await user.click(key("Delete character before cursor"));
    expect(input.value).toBe("1");
  });
});

describe("typing filters", () => {
  it("numeric formats allow digits and ^ ( ) * + / - but not letters", async () => {
    const { user, input } = setup(INT);
    expect(input.getAttribute("inputmode")).toBe("decimal");
    await user.type(input, "2^3x+(4)*5/6-7");
    expect(input.value).toBe("2^3+(4)*5/6-7");
  });
  it("expression format allows letters and unicode signs, uses the text keyboard", async () => {
    const { user, input } = setup(EXPR);
    expect(input.getAttribute("inputmode")).toBe("text");
    await user.type(input, "3x²+√(y)×2 !@#<>");
    expect(input.value).toBe("3x²+√(y)×2 ");
  });
  it("a rejected key does not move the caret", async () => {
    const { user, input, select } = setup(INT);
    await user.type(input, "12");
    select(1);
    await user.keyboard("a");
    expect(input.value).toBe("12");
    await user.keyboard("9");
    expect(input.value).toBe("192");
  });
});

describe("preview and submit", () => {
  it("shows the prettified text only when it differs from what was typed", async () => {
    const { user, input } = setup(EXPR);
    expect(screen.queryByTestId("answer-preview")).toBeNull();
    await user.type(input, "3x+6");
    expect(screen.queryByTestId("answer-preview")).toBeNull();
    await user.clear(input);
    await user.type(input, "x^2");
    expect(screen.getByTestId("answer-preview").textContent).toBe("You typed: x²");
    expect(screen.getByTestId("answer-preview").getAttribute("aria-live")).toBe("off");
    await user.clear(input);
    expect(screen.queryByTestId("answer-preview")).toBeNull();
  });
  it("renders the preview as text, never markup", async () => {
    const { user, input } = setup(EXPR);
    await user.type(input, "x^2");
    expect(screen.getByTestId("answer-preview").querySelector("*:not(span)")).toBeNull();
    expect(screen.getByTestId("answer-preview").innerHTML).not.toMatch(/<(b|i|script|img)/i);
  });
  it("submits the raw typed text, not the prettified one", async () => {
    const onSend = vi.fn();
    const { user, input } = setup(EXPR, onSend);
    await user.type(input, " x^2+3*x ");
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(onSend).toHaveBeenCalledWith("x^2+3*x");
  });
  it("resets the field and caret when the round changes", async () => {
    const user = userEvent.setup();
    const props = { canSubmit: true, submitted: false, suggestions: [], busy: false, onSend: () => {} };
    const { rerender } = render(<AnswerPanel question={q(INT)} resetKey={1} {...props} />);
    const input = screen.getByLabelText(/your answer/i) as HTMLInputElement;
    await user.type(input, "12");
    rerender(<AnswerPanel question={q(INT)} resetKey={2} {...props} />);
    expect(input.value).toBe("");
    await user.click(screen.getByRole("button", { name: "Insert open bracket" }));
    expect(input.value).toBe("(");
  });
});
