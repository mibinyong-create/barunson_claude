import { query, queryOne } from "@/lib/db";
import type { Product } from "@/lib/types";

type Row = Record<string, unknown>;

function mapProduct(r: Row): Product {
  return {
    id: r.id as number,
    name: r.name as string,
    slug: r.slug as string,
    defaultUnitPrice: r.default_unit_price as number,
    iconPath: (r.icon_path as string) ?? null,
    linkUrl: (r.link_url as string) ?? null,
    sortOrder: r.sort_order as number,
    isActive: r.is_active as boolean,
    orderCount: r.order_count as number,
    totalQuantity: r.total_quantity as number,
    totalAmount: r.total_amount as number,
    activeOrderCount: r.active_order_count as number,
  };
}

export async function listProducts(includeInactive = false): Promise<Product[]> {
  const rows = await query<Row>(
    `SELECT * FROM product_summary_view
     ${includeInactive ? "" : "WHERE is_active"}
     ORDER BY sort_order, name`,
  );
  return rows.map(mapProduct);
}

export async function getProduct(id: number): Promise<Product | null> {
  const row = await queryOne<Row>(`SELECT * FROM product_summary_view WHERE id = $1`, [id]);
  return row ? mapProduct(row) : null;
}

export async function updateProduct(
  id: number,
  data: { name?: string; defaultUnitPrice?: number; isActive?: boolean; linkUrl?: string | null },
): Promise<Product | null> {
  const updated = await queryOne<Row>(
    `UPDATE products SET
       name               = coalesce($2, name),
       default_unit_price = coalesce($3, default_unit_price),
       is_active          = coalesce($4, is_active),
       link_url           = coalesce($5, link_url)
     WHERE id = $1
     RETURNING id`,
    [id, data.name ?? null, data.defaultUnitPrice ?? null, data.isActive ?? null, data.linkUrl ?? null],
  );
  if (!updated) return null;
  return getProduct(id);
}
