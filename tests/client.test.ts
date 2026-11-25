// @vitest-environment jsdom
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGameState, type GameStatus } from "@/lib/client/useGameState";
import type { ChannelFactory, ChannelStatus } from "@/lib/client/realtime";
import type { PublicGameState } from "@/lib/engine/public";
import { ClientApiError, hostLogin, joinGame, postHost, postTeam } from "@/lib/client/api";
import { clearSession, getDeviceId, loadSession, saveSession } from "@/lib/client/storage";

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
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await tick(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
    expect(loadSession("ABCDEF")).toEqual({ token: "t", role: "team", deviceId: "d", teamId: "x" });
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
    expect(loadSession("ABCDEF")).toEqual({ token: "TT", role: "team", deviceId: getDeviceId(), teamId: "t9" });
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
