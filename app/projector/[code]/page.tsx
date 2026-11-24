import { ProjectorPlay } from "@/components/host/ProjectorPlay";

export default async function ProjectorPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ProjectorPlay code={code} />;
}
