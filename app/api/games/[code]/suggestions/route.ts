import { teamSuggestionsHandler } from "@/lib/api/handlers";
import { bearer, respond, serverDeps } from "@/lib/api/server";

export const dynamic = "force-dynamic";

/** The caller's own team's suggestions (team token in the Authorization header). */
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return respond(async () => {
    const { code } = await ctx.params;
    const { repo, env } = serverDeps();
    return teamSuggestionsHandler(repo, env, code, bearer(req), Date.now());
  });
}
