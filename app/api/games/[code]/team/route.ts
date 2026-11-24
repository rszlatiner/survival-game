import { teamActionHandler } from "@/lib/api/handlers";
import { parseTeamAction } from "@/lib/api/parse";
import { bearer, readJson, respond, serverDeps } from "@/lib/api/server";

export const dynamic = "force-dynamic";

/** Team action (team token in the Authorization header). Answers over 40 characters get 400. */
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return respond(async () => {
    const { code } = await ctx.params;
    const action = parseTeamAction(await readJson(req));
    const { repo, env } = serverDeps();
    return teamActionHandler(repo, env, code, bearer(req), action, Date.now());
  });
}
