# Desert Island Maths: Design (revision 2)

Date: 2026-11-24
Owner: Roger Szlatiner (Grade 8 Cambridge Lower Secondary / Checkpoint Maths teacher)
Status: Draft for approval

Notes on labels: anything marked **(my call)** was decided by the designer, not by the teacher. The teacher can overrule any of them. Everything else comes from the teacher's own words.

What changed since revision 1: the game is now **Catan-style** (teams work together but only one team wins), covers **all 15 Grade 8 units** with a per-unit toggle, assumes **about 5 teams of 5 with roughly one device per team**, and a complete game lasts **10 to 20 minutes**.

---

## 1. Intent and why

The teacher's Grade 8 students are "never into maths and think it's a waste of time." A game that only dresses drills in points would not change that. The goal is a whole-class game where **the maths is the thing that keeps you alive and gets you off the island**, so students feel a reason to do it, not just a reward for doing it.

The setting is a desert island. Teams of students are castaways sharing one island. They harvest, trade and build by solving maths problems that are really survival decisions. Like Catan, teams depend on the shared island and on each other, but **only one team wins**.

The teacher runs it live from the front of the class: teams join on a device with a code and see a scoreboard.

It must **adapt to whatever has just been taught**. The teacher toggles any combination of the 15 units, from one unit (simple) to all fifteen (hardest, full revision), and both the questions and the dynamics shift with the topic.

## 2. Goals

