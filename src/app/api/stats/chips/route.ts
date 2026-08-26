import { getStatusChipCounts } from "@/lib/repositories/stats";
import { handle, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** GET /api/stats/chips — 상태 필터 칩의 건수 배지 */
export async function GET() {
  return handle(async () => ok(await getStatusChipCounts()));
}
