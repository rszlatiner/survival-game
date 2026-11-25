# Desert Island Maths: setup and teaching guide

This guide takes you from nothing to a game running in your classroom. You need free accounts on GitHub, Supabase and Vercel. You do not need to write code. Allow about 45 minutes the first time.

You will run the game from a laptop (the host screen) with a projector (the projector view), while students join from phones or tablets.

Keep three things secret and never type them into chat, email or a file in the repo: the teacher password, the `TOKEN_SECRET` and the Supabase service-role key.

---

## Part A. One-time setup

### 1. Put the code on GitHub

The code is already in a GitHub repository, `rszlatiner/survival-game`, which is currently public. If you work from a copy on your own computer, make sure it is pushed:

```bash
git remote -v          # should show https://github.com/rszlatiner/survival-game
git push origin build/first-playable
```

(Use whichever branch you want Vercel to deploy; see step 4.)

If you start from an empty repository instead: on github.com choose New repository, create it with no README, then in the project folder run `git remote add origin <the new repo URL>` and `git push -u origin <branch>`.

**Making the repository private later.** In GitHub open Settings, then General, then Danger Zone, then Change visibility. The game itself does not change and nothing breaks: the site on Vercel keeps running, because the code is already built. The one thing to check is that Vercel is allowed to read a private repo. In Vercel go to Settings, then Git, and make sure the GitHub integration is installed for your account with access to this repository (GitHub, Settings, Applications, Vercel, Configure, Repository access). If it lacks access, new pushes will not deploy until you grant it.

### 2. Create the Supabase project (free tier)

1. Go to supabase.com, sign in, and choose New project. Pick any name and region near you, set a database password (store it in a password manager; the game does not use it), and choose the Free plan.
2. Wait for the project to finish setting up.
3. Open SQL Editor, then New query. Open the file `supabase/migrations/0001_init.sql` from this repo, copy the whole file, paste it into the editor and press Run. It should say Success. Run it once only.

What this does, and why it is safe: it creates one table, `games`, which holds each game's full state including the correct answers. Row Level Security is switched on for the table, there are no policies, and all access is revoked from the `anon` and `authenticated` roles. That means a browser holding the public (anon) key cannot read or write the table at all. Only the game's server code, using the secret service-role key, can. Students get a cleaned-up copy of the game state (no answers) through the game's own server endpoints.

The anon key is used for one thing only: students' and the projector's browsers listen on the Realtime Broadcast channel `game:<code>` (for example `game:ABC234`). The server sends a short ping on that channel carrying only a version number, and browsers react by fetching the real state from the server. No game content travels over the channel, and if the channel is down the browsers fall back to asking the server every 2 seconds.

### 3. Collect the values you need

You need five values from Supabase and your own choices. In the Supabase dashboard open Project Settings, then API (on newer dashboards some keys are under API Keys):

- Project URL, for example `https://abcdefgh.supabase.co`
- the anon (public) key, a long string starting `eyJ` (newer projects may call it the publishable key; either works here)
- the service_role key, also a long string. Treat it like a password.

### 4. Create the Vercel project and set environment variables

1. Go to vercel.com and sign up with GitHub.
2. Choose Add New, then Project, and import the `survival-game` repository. Leave the framework as Next.js and the build settings as they are.
3. Before pressing Deploy, open Environment Variables and add all six below, with the names spelled exactly as shown. Add each to Production (tick Preview and Development as well if you want preview deployments to work).

| Name | Value | Kind |
|------|-------|------|
| `TEACHER_PASSWORD` | A long password you choose, at least 16 characters, for example three or four random words with digits. | Server-only secret |
| `TOKEN_SECRET` | At least 32 random characters. Generate one with `openssl rand -hex 32` and paste the output. | Server-only secret |
| `CRON_SECRET` | At least 32 random characters, generated the same way (a different value from `TOKEN_SECRET`). | Server-only secret |
| `SUPABASE_SERVICE_ROLE_KEY` | The service_role key from step 3. | Server-only secret. Never give it a `NEXT_PUBLIC_` name. |
| `NEXT_PUBLIC_SUPABASE_URL` | The Project URL from step 3. | Public (sent to browsers) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The anon key from step 3. | Public (sent to browsers) |

