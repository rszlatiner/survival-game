"use client";

import type { PublicGameState, PublicTeam } from "@/lib/engine/public";
import type { GameStatus } from "@/lib/client/useGameState";
import { HAZARD_THRESHOLD_PER_TEAM, ZONES } from "@/lib/config";
import { RESOURCES, type ZoneId } from "@/lib/questions/types";
import { Scoreboard } from "@/components/team/Scoreboard";
import { RESOURCE_ICON, RESOURCE_LABEL } from "@/components/team/labels";
import { useCountdown } from "./useCountdown";

const ZONE_ORDER = Object.keys(ZONES) as ZoneId[];

const raftStage = (t: PublicTeam) =>
  t.builds.includes("raft3") ? 3 : t.builds.includes("raft2") ? 2 : t.builds.includes("raft1") ? 1 : 0;

/** Read-only classroom display. Answers appear only in the reveal and finished phases. */
export function ProjectorView({ state, status }: { state: PublicGameState | null; status: GameStatus }) {
  const remaining = useCountdown(state);
  const banner =
    status === "offline" ? (
      <div role="status" className="bg-orange-400 p-3 text-center text-2xl font-bold text-black">
        Reconnecting... the display may be out of date.
      </div>
    ) : null;

  if (!state) {
    return (
      <div className="min-h-screen bg-black text-white">
        {banner}
        <p className="p-16 text-center text-5xl">Loading the island...</p>
      </div>
    );
  }

  const { phase, round } = state;
  const revealed = phase === "reveal" || phase === "finished";
  const results = revealed ? round?.results ?? null : null;
  const live = phase === "question" || phase === "tiebreak";
  const winner = state.teams.find((t) => t.id === state.winnerId);
  const threshold = HAZARD_THRESHOLD_PER_TEAM * state.teams.length;
  const fundTotal = RESOURCES.reduce((n, r) => n + state.fund[r], 0);
  const fundPct = threshold > 0 ? Math.min(100, Math.round((fundTotal / threshold) * 100)) : 0;
  const answered = round ? Object.values(round.submissions).filter((s) => s.submitted).length : 0;
  const asked = round ? Object.keys(round.submissions).length : 0;

  if (phase === "lobby") {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        {banner}
        <main className="mx-auto max-w-6xl space-y-8 text-center">
          <h1 className="text-5xl font-bold">Desert Island Maths</h1>
          <p className="text-3xl">Join at this address with the code</p>
          <p aria-label="Join code" data-testid="join-code" className="font-mono text-9xl font-extrabold tracking-widest text-amber-300">
            {state.code}
          </p>
          <section aria-label="Teams so far">
            <h2 className="mb-4 text-3xl font-bold">Teams ({state.teams.length})</h2>
            {state.teams.length === 0 ? (
              <p className="text-3xl">Waiting for the first team...</p>
            ) : (
              <ul className="flex flex-wrap justify-center gap-4">
                {state.teams.map((t) => (
                  <li key={t.id} className="rounded-2xl bg-sky-800 px-8 py-4 text-4xl font-bold">
                    {t.name}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6 text-white">
      {banner}
      <main className="mx-auto max-w-[1800px] space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-900 p-4">
          <h1 className="text-4xl font-bold">
            {phase === "finished"
              ? "Game over"
              : phase === "tiebreak"
                ? "Tiebreak question"
                : `Round ${round?.n ?? state.roundsPlayed} of ${state.totalRounds}`}
          </h1>
          {live && (
            <p aria-label={`${remaining} seconds left`} data-testid="timer" className="font-mono text-7xl font-extrabold text-amber-300">
              {remaining}s
            </p>
          )}
          <p className="text-3xl">Code: <span className="font-mono font-bold">{state.code}</span></p>
        </header>

        {phase === "finished" && (
          <section aria-label="Winner" className="dim-reveal-pop rounded-2xl bg-emerald-800 p-8 text-center">
            <p data-testid="winner" className="text-7xl font-extrabold">{winner ? `Winner: ${winner.name}` : "No winner"}</p>
          </section>
        )}

        {round && phase !== "finished" && (
          <section aria-label="Island event" className="flex flex-wrap items-center gap-6 rounded-2xl bg-slate-900 p-4 text-3xl">
            <span data-testid="roll" className="rounded-xl bg-white px-6 py-2 text-5xl font-extrabold text-black">Roll {round.roll}</span>
            {round.bonusResource && (
              <span className="rounded-xl bg-emerald-700 px-4 py-2 font-bold">
                Bonus: {RESOURCE_ICON[round.bonusResource]} {RESOURCE_LABEL[round.bonusResource]}
              </span>
            )}
            {round.raider && <span className="rounded-xl bg-red-700 px-4 py-2 font-bold">Raiders on the island!</span>}
            {round.hazard && <span className="rounded-xl bg-orange-600 px-4 py-2 font-bold">Hazard this round!</span>}
            {live && <span>{answered} of {asked} teams have answered</span>}
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-label="Island map" className="grid grid-cols-2 gap-3 rounded-2xl bg-sky-950 p-4 md:grid-cols-3">
            {ZONE_ORDER.map((z) => {
              const here = state.teams.filter((t) => t.zone === z);
              return (
                <div key={z} data-testid={`zone-${z}`} className="min-h-32 rounded-xl border-4 border-amber-200 bg-emerald-900 p-3">
                  <h2 className="text-3xl font-bold">{ZONES[z].name}</h2>
                  <ul className="text-2xl">
                    {here.map((t) => (
                      <li key={t.id}>{t.name}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>

          <div className="space-y-6">
            <div className="text-3xl"><Scoreboard teams={state.teams} myId="" winnerId={state.winnerId} /></div>
            <section aria-label="Raft progress" className="rounded-2xl bg-slate-900 p-4 text-3xl">
              <h2 className="mb-2 text-3xl font-bold">Rafts</h2>
              <ul className="space-y-1">
                {state.teams.map((t) => (
                  <li key={t.id} className="flex justify-between">
                    <span>{t.name}</span>
                    <span>Raft {raftStage(t)} of 3</span>
                  </li>
                ))}
              </ul>
            </section>
            <section aria-label="Hazard fund" className="rounded-2xl bg-slate-900 p-4 text-3xl">
              <h2 className="mb-2 font-bold">Island fund</h2>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={threshold}
                aria-valuenow={Math.min(fundTotal, threshold)}
                aria-label="Island fund progress"
                className="h-8 w-full overflow-hidden rounded-full bg-slate-700"
              >
                <div className="h-full bg-amber-400" style={{ width: `${fundPct}%` }} />
              </div>
              <p className="mt-1">{fundTotal} of {threshold} needed</p>
            </section>
          </div>
        </div>

        <section aria-label="Team stock" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {state.teams.map((t) => (
            <div key={t.id} className="rounded-2xl bg-slate-900 p-4 text-3xl">
              <h3 className="font-bold">{t.name}</h3>
              <p>
                {RESOURCES.map((r) => (
                  <span key={r} className="mr-3" aria-label={`${RESOURCE_LABEL[r]} ${t.stock[r]}`}>
                    <span aria-hidden="true">{RESOURCE_ICON[r]}</span> {t.stock[r]}
                  </span>
                ))}
              </p>
            </div>
          ))}
        </section>

        {results && (
          <section aria-label="Reveal" className="dim-reveal-pop space-y-3 rounded-2xl bg-slate-900 p-6">
            <h2 className="text-4xl font-bold">Answers</h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {state.teams
                .filter((t) => results[t.id])
                .map((t) => {
                  const r = results[t.id];
                  return (
                    <li key={t.id} className={`rounded-xl p-4 text-3xl ${r.correct ? "bg-emerald-700" : "bg-orange-700"}`}>
                      <strong>{t.name}</strong>: {r.correct ? "Correct" : "Not quite"}
                      <div>Answer: <strong>{r.expected}</strong></div>
                    </li>
                  );
                })}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
