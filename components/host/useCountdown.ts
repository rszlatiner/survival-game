"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicGameState } from "@/lib/engine/public";

/** Seconds left in the open question, corrected for the server clock skew. */
export function useCountdown(state: PublicGameState | null): number {
  const [now, setNow] = useState(() => Date.now());
  const skew = useRef(0);
  useEffect(() => {
    if (state) skew.current = state.serverNow - Date.now();
  }, [state?.serverNow]); // eslint-disable-line react-hooks/exhaustive-deps
  const live = state?.phase === "question" || state?.phase === "tiebreak";
  useEffect(() => {
    if (!live) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [live]);
  const round = state?.round;
  if (!live || !round) return 0;
  return Math.max(0, Math.ceil((round.endsAt - (now + skew.current)) / 1000));
}
