# Desert Island Maths Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first playable of a teacher-run, Catan-style classroom maths game: teams share a desert island, solve maths problems to harvest and build, and exactly one team escapes first or wins on points.

**Architecture:** A pure, I/O-free game engine (`lib/engine`) holds every rule and is fully unit-tested. A repository interface has an in-memory implementation for tests and a Supabase implementation for production. Next.js route handlers are the only writers, so correct answers never reach browsers; clients fetch a stripped public state from a Next.js endpoint, nudged by a Supabase Realtime Broadcast ping and backed by automatic polling. No table is readable with the public anon key.

**Tech Stack:** Next.js (App Router) + TypeScript, Tailwind, Vitest, Supabase (Postgres + Realtime), Vercel (hosting and cron), GitHub.

**Spec:** `docs/superpowers/specs/2026-11-24-desert-island-maths-design.md`

## Global Constraints

- Next.js App Router with TypeScript on Vercel; Supabase free tier for data and realtime.
- Join codes are 6 uppercase characters with ambiguous characters removed (no O, 0, I, 1), unique among active games.
- Up to 8 teams per game and up to 6 devices per team. Joining locks when round 1 starts.
- Teacher access is a single password in an environment variable. There are no student accounts. Only team names are stored.
- Games and teams are deleted 24 hours after creation. A daily cron keeps the Supabase project from pausing.
- Quick game is about 10 minutes (6 rounds). Standard game is about 20 minutes (11 rounds). A round is about 1.5 to 2 minutes.
- Questions cover units 1 to 15 of the Cambridge Lower Secondary Maths Learner's Book and are toggled per game. A unit is "ready" at 12 or more templates, with 4 or more per difficulty level (1 to 3).
- Correct answers are checked on the server and are never sent to a browser before reveal. Each team receives different generated numbers.
- Every question, scenario and worked solution is written fresh. Textbook files and text never enter the repo or the site.
- Only the captain's submission counts, except after the timer ends, when any teammate's device may submit.
- Commit messages end with the attribution trailer lines required by the session's attribution reminder.

## Review Focus

1. A student types an awkward answer ("1,5", " 50 % ", "½", "", "1e999", "abc"): never crashes, never marks a wrong form correct. Pinned in Task 2.
2. Two devices of one team, or one captain, submit at the same moment or twice: exactly one submission is kept. Pinned in Task 6.
3. Host presses Reveal with no submissions, presses Next round during reveal, or ends the game twice: no state corruption, repeat calls are harmless. Pinned in Task 6 and Task 9.
4. One team only, or more teams than zones (1 to 8 teams): zones, hazard threshold and raider all still work. Pinned in Task 5 and Task 8.
5. A device refreshes mid-round, or the host laptop reloads: the stored token restores the session, and an expired token is rejected cleanly. Pinned in Task 9 and Task 11.
6. A team tries to build or exchange with resources it does not have, or two actions race: resources never go negative. Pinned in Task 7.

---

## File Structure

```
app/                         pages and route handlers
  api/games/route.ts         create game
  api/games/[code]/{join,host,team,state}/route.ts
  api/cron/{keepalive,cleanup}/route.ts
  host/[code]/page.tsx   projector/[code]/page.tsx   play/[code]/page.tsx   page.tsx
lib/types.ts                 shared types
lib/rng.ts  lib/answers.ts   seeded random; answer parsing and checking
lib/config.ts                tunable game numbers
lib/questions/{types,generate,ready}.ts
content/units/unit-11.ts     sample bank (first playable); one file per unit
lib/engine/{game,round,build,hazard,win,public}.ts
lib/repo/{types,memory,supabase}.ts   lib/auth.ts
lib/client/{useGameState.ts,api.ts}
supabase/migrations/0001_init.sql
tests/**                     mirrors lib/ and app/api
scripts/{simulate.ts,loadcheck.ts}
README.md
```

---

### Task 1: Scaffold and tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.env.example`, `app/page.tsx`, `tests/smoke.test.ts`

**Interfaces:**
- Produces: `npm test` runs Vitest; `npm run build` builds Next.js; `.gitignore` excludes `*.pdf`, `.env*` (except `.env.example`), `node_modules`.

