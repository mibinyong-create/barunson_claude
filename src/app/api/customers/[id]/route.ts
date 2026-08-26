import type { NextRequest } from "next/server";
import { getCustomerWithOrders, updateCustomer } from "@/lib/repositories/customers";
import { fail, handle, ok, parseId } from "@/lib/api-helpers";
import { customerUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/customers/:id — 고객 + 해당 고객의 주문 전체 */
export async function GET(_request: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    if (!id) return fail("잘못된 고객 id 입니다.", 400);

    const found = await getCustomerWithOrders(id);
    if (!found) return fail("고객을 찾을 수 없습니다.", 404);
    return ok(found);
  });
}

/** PATCH /api/customers/:id */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    if (!id) return fail("잘못된 고객 id 입니다.", 400);

    const body = customerUpdateSchema.parse(await request.json());
    const updated = await updateCustomer(id, body);
    if (!updated) return fail("고객을 찾을 수 없습니다.", 404);
    return ok(updated);
  });
}
