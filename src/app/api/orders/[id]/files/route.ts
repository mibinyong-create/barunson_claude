import type { NextRequest } from "next/server";
import { addOrderFile, listOrderFiles } from "@/lib/repositories/orders";
import { fail, handle, ok, parseId } from "@/lib/api-helpers";
import { fileInputSchema } from "@/lib/validation";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import type { OrderFileKind } from "@/lib/types";

// bytea 를 다루므로 Node 런타임이 필요하다.
export const runtime = "nodejs";
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

function normalizeKind(v: unknown): OrderFileKind | null {
  return v === "attachment" || v === "draft" ? v : null;
}

/**
 * POST /api/orders/:id/files
 * - multipart/form-data (field: file, kind) → 실제 파일 바이너리까지 저장
 * - application/json ({ kind, fileName, fileSize?, contentType? }) → 메타데이터만 (구 방식 호환)
 */
export async function POST(request: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    if (!id) return fail("잘못된 주문 id 입니다.", 400);

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const entry = form.get("file");
      const kind = normalizeKind(form.get("kind"));

      if (!kind) return fail("kind 는 attachment 또는 draft 여야 합니다.", 400);
      if (!(entry instanceof File)) return fail("file 필드가 필요합니다.", 400);
      if (entry.size === 0) return fail("빈 파일은 업로드할 수 없습니다.", 400);
      if (entry.size > MAX_UPLOAD_BYTES) {
        return fail(
          `파일이 너무 큽니다. 최대 ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))}MB 까지 업로드할 수 있습니다.`,
          413,
        );
      }

      // 파일명 검증은 기존 스키마를 재사용한다.
      const parsed = fileInputSchema.pick({ fileName: true }).parse({
        fileName: entry.name,
      });

      const buf = Buffer.from(await entry.arrayBuffer());
      const file = await addOrderFile(
        id,
        kind,
        parsed.fileName,
        buf.length,
        entry.type || null,
        buf,
      );
      if (!file) return fail("주문을 찾을 수 없습니다.", 404);
      return ok(file, { status: 201 });
    }

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
