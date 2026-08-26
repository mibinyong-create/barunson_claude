import type { NextRequest } from "next/server";
import { listCustomers } from "@/lib/repositories/customers";
import { handle, ok, searchParamsToObject } from "@/lib/api-helpers";
import { customerListQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** GET /api/customers?search=&page=&pageSize= */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const params = customerListQuerySchema.parse(
      searchParamsToObject(request.nextUrl.searchParams),
    );
    return ok(
      await listCustomers({
        search: params.search,
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 25,
      }),
    );
  });
}
