import { query, queryOne } from "@/lib/db";
import { weekRange } from "@/lib/format";
import type {
  BreakdownRow,
  DashboardData,
  DashboardDay,
  StatusCountRow,
  SummaryStats,
} from "@/lib/types";

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
    // order_status 는 NOT NULL 이라 count(o.id) 와 결과가 같고,
    // 인덱스에 있는 컬럼을 세므로 heap 접근을 줄일 수 있다.
    `SELECT os.code, count(o.order_status)::int AS order_count
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
    // 날짜 조건을 FILTER 가 아니라 ON 절에 두면 orders_date_status_idx 를 탈 수 있다.
    // LEFT JOIN 이므로 해당 날짜에 주문이 없는 상태도 count 0 으로 그대로 남는다.
    `SELECT os.code, os.is_quick_tile,
            count(o.id)::int AS order_count
     FROM order_statuses os
     LEFT JOIN orders o
       ON o.order_status = os.code
      AND o.order_date   = $1
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

/** 대시보드 한 화면에 필요한 통계 묶음 (선택된 달의 일별 매출 + 전체 현황) */
export async function getDashboard(month: string, today: string): Promise<DashboardData> {
  const first = `${month}-01`;

  const dailyRows = await query<{
    date: string;
    order_count: number;
    total_amount: number;
    paid_amount: number;
  }>(
    `SELECT to_char(order_date, 'YYYY-MM-DD')                    AS date,
            count(*)::int                                        AS order_count,
            coalesce(sum(total_amount), 0)::bigint               AS total_amount,
            coalesce(sum(total_amount)
                     FILTER (WHERE payment_status = '결제완료'), 0)::bigint AS paid_amount
     FROM orders
     WHERE order_date >= $1::date
       AND order_date <  ($1::date + INTERVAL '1 month')
     GROUP BY 1
     ORDER BY 1`,
    [first],
  );

  const byDate = new Map(dailyRows.map((r) => [r.date, r]));
  const daysInMonth = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    0,
  ).getDate();
  const daily: DashboardDay[] = Array.from({ length: daysInMonth }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, "0")}`;
    const r = byDate.get(date);
    return {
      date,
      orderCount: r?.order_count ?? 0,
      totalAmount: Number(r?.total_amount ?? 0),
      paidAmount: Number(r?.paid_amount ?? 0),
    };
  });

  const monthOrders = daily.reduce((a, d) => a + d.orderCount, 0);
  const monthAmount = daily.reduce((a, d) => a + d.totalAmount, 0);
  const monthPaidAmount = daily.reduce((a, d) => a + d.paidAmount, 0);

  const totals = await queryOne<{
    total_orders: number;
    active_orders: number;
    done_orders: number;
    cancelled_orders: number;
  }>(
    `SELECT
       count(*)::int                                            AS total_orders,
       count(*) FILTER (WHERE os.is_active_stage)::int           AS active_orders,
       count(*) FILTER (WHERE o.order_status = '배송완료')::int   AS done_orders,
       count(*) FILTER (WHERE o.order_status = '취소')::int       AS cancelled_orders
     FROM orders o
     JOIN order_statuses os ON os.code = o.order_status`,
  );

  const cust = await queryOne<{
    total: number;
    new_this_month: number;
    active: number;
  }>(
    `SELECT
       (SELECT count(*)::int FROM customers)                                       AS total,
       (SELECT count(*)::int FROM customers
         WHERE date_trunc('month', created_at) = date_trunc('month', $1::date))    AS new_this_month,
       (SELECT count(DISTINCT o.customer_id)::int
          FROM orders o JOIN order_statuses os ON os.code = o.order_status
         WHERE os.is_active_stage)                                                 AS active`,
    [today],
  );

  return {
    month,
    daily,
    monthOrders,
    monthAmount,
    monthPaidAmount,
    totalOrders: totals?.total_orders ?? 0,
    activeOrders: totals?.active_orders ?? 0,
    doneOrders: totals?.done_orders ?? 0,
    cancelledOrders: totals?.cancelled_orders ?? 0,
    totalCustomers: cust?.total ?? 0,
    newCustomers: cust?.new_this_month ?? 0,
    activeCustomers: cust?.active ?? 0,
  };
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
