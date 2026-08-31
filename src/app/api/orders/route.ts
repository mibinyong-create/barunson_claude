import type { NextRequest } from "next/server";
import { createOrder, listOrders } from "@/lib/repositories/orders";
import { handle, ok, searchParamsToObject } from "@/lib/api-helpers";
import { orderInputSchema, orderListQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * GET /api/orders
 * ?search= &status= &paymentStatus= &productId= &orderDate= &dateFrom= &dateTo= &showAllDates=
 * &sort=orderDateDesc|orderDateAsc|weddingDateAsc|amountDesc &page= &pageSize=
 */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const params = orderListQuerySchema.parse(
      searchParamsToObject(request.nextUrl.searchParams),
    );
    return ok(await listOrders(params));
  });
}

/** POST /api/orders — 신규 주문 등록 (주문번호는 DB 가 채번) */
export async function POST(request: NextRequest) {
  return handle(async () => {
    const body = orderInputSchema.parse(await request.json());
    const created = await createOrder(body);
    return ok(created, { status: 201 });
  });
}
