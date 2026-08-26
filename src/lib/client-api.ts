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
    } catch {
      /* 본문이 JSON 이 아닌 경우 기본 메시지 사용 */
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

  deleteOrder: (id: number) =>
    apiFetch(`/api/orders/${id}`, { method: "DELETE" }).then(unwrap<{ deleted: number }>),

  bulkDelete: (ids: number[]) =>
    apiFetch("/api/orders/bulk-delete", jsonInit("POST", { ids }))
      .then(unwrap<{ deleted: number }>),

  listFiles: (orderId: number, kind?: "attachment" | "draft", signal?: AbortSignal) =>
    apiFetch(`/api/orders/${orderId}/files${qs({ kind })}`, { signal })
      .then(unwrap<OrderFile[]>),

  addFile: (
    orderId: number,
    body: { kind: "attachment" | "draft"; fileName: string; fileSize?: number; contentType?: string },
  ) =>
    apiFetch(`/api/orders/${orderId}/files`, jsonInit("POST", body)).then(unwrap<OrderFile>),

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
};
