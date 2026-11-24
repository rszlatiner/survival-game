import { joinHandler } from "@/lib/api/handlers";
import { parseJoinBody } from "@/lib/api/parse";
import { readJson, respond, serverDeps } from "@/lib/api/server";

export const dynamic = "force-dynamic";

/** A device creates a team ({ teamName, deviceId }) or joins one ({ teamId, deviceId }). */
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return respond(async () => {
    const { code } = await ctx.params;
    const body = parseJoinBody(await readJson(req));
    const { repo, env } = serverDeps();
    return joinHandler(repo, env, code, body, Date.now());
  });
}
