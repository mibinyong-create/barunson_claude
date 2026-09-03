import type { NextRequest } from "next/server";
import { updatePrintInfo } from "@/lib/repositories/orders";
import { fail, handle, ok, parseId } from "@/lib/api-helpers";
import { printInfoSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/orders/:id/print-info — 인쇄구분 / 원본 작업 파일 링크 갱신 */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    if (!id) return fail("잘못된 주문 id 입니다.", 400);

    const body = printInfoSchema.parse(await request.json());
    const updated = await updatePrintInfo(id, {
      printMethod: body.printMethod ?? null,
      sourceLinks: body.sourceLinks ?? null,
    });
    if (!updated) return fail("주문을 찾을 수 없습니다.", 404);
    return ok(updated);
  });
}