Notes:

- These six are all the variables the code reads. `.env.example` in the repo lists the same six names, empty.
- Anything starting `NEXT_PUBLIC_` is visible to every student's browser. That is fine for the URL and the anon key, which can do nothing to the `games` table. The service-role key must never be public.
- Choose a strong `TEACHER_PASSWORD`. The create-game and teacher login endpoints have no rate limit, so a long password is the only protection against someone guessing it.
- `CRON_SECRET` must be at least 32 characters. If it is missing or shorter, the two daily jobs (see below) silently answer HTTP 500 and do nothing, and the free Supabase project may be paused after about a week of inactivity, which would take the game offline.
- If you change an environment variable later, redeploy (Deployments, the three dots, Redeploy) for it to take effect.
- Never commit a file named `.env` or `.env.local` to GitHub. The repo's `.gitignore` already excludes them. For local development you copy `.env.example` to `.env.local` and fill it in.

4. Press Deploy. The first build takes a minute or two. Vercel gives you an address like `https://survival-game-xxxx.vercel.app`. Note it; this document calls it `<URL>`.

Two scheduled jobs run daily on Vercel (declared in `vercel.json`): `/api/cron/keepalive` touches the database so Supabase does not pause it, and `/api/cron/cleanup` deletes finished games after 24 hours (a game that is still running is never deleted; one nobody finished is removed after 90 days). Vercel sends `CRON_SECRET` as a Bearer token automatically when the variable is set.

### 5. Check the live site

Open each of these in a browser and tick them off:

- [ ] `<URL>/` shows the join screen with a Game code box.
- [ ] `<URL>/host` shows the create-game form. Enter your teacher password, tick unit 11 (the only unit with a full question bank so far; unit 1 is ticked by default and will show a not-ready warning), and create a game. You get a 6-character code.
- [ ] On a phone (on mobile data or school wifi), open `<URL>/`, type the code and create a team. It should join.
- [ ] `<URL>/projector/<CODE>` shows the projector view with your team on it.

If something shows "The server is not set up correctly", an environment variable is missing or misspelled; fix it in Vercel and redeploy.

### 6. Smoke test against the real services (do this once before any lesson)

The automated tests use in-memory fakes of the database and the broadcast endpoint. This step is the only time the real Supabase database and the real Broadcast endpoint are exercised, so do not skip it.

1. Create a game at `<URL>/host`. Open `<URL>/host/<CODE>` on the laptop and `<URL>/projector/<CODE>` in a second window.
2. Join with two devices (for example a phone and a second browser tab or a tablet): the first creates team 1, the second creates team 2.
3. On the host screen press Start game, then Next round.
4. Watch the second device. The new question should appear within a few seconds. Also press Reveal answers and check both devices update.
5. How to tell live updates from polling. The screens do not show a "live" badge (they only show an orange "Reconnecting" banner when offline). Live updates arrive almost instantly (well under a second) after you press a host button. In polling mode a change arrives at the next 2-second tick, so it is slightly delayed and uneven. To be certain, open the browser developer tools on a student device (Network tab, filter WS): a `realtime` websocket to your Supabase URL means the channel is connected. If you see no websocket, the game still works through polling. Realtime may show as polling after a device has been idle; that is expected and harmless.
6. Check the cron routes, from a terminal on your laptop (replace the placeholders; keep the quotes):

```bash
export CRON_SECRET='<the same CRON_SECRET you put in Vercel>'
curl -i -H "Authorization: Bearer $CRON_SECRET" <URL>/api/cron/keepalive
curl -i -H "Authorization: Bearer $CRON_SECRET" <URL>/api/cron/cleanup
```

   Both should answer `200`; keepalive returns `{"ok":true}` and cleanup returns `{"deleted":N}`. A `500` means `CRON_SECRET` is missing or under 32 characters. A `401` means the value you typed does not match.
7. Load gate. Make sure the throwaway game is in the question phase (you pressed Next round and have not revealed yet), then on a computer with Node 22 or later and this repo installed (`npm install`):

