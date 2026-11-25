"use client";

import { useEffect, useRef, useState } from "react";
import type { TeamAction } from "@/lib/api/parse";
import type { PublicGameState } from "@/lib/engine/public";
import type { GameStatus } from "@/lib/client/useGameState";
import { ZONES } from "@/lib/config";
import { AnswerPanel } from "./AnswerPanel";
import { RevealView } from "./Reveal";
import { Scoreboard, rankTeams } from "./Scoreboard";
import { BuildPanel, FundPanel, MarketPanel } from "./SpendPanel";
import { StockBar } from "./Stock";
import { Toast } from "./Toast";
import { ZONE_STORY, errorText } from "./labels";
import { CrownIcon, TimerIcon, TrophyIcon, ZONE_COLOR, ZoneScene } from "@/components/art";
import { IslandBackdrop } from "@/components/ui/Backdrop";
import { panel } from "@/components/ui/styles";

interface Props {
  state: PublicGameState | null;
  status: GameStatus;
  teamId: string;
  deviceIndex: number | undefined;
  send: (a: TeamAction) => Promise<unknown>;
  fetchSuggestions: () => Promise<{ suggestions: { answer: string }[] }>;
}

const SUGGESTION_POLL_MS = 3000;

export function TeamScreen({ state, status, teamId, deviceIndex, send, fetchSuggestions }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const skew = useRef(0);

  const team = state?.teams.find((t) => t.id === teamId);
  const isCaptain = !!team && deviceIndex !== undefined && deviceIndex === team.captainIndex;
  const phase = state?.phase;
  const round = state?.round ?? null;
  const live = phase === "question" || phase === "tiebreak";
  // The server only accepts suggestions in the question phase.
  const suggestPhase = phase === "question";

  useEffect(() => {
    if (state) skew.current = state.serverNow - Date.now();
  }, [state?.serverNow]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!live) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [live]);

  const roundN = round?.n;
  useEffect(() => {
    setSuggestions([]);
    if (!suggestPhase || !isCaptain) return;
    let off = false;
    const poll = () =>
      fetchSuggestions()
        .then((r) => !off && setSuggestions(r.suggestions.map((s) => s.answer)))
        .catch(() => {});
    void poll();
    const id = setInterval(poll, SUGGESTION_POLL_MS);
    return () => {
      off = true;
      clearInterval(id);
    };
  }, [suggestPhase, isCaptain, roundN, fetchSuggestions]);

  const act = async (a: TeamAction) => {
    setBusy(true);
    setError(null);
    try {
      await send(a);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const banner =
    status === "offline" ? (
      <div role="status" className="sticky top-0 z-40 border-b-4 border-night-900 bg-sunset-400 p-2 text-center font-black text-night-900">
        Reconnecting... your screen may be out of date.
      </div>
    ) : null;

  const shell = (body: React.ReactNode) => (
    <div className="relative isolate min-h-screen text-white">
      <IslandBackdrop />
      {banner}
      <main className="mx-auto max-w-md space-y-4 p-3 pb-24">{body}</main>
      <Toast message={error} onClose={() => setError(null)} />
    </div>
  );

  if (!state) return shell(<p className={`${panel} mt-6 text-center text-lg font-bold`}>Loading the island...</p>);
  if (!team) return shell(<p className={`${panel} mt-6 text-center text-lg font-bold`}>Your team is not in this game any more. Ask your teacher.</p>);
  const zc = ZONE_COLOR[team.zone];

  const header = (
    <header className="space-y-3">
      <div className={`flag flex items-center justify-between gap-2 rounded-l-3xl border-4 border-void py-3 pl-4 pr-10 shadow-[6px_6px_0_#000] ${zc.bg} ${zc.text}`}>
        <h1 className="text-2xl font-black">{team.name}</h1>
        {isCaptain && (
          <span className="inline-flex items-center gap-1 border-4 border-void bg-sunset-400 px-3 py-1 text-sm font-black text-night-900">
            <CrownIcon size={18} />
            Captain
          </span>
        )}
      </div>
      {state.phase !== "lobby" && (
        <section aria-label="Your zone" className="overflow-hidden border-4 border-white bg-sand-50 text-void shadow-[6px_6px_0_#000]">
          <div className="h-24 border-b-4 border-void sm:h-32">
            <ZoneScene zone={team.zone} />
          </div>
          <div className="space-y-1 p-3">
            <h2 className={`inline-block px-3 py-0.5 text-lg font-black ${zc.bg} ${zc.text}`}>{ZONES[team.zone].name}</h2>
            <p data-testid="story" className="text-base">{ZONE_STORY[team.zone]}</p>
          </div>
        </section>
      )}
      <StockBar stock={team.stock} />
    </header>
  );

  if (state.phase === "lobby") {
    return shell(
      <>
        {header}
        <p className={`${panel} text-center text-lg font-semibold`}>Waiting for your teacher to start the game. {team.deviceCount} device(s) on your team.</p>
        <Scoreboard teams={state.teams} myId={teamId} winnerId={null} />
      </>,
    );
  }

  if (state.phase === "finished") {
    const ranked = rankTeams(state.teams, state.winnerId);
    const rank = ranked.findIndex((t) => t.id === teamId) + 1;
    const winner = state.teams.find((t) => t.id === state.winnerId);
    return shell(
      <>
        {header}
        <section aria-label="Game over" className="animate-pop-in space-y-2 rounded-3xl border-4 border-sunset-400 bg-night-800 p-4 text-center text-white">
          <TrophyIcon size={72} className="mx-auto animate-bob" />
          <h2 className="text-2xl font-black">Game over</h2>
          <p data-testid="winner" className="text-xl font-bold text-sunset-300">{winner ? `Winner: ${winner.name}` : "No winner"}</p>
          <p data-testid="own-rank" className="text-lg">Your team finished {rank} of {ranked.length}</p>
        </section>
        <Scoreboard teams={state.teams} myId={teamId} winnerId={state.winnerId} />
      </>,
    );
  }

  const q = round?.questions[teamId];
  const submitted = round?.submissions[teamId]?.submitted === true;
  const remaining = round ? Math.max(0, Math.ceil((round.endsAt - (now + skew.current)) / 1000)) : 0;
  const canSubmit = isCaptain || (live && round !== null && remaining === 0);

  if (live) {
    return shell(
      <>
        {header}
        <section aria-label="Problem" className={`${panel} space-y-3`}>
          <div className="flex items-center justify-between gap-2 text-sm font-black">
            <span className="bg-ocean-700 px-3 py-1 text-white">{state.phase === "tiebreak" ? "Tiebreak" : `Round ${round?.n ?? ""} of ${state.totalRounds}`}</span>
            <span className={`inline-flex items-center gap-1 border-2 px-3 py-1 text-lg ${remaining <= 10 ? "border-coral-700 bg-coral-600 text-white" : "border-void bg-white text-void"}`}>
              <TimerIcon size={22} />
              <span aria-label={`${remaining} seconds left`}>{remaining}s</span>
            </span>
          </div>
          {q ? (
            <>
              <p className="whitespace-pre-wrap border-4 border-void bg-white p-3 text-xl font-semibold text-void">{q.prompt}</p>
              <AnswerPanel
                question={q}
                canSubmit={canSubmit}
                submitted={submitted}
                suggestions={suggestions}
                resetKey={round?.n}
                canSuggest={suggestPhase}
                busy={busy}
                onSend={(answer) => void act({ type: canSubmit ? "submit" : "suggest", answer })}
              />
              {submitted && !canSubmit && <p className="text-sm font-bold">Your captain has submitted.</p>}
            </>
          ) : (
            <p className="text-lg">Sit tight. Your team has no question in this round.</p>
          )}
        </section>
        <Scoreboard teams={state.teams} myId={teamId} winnerId={null} />
      </>,
    );
  }

  // reveal: worked solution, then the spend phase
  return shell(
    <>
      {header}
      <RevealView result={round?.results?.[teamId]} />
      <BuildPanel team={team} busy={busy} act={act} />
      <MarketPanel team={team} bonus={round?.bonusResource ?? null} busy={busy} act={act} />
      <FundPanel team={team} fund={state.fund} hazard={round?.hazard === true} busy={busy} act={act} />
      <Scoreboard teams={state.teams} myId={teamId} winnerId={null} />
    </>,
  );
}
