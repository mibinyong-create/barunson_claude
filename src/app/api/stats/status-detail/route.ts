import type { NextRequest } from "next/server";
import { getStatusDetail } from "@/lib/repositories/stats";
import { TODAY } from "@/lib/constants";
import { fail, handle, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** GET /api/stats/status-detail?date=&status= — 상태 타일 클릭 시 품목별 분해 */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const sp = request.nextUrl.searchParams;
    const status = sp.get("status");
    if (!status) return fail("status 파라미터가 필요합니다.", 400);
    const date = sp.get("date") ?? TODAY;
    return ok(await getStatusDetail(date, status));
  });
}
