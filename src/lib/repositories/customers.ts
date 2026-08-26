import { query, queryOne } from "@/lib/db";
import { mapOrder } from "@/lib/repositories/orders";
import type { Customer, Order, Paged } from "@/lib/types";

type Row = Record<string, unknown>;

function mapCustomer(r: Row): Customer {
  return {
    id: r.id as number,
    name: r.name as string,
    phone: (r.phone as string) ?? null,
    address: (r.address as string) ?? null,
    memo: (r.memo as string) ?? null,
    createdAt: String(r.created_at),
    orderCount: r.order_count as number,
    totalAmount: r.total_amount as number,
    activeOrderCount: r.active_order_count as number,
    lastOrderDate: (r.last_order_date as string) ?? null,
    nearestWeddingDate: (r.nearest_wedding_date as string) ?? null,
  };
}

export async function listCustomers(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paged<Customer>> {
  const { search, page = 1, pageSize = 25 } = params;
  const values: unknown[] = [];
  const add = (v: unknown) => `$${values.push(v)}`;
  let whereSql = "";

  if (search && search.trim()) {
    const p = add(`%${search.trim()}%`);
    // coalesce 로 감싸면 trigram 인덱스를 타지 못한다.
    // 검색어가 비어있지 않으므로 NULL 은 어차피 '%X%' 에 매칭되지 않아 결과가 같다.
    whereSql = `WHERE (name ILIKE ${p} OR phone ILIKE ${p} OR address ILIKE ${p})`;
  }

  // 검색 조건이 customers 컬럼만 쓰므로 전체 GROUP BY 를 유발하는 집계 뷰 대신
  // 원본 테이블에서 센다. 결과는 동일하다.
  const countRow = await queryOne<{ total: number }>(
    `SELECT count(*)::int AS total FROM customers ${whereSql}`,
    values,
  );
  const total = countRow?.total ?? 0;
  const safePage = Math.max(page, 1);
  const safeSize = Math.min(Math.max(pageSize, 1), 200);

  const rows = await query<Row>(
    `SELECT * FROM customer_summary_view ${whereSql}
     ORDER BY order_count DESC, name
     LIMIT ${add(safeSize)} OFFSET ${add((safePage - 1) * safeSize)}`,
    values,
  );

  return {
    items: rows.map(mapCustomer),
    total,
    page: safePage,
    pageSize: safeSize,
    totalPages: Math.max(1, Math.ceil(total / safeSize)),
  };
}

/** 고객 정보 모달: 고객 + 해당 고객의 주문 전체 */
export async function getCustomerWithOrders(
  id: number,
): Promise<{ customer: Customer; orders: Order[] } | null> {
  const row = await queryOne<Row>(
    `SELECT * FROM customer_summary_view WHERE id = $1`,
    [id],
  );
  if (!row) return null;

  const orders = await query<Row>(
    `SELECT * FROM order_list_view
      WHERE customer_id = $1
      ORDER BY order_date DESC, id DESC
      LIMIT 200`,
    [id],
  );

  return {
    customer: mapCustomer(row),
    // orders.ts 의 mapOrder 를 재사용한다. 같은 뷰를 두 곳에서 따로 매핑하면
    // 뷰 컬럼이 바뀔 때 한쪽만 고쳐지는 drift 가 생긴다.
    orders: orders.map((o) => mapOrder(o) as Order),
  };
}

export async function updateCustomer(
  id: number,
  data: { name?: string; phone?: string | null; address?: string | null; memo?: string | null },
): Promise<Customer | null> {
  const updated = await queryOne<Row>(
    `UPDATE customers SET
       name    = coalesce($2, name),
       phone   = $3,
       address = $4,
       memo    = $5
     WHERE id = $1
     RETURNING id`,
    [id, data.name ?? null, data.phone ?? null, data.address ?? null, data.memo ?? null],
  );
  if (!updated) return null;
  const row = await queryOne<Row>(`SELECT * FROM customer_summary_view WHERE id = $1`, [id]);
  return row ? mapCustomer(row) : null;
}
