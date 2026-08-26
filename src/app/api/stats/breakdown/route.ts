import type { NextRequest } from "next/server";
import { getBreakdown } from "@/lib/repositories/stats";
import { resolveToday } from "@/lib/constants";
import { handle, ok, searchParamsToObject } from "@/lib/api-helpers";
import { statsQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** GET /api/stats/breakdown?date=&period=day|week — 품목별 주문 현황 */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const { date, period } = statsQuerySchema.parse(
      searchParamsToObject(request.nextUrl.searchParams),
    );
    return ok(await getBreakdown(date ?? resolveToday(), period ?? "day"));
  });
}
