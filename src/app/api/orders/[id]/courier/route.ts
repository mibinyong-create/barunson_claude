import type { NextRequest } from "next/server";
import { updateOrderCourier } from "@/lib/repositories/orders";
import { fail, handle, ok, parseId } from "@/lib/api-helpers";
import { courierSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/orders/:id/courier — 택배 정보만 수정 */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    if (!id) return fail("잘못된 주문 id 입니다.", 400);

    const body = courierSchema.parse(await request.json());
    const updated = await updateOrderCourier(id, body);
    if (!updated) return fail("주문을 찾을 수 없습니다.", 404);
    return ok(updated);
  });
}
