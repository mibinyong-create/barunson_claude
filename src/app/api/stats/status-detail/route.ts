import type { NextRequest } from "next/server";
import { getStatusDetail } from "@/lib/repositories/stats";
import { resolveToday } from "@/lib/constants";
import { fail, handle, ok, searchParamsToObject } from "@/lib/api-helpers";
import { statsQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** GET /api/stats/status-detail?date=&status= — 상태 타일 클릭 시 품목별 분해 */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const { date, status } = statsQuerySchema.parse(
      searchParamsToObject(request.nextUrl.searchParams),
    );
    if (!status) return fail("status 파라미터가 필요합니다.", 400);
    return ok(await getStatusDetail(date ?? resolveToday(), status));
  });
}
