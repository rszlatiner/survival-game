"use client";

import { useEffect, useState } from "react";
import { MAX_ANSWER_LENGTH } from "@/lib/config";
import type { PublicQuestion } from "@/lib/questions/types";
import { bigField, btn, card, label } from "@/components/ui/styles";

const ALLOWED: Record<string, RegExp> = {
  integer: /[^0-9\-]/g,
  decimal: /[^0-9.,\-]/g,
  fraction: /[^0-9/\-]/g,
  percent: /[^0-9/.,%\-]/g,
};
const SYMBOLS: Record<string, string[]> = {
  integer: ["-"],
  decimal: ["-", "."],
  fraction: ["-", "/"],
  percent: ["/", "%", "."],
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
  useEffect(() => setValue(""), [question.prompt, resetKey]);
  const kind = question.format.kind;
  const options = question.format.kind === "choice" ? (question.options ?? question.format.options) : null;
  const verb = canSubmit ? "Submit" : "Suggest";
  const set = (v: string) => setValue(v.slice(0, MAX_ANSWER_LENGTH));
  const empty = value.trim() === "";

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
            id="answer"
            value={value}
            inputMode="decimal"
            autoComplete="off"
            maxLength={MAX_ANSWER_LENGTH}
            onChange={(e) => set(e.target.value.replace(ALLOWED[kind] ?? ALLOWED.decimal, ""))}
            className={bigField}
          />
          <div className="flex gap-2">
            {(SYMBOLS[kind] ?? []).map((s) => (
              <button key={s} type="button" aria-label={`Insert ${s}`} onClick={() => set(value + s)} className={btn("sand", "min-w-12 text-xl")}>{s}</button>
            ))}
            <button type="button" aria-label="Delete last character" onClick={() => set(value.slice(0, -1))} className={btn("sand", "min-w-12 text-xl")}>⌫</button>
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
