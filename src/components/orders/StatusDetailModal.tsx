"use client";

import { useCallback, useEffect } from "react";
import { Modal } from "@/components/Modal";
import { ProductThumb } from "@/components/icons";
import { useAsyncData } from "@/hooks/useAsyncData";
import { api } from "@/lib/client-api";
import { fmtDate, num, won } from "@/lib/format";
import type { BreakdownRow } from "@/lib/types";

/** 진행상태 타일 클릭 → 해당 날짜/상태의 품목별 분해. 행 클릭 시 목록으로 이동 */
export function StatusDetailModal({
  date,
  status,
  onClose,
  onPickProduct,
  onError,
}: {
  date: string;
  status: string | null;
  onClose: () => void;
  onPickProduct: (productId: number) => void;
  onError: (message: string) => void;
}) {
  const fetcher = useCallback(
    (signal: AbortSignal) => api.statusDetail(date, status ?? "", signal),
    [date, status],
  );
  const { data, error, loading } = useAsyncData<BreakdownRow[]>(
    `${date}|${status ?? ""}`,
    fetcher,
    !!status,
  );
  const rows = data ?? [];

  useEffect(() => {
    if (error) onError(error);
  }, [error, onError]);

  const total = rows.reduce((acc, r) => acc + r.orderCount, 0);

  return (
    <Modal
      open={!!status}
      title={`${fmtDate(date)} · ${status ?? ""} (${total}건)`}
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          닫기
        </button>
      }
    >
      {loading ? (
        <div className="empty">불러오는 중…</div>
      ) : rows.length === 0 ? (
        <div className="empty">
          <div className="big">해당 조건의 주문이 없어요</div>
          다른 날짜를 선택해보세요.
        </div>
      ) : (
        <div className="breakdown-rows">
          {rows.map((r) => (
            <button
              type="button"
              key={r.productId}
              className="breakdown-row"
              onClick={() => onPickProduct(r.productId)}
            >
              <span className="bd-thumb">
                <ProductThumb
                  name={r.productName}
                  slug={r.productSlug}
                  iconPath={r.iconPath}
                  linkUrl={null}
                />
              </span>
              <span className="bd-name">{r.productName}</span>
              <span className="bd-qty mono">{num(r.totalQuantity)}개</span>
              <span className="bd-amount mono">{won(r.totalAmount)}</span>
              <span className="bd-count mono">{r.orderCount}건</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
