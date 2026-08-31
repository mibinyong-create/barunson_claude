import type { NextRequest } from "next/server";
import {
  deletePurchaseOrder,
  getPurchaseOrder,
  upsertPurchaseOrder,
} from "@/lib/repositories/purchasing";
import { fail, handle, ok, parseId } from "@/lib/api-helpers";
import { purchaseOrderSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/orders/:id/purchase-order */
export async function GET(_request: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    if (!id) return fail("잘못된 주문 id 입니다.", 400);
    const po = await getPurchaseOrder(id);
    return ok(po);
  });
}

/** PUT /api/orders/:id/purchase-order — 발주 기록 생성/수정 */
export async function PUT(request: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    if (!id) return fail("잘못된 주문 id 입니다.", 400);

    const body = purchaseOrderSchema.parse(await request.json());
    const po = await upsertPurchaseOrder(id, body);
    if (!po) return fail("주문을 찾을 수 없습니다.", 404);
    return ok(po);
  });
}

/** DELETE /api/orders/:id/purchase-order */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    if (!id) return fail("잘못된 주문 id 입니다.", 400);
    const deleted = await deletePurchaseOrder(id);
    if (!deleted) return fail("발주 기록을 찾을 수 없습니다.", 404);
    return ok({ deleted: true });
  });
}
