import { TeamPlay } from "@/components/team/TeamPlay";

export default async function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <TeamPlay code={code} />;
}