- [ ] **Step 1:** Create a Next.js (App Router, TypeScript, Tailwind) project in the current repo root, keeping the existing `docs/` folder and the existing `.gitignore` entries (add to it, never remove). Vitest uses the `node` environment by default, includes `tests/**/*.test.{ts,tsx}`, and defines a `@/` path alias for the repo root; UI tests opt into jsdom with a `// @vitest-environment jsdom` docblock.
- [ ] **Step 2:** Write `tests/smoke.test.ts` asserting `1 + 1 === 2`; run `npx vitest run` and see it pass.
- [ ] **Step 3:** `.env.example` lists `TEACHER_PASSWORD`, `TOKEN_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` with no values.
- [ ] **Step 4:** Run `npm run build`; expect success. Commit `chore: scaffold app`.

### Task 2: Seeded random and answer checking

**Files:**
- Create: `lib/rng.ts`, `lib/answers.ts`
- Test: `tests/rng.test.ts`, `tests/answers.test.ts`

**Interfaces:**
- Produces:
  - `makeRng(seed: string): () => number` (deterministic, values in [0,1))
  - `type AnswerFormat = {kind:'integer'} | {kind:'decimal'; places:number} | {kind:'fraction'} | {kind:'percent'} | {kind:'choice'; options:string[]}`
  - `parseNumeric(input: string, format: AnswerFormat): number | null`
  - `isCorrect(input: string, expected: number | string, format: AnswerFormat): boolean`