```bash
export LOADCHECK_TEACHER_PASSWORD='<your teacher password>'
export NEXT_PUBLIC_SUPABASE_URL='<Project URL>'
export NEXT_PUBLIC_SUPABASE_ANON_KEY='<anon key>'
npm run loadcheck -- <URL> <CODE>
```

   The arguments are `<URL> <CODE> [clients=30] [samples=5] [pollMs=2000]`, so the command above uses 30 simulated clients. The two `NEXT_PUBLIC_` lines are optional and make the simulated clients also listen on the Broadcast channel, like real browsers (the output says "with Broadcast"). Use `LOADCHECK_HOST_TOKEN` instead of the password if you prefer. The script sends five harmless "extend timer by 1 second" actions and reports how long it takes all 30 clients to see each change. It must print `PASS (p95 <= 3000 ms)`. If it prints FAIL, do not use the game in class until you find out why. Delete or ignore the throwaway game afterwards; finished games are removed automatically after 24 hours.

---

## Part B. Running a lesson

### Quickstart (5 steps)

1. **Create.** On your laptop go to `<URL>/host`, enter the teacher password, choose the unit(s), game length and timer (10 to 600 seconds, default 90), and press Create game. Note the 6-character code, then open the host screen at `<URL>/host/<CODE>`.
2. **Projector on.** Click Open projector view on the host screen (or go to `<URL>/projector/<CODE>`), put it on the projector and make it full screen. It shows the code, the teams and the scoreboard.
3. **Students join.** Students open `<URL>/` on a phone or tablet, type the code, and either create a team (first device; they choose the team name, no personal names are needed) or tap their team in the list. Up to 8 teams and 6 devices per team. New teams can only be created before the game starts; after that a late student can still join an existing team from another device.
4. **Run rounds.** Press Start game, then for each round: Next round, let teams work, Reveal answers, give time to spend and discuss, repeat. The captain's device submits the team's answer; teammates can send suggestions to the captain. After the reveal teams build, trade at the market and contribute to hazards on their own devices.
5. **End and winner.** The game ends on its own when a team completes the raft or the last round is revealed (the Next round button then reads Finish game). You can also press End game and confirm. The winner appears on the host and projector screens.

### What each host button does

- **Start game** (lobby): locks the creation of new teams and starts the game. Needs at least one team.
- **Next round**: starts a round: island roll, then a question for every team, with the timer running. After the last round it reads Finish game.
- **Reveal answers**: ends the question, shows the correct answer and a worked solution on every screen, harvests resources for correct answers and settles any hazard or raider event.
- **Extend timer** (type seconds, 1 to 600): adds time to the open question.
- **-10 s / -30 s** (while a question is open): cuts that much off the running question's timer. Each press cuts again; if the time runs out, teammates can submit as usual. Teams see the change on their next refresh (a second or two).
- **Time per question** (presets 15, 30, 45, 60, 90 and 120 seconds, or type your own, 10 to 600): sets the timer for all future rounds, in the lobby or between rounds. It never changes the question already running. You can also pick a preset when you create the game.
- **Skip question**: swaps in a fresh question from the chosen units, restarts the timer and clears submissions and suggestions so far.
- **End game**: asks you to confirm, then finishes with final scoring. If teams are tied it starts the tiebreak question instead (see below).
- **Team list**: rename or remove a team (remove asks for confirmation), and choose which device is the captain.
- **Manual override**: pick a team and set its resources and/or Survival Points to exact whole numbers (0 to 9999) if something goes wrong. It is logged.

### Ties

If the top teams are level on Survival Points and on total stock (or two teams complete the raft together and are level), the host screen shows Start tiebreak. Press it: only the tied teams get one question. Then press Reveal tiebreak result: a correct tied team wins, otherwise the winner is picked at random from the tied teams. If you press End game while a tie is pending, that starts the tiebreak, and pressing End game again during the tiebreak decides it immediately with the answers so far.

### Lost your host login

If you close the tab, refresh, or use another laptop, open `<URL>/host/<CODE>`. If the browser is not signed in as host it shows a Sign in again form: enter the teacher password and you take control again. The game state is stored on the server, so nothing is lost. A host sign-in never times out while the game is running; it only ends when the game is deleted. The New game page lists games this browser is still signed in to under "Resume your game". Always open the game from the same web address (the stored login belongs to that address).

### Quick versus standard

