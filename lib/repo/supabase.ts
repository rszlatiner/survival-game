import { createClient } from "@supabase/supabase-js";
import { toPublicState } from "@/lib/engine/public";
import type { GameState } from "@/lib/types";
import { VersionConflict, assertIncreasing, type GameRepo } from "./types";

type Row = Record<string, unknown>;
export type DbError = { message: string; code?: string } | null;
export type DbResult = { data: unknown; error: DbError };

/** The chainable, awaitable query builder methods this file uses. */
export interface DbQuery extends PromiseLike<DbResult> {
  eq(col: string, value: unknown): DbQuery;
  lt(col: string, value: string): DbQuery;
  in(col: string, values: unknown[]): DbQuery;
  select(cols?: string): DbQuery;
  limit(n: number): DbQuery;
  maybeSingle(): PromiseLike<DbResult>;
}

/** Structural subset of the supabase-js client used here (lets tests inject a fake). */
export interface SupabaseLike {
  from(table: string): {
    select(cols?: string): DbQuery;
    insert(row: Row): DbQuery;
    upsert(row: Row): DbQuery;
    update(patch: Row): DbQuery;
    delete(): DbQuery;
  };
}

function check(res: DbResult, what: string): unknown {
  if (res.error) throw new Error(`supabase ${what}: ${res.error.message}`);
  return res.data;
}

/**
 * Postgres-backed repo. Must use the service-role key (server only): the
 * `games` table has RLS with no policies, so only the service role can touch
 * it. After every write the sanitised projection goes to `game_public`,
 * which browsers may read and subscribe to via Realtime.
 */
export function supabaseRepo(
  url: string,
  serviceKey: string,
  client?: SupabaseLike,
  now: () => number = Date.now,
): GameRepo {
  const db: SupabaseLike =
    client ?? (createClient(url, serviceKey, { auth: { persistSession: false } }) as unknown as SupabaseLike);

  async function writePublic(g: GameState) {
    check(await db.from("game_public").upsert({ code: g.code, state: toPublicState(g, now()) }), "write game_public");
  }

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
      await writePublic(g);
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
      await writePublic(g);
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
      const codes = (rows ?? []).map((r) => r.code);
      if (codes.length > 0) check(await db.from("game_public").delete().in("code", codes), "delete game_public");
      return codes.length;
    },

    async ping() {
      check(await db.from("games").select("code").limit(1), "ping");
    },
  };
}
