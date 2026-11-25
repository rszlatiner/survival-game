"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MAX_ANSWER_LENGTH } from "@/lib/config";
import { prettyMath } from "@/lib/mathpretty";
import type { PublicQuestion } from "@/lib/questions/types";
import { bigField, btn, card, label } from "@/components/ui/styles";

/** Characters any typed answer may contain (numeric formats stop here). */
const BASE_CHARS = "0123456789.,-/%^()*+ ";
/** Expression answers also allow letters and the unicode maths signs. */
const EXPR_CHARS = BASE_CHARS + "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ√×÷²³·−=";

/** Original numeric sets, used unless the question sets allowExpression. */
const PLAIN_CHARS: Record<string, string> = {
  integer: "0123456789-",
  decimal: "0123456789.,-",
  fraction: "0123456789/-",
  percent: "0123456789/.,%-",
};

function keepAllowed(text: string, kind: string, richNumeric: boolean): string {
  const allowed = kind === "expression" ? EXPR_CHARS : richNumeric ? BASE_CHARS : (PLAIN_CHARS[kind] ?? PLAIN_CHARS.decimal);
  let out = "";
  for (const ch of text) if (allowed.includes(ch)) out += ch;
  return out;
}

interface Key {
  /** Button text. */
  show: string;
  /** Text inserted at the caret. */
  insert: string;
  aria: string;
}

const K = {
  minus: { show: "-", insert: "-", aria: "Insert -" },
  dot: { show: ".", insert: ".", aria: "Insert ." },
  percent: { show: "%", insert: "%", aria: "Insert %" },
  slashLegacy: { show: "/", insert: "/", aria: "Insert /" },
  fraction: { show: "a/b", insert: "/", aria: "Insert fraction slash" },
  power: { show: "^", insert: "^", aria: "Insert power" },
  open: { show: "(", insert: "(", aria: "Insert open bracket" },
  close: { show: ")", insert: ")", aria: "Insert close bracket" },
  plus: { show: "+", insert: "+", aria: "Insert plus" },
  times: { show: "×", insert: "*", aria: "Insert times" },
  x: { show: "x", insert: "x", aria: "Insert x" },
  sqrt: { show: "√(", insert: "sqrt(", aria: "Insert square root" },
} satisfies Record<string, Key>;

/** Keypad per answer format: the original buttons first (labels unchanged), then the maths keys. */
const KEYS: Record<string, Key[]> = {
  integer: [K.minus],
  decimal: [K.minus, K.dot],
  fraction: [K.minus, K.slashLegacy],
  percent: [K.slashLegacy, K.percent, K.dot],
  expression: [K.x, K.power, K.open, K.close, K.fraction, K.plus, K.minus, K.times, K.sqrt, K.dot],
};
/** Extra keys for numeric questions that set allowExpression (powers, brackets, fraction slash). */
const RICH_KEYS: Record<string, Key[]> = {
  integer: [K.fraction, K.power, K.open, K.close],
  decimal: [K.fraction, K.power, K.open, K.close],
  fraction: [K.power, K.open, K.close],
  percent: [K.power, K.open, K.close],
};

interface Props {
  question: PublicQuestion;
  canSubmit: boolean;
  submitted: boolean;
  suggestions: string[];
  /** Changes each round so the input resets even if the prompt repeats. */
  resetKey?: string | number;
  /** Tiebreak: suggestions are not accepted, so only a submitter gets controls. */
  canSuggest?: boolean;
  busy: boolean;
  onSend: (answer: string) => void;
}

