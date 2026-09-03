import type { NextRequest } from "next/server";
import { getDashboard } from "@/lib/repositories/stats";
import { handle, ok, searchParamsToObject } from "@/lib/api-helpers";
import { dashboardQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** GET /api/stats/dashboard?month=YYYY-MM&today=YYYY-MM-DD */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const { month, today } = dashboardQuerySchema.parse(
      searchParamsToObject(request.nextUrl.searchParams),
    );
    const now = today ?? new Date().toISOString().slice(0, 10);
    return ok(await getDashboard(month ?? now.slice(0, 7), now));
  });
}
