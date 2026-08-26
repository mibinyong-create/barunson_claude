"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { fmtDate, trackingUrl } from "@/lib/format";
import type { Meta, OrderDetail } from "@/lib/types";

type Props = {
  open: boolean;
  order: OrderDetail | null;
  meta: Meta;
  busy: boolean;
  onClose: () => void;
  /** 저장 성공 여부를 돌려주면 편집 모드를 종료한다. */
  onSave: (data: {
    courierName: string | null;
    trackingNumber: string | null;
    deliveredDate: string | null;
    deliveryMethod: string;
    shippingAddress: string | null;
  }) => Promise<boolean>;
};

/** 배송완료 주문의 행을 클릭했을 때 뜨는 택배 정보 모달 (조회 → 수정 전환) */
export function CourierModal({ open, order, meta, busy, onClose, onSave }: Props) {
  // 부모가 key={order.id} 로 리마운트시키므로 초기값 계산만으로 충분하다.
  const [editing, setEditing] = useState(false);
  const [courierName, setCourierName] = useState(order?.courierName ?? "");
  const [trackingNumber, setTrackingNumber] = useState(order?.trackingNumber ?? "");
  const [deliveredDate, setDeliveredDate] = useState(order?.deliveredDate ?? "");
  const [deliveryMethod, setDeliveryMethod] = useState<string>(
    order?.deliveryMethod ?? "택배배송",
  );
  const [address, setAddress] = useState(order?.shippingAddress ?? "");

  if (!order) return <Modal open={false} title="" onClose={onClose}>{null}</Modal>;

  const url = trackingUrl(order.trackingUrlTemplate, order.trackingNumber);

  return (
    <Modal
      open={open}
      title="택배 정보"
      onClose={onClose}
      size="sm"
      footer={
        editing ? (
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setEditing(false)}
              disabled={busy}
            >
              취소
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={async () => {
                const saved = await onSave({
                  courierName: courierName || null,
                  trackingNumber: trackingNumber || null,
                  deliveredDate: deliveredDate || null,
                  deliveryMethod,
                  shippingAddress: address || null,
                });
                if (saved) setEditing(false);
              }}
            >
              {busy ? "저장 중…" : "저장"}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              닫기
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>
              정보 수정
            </button>
          </>
        )
      }
    >
      {editing ? (
        <div className="form-grid">
          <div className="field">
            <label htmlFor="c-courier">택배사</label>
            <select
              id="c-courier"
              value={courierName}
              onChange={(e) => setCourierName(e.target.value)}
            >
              <option value="">선택 안 함</option>
              {meta.couriers.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="c-tracking">운송장번호</label>
            <input
              id="c-tracking"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="c-delivered">배송완료일</label>
            <input
              id="c-delivered"
              type="date"
              value={deliveredDate}
              onChange={(e) => setDeliveredDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="c-method">수령 방법</label>
            <select
              id="c-method"
              value={deliveryMethod}
              onChange={(e) => setDeliveryMethod(e.target.value)}
            >
              {meta.deliveryMethods.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code}
                </option>
              ))}
            </select>
          </div>
          <div className="field full">
            <label htmlFor="c-address">배송지</label>
            <input id="c-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </div>
      ) : (
        <dl className="info-list">
          <div>
            <dt>주문번호</dt>
            <dd className="mono">{order.orderNo}</dd>
          </div>
          <div>
            <dt>택배사</dt>
            <dd>{order.courierName ?? "미입력"}</dd>
          </div>
          <div>
            <dt>운송장번호</dt>
            <dd className="mono">
              {order.trackingNumber ? (
                url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {order.trackingNumber}
                  </a>
                ) : (
                  order.trackingNumber
                )
              ) : (
                "미입력"
              )}
            </dd>
          </div>
          <div>
            <dt>배송완료일</dt>
            <dd className="mono">{fmtDate(order.deliveredDate)}</dd>
          </div>
          <div>
            <dt>수령 방법</dt>
            <dd>{order.deliveryMethod}</dd>
          </div>
          <div>
            <dt>배송지</dt>
            <dd>{order.shippingAddress || "-"}</dd>
          </div>
        </dl>
      )}
    </Modal>
  );
}
