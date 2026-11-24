"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicGameState } from "@/lib/engine/public";
import { fetchState } from "./api";
import { defaultChannelFactory, type ChannelFactory } from "./realtime";

export type GameStatus = "live" | "polling" | "offline";

export const SAFETY_FETCH_MS = 5000;
export const SILENCE_MS = 5000;
export const POLL_MS = 2000;
export const OFFLINE_AFTER_FAILURES = 3;

/**
 * Public game state for `code`. Realtime pings are only a trigger to re-fetch;
 * all fetches (ping, safety, polling) share one single-flight guard.
 */
export function useGameState(
  code: string,
  options?: { createChannel?: ChannelFactory },
): { state: PublicGameState | null; status: GameStatus } {
  const [state, setState] = useState<PublicGameState | null>(null);
  const [status, setStatus] = useState<GameStatus>("polling");
  const factoryRef = useRef(options?.createChannel);
  factoryRef.current = options?.createChannel;

  useEffect(() => {
    let disposed = false;
    let shown = -Infinity;
    let inFlight: AbortController | null = null;
    let queued = false;
    let failures = 0;
    let offlineFlag = false;
    let channelLive = false;
    let tick: ReturnType<typeof setInterval> | null = null;
    let tickMs = 0;
    let silence: ReturnType<typeof setTimeout> | null = null;
    let reported: GameStatus | null = null;

    setState(null);

    const report = () => {
      if (disposed) return;
      const s: GameStatus = offlineFlag ? "offline" : channelLive ? "live" : "polling";
      if (s !== reported) {
        reported = s;
        setStatus(s);
      }
    };

    const schedule = () => {
      const ms = channelLive && !offlineFlag ? SAFETY_FETCH_MS : POLL_MS;
      if (tick && tickMs === ms) return;
      if (tick) clearInterval(tick);
      tickMs = ms;
      tick = setInterval(() => void load(), ms);
    };

    const refresh = () => {
      report();
      schedule();
    };

    const load = async () => {
      if (disposed) return;
      if (inFlight) {
        queued = true; // at most one in flight plus one queued
        return;
      }
      const ctrl = new AbortController();
      inFlight = ctrl;
      try {
        const next = await fetchState(code, ctrl.signal);
        if (disposed) return;
        failures = 0;
        offlineFlag = false;
        if (next.version >= shown) {
          shown = next.version;
          setState(next);
        }
      } catch {
        if (disposed) return;
        failures++;
        const navOffline = typeof navigator !== "undefined" && navigator.onLine === false;
        if (navOffline || failures >= OFFLINE_AFTER_FAILURES) offlineFlag = true;
      } finally {
        if (inFlight === ctrl) inFlight = null;
      }
      if (disposed) return;
      refresh();
      if (queued) {
        queued = false;
        void load();
      }
    };

    const armSilence = () => {
      if (silence) clearTimeout(silence);
      silence = setTimeout(() => {
        channelLive = false;
        refresh();
      }, SILENCE_MS);
    };

    const heard = () => {
      channelLive = true;
      armSilence();
      refresh();
    };

    const factory = factoryRef.current ?? defaultChannelFactory;
    let handle: ReturnType<ChannelFactory> = null;
    try {
      handle = factory(code, {
        onPing: () => {
          if (disposed) return;
          heard();
          void load();
        },
        onStatus: (s) => {
          if (disposed) return;
          if (s === "SUBSCRIBED") {
            heard();
            void load();
          } else {
            channelLive = false;
            if (silence) clearTimeout(silence);
            silence = null;
            refresh();
          }
        },
      });
    } catch {
      handle = null;
    }

    const onOffline = () => {
      offlineFlag = true;
      refresh();
    };
    const onOnline = () => void load();
    if (typeof window !== "undefined") {
      window.addEventListener("offline", onOffline);
      window.addEventListener("online", onOnline);
    }

    report();
    schedule();
    void load();

    return () => {
      disposed = true;
      if (tick) clearInterval(tick);
      if (silence) clearTimeout(silence);
      inFlight?.abort();
      try {
        handle?.close();
      } catch {
        // ignore
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("offline", onOffline);
        window.removeEventListener("online", onOnline);
      }
    };
  }, [code]);

  return { state, status };
}
