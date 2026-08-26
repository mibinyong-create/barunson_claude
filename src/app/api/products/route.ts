import type { NextRequest } from "next/server";
import { listProducts } from "@/lib/repositories/products";
import { handle, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** GET /api/products?includeInactive=true */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const includeInactive =
      request.nextUrl.searchParams.get("includeInactive") === "true";
    return ok(await listProducts(includeInactive));
  });
}
