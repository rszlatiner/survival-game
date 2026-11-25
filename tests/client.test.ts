// @vitest-environment jsdom
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PING_GAP_MS, useGameState, type GameStatus } from "@/lib/client/useGameState";
import type { ChannelFactory, ChannelStatus } from "@/lib/client/realtime";
import type { PublicGameState } from "@/lib/engine/public";
import { ClientApiError, fetchState, createGame, hostLogin, joinGame, postHost, postTeam } from "@/lib/client/api";
import { SESSION_TTL_MS, clearSession, getDeviceId, listSessions, loadSession, saveSession } from "@/lib/client/storage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const st = (version: number): PublicGameState => ({ code: "ABCDEF", version, phase: "lobby" }) as PublicGameState;
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;
const fail = (status: number, body: unknown) => ({ ok: false, status, json: async () => body }) as Response;

class FakeChannel {
  onPing!: () => void;
  onStatus!: (s: ChannelStatus) => void;
  closed = 0;
  created = 0;
  factory: ChannelFactory = (_code, h) => {
    this.created++;
    this.onPing = h.onPing;
    this.onStatus = h.onStatus;
    return { close: () => void this.closed++ };
  };
}

let root: Root | null = null;
let latest: { state: PublicGameState | null; status: GameStatus; applyState: (n: PublicGameState) => void } = { state: null, status: "polling", applyState: () => {} };
let renders = 0;

function mount(code: string, factory?: ChannelFactory) {
  const el = document.createElement("div");
  root = createRoot(el);
  const App = ({ c }: { c: string }) => {
    latest = useGameState(c, factory ? { createChannel: factory } : undefined);
    renders++;
    return null;
  };
  act(() => root!.render(createElement(App, { c: code })));
  return {
    rerender: (c: string) => act(() => root!.render(createElement(App, { c }))),
    unmount: () => {
      act(() => root!.unmount());
      root = null;
    },
  };
}

