"use client";

import { useGameState } from "@/lib/client/useGameState";
import { ProjectorView } from "./ProjectorView";

export function ProjectorPlay({ code }: { code: string }) {
  const { state, status } = useGameState(code.toUpperCase());
  return <ProjectorView state={state} status={status} />;
}
