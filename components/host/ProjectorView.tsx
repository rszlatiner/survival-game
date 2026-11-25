"use client";

import type { PublicGameState, PublicTeam } from "@/lib/engine/public";
import type { GameStatus } from "@/lib/client/useGameState";
import { HAZARD_THRESHOLD_PER_TEAM, ZONES } from "@/lib/config";
import { RESOURCES, type ZoneId } from "@/lib/questions/types";
import { Scoreboard } from "@/components/team/Scoreboard";
import { RESOURCE_LABEL } from "@/components/team/labels";
import {
  IslandMap,
  Palm,
  RaftIcon,
  RaiderIcon,
  ResourceIcon,
  StarIcon,
  StormIcon,
  TimerIcon,
  TrophyIcon,
  ZONE_ANCHOR,
  ZONE_COLOR,
} from "@/components/art";
import { NightBackdrop } from "@/components/ui/Backdrop";
import { Confetti } from "@/components/ui/Confetti";
import { Wordmark } from "@/components/ui/Wordmark";
import { nightPanel } from "@/components/ui/styles";
import { useCountdown } from "./useCountdown";

const ZONE_ORDER = Object.keys(ZONES) as ZoneId[];

const raftStage = (t: PublicTeam) =>
  t.builds.includes("raft3") ? 3 : t.builds.includes("raft2") ? 2 : t.builds.includes("raft1") ? 1 : 0;

