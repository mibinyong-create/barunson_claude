import type { NextRequest } from "next/server";
import { deleteOrders, getOrder, updateOrder } from "@/lib/repositories/orders";
import { fail, handle, ok, parseId } from "@/lib/api-helpers";
import { orderInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/orders/:id — 첨부/초안/상태이력 포함 상세 */
export async function GET(_request: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    if (!id) return fail("잘못된 주문 id 입니다.", 400);

    const order = await getOrder(id);
    if (!order) return fail("주문을 찾을 수 없습니다.", 404);
    return ok(order);
  });
}

/** PUT /api/orders/:id — 주문 전체 수정 */
export async function PUT(request: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    if (!id) return fail("잘못된 주문 id 입니다.", 400);

    const body = orderInputSchema.parse(await request.json());
    const updated = await updateOrder(id, body);
    if (!updated) return fail("주문을 찾을 수 없습니다.", 404);
    return ok(updated);
  });
}

/** DELETE /api/orders/:id */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    if (!id) return fail("잘못된 주문 id 입니다.", 400);

    const deleted = await deleteOrders([id]);
    if (!deleted) return fail("주문을 찾을 수 없습니다.", 404);
    return ok({ deleted });
  });
}
