/**
 * Whole-game simulation with bot teams, for balance checks.
 *
 * Every game drives the REAL request handlers (createGameHandler, joinHandler,
 * hostActionHandler, teamActionHandler) over an in-memory repo. Bots peek at
 * the stored state through the repo (server side) to know the expected answer
 * and their own stock; nothing is read from the public state. Deterministic
 * in `seed`: the game seed is set to it and bot choices use a seeded rng.
 *
 * Bot model:
 * - The captain answers correctly with probability `accuracy`, otherwise
 *   submits a wrong answer.
 * - Spend phase (teams act in a seeded random order each round):
 *   1. On a hazard round, contribute HAZARD_THRESHOLD_PER_TEAM units (from the
 *      resources least needed for the raft) if it has them.
 *   2. Build the next raft stage when affordable; otherwise buy a missing
 *      resource at the market with stock not needed for that stage.
 *   3. Build other items greedily (most SP first) only with stock beyond what
 *      the rest of the raft needs, or anything affordable in the last round.
 *
 * CLI (no network): `npm run simulate -- [games=200] [teams=5]` prints a
 * balance table for accuracy 0.5, 0.65, 0.8 and 0.95, quick and standard.
 */
import { pathToFileURL } from "node:url";
import { isCorrect } from "@/lib/answers";
import {
  createGameHandler,
  hostActionHandler,
  joinHandler,
  teamActionHandler,
  type HandlerEnv,
  type HostAction,
  type TeamAction,
} from "@/lib/api/handlers";
import { BUILDS, HAZARD_THRESHOLD_PER_TEAM, ROUNDS } from "@/lib/config";
import { marketRate } from "@/lib/engine/build";
import { memoryRepo } from "@/lib/repo/memory";
import { noopNotifier } from "@/lib/repo/notify";
import { RESOURCES, type Resource } from "@/lib/questions/types";
import { makeRng } from "@/lib/rng";
import type { BuildId, GameLength, GameState, RoundState, Stock, Team } from "@/lib/types";

export interface SimOptions {
  teams: number;
  length: GameLength;
  /** Probability that a bot captain answers correctly, 0 to 1. */
  accuracy: number;
  seed: string;
  /** Units in play; default [11]. */
  units?: number[];
}

export interface SimResult {
  seed: string;
  winnerId: string;
  winnerZone: string;
  roundsPlayed: number;
  byRaft: boolean;
  /** Went to a tiebreak question. */
  tiebreak: boolean;
  /** Smallest team-stock or fund value seen after any action (must stay >= 0). */
  minResource: number;
  /** Handler calls made. */
  actions: number;
}

/** Local in-memory env only: these are not real credentials. */
const PASSWORD = "simulation-password";
const SECRET = "simulation-token-secret-0123456789abcdef";
const T0 = 1_700_000_000_000;
/** Hard stop: far more host steps than any legal game needs. */
const MAX_STEPS = 100;
/** Most spend actions one team may take in one reveal phase. */
const MAX_SPEND = 30;

const RAFT: BuildId[] = ["raft1", "raft2", "raft3"];
const OTHER_BUILDS = (Object.keys(BUILDS) as BuildId[])
  .filter((id) => !RAFT.includes(id))
  .sort((a, b) => BUILDS[b].sp - BUILDS[a].sp);

const empty = (): Stock => ({ water: 0, food: 0, wood: 0, stone: 0 });

function addCost(into: Stock, cost: Partial<Stock>): Stock {
  for (const r of RESOURCES) into[r] += cost[r] ?? 0;
  return into;
}

const affords = (s: Stock, need: Partial<Stock>) => RESOURCES.every((r) => s[r] >= (need[r] ?? 0));

/** Total cost of the raft stages this team has not built yet. */
function raftNeed(t: Team): Stock {
  const need = empty();
  for (const id of RAFT) if (!t.builds.includes(id)) addCost(need, BUILDS[id].cost);
  return need;
}

const nextRaft = (t: Team): BuildId | null => RAFT.find((id) => !t.builds.includes(id)) ?? null;

function minResource(g: GameState): number {
  let m = Infinity;
  for (const t of g.teams) for (const r of RESOURCES) m = Math.min(m, t.stock[r]);
  for (const r of RESOURCES) m = Math.min(m, g.fund[r]);
  return m;
}

