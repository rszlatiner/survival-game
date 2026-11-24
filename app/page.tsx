"use client";

import { useRouter } from "next/navigation";
import { JoinScreen } from "@/components/team/JoinScreen";

export default function Home() {
  const router = useRouter();
  return <JoinScreen onJoined={(code) => router.push(`/play/${code}`)} />;
}
