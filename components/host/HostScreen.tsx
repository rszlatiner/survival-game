"use client";

import { useState } from "react";
import type { HostAction } from "@/lib/api/parse";
import type { PublicGameState, PublicTeam } from "@/lib/engine/public";
import type { GameStatus } from "@/lib/client/useGameState";
import { MAX_OVERRIDE, ZONES } from "@/lib/config";
import { RESOURCES, type Resource } from "@/lib/questions/types";
import { Toast } from "@/components/team/Toast";
import { RESOURCE_LABEL } from "@/components/team/labels";
import { HostSignIn } from "./HostSignIn";
import { hostErrorText, isAuthLost } from "./labels";
import { useCountdown } from "./useCountdown";

interface Props {
  state: PublicGameState | null;
  status: GameStatus;
  send: (a: HostAction) => Promise<unknown>;
  login: (code: string, password: string) => Promise<unknown>;
}

const btn = "min-h-11 rounded-lg px-4 py-2 font-bold disabled:opacity-40";

function parseCount(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  const n = Number(raw);
  return n >= 0 && n <= MAX_OVERRIDE ? n : null;
}

export function HostScreen({ state, status, send, login }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [authLost, setAuthLost] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [extendBy, setExtendBy] = useState("30");
  const remaining = useCountdown(state);

  const act = async (a: HostAction): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await send(a);
      return true;
    } catch (e) {
      if (isAuthLost(e)) setAuthLost(true);
      else setError(hostErrorText(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const banner =
    status === "offline" ? (
      <div role="status" className="sticky top-0 z-40 bg-orange-500 p-2 text-center font-bold text-black">
        Reconnecting... the screen may be out of date.
      </div>
    ) : null;

  const shell = (body: React.ReactNode) => (
    <div className="min-h-screen bg-slate-950 text-white">
      {banner}
      <main className="mx-auto max-w-4xl space-y-4 p-4 pb-24">{body}</main>
      <Toast message={error} onClose={() => setError(null)} />
    </div>
  );

  if (!state) return shell(<p className="p-6 text-center text-lg">Loading the game...</p>);

  const { phase, round } = state;
  const tied = state.tiedIds.length > 0;
  const live = phase === "question" || phase === "tiebreak";
  const canNext = phase === "reveal" && !busy;
  const nextLabel = tied
    ? "Start tiebreak"
    : state.roundsPlayed >= state.totalRounds
      ? "Finish game"
      : "Next round";
  const canReveal = live && !busy;
  const revealLabel = phase === "tiebreak" ? "Reveal tiebreak result" : "Reveal answers";

  const authPrompt = authLost ? (
    <section role="alert" className="space-y-2 rounded-xl bg-red-900 p-4">
      <p className="font-bold">Your host session has expired. Sign in again with the teacher password.</p>
      <HostSignIn code={state.code} login={login} onSignedIn={() => setAuthLost(false)} />
    </section>
  ) : null;

  return shell(
    <>
      {authPrompt}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Host screen</h1>
          <p>
            Join code <span data-testid="join-code" className="font-mono text-3xl font-extrabold tracking-widest text-amber-300">{state.code}</span>
          </p>
        </div>
        <div className="text-right">
          <p data-testid="phase" className="text-lg font-bold capitalize">{phase}{round && phase !== "lobby" ? `, round ${round.n} of ${state.totalRounds}` : ""}</p>
          {live && <p aria-label={`${remaining} seconds left`} className="font-mono text-3xl">{remaining}s</p>}
          <a href={`/projector/${state.code}`} target="_blank" rel="noreferrer" className="text-sky-300 underline">
            Open projector view
          </a>
        </div>
      </header>

      {phase === "finished" ? (
        <section className="rounded-xl bg-emerald-900 p-4 text-xl font-bold">
          Game over: {state.teams.find((t) => t.id === state.winnerId)?.name ?? "no winner"}
        </section>
      ) : (
        <section aria-label="Game controls" className="space-y-3 rounded-xl bg-slate-900 p-3">
          <div className="flex flex-wrap gap-2">
            {phase === "lobby" && (
              <button type="button" disabled={busy || state.teams.length === 0} onClick={() => void act({ type: "start" })} className={`${btn} bg-emerald-600`}>
                Start game
              </button>
            )}
            <button type="button" disabled={!canNext} onClick={() => void act({ type: "next" })} className={`${btn} bg-sky-600`}>
              {nextLabel}
            </button>
            <button type="button" disabled={!canReveal} onClick={() => void act({ type: "reveal" })} className={`${btn} bg-amber-500 text-black`}>
              {revealLabel}
            </button>
            <button type="button" disabled={!live || busy} onClick={() => void act({ type: "skip" })} className={`${btn} bg-slate-600`}>
              Skip question
            </button>
          </div>

          {live && (
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const n = Number(extendBy);
                if (!/^\d+$/.test(extendBy.trim()) || n < 1 || n > 600) {
                  setError("Extra time must be a whole number from 1 to 600 seconds.");
                  return;
                }
                void act({ type: "extend", seconds: n });
              }}
            >
              <label className="block">
                <span className="block text-sm font-bold">Extra seconds</span>
                <input value={extendBy} onChange={(e) => setExtendBy(e.target.value)} inputMode="numeric" className="w-24 rounded-lg bg-white p-2 text-black" />
              </label>
              <button type="submit" disabled={busy} className={`${btn} bg-slate-600`}>Extend timer</button>
            </form>
          )}

          {phase === "tiebreak" && (
            <p className="rounded-lg bg-amber-900 p-2 text-sm">
              Tiebreak in progress. Press Reveal to decide it. Ending the game decides it too.
            </p>
          )}

          {confirmEnd ? (
            <div role="group" aria-label="Confirm end game" className="space-y-2 rounded-lg bg-red-950 p-3">
              <p className="font-bold">
                {phase === "tiebreak"
                  ? "End the game now? This decides the tiebreak with the answers so far."
                  : phase === "reveal" && tied
                    ? "End the game now? Teams are tied, so this starts the tiebreak question. Ending again during the tiebreak decides it."
                    : "End the game now? Scores will be final."}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void act({ type: "end" }).then(() => setConfirmEnd(false))}
                  className={`${btn} bg-red-600`}
                >
                  Yes, end the game
                </button>
                <button type="button" onClick={() => setConfirmEnd(false)} className={`${btn} bg-slate-600`}>
                  Keep playing
                </button>
              </div>
            </div>
          ) : (
            <button type="button" disabled={busy} onClick={() => setConfirmEnd(true)} className={`${btn} bg-red-700`}>
              End game
            </button>
          )}
        </section>
      )}

      {live && round && <QuestionPreview state={state} />}
      {phase === "reveal" && round?.results && <RevealSummary state={state} />}

      <TeamList state={state} act={act} />
      {phase !== "finished" && state.teams.length > 0 && <OverrideForm teams={state.teams} act={act} />}
    </>,
  );
}

