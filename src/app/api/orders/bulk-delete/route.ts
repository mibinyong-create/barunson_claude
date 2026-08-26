import type { NextRequest } from "next/server";
import { deleteOrders } from "@/lib/repositories/orders";
import { handle, ok } from "@/lib/api-helpers";
import { bulkDeleteSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** POST /api/orders/bulk-delete — 다중 선택 삭제 */
export async function POST(request: NextRequest) {
  return handle(async () => {
    const { ids } = bulkDeleteSchema.parse(await request.json());
    const deleted = await deleteOrders(ids);
    return ok({ deleted });
  });
}
