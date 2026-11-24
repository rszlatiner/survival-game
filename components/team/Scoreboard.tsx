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

export function Scoreboard({ teams, myId, winnerId }: { teams: PublicTeam[]; myId: string; winnerId: string | null }) {
  return (
    <section aria-label="Scoreboard" className="rounded-xl bg-slate-900 p-3 text-white">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Scoreboard</h2>
      <ol className="space-y-1">
        {rankTeams(teams, winnerId).map((t) => (
          <li key={t.id} className={`flex justify-between rounded-lg px-2 py-1 ${t.id === myId ? "bg-sky-800 font-bold" : ""}`}>
            <span>{t.name}</span>
            <span>
              {t.sp} SP{t.builds.includes("raft3") ? " (raft done)" : t.builds.includes("raft2") ? " (raft 2)" : t.builds.includes("raft1") ? " (raft 1)" : ""}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
