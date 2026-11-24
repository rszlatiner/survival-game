import { CreateGame, type UnitReadiness } from "@/components/host/CreateGame";
import { unitReadiness } from "@/lib/questions/ready";

/** Server component: the question bank is read here and only the readiness numbers reach the browser. */
export default function HostCreatePage() {
  const readiness: UnitReadiness[] = Array.from({ length: 15 }, (_, i) => {
    const r = unitReadiness(i + 1);
    return { unit: i + 1, ready: r.ready, count: r.count };
  });
  return <CreateGame readiness={readiness} />;
}
