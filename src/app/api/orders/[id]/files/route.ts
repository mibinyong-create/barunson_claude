import type { NextRequest } from "next/server";
import { addOrderFile, listOrderFiles } from "@/lib/repositories/orders";
import { fail, handle, ok, parseId } from "@/lib/api-helpers";
import { fileInputSchema } from "@/lib/validation";
import type { OrderFileKind } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/orders/:id/files?kind=attachment|draft */
export async function GET(request: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    if (!id) return fail("잘못된 주문 id 입니다.", 400);

    const kindRaw = request.nextUrl.searchParams.get("kind");
    const kind =
      kindRaw === "attachment" || kindRaw === "draft"
        ? (kindRaw as OrderFileKind)
        : undefined;

    return ok(await listOrderFiles(id, kind));
  });
}

/** POST /api/orders/:id/files — 파일 메타데이터 등록 */
export async function POST(request: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    if (!id) return fail("잘못된 주문 id 입니다.", 400);

    const body = fileInputSchema.parse(await request.json());
    const file = await addOrderFile(
      id,
      body.kind,
      body.fileName,
      body.fileSize,
      body.contentType,
    );
    if (!file) return fail("주문을 찾을 수 없습니다.", 404);
    return ok(file, { status: 201 });
  });
}
