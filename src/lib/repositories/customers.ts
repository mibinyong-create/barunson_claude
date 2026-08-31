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
    orders: (r.orders as Customer["orders"]) ?? [],
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
    // 주문번호 검색: 해당 문자열을 주문번호에 가진 주문이 하나라도 있는 고객을 포함한다
    // (orders.order_no 에 trigram GIN 인덱스가 있어 부분일치가 빠르다).
    whereSql = `WHERE (
      v.name ILIKE ${p} OR v.phone ILIKE ${p} OR v.address ILIKE ${p}
      OR EXISTS (SELECT 1 FROM orders ord WHERE ord.customer_id = v.id AND ord.order_no ILIKE ${p})
    )`;
  }

  // count·list 모두 관계에 별칭 v 를 붙여 whereSql 을 그대로 공유한다.
  // (customers 와 customer_summary_view 는 name/phone/address/id 컬럼이 동일)
  const countRow = await queryOne<{ total: number }>(
    `SELECT count(*)::int AS total FROM customers v ${whereSql}`,
    values,
  );
  const total = countRow?.total ?? 0;
  const safePage = Math.max(page, 1);
  const safeSize = Math.min(Math.max(pageSize, 1), 200);

  const rows = await query<Row>(
    `SELECT v.*, coalesce(ol.orders, '[]'::json) AS orders
       FROM customer_summary_view v
       LEFT JOIN LATERAL (
         SELECT json_agg(
                  json_build_object(
                    'orderNo',      o.order_no,
                    'orderNoShort', right(o.order_no, 6),
                    'productName',  p.name,
                    'optionText',   o.option_text
                  )
                  ORDER BY o.order_date DESC, o.id DESC
                ) AS orders
           FROM orders o
           JOIN products p ON p.id = o.product_id
          WHERE o.customer_id = v.id
       ) ol ON true
       ${whereSql}
     ORDER BY v.order_count DESC, v.name
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
