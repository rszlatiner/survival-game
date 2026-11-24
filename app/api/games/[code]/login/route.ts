import { hostLoginHandler } from "@/lib/api/handlers";
import { parseLoginBody } from "@/lib/api/parse";
import { readJson, respond, serverDeps } from "@/lib/api/server";

export const dynamic = "force-dynamic";

/** Teacher signs in again with the password. Body: { password }. Returns { hostToken }. */
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return respond(async () => {
    const { code } = await ctx.params;
    const { password } = parseLoginBody(await readJson(req));
    const { repo, env } = serverDeps();
    return hostLoginHandler(repo, env, code, password, Date.now());
  });
}
