import type { NextRequest } from "next/server";
import { getBreakdown } from "@/lib/repositories/stats";
import { TODAY } from "@/lib/constants";
import { handle, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** GET /api/stats/breakdown?date=&period=day|week — 품목별 주문 현황 */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const sp = request.nextUrl.searchParams;
    const date = sp.get("date") ?? TODAY;
    const period = sp.get("period") === "week" ? "week" : "day";
    return ok(await getBreakdown(date, period));
  });
}
