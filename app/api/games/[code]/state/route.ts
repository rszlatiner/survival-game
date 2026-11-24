import { stateHandler } from "@/lib/api/handlers";
import { respond, serverDeps } from "@/lib/api/server";

export const dynamic = "force-dynamic";

/** Public game state; no token needed. */
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  return respond(async () => {
    const { code } = await ctx.params;
    const { repo } = serverDeps();
    return stateHandler(repo, code, Date.now());
  });
}
