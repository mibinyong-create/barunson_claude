import type { NextRequest } from "next/server";
import { updateOrderStatus } from "@/lib/repositories/orders";
import { fail, handle, ok, parseId } from "@/lib/api-helpers";
import { orderStatusSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/orders/:id/status — 진행 상태만 변경 (이력 자동 기록) */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    if (!id) return fail("잘못된 주문 id 입니다.", 400);

    const { orderStatus } = orderStatusSchema.parse(await request.json());
    const updated = await updateOrderStatus(id, orderStatus);
    if (!updated) return fail("주문을 찾을 수 없습니다.", 404);
    return ok(updated);
  });
}
