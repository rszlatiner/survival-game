/**
 * Load check against a DEPLOYED game: how long until 30 classroom browsers
 * see a teacher action?
 *
 * Usage (never run in tests or CI; it makes real network requests):
 *
 *   LOADCHECK_TEACHER_PASSWORD=... npm run loadcheck -- https://your-app.vercel.app ABC234
 *   LOADCHECK_HOST_TOKEN=...       npm run loadcheck -- https://your-app.vercel.app ABC234 [clients=30] [samples=5] [pollMs=2000]
 *
 * 1. Create a throwaway game on the deployed site, add a team and press Start
 *    game (it opens round 1) so it is in the question phase (the check uses the teacher's
 *    "extend timer by 1 second" action, which only works there).
 * 2. Give the teacher password (or a host token) in an environment variable,
 *    never on the command line. The script signs in with it, keeps the token
 *    in memory and never prints it.
 * 3. N simulated clients (default 30) poll GET /api/games/<code>/state every
 *    pollMs (default 2000, the browsers' POLL_MS). If NEXT_PUBLIC_SUPABASE_URL
 *    and NEXT_PUBLIC_SUPABASE_ANON_KEY are set, each client also subscribes to
 *    the Broadcast channel `game:<code>` and fetches at once on a ping, as the
 *    real browsers do.
 * 4. It sends `samples` host actions (default 5), a few seconds apart, and
 *    for each one times how long every client takes to see the new version.
 *
 * Prints p50, p95 and max delay in ms and exits 1 if p95 > 3000 ms (or if a
 * client never saw a change within 10 s, counted as 10 000 ms). If no client
 * gets a version from the state endpoint in its first round of polls (wrong
 * URL or code, site down), it says so and exits 3 instead, so a broken setup
 * is never mistaken for a slow one.
 */
import { pathToFileURL } from "node:url";

/** The p95 limit, in ms. */
export const P95_LIMIT_MS = 3000;
const SEEN_TIMEOUT_MS = 10_000;
const GAP_MS = 3000;

/** Nearest-rank percentile (p in 0..100) of a copy of `values`; NaN when empty. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((Math.min(100, Math.max(0, p)) / 100) * sorted.length);
  return sorted[Math.max(0, rank - 1)];
}

export interface DelaySummary {
  count: number;
  p50: number;
  p95: number;
  max: number;
  /** True when there is data and p95 <= P95_LIMIT_MS. */
  ok: boolean;
}

export function summarizeDelays(delays: number[]): DelaySummary {
  const p95 = percentile(delays, 95);
  return {
    count: delays.length,
    p50: percentile(delays, 50),
    p95,
    max: delays.length ? Math.max(...delays) : NaN,
    ok: delays.length > 0 && p95 <= P95_LIMIT_MS,
  };
}

/** Exit code when the state endpoint gave no version at all (distinct from 1 = p95 failure, 2 = usage). */
export const UNREACHABLE_EXIT = 3;

/** True once every client has polled at least once and none has ever read a version. */
export function stateUnreachable(clients: { polls: number; version: number }[]): boolean {
  return clients.length > 0 && clients.every((c) => c.polls > 0 && c.version < 0);
}

