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
  it("creates both tables with the agreed columns", () => {
    expect(code).toMatch(/create table (if not exists )?(public\.)?games \(/);
    expect(code).toContain("code text primary key");
    expect(code).toContain("state jsonb not null");
    expect(code).toContain("version int not null");
    expect(code).toContain("created_at timestamptz not null");
    expect(code).toMatch(/create table (if not exists )?(public\.)?game_public \(/);
  });

  it("enables row level security on both tables", () => {
    expect(code).toMatch(/alter table (public\.)?games enable row level security/);
    expect(code).toMatch(/alter table (public\.)?game_public enable row level security/);
  });

  it("has no policy on games and exactly one anon select policy on game_public", () => {
    const policies = code.match(/create policy [^;]*;/g) ?? [];
    expect(policies).toHaveLength(1);
    expect(policies.some((p) => / on (public\.)?games /.test(p))).toBe(false);
    expect(policies[0]).toMatch(/ on (public\.)?game_public for select to anon using \(true\)/);
    expect(code).not.toMatch(/grant (insert|update|delete|all)/);
  });

  it("publishes game_public to realtime and indexes created_at", () => {
    expect(code).toContain("alter publication supabase_realtime add table public.game_public;");
    expect(code).toMatch(/create index [^;]* on (public\.)?games \(created_at\)/);
  });

  it("has a header explaining how to run it", () => {
    expect(sql.split("\n")[0]).toMatch(/^--/);
  });
});
