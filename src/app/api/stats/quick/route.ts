import type { NextRequest } from "next/server";
import { getQuickStats } from "@/lib/repositories/stats";
import { TODAY } from "@/lib/constants";
import { handle, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** GET /api/stats/quick?date= — 진행상태별 건수 타일 */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const date = request.nextUrl.searchParams.get("date") ?? TODAY;
    return ok(await getQuickStats(date));
  });
}
