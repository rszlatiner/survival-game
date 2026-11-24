"use client";

import { useState } from "react";
import { createGame } from "@/lib/client/api";
import { ROUNDS } from "@/lib/config";
import { TIMER_MAX_SECONDS, TIMER_MIN_SECONDS } from "@/lib/api/parse";
import type { GameLength } from "@/lib/types";
import { hostErrorText } from "./labels";

export interface UnitReadiness {
  unit: number;
  ready: boolean;
  count: number;
}

const UNITS = Array.from({ length: 15 }, (_, i) => i + 1);
const PASSWORD_MAX = 200;
/** Rough pace: the timer plus about two minutes for reveal, spending and discussion. */
const OVERHEAD_SECONDS = 120;

export function CreateGame({ readiness }: { readiness: UnitReadiness[] }) {
  const [password, setPassword] = useState("");
  const [units, setUnits] = useState<number[]>([1]);
  const [length, setLength] = useState<GameLength>("standard");
  const [timer, setTimer] = useState("90");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  const info = (u: number) => readiness.find((r) => r.unit === u);
  const notReady = units.filter((u) => !(info(u)?.ready ?? false)).sort((a, b) => a - b);
  const timerNum = /^\d+$/.test(timer) ? Number(timer) : NaN;
  const minutes = (len: GameLength) =>
    Math.round((ROUNDS[len] * ((Number.isFinite(timerNum) ? timerNum : 90) + OVERHEAD_SECONDS)) / 60);

  const toggle = (u: number) => {
    setConfirming(false);
    setUnits((cur) => (cur.includes(u) ? cur.filter((x) => x !== u) : [...cur, u].sort((a, b) => a - b)));
  };

  const validate = (): string | null => {
    if (password.length === 0) return "Enter the teacher password.";
    if (password.length > PASSWORD_MAX) return `The password is too long (at most ${PASSWORD_MAX} characters).`;
    if (units.length === 0) return "Pick at least one unit.";
    if (!Number.isInteger(timerNum) || timerNum < TIMER_MIN_SECONDS || timerNum > TIMER_MAX_SECONDS) {
      return `The timer must be a whole number from ${TIMER_MIN_SECONDS} to ${TIMER_MAX_SECONDS} seconds.`;
    }
    return null;
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await createGame({ password, units, length, timerSeconds: timerNum });
      setCode(r.code);
    } catch (e) {
      const c = e && typeof e === "object" && "code" in e ? (e as { code: unknown }).code : "";
      setError(c === "UNAUTHORIZED" ? "That teacher password was not accepted." : hostErrorText(e));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      setConfirming(false);
      return;
    }
    setError(null);
    if (notReady.length > 0 && !confirming) {
      setConfirming(true);
      return;
    }
    void create();
  };

  if (code) {
    return (
      <main className="mx-auto min-h-screen max-w-2xl space-y-6 bg-slate-950 p-6 text-center text-white">
        <h1 className="text-3xl font-bold">Game created</h1>
        <p className="text-lg">Students join with this code:</p>
        <p data-testid="join-code" aria-label="Join code" className="font-mono text-8xl font-extrabold tracking-widest text-amber-300">
          {code}
        </p>
        <div className="flex flex-col gap-3">
          <a href={`/host/${code}`} className="rounded-xl bg-sky-600 px-4 py-3 text-xl font-bold">Open the host screen</a>
          <a href={`/projector/${code}`} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-700 px-4 py-3 text-xl font-bold">
            Open the projector view (new tab)
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-slate-950 p-4 text-white">
      <h1 className="mb-4 text-3xl font-bold">New game</h1>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="pw" className="block font-bold">Teacher password</label>
          <input
            id="pw"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg bg-white p-3 text-black"
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="font-bold">Units</legend>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setConfirming(false); setUnits(UNITS); }} className="rounded-lg bg-slate-700 px-3 py-2">
              All
            </button>
            <button type="button" onClick={() => { setConfirming(false); setUnits([]); }} className="rounded-lg bg-slate-700 px-3 py-2">
              None
            </button>
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {UNITS.map((u) => {
              const r = info(u);
              const ready = r?.ready ?? false;
              return (
                <li key={u} className="flex items-center justify-between rounded-lg bg-slate-800 p-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={units.includes(u)} onChange={() => toggle(u)} className="h-5 w-5" />
                    <span>Unit {u}</span>
                  </label>
                  <span
                    data-testid={`ready-${u}`}
                    className={`rounded-full px-2 py-0.5 text-sm font-bold ${ready ? "bg-emerald-700" : "bg-orange-600"}`}
                  >
                    {ready ? "Ready" : "Not ready"}{r ? ` (${r.count})` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="font-bold">Game length</legend>
          {(["quick", "standard"] as GameLength[]).map((len) => (
            <label key={len} className="flex items-center gap-2">
              <input type="radio" name="length" checked={length === len} onChange={() => setLength(len)} className="h-5 w-5" />
              <span>
                {len === "quick" ? "Quick" : "Standard"}: {ROUNDS[len]} rounds, about {minutes(len)} minutes
              </span>
            </label>
          ))}
        </fieldset>

        <div>
          <label htmlFor="timer" className="block font-bold">
            Seconds per question ({TIMER_MIN_SECONDS} to {TIMER_MAX_SECONDS})
          </label>
          <input
            id="timer"
            inputMode="numeric"
            value={timer}
            onChange={(e) => setTimer(e.target.value)}
            className="mt-1 w-32 rounded-lg bg-white p-3 text-black"
          />
        </div>

        {notReady.length > 0 && (
          <p role="status" data-testid="not-ready-warning" className="rounded-lg bg-orange-700 p-3 font-semibold">
            Warning: {notReady.length === 1 ? `unit ${notReady[0]} does` : `units ${notReady.join(", ")} do`} not have enough
            questions yet. Teams may see repeated questions.
          </p>
        )}

        {error && <p role="alert" className="rounded-lg bg-red-800 p-3 font-semibold">{error}</p>}

        {confirming ? (
          <div className="space-y-2 rounded-lg bg-slate-800 p-3">
            <p className="font-bold">Create the game even though some selected units are not ready?</p>
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="rounded-lg bg-orange-600 px-4 py-3 font-bold">
                Yes, create anyway
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="rounded-lg bg-slate-600 px-4 py-3 font-bold">
                Go back
              </button>
            </div>
          </div>
        ) : (
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-sky-600 px-4 py-4 text-xl font-bold disabled:opacity-50">
            Create game
          </button>
        )}
      </form>
    </main>
  );
}