function QuestionPreview({ state }: { state: PublicGameState }) {
  const round = state.round!;
  const first = state.teams.map((t) => round.questions[t.id]).find(Boolean);
  const submitted = state.teams.filter((t) => round.submissions[t.id]?.submitted).length;
  return (
    <section aria-label="Current question" className="space-y-2 rounded-xl bg-slate-900 p-3">
      <h2 className="font-bold">Current question (numbers differ by team)</h2>
      <p className="whitespace-pre-wrap">{first?.prompt ?? "No question this round."}</p>
      <p className="text-sm">{submitted} of {Object.keys(round.submissions).length} teams have submitted.</p>
    </section>
  );
}

function RevealSummary({ state }: { state: PublicGameState }) {
  const results = state.round!.results!;
  return (
    <section aria-label="Round results" className="space-y-1 rounded-xl bg-slate-900 p-3">
      <h2 className="font-bold">Round results</h2>
      <ul>
        {state.teams.filter((t) => results[t.id]).map((t) => (
          <li key={t.id}>
            {t.name}: {results[t.id].correct ? "correct" : "not correct"} (answer {results[t.id].expected})
          </li>
        ))}
      </ul>
    </section>
  );
}

function TeamList({ state, act }: { state: PublicGameState; act: (a: HostAction) => Promise<boolean> }) {
  return (
    <section aria-label="Teams" className="space-y-2">
      <h2 className="text-xl font-bold">Teams ({state.teams.length})</h2>
      {state.teams.length === 0 && <p>No teams yet. Students join with the code.</p>}
      <ul className="space-y-2">
        {state.teams.map((t) => (
          <TeamRow key={t.id} team={t} lobby={state.phase === "lobby"} finished={state.phase === "finished"} act={act} />
        ))}
      </ul>
    </section>
  );
}

