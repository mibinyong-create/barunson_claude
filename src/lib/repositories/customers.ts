import { query, queryOne } from "@/lib/db";
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
    whereSql = `WHERE name ILIKE ${p} OR coalesce(phone,'') ILIKE ${p} OR coalesce(address,'') ILIKE ${p}`;
  }

  const countRow = await queryOne<{ total: number }>(
    `SELECT count(*)::int AS total FROM customer_summary_view ${whereSql}`,
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
    `SELECT * FROM order_list_view WHERE customer_id = $1 ORDER BY order_date DESC, id DESC`,
    [id],
  );

  return {
    customer: mapCustomer(row),
    orders: orders.map((o) => ({
      id: o.id as number,
      orderNo: o.order_no as string,
      orderNoShort: o.order_no_short as string,
      customerId: o.customer_id as number,
      customerName: o.customer_name as string,
      customerPhone: (o.customer_phone as string) ?? null,
      customerAddress: (o.customer_address as string) ?? null,
      productId: o.product_id as number,
      productName: o.product_name as string,
      productSlug: o.product_slug as string,
      productIconPath: (o.product_icon_path as string) ?? null,
      productLinkUrl: (o.product_link_url as string) ?? null,
      productCode: o.product_code as string,
      optionText: (o.option_text as string) ?? null,
      quantity: o.quantity as number,
      unitPrice: o.unit_price as number,
      totalAmount: o.total_amount as number,
      orderDate: o.order_date as string,
      weddingDate: o.wedding_date as string,
      deliveryMethod: o.delivery_method as Order["deliveryMethod"],
      shippingAddress: (o.shipping_address as string) ?? null,
      paymentStatus: o.payment_status as Order["paymentStatus"],
      orderStatus: o.order_status as Order["orderStatus"],
      isActiveStage: o.is_active_stage as boolean,
      withInvitation: o.with_invitation as boolean,
      courierId: (o.courier_id as number) ?? null,
      courierName: (o.courier_name as string) ?? null,
      trackingUrlTemplate: (o.tracking_url_template as string) ?? null,
      trackingNumber: (o.tracking_number as string) ?? null,
      deliveredDate: (o.delivered_date as string) ?? null,
      memo: (o.memo as string) ?? null,
      createdAt: String(o.created_at),
      updatedAt: String(o.updated_at),
      attachmentCount: o.attachment_count as number,
      draftCount: o.draft_count as number,
    })),
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