1. A teacher creates a game, toggles which of the 15 units are in, chooses a game length (quick about 10 minutes, standard about 20 minutes **(my call on the two presets)**), and gets a join code.
2. Teams of about 5 students join with the code and a team name, using about one device per team (extra devices per team allowed). No student accounts.
3. All teams share one island. Teams start in different places with different strengths and shortages, so each team's route to winning is different.
4. Rounds are **teacher-paced**: the teacher launches each round, teams solve, the teacher reveals, resources and scores update.
5. A live scoreboard (projector view and on every team's device) shows each team's resources, build progress and score.
6. **Exactly one team wins**, by escaping the island first or by having the most points when time runs out.
7. Teams are pulled into cooperating: shared island hazards need a pooled effort, and teams need resources other teams are better placed to get.
8. The question bank is data, organised by unit and aligned to the Cambridge Grade 8 Learners' Book / Teachers' Book objectives, so adding questions means editing data files, not code.
9. The whole thing deploys from a GitHub repo to Vercel, with Supabase for live data.
10. A teacher can change the unit mix between games in under a minute.
11. A full game, from join to winner, fits inside a 45-minute lesson with time left for setup and a debrief; two quick games can fit.

## 3. Non-goals

- No student accounts, logins or personal data. Team names only.
- No self-paced (Blooket-style race) mode in v1.
- No persistent cross-game leaderboards or student progress tracking in v1.
- No chat between students, no avatars, no user-generated content beyond a team name.
- No AI-generated questions at run time. Questions are written and checked in advance.
- No native apps. Browser only.
- Not a replacement for lessons. It is a practice, review and engagement tool.

## 4. Anti-goals (would make it a failure even if it technically works)

- **A quiz in costume.** If the story could be removed and nothing changes, it failed. Decisions, shortages, trade-offs and shared hazards must matter.
- **The same team always winning.** No large speed bonuses, and a catch-up mechanic helps trailing teams. A leader can be targeted, but a weak team must always have a route back into the game.
- **One strong student doing everything.** Roles rotate inside teams.
- **Students sitting out.** Nobody is eliminated. A team that is struggling gets help mechanics, not removal.
- **A winner decided by luck.** Luck adds tension and swings, but a team that does the maths well should win most games.
- **Tech that fails mid-lesson.** A frozen or unjoinable game in front of a class is worse than no game.
- **Answers readable from the browser.** If students can find answers in dev tools or network traffic, the game is pointless.
- **Copying from neighbours.** Two teams must not see identical numbers for the same problem.
- **Storing personal data about children.**

## 5. Constraints

- Hosting: Vercel (frontend and server routes), GitHub (source). Supabase free tier for database and realtime.
- Audience: Grade 8 (about 12 to 14 years old). A class is 25 or more students in **teams of 5, so about 5 or more teams, and about 5 to 10 student devices plus the teacher's.** The teacher's laptop is connected to a projector.
- Devices: mixed phones, tablets and laptops. Mobile-first layout.
- Network: school wifi, possibly weak. The game must tolerate dropped connections and page refreshes.
- Language: English.
- Curriculum: the teacher's class uses the Cambridge Lower Secondary Mathematics Learner's Book (the copy supplied is labelled Learner's Book 9), **units 1 to 15**: Number and calculation; Expressions and formulae; Decimals, percentages and rounding; Equations and inequalities; Angles; Statistical investigations; Shapes and measurements; Fractions; Sequences and functions; Graphs; Ratio and proportion; Probability; Position and transformation; Volume, surface area and symmetry; Interpreting and discussing results. The Teachers' Book is the source of truth for learning objectives and codes.
- **Use of the textbooks (from the teacher):** the books are used only as a reference to model which topics and skills the questions should cover. Nothing is copied directly. Every question, scenario and worked solution is written fresh. The book files and their text are never added to the GitHub repo or the deployed site.
- Lesson length: 45 minutes. A game is 10 to 20 minutes. **(the teacher said "maybe 20 minute rounds at the most, maybe even 10"; I read this as the length of a whole game, and it needs confirming)**

## 6. Approaches considered

**Medium**
- *Printed card and board game.* No tech, but unit filtering, random events and scorekeeping are all manual. Rejected.
- *Web game with join codes and live scoreboard.* **Chosen by the teacher.**
- *Hybrid with a printable backup.* Possible later. Not in v1.

**Pace**
- *Self-paced, each team races through questions.* Rejected.
- *Teacher-paced rounds.* **Chosen by the teacher.**

**Island and win condition**
- *Each team on its own island.* Rejected by the teacher.
- *One shared island, shared rescue goal, everyone wins or loses together.* Was my first proposal. Replaced.
- *One shared island, Catan-style: shared resources and hazards, teams build toward escape, only one team wins.* **Chosen by the teacher ("think Settlers of Catan style, sort of work together but only one team wins").**

**Realtime technology (my call)**
- *Supabase (Postgres plus Realtime) with Next.js on Vercel.* Chosen. Free tier, realtime built in, simple data model; Vercel cannot keep long-lived connections itself.
- *Polling a database from Vercel only.* Fallback if Realtime misbehaves.
- *Firebase or Ably/Pusher.* Add another vendor. Rejected.

## 7. The game

### 7.1 The island and zones

The island has zones, one per team. **(my call)** With about 5 teams there are 5 zones; the set scales with the number of teams, from a pool of six or more. Teams are randomly assigned a zone at the start.

Example zones (final set left to the builder):

| Zone | Harvests easily | Short of |
|------|-----------------|----------|
| Beach | food (fish), salt | fresh water |
| Forest | wood, fruit | stone |
| Cave | water, stone | food |
| Hills | stone, lookout for signalling | water and wood |
| Lagoon | water, rope (reeds) | wood |

Each zone has its own scenario wording and its own typical shortage, so teams face different problems and need what other zones are good at.

### 7.2 Resources, building and winning

Resources **(my call, tunable)**: **Water, Food, Wood, Stone.**

Teams spend resources to build things that give **Survival Points (SP)**:

- Shelter (a few SP)
- Fire and signal beacon
- Water store
- Watchtower
- **The Raft**, built in stages. Completing it escapes the island.

**How a team wins (exactly one team):**
1. **First to complete the Raft** and sail away wins immediately, or
2. if time or rounds run out first, the **team with the most SP** wins. Ties are broken by resources held, then by a final question.

The SP target and build costs are scaled to the game length (quick or standard) so a game ends in time. **(left to builder, tuned by playtest)**

### 7.3 Round flow (teacher-paced)

A round is about 1.5 to 2 minutes, so a quick game is roughly 6 rounds and a standard game roughly 10 to 12. **(my call)**

1. Teacher presses **Next round**. A random **island roll** (like a Catan dice roll) decides which resources the island is generating this round and may trigger an event.
2. Every team sees its zone scenario and a problem drawn from the selected units, with numbers randomised per team. A timer starts.
3. The team discusses and the **captain** submits one answer. The captain rotates in join order. Teammates see the problem and can send a suggested answer to the captain. The server accepts only the captain's submission. **(my call)**
4. Teacher presses **Reveal**. Every screen shows the correct answer and a short worked solution (the teaching moment), then the harvest.
5. **Harvest:** a correct answer harvests resources from the team's zone (amount scales with question difficulty, and with the island roll). A wrong answer harvests little or nothing.
6. **Spend phase:** teams may build, and may use the market (see 7.5). Building and spending are quick button presses; teams decide together what to build.
7. Every few rounds a shared hazard appears (see 7.4).

### 7.4 Working together: shared hazards (my call)

Every few rounds an island hazard hits everyone: a storm, a drought, a fire. Each hazard has a **threshold the whole class must reach together** by pooling resources into an **island fund**. (A "class-wide shared problem" version is a later addition, not in the first release.) If the class meets it, the hazard is weakened or avoided. If not, every team loses resources or build progress.

This creates the Catan tension: giving to the fund helps everyone (including your rivals) but ignoring it hurts you too. Teams that contribute most may earn a small bonus, so cooperation is rewarded without making it free. A **raider/crab** style event may also steal resources from the leading team, which acts as the catch-up mechanic. **(my call)**

### 7.5 Market and trading

**Market (in the first playable):** teams can exchange resources with the island market at fixed rates (for example 3 water for 1 stone, with rates that change by round). Working out which exchange is worth it is itself a ratio and percentage problem. **(my call)**

**Team-to-team trading (initial phase deferred, as the teacher agreed to "maybe an initial phase"):** teams propose trades with each other, and the teacher can approve or cancel. Because trading is the heart of the Catan feel, it should be the first thing added after the first playable. **(my reading of the teacher's reply, to confirm)**

### 7.6 Question types

- **Calculate:** a numeric problem with a survival wrapper. A correct answer harvests the resource the question is tagged with.
- **Decide:** the team first answers a calculation, which reveals the real cost of each option, then picks an option (for example spend now versus gamble on the weather). One option usually has a stated probability, so chance and expected value are part of the maths. A safe option has a fixed result. A gamble resolves with a seeded random roll. The reveal shows the calculation, the roll and the consequence, so luck never replaces the lesson. **(my call)** It is two submissions in one round (the calculation, then the choice). The calculation is graded; a team that gets it wrong may still choose, but sees the option costs only at reveal. Decide questions are **not in the first playable**; they come after it.
- **Build/market problems:** costs, exchange rates and shared-fund contributions are all maths the team must get right.

### 7.7 Teacher controls

- Create game: toggle units 1 to 15 (individually or by preset, such as "latest unit" or "all"), choose difficulty mix, game length (quick or standard), timer length.
- Lobby: see teams joining, rename or remove a team.
- Run: next round, extend timer, skip question, reveal, trigger an event, pause, end game.
- Manual override: adjust a team's resources or points by hand if something goes wrong. **(my call)**
- Reassign a team's captain at any time. If the captain has not submitted when the timer ends, any teammate's device may submit. **(my call)**
- **Joining rules (my call):** joining locks when round 1 starts. The teacher can add a team before then. A late student can still join an existing team on another device. Limits: up to 8 teams and up to 6 devices per team.
- After the game: a simple summary of which units and questions teams struggled with. **(phase 2 if time allows)**

### 7.8 Screens

- **Host screen** (teacher's laptop): controls plus a preview of the current question.
- **Projector view**: island map with team zones, scoreboard (SP, resources, raft progress), island roll, hazard progress, round timer, reveal animation.
- **Team screen** (phone, tablet or shared device): zone and story, current problem, answer input, captain indicator, own resources, build options, and a compact view of the scoreboard.

**Join flow (my call):** a student enters the game code, then either creates a team (first device, picks the team name) or picks an existing team from the list. Students enter no personal name. A refreshed device rejoins its team from a stored token.

## 8. Questions

- Stored in the repo as data files, one per unit, tagged with: unit (1 to 15), Cambridge learning objective code, difficulty (1 to 3), resource tag, round type.
- Problems are **parameterised templates**: numbers are generated per team per round within safe ranges, with an answer function and an accepted tolerance or format. Neighbours see different numbers.
- Answers are checked **on the server**. The browser never receives the correct answer until reveal.
- Every question has a short worked solution shown at reveal.
- **Answer formats (my call):** answers are numeric (integer, decimal with a set number of places, fraction, or percentage), and the checker normalises what students type ("1/2", "0.5" and "50%" can all be accepted when the question allows). Where an answer is not a single number (an expression, a shape name, a choice), the question uses multiple choice. Both answer types are supported from the start. Units are shown next to the input and not typed.
- **Scope: all 15 units.** The engine works for all 15 from day one, because units are just tags on data. **(my call on staging)** The question banks are the largest piece of work, so they are written in batches: the first playable ships with a sample bank (about 20 templates for one unit, enough to test the whole loop), and further units are added until all 15 are covered. A unit with too few questions is flagged on the host screen so the teacher can see which units are ready.
- **Figures and non-numeric answers (my call):** the template format supports an optional figure generated from the question's numbers (for example a shape, angle or chart drawn as SVG) and supports multiple choice. Answers that would need a student to draw or sketch are not supported; those objectives are asked as multiple choice or as a numeric reading from a figure.
- **Ready threshold (my call):** a unit is "ready" for play when it has at least 12 templates (4 per difficulty level), with 24 or more as the target. The host screen shows each unit's ready status, and the game warns before starting if a selected unit is not ready.
- **Authoring (my call):** the designer writes and checks the templates, using the Teachers' Book for objectives and the teacher's end-of-semester exam as additional material. This needs the unit list and the book's contents from the teacher.
- Unit mixes are drawn so each selected unit appears, with difficulty rising with the round number or by the teacher's difficulty setting.

## 9. Technical design (all my calls)

- **App:** Next.js (App Router, TypeScript) on Vercel. Tailwind for styling.
- **Data and realtime:** Supabase Postgres with Realtime subscriptions. Tables roughly: `games`, `teams`, `rounds`, `submissions`, `builds`, `fund`, `events_log`.
- **Server logic:** Next.js route handlers (or Supabase edge functions) hold answer checking, question generation, harvest, building and scoring, so the client cannot cheat.
- **Join codes:** 6 characters, uppercase, ambiguous characters removed, unique among active games.
- **Teacher access:** single teacher password in an environment variable. No accounts.
- **Rejoin:** a team token in browser local storage lets a refreshed or reconnected device rejoin.
- **Resilience:** game state is server-authoritative in the database, so a device that drops and reconnects reloads the current state. Clients fall back to polling automatically if the realtime connection drops. The teacher has a manual override.
- **Privacy and cleanup:** only team names are stored. Games and teams are deleted automatically after 24 hours.
- **Free tier:** the Supabase free tier is accepted. A scheduled job (Vercel cron) runs a daily keep-alive so the project is not paused, and also deletes expired games. Expected load is small, about 10 to 15 devices at a time, so a load check with about 30 simulated clients is a go/no-go gate before classroom use.
- **Row-level security:** students read only their game's public state and write only their own team's submissions. Correct answers are never readable by teams.
- **Testing:** answer checking, question generators, harvest, build costs, win conditions and scoring get automated tests. A round-flow end-to-end test uses simulated teams.
- **Repo layout:** suggested `app/`, `lib/`, `content/units/`, `content/events/`, `supabase/migrations/`, `docs/`. The builder may adjust.

## 9a. Staging (my call)

**First playable:** join codes and teams, zones, the full round loop (island roll, question, reveal, harvest, build, fixed-rate market), the Raft and win conditions, one hazard type (island fund), the raider catch-up event, the projector view, teacher controls and overrides, and a sample question bank for one unit.

**Then, in this order:** (1) team-to-team trading, (2) Decide questions, (3) question banks for the remaining units until all 15 are ready, (4) post-game summary of weak topics, (5) class-wide shared-problem hazards.

## 10. Setup the teacher does once

1. Create an empty GitHub repo (suggested name `desert-island-maths`) and share its name so it can be attached.
2. Create a free Supabase project. Keys go into Vercel environment variables, never into chat or the repo.
3. Sign up for Vercel with GitHub and import the repo. Each push redeploys.
4. The Supabase and Vercel connectors are optional. With them, database tables and deployments can be set up and checked directly.

## 11. Success looks like

- A full game of 5 teams runs in 10 to 20 minutes with no technical problems, and a whole lesson (setup, game, debrief) fits in 45 minutes.
- Teacher can switch from one unit to all 15 between games in under a minute.
- Students argue about the maths and negotiate over what to build, because the answers decide who escapes first.
- Exactly one team wins every game, and trailing teams still have a path back until late in the game.
- No student can see answers early or copy a neighbour's numbers.

## 12. Left to the builder

- Visual style and art (illustrated island, colours, icons, animations).
- Exact resource yields, build costs, SP targets, round counts, difficulty curve, timer defaults, hazard thresholds and event deck contents, tuned by playtesting for the 10-minute and 20-minute games.
- Final zone set and scenario wording.
- Exact database schema and API shape.
- Accessibility details (contrast, font sizes for projector).

## 13. To confirm with the teacher

1. **The Teachers' Book**, for learning objectives and codes (the unit list is now known from the Learner's Book).
2. **Game length:** confirmed by the teacher: a whole game lasts at most 20 minutes (quick about 10, standard about 20).
3. **Team trading:** shall team-to-team trading be the first addition after the first playable, with the fixed-rate market covering the first version?
4. **One device per team** (with extra devices allowed) is assumed. Is that right?
