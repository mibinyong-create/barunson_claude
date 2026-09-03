"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { TruckIcon } from "@/components/icons";
import { fmtDate, num, trackingUrl } from "@/lib/format";
import type { Meta, Order } from "@/lib/types";

export type ShipAction =
  | { type: "save"; courierName: string | null; trackingNumber: string | null }
  | {
      type: "dispatch";
      courierName: string | null;
      trackingNumber: string | null;
    }
  | { type: "complete" };

type Props = {
  order: Order | null;
  meta: Meta;
  busy: boolean;
  onClose: () => void;
  /** true 를 돌려주면 모달을 닫는다 */
  onAction: (action: ShipAction) => Promise<boolean>;
};

export function ShipmentModal({ order, meta, busy, onClose, onAction }: Props) {
  const [courierName, setCourierName] = useState(order?.courierName ?? "");
  const [trackingNumber, setTrackingNumber] = useState(order?.trackingNumber ?? "");

  if (!order) {
    return (
      <Modal open={false} title="" onClose={onClose}>
        {null}
      </Modal>
    );
  }

  const status = order.orderStatus;
  const courier = meta.couriers.find((c) => c.name === courierName);
  const url = trackingUrl(courier?.trackingUrlTemplate ?? order.trackingUrlTemplate, trackingNumber);
  const canDispatch = !!courierName && trackingNumber.trim().length > 0;

  async function run(action: ShipAction) {
    const ok = await onAction(action);
    if (ok) onClose();
  }

  return (
    <Modal
      open={!!order}
      title="출고 · 배송 처리"
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            닫기
          </button>
          {status === "인쇄완료" ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !canDispatch}
              onClick={() =>
                run({
                  type: "dispatch",
                  courierName: courierName || null,
                  trackingNumber: trackingNumber.trim() || null,
                })
              }
            >
              <TruckIcon size={14} /> 출고 확정
            </button>
          ) : null}
          {status === "배송중" ? (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={() =>
                  run({
                    type: "save",
                    courierName: courierName || null,
                    trackingNumber: trackingNumber.trim() || null,
                  })
                }
              >
                택배정보 저장
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => run({ type: "complete" })}
              >
                배송 완료
              </button>
            </>
          ) : null}
        </>
      }
    >
      <dl className="info-list">
        <div>
          <dt>주문번호</dt>
          <dd className="mono">{order.orderNo}</dd>
        </div>
        <div>
          <dt>주문자</dt>
          <dd>
            {order.customerName}
            <span className="mono subrow">{order.customerPhone ?? "-"}</span>
          </dd>
        </div>
        <div>
          <dt>상품 · 수량</dt>
          <dd>
            {order.productName}
            <span className="subrow">
              {order.optionText ? `${order.optionText} · ` : ""}
              {num(order.quantity)}개
            </span>
          </dd>
        </div>
        <div>
          <dt>배송 방법</dt>
          <dd>
            {order.deliveryMethod}
            {order.dispatchedDate ? (
              <span className="subrow">출고 {fmtDate(order.dispatchedDate)}</span>
            ) : null}
          </dd>
        </div>
        <div className="info-full">
          <dt>배송지</dt>
          <dd>{order.shippingAddress || order.customerAddress || "주소 미입력"}</dd>
        </div>
      </dl>

      <h3 className="section-title">택배 정보</h3>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="ship-courier">택배사</label>
          <select
            id="ship-courier"
            value={courierName}
            onChange={(e) => setCourierName(e.target.value)}
          >
            <option value="">선택</option>
            {meta.couriers.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ship-tracking">운송장번호</label>
          <input
            id="ship-tracking"
            value={trackingNumber}
            inputMode="numeric"
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="숫자만 입력"
          />
        </div>
      </div>
      {url ? (
        <a className="ship-track-link" href={url} target="_blank" rel="noopener noreferrer">
          배송조회 열기 ↗
        </a>
      ) : null}
    </Modal>
  );
}
