import { query, queryOne } from "@/lib/db";
import type {
  Paged,
  PurchaseOrder,
  PurchaseOrderInput,
  PurchaseOrderStatus,
  PurchasingRow,
} from "@/lib/types";

type Row = Record<string, unknown>;

function mapPurchaseOrder(r: Row): PurchaseOrder {
  return {
    id: r.po_id as number,
    orderId: r.order_id as number,
    vendorName: r.vendor_name as string,
    poNumber: (r.po_number as string) ?? null,
    orderedDate: r.ordered_date as string,
    expectedDate: (r.expected_date as string) ?? null,
    receivedDate: (r.received_date as string) ?? null,
    unitCost: (r.unit_cost as number) ?? null,
    quantity: (r.po_quantity as number) ?? null,
    status: r.po_status as PurchaseOrderStatus,
    orderSite: (r.order_site as string) ?? null,
    paymentMethod: (r.payment_method as PurchaseOrder["paymentMethod"]) ?? null,
    courierId: (r.inbound_courier_id as number) ?? null,
    courierName: (r.inbound_courier_name as string) ?? null,
    trackingUrlTemplate: (r.inbound_tracking_url_template as string) ?? null,
    trackingNumber: (r.tracking_number as string) ?? null,
    note: (r.po_note as string) ?? null,
    createdAt: String(r.po_created_at),
    updatedAt: String(r.po_updated_at),
  };
}

function mapRow(r: Row): PurchasingRow {
  return {
    orderId: r.order_id as number,
    orderNo: r.order_no as string,
    orderNoShort: r.order_no_short as string,
    orderStatus: r.order_status as PurchasingRow["orderStatus"],
    orderDate: r.order_date as string,
    orderQuantity: r.order_quantity as number,
    customerName: r.customer_name as string,
    customerPhone: (r.customer_phone as string) ?? null,
    productName: r.product_name as string,
    productSlug: r.product_slug as string,
    productIconPath: (r.product_icon_path as string) ?? null,
    productLinkUrl: (r.product_link_url as string) ?? null,
    productPurchasePrice: (r.product_purchase_price as number) ?? 0,
    optionText: (r.option_text as string) ?? null,
    po: r.po_id == null ? null : mapPurchaseOrder(r),
  };
}

const SELECT_COLS = `
  o.id                     AS order_id,
  o.order_no,
  right(o.order_no, 6)     AS order_no_short,
  o.order_status,
  o.order_date,
  o.quantity               AS order_quantity,
  o.option_text,
  c.name                   AS customer_name,
  c.phone                  AS customer_phone,
  p.name                   AS product_name,
  p.slug                   AS product_slug,
  p.icon_path              AS product_icon_path,
  p.link_url               AS product_link_url,
  p.purchase_price         AS product_purchase_price,
  po.id                    AS po_id,
  po.vendor_name,
  po.po_number,
  po.ordered_date,
  po.expected_date,
  po.received_date,
  po.unit_cost,
  po.quantity              AS po_quantity,
  po.status                AS po_status,
  po.order_site,
  po.payment_method,
  po.inbound_courier_id,
  pcr.name                 AS inbound_courier_name,
  pcr.tracking_url_template AS inbound_tracking_url_template,
  po.tracking_number,
  po.note                  AS po_note,
  po.created_at            AS po_created_at,
  po.updated_at            AS po_updated_at`;

const FROM_JOIN = `
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN products  p ON p.id = o.product_id
LEFT JOIN purchase_orders po ON po.order_id = o.id
LEFT JOIN couriers pcr ON pcr.id = po.inbound_courier_id`;

/** 발주관리 화면 탭 → WHERE 조건 */
function stageWhere(stage: string): string {
  switch (stage) {
    case "미등록":
      return `o.order_status = '외주발주' AND po.id IS NULL`;
    case "발주":
      return `po.status IN ('발주', '제작중')`;
    case "입고완료":
      return `po.status = '입고완료'`;
    default: // 전체
      return `(o.order_status = '외주발주' OR po.id IS NOT NULL)`;
  }
}

