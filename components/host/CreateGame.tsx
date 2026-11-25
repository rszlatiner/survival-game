"use client";

import { useEffect, useState } from "react";
import { createGame } from "@/lib/client/api";
import { clearSession, listSessions, type StoredHostSession } from "@/lib/client/storage";
import { ROUNDS } from "@/lib/config";
import { TIMER_MAX_SECONDS, TIMER_MIN_SECONDS } from "@/lib/api/parse";
import type { GameLength } from "@/lib/types";
import { hostErrorText } from "./labels";
import { Palm, TimerIcon, TreasureMapBorder } from "@/components/art";
import { IslandBackdrop } from "@/components/ui/Backdrop";
import { Wordmark } from "@/components/ui/Wordmark";
import { PressStart } from "@/components/ui/PressStart";
import { btn, field, panel } from "@/components/ui/styles";

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
  const [saved, setSaved] = useState<StoredHostSession[]>([]);

  // Read after mount: localStorage does not exist during server rendering.
  useEffect(() => setSaved(listSessions()), []);

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
      setPassword("");
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
      <main className="relative isolate mx-auto min-h-screen max-w-2xl space-y-6 p-6 text-center">
        <IslandBackdrop />
        <div className={`${panel} animate-pop-in space-y-4`}>
          <h1 className="text-3xl font-black">Game created</h1>
          <p className="text-lg">Students join with this code:</p>
          <p data-testid="join-code" aria-label="Join code" className="wood-sign rounded-2xl px-4 py-3 font-mono text-7xl font-black tracking-widest text-sunset-300 sm:text-8xl">
            {code}
          </p>
          <div className="flex flex-col gap-3">
            <a href={`/host/${code}`} className={btn("ocean", "px-4 py-3 text-xl")}>Open the host screen</a>
            <a href={`/projector/${code}`} target="_blank" rel="noreferrer" className={btn("night", "px-4 py-3 text-xl")}>
              Open the projector view (new tab)
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative isolate mx-auto min-h-screen max-w-2xl space-y-5 p-4">
      <IslandBackdrop />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border-4 border-sunset-400 bg-night-800 shadow-[6px_6px_0_#000] p-4 text-white">
        <Wordmark as="p" />
        <h1 className="bg-sunset-400 px-4 py-1 text-2xl font-black text-night-900">New game</h1>
      </div>
      {saved.length > 0 && (
        <section aria-label="Resume your game" className={`${panel} space-y-2`}>
          <h2 className="font-black">Resume your game</h2>
          <ul className="space-y-2">
            {saved.map((s) => (
              <li key={s.code} className="flex items-center justify-between gap-2">
                <a href={`/host/${s.code}`} className={btn("ocean", "font-mono text-xl tracking-widest")}>
                  {s.code}
                </a>
                <button
                  type="button"
                  aria-label={`Remove ${s.code} from this list`}
                  onClick={() => {
                    clearSession(s.code);
                    setSaved(listSessions());
                  }}
                  className={btn("sand")}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <TreasureMapBorder className="space-y-4">
      <p className="text-sm font-semibold">Always open the game from the same web address so your login is remembered.</p>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="pw" className="block font-black">Teacher password</label>
          <input
            id="pw"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${field} mt-1`}
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="font-black">Units</legend>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setConfirming(false); setUnits(UNITS); }} className={btn("sand")}>
              All
            </button>
            <button type="button" onClick={() => { setConfirming(false); setUnits([]); }} className={btn("sand")}>
              None
            </button>
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {UNITS.map((u) => {
              const r = info(u);
              const ready = r?.ready ?? false;
              return (
                <li key={u} className="flex min-h-12 items-center justify-between rounded-2xl border-2 border-sand-300 bg-white p-2 has-checked:border-ocean-700 has-checked:bg-ocean-100">
                  <label className="flex items-center gap-2 font-bold">
                    <input type="checkbox" checked={units.includes(u)} onChange={() => toggle(u)} className="h-6 w-6 accent-ocean-700" />
                    <Palm size={26} className={units.includes(u) ? "" : "opacity-40 grayscale"} />
                    <span>Unit {u}</span>
                  </label>
                  <span
                    data-testid={`ready-${u}`}
                    className={`px-2 py-0.5 text-sm font-bold text-white ${ready ? "bg-palm-700" : "bg-coral-600"}`}
                  >
                    {ready ? "Ready" : "Not ready"}{r ? ` (${r.count})` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="font-black">Game length</legend>
          {(["quick", "standard"] as GameLength[]).map((len) => (
            <label key={len} className="flex min-h-12 items-center gap-2 rounded-2xl border-2 border-sand-300 bg-white p-2 has-checked:border-ocean-700 has-checked:bg-ocean-100">
              <input type="radio" name="length" checked={length === len} onChange={() => setLength(len)} className="h-6 w-6 accent-ocean-700" />
              <span>
                {len === "quick" ? "Quick" : "Standard"}: {ROUNDS[len]} rounds, about {minutes(len)} minutes
              </span>
            </label>
          ))}
        </fieldset>

        <div>
          <label htmlFor="timer" className="flex items-center gap-2 font-black">
            <TimerIcon size={24} />
            Seconds per question ({TIMER_MIN_SECONDS} to {TIMER_MAX_SECONDS})
          </label>
          <input
            id="timer"
            inputMode="numeric"
            value={timer}
            onChange={(e) => setTimer(e.target.value)}
            className={`${field} mt-1 w-32`}
          />
        </div>

        {notReady.length > 0 && (
          <p role="status" data-testid="not-ready-warning" className="rounded-2xl bg-coral-600 p-3 font-semibold text-white">
            Warning: {notReady.length === 1 ? `unit ${notReady[0]} does` : `units ${notReady.join(", ")} do`} not have enough
            questions yet. Teams may see repeated questions.
          </p>
        )}

        {error && <p role="alert" className="rounded-2xl bg-coral-700 p-3 font-semibold text-white">{error}</p>}

        {confirming ? (
          <div className="space-y-2 border-4 border-coral-600 bg-white p-3">
            <p className="font-bold">Create the game even though some selected units are not ready?</p>
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className={btn("coral")}>
                Yes, create anyway
              </button>
              <button type="button" onClick={() => setConfirming(false)} className={btn("sand")}>
                Go back
              </button>
            </div>
          </div>
        ) : (
          <>
          <PressStart />
          <button type="submit" disabled={busy} className={btn("sunset", "min-h-14 w-full text-xl")}>
            Create game
          </button>
          </>
        )}
      </form>
      </TreasureMapBorder>
    </main>
  );
}
