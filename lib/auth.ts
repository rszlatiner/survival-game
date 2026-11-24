import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export interface TokenPayload {
  role: "host" | "team";
  code: string;
  teamId?: string;
  deviceId?: string;
}

export type VerifiedToken = TokenPayload & { exp: number };

/** Tokens longer than this are rejected before any decoding work. */
const MAX_TOKEN_LENGTH = 4096;

function mac(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

/** Token = base64url(JSON{...payload, exp}) + "." + base64url(HMAC-SHA256(secret, first part)). */
export function signToken(payload: TokenPayload, secret: string, ttlMs: number, now: number): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: now + ttlMs })).toString("base64url");
  return `${body}.${mac(body, secret)}`;
}

/**
 * Returns the payload of a genuine, unexpired token, else null. Never throws.
 * Pass `expectedCode` to also require that the token belongs to that game;
 * otherwise the caller must compare `payload.code` itself.
 */
export function verifyToken(token: string, secret: string, now: number, expectedCode?: string): VerifiedToken | null {
  try {
    if (typeof token !== "string" || token.length > MAX_TOKEN_LENGTH || !secret) return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [body, sig] = parts;
    // Compare the canonical signature text, so non-canonical base64 spellings also fail.
    const want = Buffer.from(mac(body, secret));
    const got = Buffer.from(sig);
    if (got.length !== want.length || !timingSafeEqual(got, want)) return null;

    const p: unknown = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!p || typeof p !== "object" || Array.isArray(p)) return null;
    const o = p as Record<string, unknown>;
    if (o.role !== "host" && o.role !== "team") return null;
    if (typeof o.code !== "string" || o.code === "") return null;
    if (typeof o.exp !== "number" || !Number.isFinite(o.exp) || o.exp <= now) return null;
    if (o.teamId !== undefined && typeof o.teamId !== "string") return null;
    if (o.deviceId !== undefined && typeof o.deviceId !== "string") return null;
    if (expectedCode !== undefined && o.code !== expectedCode) return null;

    const out: VerifiedToken = { role: o.role, code: o.code, exp: o.exp };
    if (o.teamId !== undefined) out.teamId = o.teamId as string;
    if (o.deviceId !== undefined) out.deviceId = o.deviceId as string;
    return out;
  } catch {
    return null;
  }
}

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest();

/**
 * Constant-time password check (both sides hashed so lengths always match).
 * An empty configured password matches nothing.
 */
export function checkPassword(input: string, expected: string): boolean {
  if (typeof input !== "string" || typeof expected !== "string" || expected === "") return false;
  return timingSafeEqual(sha256(input), sha256(expected));
}
