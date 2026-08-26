import type { NextRequest } from "next/server";
import { deleteOrderFile } from "@/lib/repositories/orders";
import { fail, handle, ok, parseId } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; fileId: string }> };

/** DELETE /api/orders/:id/files/:fileId */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const { id: rawId, fileId: rawFileId } = await params;
    const id = parseId(rawId);
    const fileId = parseId(rawFileId);
    if (!id || !fileId) return fail("잘못된 id 입니다.", 400);

    const deleted = await deleteOrderFile(id, fileId);
    if (!deleted) return fail("파일을 찾을 수 없습니다.", 404);
    return ok({ deleted: true });
  });
}
