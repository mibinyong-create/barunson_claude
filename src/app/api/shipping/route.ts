import type { NextRequest } from "next/server";
import { listOrders } from "@/lib/repositories/orders";
import { handle, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** 출고관리 화면의 탭 → 대상 진행상태 */
const STAGE_STATUSES: Record<string, string[]> = {
  대기: ["인쇄완료"],
  배송중: ["배송중"],
  배송완료: ["배송완료"],
  전체: ["인쇄완료", "배송중", "배송완료"],
};

/**
 * GET /api/shipping?stage=대기|배송중|배송완료|전체&search=&page=&pageSize=
 * 출고/배송 대상 주문만 추린 목록.
 */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const sp = request.nextUrl.searchParams;
    const stage = sp.get("stage") ?? "전체";
    const statuses = STAGE_STATUSES[stage] ?? STAGE_STATUSES["전체"];

    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSizeRaw = Number(sp.get("pageSize")) || 20;
    const pageSize = Math.min(Math.max(pageSizeRaw, 1), 100);
    const search = sp.get("search")?.trim() || undefined;

    const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
    const dateFrom = sp.get("dateFrom");
    const dateTo = sp.get("dateTo");

    return ok(
      await listOrders({
        statuses,
        search,
        dateFrom: isDate(dateFrom) ? dateFrom : undefined,
        dateTo: isDate(dateTo) ? dateTo : undefined,
        showAllDates: !isDate(dateFrom) && !isDate(dateTo),
        sort: "orderDateDesc",
        page,
        pageSize,
      }),
    );
  });
}
