import { query, queryOne } from "@/lib/db";
import { weekRange } from "@/lib/format";
import type { BreakdownRow, StatusCountRow, SummaryStats } from "@/lib/types";

/** 요약 탭 상단 통계 타일 3종 (+ 금액) */
export async function getSummary(today: string): Promise<SummaryStats> {
  const row = await queryOne<{
    total_orders: number;
    active_orders: number;
    today_new_orders: number;
    total_amount: number;
    active_amount: number;
  }>(
    `SELECT
       count(*)::int                                                   AS total_orders,
       count(*) FILTER (WHERE os.is_active_stage)::int                 AS active_orders,
       count(*) FILTER (WHERE o.order_date = $1)::int                  AS today_new_orders,
       coalesce(sum(o.total_amount), 0)::bigint                        AS total_amount,
       coalesce(sum(o.total_amount) FILTER (WHERE os.is_active_stage), 0)::bigint
                                                                       AS active_amount
     FROM orders o
     JOIN order_statuses os ON os.code = o.order_status`,
    [today],
  );

  return {
    totalOrders: row?.total_orders ?? 0,
    activeOrders: row?.active_orders ?? 0,
    todayNewOrders: row?.today_new_orders ?? 0,
    totalAmount: row?.total_amount ?? 0,
    activeAmount: row?.active_amount ?? 0,
  };
}

/** 상태별 필터 칩에 붙는 건수 (전체 + 9종) */
export async function getStatusChipCounts(): Promise<{
  total: number;
  byStatus: StatusCountRow[];
}> {
  const rows = await query<{ code: string; order_count: number }>(
    `SELECT os.code, count(o.id)::int AS order_count
     FROM order_statuses os
     LEFT JOIN orders o ON o.order_status = os.code
     GROUP BY os.code, os.sort_order
     ORDER BY os.sort_order`,
  );
  const total = rows.reduce((acc, r) => acc + r.order_count, 0);
  return {
    total,
    byStatus: rows.map((r) => ({
      status: r.code as StatusCountRow["status"],
      orderCount: r.order_count,
    })),
  };
}

/**
 * 품목별 주문 현황.
 * period="day"  → 기준일 당일
 * period="week" → 기준일이 속한 주 (월요일 시작 ~ 일요일 종료)
 */
export async function getBreakdown(
  date: string,
  period: "day" | "week",
): Promise<{ rows: BreakdownRow[]; from: string; to: string }> {
  const { from, to } =
    period === "week"
      ? (() => {
          const r = weekRange(date);
          return { from: r.start, to: r.end };
        })()
      : { from: date, to: date };

  const rows = await query<{
    product_id: number;
    product_name: string;
    product_slug: string;
    icon_path: string | null;
    order_count: number;
    total_quantity: number;
    total_amount: number;
  }>(
    `SELECT
       p.id                                     AS product_id,
       p.name                                   AS product_name,
       p.slug                                   AS product_slug,
       p.icon_path                              AS icon_path,
       count(o.id)::int                         AS order_count,
       coalesce(sum(o.quantity), 0)::bigint     AS total_quantity,
       coalesce(sum(o.total_amount), 0)::bigint AS total_amount
     FROM products p
     JOIN orders o
       ON o.product_id = p.id
      AND o.order_date BETWEEN $1 AND $2
     GROUP BY p.id
     ORDER BY count(o.id) DESC, p.sort_order`,
    [from, to],
  );

  return {
    from,
    to,
    rows: rows.map((r) => ({
      productId: r.product_id,
      productName: r.product_name,
      productSlug: r.product_slug,
      iconPath: r.icon_path,
      orderCount: r.order_count,
      totalQuantity: r.total_quantity,
      totalAmount: r.total_amount,
    })),
  };
}

/** 요약 탭 '진행상태별 건수' — 기준일에 접수된 주문을 상태별로 */
export async function getQuickStats(date: string): Promise<
  { status: string; orderCount: number; isQuickTile: boolean }[]
> {
  const rows = await query<{
    code: string;
    order_count: number;
    is_quick_tile: boolean;
  }>(
    `SELECT os.code, os.is_quick_tile,
            count(o.id) FILTER (WHERE o.order_date = $1)::int AS order_count
     FROM order_statuses os
     LEFT JOIN orders o ON o.order_status = os.code
     GROUP BY os.code, os.sort_order, os.is_quick_tile
     ORDER BY os.sort_order`,
    [date],
  );
  return rows.map((r) => ({
    status: r.code,
    orderCount: r.order_count,
    isQuickTile: r.is_quick_tile,
  }));
}

/** 상태 타일 클릭 시 뜨는 상세 모달 — 특정 날짜/상태의 품목별 분해 */
export async function getStatusDetail(
  date: string,
  status: string,
): Promise<BreakdownRow[]> {
  const rows = await query<{
    product_id: number;
    product_name: string;
    product_slug: string;
    icon_path: string | null;
    order_count: number;
    total_quantity: number;
    total_amount: number;
  }>(
    `SELECT
       p.id AS product_id, p.name AS product_name, p.slug AS product_slug,
       p.icon_path,
       count(o.id)::int                         AS order_count,
       coalesce(sum(o.quantity), 0)::bigint     AS total_quantity,
       coalesce(sum(o.total_amount), 0)::bigint AS total_amount
     FROM orders o
     JOIN products p ON p.id = o.product_id
     WHERE o.order_date = $1 AND o.order_status = $2
     GROUP BY p.id
     ORDER BY count(o.id) DESC, p.sort_order`,
    [date, status],
  );
  return rows.map((r) => ({
    productId: r.product_id,
    productName: r.product_name,
    productSlug: r.product_slug,
    iconPath: r.icon_path,
    orderCount: r.order_count,
    totalQuantity: r.total_quantity,
    totalAmount: r.total_amount,
  }));
}

/** 대시보드용 월별 추이 */
export async function getMonthlyTrend(months = 12): Promise<
  { month: string; orderCount: number; totalAmount: number }[]
> {
  const rows = await query<{
    month: string;
    order_count: number;
    total_amount: number;
  }>(
    `SELECT to_char(date_trunc('month', order_date), 'YYYY-MM') AS month,
            count(*)::int                                       AS order_count,
            coalesce(sum(total_amount), 0)::bigint              AS total_amount
     FROM orders
     GROUP BY 1
     ORDER BY 1 DESC
     LIMIT $1`,
    [months],
  );
  return rows
    .map((r) => ({
      month: r.month,
      orderCount: r.order_count,
      totalAmount: r.total_amount,
    }))
    .reverse();
}
