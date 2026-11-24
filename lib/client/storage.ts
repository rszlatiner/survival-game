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
    (o.teamId === undefined || typeof o.teamId === "string")
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
  write(keyFor(code), JSON.stringify(session));
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
