"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { won } from "@/lib/format";
import type { Meta, OrderDetail } from "@/lib/types";

export type OrderFormValues = {
  customerName: string;
  phone: string;
  productName: string;
  optionText: string;
  quantity: string;
  unitPrice: string;
  orderDate: string;
  weddingDate: string;
  deliveryMethod: string;
  shippingAddress: string;
  paymentStatus: string;
  orderStatus: string;
  withInvitation: boolean;
  courierName: string;
  trackingNumber: string;
  deliveredDate: string;
  memo: string;
};

function emptyValues(meta: Meta, today: string): OrderFormValues {
  return {
    customerName: "",
    phone: "",
    productName: meta.products[0]?.name ?? "",
    optionText: "",
    quantity: "100",
    unitPrice: String(meta.products[0]?.defaultUnitPrice ?? 2500),
    orderDate: today,
    weddingDate: "",
    deliveryMethod: "택배배송",
    shippingAddress: "",
    paymentStatus: "결제대기",
    orderStatus: "주문완료",
    withInvitation: false,
    courierName: "",
    trackingNumber: "",
    deliveredDate: "",
    memo: "",
  };
}

function fromOrder(o: OrderDetail): OrderFormValues {
  return {
    customerName: o.customerName,
    phone: o.customerPhone ?? "",
    productName: o.productName,
    optionText: o.optionText ?? "",
    quantity: String(o.quantity),
    unitPrice: String(o.unitPrice),
    orderDate: o.orderDate,
    weddingDate: o.weddingDate,
    deliveryMethod: o.deliveryMethod,
    shippingAddress: o.shippingAddress ?? "",
    paymentStatus: o.paymentStatus,
    orderStatus: o.orderStatus,
    withInvitation: o.withInvitation,
    courierName: o.courierName ?? "",
    trackingNumber: o.trackingNumber ?? "",
    deliveredDate: o.deliveredDate ?? "",
    memo: o.memo ?? "",
  };
}

type Props = {
  open: boolean;
  meta: Meta;
  today: string;
  /** null 이면 신규 등록 */
  order: OrderDetail | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: OrderFormValues) => void;
};

