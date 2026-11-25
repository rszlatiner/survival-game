"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientApiError, getSuggestions, joinGame, postTeam } from "@/lib/client/api";
import { clearSession, loadSession, type Session } from "@/lib/client/storage";
import { useGameState } from "@/lib/client/useGameState";
import { JoinScreen } from "./JoinScreen";
import { TeamScreen } from "./TeamScreen";

type Auth = { kind: "checking" } | { kind: "none" } | { kind: "team"; session: Session & { teamId: string } };

/** Resolves the stored session (re-joining to refresh token and captain index), then shows the team or join screen. */
export function TeamPlay({ code: rawCode }: { code: string }) {
  const code = rawCode.toUpperCase();
  const router = useRouter();
  const [auth, setAuth] = useState<Auth>({ kind: "checking" });
  const [attempt, setAttempt] = useState(0);
  const { state, status, applyState } = useGameState(code);

  useEffect(() => {
    let off = false;
    const stored = loadSession(code);
    if (!stored || stored.role !== "team" || !stored.teamId) {
      setAuth({ kind: "none" });
      return;
    }
    const teamId = stored.teamId;
    joinGame(code, { teamId })
      .then(() => {
        const s = loadSession(code);
        if (!off && s && s.teamId) setAuth({ kind: "team", session: { ...s, teamId: s.teamId } });
      })
      .catch((e: unknown) => {
        if (off) return;
        if (e instanceof ClientApiError && (e.status === 401 || e.status === 403 || e.status === 404)) {
          clearSession(code);
          setAuth({ kind: "none" });
        } else {
          setAuth({ kind: "team", session: { ...stored, teamId } }); // offline: keep going with what we have
        }
      });
    return () => {
      off = true;
    };
  }, [code, attempt]);

  const send = useCallback(
    async (a: Parameters<typeof postTeam>[1]) => {
      const next = await postTeam(code, a);
      if (next && typeof next === "object" && "version" in next) applyState(next);
      return next;
    },
    [code, applyState],
  );
  const fetchSuggestions = useCallback(() => getSuggestions(code), [code]);

  if (auth.kind === "checking") return <p className="p-6 text-lg font-bold text-white">Loading...</p>;
  if (auth.kind === "none") {
    return (
      <JoinScreen
        initialCode={code}
        onJoined={() => {
          setAuth({ kind: "checking" });
          setAttempt((n) => n + 1);
          router.refresh?.();
        }}
      />
    );
  }
  return (
    <TeamScreen
      state={state}
      status={status}
      teamId={auth.session.teamId}
      deviceIndex={auth.session.deviceIndex}
      send={send}
      fetchSuggestions={fetchSuggestions}
    />
  );
}
