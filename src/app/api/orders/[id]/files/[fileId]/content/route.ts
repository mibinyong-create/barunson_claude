import type { NextRequest } from "next/server";
import { getOrderFileContent } from "@/lib/repositories/orders";
import { fail, handle, parseId } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; fileId: string }> };

// 브라우저에 인라인 표시해도 안전한 타입만 그대로 내려준다. 그 외는 다운로드로 강제.
const INLINE_SAFE = /^(image\/(png|jpeg|gif|webp|avif)|application\/pdf|text\/plain)$/;

/** GET /api/orders/:id/files/:fileId/content — 저장된 파일 원본 */
export async function GET(_request: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const { id: rawId, fileId: rawFileId } = await params;
    const id = parseId(rawId);
    const fileId = parseId(rawFileId);
    if (!id || !fileId) return fail("잘못된 id 입니다.", 400);

    const content = await getOrderFileContent(id, fileId);
    if (!content) return fail("파일 원본이 없습니다.", 404);

    const type = content.contentType ?? "application/octet-stream";
    const disposition = INLINE_SAFE.test(type) ? "inline" : "attachment";
    // 파일명에 non-ASCII/따옴표가 있어도 안전하도록 RFC 5987 filename* 사용.
    const encodedName = encodeURIComponent(content.fileName);

    return new Response(new Uint8Array(content.data), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(content.data.length),
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodedName}`,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
