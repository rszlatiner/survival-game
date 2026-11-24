import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { checkPassword, signToken, verifyToken } from "@/lib/auth";

const SECRET = "test-secret-0123456789-abcdefghijk"; // 33 chars
const NOW = 1_000_000;
const HOUR = 3_600_000;

function flip(s: string, i: number): string {
  const c = s[i] === "A" ? "B" : "A";
  return s.slice(0, i) + c + s.slice(i + 1);
}

describe("tokens", () => {
  it("verifies a valid host token", () => {
    const tok = signToken({ role: "host", code: "ABC234" }, SECRET, HOUR, NOW);
    expect(verifyToken(tok, SECRET, NOW + 1)).toMatchObject({ role: "host", code: "ABC234", exp: NOW + HOUR });
  });

  it("verifies a valid team token with team and device ids", () => {
    const tok = signToken({ role: "team", code: "ABC234", teamId: "t2", deviceId: "dev-9" }, SECRET, HOUR, NOW);
    expect(verifyToken(tok, SECRET, NOW)).toMatchObject({ role: "team", code: "ABC234", teamId: "t2", deviceId: "dev-9" });
  });

  it("rejects a tampered payload", () => {
    const tok = signToken({ role: "team", code: "ABC234", teamId: "t1" }, SECRET, HOUR, NOW);
    const [body, sig] = tok.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), role: "host" }),
    ).toString("base64url");
    expect(verifyToken(`${forged}.${sig}`, SECRET, NOW)).toBeNull();
    expect(verifyToken(`${flip(body, 3)}.${sig}`, SECRET, NOW)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const tok = signToken({ role: "host", code: "ABC234" }, SECRET, HOUR, NOW);
    expect(verifyToken(flip(tok, tok.length - 2), SECRET, NOW)).toBeNull();
    expect(verifyToken(tok.slice(0, -4), SECRET, NOW)).toBeNull();
    expect(verifyToken(tok + "AAAA", SECRET, NOW)).toBeNull();
  });

  it("rejects expired tokens (exp <= now)", () => {
    const tok = signToken({ role: "host", code: "ABC234" }, SECRET, HOUR, NOW);
    expect(verifyToken(tok, SECRET, NOW + HOUR - 1)).not.toBeNull();
    expect(verifyToken(tok, SECRET, NOW + HOUR)).toBeNull();
    expect(verifyToken(tok, SECRET, NOW + 10 * HOUR)).toBeNull();
  });

  it("rejects a token signed with another secret", () => {
    const tok = signToken({ role: "host", code: "ABC234" }, "other-secret-0123456789-abcdefghij", HOUR, NOW);
    expect(verifyToken(tok, SECRET, NOW)).toBeNull();
  });

  it("rejects a token for another game when the expected code is given", () => {
    const tok = signToken({ role: "team", code: "ABC234", teamId: "t1" }, SECRET, HOUR, NOW);
    expect(verifyToken(tok, SECRET, NOW, "XYZ789")).toBeNull();
    expect(verifyToken(tok, SECRET, NOW, "ABC234")).not.toBeNull();
    // Without the binding argument the caller sees the code and must compare it.
    expect(verifyToken(tok, SECRET, NOW)!.code).not.toBe("XYZ789");
  });

  it("rejects a correctly signed payload missing role or code, or with a bad role", () => {
    const sign = (p: object) => signToken(p as never, SECRET, HOUR, NOW);
    expect(verifyToken(sign({ code: "ABC234" }), SECRET, NOW)).toBeNull();
    expect(verifyToken(sign({ role: "host" }), SECRET, NOW)).toBeNull();
    expect(verifyToken(sign({ role: "admin", code: "ABC234" }), SECRET, NOW)).toBeNull();
  });

  it("never throws on garbage", () => {
    const junk = ["", ".", "..", "a.b", "a.b.c", "%%%.%%%", "eyJ9.", ".sig", "x".repeat(100_000), "x".repeat(50_000) + "." + "y".repeat(50_000), "\u0000.\u0000", "🙂.🙂"];
    for (const j of junk) {
      expect(() => verifyToken(j, SECRET, NOW)).not.toThrow();
      expect(verifyToken(j, SECRET, NOW)).toBeNull();
    }
    expect(verifyToken(undefined as never, SECRET, NOW)).toBeNull();
    expect(verifyToken(null as never, SECRET, NOW)).toBeNull();
  });

  it("rejects a signed body that is not a JSON object", () => {
    const tok = signToken({ role: "host", code: "ABC234" }, SECRET, HOUR, NOW);
    const sig = tok.split(".")[1];
    expect(verifyToken(`${Buffer.from("not json").toString("base64url")}.${sig}`, SECRET, NOW)).toBeNull();
  });
});

describe("secret length", () => {
  const short = "x".repeat(31);
  it("signToken throws for a secret shorter than 32 characters", () => {
    expect(() => signToken({ role: "host", code: "ABC234" }, short, HOUR, NOW)).toThrow();
    expect(() => signToken({ role: "host", code: "ABC234" }, "", HOUR, NOW)).toThrow();
    expect(() => signToken({ role: "host", code: "ABC234" }, "x".repeat(32), HOUR, NOW)).not.toThrow();
  });

  it("verifyToken returns null for a short secret, even on a token made with it", () => {
    // Build a token with the short secret by hand (signToken refuses to).
    const body = Buffer.from(JSON.stringify({ role: "host", code: "ABC234", exp: NOW + HOUR })).toString("base64url");
    const sig = createHmac("sha256", short).update(body).digest("base64url");
    expect(verifyToken(`${body}.${sig}`, short, NOW)).toBeNull();
    expect(verifyToken(`${body}.${sig}`, "", NOW)).toBeNull();
  });
});

describe("checkPassword", () => {
  it("accepts only the exact password", () => {
    expect(checkPassword("hunter2", "hunter2")).toBe(true);
    expect(checkPassword("hunter3", "hunter2")).toBe(false);
    expect(checkPassword("hunter", "hunter2")).toBe(false);
    expect(checkPassword("hunter2 ", "hunter2")).toBe(false);
    expect(checkPassword("", "hunter2")).toBe(false);
  });

  it("refuses everything when no password is configured", () => {
    expect(checkPassword("", "")).toBe(false);
    expect(checkPassword("x", "")).toBe(false);
  });

  it("never throws on non-string input", () => {
    expect(checkPassword(undefined as never, "hunter2")).toBe(false);
  });
});

describe("token createdAt", () => {
  it("round-trips the game's createdAt", () => {
    const tok = signToken({ role: "host", code: "ABC234", createdAt: 1234 }, SECRET, HOUR, NOW);
    expect(verifyToken(tok, SECRET, NOW)?.createdAt).toBe(1234);
  });
});
