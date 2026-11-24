import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sql = readFileSync(fileURLToPath(new URL("../supabase/migrations/0001_init.sql", import.meta.url)), "utf8");
// Strip -- comments so the header text cannot satisfy the checks, then normalise whitespace and case.
const code = sql
  .split("\n")
  .map((l) => l.replace(/--.*$/, ""))
  .join(" ")
  .replace(/\s+/g, " ")
  .toLowerCase();

describe("0001_init.sql", () => {
  it("creates the games table with the agreed columns", () => {
    expect(code).toMatch(/create table (if not exists )?(public\.)?games \(/);
    expect(code).toContain("code text primary key");
    expect(code).toContain("state jsonb not null");
    expect(code).toContain("version int not null");
    expect(code).toContain("created_at timestamptz not null");
  });

  it("enables row level security on games", () => {
    expect(code).toMatch(/alter table (public\.)?games enable row level security/);
  });

  it("has no policies at all and revokes everything from anon and authenticated", () => {
    expect(code).not.toContain("create policy");
    expect(code).toMatch(/revoke all on (table )?(public\.)?games from anon, authenticated;/);
    expect(code).not.toMatch(/\bgrant\b/);
  });

  it("has no public table and no realtime publication", () => {
    expect(code).not.toContain("game_public");
    expect(code).not.toContain("publication");
  });

  it("indexes created_at", () => {
    expect(code).toMatch(/create index [^;]* on (public\.)?games \(created_at\)/);
  });

  it("has a header explaining how to run it", () => {
    expect(sql.split("\n")[0]).toMatch(/^--/);
  });
});
