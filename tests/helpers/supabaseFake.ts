import type { SupabaseLike } from "@/lib/repo/supabase";

type Row = Record<string, unknown>;
type Filter = (r: Row) => boolean;

/** Primary key of each fake table. */
const PK: Record<string, string> = { games: "code" };

/**
 * A hand-written in-memory stand-in (rows are JSON-copied, as jsonb does) for the subset of the supabase-js client
 * that lib/repo/supabase.ts uses. Filtered updates and deletes only touch
 * matching rows; `.select()` after a write returns the affected rows; a
 * duplicate primary key on insert fails with Postgres code 23505.
 */
export function fakeSupabase() {
  const tables = new Map<string, Map<string, Row>>();
  const calls: string[] = [];
  const table = (name: string) => {
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name)!;
  };

  class Query implements PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }> {
    private filters: Filter[] = [];
    private returning = false;
    private max = Infinity;
    private single = false;
    constructor(
      private name: string,
      private op: "select" | "insert" | "update" | "delete",
      private payload?: Row,
    ) {
      if (op === "select") this.returning = true;
    }
    eq(col: string, v: unknown) {
      this.filters.push((r) => r[col] === v);
      return this;
    }
    lt(col: string, v: string) {
      this.filters.push((r) => Date.parse(String(r[col])) < Date.parse(v));
      return this;
    }
    select() {
      this.returning = true;
      return this;
    }
    limit(n: number) {
      this.max = n;
      return this;
    }
    maybeSingle() {
      this.single = true;
      return this;
    }
    private run() {
      calls.push(`${this.op} ${this.name}`);
      const t = table(this.name);
      const pk = PK[this.name];
      // jsonb semantics: what goes in is JSON text, so undefined fields vanish.
      const copy = (r: Row) => JSON.parse(JSON.stringify(r)) as Row;
      if (this.op === "insert") {
        const row = copy(this.payload!);
        const key = String(row[pk]);
        if (t.has(key)) {
          return { data: null, error: { message: "duplicate key value", code: "23505" } };
        }
        t.set(key, row);
        return { data: this.returning ? [copy(row)] : null, error: null };
      }
      const hit = [...t.values()].filter((r) => this.filters.every((f) => f(r)));
      if (this.op === "update") for (const r of hit) Object.assign(r, copy(this.payload!));
      if (this.op === "delete") for (const r of hit) t.delete(String(r[pk]));
      const rows = hit.slice(0, this.max).map(copy);
      if (!this.returning) return { data: null, error: null };
      if (this.single) return { data: rows[0] ?? null, error: null };
      return { data: rows, error: null };
    }
    then<A = never, B = never>(
      ok?: ((v: { data: unknown; error: { message: string; code?: string } | null }) => A | PromiseLike<A>) | null,
      bad?: ((e: unknown) => B | PromiseLike<B>) | null,
    ): PromiseLike<A | B> {
      return Promise.resolve().then(() => this.run()).then(ok, bad);
    }
  }

  const client: SupabaseLike = {
    from: (name: string) => ({
      select: () => new Query(name, "select"),
      insert: (row: Row) => new Query(name, "insert", row),
      update: (patch: Row) => new Query(name, "update", patch),
      delete: () => new Query(name, "delete"),
    }),
  };
  return { client, tables, calls, table };
}
