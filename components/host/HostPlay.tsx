"use client";

import { useCallback, useEffect, useState } from "react";
import { hostLogin, postHost } from "@/lib/client/api";
import type { HostAction } from "@/lib/api/parse";
import { loadSession } from "@/lib/client/storage";
import { useGameState } from "@/lib/client/useGameState";
import { HostScreen } from "./HostScreen";
import { HostSignIn } from "./HostSignIn";
import { IslandBackdrop } from "@/components/ui/Backdrop";
import { btn, panel } from "@/components/ui/styles";

/** Loads the stored host session (it survives reloads), then shows the host controls. */
export function HostPlay({ code: rawCode }: { code: string }) {
  const code = rawCode.toUpperCase();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const { state, status, applyState } = useGameState(code);

  useEffect(() => {
    const s = loadSession(code);
    setSignedIn(!!s && s.role === "host");
  }, [code]);

  const send = useCallback(
    async (a: HostAction) => {
      const next = await postHost(code, a);
      if (next && typeof next === "object" && "version" in next) applyState(next);
      return next;
    },
    [code, applyState],
  );

  if (signedIn === null) return <p className="p-6 text-lg font-bold text-white">Loading...</p>;
  if (!signedIn) {
    return (
      <main className="relative isolate mx-auto min-h-screen max-w-md p-6">
        <IslandBackdrop />
        <div className={`${panel} space-y-4`}>
        <h1 className="text-2xl font-black">Sign in again</h1>
        <p>This browser is not signed in as the host of game {code}. Enter the teacher password to take control.</p>
        <HostSignIn code={code} login={hostLogin} onSignedIn={() => setSignedIn(!!loadSession(code))} />
        <a href={`/projector/${code}`} className={btn("night")}>Projector view</a>
        </div>
      </main>
    );
  }
  return <HostScreen state={state} status={status} send={send} login={hostLogin} />;
}