const tick = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn(async () => ok(st(1)));
  vi.stubGlobal("fetch", fetchMock);
  latest = { state: null, status: "polling", applyState: () => {} };
  localStorage.clear();
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("useGameState", () => {
  it("applyState applies a higher version, ignores a lower one, and keeps a stable identity", async () => {
    mount("ABCDEF");
    await tick(0);
    expect(latest.state?.version).toBe(1);
    const apply = latest.applyState;
    fetchMock.mockResolvedValue(ok(st(5)));
    await act(async () => apply(st(5)));
    expect(latest.state?.version).toBe(5);
    fetchMock.mockResolvedValue(ok(st(3)));
    await act(async () => apply(st(3)));
    await tick(0);
    expect(latest.state?.version).toBe(5);
    expect(latest.applyState).toBe(apply);
  });

  it("applyState shows the state immediately, then refreshes once through the guarded loader", async () => {
    mount("ABCDEF");
    await tick(0);
    const before = fetchMock.mock.calls.length;
    let release!: (r: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((res) => (release = res)));
    act(() => latest.applyState(st(6)));
    expect(latest.state?.version).toBe(6); // shown before the refresh resolves
    await act(async () => release(ok(st(7))));
    expect(fetchMock.mock.calls.length - before).toBe(1);
    expect(latest.state?.version).toBe(7);
  });

  it("shows state fetched on mount and after a pushed ping", async () => {
    const ch = new FakeChannel();
    mount("ABCDEF", ch.factory);
    await tick(0);
    expect(latest.state?.version).toBe(1);
    fetchMock.mockResolvedValue(ok(st(2)));
    await act(async () => ch.onStatus("SUBSCRIBED"));
    await tick(0);
    await act(async () => ch.onPing());
    await tick(0);
    expect(latest.state?.version).toBe(2);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/games/ABCDEF/state");
  });

  it("is live while subscribed and pinged, polling after 5s of silence, live again on recovery", async () => {
    const ch = new FakeChannel();
    mount("ABCDEF", ch.factory);
    await tick(0);
    await act(async () => ch.onStatus("SUBSCRIBED"));
    expect(latest.status).toBe("live");
    await tick(4000);
    expect(latest.status).toBe("live");
    await tick(1500);
    expect(latest.status).toBe("polling");
    const before = fetchMock.mock.calls.length;
    await tick(6000);
    expect(fetchMock.mock.calls.length - before).toBeGreaterThanOrEqual(3); // every 2s
    await act(async () => ch.onPing());
    expect(latest.status).toBe("live");
  });

  it("switches to polling when the channel errors or closes, and back on resubscribe", async () => {
    const ch = new FakeChannel();
    mount("ABCDEF", ch.factory);
    await act(async () => ch.onStatus("SUBSCRIBED"));
    await act(async () => ch.onStatus("CHANNEL_ERROR"));
    expect(latest.status).toBe("polling");
    await act(async () => ch.onStatus("SUBSCRIBED"));
    expect(latest.status).toBe("live");
    await act(async () => ch.onStatus("CLOSED"));
    expect(latest.status).toBe("polling");
  });

  it("safety-fetches every 5s while live", async () => {
    const ch = new FakeChannel();
    mount("ABCDEF", ch.factory);
    await act(async () => ch.onStatus("SUBSCRIBED"));
    await tick(0);
    const n = fetchMock.mock.calls.length;
    await act(async () => ch.onPing());
    await tick(0);
    const m = fetchMock.mock.calls.length;
    await tick(4900);
    expect(fetchMock.mock.calls.length).toBe(m);
    await tick(200);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(m);
    expect(m).toBeGreaterThan(n - 1);
  });

  it("ignores a fetched state whose version is lower than one already shown", async () => {
    const ch = new FakeChannel();
    fetchMock.mockResolvedValue(ok(st(5)));
    mount("ABCDEF", ch.factory);
    await tick(0);
    expect(latest.state?.version).toBe(5);
    fetchMock.mockResolvedValue(ok(st(3)));
    await tick(2500);
    expect(latest.state?.version).toBe(5);
    fetchMock.mockResolvedValue(ok(st(6)));
    await tick(2500);
    expect(latest.state?.version).toBe(6);
  });

  it("throttles a burst of pings to one in flight plus one queued", async () => {
    const ch = new FakeChannel();
    mount("ABCDEF", ch.factory);
    await tick(0);
    fetchMock.mockClear();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    fetchMock.mockImplementation(async () => {
      await gate;
      return ok(st(2));
    });
    await act(async () => {
      for (let i = 0; i < 20; i++) ch.onPing();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    release();
    await tick(0);
    // The rest of the burst is one follow-up fetch, started after the 300 ms ping gap.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await tick(PING_GAP_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await tick(PING_GAP_MS * 3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps at least 300 ms between ping-triggered fetch starts (fix wave M2)", async () => {
    const ch = new FakeChannel();
    mount("ABCDEF", ch.factory);
    await tick(0);
    fetchMock.mockClear();
    await act(async () => ch.onPing());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await tick(100);
    await act(async () => ch.onPing());
    expect(fetchMock).toHaveBeenCalledTimes(1); // too soon: queued
    await tick(150);
    expect(fetchMock).toHaveBeenCalledTimes(1); // 250 ms after the first start
    await tick(60);
    expect(fetchMock).toHaveBeenCalledTimes(2); // 310 ms: the queued one has started
    await tick(400);
    await act(async () => ch.onPing());
    expect(fetchMock).toHaveBeenCalledTimes(3); // well past the gap: immediate
  });

  it("the ping gap does not delay other fetches (fix wave M2)", async () => {
    const ch = new FakeChannel();
    mount("ABCDEF", ch.factory);
    await tick(0);
    fetchMock.mockClear();
    await act(async () => ch.onPing());
    await tick(50);
    act(() => latest.applyState(st(9)));
    await tick(0);
    expect(fetchMock).toHaveBeenCalledTimes(2); // the action's refresh is not held back by the ping gap
  });

  it("goes offline after consecutive fetch failures and recovers", async () => {
    const ch = new FakeChannel();
    fetchMock.mockRejectedValue(new TypeError("network"));
    mount("ABCDEF", ch.factory);
    await act(async () => ch.onStatus("SUBSCRIBED"));
    await tick(7000);
    expect(latest.status).toBe("offline");
    fetchMock.mockResolvedValue(ok(st(9)));
    await tick(2500);
    expect(latest.status).not.toBe("offline");
    expect(latest.state?.version).toBe(9);
  });

  it("goes offline when the browser reports offline", async () => {
    mount("ABCDEF", new FakeChannel().factory);
    await tick(0);
    await act(async () => void window.dispatchEvent(new Event("offline")));
    expect(latest.status).toBe("offline");
  });

  it("cleans up channel, timers and in-flight request on unmount, with no later updates", async () => {
    const ch = new FakeChannel();
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation((_u: string, init: RequestInit) => {
      signal = init.signal as AbortSignal;
      return new Promise(() => {});
    });
    const m = mount("ABCDEF", ch.factory);
    await act(async () => ch.onStatus("SUBSCRIBED"));
    const r = renders;
    m.unmount();
    expect(ch.closed).toBe(1);
    expect(signal?.aborted).toBe(true);
    const calls = fetchMock.mock.calls.length;
    await tick(20000);
    expect(fetchMock.mock.calls.length).toBe(calls);
    ch.onPing();
    ch.onStatus("CLOSED");
    expect(renders).toBe(r);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("resubscribes and drops old state when the code changes", async () => {
    const ch = new FakeChannel();
    const m = mount("ABCDEF", ch.factory);
    await tick(0);
    m.rerender("GHJKMN");
    expect(ch.closed).toBe(1);
    expect(ch.created).toBe(2);
    await tick(0);
    expect(fetchMock.mock.calls.at(-1)![0]).toBe("/api/games/GHJKMN/state");
  });

  it("goes straight to polling without crashing when Supabase env vars are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    mount("ABCDEF");
    await tick(0);
    expect(latest.status).toBe("polling");
    expect(latest.state?.version).toBe(1);
    const n = fetchMock.mock.calls.length;
    await tick(2100);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(n);
  });
});

describe("storage", () => {
  it("round-trips a session and clears it", () => {
    saveSession("ABCDEF", { token: "t", role: "team", deviceId: "d", teamId: "x" });
    expect(loadSession("ABCDEF")).toMatchObject({ token: "t", role: "team", deviceId: "d", teamId: "x" });
    clearSession("ABCDEF");
    expect(loadSession("ABCDEF")).toBeNull();
  });

  it("loadSession returns null when localStorage throws, and save still works via memory", () => {
    const boom = () => {
      throw new Error("denied");
    };
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(boom);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(boom);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(boom);
    expect(loadSession("QQQQQQ")).toBeNull();
    saveSession("QQQQQQ", { token: "t", role: "host", deviceId: "d" });
    expect(loadSession("QQQQQQ")?.token).toBe("t");
    expect(() => clearSession("QQQQQQ")).not.toThrow();
    expect(loadSession("QQQQQQ")).toBeNull();
    vi.restoreAllMocks();
  });

  it("returns null for garbage or wrongly shaped stored values", () => {
    localStorage.setItem("dim:session:BADBAD", "{not json");
    expect(loadSession("BADBAD")).toBeNull();
    localStorage.setItem("dim:session:BADBAD", JSON.stringify({ token: 5, role: "host", deviceId: "d" }));
    expect(loadSession("BADBAD")).toBeNull();
    localStorage.setItem("dim:session:BADBAD", JSON.stringify({ token: "t", role: "admin", deviceId: "d" }));
    expect(loadSession("BADBAD")).toBeNull();
    localStorage.setItem("dim:session:BADBAD", "null");
    expect(loadSession("BADBAD")).toBeNull();
  });

  it("gives a stable device id", () => {
    const a = getDeviceId();
    expect(a.length).toBeGreaterThan(8);
    expect(getDeviceId()).toBe(a);
  });
});

describe("api", () => {
  afterEach(() => clearSession("ABCDEF"));

  it("attaches the stored token to host and team posts", async () => {
    saveSession("ABCDEF", { token: "HOSTTOK", role: "host", deviceId: "d" });
    fetchMock.mockResolvedValue(ok(st(2)));
    await postHost("ABCDEF", { type: "start" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/games/ABCDEF/host");
    expect(init.headers.Authorization).toBe("Bearer HOSTTOK");
    expect(JSON.parse(init.body)).toEqual({ type: "start" });
  });

  it("clears the stored session on a 401 and throws a typed error", async () => {
    saveSession("ABCDEF", { token: "OLD", role: "team", deviceId: "d", teamId: "t1" });
    fetchMock.mockResolvedValue(fail(401, { error: "UNAUTHORIZED" }));
    const err = await postTeam("ABCDEF", { type: "submit", answer: "4" }).catch((e) => e);
    expect(err).toBeInstanceOf(ClientApiError);
    expect(err.status).toBe(401);
    expect(err.code).toBe("UNAUTHORIZED");
    expect(loadSession("ABCDEF")).toBeNull();
  });

  it.each([500, 502, 503, 404, 403, 429])("keeps the stored session on a %i from an authenticated request", async (status) => {
    saveSession("ABCDEF", { token: "T", role: "host", deviceId: "d" });
    fetchMock.mockResolvedValue(fail(status, { error: "INTERNAL" }));
    const err = await postHost("ABCDEF", { type: "next" }).catch((e) => e);
    expect(err.status).toBe(status);
    expect(loadSession("ABCDEF")?.token).toBe("T");
  });

  it("keeps the stored session on a network error and on a non-JSON 502", async () => {
    saveSession("ABCDEF", { token: "T", role: "host", deviceId: "d" });
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(postHost("ABCDEF", { type: "next" })).rejects.toThrow("Failed to fetch");
    expect(loadSession("ABCDEF")?.token).toBe("T");
    fetchMock.mockResolvedValue({ ok: false, status: 502, json: async () => { throw new Error("html"); } } as unknown as Response);
    await postHost("ABCDEF", { type: "next" }).catch(() => {});
    expect(loadSession("ABCDEF")?.token).toBe("T");
  });

  it("a 401 on the public state fetch never clears a stored session", async () => {
    saveSession("ABCDEF", { token: "T", role: "host", deviceId: "d" });
    fetchMock.mockResolvedValue(fail(401, { error: "UNAUTHORIZED" }));
    await fetchState("ABCDEF").catch(() => {});
    fetchMock.mockRejectedValue(new TypeError("offline"));
    await fetchState("ABCDEF").catch(() => {});
    expect(loadSession("ABCDEF")?.token).toBe("T");
  });

  it("does not call the server without a matching session", async () => {
    const err = await postHost("ABCDEF", { type: "start" }).catch((e) => e);
    expect(err.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces 409 with the resync state and keeps the session", async () => {
    saveSession("ABCDEF", { token: "T", role: "host", deviceId: "d" });
    fetchMock.mockResolvedValue(fail(409, { error: "CONFLICT", state: st(7) }));
    const err = await postHost("ABCDEF", { type: "next" }).catch((e) => e);
    expect(err.code).toBe("CONFLICT");
    expect(err.state.version).toBe(7);
    expect(loadSession("ABCDEF")).not.toBeNull();
  });

  it("join stores a team session with this browser's device id", async () => {
    fetchMock.mockResolvedValue(ok({ teamId: "t9", teamToken: "TT" }));
    await joinGame("ABCDEF", { teamName: "Crabs" });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ teamName: "Crabs", deviceId: getDeviceId() });
    expect(loadSession("ABCDEF")).toMatchObject({ token: "TT", role: "team", deviceId: getDeviceId(), teamId: "t9" });
  });
});

describe("hostLogin", () => {
  it("posts the password and stores the host session", async () => {
    fetchMock.mockResolvedValue(ok({ hostToken: "NEWTOK" }));
    await hostLogin("abcdef", "pw");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/games/ABCDEF/login");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ password: "pw" });
    expect(loadSession("ABCDEF")).toMatchObject({ token: "NEWTOK", role: "host" });
  });

  it("throws a typed error and stores nothing on a wrong password", async () => {
    clearSession("ABCDEF");
    fetchMock.mockResolvedValue(fail(401, { error: "UNAUTHORIZED" }));
    const err = await hostLogin("ABCDEF", "bad").catch((e) => e);
    expect(err).toBeInstanceOf(ClientApiError);
    expect(err.code).toBe("UNAUTHORIZED");
    expect(loadSession("ABCDEF")).toBeNull();
  });
});

describe("listSessions", () => {
  const NOW = 1_800_000_000_000;
  const clearAll = () => {
    for (const c of ["ABCDEF", "BCDEFG", "CDEFGH", "DEFGHJ", "BADBAD", "OLDOLD", "LEGACY"]) clearSession(c);
    localStorage.clear();
  };
  beforeEach(clearAll);
  afterEach(clearAll);

  it("saveSession stamps createdAt and an expiry 24 hours ahead", () => {
    expect(SESSION_TTL_MS).toBe(24 * 60 * 60 * 1000);
    const t = Date.now();
    saveSession("ABCDEF", { token: "t", role: "host", deviceId: "d" });
    const s = loadSession("ABCDEF")!;
    expect(s.createdAt).toBeGreaterThanOrEqual(t);
    expect(s.expiresAt! - s.createdAt!).toBe(SESSION_TTL_MS);
  });

  it("lists valid unexpired host sessions, newest first, and skips team sessions", () => {
    saveSession("ABCDEF", { token: "a", role: "host", deviceId: "d", createdAt: NOW - 5000, expiresAt: NOW + 1000 });
    saveSession("BCDEFG", { token: "b", role: "host", deviceId: "d", createdAt: NOW - 1000, expiresAt: NOW + 9000 });
    saveSession("CDEFGH", { token: "c", role: "team", deviceId: "d", teamId: "t", createdAt: NOW, expiresAt: NOW + 9000 });
    expect(listSessions(NOW)).toEqual([
      { code: "BCDEFG", createdAt: NOW - 1000, expiresAt: NOW + 9000 },
      { code: "ABCDEF", createdAt: NOW - 5000, expiresAt: NOW + 1000 },
    ]);
  });

  it("filters out expired sessions (expiry boundary included)", () => {
    saveSession("OLDOLD", { token: "o", role: "host", deviceId: "d", createdAt: NOW - 99999, expiresAt: NOW - 1 });
    saveSession("ABCDEF", { token: "a", role: "host", deviceId: "d", createdAt: NOW - 99999, expiresAt: NOW });
    expect(listSessions(NOW)).toEqual([]);
  });

  it("still lists a legacy host session saved without an expiry", () => {
    localStorage.setItem("dim:session:LEGACY", JSON.stringify({ token: "t", role: "host", deviceId: "d" }));
    expect(listSessions(NOW)).toEqual([{ code: "LEGACY" }]);
    expect(loadSession("LEGACY")?.token).toBe("t");
  });

  it("ignores garbage JSON, wrong shapes, bad keys and non-session keys", () => {
    localStorage.setItem("dim:session:BADBAD", "{not json");
    localStorage.setItem("dim:session:ABCDEF", JSON.stringify({ token: 5, role: "host", deviceId: "d" }));
    localStorage.setItem("dim:session:BCDEFG", JSON.stringify({ token: "t", role: "host", deviceId: "d", expiresAt: "soon" }));
    localStorage.setItem("dim:session:bad code!", JSON.stringify({ token: "t", role: "host", deviceId: "d" }));
    localStorage.setItem("dim:session:CDEFGH", "null");
    localStorage.setItem("dim:device", "abc");
    localStorage.setItem("other", "{}");
    expect(listSessions(NOW)).toEqual([]);
  });

  it("works from the memory fallback when localStorage throws", () => {
    const boom = () => {
      throw new Error("denied");
    };
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(boom);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(boom);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(boom);
    vi.spyOn(Storage.prototype, "key").mockImplementation(boom);
    saveSession("DEFGHJ", { token: "t", role: "host", deviceId: "d", createdAt: NOW, expiresAt: NOW + 5 });
    expect(listSessions(NOW)).toEqual([{ code: "DEFGHJ", createdAt: NOW, expiresAt: NOW + 5 }]);
    clearSession("DEFGHJ");
    expect(listSessions(NOW)).toEqual([]);
    vi.restoreAllMocks();
  });

  it("never stores the teacher password", async () => {
    fetchMock.mockResolvedValue(ok({ hostToken: "NEWTOK" }));
    await hostLogin("ABCDEF", "s3cret-pw");
    fetchMock.mockResolvedValue(ok({ code: "BCDEFG", hostToken: "T2" }));
    await createGame({ password: "s3cret-pw", units: [1], length: "quick", timerSeconds: 90 });
    const all = Array.from({ length: localStorage.length }, (_, i) => localStorage.getItem(localStorage.key(i)!));
    expect(all.join("|")).not.toContain("s3cret-pw");
  });
});
