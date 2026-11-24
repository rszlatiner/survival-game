import { HostPlay } from "@/components/host/HostPlay";

export default async function HostPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <HostPlay code={code} />;
}
