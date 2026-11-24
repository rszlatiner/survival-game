"use client";

import { useState } from "react";
import { fetchState, joinGame } from "@/lib/client/api";
import type { PublicGameState } from "@/lib/engine/public";
import { MAX_TEAMS } from "@/lib/config";
import { Toast } from "./Toast";
import { errorText } from "./labels";

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

  const input = "min-h-14 w-full rounded-xl border-2 border-slate-400 bg-white px-3 text-2xl text-black";
  const big = "min-h-14 w-full rounded-xl bg-amber-400 text-xl font-bold text-black disabled:opacity-40";
  return (
    <main className="mx-auto min-h-screen max-w-md space-y-4 bg-slate-950 p-4 text-white">
      <h1 className="text-3xl font-bold">Desert Island Maths</h1>
      {!game ? (
        <form onSubmit={(e) => { e.preventDefault(); void find(); }} className="space-y-3">
          <label htmlFor="code" className="block font-bold">Game code</label>
          <input
            id="code"
            value={codeText}
            onChange={(e) => setCodeText(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={6}
            className={`${input} tracking-widest`}
          />
          <button type="submit" disabled={busy || code.length === 0} className={big}>Find game</button>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-lg">Game <strong>{game.code}</strong></p>
          {game.teams.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-bold">Join a team</h2>
              {game.teams.map((t) => (
                <button key={t.id} type="button" disabled={busy} aria-label={`Join ${t.name}`} onClick={() => void join({ teamId: t.id })} className="min-h-14 w-full rounded-xl bg-sky-600 px-3 text-left text-lg font-bold">
                  {t.name} <span className="text-sm font-normal">({t.deviceCount} device{t.deviceCount === 1 ? "" : "s"})</span>
                </button>
              ))}
            </div>
          )}
          {game.phase === "lobby" && game.teams.length < MAX_TEAMS && (
            <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) void join({ teamName: name.trim() }); }} className="space-y-2">
              <label htmlFor="team-name" className="block font-bold">New team name</label>
              <input id="team-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className={input} />
              <button type="submit" disabled={busy || name.trim() === ""} className={big}>Create team</button>
            </form>
          )}
          <button type="button" onClick={() => setGame(null)} className="min-h-12 underline">Different code</button>
        </div>
      )}
      <Toast message={error} onClose={() => setError(null)} />
    </main>
  );
}
