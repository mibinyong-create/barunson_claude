import type { NextRequest } from "next/server";
import { listOrders } from "@/lib/repositories/orders";
import { handle, ok } from "@/lib/api-helpers";
import type { OrderListParams } from "@/lib/types";

export const dynamic = "force-dynamic";

const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** 인쇄작업 큐의 기본 대상 상태 (초안·인쇄 준비 단계) */
const DEFAULT_STATUSES = ["주문완료", "초안등록", "고객확정완료", "외주발주", "인쇄팀전달"];
const ALLOWED_STATUSES = new Set([...DEFAULT_STATUSES, "인쇄완료", "취소"]);
const ALLOWED_METHODS = new Set(["내부디지털", "5층인쇄", "외부생산"]);

/**
 * GET /api/print
 * ?statuses=a,b&methods=a,b&search=&searchType=order_no|member|phone|product
 * &dateFrom=&dateTo=&page=&pageSize=
 */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const sp = request.nextUrl.searchParams;

    const statusesRaw = (sp.get("statuses") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => ALLOWED_STATUSES.has(s));
    const statuses = statusesRaw.length ? statusesRaw : DEFAULT_STATUSES;

    const methods = (sp.get("methods") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => ALLOWED_METHODS.has(s));

    const searchTypeRaw = sp.get("searchType");
    const searchType = (
      ["order_no", "member", "phone", "product"] as const
    ).find((t) => t === searchTypeRaw);

    const dateFrom = sp.get("dateFrom");
    const dateTo = sp.get("dateTo");

    const params: OrderListParams = {
      statuses,
      printMethods: methods.length ? methods : undefined,
      search: sp.get("search")?.trim() || undefined,
      searchType,
      dateFrom: isDate(dateFrom) ? dateFrom : undefined,
      dateTo: isDate(dateTo) ? dateTo : undefined,
      showAllDates: !isDate(dateFrom) && !isDate(dateTo),
      sort: "orderDateDesc",
      page: Math.max(1, Number(sp.get("page")) || 1),
      pageSize: Math.min(Math.max(Number(sp.get("pageSize")) || 20, 1), 100),
    };

    return ok(await listOrders(params));
  });
}
