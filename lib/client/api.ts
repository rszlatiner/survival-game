import type { PublicGameState } from "@/lib/engine/public";
import type { CreateBody, HostAction, TeamAction } from "@/lib/api/parse";
import { clearSession, getDeviceId, loadSession, saveSession } from "./storage";

/** Typed fetch helpers for the game API. Never logs tokens. */

export class ClientApiError extends Error {
  status: number;
  code: string;
  /** Present on 409 and failed saves: the game's current public state, for resync. */
  state?: PublicGameState;
  constructor(status: number, code: string, state?: PublicGameState) {
    super(code);
    this.name = "ClientApiError";
    this.status = status;
    this.code = code;
    this.state = state;
  }
}

const base = (code: string) => `/api/games/${encodeURIComponent(code.toUpperCase())}`;

async function send<T>(
  url: string,
  init: { method: "GET" | "POST"; body?: unknown; token?: string; signal?: AbortSignal },
  codeForSession?: string,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  const res = await fetch(url, {
    method: init.method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: init.signal,
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON body
  }
  if (!res.ok) {
    const d = (data ?? {}) as { error?: unknown; state?: PublicGameState };
    const code = typeof d.error === "string" ? d.error : "INTERNAL";
    if (res.status === 401 && init.token && codeForSession) clearSession(codeForSession);
    throw new ClientApiError(res.status, code, d.state);
  }
  return data as T;
}

/** Public state, no token needed. */
export function fetchState(code: string, signal?: AbortSignal): Promise<PublicGameState> {
  return send<PublicGameState>(`${base(code)}/state`, { method: "GET", signal });
}

function authed<T>(code: string, path: string, method: "GET" | "POST", role: "host" | "team", body?: unknown) {
  const s = loadSession(code);
  if (!s || s.role !== role) return Promise.reject(new ClientApiError(401, "UNAUTHORIZED"));
  return send<T>(`${base(code)}/${path}`, { method, body, token: s.token }, code);
}

/** Teacher creates a game; stores the host session and returns the code. */
export async function createGame(body: CreateBody): Promise<{ code: string }> {
  const r = await send<{ code: string; hostToken: string }>("/api/games", { method: "POST", body });
  saveSession(r.code, { token: r.hostToken, role: "host", deviceId: getDeviceId() });
  return { code: r.code };
}

/** A device creates a team (teamName) or joins one (teamId); stores the team session. */
export async function joinGame(
  code: string,
  who: { teamName: string } | { teamId: string },
): Promise<{ teamId: string; deviceIndex?: number }> {
  const deviceId = getDeviceId();
  const r = await send<{ teamId: string; teamToken: string; deviceIndex?: number }>(`${base(code)}/join`, {
    method: "POST",
    body: { ...who, deviceId },
  });
  const deviceIndex = typeof r.deviceIndex === "number" && r.deviceIndex >= 0 ? r.deviceIndex : undefined;
  saveSession(code, { token: r.teamToken, role: "team", deviceId, teamId: r.teamId, deviceIndex });
  return { teamId: r.teamId, deviceIndex };
}

export const postHost = (code: string, action: HostAction) =>
  authed<PublicGameState>(code, "host", "POST", "host", action);

export const postTeam = (code: string, action: TeamAction) =>
  authed<PublicGameState>(code, "team", "POST", "team", action);

export const getSuggestions = (code: string) =>
  authed<{ suggestions: { answer: string }[] }>(code, "suggestions", "GET", "team");
