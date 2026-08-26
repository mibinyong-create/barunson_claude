import { query, queryOne, transaction } from "@/lib/db";
import type {
  Order,
  OrderDetail,
  OrderFile,
  OrderFileKind,
  OrderListParams,
  Paged,
} from "@/lib/types";

/** order_list_view 의 snake_case 행 → camelCase Order */
export type OrderRow = Record<string, unknown>;

export function mapOrder(r: OrderRow): Order {
  return {
    id: r.id as number,
    orderNo: r.order_no as string,
    orderNoShort: r.order_no_short as string,
    customerId: r.customer_id as number,
    customerName: r.customer_name as string,
    customerPhone: (r.customer_phone as string) ?? null,
    customerAddress: (r.customer_address as string) ?? null,
    productId: r.product_id as number,
    productName: r.product_name as string,
    productSlug: r.product_slug as string,
    productIconPath: (r.product_icon_path as string) ?? null,
    productLinkUrl: (r.product_link_url as string) ?? null,
    productCode: r.product_code as string,
    optionText: (r.option_text as string) ?? null,
    quantity: r.quantity as number,
    unitPrice: r.unit_price as number,
    totalAmount: r.total_amount as number,
    orderDate: r.order_date as string,
    weddingDate: r.wedding_date as string,
    deliveryMethod: r.delivery_method as Order["deliveryMethod"],
    shippingAddress: (r.shipping_address as string) ?? null,
    paymentStatus: r.payment_status as Order["paymentStatus"],
    orderStatus: r.order_status as Order["orderStatus"],
    isActiveStage: r.is_active_stage as boolean,
    withInvitation: r.with_invitation as boolean,
    courierId: (r.courier_id as number) ?? null,
    courierName: (r.courier_name as string) ?? null,
    trackingUrlTemplate: (r.tracking_url_template as string) ?? null,
    trackingNumber: (r.tracking_number as string) ?? null,
    deliveredDate: (r.delivered_date as string) ?? null,
    memo: (r.memo as string) ?? null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    attachmentCount: r.attachment_count as number,
    draftCount: r.draft_count as number,
  };
}

function mapFile(r: OrderRow): OrderFile {
  return {
    id: r.id as number,
    orderId: r.order_id as number,
    kind: r.kind as OrderFileKind,
    fileName: r.file_name as string,
    fileSize: (r.file_size as number) ?? null,
    contentType: (r.content_type as string) ?? null,
    uploadedBy: r.uploaded_by as string,
    uploadedAt: String(r.uploaded_at),
  };
}

// Map 을 쓰면 sort="constructor" 같은 값이 Object.prototype 의 멤버를 반환하는 일이 없다.
const SORT_SQL = new Map<string, string>([
  ["orderDateDesc", "order_date DESC, id DESC"],
  ["orderDateAsc", "order_date ASC, id ASC"],
  ["weddingDateAsc", "wedding_date ASC, id ASC"],
  ["amountDesc", "total_amount DESC, id DESC"],
]);
const DEFAULT_SORT_SQL = SORT_SQL.get("orderDateDesc")!;

/**
 * 목록 조회. 원본의 getFiltered() 와 동일한 필터 조합(AND)을 SQL 로 옮긴 것.
 * - search: 주문자명 / 주문번호 / 연락처 / 상품명 부분일치
 * - status, paymentStatus, productId, orderDate 각각 AND
 * - showAllDates 가 true 면 orderDate 필터 무시
 */
