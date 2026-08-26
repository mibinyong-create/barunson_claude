import { queryOne } from "@/lib/db";
import { handle, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — DB 연결까지 확인하는 심층 헬스체크.
 * (얕은 헬스체크는 /health 에 그대로 둡니다.)
 */
export async function GET() {
  return handle(async () => {
    const started = Date.now();
    const row = await queryOne<{ orders: number; version: string }>(
      `SELECT (SELECT count(*)::int FROM orders) AS orders, version() AS version`,
    );
    return ok({
      status: "ok",
      database: {
        connected: true,
        latencyMs: Date.now() - started,
        orderCount: row?.orders ?? 0,
        version: row?.version?.split(" ").slice(0, 2).join(" ") ?? null,
      },
    });
  });
}
