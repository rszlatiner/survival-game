"use client";

import { useState } from "react";
import { fetchState, joinGame } from "@/lib/client/api";
import type { PublicGameState } from "@/lib/engine/public";
import { MAX_TEAMS } from "@/lib/config";
import { Toast } from "./Toast";
import { errorText } from "./labels";
import { TreasureMapBorder, ZONE_COLOR } from "@/components/art";
import { IslandBackdrop } from "@/components/ui/Backdrop";
import { Wordmark } from "@/components/ui/Wordmark";
import { PressStart } from "@/components/ui/PressStart";
import { bigField, btn } from "@/components/ui/styles";

export function JoinScreen({ initialCode = "", onJoined }: { initialCode?: string; onJoined: (code: string) => void }) {
  const [codeText, setCodeText] = useState(initialCode.toUpperCase());
  const [game, setGame] = useState<PublicGameState | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const code = codeText.trim().toUpperCase();

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const find = () => run(async () => setGame(await fetchState(code)));
  const join = (who: { teamId: string } | { teamName: string }) =>
    run(async () => {
      await joinGame(code, who);
      onJoined(code);
    });

  const input = bigField;
  const big = btn("sunset", "min-h-14 w-full text-xl");
  return (
    <main className="relative isolate mx-auto min-h-screen max-w-md space-y-5 p-4 pt-6">
      <IslandBackdrop />
      <div className="rounded-3xl border-4 border-sunset-400 bg-night-800 shadow-[6px_6px_0_#000] p-4 shadow-[6px_6px_0_#000]">
        <Wordmark />
      </div>
      <TreasureMapBorder>
      {!game ? (
        <form onSubmit={(e) => { e.preventDefault(); void find(); }} className="space-y-3">
          <label htmlFor="code" className="block text-lg font-extrabold text-night-900">Game code</label>
          <input
            id="code"
            value={codeText}
            onChange={(e) => setCodeText(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={6}
            className={`${input} text-center font-black uppercase tracking-[0.3em]`}
          />
          <PressStart type="submit" label="Find game" disabled={busy || code.length === 0} />
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-lg">Game <strong className="font-black tracking-widest">{game.code}</strong></p>
          {game.teams.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-black">Join a team</h2>
              {game.teams.map((t) => (
                <button key={t.id} type="button" disabled={busy} aria-label={`Join ${t.name}`} onClick={() => void join({ teamId: t.id })} className={`flag min-h-14 w-full border-4 border-void px-4 pr-10 text-left text-lg font-black disabled:opacity-50 ${ZONE_COLOR[t.zone].bg} ${ZONE_COLOR[t.zone].text}`}>
                  {t.name} <span className="text-sm font-semibold">({t.deviceCount} device{t.deviceCount === 1 ? "" : "s"})</span>
                </button>
              ))}
            </div>
          )}
          {game.phase === "lobby" && game.teams.length < MAX_TEAMS && (
            <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) void join({ teamName: name.trim() }); }} className="space-y-2">
              <label htmlFor="team-name" className="block text-lg font-extrabold text-night-900">New team name</label>
              <input id="team-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className={input} />
              <button type="submit" disabled={busy || name.trim() === ""} className={big}>Create team</button>
            </form>
          )}
          <button type="button" onClick={() => setGame(null)} className="min-h-12 font-bold uppercase text-ocean-800 underline">Different code</button>
        </div>
      )}
      </TreasureMapBorder>
      <Toast message={error} onClose={() => setError(null)} />
    </main>
  );
}