/** Read-only classroom display. Answers appear only in the reveal and finished phases. */
export function ProjectorView({ state, status }: { state: PublicGameState | null; status: GameStatus }) {
  const remaining = useCountdown(state);
  const banner =
    status === "offline" ? (
      <div role="status" className="relative z-10 rounded-2xl bg-sunset-400 p-3 text-center text-3xl font-black text-night-900">
        Reconnecting... the display may be out of date.
      </div>
    ) : null;

  if (!state) {
    return (
      <div className="relative isolate min-h-screen text-white">
        <NightBackdrop />
        {banner}
        <p className="p-16 text-center text-5xl font-black">Loading the island...</p>
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
      <div className="relative isolate min-h-screen p-8 text-white">
        <NightBackdrop />
        {banner}
        <main className="mx-auto max-w-6xl space-y-8 text-center">
          <div className="flex justify-center">
            <h1 className="sr-only">Desert Island Maths</h1>
            <Wordmark as="p" size="xl" />
          </div>
          <div className="mx-auto max-w-4xl space-y-4">
            <p className="text-4xl font-bold">Join at this address with the code</p>
            <p aria-label="Join code" data-testid="join-code" className="wood-sign rounded-3xl px-8 py-6 font-mono text-9xl font-black tracking-[0.2em] text-sunset-300">
              {state.code}
            </p>
          </div>
          <section aria-label="Teams so far" className={nightPanel}>
            <h2 className="mb-4 text-4xl font-black">Teams ({state.teams.length})</h2>
            {state.teams.length === 0 ? (
              <p className="text-3xl">Waiting for the first team...</p>
            ) : (
              <ul className="flex flex-wrap justify-center gap-5">
                {state.teams.map((t) => (
                  <li key={t.id} className="animate-pop-in flex items-stretch">
                    <span aria-hidden="true" className="w-3 border-2 border-void bg-bark-500" />
                    <span className={`flag border-y-4 border-void py-4 pl-6 pr-14 text-4xl font-black ${ZONE_COLOR[t.zone].bg} ${ZONE_COLOR[t.zone].text}`}>{t.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>
    );
  }

  const tile = "border-4 border-void px-5 py-2 font-black inline-flex items-center gap-3 shadow-[4px_4px_0_#000]";

  return (
    <div className="relative isolate min-h-screen p-6 text-white">
      <NightBackdrop />
      {phase === "finished" && <Confetti />}
      {banner}
      <main className="relative mx-auto max-w-[1800px] space-y-6">
        <header className={`${nightPanel} flex flex-wrap items-center justify-between gap-4 py-3`}>
          <h1 className="text-5xl font-black">
            {phase === "finished"
              ? "Game over"
              : phase === "tiebreak"
                ? "Tiebreak question"
                : `Round ${round?.n ?? state.roundsPlayed} of ${state.totalRounds}`}
          </h1>
          {live && (
            <div className={`flex items-center gap-3 rounded-3xl border-4 px-5 py-1 ${remaining <= 10 ? "border-white bg-coral-600" : "border-sunset-400 bg-night-900"}`}>
              <TimerIcon size={64} />
              <p aria-label={`${remaining} seconds left`} data-testid="timer" className={`font-mono text-7xl font-black ${remaining <= 10 ? "text-white" : "text-sunset-300"}`}>
                {remaining}s
              </p>
            </div>
          )}
          <p className="text-4xl font-bold">Code: <span className="font-mono font-black tracking-widest text-sunset-300">{state.code}</span></p>
        </header>

        {phase === "finished" && (
          <section aria-label="Winner" className="dim-reveal-pop relative flex flex-wrap items-center justify-center gap-6 rounded-3xl border-8 border-sunset-400 bg-palm-700 p-8 text-center">
            <TrophyIcon size={140} className="animate-bob" />
            <p data-testid="winner" className="text-7xl font-black">{winner ? `Winner: ${winner.name}` : "No winner"}</p>
            <TrophyIcon size={140} className="animate-bob" />
          </section>
        )}

        {round && phase !== "finished" && (
          <section aria-label="Island event" className={`${nightPanel} flex flex-wrap items-center gap-5 py-3 text-3xl`}>
            <span data-testid="roll" className="rounded-2xl border-4 border-night-900 bg-white px-6 py-2 text-5xl font-black text-night-900 shadow-[6px_6px_0_#000]">Roll {round.roll}</span>
            {round.bonusResource && (
              <span className={`${tile} bg-palm-700`}>
                <ResourceIcon resource={round.bonusResource} size={44} />
                Bonus: {RESOURCE_LABEL[round.bonusResource]}
              </span>
            )}
            {round.raider && (
              <span className={`${tile} bg-coral-700`}>
                <RaiderIcon size={48} />
                Raiders on the island!
              </span>
            )}
            {round.hazard && (
              <span className={`${tile} bg-sunset-400 text-night-900`}>
                <StormIcon size={48} />
                Hazard this round!
              </span>
            )}
            {live && <span className="font-bold">{answered} of {asked} teams have answered</span>}
            {/* The fund lives up here so it is visible without scrolling, however many teams there are. */}
            <div data-testid="hazard-fund" className="ml-auto flex min-w-[420px] flex-1 basis-[420px] items-center gap-3">
              <StormIcon size={48} className={round.hazard ? "shrink-0 animate-bob" : "shrink-0"} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3 text-2xl font-black">
                  <span>Island fund</span>
                  <span className="font-bold">{fundTotal} of {threshold} needed</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={threshold}
                  aria-valuenow={Math.min(fundTotal, threshold)}
                  aria-label="Island fund progress"
                  className="seg-bar mt-1 h-8 w-full"
                  style={{ ["--seg" as string]: `${100 / Math.max(1, threshold)}%` }}
                >
                  <div className="seg-fill bg-sunset-400" style={{ width: `${fundPct}%` }} />
                </div>
              </div>
            </div>
          </section>
        )}

        {results && (
          <section aria-label="Reveal" className={`${nightPanel} dim-reveal-pop space-y-3 p-6`}>
            <h2 className="text-4xl font-black">Answers</h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {state.teams
                .filter((t) => results[t.id])
                .map((t) => {
                  const r = results[t.id];
                  return (
                    <li key={t.id} className={`flex items-center gap-4 rounded-2xl p-4 text-3xl ${r.correct ? "celebrate bg-palm-700" : "gentle-wobble bg-coral-600"}`}>
                      {r.correct ? <StarIcon size={56} /> : <span aria-hidden="true" className="w-14 shrink-0" />}
                      <div>
                        <strong>{t.name}</strong>: {r.correct ? "Correct" : "Not quite"}
                        <div>Answer: <strong>{r.expected}</strong></div>
                      </div>
                    </li>
                  );
                })}
            </ul>
          </section>
        )}

        <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
          <div className="space-y-6">
            <section aria-label="Island map" className="relative aspect-[400/260] w-full overflow-hidden border-8 border-void shadow-[8px_8px_0_#000] outline-4 outline-ocean-300">
              <IslandMap className="absolute inset-0" />
              {ZONE_ORDER.map((z) => {
                const here = state.teams.filter((t) => t.zone === z);
                const c = ZONE_COLOR[z];
                return (
                  <div
                    key={z}
                    data-testid={`zone-${z}`}
                    style={ZONE_ANCHOR[z]}
                    className={`absolute max-w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-4 border-white px-4 py-2 text-center shadow-[6px_6px_0_#000] ${c.bg} ${c.text}`}
                  >
                    <h2 className="text-4xl font-black uppercase tracking-wide">{ZONES[z].name}</h2>
                    <ul className="text-3xl font-bold leading-tight">
                      {here.map((t) => (
                        <li key={t.id} className="break-words">{t.name}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </section>
            <section aria-label="Team stock" className="grid gap-3 md:grid-cols-2">
              {state.teams.map((t) => (
                <div key={t.id} className={`${nightPanel} border-l-[16px] p-4 text-3xl`} style={{ borderLeftColor: ZONE_COLOR[t.zone].hex }}>
                  <h3 className="break-words font-black">{t.name}</h3>
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {RESOURCES.map((r) => (
                      <span key={r} className="inline-flex items-center gap-1 font-bold" aria-label={`${RESOURCE_LABEL[r]} ${t.stock[r]}`}>
                        <ResourceIcon resource={r} size={36} /> {t.stock[r]}
                      </span>
                    ))}
                  </p>
                </div>
              ))}
            </section>
          </div>

          <div className="space-y-6">
            <div className="text-3xl"><Scoreboard teams={state.teams} myId="" winnerId={state.winnerId} variant="projector" /></div>
            <section aria-label="Raft progress" className={`${nightPanel} text-3xl`}>
              <h2 className="mb-3 text-3xl font-black">Rafts</h2>
              <ul className="space-y-3">
                {state.teams.map((t) => {
                  const stage = raftStage(t);
                  return (
                    <li key={t.id} className="space-y-1">
                      <div className="flex justify-between gap-3 font-bold">
                        <span className="min-w-0 break-words">{t.name}</span>
                        <span className="shrink-0">Raft {stage} of 3</span>
                      </div>
                      <div aria-hidden="true" className="flex items-center gap-3">
                        <div className="relative flex-1 pt-[54px]">
                          <div className="seg-bar h-10" style={{ ["--seg" as string]: "33.333%" }}>
                            <div className="seg-fill bg-ocean-300" style={{ width: `${(stage / 3) * 100}%` }} />
                          </div>
                          <span className="absolute top-0 transition-[left] duration-700" style={{ left: `calc(${stage / 3} * (100% - 80px))` }}>
                            {stage === 0 ? <RaftIcon stage={1} size={80} className="opacity-60" /> : <RaftIcon stage={stage as 1 | 2 | 3} size={80} className="animate-bob" />}
                          </span>
                        </div>
                        <Palm size={56} className="shrink-0 self-end" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </div>



      </main>
    </div>
  );
}
