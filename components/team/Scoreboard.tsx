import { MedalIcon, RaftIcon, StarIcon } from "@/components/art";
import { nightPanel, panel } from "@/components/ui/styles";
import type { PublicTeam } from "@/lib/engine/public";

export function rankTeams(teams: PublicTeam[], winnerId: string | null): PublicTeam[] {
  const total = (t: PublicTeam) => t.stock.water + t.stock.food + t.stock.wood + t.stock.stone;
  return [...teams].sort((a, b) => {
    if (winnerId) {
      if (a.id === winnerId) return -1;
      if (b.id === winnerId) return 1;
    }
    return b.sp - a.sp || total(b) - total(a);
  });
}

const raftStage = (t: PublicTeam): 0 | 1 | 2 | 3 =>
  t.builds.includes("raft3") ? 3 : t.builds.includes("raft2") ? 2 : t.builds.includes("raft1") ? 1 : 0;

/** Ranked list of teams. "projector" is the large night-panel version for the classroom screen. */
export function Scoreboard({
  teams,
  myId,
  winnerId,
  variant = "team",
}: {
  teams: PublicTeam[];
  myId: string;
  winnerId: string | null;
  variant?: "team" | "projector";
}) {
  const big = variant === "projector";
  return (
    <section aria-label="Scoreboard" className={big ? nightPanel : panel}>
      <h2 className={`mb-2 font-black uppercase tracking-wide ${big ? "text-3xl" : "text-sm"}`}>Scoreboard</h2>
      <ol className={big ? "space-y-2" : "space-y-1 text-sm"}>
        {rankTeams(teams, winnerId).map((t, i) => {
          const stage = raftStage(t);
          const mine = t.id === myId;
          return (
            <li
              key={t.id}
              className={`flex items-center justify-between gap-2 rounded-xl px-2 py-1 ${
                mine ? "border-4 border-void bg-sunset-400 font-extrabold text-void" : "bg-night-700"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                {i < 3 ? <MedalIcon place={(i + 1) as 1 | 2 | 3} size={big ? 44 : 24} /> : <span className={big ? "w-11" : "w-6"} aria-hidden="true" />}
                <span className="min-w-0 break-words">{t.name}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 whitespace-nowrap">
                <StarIcon size={big ? 36 : 20} />
                {stage > 0 && <RaftIcon stage={stage as 1 | 2 | 3} size={big ? 40 : 22} />}
                <span>
                  {t.sp} SP{stage === 3 ? " (raft done)" : stage === 2 ? " (raft 2)" : stage === 1 ? " (raft 1)" : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