export function AnswerPanel({ question, canSubmit, submitted, suggestions, busy, onSend, resetKey, canSuggest = true }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  /** Last known selection in the input; survives blur so a keypad tap still inserts at the caret. */
  const sel = useRef<{ start: number; end: number } | null>(null);
  /** Caret to restore after the next render (set by keypad and filtered typing). */
  const pendingCaret = useRef<number | null>(null);
  /** Bumped when the caret must be restored even though the text did not change (a rejected key). */
  const [caretTick, setCaretTick] = useState(0);
  useEffect(() => {
    setValue("");
    sel.current = null;
    pendingCaret.current = null;
  }, [question.prompt, resetKey]);
  const kind = question.format.kind;
  const richNumeric = "allowExpression" in question.format && question.format.allowExpression === true;
  const keys = [...(KEYS[kind] ?? []), ...(richNumeric ? (RICH_KEYS[kind] ?? []) : [])];
  const options = question.format.kind === "choice" ? (question.options ?? question.format.options) : null;
  const verb = canSubmit ? "Submit" : "Suggest";
  const set = (v: string) => {
    const next = v.slice(0, MAX_ANSWER_LENGTH);
    sel.current = { start: next.length, end: next.length };
    setValue(next);
  };
  const empty = value.trim() === "";

  // After a keypad tap or a filtered keystroke, put the caret back where it belongs.
  useLayoutEffect(() => {
    const el = inputRef.current;
    const pos = pendingCaret.current;
    if (!el || pos === null) return;
    pendingCaret.current = null;
    el.focus();
    el.setSelectionRange(pos, pos);
  }, [value, caretTick]);

  const remember = () => {
    const el = inputRef.current;
    if (el && el.selectionStart !== null && el.selectionEnd !== null) {
      sel.current = { start: el.selectionStart, end: el.selectionEnd };
    }
  };
  const range = () => {
    const r = sel.current ?? { start: value.length, end: value.length };
    return { start: Math.min(r.start, value.length), end: Math.min(r.end, value.length) };
  };
  const apply = (next: string, caret: number) => {
    sel.current = { start: caret, end: caret };
    pendingCaret.current = caret;
    setValue(next);
  };
  const insertAtCaret = (text: string) => {
    const { start, end } = range();
    const next = value.slice(0, start) + text + value.slice(end);
    if (next.length > MAX_ANSWER_LENGTH) return; // never silently drop half of a key
    apply(next, start + text.length);
  };
  const backspace = () => {
    const { start, end } = range();
    if (start !== end) apply(value.slice(0, start) + value.slice(end), start);
    else if (start > 0) apply(value.slice(0, start - 1) + value.slice(start), start - 1);
    else inputRef.current?.focus();
  };
  const onType = (raw: string, caret: number | null) => {
    const kept = keepAllowed(raw, kind, richNumeric);
    const before = keepAllowed(raw.slice(0, caret ?? raw.length), kind, richNumeric);
    const clipped = kept.slice(0, MAX_ANSWER_LENGTH);
    const pos = Math.min(before.length, clipped.length);
    sel.current = { start: pos, end: pos };
    if (clipped !== raw) {
      pendingCaret.current = pos;
      setCaretTick((n) => n + 1);
    }
    setValue(clipped);
  };
  const pretty = prettyMath(value);

  if (!canSubmit && !canSuggest) {
    return (
      <p className={`${card} text-center text-lg font-bold`}>
        Tiebreak: wait for your captain to submit, or for the timer to run out.
      </p>
    );
  }

  if (submitted && canSubmit) {
    return <p className="animate-pop-in rounded-2xl bg-palm-700 p-3 text-center text-lg font-black text-white">Answer submitted. Wait for the reveal.</p>;
  }

  return (
    <div className="space-y-3">
      {canSubmit && suggestions.length > 0 && (
        <div className={card}>
          <h3 className="text-sm font-black text-ocean-800">Teammates suggest</h3>
          <ul className="flex flex-wrap gap-2 pt-1">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button type="button" onClick={() => set(s)} className={btn("sand", "min-h-11 text-lg")}>{s}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {options ? (
        <div role="group" aria-label="Answer choices" className="grid gap-2">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={value === o}
              onClick={() => set(o)}
              className={`min-h-14 border-4 border-void px-4 text-lg font-bold shadow-[4px_4px_0_#000] ${value === o ? "translate-x-0.5 translate-y-0.5 bg-ocean-300 text-void shadow-[2px_2px_0_#000]" : "bg-white text-void"}`}
            >
              {o}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <label htmlFor="answer" className={label}>Your answer</label>
          <input
            ref={inputRef}
            id="answer"
            value={value}
            // Plain numbers get the numeric pad; the keypad below supplies ^ ( ) and friends.
            // Expressions need letters, so they use the normal keyboard.
            inputMode={kind === "expression" ? "text" : "decimal"}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={MAX_ANSWER_LENGTH}
            onChange={(e) => onType(e.target.value, e.target.selectionStart)}
            onSelect={remember}
            onKeyUp={remember}
            onClick={remember}
            onBlur={remember}
            className={bigField}
          />
          {value !== "" && pretty !== value && (
            <p data-testid="answer-preview" aria-live="off" className="text-lg font-bold text-sand-50">
              You typed: <span>{pretty}</span>
            </p>
          )}
          <div role="group" aria-label="Maths keypad" className="flex flex-wrap gap-2">
            {keys.map((k) => (
              <button
                key={k.aria}
                type="button"
                aria-label={k.aria}
                // Keep focus (and the soft keyboard) in the input while tapping.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertAtCaret(k.insert)}
                className={btn("sand", "min-h-11 min-w-12 text-xl normal-case")}
              >
                {k.show}
              </button>
            ))}
            <button
              type="button"
              aria-label="Delete character before cursor"
              onMouseDown={(e) => e.preventDefault()}
              onClick={backspace}
              className={btn("sand", "min-h-11 min-w-12 text-xl")}
            >
              ⌫
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        disabled={empty || busy}
        onClick={() => onSend(value.trim())}
        className={btn("sunset", "min-h-14 w-full text-xl")}
      >
        {verb}
      </button>
      {!canSubmit && <p className="text-sm font-semibold">Only the captain submits. Your suggestion goes to the captain.</p>}
    </div>
  );
}
