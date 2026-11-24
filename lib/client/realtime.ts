import { createClient } from "@supabase/supabase-js";

/** Status values the hook cares about, normalised from the SDK's. */
export type ChannelStatus = "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED";

export interface ChannelHandle {
  close(): void;
}

/**
 * Subscribes to the Broadcast channel `game:<code>`. A ping is only a trigger
 * (public channel, so its payload is never trusted). Returns null when the
 * public Supabase env vars are missing, which sends the hook straight to polling.
 */
export type ChannelFactory = (
  code: string,
  handlers: { onPing: () => void; onStatus: (s: ChannelStatus) => void },
) => ChannelHandle | null;

export const defaultChannelFactory: ChannelFactory = (code, { onPing, onStatus }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const ch = client
      .channel(`game:${code}`)
      .on("broadcast", { event: "version" }, () => onPing())
      .subscribe((status) => onStatus(status as ChannelStatus));
    return {
      close() {
        void client.removeChannel(ch);
        void client.realtime.disconnect();
      },
    };
  } catch {
    return null;
  }
};
