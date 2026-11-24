-- Desert Island Maths: initial schema.
--
-- How to run: in the Supabase dashboard open SQL Editor, paste this whole file
-- and press Run (or, with the Supabase CLI linked to the project, run
-- `supabase db push`). Run it once on an empty project.
--
-- Security model:
--   * games holds the full server-side state, including answers and the seed.
--     RLS is on and there are NO policies, so the anon (browser) key can neither
--     read nor write it. The server uses the service-role key, which bypasses RLS.
--   * game_public holds the sanitised projection (lib/engine/public.ts) that the
--     server writes after every change. Browsers may only SELECT it (and receive
--     Realtime changes for it); they cannot insert, update or delete.

create table if not exists public.games (
  code text primary key,
  state jsonb not null,
  version int not null,
  created_at timestamptz not null
);

create index if not exists games_created_at_idx on public.games (created_at);

create table if not exists public.game_public (
  code text primary key references public.games (code) on delete cascade,
  state jsonb not null
);

alter table public.games enable row level security;
alter table public.game_public enable row level security;

create policy "anon can read public game state"
  on public.game_public for select to anon using (true);

alter publication supabase_realtime add table public.game_public;