export async function listPurchasing(params: {
  stage?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paged<PurchasingRow>> {
  const { stage = "전체", search, dateFrom, dateTo, page = 1, pageSize = 20 } = params;

  const where: string[] = [stageWhere(stage)];
  const values: unknown[] = [];
  const add = (v: unknown) => `$${values.push(v)}`;

  if (search && search.trim()) {
    const p = add(`%${search.trim()}%`);
    where.push(
      `(o.order_no ILIKE ${p} OR c.name ILIKE ${p} OR c.phone ILIKE ${p} OR p.name ILIKE ${p} OR po.vendor_name ILIKE ${p})`,
    );
  }
  if (dateFrom) where.push(`o.order_date >= ${add(dateFrom)}`);
  if (dateTo) where.push(`o.order_date <= ${add(dateTo)}`);

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const safeSize = Math.min(Math.max(pageSize, 1), 100);
  const safePage = Math.max(page, 1);

  const countRow = await queryOne<{ total: number }>(
    `SELECT count(*)::int AS total ${FROM_JOIN} ${whereSql}`,
    values,
  );
  const total = countRow?.total ?? 0;

  const rows = await query<Row>(
    `SELECT ${SELECT_COLS} ${FROM_JOIN} ${whereSql}
     ORDER BY (po.id IS NOT NULL), po.ordered_date DESC NULLS LAST, o.order_date DESC, o.id DESC
     LIMIT ${add(safeSize)} OFFSET ${add((safePage - 1) * safeSize)}`,
    values,
  );

  return {
    items: rows.map(mapRow),
    total,
    page: safePage,
    pageSize: safeSize,
    totalPages: Math.max(1, Math.ceil(total / safeSize)),
  };
}

/** 상태별 건수 (집계 타일) */
export async function purchasingCounts(): Promise<{
  unregistered: number;
  ordering: number;
  received: number;
}> {
  const row = await queryOne<Row>(
    `SELECT
       count(*) FILTER (WHERE o.order_status = '외주발주' AND po.id IS NULL)     AS unregistered,
       count(*) FILTER (WHERE po.status IN ('발주', '제작중'))                    AS ordering,
       count(*) FILTER (WHERE po.status = '입고완료')                            AS received
     FROM orders o
     LEFT JOIN purchase_orders po ON po.order_id = o.id
     WHERE o.order_status = '외주발주' OR po.id IS NOT NULL`,
  );
  return {
    unregistered: Number(row?.unregistered ?? 0),
    ordering: Number(row?.ordering ?? 0),
    received: Number(row?.received ?? 0),
  };
}

/** 주문 1건의 발주 기록 조회 */
export async function getPurchaseOrder(orderId: number): Promise<PurchaseOrder | null> {
  const row = await queryOne<Row>(
    `SELECT
       po.id AS po_id, po.order_id, po.vendor_name, po.po_number, po.ordered_date,
       po.expected_date, po.received_date, po.unit_cost, po.quantity AS po_quantity,
       po.status AS po_status, po.order_site, po.payment_method,
       po.inbound_courier_id, pcr.name AS inbound_courier_name,
       pcr.tracking_url_template AS inbound_tracking_url_template,
       po.tracking_number, po.note AS po_note,
       po.created_at AS po_created_at, po.updated_at AS po_updated_at
     FROM purchase_orders po
     LEFT JOIN couriers pcr ON pcr.id = po.inbound_courier_id
     WHERE po.order_id = $1`,
    [orderId],
  );
  return row ? mapPurchaseOrder(row) : null;
}

/** 발주 기록 생성/수정 (upsert). 주문이 없으면 null */
export async function upsertPurchaseOrder(
  orderId: number,
  data: PurchaseOrderInput,
): Promise<PurchaseOrder | null> {
  const owner = await queryOne<Row>(`SELECT id FROM orders WHERE id = $1`, [orderId]);
  if (!owner) return null;

  await query(
    `INSERT INTO purchase_orders
       (order_id, vendor_name, po_number, ordered_date, expected_date, received_date,
        unit_cost, quantity, status, order_site, payment_method, inbound_courier_id,
        tracking_number, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (order_id) DO UPDATE SET
       vendor_name = EXCLUDED.vendor_name,
       po_number = EXCLUDED.po_number,
       ordered_date = EXCLUDED.ordered_date,
       expected_date = EXCLUDED.expected_date,
       received_date = EXCLUDED.received_date,
       unit_cost = EXCLUDED.unit_cost,
       quantity = EXCLUDED.quantity,
       status = EXCLUDED.status,
       order_site = EXCLUDED.order_site,
       payment_method = EXCLUDED.payment_method,
       inbound_courier_id = EXCLUDED.inbound_courier_id,
       tracking_number = EXCLUDED.tracking_number,
       note = EXCLUDED.note`,
    [
      orderId,
      data.vendorName,
      data.poNumber ?? null,
      data.orderedDate,
      data.expectedDate ?? null,
      data.receivedDate ?? null,
      data.unitCost ?? null,
      data.quantity ?? null,
      data.status,
      data.orderSite ?? null,
      data.paymentMethod ?? null,
      data.courierId ?? null,
      data.trackingNumber ?? null,
      data.note ?? null,
    ],
  );
  return getPurchaseOrder(orderId);
}

export async function deletePurchaseOrder(orderId: number): Promise<boolean> {
  const rows = await query<{ id: number }>(
    `DELETE FROM purchase_orders WHERE order_id = $1 RETURNING id`,
    [orderId],
  );
  return rows.length > 0;
}
