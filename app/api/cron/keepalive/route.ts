import { keepaliveHandler } from "@/lib/api/cron";
import { respond, serverDeps } from "@/lib/api/server";

export const dynamic = "force-dynamic";

/** Vercel cron (GET, daily): pings the database. Needs `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  return respond(async () => {
    const { repo } = serverDeps();
    return keepaliveHandler(repo, { cronSecret: process.env.CRON_SECRET }, req.headers.get("authorization"));
  });
}
