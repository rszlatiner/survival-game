-- Desert Island Maths: initial schema.
--
-- How to run: in the Supabase dashboard open SQL Editor, paste this whole file
-- and press Run (or, with the Supabase CLI linked to the project, run
-- `supabase db push`). Run it once on an empty project.
--
-- Security model: there is one table, games, holding the full server-side
-- state (answers and seed included). RLS is on, there are NO policies and all
-- privileges are revoked from anon and authenticated, so the browser (anon)
-- key cannot read or write anything. Only the server, using the service-role
-- key (which bypasses RLS), touches it. Browsers get the sanitised state from
-- a Next.js endpoint and are nudged by a Realtime Broadcast ping, which needs
-- no table.

create table if not exists public.games (
  code text primary key,
  state jsonb not null,
  version int not null,
  created_at timestamptz not null
);

create index if not exists games_created_at_idx on public.games (created_at);

alter table public.games enable row level security;

revoke all on public.games from anon, authenticated;
