import { createClient } from "@supabase/supabase-js";
import type { GameState } from "@/lib/types";
import { VersionConflict, assertIncreasing, type GameRepo } from "./types";

type Row = Record<string, unknown>;
export type DbError = { message: string; code?: string } | null;
export type DbResult = { data: unknown; error: DbError };

/** The chainable, awaitable query builder methods this file uses. */
export interface DbQuery extends PromiseLike<DbResult> {
  eq(col: string, value: unknown): DbQuery;
  lt(col: string, value: string): DbQuery;
  select(cols?: string): DbQuery;
  limit(n: number): DbQuery;
  maybeSingle(): PromiseLike<DbResult>;
}

/** Structural subset of the supabase-js client used here (lets tests inject a fake). */
export interface SupabaseLike {
  from(table: string): {
    select(cols?: string): DbQuery;
    insert(row: Row): DbQuery;
    update(patch: Row): DbQuery;
    delete(): DbQuery;
  };
}

function check(res: DbResult, what: string): unknown {
  if (res.error) throw new Error(`supabase ${what}: ${res.error.message}`);
  return res.data;
}

/**
 * Postgres-backed repo over the single `games` table. Must use the
 * service-role key (server only): RLS is on with no policies and anon /
 * authenticated have no privileges, so browsers never read the database.
 * Every save is one version-guarded UPDATE, so writes cannot land out of order.
 */
export function supabaseRepo(
  url: string,
  serviceKey: string,
  client?: SupabaseLike,
  now: () => number = Date.now,
): GameRepo {
  const db: SupabaseLike =
    client ?? (createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseLike);

  return {
    async create(g) {
      const res = await db.from("games").insert({
        code: g.code,
        state: g,
        version: g.version,
        created_at: new Date(g.createdAt).toISOString(),
      });
      if (res.error?.code === "23505") throw new Error("DUPLICATE_CODE");
      check(res, "create");
    },

    async get(code) {
      const data = check(await db.from("games").select("state").eq("code", code).maybeSingle(), "get") as
        | { state: GameState }
        | null;
      return data ? data.state : null;
    },

    async save(g, expectedVersion) {
      assertIncreasing(g, expectedVersion);
      const rows = check(
        await db
          .from("games")
          .update({ state: g, version: g.version })
          .eq("code", g.code)
          .eq("version", expectedVersion)
          .select("code"),
        "save",
      ) as Row[] | null;
      if (!rows || rows.length !== 1) throw new VersionConflict(g.code, expectedVersion);
    },

    async activeCodes() {
      const rows = check(await db.from("games").select("code"), "activeCodes") as { code: string }[] | null;
      return new Set((rows ?? []).map((r) => r.code));
    },

    async deleteOlderThan(ms) {
      const cutoff = new Date(now() - ms).toISOString();
      const rows = check(await db.from("games").delete().lt("created_at", cutoff).select("code"), "delete games") as
        | { code: string }[]
        | null;
      return (rows ?? []).length;
    },

    async ping() {
      check(await db.from("games").select("code").limit(1), "ping");
    },
  };
}
