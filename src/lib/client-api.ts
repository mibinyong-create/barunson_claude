import { apiFetch } from "./api";
import type {
  BreakdownRow,
  Customer,
  Meta,
  Order,
  OrderDetail,
  OrderFile,
  OrderListParams,
  Paged,
  Product,
  ProductPrepInput,
  PurchaseOrder,
  PurchaseOrderInput,
  PurchasingRow,
  StatusCountRow,
  SummaryStats,
} from "./types";

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `요청에 실패했습니다. (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string; details?: unknown };
      if (body?.error) message = body.error;
      if (Array.isArray(body?.details) && body.details.length) {
        const first = body.details[0] as { message?: string };
        if (first?.message) message = `${message} — ${first.message}`;
      }
    } catch (e) {
      // 본문이 JSON 이 아니면 기본 메시지를 쓰되, 원인은 남긴다.
      console.warn("[api] 오류 응답 본문을 파싱하지 못했습니다:", e);
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  meta: (signal?: AbortSignal) =>
    apiFetch("/api/meta", { signal }).then(unwrap<Meta>),

  listOrders: (params: OrderListParams, signal?: AbortSignal) =>
    apiFetch(`/api/orders${qs(params as Record<string, unknown>)}`, { signal })
      .then(unwrap<Paged<Order>>),

  shipping: (
    params: {
      stage?: string;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      pageSize?: number;
    },
    signal?: AbortSignal,
  ) =>
    apiFetch(`/api/shipping${qs(params as Record<string, unknown>)}`, { signal })
      .then(unwrap<Paged<Order>>),

  print: (
    params: {
      statuses?: string;
      methods?: string;
      search?: string;
      searchType?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      pageSize?: number;
    },
    signal?: AbortSignal,
  ) =>
    apiFetch(`/api/print${qs(params as Record<string, unknown>)}`, { signal })
      .then(unwrap<Paged<Order>>),

  updatePrintInfo: (
    id: number,
    body: { printMethod?: string | null; sourceLinks?: string | null },
  ) =>
    apiFetch(`/api/orders/${id}/print-info`, jsonInit("PATCH", body))
      .then(unwrap<OrderDetail>),

  getOrder: (id: number, signal?: AbortSignal) =>
    apiFetch(`/api/orders/${id}`, { signal }).then(unwrap<OrderDetail>),

  createOrder: (body: unknown) =>
    apiFetch("/api/orders", jsonInit("POST", body)).then(unwrap<OrderDetail>),

  updateOrder: (id: number, body: unknown) =>
    apiFetch(`/api/orders/${id}`, jsonInit("PUT", body)).then(unwrap<OrderDetail>),

  updateStatus: (id: number, orderStatus: string) =>
    apiFetch(`/api/orders/${id}/status`, jsonInit("PATCH", { orderStatus }))
      .then(unwrap<OrderDetail>),

  updateCourier: (id: number, body: unknown) =>
    apiFetch(`/api/orders/${id}/courier`, jsonInit("PATCH", body))
      .then(unwrap<OrderDetail>),

  // ── 발주관리 ──────────────────────────────────────────────────────────────
  purchasing: (
    params: {
      stage?: string;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      pageSize?: number;
      withCounts?: 1;
    },
    signal?: AbortSignal,
  ) =>
    apiFetch(`/api/purchasing${qs(params as Record<string, unknown>)}`, { signal }).then(
      unwrap<
        Paged<PurchasingRow> & {
          counts?: { unregistered: number; ordering: number; received: number };
        }
      >,
    ),

  savePurchaseOrder: (orderId: number, body: PurchaseOrderInput) =>
    apiFetch(`/api/orders/${orderId}/purchase-order`, jsonInit("PUT", body))
      .then(unwrap<PurchaseOrder>),

  deletePurchaseOrder: (orderId: number) =>
    apiFetch(`/api/orders/${orderId}/purchase-order`, { method: "DELETE" })
      .then(unwrap<{ deleted: boolean }>),

  deleteOrder: (id: number) =>
    apiFetch(`/api/orders/${id}`, { method: "DELETE" }).then(unwrap<{ deleted: number }>),

  bulkDelete: (ids: number[]) =>
    apiFetch("/api/orders/bulk-delete", jsonInit("POST", { ids }))
      .then(unwrap<{ deleted: number }>),

  listFiles: (orderId: number, kind?: "attachment" | "draft", signal?: AbortSignal) =>
    apiFetch(`/api/orders/${orderId}/files${qs({ kind })}`, { signal })
      .then(unwrap<OrderFile[]>),

  /** 실제 파일 바이너리까지 업로드한다 (multipart/form-data). */
  addFile: (orderId: number, kind: "attachment" | "draft", file: File) => {
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", file);
    return apiFetch(`/api/orders/${orderId}/files`, {
      method: "POST",
      body: form,
    }).then(unwrap<OrderFile>);
  },

  deleteFile: (orderId: number, fileId: number) =>
    apiFetch(`/api/orders/${orderId}/files/${fileId}`, { method: "DELETE" })
      .then(unwrap<{ deleted: boolean }>),

  summary: (date?: string, signal?: AbortSignal) =>
    apiFetch(`/api/stats/summary${qs({ date })}`, { signal }).then(unwrap<SummaryStats>),

  chips: (signal?: AbortSignal) =>
    apiFetch("/api/stats/chips", { signal })
      .then(unwrap<{ total: number; byStatus: StatusCountRow[] }>),

  breakdown: (date: string, period: "day" | "week", signal?: AbortSignal) =>
    apiFetch(`/api/stats/breakdown${qs({ date, period })}`, { signal })
      .then(unwrap<{ rows: BreakdownRow[]; from: string; to: string }>),

  quick: (date: string, signal?: AbortSignal) =>
    apiFetch(`/api/stats/quick${qs({ date })}`, { signal })
      .then(unwrap<{ status: string; orderCount: number; isQuickTile: boolean }[]>),

  statusDetail: (date: string, status: string, signal?: AbortSignal) =>
    apiFetch(`/api/stats/status-detail${qs({ date, status })}`, { signal })
      .then(unwrap<BreakdownRow[]>),

  trend: (months = 12, signal?: AbortSignal) =>
    apiFetch(`/api/stats/trend${qs({ months })}`, { signal })
      .then(unwrap<{ month: string; orderCount: number; totalAmount: number }[]>),

  customers: (params: { search?: string; page?: number; pageSize?: number }, signal?: AbortSignal) =>
    apiFetch(`/api/customers${qs(params)}`, { signal }).then(unwrap<Paged<Customer>>),

  customer: (id: number, signal?: AbortSignal) =>
    apiFetch(`/api/customers/${id}`, { signal })
      .then(unwrap<{ customer: Customer; orders: Order[] }>),

  products: (signal?: AbortSignal) =>
    apiFetch("/api/products", { signal }).then(unwrap<Product[]>),

  updatePrepStep: (productId: number, body: ProductPrepInput) =>
    apiFetch(`/api/products/${productId}/prep`, jsonInit("PUT", body)).then(unwrap<Product>),
};