/** 주문 등록/수정 폼. 원본 orderOverlay 의 필드를 그대로 옮겼다. */
export function OrderFormModal({
  open,
  meta,
  today,
  order,
  busy,
  error,
  onClose,
  onSubmit,
}: Props) {
  // 부모가 key 를 바꿔 리마운트시키므로 초기값 계산만으로 충분하다.
  const [values, setValues] = useState<OrderFormValues>(() =>
    order ? fromOrder(order) : emptyValues(meta, today),
  );

  const set = <K extends keyof OrderFormValues>(key: K, v: OrderFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const total = (Number(values.quantity) || 0) * (Number(values.unitPrice) || 0);

  return (
    <Modal
      open={open}
      title={order ? `주문 수정 · ${order.orderNo}` : "새 주문 등록"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            취소
          </button>
          <button
            type="submit"
            form="orderForm"
            className="btn btn-primary"
            disabled={busy}
          >
            {busy ? "저장 중…" : "저장"}
          </button>
        </>
      }
    >
      <form
        id="orderForm"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(values);
        }}
      >
        {error ? <div className="form-error" role="alert">{error}</div> : null}

        <div className="form-grid">
          <div className="field">
            <label htmlFor="f-customerName">
              주문자명 <span className="req">*</span>
            </label>
            <input
              id="f-customerName"
              value={values.customerName}
              onChange={(e) => set("customerName", e.target.value)}
              required
              placeholder="김도윤"
            />
          </div>
          <div className="field">
            <label htmlFor="f-phone">연락처</label>
            <input
              id="f-phone"
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="010-0000-0000"
            />
          </div>

          <div className="field">
            <label htmlFor="f-weddingDate">
              예식일 <span className="req">*</span>
            </label>
            <input
              id="f-weddingDate"
              type="date"
              value={values.weddingDate}
              onChange={(e) => set("weddingDate", e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="f-orderDate">
              주문일자 <span className="req">*</span>
            </label>
            <input
              id="f-orderDate"
              type="date"
              value={values.orderDate}
              onChange={(e) => set("orderDate", e.target.value)}
              required
            />
          </div>

          <div className="field full">
            <label htmlFor="f-productName">
              상품명 <span className="req">*</span>
            </label>
            <input
              id="f-productName"
              list="productList"
              value={values.productName}
              onChange={(e) => {
                const name = e.target.value;
                const found = meta.products.find((p) => p.name === name);
                setValues((prev) => ({
                  ...prev,
                  productName: name,
                  unitPrice: found ? String(found.defaultUnitPrice) : prev.unitPrice,
                }));
              }}
              required
              placeholder="예: 아크릴 키링"
            />
            <datalist id="productList">
              {meta.products.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>

          <div className="field full">
            <label htmlFor="f-option">옵션 (디자인 · 사이즈 · 각인문구 등)</label>
            <input
              id="f-option"
              value={values.optionText}
              onChange={(e) => set("optionText", e.target.value)}
              placeholder='예: 원형 5cm / 시안 B / 각인 "2026.09.12"'
            />
          </div>

          <div className="field">
            <label htmlFor="f-quantity">
              수량 <span className="req">*</span>
            </label>
            <input
              id="f-quantity"
              type="number"
              min={1}
              step={1}
              value={values.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="f-unitPrice">
              단가(원) <span className="req">*</span>
            </label>
            <input
              id="f-unitPrice"
              type="number"
              min={0}
              step={100}
              value={values.unitPrice}
              onChange={(e) => set("unitPrice", e.target.value)}
              required
            />
          </div>

          <div className="field-total">
            <span>총 금액</span>
            <b>{won(total)}</b>
          </div>

          <div className="field">
            <label htmlFor="f-deliveryMethod">수령 방법</label>
            <select
              id="f-deliveryMethod"
              value={values.deliveryMethod}
              onChange={(e) => set("deliveryMethod", e.target.value)}
            >
              {meta.deliveryMethods.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-address">배송지 주소</label>
            <input
              id="f-address"
              value={values.shippingAddress}
              onChange={(e) => set("shippingAddress", e.target.value)}
              placeholder="방문수령인 경우 비워두세요"
            />
          </div>

          <div className="field-check">
            <input
              type="checkbox"
              id="f-withInvitation"
              checked={values.withInvitation}
              onChange={(e) => set("withInvitation", e.target.checked)}
            />
            <label htmlFor="f-withInvitation">청첩장과 함께 주문한 건이에요</label>
          </div>

          <div className="field">
            <label htmlFor="f-paymentStatus">결제 상태</label>
            <select
              id="f-paymentStatus"
              value={values.paymentStatus}
              onChange={(e) => set("paymentStatus", e.target.value)}
            >
              {meta.paymentStatuses.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-orderStatus">진행 상태</label>
            <select
              id="f-orderStatus"
              value={values.orderStatus}
              onChange={(e) => set("orderStatus", e.target.value)}
            >
              {meta.orderStatuses.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="f-courier">택배사</label>
            <select
              id="f-courier"
              value={values.courierName}
              onChange={(e) => set("courierName", e.target.value)}
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
            <label htmlFor="f-tracking">운송장번호</label>
            <input
              id="f-tracking"
              value={values.trackingNumber}
              onChange={(e) => set("trackingNumber", e.target.value)}
              placeholder="예: 1234567890"
            />
          </div>
          <div className="field">
            <label htmlFor="f-delivered">배송완료일</label>
            <input
              id="f-delivered"
              type="date"
              value={values.deliveredDate}
              onChange={(e) => set("deliveredDate", e.target.value)}
            />
          </div>

          <div className="field full">
            <label htmlFor="f-memo">메모 (고객 요청사항)</label>
            <textarea
              id="f-memo"
              value={values.memo}
              onChange={(e) => set("memo", e.target.value)}
              placeholder="특이사항을 입력하세요"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
