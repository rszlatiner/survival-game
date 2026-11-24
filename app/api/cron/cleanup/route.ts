import { cleanupHandler } from "@/lib/api/cron";
import { respond, serverDeps } from "@/lib/api/server";

export const dynamic = "force-dynamic";

/** Vercel cron (GET, daily): deletes games older than 24 hours. Needs `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  return respond(async () => {
    const { repo } = serverDeps();
    return cleanupHandler(repo, { cronSecret: process.env.CRON_SECRET }, req.headers.get("authorization"));
  });
}
