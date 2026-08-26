import type { NextRequest } from "next/server";
import { getProduct, updateProduct } from "@/lib/repositories/products";
import { fail, handle, ok, parseId } from "@/lib/api-helpers";
import { productUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/products/:id */
export async function GET(_request: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    if (!id) return fail("잘못된 상품 id 입니다.", 400);

    const product = await getProduct(id);
    if (!product) return fail("상품을 찾을 수 없습니다.", 404);
    return ok(product);
  });
}

/** PATCH /api/products/:id */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = parseId((await params).id);
    if (!id) return fail("잘못된 상품 id 입니다.", 400);

    const body = productUpdateSchema.parse(await request.json());
    const updated = await updateProduct(id, body);
    if (!updated) return fail("상품을 찾을 수 없습니다.", 404);
    return ok(updated);
  });
}
