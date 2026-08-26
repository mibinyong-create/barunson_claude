import type { NextRequest } from "next/server";
import { listCustomers } from "@/lib/repositories/customers";
import { handle, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** GET /api/customers?search=&page=&pageSize= */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const sp = request.nextUrl.searchParams;
    return ok(
      await listCustomers({
        search: sp.get("search") ?? undefined,
        page: Number(sp.get("page") ?? 1),
        pageSize: Number(sp.get("pageSize") ?? 25),
      }),
    );
  });
}
