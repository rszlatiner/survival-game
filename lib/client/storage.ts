/**
 * Per-game session storage in the browser. localStorage can throw or be
 * missing (private mode, blocked storage), so every access is guarded and an
 * in-memory Map keeps the session alive for the life of the page.
 */

export interface Session {
  token: string;
  role: "host" | "team";
  deviceId: string;
  teamId?: string;
  /** Join-order index of this device on its team (captain is `captainIndex`). */
  deviceIndex?: number;
  /** When this session was saved (ms since epoch). Absent on sessions saved by older versions. */
  createdAt?: number;
  /** When the server token expires (ms since epoch). Absent on sessions saved by older versions. */
  expiresAt?: number;
}

/** Server token lifetime (lib/api/handlers TOKEN_TTL_MS); the stored expiry is derived from it. */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export interface StoredHostSession {
  code: string;
  createdAt?: number;
  expiresAt?: number;
}

const PREFIX = "dim:session:";
const DEVICE_KEY = "dim:device";
const memory = new Map<string, string>();

function ls(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

const keyFor = (code: string) => PREFIX + String(code).toUpperCase();

function isSession(x: unknown): x is Session {
  if (!x || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.token === "string" &&
    o.token.length > 0 &&
    (o.role === "host" || o.role === "team") &&
    typeof o.deviceId === "string" &&
    o.deviceId.length > 0 &&
    (o.teamId === undefined || typeof o.teamId === "string") &&
    (o.deviceIndex === undefined || (typeof o.deviceIndex === "number" && Number.isInteger(o.deviceIndex))) &&
    (o.createdAt === undefined || (typeof o.createdAt === "number" && Number.isFinite(o.createdAt))) &&
    (o.expiresAt === undefined || (typeof o.expiresAt === "number" && Number.isFinite(o.expiresAt)))
  );
}

function read(key: string): string | null {
  try {
    const s = ls();
    const v = s ? s.getItem(key) : null;
    if (v !== null) return v;
  } catch {
    // fall through to memory
  }
  return memory.get(key) ?? null;
}

function write(key: string, value: string): void {
  memory.set(key, value);
  try {
    ls()?.setItem(key, value);
  } catch {
    // memory copy is enough
  }
}

export function saveSession(code: string, session: Session): void {
  const createdAt = session.createdAt ?? Date.now();
  const stamped: Session = { ...session, createdAt, expiresAt: session.expiresAt ?? createdAt + SESSION_TTL_MS };
  write(keyFor(code), JSON.stringify(stamped));
}

export function loadSession(code: string): Session | null {
  const raw = read(keyFor(code));
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearSession(code: string): void {
  const key = keyFor(code);
  memory.delete(key);
  try {
    ls()?.removeItem(key);
  } catch {
    // nothing more to do
  }
}

function storedKeys(): string[] {
  const keys = new Set<string>();
  for (const k of memory.keys()) if (k.startsWith(PREFIX)) keys.add(k);
  try {
    const s = ls();
    if (s) {
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k && k.startsWith(PREFIX)) keys.add(k);
      }
    }
  } catch {
    // memory keys are enough
  }
  return [...keys];
}

/**
 * Stored host sessions that have not passed their expiry, newest first. Team
 * sessions, malformed entries and expired entries are skipped. Entries saved
 * before expiry was stored (no expiresAt) are kept: the server decides.
 */
export function listSessions(now: number = Date.now()): StoredHostSession[] {
  const out: StoredHostSession[] = [];
  for (const key of storedKeys()) {
    const code = key.slice(PREFIX.length);
    if (!/^[A-Z2-9]{6}$/.test(code)) continue;
    const s = loadSession(code);
    if (!s || s.role !== "host") continue;
    if (s.expiresAt !== undefined && s.expiresAt <= now) continue;
    const e: StoredHostSession = { code };
    if (s.createdAt !== undefined) e.createdAt = s.createdAt;
    if (s.expiresAt !== undefined) e.expiresAt = s.expiresAt;
    out.push(e);
  }
  return out.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

function randomId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** A stable random id for this browser; the server treats it as the device's identity on a team. */
export function getDeviceId(): string {
  const existing = read(DEVICE_KEY);
  if (existing && existing.length > 0 && existing.length <= 64) return existing;
  const id = randomId();
  write(DEVICE_KEY, id);
  return id;
}