/** A string the checker marks wrong for this question. */
function wrongAnswer(q: RoundState["questions"][string], rng: () => number): string {
  const fmt = q.publicQ.format;
  const candidates: string[] = [];
  if (fmt.kind === "choice") candidates.push(...fmt.options.filter((o) => o !== q.expected));
  else {
    const e = Number(q.expected);
    candidates.push(String(e + 1), String(e + 2), String(e - 1), "9999");
  }
  const start = Math.floor(rng() * candidates.length);
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[(start + i) % candidates.length];
    if (c.trim() && !isCorrect(c, q.expected, fmt)) return c;
  }
  return "no answer";
}

export async function simulateGame(opts: SimOptions): Promise<SimResult> {
  const { teams: nTeams, length, accuracy, seed } = opts;
  const repo = memoryRepo(() => T0);
  const env: HandlerEnv = { teacherPassword: PASSWORD, tokenSecret: SECRET, notifier: noopNotifier() };
  const rng = makeRng(`${seed}:bots`);
  let now = T0;
  let actions = 0;
  let minSeen = Infinity;

  const { code, hostToken } = await createGameHandler(
    repo,
    env,
    { password: PASSWORD, units: opts.units ?? [11], length, timerSeconds: 90 },
    now,
  );
  // Make the game itself deterministic: the handler draws a random seed, so
  // replace it in the lobby, before anything reads it.
  {
    const g = (await repo.get(code))!;
    await repo.save({ ...g, seed, version: g.version + 1 }, g.version);
  }

  const peek = async (): Promise<GameState> => (await repo.get(code))!;
  const observe = async () => {
    actions++;
    minSeen = Math.min(minSeen, minResource(await peek()));
  };
  const host = async (action: HostAction) => {
    now += 1000;
    await hostActionHandler(repo, env, code, hostToken, action, now);
    await observe();
  };

  const tokens = new Map<string, string>();
  for (let i = 0; i < nTeams; i++) {
    const j = await joinHandler(repo, env, code, { teamName: `Bot ${i + 1}`, deviceId: `bot-${i + 1}` }, now);
    tokens.set(j.teamId, j.teamToken);
    await observe();
  }
  const team = async (teamId: string, action: TeamAction) => {
    now += 100;
    await teamActionHandler(repo, env, code, tokens.get(teamId)!, action, now);
    await observe();
  };

  const answerAll = async () => {
    const g = await peek();
    for (const t of g.teams) {
      const q = g.round?.questions[t.id];
      if (!q) continue; // not in this tiebreak
      const answer = rng() < accuracy ? String(q.expected) : wrongAnswer(q, rng);
      await team(t.id, { type: "submit", answer });
    }
  };

  const spend = async (teamId: string) => {
    // Hazard: chip in this team's share, from what the raft needs least.
    let g = await peek();
    if (g.phase !== "reveal" || g.round?.hazard !== true) {
      // no hazard this round
    } else {
      const t = g.teams.find((x) => x.id === teamId)!;
      const need = raftNeed(t);
      const left = { ...t.stock };
      const give = empty();
      for (let k = 0; k < HAZARD_THRESHOLD_PER_TEAM; k++) {
        const r = [...RESOURCES].sort((a, b) => left[b] - need[b] - (left[a] - need[a]))[0];
        if (left[r] <= 0) break;
        left[r]--;
        give[r]++;
      }
      for (const r of RESOURCES) if (give[r] > 0) await team(teamId, { type: "contribute", resource: r, amount: give[r] });
    }

    for (let step = 0; step < MAX_SPEND; step++) {
      g = await peek();
      if (g.phase !== "reveal" || g.winnerId !== null || g.tiedIds.length > 0) return;
      const t = g.teams.find((x) => x.id === teamId)!;
      const stage = nextRaft(t);

      if (stage && affords(t.stock, BUILDS[stage].cost)) {
        await team(teamId, { type: "build", item: stage });
        continue;
      }

      if (stage) {
        // Buy one missing unit for this stage with stock that stage does not use.
        const cost = BUILDS[stage].cost;
        const short = RESOURCES.find((r) => t.stock[r] < (cost[r] ?? 0));
        if (short) {
          const payer = [...RESOURCES]
            .filter((r) => r !== short)
            .map((r) => ({ r, spare: t.stock[r] - (cost[r] ?? 0), rate: marketRate(g, r, short) }))
            .filter((x) => x.spare >= x.rate)
            .sort((a, b) => b.spare - a.spare)[0];
          if (payer) {
            await team(teamId, { type: "exchange", give: payer.r, get: short as Resource, amount: 1 });
            continue;
          }
        }
      }

      const last = g.roundsPlayed >= ROUNDS[g.length];
      const reserve = raftNeed(t);
      const item = OTHER_BUILDS.find((id) => {
        if (t.builds.includes(id)) return false;
        if (!affords(t.stock, BUILDS[id].cost)) return false;
        if (last) return true;
        const after = { ...t.stock };
        for (const r of RESOURCES) after[r] -= BUILDS[id].cost[r] ?? 0;
        return affords(after, reserve);
      });
      if (item) {
        await team(teamId, { type: "build", item });
        continue;
      }
      return; // nothing useful to do
    }
  };

  await host({ type: "start" });
  for (let step = 0; step < MAX_STEPS; step++) {
    await host({ type: "next" });
    let g = await peek();
    if (g.phase === "finished") break;
    await answerAll();
    await host({ type: "reveal" });
    g = await peek();
    if (g.phase === "finished") break;
    // Seeded shuffle so no team always gets first go at the market or the raft.
    const order = g.teams.map((t) => t.id);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (const id of order) await spend(id);
    g = await peek();
    if (g.phase === "finished") break;
  }

  const g = await peek();
  if (g.phase !== "finished" || g.winnerId === null) {
    throw new Error(`simulation ${seed}: game did not finish with a winner (phase ${g.phase})`);
  }
  const winner = g.teams.find((t) => t.id === g.winnerId)!;
  return {
    seed,
    winnerId: winner.id,
    winnerZone: winner.zone,
    roundsPlayed: g.roundsPlayed,
    byRaft: winner.builds.includes("raft3"),
    // Only a tiebreak round has roll 0 (island rolls are 1 to 6).
    tiebreak: g.round?.roll === 0,
    minResource: minSeen,
    actions,
  };
}