- [ ] **Step 1: Failing tests.** `rng`: same seed gives same first 5 values; different seeds differ. `answers`: `isCorrect('1/2', 0.5, {kind:'fraction'})` is true; `'0.5'`, `'50%'` also true when the format allows (fraction and percent formats accept each other's spellings); `'1,5'` parses as 1.5 (comma decimal); `' 50 % '` is true for 0.5 percent; `''`, `'abc'`, `'1e999'`, `'1/0'` return `null` from `parseNumeric` and false from `isCorrect`; decimal format with `places:2` accepts 3.14 for 3.1416 but not 3.2; choice format compares the option string exactly.
- [ ] **Step 2:** Run `npx vitest run tests/rng.test.ts tests/answers.test.ts`; expect FAIL (modules missing).
- [ ] **Step 3:** Implement with `mulberry32` seeded from a string hash; parsing trims, normalises comma decimals and the percent sign, rejects non-finite and division by zero.
- [ ] **Step 4:** Run the tests; expect PASS. Commit `feat: rng and answer checking`.

### Task 3: Question templates, generation, readiness, sample unit

**Files:**
- Create: `lib/questions/types.ts`, `lib/questions/generate.ts`, `lib/questions/ready.ts`, `content/units/unit-11.ts`, `content/units/index.ts`
- Test: `tests/questions.test.ts`

**Interfaces:**
- Consumes: `makeRng`, `AnswerFormat`
- Produces:
  - `type Resource = 'water'|'food'|'wood'|'stone'`; `type ZoneId = 'beach'|'forest'|'cave'|'hills'|'lagoon'`; `type Difficulty = 1|2|3`
  - `interface QuestionTemplate { id:string; unit:number; difficulty:Difficulty; resource:Resource; format:AnswerFormat; params(rng:()=>number):Record<string,number>; prompt(p:Record<string,number>, zone:ZoneId):string; expected(p):number|string; solution(p):string; options?(p):string[]; figureSvg?(p):string }`
  - `generateQuestion(t: QuestionTemplate, zone: ZoneId, seed: string): { publicQ: PublicQuestion; expected: number|string; solution: string }` where `PublicQuestion = { templateId; unit; difficulty; resource; format; prompt; options?; figureSvg? }` (no answer fields)
  - `pickTemplates(units:number[], count:number, seed:string, bank=ALL_TEMPLATES): QuestionTemplate[]` (covers every selected unit before repeating; difficulty rises with position)
  - `unitReadiness(unit:number, bank?): { ready:boolean; count:number; perDifficulty:Record<Difficulty,number> }`
  - `ALL_TEMPLATES: QuestionTemplate[]` from `content/units/index.ts`

- [ ] **Step 1: Failing tests.** For every template in the bank: `generateQuestion` with seeds `'a'` and `'b'` gives different `prompt` text for at least 90% of templates; `parseNumeric(String(expected))` or the option string passes `isCorrect`; `publicQ` has no `expected` or `solution` key. `unitReadiness(11).ready` is true with at least 12 templates and at least 4 per difficulty; `unitReadiness(5).ready` is false. `pickTemplates([11], 11, 's')` returns 11 templates with no repeat until the bank is exhausted, and difficulty never decreases across the first third to the last third.
- [ ] **Step 2:** Run `npx vitest run tests/questions.test.ts`; expect FAIL.
- [ ] **Step 3:** Implement the generator and readiness. Write about 20 original Unit 11 (ratio and proportion) templates: rationing water or food among a group, splitting supplies in a ratio, direct and inverse proportion (days of supplies if people leave or arrive), scaling a rope or wood requirement, and market exchange rates. Spread difficulty 1 to 3 and tag each with a resource. Wrap every prompt in survival wording that varies by zone.
- [ ] **Step 4:** Run tests; expect PASS. Commit `feat: question engine and unit 11 sample bank`.

### Task 4: Config, zones, builds, state types

**Files:**
- Create: `lib/types.ts`, `lib/config.ts`
- Test: `tests/config.test.ts`

**Interfaces:**
- Produces in `lib/types.ts`:
  - `type GameLength = 'quick'|'standard'`; `type Phase = 'lobby'|'question'|'reveal'|'tiebreak'|'finished'`
  - `type BuildId = 'shelter'|'fire'|'waterStore'|'watchtower'|'raft1'|'raft2'|'raft3'`
  - `type Stock = Record<Resource, number>`
  - `interface Team { id:string; name:string; zone:ZoneId; devices:string[]; captainIndex:number; stock:Stock; builds:BuildId[]; sp:number; fundGiven:number }`
  - `interface RoundState { n:number; startedAt:number; endsAt:number; roll:number; bonusResource:Resource|null; raider:boolean; hazard:boolean; questions:Record<string,{publicQ:PublicQuestion; expected:number|string; solution:string}>; submissions:Record<string,{answer:string; deviceId:string; at:number; correct?:boolean}>; suggestions:Record<string,{deviceId:string; answer:string}[]> }`
  - `interface GameState { code:string; version:number; createdAt:number; units:number[]; length:GameLength; timerSeconds:number; seed:string; phase:Phase; teams:Team[]; round:RoundState|null; roundsPlayed:number; fund:Stock; winnerId:string|null; tiedIds:string[]; log:string[] }`
- Produces in `lib/config.ts` (all tunable, one place): `ROUNDS: Record<GameLength, number> = {quick:6, standard:11}`; `ZONES: Record<ZoneId, {name:string; easy:Resource[]; short:Resource[]}>` per the spec table; `START_STOCK: Stock = {water:2, food:2, wood:2, stone:2}`; `YIELD: Record<Difficulty, number> = {1:2, 2:3, 3:4}`; `BUILDS: Record<BuildId, {cost:Partial<Stock>; sp:number; requires?:BuildId}>` with shelter wood3 stone2 sp2; fire wood2 stone1 sp1; waterStore stone3 water2 sp2; watchtower wood4 stone4 sp3; raft1 wood3 food2 sp1; raft2 (requires raft1) wood4 water2 sp1; raft3 (requires raft2) wood5 stone2 food2 sp1; `MARKET = {base:3, bonusGet:4, bonusGive:2}`; `HAZARD_EVERY = 4`; `HAZARD_THRESHOLD_PER_TEAM = 2`; `MAX_TEAMS = 8`; `MAX_DEVICES = 6`.

- [ ] **Step 1: Failing test.** Every `BUILDS[x].requires` exists; every cost resource is a valid `Resource`; `ZONES` has 5 entries and every resource is "easy" in at least one zone; `ROUNDS.quick < ROUNDS.standard`.
- [ ] **Step 2:** Run test; expect FAIL. **Step 3:** Write types and config. **Step 4:** Run; expect PASS. Commit `feat: shared types and tunable config`.

### Task 5: Game lifecycle (create, join, lock, zones, captain)

**Files:**
- Create: `lib/engine/game.ts`
- Test: `tests/engine/game.test.ts`

**Interfaces:**
- Consumes: types and config from Task 4.
- Produces:
  - `createGame(opts:{units:number[]; length:GameLength; timerSeconds:number; seed:string; code:string; now:number}): GameState`
  - `generateCode(rng:()=>number, taken:Set<string>): string`
  - `addTeam(g:GameState, name:string, deviceId:string): {g:GameState; teamId:string}` (throws if locked, over `MAX_TEAMS`, or empty name after trim)
  - `joinTeam(g, teamId, deviceId): GameState` (idempotent for the same device; throws over `MAX_DEVICES`)
  - `startGame(g: GameState): GameState` (needs at least 1 team; locks joining; assigns zones randomly from the seed, using zones round-robin when teams exceed 5)
  - `captainOf(t:Team): string` (device id at `captainIndex`)
  - `setCaptain(g, teamId, deviceIndex): GameState`
  - `renameTeam(g, teamId, name)`, `removeTeam(g, teamId)` (lobby only)

- [ ] **Step 1: Failing tests.** Code is 6 characters from an alphabet with no `O0I1`, and unique against `taken` over 1000 draws. `addTeam` after `startGame` throws. 9th team throws. 7th device throws; same device twice is a no-op. With 1 team and with 8 teams, `startGame` assigns valid zones; with 8 teams no zone is used more than 2 times. Captain starts at the first device, `setCaptain` changes it, and out-of-range index throws.
- [ ] **Step 2:** Run `npx vitest run tests/engine/game.test.ts`; expect FAIL. **Step 3:** Implement as pure functions returning new state with `version + 1`. **Step 4:** Run; expect PASS. Commit `feat: game lifecycle`.

### Task 6: Round flow (roll, submit, reveal, harvest)

**Files:**
- Create: `lib/engine/round.ts`
- Test: `tests/engine/round.test.ts`

**Interfaces:**
- Consumes: Tasks 3, 4, 5.
- Produces:
  - `startRound(g: GameState, now: number): GameState` (phase `question`; island roll 1 to 6 from the seed and round number: 1 to 4 sets `bonusResource` to water, food, wood, stone; 5 is calm; 6 sets `raider`; `hazard` is true when the round number is a multiple of `HAZARD_EVERY`; generates one question per team: `pickTemplates(units, ROUNDS[length], seed)` is called once per game (when round 1 starts) and the result is stored in game state or recomputed deterministically; round n uses entry n-1 for every team, and teams differ only by the per-team seed `${g.seed}:${team.id}:${n}` passed to `generateQuestion`, rotating captains by advancing every team's `captainIndex` by 1 modulo its device count from round 2 onward; this overrides a manual `setCaptain`)
  - `submitAnswer(g, teamId, deviceId, answer:string, now:number): GameState` (accepts only the captain before `endsAt`, or any teammate after `endsAt`; first accepted submission wins and later ones throw `AlreadySubmitted`)
  - `revealRound(g: GameState): GameState` (marks each submission correct or not; harvest: correct gives `YIELD[difficulty]` of the question's resource, plus 1 if that resource is the round's `bonusResource`; wrong gives 0; the team with the lowest SP, ties broken by lowest total stock, gets +1 of `ZONES[zone].easy[0]`; phase `reveal`; revealing twice returns the same state)
  - `nextAllowed(g): boolean` (false while phase is `question`)

- [ ] **Step 1: Failing tests.** Captain's answer counts and a non-captain's is rejected before the timer; after `endsAt` a non-captain's counts; a second submission by the same team throws `AlreadySubmitted` and leaves state unchanged. `revealRound` on a round with zero submissions leaves every team with 0 harvest (except the catch-up bonus) and does not throw. Revealing twice equals revealing once (stock identical). Correct difficulty-3 answer yields 4, and 5 if it is the bonus resource. The same seed and round number always give the same roll. `startRound` during `question` phase throws.
- [ ] **Step 2:** Run; expect FAIL. **Step 3:** Implement. **Step 4:** Run; expect PASS. Commit `feat: round flow and harvest`.

### Task 7: Building and market

**Files:**
- Create: `lib/engine/build.ts`
- Test: `tests/engine/build.test.ts`

**Interfaces:**
- Produces:
  - `canAfford(stock: Stock, cost: Partial<Stock>): boolean`
  - `buildItem(g: GameState, teamId: string, id: BuildId): GameState` (only in `reveal` phase; throws `CannotAfford`, `AlreadyBuilt`, or `MissingRequirement`; adds SP; builds `raft3` set no winner here, `checkWinner` does that)
  - `marketRate(g: GameState, give: Resource, get: Resource): number` (units of `give` per 1 of `get`: `MARKET.base`, `MARKET.bonusGet` if `get` is the round's bonus resource, `MARKET.bonusGive` if `give` is)
  - `exchange(g: GameState, teamId: string, give: Resource, get: Resource, amountGet: number): GameState` (reveal phase only; throws if `give === get`, `amountGet` is not a positive integer, or unaffordable)

- [ ] **Step 1: Failing tests.** Building with insufficient stock throws and leaves stock unchanged; building `raft2` before `raft1` throws `MissingRequirement`; building the same item twice throws; stock never goes negative across a sequence of 50 random valid or invalid actions (property-style loop with a fixed seed). `marketRate` returns 3, 4 and 2 in the three cases. `exchange` of 2 food for water with rate 3 costs 6 food.
- [ ] **Step 2:** Run; expect FAIL. **Step 3:** Implement. **Step 4:** Run; expect PASS. Commit `feat: building and market`.

### Task 8: Hazards, raider, winner, end of game

**Files:**
- Create: `lib/engine/hazard.ts`, `lib/engine/win.ts`
- Test: `tests/engine/hazard.test.ts`, `tests/engine/win.test.ts`

**Interfaces:**
- Produces:
  - `contribute(g: GameState, teamId: string, res: Resource, amount: number): GameState` (reveal phase; moves stock into `g.fund`; adds to `team.fundGiven`)
  - `resolveHazard(g: GameState): GameState` (only when `round.hazard`; threshold `HAZARD_THRESHOLD_PER_TEAM * teams.length` total units in `fund`; met: the top contributor gets +1 SP; not met: every team loses 2 units of its largest stock; fund and `fundGiven` reset either way; idempotent per round)
  - `resolveRaider(g: GameState): GameState` (only when `round.raider`; the team with the highest SP, ties by highest stock, loses 2 units of its largest stock; idempotent per round)
  - `checkWinner(g: GameState): GameState` (immediate win when a team has `raft3`; if two finish in the same check, the one with more SP wins, else the one with more stock, else both go to `tiedIds`; at the final round with no raft winner, highest SP wins, ties go to `tiedIds`)
  - `startTiebreak(g, now)` and `finishTiebreak(g)` (one extra question to tied teams only; the correct team wins; if none or all are correct, the highest stock wins, then a seeded pick)
  - `endRoundIfLast(g: GameState): GameState`

- [ ] **Step 1: Failing tests.** Hazard with 5 teams needs 10 units; 9 units fails and every team loses 2 of its largest stock; 10 units passes and top contributor gains 1 SP; with 1 team the threshold is 2. Calling `resolveHazard` twice in a round changes nothing the second time. Raider hits only the SP leader. `checkWinner` ends the game immediately on `raft3`; at the last round with SP 5 vs 4, the 5 wins; equal SP puts both in `tiedIds`; tiebreak with one correct answer picks that team; a team's `fundGiven` resets after a hazard.
- [ ] **Step 2:** Run; expect FAIL. **Step 3:** Implement. **Step 4:** Run; expect PASS. Commit `feat: hazards, raider and winner logic`.

### Task 9: Persistence, auth tokens, public state

**Files:**
- Create: `lib/repo/types.ts`, `lib/repo/memory.ts`, `lib/repo/supabase.ts`, `lib/auth.ts`, `lib/engine/public.ts`, `supabase/migrations/0001_init.sql`
- Test: `tests/repo.test.ts`, `tests/auth.test.ts`, `tests/public.test.ts`

**Interfaces:**
- Produces:
  - `interface GameRepo { create(g:GameState):Promise<void>; get(code:string):Promise<GameState|null>; save(g:GameState, expectedVersion:number):Promise<void>; activeCodes():Promise<Set<string>>; deleteOlderThan(ms:number):Promise<number>; ping():Promise<void> }`; `save` throws `VersionConflict` when the stored version differs.
  - `memoryRepo(): GameRepo` and `supabaseRepo(url:string, serviceKey:string): GameRepo`
  - `signToken(payload:{role:'host'|'team'; code:string; teamId?:string; deviceId?:string}, secret:string, ttlMs:number, now:number): string` and `verifyToken(token:string, secret:string, now:number): payload | null` (HMAC; expired or tampered gives null)
  - `toPublicState(g: GameState, now: number): PublicGameState` (no `seed`, no `expected`, no `solution` before reveal; solutions and correctness appear only in phase `reveal` and later)
- Migration (ruling after Task 9 review: no public table, no anon access at all): only `games(code text primary key, state jsonb not null, version int not null, created_at timestamptz not null)` with RLS enabled, NO policies, `revoke all on public.games from anon, authenticated`, and an index on `created_at`. Anon browsers never read the database; the server reads with the service role and serves `toPublicState` from an endpoint.
  - `interface Notifier { notify(code: string, version: number): Promise<boolean> }`, `noopNotifier()` and `supabaseNotifier(url: string, serviceKey: string, fetchImpl?: typeof fetch): Notifier` in `lib/repo/notify.ts`: POSTs one Realtime Broadcast message (`topic: "game:<code>"`, `event: "version"`, `payload: {version}`, `private: false`) to `${url}/realtime/v1/api/broadcast`; never throws (returns false on any failure).

- [ ] **Step 1: Failing tests.** Memory repo `save` with a stale version throws `VersionConflict`; `deleteOlderThan` removes only games older than the cutoff. Tokens: tampered, expired, wrong-secret, and wrong-code tokens all verify as null; a valid host token verifies. `toPublicState` during `question` phase contains no string equal to any `solution`, and no string equal to any `expected` for non-choice questions (deep scan over a game with 5 teams); for choice questions the correct option is one of the displayed options, so assert instead that no field in the public state marks which option is correct before reveal, and after `revealRound` it contains the solutions and each team's correctness.
- [ ] **Step 2:** Run; expect FAIL. **Step 3:** Implement. Supabase repo uses the service-role client and an update filtered on `version` for optimistic locking, and writes `game_public` after every save. **Step 4:** Run; expect PASS. Commit `feat: persistence, tokens and public state`.

### Task 10: API route handlers

**Files:**
- Create: `app/api/games/route.ts`, `app/api/games/[code]/{join,host,team,state}/route.ts`, `lib/api/handlers.ts`
- Test: `tests/api.test.ts`

**Interfaces:**
- Consumes: Tasks 3 to 9.
- Produces (`lib/api/handlers.ts`, framework-free so tests can call them with a memory repo):
  - `createGameHandler(repo, env, body:{password:string; units:number[]; length:GameLength; timerSeconds:number}, now): {code:string; hostToken:string}` (rejects a wrong password, a unit outside 1 to 15, an empty unit list)
  - `joinHandler(repo, env, code, body:{teamName?:string; teamId?:string; deviceId:string}, now): {teamId:string; teamToken:string}`
  - `hostActionHandler(repo, env, code, token, action:{type:'start'|'next'|'reveal'|'extend'|'skip'|'end'|'setCaptain'|'rename'|'remove'|'override'; ...}, now): PublicGameState`
  - `teamActionHandler(repo, env, code, token, action:{type:'submit'|'build'|'exchange'|'contribute'|'suggest'; ...}, now): PublicGameState`
  - `stateHandler(repo, code, now): PublicGameState` (no token needed; public only; computed from the stored game with `toPublicState`)
  - `teamSuggestionsHandler(repo, env, code, token): {suggestions: {deviceId?: never; answer: string}[]}` (team-token authenticated; returns only the caller's own team's suggestions; route `app/api/games/[code]/suggestions/route.ts`).
  - After every successful save the handler calls `notifier.notify(code, version)` (handlers take a `Notifier` dependency; failures are ignored). Handlers skip `save` when the engine returned the same state object. They re-read the game after any non-`VersionConflict` save error. Seeds are generated with `crypto.randomBytes(16).toString('hex')`. Tokens carry `createdAt` of the game in the payload and the handler compares it; token TTL is at most 24 hours. The `TOKEN_SECRET` must be at least 32 characters. Answer strings are capped at 40 characters at the route layer.
  - Each handler loads, applies engine functions, saves with the version check, and retries once on `VersionConflict`.
  - **Ordering rules (ruling):** `resolveRaider` runs inside host `reveal`. Contributions to the fund are only possible in the `reveal` phase, so `resolveHazard` for a hazard round runs when the host presses `next` (before the next round starts) and at game end, never at `reveal`. `checkWinner` runs after every team `build`, after host `reveal`, and after `resolveHazard`. On `next`: resolve the previous round's hazard, check the winner, then start the next round, or finish when `roundsPlayed` equals `ROUNDS[length]` (calling `startTiebreak` when `tiedIds` is non-empty).
  - Small engine additions this task owns, in `lib/engine/host.ts` with tests: `extendTimer(g, seconds)`, `skipQuestion(g, now)` (replaces the current round's questions with fresh ones for the same units), `overrideTeam(g, teamId, patch:{stock?:Partial<Stock>; sp?:number})` (logged), `endGame(g)` (idempotent; applies `resolveHazard` then final winner logic), and `suggestAnswer(g, teamId, deviceId, answer)` (stores into `round.suggestions`; any teammate device, question phase only).
  - The 20-per-minute join rate limit in the first draft is dropped (serverless instances share no counter); `MAX_TEAMS` and `MAX_DEVICES` bound abuse.
- Next.js route files only parse the request, call the handler, and map thrown engine errors to 400/401/404/409.

- [ ] **Step 1: Failing tests.** Full flow through handlers with `memoryRepo`: create, 5 teams join, start, round, 5 submits, reveal, build, end. Wrong teacher password gives an auth error; a team token cannot call a host action; a host token for another game is rejected; `state` for an unknown code returns not-found; a non-captain `submit` before the timer is rejected; host `reveal` with zero submissions succeeds; host `next` during `question` fails without changing state; `end` twice is harmless; `override` can set a team's stock and SP and is logged.
- [ ] **Step 2:** Run `npx vitest run tests/api.test.ts`; expect FAIL. **Step 3:** Implement handlers and thin routes; rate-limit joins to 20 per minute per code (in repo-level counter). **Step 4:** Run; expect PASS. Commit `feat: api handlers`.

### Task 11: Client state hook with realtime and polling fallback

**Files:**
- Create: `lib/client/useGameState.ts`, `lib/client/api.ts`, `lib/client/storage.ts`
- Test: `tests/client.test.ts`

**Interfaces:**
- Produces:
  - `useGameState(code: string): { state: PublicGameState | null; status: 'live'|'polling'|'offline' }` (subscribes to the Supabase Realtime Broadcast channel `game:<code>` with the public anon key and, on every `version` ping, fetches `/api/games/[code]/state`; it also fetches every 5 seconds as a safety net; if the channel errors or is silent for 5 seconds it polls every 2 seconds; it ignores any fetched state whose `version` is lower than one already shown; returns to live when the channel recovers)
  - `storage.ts`: `saveSession(code, session)`, `loadSession(code)`, `clearSession(code)` (try/catch around localStorage; falls back to memory)
  - `api.ts`: typed `post()` helpers for host and team actions, attaching the stored token

- [ ] **Step 1: Failing tests** (with a fake Realtime channel and fake timers): state updates on a pushed message; after 5 seconds of silence the hook switches to polling; a recovered channel switches back; `loadSession` returns null when localStorage throws; an expired-token response clears the stored session.
- [ ] **Step 2:** Run; expect FAIL. **Step 3:** Implement. **Step 4:** Run; expect PASS. Commit `feat: realtime client with polling fallback`.

### Task 12: Team screen

**Files:**
- Create: `app/play/[code]/page.tsx`, `app/page.tsx` (join screen), `components/team/*.tsx`
- Test: `tests/ui/team.test.tsx`

**Interfaces:**
- Consumes: `useGameState`, `api.ts`.
- Produces: join screen (code, then create team or pick team); team screen showing zone and story, current problem, answer input (numeric keypad for numeric formats, buttons for choice), captain badge, suggest-an-answer button for non-captains, own stock, build buttons (disabled when unaffordable), market form, fund contribution, compact scoreboard, reveal view with solution.

- [ ] **Step 1: Failing component tests** (React Testing Library): non-captain sees "Suggest" and no "Submit"; a build button is disabled when stock is short; reveal view shows the worked solution; offline status shows a reconnecting banner; a stored session auto-rejoins on reload.
- [ ] **Step 2:** Run; expect FAIL. **Step 3:** Implement mobile-first with Tailwind. **Step 4:** Run; expect PASS. Commit `feat: team screen`.

### Task 13: Host screen and projector view

**Files:**
- Create: `app/host/[code]/page.tsx`, `app/projector/[code]/page.tsx`, `app/host/page.tsx` (create game), `components/host/*.tsx`
- Test: `tests/ui/host.test.tsx`

**Interfaces:**
- Produces: create-game form (teacher password, unit toggles 1 to 15 with presets "all" and "none", per-unit ready badge from `unitReadiness`, warning before start when a selected unit is not ready, game length quick or standard, timer seconds); host controls (lobby with team list and rename or remove, start, next round, reveal, extend timer, skip question, end, reassign captain, manual override); projector view (island with team zones, scoreboard with SP, stock and raft progress, island roll, hazard fund progress, timer, reveal animation).

- [ ] **Step 1: Failing tests.** A not-ready unit shows a warning and starting asks for confirmation; toggling "all" selects 1 to 15; "Next round" is disabled during `question` phase; the host token persists across reload; projector shows no answers before reveal.
- [ ] **Step 2:** Run; expect FAIL. **Step 3:** Implement. **Step 4:** Run; expect PASS. Commit `feat: host and projector screens`.

### Task 14: Cron jobs

**Files:**
- Create: `app/api/cron/keepalive/route.ts`, `app/api/cron/cleanup/route.ts`, `vercel.json`
- Test: `tests/cron.test.ts`

**Interfaces:**
- Consumes: `GameRepo.ping`, `GameRepo.deleteOlderThan`.
- Produces: both routes require `Authorization: Bearer ${CRON_SECRET}`; keepalive calls `ping`; cleanup calls `deleteOlderThan(24 * 3600 * 1000)`; `vercel.json` schedules keepalive daily and cleanup daily.

- [ ] **Step 1: Failing tests.** Missing or wrong secret gives 401; cleanup removes only games older than 24 hours; keepalive returns 200.
- [ ] **Step 2:** Run; expect FAIL. **Step 3:** Implement. **Step 4:** Run; expect PASS. Commit `feat: cron jobs`.

### Task 15: Whole-game simulation and load check

**Files:**
- Create: `scripts/simulate.ts`, `scripts/loadcheck.ts`
- Test: `tests/simulate.test.ts`

**Interfaces:**
- Produces: `simulateGame(opts:{teams:number; length:GameLength; accuracy:number; seed:string}): {winnerId:string; roundsPlayed:number; byRaft:boolean}` driving the real handlers with a memory repo and bot teams that answer correctly with probability `accuracy`, build greedily, and contribute to hazards. `loadcheck.ts` connects 30 simulated clients to a deployed URL and reports state-propagation delay.

- [ ] **Step 1: Failing tests.** Across 200 seeded games with 5 teams: every game ends with exactly one winner; `quick` games never exceed 6 rounds and `standard` never exceed 11; with accuracy 0.8, at least 50% of standard games end by raft; the same team does not win more than 60% of games when all bots share accuracy 0.8; 1-team and 8-team games both finish; no resource is ever negative.
- [ ] **Step 2:** Run; expect FAIL. **Step 3:** Implement, then adjust only the `lib/config.ts` numbers (yields, costs, thresholds) until the balance assertions pass, noting each change in the commit message. **Step 4:** Run; expect PASS. Commit `test: whole-game simulation and balance`.

### Task 16: Deployment docs and repo hygiene

**Files:**
- Create: `README.md`, `docs/SETUP.md`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `docs/SETUP.md` with exact teacher steps (create GitHub repo, Supabase project, run the migration, set the six environment variables in Vercel, import the repo, check the live URL); a short guide to adding a unit's question file; a check script `npm run check:no-books` that fails if any `*.pdf` or large text file from a textbook is tracked by git.

- [ ] **Step 1:** Write a test in `tests/hygiene.test.ts` that fails if `git ls-files` contains any `.pdf`. Run; it passes on a clean repo and fails when a dummy PDF is staged.
- [ ] **Step 2:** Write the docs. **Step 3:** Run `npm test` and `npm run build`; expect all green. Commit `docs: setup guide and hygiene check`.

---

## Self-Review

- **Spec coverage:** join and teams (5, 9), zones and win conditions (4, 5, 8), round flow and harvest (6), market (7), hazards and raider (8), questions, readiness and formats (2, 3), teacher controls and overrides (10, 13), screens (12, 13), resilience and polling (11), privacy and cleanup (9, 14), load gate (15), setup and no-book rule (16). **Deferred by the spec and not planned here:** team-to-team trading, Decide questions, banks for units other than the sample, post-game summary, class-wide problem hazards.
- **Types:** `Resource`, `ZoneId`, `Difficulty` are defined in Task 3 and re-used in Tasks 4 to 8; `GameState`, `Team`, `RoundState` defined in Task 4 and used unchanged afterwards; handler names match between Tasks 10, 11 and 13.
- **Proportion:** the plan holds decisions, signatures and test assertions; engine bodies are left to the implementer.
