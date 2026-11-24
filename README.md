# Desert Island Maths

A classroom maths game for a secondary class. Teams of students are stranded on an island zone, answer parameterised maths questions to harvest resources (water, food, wood, stone), build shelters and a raft, trade at a fixed-rate market and pool resources against shared hazards. The first team to finish the raft wins, otherwise the team with the most Survival Points after the last round. The teacher runs it from a laptop and a projector; students join from phones or tablets with a 6-character code and need no accounts.

Built with Next.js (App Router, TypeScript), Tailwind, Supabase (Postgres plus Realtime Broadcast) and Vercel.

## Deploying it

Follow [docs/SETUP.md](docs/SETUP.md): GitHub, Supabase, Vercel environment variables, a smoke test and a load check, then how to run a lesson and how to add question banks.

## Development quick start

```bash
npm install
cp .env.example .env.local      # fill in the six values; see docs/SETUP.md
npm run dev                      # http://localhost:3000
npm test                         # full test suite
npm run simulate                 # bot-played balance tables, no network
npm run check:no-books           # fails if a textbook file is tracked
```

Other scripts: `npm run build`, `npm run loadcheck -- <url> <code>` (against a deployed site only).

## Layout

- `app/` pages (`/` join, `/host`, `/host/<code>`, `/play/<code>`, `/projector/<code>`) and API routes under `app/api/`
- `components/` host, projector and team screens
- `lib/engine/` pure game rules (rounds, building, hazards, winning)
- `lib/api/` request handlers, validation and cron logic
- `lib/questions/` question types, generation and unit readiness
- `lib/repo/` game storage (in-memory and Supabase) and the broadcast notifier
- `lib/client/` browser helpers (API calls, realtime, polling)
- `content/units/` question banks, one file per unit (only unit 11 so far)
- `supabase/migrations/` database schema
- `scripts/` simulation, load check and the textbook check
- `tests/` automated tests
- `docs/` setup guide, design spec and plan

## Content rule

Questions, scenarios and worked solutions are written fresh. Textbooks are used only to model which topics a unit covers, never copied. Never commit textbook files or text: `npm run check:no-books` and `npm test` fail if a `.pdf`, `.epub` or `.djvu` file, or a file under a `books/` or `textbook/` directory, is tracked.
