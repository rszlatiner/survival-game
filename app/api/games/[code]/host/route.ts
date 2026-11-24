import { hostActionHandler } from "@/lib/api/handlers";
import { parseHostAction } from "@/lib/api/parse";
import { bearer, readJson, respond, serverDeps } from "@/lib/api/server";

export const dynamic = "force-dynamic";

/** Teacher action (host token in the Authorization header). Returns the public state. */
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return respond(async () => {
    const { code } = await ctx.params;
    const action = parseHostAction(await readJson(req));
    const { repo, env } = serverDeps();
    return hostActionHandler(repo, env, code, bearer(req), action, Date.now());
  });
}
