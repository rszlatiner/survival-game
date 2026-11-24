import { describe, expect, it, vi } from "vitest";
import { noopNotifier, supabaseNotifier } from "@/lib/repo/notify";

type Call = { url: string; init: RequestInit };

function fakeFetch(respond: (call: Call) => Promise<Response>) {
  const calls: Call[] = [];
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    const call = { url: String(url), init: init ?? {} };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
  return { f, calls };
}

describe("noopNotifier", () => {
  it("resolves true", async () => {
    await expect(noopNotifier().notify("ABC234", 3)).resolves.toBe(true);
  });
});

describe("supabaseNotifier", () => {
  it("POSTs one broadcast message with the service key headers", async () => {
    const { f, calls } = fakeFetch(async () => new Response("", { status: 202 }));
    const ok = await supabaseNotifier("https://proj.supabase.co/", "svc-key", f).notify("ABC234", 7);
    expect(ok).toBe(true);
    expect(calls).toHaveLength(1);
    const { url, init } = calls[0];
    expect(url).toBe("https://proj.supabase.co/realtime/v1/api/broadcast");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      apikey: "svc-key",
      Authorization: "Bearer svc-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init.body))).toStrictEqual({
      messages: [{ topic: "game:ABC234", event: "version", payload: { version: 7 }, private: false }],
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("returns true for any 2xx", async () => {
    const { f } = fakeFetch(async () => new Response(null, { status: 200 }));
    await expect(supabaseNotifier("https://p.supabase.co", "k", f).notify("A", 1)).resolves.toBe(true);
  });

  it("returns false on a non-2xx response", async () => {
    for (const status of [500, 401, 404, 302]) {
      const { f } = fakeFetch(async () => new Response("no", { status }));
      await expect(supabaseNotifier("https://p.supabase.co", "k", f).notify("A", 1)).resolves.toBe(false);
    }
  });

  it("returns false when fetch throws", async () => {
    const { f } = fakeFetch(async () => {
      throw new TypeError("network down");
    });
    await expect(supabaseNotifier("https://p.supabase.co", "k", f).notify("A", 1)).resolves.toBe(false);
    const sync = (() => {
      throw new Error("sync throw");
    }) as unknown as typeof fetch;
    await expect(supabaseNotifier("https://p.supabase.co", "k", sync).notify("A", 1)).resolves.toBe(false);
  });

  it("aborts after 2 seconds and returns false", async () => {
    vi.useFakeTimers();
    try {
      let aborted = false;
      const { f } = fakeFetch(
        ({ init }) =>
          new Promise<Response>((_res, rej) => {
            init.signal!.addEventListener("abort", () => {
              aborted = true;
              rej(new DOMException("aborted", "AbortError"));
            });
          }),
      );
      const p = supabaseNotifier("https://p.supabase.co", "k", f).notify("A", 1);
      await vi.advanceTimersByTimeAsync(1999);
      expect(aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await expect(p).resolves.toBe(false);
      expect(aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
