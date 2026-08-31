import type { NextRequest } from "next/server";
import { listPurchasing, purchasingCounts } from "@/lib/repositories/purchasing";
import { handle, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * GET /api/purchasing?stage=미등록|발주|입고완료|전체&search=&dateFrom=&dateTo=&page=&pageSize=
 * &withCounts=1 이면 집계도 함께 반환.
 */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const sp = request.nextUrl.searchParams;
    const dateFrom = sp.get("dateFrom");
    const dateTo = sp.get("dateTo");

    const list = await listPurchasing({
      stage: sp.get("stage") ?? "전체",
      search: sp.get("search")?.trim() || undefined,
      dateFrom: isDate(dateFrom) ? dateFrom : undefined,
      dateTo: isDate(dateTo) ? dateTo : undefined,
      page: Math.max(1, Number(sp.get("page")) || 1),
      pageSize: Math.min(Math.max(Number(sp.get("pageSize")) || 20, 1), 100),
    });

    if (sp.get("withCounts") === "1") {
      return ok({ ...list, counts: await purchasingCounts() });
    }
    return ok(list);
  });
}
