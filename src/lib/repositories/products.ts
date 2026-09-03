import { query, queryOne } from "@/lib/db";
import { PREP_STEPS } from "@/lib/prep-steps";
import type { Product, ProductPrepInput, ProductPrepStep } from "@/lib/types";

type Row = Record<string, unknown>;

/** 6단계를 항상 채워서 돌려준다 (DB 에 없는 단계는 미완료 기본값). */
function fillPrepSteps(rows: Row[]): ProductPrepStep[] {
  return PREP_STEPS.map((meta) => {
    const r = rows.find((x) => x.step_code === meta.code);
    return {
      code: meta.code,
      order: meta.order,
      done: (r?.done as boolean) ?? false,
      targetDate: (r?.target_date as string) ?? null,
      doneDate: (r?.done_date as string) ?? null,
    };
  });
}

function mapProduct(r: Row, prep: ProductPrepStep[]): Product {
  return {
    id: r.id as number,
    name: r.name as string,
    slug: r.slug as string,
    defaultUnitPrice: r.default_unit_price as number,
    purchasePrice: (r.purchase_price as number) ?? 0,
    iconPath: (r.icon_path as string) ?? null,
    linkUrl: (r.link_url as string) ?? null,
    sortOrder: r.sort_order as number,
    isActive: r.is_active as boolean,
    orderCount: r.order_count as number,
    totalQuantity: r.total_quantity as number,
    totalAmount: r.total_amount as number,
    activeOrderCount: r.active_order_count as number,
    prepSteps: prep,
  };
}

export async function listProducts(includeInactive = false): Promise<Product[]> {
  const rows = await query<Row>(
    `SELECT * FROM product_summary_view
     ${includeInactive ? "" : "WHERE is_active"}
     ORDER BY sort_order, name`,
  );
  const prepRows = await query<Row>(
    `SELECT product_id, step_code, step_order, done, target_date, done_date
     FROM product_prep_steps`,
  );
  const byProduct = new Map<number, Row[]>();
  for (const pr of prepRows) {
    const pid = pr.product_id as number;
    const list = byProduct.get(pid);
    if (list) list.push(pr);
    else byProduct.set(pid, [pr]);
  }
  return rows.map((r) => mapProduct(r, fillPrepSteps(byProduct.get(r.id as number) ?? [])));
}

export async function getProduct(id: number): Promise<Product | null> {
  const row = await queryOne<Row>(`SELECT * FROM product_summary_view WHERE id = $1`, [id]);
  if (!row) return null;
  const prepRows = await query<Row>(
    `SELECT step_code, step_order, done, target_date, done_date
     FROM product_prep_steps WHERE product_id = $1`,
    [id],
  );
  return mapProduct(row, fillPrepSteps(prepRows));
}

export async function updateProduct(
  id: number,
  data: {
    name?: string;
    defaultUnitPrice?: number;
    purchasePrice?: number;
    isActive?: boolean;
    linkUrl?: string | null;
  },
): Promise<Product | null> {
  const updated = await queryOne<Row>(
    `UPDATE products SET
       name               = coalesce($2, name),
       default_unit_price = coalesce($3, default_unit_price),
       is_active          = coalesce($4, is_active),
       link_url           = coalesce($5, link_url),
       purchase_price     = coalesce($6, purchase_price)
     WHERE id = $1
     RETURNING id`,
    [
      id,
      data.name ?? null,
      data.defaultUnitPrice ?? null,
      data.isActive ?? null,
      data.linkUrl ?? null,
      data.purchasePrice ?? null,
    ],
  );
  if (!updated) return null;
  return getProduct(id);
}

/** 준비 단계 1건 upsert. 상품이 없으면 null. */
export async function upsertPrepStep(
  productId: number,
  data: ProductPrepInput,
): Promise<Product | null> {
  const owner = await queryOne<Row>(`SELECT id FROM products WHERE id = $1`, [productId]);
  if (!owner) return null;

  const meta = PREP_STEPS.find((s) => s.code === data.code);
  if (!meta) return null;

  await query(
    `INSERT INTO product_prep_steps
       (product_id, step_code, step_order, done, target_date, done_date)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (product_id, step_code) DO UPDATE SET
       done        = EXCLUDED.done,
       target_date = EXCLUDED.target_date,
       done_date   = EXCLUDED.done_date`,
    [
      productId,
      data.code,
      meta.order,
      data.done,
      data.targetDate ?? null,
      // 완료 체크 시 완료일이 비어 있으면 오늘로 자동 기록
      data.done && !data.doneDate ? new Date().toISOString().slice(0, 10) : (data.doneDate ?? null),
    ],
  );
  return getProduct(productId);
}
