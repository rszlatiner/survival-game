import { notFound } from "next/navigation";
import { Fixtures } from "@/components/dev/Fixtures";

/**
 * Dev-only visual fixtures (team screen, host screen, projector) rendered from
 * canned state, for screenshot checks. Returns 404 in production builds.
 */
export default async function FixturesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { view } = await searchParams;
  return <Fixtures view={view ?? "index"} />;
}
