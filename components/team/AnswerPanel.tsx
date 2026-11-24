"use client";

import { useEffect, useState } from "react";
import { MAX_ANSWER_LENGTH } from "@/lib/config";
import type { PublicQuestion } from "@/lib/questions/types";

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
      <p className="rounded-xl bg-slate-800 p-3 text-center text-lg text-white">
        Tiebreak: wait for your captain to submit, or for the timer to run out.
      </p>
    );
  }

  if (submitted && canSubmit) {
    return <p className="rounded-xl bg-emerald-900 p-3 text-center text-lg font-bold text-white">Answer submitted. Wait for the reveal.</p>;
  }

  return (
    <div className="space-y-3">
      {canSubmit && suggestions.length > 0 && (
        <div className="rounded-xl bg-slate-800 p-3 text-white">
          <h3 className="text-sm font-bold">Teammates suggest</h3>
          <ul className="flex flex-wrap gap-2 pt-1">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button type="button" onClick={() => set(s)} className="min-h-11 rounded-lg bg-slate-600 px-3 text-lg">{s}</button>
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
              className={`min-h-14 rounded-xl px-4 text-lg font-semibold ${value === o ? "bg-sky-500 text-black" : "bg-slate-700 text-white"}`}
            >
              {o}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <label htmlFor="answer" className="block text-sm font-bold text-white">Your answer</label>
          <input
            id="answer"
            value={value}
            inputMode="decimal"
            autoComplete="off"
            maxLength={MAX_ANSWER_LENGTH}
            onChange={(e) => set(e.target.value.replace(ALLOWED[kind] ?? ALLOWED.decimal, ""))}
            className="min-h-14 w-full rounded-xl border-2 border-slate-400 bg-white px-3 text-2xl text-black"
          />
          <div className="flex gap-2">
            {(SYMBOLS[kind] ?? []).map((s) => (
              <button key={s} type="button" aria-label={`Insert ${s}`} onClick={() => set(value + s)} className="min-h-12 min-w-12 rounded-lg bg-slate-700 text-xl text-white">{s}</button>
            ))}
            <button type="button" aria-label="Delete last character" onClick={() => set(value.slice(0, -1))} className="min-h-12 min-w-12 rounded-lg bg-slate-700 text-xl text-white">⌫</button>
          </div>
        </div>
      )}
      <button
        type="button"
        disabled={empty || busy}
        onClick={() => onSend(value.trim())}
        className="min-h-14 w-full rounded-xl bg-amber-400 text-xl font-bold text-black disabled:opacity-40"
      >
        {verb}
      </button>
      {!canSubmit && <p className="text-sm text-slate-200">Only the captain submits. Your suggestion goes to the captain.</p>}
    </div>
  );
}
