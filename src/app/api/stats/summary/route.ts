import type { NextRequest } from "next/server";
import { getSummary } from "@/lib/repositories/stats";
import { resolveToday } from "@/lib/constants";
import { handle, ok, searchParamsToObject } from "@/lib/api-helpers";
import { statsQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** GET /api/stats/summary?date=YYYY-MM-DD — 통계 타일 */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const { date } = statsQuerySchema.parse(
      searchParamsToObject(request.nextUrl.searchParams),
    );
    return ok(await getSummary(date ?? resolveToday()));
  });
}
