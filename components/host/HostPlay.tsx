"use client";

import { useCallback, useEffect, useState } from "react";
import { postHost } from "@/lib/client/api";
import type { HostAction } from "@/lib/api/parse";
import { loadSession } from "@/lib/client/storage";
import { useGameState } from "@/lib/client/useGameState";
import { HostScreen } from "./HostScreen";

/** Loads the stored host session (it survives reloads), then shows the host controls. */
export function HostPlay({ code: rawCode }: { code: string }) {
  const code = rawCode.toUpperCase();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const { state, status } = useGameState(code);

  useEffect(() => {
    const s = loadSession(code);
    setSignedIn(!!s && s.role === "host");
  }, [code]);

  const send = useCallback((a: HostAction) => postHost(code, a), [code]);

  if (signedIn === null) return <p className="p-6 text-white">Loading...</p>;
  if (!signedIn) {
    return (
      <main className="mx-auto min-h-screen max-w-md space-y-4 bg-slate-950 p-6 text-white">
        <h1 className="text-2xl font-bold">Sign in again</h1>
        <p>This browser has no host session for game {code}. Hosts sign in by creating a game.</p>
        <a href="/host" className="inline-block rounded-lg bg-sky-600 px-4 py-3 font-bold">Create a game</a>
        <a href={`/projector/${code}`} className="ml-3 inline-block rounded-lg bg-slate-700 px-4 py-3 font-bold">Projector view</a>
      </main>
    );
  }
  return <HostScreen state={state} status={status} send={send} />;
}
