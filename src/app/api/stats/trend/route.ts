import type { NextRequest } from "next/server";
import { getMonthlyTrend } from "@/lib/repositories/stats";
import { handle, ok, searchParamsToObject } from "@/lib/api-helpers";
import { trendQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** GET /api/stats/trend?months=12 — 월별 주문 추이 */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const { months } = trendQuerySchema.parse(
      searchParamsToObject(request.nextUrl.searchParams),
    );
    return ok(await getMonthlyTrend(months ?? 12));
  });
}