export async function simulateMany(base: Omit<SimOptions, "seed">, seeds: string[]): Promise<SimResult[]> {
  const out: SimResult[] = [];
  for (const seed of seeds) out.push(await simulateGame({ ...base, seed }));
  return out;
}

export interface SimSummary {
  games: number;
  raftRate: number;
  /** Share of games won, by team id. */
  byId: Record<string, number>;
  /** Share of games won, by the winner's zone. */
  byZone: Record<string, number>;
  meanRounds: number;
  roundsHist: Record<number, number>;
}

export function summarize(results: SimResult[]): SimSummary {
  const n = results.length;
  const share = (key: (r: SimResult) => string) => {
    const m: Record<string, number> = {};
    for (const r of results) m[key(r)] = (m[key(r)] ?? 0) + 1;
    for (const k of Object.keys(m)) m[k] /= n;
    return m;
  };
  const roundsHist: Record<number, number> = {};
  for (const r of results) roundsHist[r.roundsPlayed] = (roundsHist[r.roundsPlayed] ?? 0) + 1;
  return {
    games: n,
    raftRate: n ? results.filter((r) => r.byRaft).length / n : 0,
    byId: share((r) => r.winnerId),
    byZone: share((r) => r.winnerZone),
    meanRounds: n ? results.reduce((s, r) => s + r.roundsPlayed, 0) / n : 0,
    roundsHist,
  };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const fmtShares = (m: Record<string, number>) =>
  Object.entries(m)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k} ${pct(v)}`)
    .join(", ");

async function main() {
  const games = Number(process.argv[2] ?? 200);
  const teams = Number(process.argv[3] ?? 5);
  for (const length of ["quick", "standard"] as const) {
    console.log(`\n${length} (${games} games, ${teams} teams)`);
    console.log("accuracy | raft | mean rounds | rounds histogram | winner share by id | by zone");
    for (const accuracy of [0.5, 0.65, 0.8, 0.95]) {
      const seeds = Array.from({ length: games }, (_, i) => `cli-${length}-${i}`);
      const s = summarize(await simulateMany({ teams, length, accuracy }, seeds));
      const hist = Object.entries(s.roundsHist)
        .map(([k, v]) => `${k}:${v}`)
        .join(" ");
      console.log(
        `${accuracy} | ${pct(s.raftRate)} | ${s.meanRounds.toFixed(2)} | ${hist} | ${fmtShares(s.byId)} | ${fmtShares(s.byZone)}`,
      );
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
