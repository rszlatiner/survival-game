"use client";

import { HostScreen } from "@/components/host/HostScreen";
import { ProjectorView } from "@/components/host/ProjectorView";
import { TeamScreen } from "@/components/team/TeamScreen";
import type { PublicGameState, PublicTeam } from "@/lib/engine/public";

/* Dev-only: canned states for visual checks. Not linked from the app. */

const team = (id: string, name: string, zone: PublicTeam["zone"], over: Partial<PublicTeam> = {}): PublicTeam => ({
  id,
  name,
  zone,
  deviceCount: 3,
  captainIndex: 0,
  stock: { water: 4, food: 6, wood: 9, stone: 3 },
  builds: [],
  sp: 0,
  fundGiven: 0,
  ...over,
});

const TEAMS: PublicTeam[] = [
  team("t1", "Coconut Crew", "beach", { sp: 6, builds: ["shelter", "fire", "raft1"] }),
  team("t2", "Shark Bait", "forest", { sp: 9, builds: ["shelter", "watchtower", "raft1", "raft2"] }),
  team("t3", "Lava Llamas", "cave", { sp: 3, builds: ["fire"] }),
  team("t4", "Hilltop Heroes", "hills", { sp: 4, builds: ["waterStore"] }),
  team("t5", "Lagoon Legends", "lagoon", { sp: 2 }),
  team("t6", "The Castaways of Room 8B", "beach", { sp: 1 }),
];

function base(over: Partial<PublicGameState> = {}): PublicGameState {
  const now = Date.now();
  return {
    code: "KQ7P2M",
    version: 1,
    phase: "question",
    units: [1, 2],
    length: "standard",
    timerSeconds: 90,
    roundsPlayed: 3,
    totalRounds: 11,
    teams: TEAMS,
    fund: { water: 3, food: 2, wood: 1, stone: 1 },
    winnerId: null,
    tiedIds: [],
    serverNow: now,
    round: {
      n: 4,
      startedAt: now,
      endsAt: now + 74_000,
      roll: 9,
      bonusResource: "wood",
      raider: true,
      hazard: true,
      questions: Object.fromEntries(
        TEAMS.map((t) => [
          t.id,
          {
            templateId: "x",
            unit: 1,
            difficulty: 1,
            resource: "food",
            format: { kind: "integer" },
            prompt: "Your crew catches 12 fish a day for 3 days, then eats 7. How many fish are left?",
          },
        ]),
      ),
      submissions: Object.fromEntries(TEAMS.map((t, i) => [t.id, { submitted: i % 2 === 1 }])),
      results: null,
    },
    ...over,
  };
}

const RESULTS = Object.fromEntries(
  TEAMS.map((t, i) => [t.id, { expected: "29", solution: "12 x 3 = 36\n36 - 7 = 29", answer: i === 2 ? null : i % 2 ? "28" : "29", correct: i % 2 === 0 }]),
);

function state(view: string): PublicGameState {
  if (view.endsWith("lobby")) return base({ phase: "lobby", round: null, roundsPlayed: 0 });
  if (view.endsWith("reveal") || view.endsWith("wrong")) {
    const s = base({ phase: "reveal" });
    s.round = { ...s.round!, results: RESULTS };
    return s;
  }
  if (view.endsWith("finished")) {
    const s = base({ phase: "finished", winnerId: "t2", roundsPlayed: 11 });
    s.round = { ...s.round!, results: RESULTS };
    return s;
  }
  if (view.endsWith("choice")) {
    const s = base();
    s.round!.questions.t1 = { ...s.round!.questions.t1, format: { kind: "choice", options: ["3/4", "0.7", "70%", "7/9"] }, prompt: "Which is the largest share of the coconuts?" };
    return s;
  }
  return base();
}

const noop = async () => ({});

export function Fixtures({ view }: { view: string }) {
  const s = state(view);
  if (view.startsWith("team")) {
    const teamId = view.endsWith("wrong") ? "t2" : "t1";
    return <TeamScreen state={s} status="live" teamId={teamId} deviceIndex={0} send={noop} fetchSuggestions={async () => ({ suggestions: [{ answer: "29" }, { answer: "28" }] })} />;
  }
  if (view.startsWith("projector")) return <ProjectorView state={s} status="live" />;
  if (view.startsWith("host")) return <HostScreen state={s} status="live" send={noop} login={noop} />;
  return (
    <ul className="p-6 text-white">
      {["team-lobby", "team-question", "team-choice", "team-reveal", "team-wrong", "team-finished", "host-lobby", "host-question", "host-reveal", "projector-lobby", "projector-question", "projector-reveal", "projector-finished"].map((v) => (
        <li key={v}><a className="underline" href={`?view=${v}`}>{v}</a></li>
      ))}
    </ul>
  );
}
