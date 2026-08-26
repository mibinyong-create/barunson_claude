import { getMeta } from "@/lib/repositories/meta";
import { handle, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** GET /api/meta — 상태/결제/수령방법/택배사/상품 코드 일체 */
export async function GET() {
  return handle(async () => ok(await getMeta()));
}