- Quick: 6 rounds, about 10 minutes at the default timer.
- Standard: 11 rounds, about 20 minutes at the default timer.

Create-game shows an estimate that adds about two minutes per round for reveal and spending. Plan a 45-minute lesson as: 5 minutes joining, a standard game, 10 minutes debrief. Use the debrief to go over the questions teams got wrong.

### Known limitations and playtest tuning

- Quick games use the same costs as standard games, so the raft rarely finishes in a quick game and quick games usually end after the last round with the most Survival Points winning.
- If several teams contribute equally to a hazard fund, the bonus point goes to the one with fewer Survival Points, and if still equal to the lowest team number.
- Team-to-team trading is not built yet (only the fixed-rate island market).
- Only unit 11 (ratio and proportion) has a question bank. A unit with fewer than 12 questions (4 at each difficulty level) is marked not ready and the create-game form warns you before you start. The other units need banks written; see Part C.
- Zone story text (the short island description each team sees) is placeholder wording.
- Costs, yields, hazard thresholds and round counts are first guesses. Run `npm run simulate` for rough balance tables and adjust `lib/config.ts` after you playtest.
- The Realtime channel may fall back to polling when idle; screens still update within about 2 seconds.

---

## Part C. Adding a unit's question bank

Each unit has one file in `content/units/`. Unit 11 (`content/units/unit-11.ts`) is the model to copy.

**The content rule.** Questions, scenarios and worked solutions must be written fresh. Textbooks are used only to see which topics and skills a unit covers, never copied, retyped or paraphrased closely. Never put textbook files or text into this repository (no PDFs, no scanned pages, no pasted passages). The repo checks this: `npm run check:no-books` fails if a `.pdf`, `.epub` or `.djvu` file, or any file under a directory named `book(s)` or `textbook(s)`, is tracked by git, and `npm test` runs the same check. `.gitignore` also blocks these file types.

### Steps

1. Copy `content/units/unit-11.ts` to `content/units/unit-NN.ts` (for example `unit-05.ts`) and rename the exported constant (for example `UNIT_5`). Replace the questions; keep the imports.
2. Each question is an object with the shape of `QuestionTemplate` (`lib/questions/types.ts`):
   - `id`: unique text, for example `u5-area-circle-01`
   - `unit`: the unit number (1 to 15), the same for the whole file
   - `difficulty`: `1`, `2` or `3`
   - `resource`: which resource a correct answer harvests, one of `water`, `food`, `wood`, `stone`
   - `format`: the answer type: `{ kind: "integer" }`, `{ kind: "decimal", places: 2 }`, `{ kind: "fraction" }`, `{ kind: "percent" }` or `{ kind: "choice", options: [] }`
   - `params(rng)`: picks the numbers. Use the helpers in `lib/questions/random.ts` (`int`, `coprimePair`, `gcd`) so results are repeatable. Choose numbers backwards from a clean answer.
   - `prompt(p, zone)`: the question text. Use `ZONE_WORDS[zone]` from `content/units/zones.ts` (as unit 11 does with `Z`) for island wording.
   - `expected(p)`: the correct answer, a number (or, for choice, the exact correct option text)
   - `solution(p)`: a short worked solution shown at reveal
   - `options(p)`: only for `choice` questions, the list of options (include the correct one; wrong options should be real mistakes)
   - `figureSvg(p)`: optional drawing as SVG text
3. Register the file in `content/units/index.ts`: import it and add it to `UNIT_BANKS` (for example `5: UNIT_5`).
4. A unit is ready when it has at least 12 templates with at least 4 at each of difficulty 1, 2 and 3 (`READY_MIN_TEMPLATES` and `READY_MIN_PER_DIFFICULTY` in `lib/questions/ready.ts`). About 24 or more is the target so questions do not repeat in a lesson. Difficulty guide: 1 is one step, 2 is two steps, 3 is multi-step or harder concepts.
5. Test: run `npm test`. `tests/questions.test.ts` runs every registered template for every zone over many seeds and checks answers, formats and prompts. Fix anything it reports. Then play a quick game on your computer (`npm run dev`) with that unit selected, and have a colleague check the maths.
6. Commit and push; Vercel redeploys automatically.
