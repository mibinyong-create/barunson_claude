import type { NextRequest } from "next/server";
import { upsertPrepStep } from "@/lib/repositories/products";
import { fail, handle, ok, parseId } from "@/lib/api-helpers";
import { prepStepSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PUT /api/products/:id/prep — 준비 단계 1건 저장 */
export async function PUT(request: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    if (!id) return fail("잘못된 상품 id 입니다.", 400);

    const body = prepStepSchema.parse(await request.json());
    const updated = await upsertPrepStep(id, body);
    if (!updated) return fail("상품을 찾을 수 없습니다.", 404);
    return ok(updated);
  });
}
