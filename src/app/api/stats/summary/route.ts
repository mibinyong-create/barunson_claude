import type { NextRequest } from "next/server";
import { getSummary } from "@/lib/repositories/stats";
import { TODAY } from "@/lib/constants";
import { handle, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** GET /api/stats/summary?date=YYYY-MM-DD — 통계 타일 3종 */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const date = request.nextUrl.searchParams.get("date") ?? TODAY;
    return ok(await getSummary(date));
  });
}