function TeamRow({ team, lobby, finished, act }: { team: PublicTeam; lobby: boolean; finished: boolean; act: (a: HostAction) => Promise<boolean> }) {
  const [name, setName] = useState(team.name);
  const [cap, setCap] = useState(String(team.captainIndex));
  const [confirmRemove, setConfirmRemove] = useState(false);
  return (
    <li className="space-y-2 rounded-xl bg-slate-900 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-lg font-bold">{team.name}</span>
        <span className="text-sm">{ZONES[team.zone].name} - {team.deviceCount} device(s) - {team.sp} SP</span>
      </div>
      {lobby && (
        <div className="flex flex-wrap items-end gap-2">
          <input aria-label={`New name for ${team.name}`} value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg bg-white p-2 text-black" />
          <button type="button" disabled={name.trim() === "" || name === team.name} onClick={() => void act({ type: "rename", teamId: team.id, name: name.trim() })} className={`${btn} bg-slate-600`}>
            Rename
          </button>
          {confirmRemove ? (
            <>
              <button type="button" onClick={() => void act({ type: "remove", teamId: team.id })} className={`${btn} bg-red-600`}>
                Yes, remove {team.name}
              </button>
              <button type="button" onClick={() => setConfirmRemove(false)} className={`${btn} bg-slate-600`}>Cancel</button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmRemove(true)} className={`${btn} bg-red-700`}>
              Remove {team.name}
            </button>
          )}
        </div>
      )}
      {!finished && team.deviceCount > 0 && (
        <div className="flex items-end gap-2">
          <label className="text-sm">
            <span className="block font-bold">Captain device</span>
            <select aria-label={`Captain device for ${team.name}`} value={cap} onChange={(e) => setCap(e.target.value)} className="rounded-lg bg-white p-2 text-black">
              {Array.from({ length: team.deviceCount }, (_, i) => (
                <option key={i} value={i}>Device {i + 1}{i === team.captainIndex ? " (captain)" : ""}</option>
              ))}
            </select>
          </label>
          <button type="button" disabled={Number(cap) === team.captainIndex} onClick={() => void act({ type: "setCaptain", teamId: team.id, deviceIndex: Number(cap) })} className={`${btn} bg-slate-600`}>
            Set captain for {team.name}
          </button>
        </div>
      )}
    </li>
  );
}

function OverrideForm({ teams, act }: { teams: PublicTeam[]; act: (a: HostAction) => Promise<boolean> }) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [vals, setVals] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const fields: { key: Resource | "sp"; label: string }[] = [
    ...RESOURCES.map((r) => ({ key: r, label: RESOURCE_LABEL[r] })),
    { key: "sp", label: "Survival points" },
  ];
  const selected = teams.some((t) => t.id === teamId) ? teamId : (teams[0]?.id ?? "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const stock: Partial<Record<Resource, number>> = {};
    let sp: number | undefined;
    for (const f of fields) {
      const raw = (vals[f.key] ?? "").trim();
      if (raw === "") continue;
      const n = parseCount(raw);
      if (n === null) {
        setErr(`${f.label}: enter a whole number from 0 to ${MAX_OVERRIDE}.`);
        return;
      }
      if (f.key === "sp") sp = n;
      else stock[f.key] = n;
    }
    if (Object.keys(stock).length === 0 && sp === undefined) {
      setErr("Fill in at least one value.");
      return;
    }
    setErr(null);
    const action: HostAction = { type: "override", teamId: selected };
    if (Object.keys(stock).length > 0) action.stock = stock;
    if (sp !== undefined) action.sp = sp;
    void act(action).then((ok) => ok && setVals({}));
  };

  return (
    <form aria-label="Manual override" onSubmit={submit} noValidate className="space-y-2 rounded-xl bg-slate-900 p-3">
      <h2 className="font-bold">Manual override</h2>
      <p className="text-sm">Set a team's resources or points by hand. Leave a box empty to keep its value.</p>
      <label className="block">
        <span className="block text-sm font-bold">Team</span>
        <select aria-label="Override team" value={selected} onChange={(e) => setTeamId(e.target.value)} className="rounded-lg bg-white p-2 text-black">
          {teams.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {fields.map((f) => (
          <label key={f.key} className="block text-sm">
            <span className="block font-bold">{f.label}</span>
            <input
              aria-label={`Override ${f.label}`}
              inputMode="numeric"
              value={vals[f.key] ?? ""}
              onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
              className="w-full rounded-lg bg-white p-2 text-black"
            />
          </label>
        ))}
      </div>
      {err && <p role="alert" className="rounded-lg bg-red-800 p-2 font-semibold">{err}</p>}
      <button type="submit" className={`${btn} bg-amber-500 text-black`}>Apply override</button>
    </form>
  );
}