export function unreachableMessage(stateUrl: string): string {
  return `state endpoint unreachable: check URL/code (no client read a version from ${stateUrl})`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Client {
  /** Highest version seen so far (-1 before any), and when each version was first seen. */
  version: number;
  /** Finished polls, successful or not. */
  polls: number;
  seenAt: Map<number, number>;
  stop(): void;
}

async function fetchVersion(stateUrl: string): Promise<number | null> {
  try {
    const res = await fetch(stateUrl, { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { version?: unknown };
    return typeof body.version === "number" ? body.version : null;
  } catch {
    return null;
  }
}

async function startClient(stateUrl: string, code: string, pollMs: number, offsetMs: number): Promise<Client> {
  const client: Client = { version: -1, polls: 0, seenAt: new Map(), stop: () => {} };
  let stopped = false;
  const load = async () => {
    const v = await fetchVersion(stateUrl);
    client.polls++;
    if (v === null || v <= client.version) return;
    const t = Date.now();
    for (let k = client.version + 1; k <= v; k++) if (!client.seenAt.has(k)) client.seenAt.set(k, t);
    client.version = v;
  };

  let closeChannel = () => {};
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const ch = sb
      .channel(`game:${code}`)
      .on("broadcast", { event: "version" }, () => void load())
      .subscribe();
    closeChannel = () => {
      void sb.removeChannel(ch);
      void sb.realtime.disconnect();
    };
  }

  // Spread the clients' poll ticks across the interval, as real browsers are.
  const loop = async () => {
    await sleep(offsetMs);
    while (!stopped) {
      await load();
      await sleep(pollMs);
    }
  };
  void loop();
  client.stop = () => {
    stopped = true;
    closeChannel();
  };
  return client;
}

async function hostToken(base: string, code: string): Promise<string> {
  const given = process.env.LOADCHECK_HOST_TOKEN;
  if (given) return given;
  const password = process.env.LOADCHECK_TEACHER_PASSWORD;
  if (!password) throw new Error("Set LOADCHECK_TEACHER_PASSWORD or LOADCHECK_HOST_TOKEN.");
  const res = await fetch(`${base}/api/games/${code}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error(`Teacher sign-in failed (HTTP ${res.status}).`);
  const body = (await res.json()) as { hostToken?: string };
  if (!body.hostToken) throw new Error("Teacher sign-in returned no token.");
  return body.hostToken;
}

async function main() {
  const [baseArg, codeArg, clientsArg, samplesArg, pollArg] = process.argv.slice(2);
  if (!baseArg || !codeArg) {
    console.error("Usage: npm run loadcheck -- <deployed-url> <game-code> [clients=30] [samples=5] [pollMs=2000]");
    process.exit(2);
  }
  const base = baseArg.replace(/\/$/, "");
  const code = codeArg.trim().toUpperCase();
  const clients = Number(clientsArg ?? 30);
  const samples = Number(samplesArg ?? 5);
  const pollMs = Number(pollArg ?? 2000);
  const stateUrl = `${base}/api/games/${encodeURIComponent(code)}/state`;

  const token = await hostToken(base, code);
  const pool = await Promise.all(
    Array.from({ length: clients }, (_, i) => startClient(stateUrl, code, pollMs, (i * pollMs) / clients)),
  );
  console.log(`${clients} clients polling every ${pollMs} ms${process.env.NEXT_PUBLIC_SUPABASE_URL ? " with Broadcast" : ""}.`);
  await sleep(pollMs + 500);
  // Wait for the first full round of polls, then make sure the endpoint answers at all.
  const firstRound = Date.now() + SEEN_TIMEOUT_MS;
  while (Date.now() < firstRound && pool.some((c) => c.polls === 0)) await sleep(50);
  if (stateUnreachable(pool)) {
    for (const c of pool) c.stop();
    console.error(unreachableMessage(stateUrl));
    process.exit(UNREACHABLE_EXIT);
  }

  const delays: number[] = [];
  try {
    for (let s = 0; s < samples; s++) {
      const sent = Date.now();
      const res = await fetch(`${base}/api/games/${code}/host`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: "extend", seconds: 1 }),
      });
      if (!res.ok) throw new Error(`Host action failed (HTTP ${res.status}); is the game in the question phase?`);
      const { version } = (await res.json()) as { version: number };
      const deadline = sent + SEEN_TIMEOUT_MS;
      while (Date.now() < deadline && pool.some((c) => !c.seenAt.has(version))) await sleep(50);
      const these = pool.map((c) => (c.seenAt.has(version) ? c.seenAt.get(version)! - sent : SEEN_TIMEOUT_MS));
      delays.push(...these);
      const one = summarizeDelays(these);
      console.log(`sample ${s + 1}: version ${version}, p50 ${one.p50} ms, p95 ${one.p95} ms, max ${one.max} ms`);
      await sleep(GAP_MS);
    }
  } finally {
    for (const c of pool) c.stop();
  }

  const all = summarizeDelays(delays);
  console.log(`\nAll ${all.count} observations: p50 ${all.p50} ms, p95 ${all.p95} ms, max ${all.max} ms`);
  console.log(all.ok ? `PASS (p95 <= ${P95_LIMIT_MS} ms)` : `FAIL (p95 > ${P95_LIMIT_MS} ms)`);
  process.exit(all.ok ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
