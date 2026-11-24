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

  useEffect(() => {
    if (state) skew.current = state.serverNow - Date.now();
  }, [state?.serverNow]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [live]);

  const roundN = round?.n;
  useEffect(() => {
    setSuggestions([]);
    if (!live || !isCaptain) return;
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
  }, [live, isCaptain, roundN, fetchSuggestions]);

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
      <div role="status" className="sticky top-0 z-40 bg-orange-500 p-2 text-center font-bold text-black">
        Reconnecting... your screen may be out of date.
      </div>
    ) : null;

  const shell = (body: React.ReactNode) => (
    <div className="min-h-screen bg-slate-950 text-white">
      {banner}
      <main className="mx-auto max-w-md space-y-4 p-3 pb-24">{body}</main>
      <Toast message={error} onClose={() => setError(null)} />
    </div>
  );

  if (!state) return shell(<p className="p-6 text-center text-lg">Loading the island...</p>);
  if (!team) return shell(<p className="p-6 text-center text-lg">Your team is not in this game any more. Ask your teacher.</p>);

  const header = (
    <header className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{team.name}</h1>
        {isCaptain && <span className="rounded-full bg-amber-400 px-3 py-1 text-sm font-bold text-black">Captain</span>}
      </div>
      {state.phase !== "lobby" && (
        <section aria-label="Your zone" className="rounded-xl bg-slate-800 p-3">
          <h2 className="text-lg font-bold">{ZONES[team.zone].name}</h2>
          <p data-testid="story" className="text-base">{ZONE_STORY[team.zone]}</p>
        </section>
      )}
      <StockBar stock={team.stock} />
    </header>
  );

  if (state.phase === "lobby") {
    return shell(
      <>
        {header}
        <p className="rounded-xl bg-slate-800 p-4 text-center text-lg">Waiting for your teacher to start the game. {team.deviceCount} device(s) on your team.</p>
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
        <section aria-label="Game over" className="space-y-2 rounded-xl bg-emerald-900 p-4 text-center">
          <h2 className="text-2xl font-bold">Game over</h2>
          <p data-testid="winner" className="text-xl">{winner ? `Winner: ${winner.name}` : "No winner"}</p>
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
        <section aria-label="Problem" className="space-y-3 rounded-xl bg-slate-900 p-3">
          <div className="flex justify-between text-sm font-bold">
            <span>{state.phase === "tiebreak" ? "Tiebreak" : `Round ${round?.n ?? ""} of ${state.totalRounds}`}</span>
            <span aria-label={`${remaining} seconds left`}>{remaining}s</span>
          </div>
          {q ? (
            <>
              <p className="whitespace-pre-wrap text-xl">{q.prompt}</p>
              <AnswerPanel
                question={q}
                canSubmit={canSubmit}
                submitted={submitted}
                suggestions={suggestions}
                busy={busy}
                onSend={(answer) => void act({ type: canSubmit ? "submit" : "suggest", answer })}
              />
              {submitted && !canSubmit && <p className="text-sm">Your captain has submitted.</p>}
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
