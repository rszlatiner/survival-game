/**
 * Tells browsers that a game changed, so they re-fetch the public state from
 * the server. Carries only the code and version: never any game content.
 */
export interface Notifier {
  /** Resolves true if the ping was accepted, false otherwise. Never throws or rejects. */
  notify(code: string, version: number): Promise<boolean>;
}

const TIMEOUT_MS = 2000;

export function noopNotifier(): Notifier {
  return { notify: async () => true };
}

/**
 * Sends one Supabase Realtime Broadcast message (topic `game:<code>`, event
 * `version`) through the REST endpoint, authenticated with the service-role key.
 */
export function supabaseNotifier(url: string, serviceKey: string, fetchImpl: typeof fetch = fetch): Notifier {
  const endpoint = `${url.replace(/\/$/, "")}/realtime/v1/api/broadcast`;
  return {
    async notify(code, version) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        const res = await fetchImpl(endpoint, {
          method: "POST",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [{ topic: `game:${code}`, event: "version", payload: { version }, private: false }],
          }),
          signal: ctrl.signal,
        });
        // Release the connection; the response body is not needed.
        await res.body?.cancel().catch(() => {});
        return res.ok;
      } catch {
        return false;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