export async function listOrders(params: OrderListParams): Promise<Paged<Order>> {
  const {
    search,
    status,
    paymentStatus,
    productId,
    orderDate,
    showAllDates = false,
    sort = "orderDateDesc",
    page = 1,
    pageSize = 10,
  } = params;

  const where: string[] = [];
  const values: unknown[] = [];
  const add = (v: unknown) => `$${values.push(v)}`;

  if (search && search.trim()) {
    // 서로 다른 테이블 컬럼을 OR 로 묶으면 어떤 인덱스도 타지 못하고 조인 결과 전체를
    // Join Filter 로 훑는다. 테이블별로 분해해 각자의 trigram 인덱스를 쓰게 한다.
    // 검색어는 trim() 후 비어있지 않으므로 coalesce(phone,'') 와 phone 은 결과가 같다.
    const p = add(`%${search.trim()}%`);
    where.push(`id IN (
      SELECT o2.id FROM orders o2 WHERE o2.order_no ILIKE ${p}
      UNION
      SELECT o2.id FROM orders o2
        JOIN customers c2 ON c2.id = o2.customer_id
       WHERE c2.name ILIKE ${p} OR c2.phone ILIKE ${p}
      UNION
      SELECT o2.id FROM orders o2
        JOIN products p2 ON p2.id = o2.product_id
       WHERE p2.name ILIKE ${p}
    )`);
  }
  if (status && status !== "전체") where.push(`order_status = ${add(status)}`);
  if (paymentStatus && paymentStatus !== "전체")
    where.push(`payment_status = ${add(paymentStatus)}`);
  if (productId) where.push(`product_id = ${add(productId)}`);
  if (!showAllDates && orderDate) where.push(`order_date = ${add(orderDate)}`);

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const orderSql = SORT_SQL.get(sort) ?? DEFAULT_SORT_SQL;

  const safePageSize = Math.min(Math.max(pageSize, 1), 200);
  const safePage = Math.max(page, 1);
  const offset = (safePage - 1) * safePageSize;

  // 필터 파라미터 스냅샷. 두 쿼리가 같은 배열을 공유하면 실행 순서에 의존하게 된다.
  const whereValues = [...values];

  const countRow = await queryOne<{ total: number }>(
    `SELECT count(*)::int AS total FROM order_list_view ${whereSql}`,
    whereValues,
  );
  const total = countRow?.total ?? 0;

  const rows = await query<OrderRow>(
    `SELECT * FROM order_list_view ${whereSql}
     ORDER BY ${orderSql}
     LIMIT $${whereValues.length + 1} OFFSET $${whereValues.length + 2}`,
    [...whereValues, safePageSize, offset],
  );

  return {
    items: rows.map(mapOrder),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

export async function getOrder(id: number): Promise<OrderDetail | null> {
  const row = await queryOne<OrderRow>(
    `SELECT * FROM order_list_view WHERE id = $1`,
    [id],
  );
  if (!row) return null;

  // 서로 독립적이므로 직렬로 기다릴 이유가 없다.
  const [files, history] = await Promise.all([
    query<OrderRow>(
      `SELECT * FROM order_files WHERE order_id = $1 ORDER BY uploaded_at, id`,
      [id],
    ),
    query<OrderRow>(
      `SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY changed_at DESC, id DESC`,
      [id],
    ),
  ]);

  const mapped = files.map(mapFile);
  return {
    ...mapOrder(row),
    attachments: mapped.filter((f) => f.kind === "attachment"),
    drafts: mapped.filter((f) => f.kind === "draft"),
    statusHistory: history.map((h) => ({
      id: h.id as number,
      fromStatus: (h.from_status as OrderDetail["orderStatus"]) ?? null,
      toStatus: h.to_status as OrderDetail["orderStatus"],
      note: (h.note as string) ?? null,
      changedBy: h.changed_by as string,
      changedAt: String(h.changed_at),
    })),
  };
}

export type OrderInput = {
  customerName: string;
  phone?: string | null;
  productName: string;
  optionText?: string | null;
  quantity: number;
  unitPrice: number;
  orderDate: string;
  weddingDate: string;
  deliveryMethod: string;
  shippingAddress?: string | null;
  paymentStatus: string;
  orderStatus: string;
  withInvitation?: boolean;
  courierName?: string | null;
  trackingNumber?: string | null;
  deliveredDate?: string | null;
  memo?: string | null;
};

/** 고객은 이름+연락처로 upsert 한다. 원본은 주문마다 이름을 들고 있었다. */
async function upsertCustomer(
  client: { query: (t: string, v?: unknown[]) => Promise<{ rows: OrderRow[] }> },
  name: string,
  phone: string | null,
  address: string | null,
): Promise<number> {
  const { rows } = await client.query(
    `INSERT INTO customers (name, phone, address)
     VALUES ($1, $2, $3)
     ON CONFLICT (name, coalesce(phone, ''))
     DO UPDATE SET address = coalesce(EXCLUDED.address, customers.address)
     RETURNING id`,
    [name, phone, address],
  );
  return rows[0].id as number;
}

async function resolveProductId(
  client: { query: (t: string, v?: unknown[]) => Promise<{ rows: OrderRow[] }> },
  productName: string,
): Promise<number> {
  const found = await client.query(`SELECT id FROM products WHERE name = $1`, [
    productName,
  ]);
  if (found.rows.length) return found.rows[0].id as number;

  // datalist 에 없는 상품명을 직접 입력한 경우: 슬러그 'item' 계열로 새로 등록
  const slugBase = "item";
  const created = await client.query(
    `INSERT INTO products (name, slug, default_unit_price, sort_order)
     VALUES ($1, $2 || '-' || nextval(pg_get_serial_sequence('products','id'))::text, 0, 999)
     RETURNING id`,
    [productName, slugBase],
  );
  return created.rows[0].id as number;
}

async function resolveCourierId(
  client: { query: (t: string, v?: unknown[]) => Promise<{ rows: OrderRow[] }> },
  courierName: string | null | undefined,
): Promise<number | null> {
  if (!courierName) return null;
  const { rows } = await client.query(`SELECT id FROM couriers WHERE name = $1`, [
    courierName,
  ]);
  return rows.length ? (rows[0].id as number) : null;
}

export async function createOrder(input: OrderInput): Promise<OrderDetail> {
  const id = await transaction(async (client) => {
    const customerId = await upsertCustomer(
      client,
      input.customerName,
      input.phone ?? null,
      input.shippingAddress ?? null,
    );
    const productId = await resolveProductId(client, input.productName);
    const courierId = await resolveCourierId(client, input.courierName);

    const year = Number(input.orderDate.slice(0, 4));
    const { rows: noRows } = await client.query(
      `SELECT next_order_no($1) AS order_no`,
      [year],
    );

    const { rows } = await client.query(
      `INSERT INTO orders (
         order_no, customer_id, product_id, option_text, quantity, unit_price,
         order_date, wedding_date, delivery_method, shipping_address,
         payment_status, order_status, with_invitation,
         courier_id, tracking_number, delivered_date, memo
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING id`,
      [
        noRows[0].order_no,
        customerId,
        productId,
        input.optionText ?? null,
        input.quantity,
        input.unitPrice,
        input.orderDate,
        input.weddingDate,
        input.deliveryMethod,
        input.shippingAddress ?? null,
        input.paymentStatus,
        input.orderStatus,
        input.withInvitation ?? false,
        courierId,
        input.trackingNumber ?? null,
        input.deliveredDate ?? null,
        input.memo ?? null,
      ],
    );
    return rows[0].id as number;
  });

  const created = await getOrder(id);
  if (!created) throw new Error("주문 생성 후 조회에 실패했습니다.");
  return created;
}

export async function updateOrder(
  id: number,
  input: OrderInput,
): Promise<OrderDetail | null> {
  const exists = await queryOne<OrderRow>(`SELECT id FROM orders WHERE id = $1`, [id]);
  if (!exists) return null;

  await transaction(async (client) => {
    const customerId = await upsertCustomer(
      client,
      input.customerName,
      input.phone ?? null,
      input.shippingAddress ?? null,
    );
    const productId = await resolveProductId(client, input.productName);
    const courierId = await resolveCourierId(client, input.courierName);

    await client.query(
      `UPDATE orders SET
         customer_id = $2, product_id = $3, option_text = $4, quantity = $5,
         unit_price = $6, order_date = $7, wedding_date = $8, delivery_method = $9,
         shipping_address = $10, payment_status = $11, order_status = $12,
         with_invitation = $13, courier_id = $14, tracking_number = $15,
         delivered_date = $16, memo = $17
       WHERE id = $1`,
      [
        id,
        customerId,
        productId,
        input.optionText ?? null,
        input.quantity,
        input.unitPrice,
        input.orderDate,
        input.weddingDate,
        input.deliveryMethod,
        input.shippingAddress ?? null,
        input.paymentStatus,
        input.orderStatus,
        input.withInvitation ?? false,
        courierId,
        input.trackingNumber ?? null,
        input.deliveredDate ?? null,
        input.memo ?? null,
      ],
    );
  });

  return getOrder(id);
}

/** 진행 상태만 변경 (이력은 트리거가 자동 기록) */
export async function updateOrderStatus(
  id: number,
  status: string,
): Promise<OrderDetail | null> {
  const updated = await queryOne<OrderRow>(
    `UPDATE orders SET order_status = $2 WHERE id = $1 RETURNING id`,
    [id, status],
  );
  if (!updated) return null;
  return getOrder(id);
}

/** 택배 정보만 변경 */
export async function updateOrderCourier(
  id: number,
  data: {
    courierName?: string | null;
    trackingNumber?: string | null;
    deliveredDate?: string | null;
    deliveryMethod?: string | null;
    shippingAddress?: string | null;
  },
): Promise<OrderDetail | null> {
  const result = await transaction(async (client) => {
    const courierId = await resolveCourierId(client, data.courierName);
    const { rows } = await client.query(
      `UPDATE orders SET
         courier_id = $2,
         tracking_number = $3,
         delivered_date = $4,
         delivery_method = coalesce($5, delivery_method),
         shipping_address = $6
       WHERE id = $1
       RETURNING id`,
      [
        id,
        courierId,
        data.trackingNumber ?? null,
        data.deliveredDate ?? null,
        data.deliveryMethod ?? null,
        data.shippingAddress ?? null,
      ],
    );
    return rows.length > 0;
  });
  if (!result) return null;
  return getOrder(id);
}

export async function deleteOrders(ids: number[]): Promise<number> {
  if (!ids.length) return 0;
  const rows = await query<{ id: number }>(
    `DELETE FROM orders WHERE id = ANY($1::int[]) RETURNING id`,
    [ids],
  );
  return rows.length;
}

// ---------------------------------------------------------------- files
export async function listOrderFiles(
  orderId: number,
  kind?: OrderFileKind,
): Promise<OrderFile[]> {
  const rows = kind
    ? await query<OrderRow>(
        `SELECT * FROM order_files WHERE order_id = $1 AND kind = $2 ORDER BY uploaded_at, id`,
        [orderId, kind],
      )
    : await query<OrderRow>(
        `SELECT * FROM order_files WHERE order_id = $1 ORDER BY uploaded_at, id`,
        [orderId],
      );
  return rows.map(mapFile);
}

export async function addOrderFile(
  orderId: number,
  kind: OrderFileKind,
  fileName: string,
  fileSize?: number | null,
  contentType?: string | null,
): Promise<OrderFile | null> {
  const owner = await queryOne<OrderRow>(`SELECT id FROM orders WHERE id = $1`, [
    orderId,
  ]);
  if (!owner) return null;

  const row = await queryOne<OrderRow>(
    `INSERT INTO order_files (order_id, kind, file_name, file_size, content_type)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [orderId, kind, fileName, fileSize ?? null, contentType ?? null],
  );
  return row ? mapFile(row) : null;
}

export async function deleteOrderFile(
  orderId: number,
  fileId: number,
): Promise<boolean> {
  const rows = await query<{ id: number }>(
    `DELETE FROM order_files WHERE id = $1 AND order_id = $2 RETURNING id`,
    [fileId, orderId],
  );
  return rows.length > 0;
}
