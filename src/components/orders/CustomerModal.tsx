"use client";

import { useCallback, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { useAsyncData } from "@/hooks/useAsyncData";
import { api } from "@/lib/client-api";
import { fmtDate, num, won } from "@/lib/format";
import type { Customer, Order } from "@/lib/types";

/** 주문자명 클릭 → 고객 정보 + 해당 고객의 전체 주문 */
export function CustomerModal({
  customerId,
  onClose,
  onError,
  onOpenOrder,
}: {
  customerId: number | null;
  onClose: () => void;
  onError: (message: string) => void;
  onOpenOrder?: (orderId: number) => void;
}) {
  const fetcher = useCallback(
    (signal: AbortSignal) => api.customer(customerId ?? 0, signal),
    [customerId],
  );
  const { data, error, loading } = useAsyncData<{ customer: Customer; orders: Order[] }>(
    String(customerId ?? ""),
    fetcher,
    !!customerId,
  );

  useEffect(() => {
    if (error) onError(error);
  }, [error, onError]);

  return (
    <Modal
      open={!!customerId}
      title={data ? `${data.customer.name} 고객님` : "고객 정보"}
      onClose={onClose}
      size="lg"
      footer={
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          닫기
        </button>
      }
    >
      {loading || !data ? (
        <div className="empty">불러오는 중…</div>
      ) : (
        <>
          <dl className="info-list">
            <div>
              <dt>고객 ID</dt>
              <dd className="mono">#{String(data.customer.id).padStart(5, "0")}</dd>
            </div>
            <div>
              <dt>연락처</dt>
              <dd className="mono">{data.customer.phone ?? "-"}</dd>
            </div>
            <div>
              <dt>주소</dt>
              <dd>{data.customer.address ?? "-"}</dd>
            </div>
            <div>
              <dt>누적 주문</dt>
              <dd>
                {num(data.customer.orderCount)}건 · {won(data.customer.totalAmount)}
              </dd>
            </div>
          </dl>

          <h3 className="section-title">주문 내역 {data.orders.length}건</h3>
          <div className="mini-table-wrap">
            <table className="mini-table">
              <thead>
                <tr>
                  <th>주문번호</th>
                  <th>상품</th>
                  <th className="num">수량</th>
                  <th className="num">금액</th>
                  <th>예식일</th>
                  <th>진행상태</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((o) => (
                  <tr
                    key={o.id}
                    className={onOpenOrder ? "clickable" : undefined}
                    onClick={() => onOpenOrder?.(o.id)}
                  >
                    <td className="mono">{o.orderNoShort}</td>
                    <td>
                      {o.productName}
                      {o.optionText ? <div className="subrow">{o.optionText}</div> : null}
                    </td>
                    <td className="num mono">{num(o.quantity)}</td>
                    <td className="num mono">{won(o.totalAmount)}</td>
                    <td className="mono">{fmtDate(o.weddingDate)}</td>
                    <td>
                      <span className={`pill st-${o.orderStatus}`}>{o.orderStatus}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
