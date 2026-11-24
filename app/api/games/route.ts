import { createGameHandler } from "@/lib/api/handlers";
import { parseCreateBody } from "@/lib/api/parse";
import { readJson, respond, serverDeps } from "@/lib/api/server";

export const dynamic = "force-dynamic";

/** Teacher creates a game. Body: { password, units, length, timerSeconds }. */
export async function POST(req: Request) {
  return respond(async () => {
    const body = parseCreateBody(await readJson(req));
    const { repo, env } = serverDeps();
    return createGameHandler(repo, env, body, Date.now());
  }, 201);
}
