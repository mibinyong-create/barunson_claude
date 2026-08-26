import type { NextRequest } from "next/server";
import { getMonthlyTrend } from "@/lib/repositories/stats";
import { handle, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** GET /api/stats/trend?months=12 — 월별 주문 추이 */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const months = Number(request.nextUrl.searchParams.get("months") ?? 12);
    return ok(await getMonthlyTrend(Number.isFinite(months) ? months : 12));
  });
}
