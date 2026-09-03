"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { TODAY } from "@/lib/constants";
import { num, won } from "@/lib/format";
import type {
  PurchaseOrderInput,
  PurchaseOrderStatus,
  PurchasingRow,
  VendorMeta,
} from "@/lib/types";

const STATUSES: PurchaseOrderStatus[] = ["발주", "제작중", "입고완료", "취소"];

type Props = {
  row: PurchasingRow | null;
  vendors: VendorMeta[];
  busy: boolean;
  onClose: () => void;
  /** true 를 돌려주면 모달을 닫는다 */
  onSave: (data: PurchaseOrderInput, advanceStatus: boolean) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
};

export function PurchaseOrderModal({ row, vendors, busy, onClose, onSave, onDelete }: Props) {
  const po = row?.po ?? null;
  const [vendorName, setVendorName] = useState(po?.vendorName ?? "");
  const [poNumber, setPoNumber] = useState(po?.poNumber ?? "");
  const [orderedDate, setOrderedDate] = useState(po?.orderedDate ?? TODAY);
  const [expectedDate, setExpectedDate] = useState(po?.expectedDate ?? "");
  const [receivedDate, setReceivedDate] = useState(po?.receivedDate ?? "");
  const [unitCost, setUnitCost] = useState(
    String(po?.unitCost ?? row?.productPurchasePrice ?? ""),
  );
  const [quantity, setQuantity] = useState(
    String(po?.quantity ?? row?.orderQuantity ?? ""),
  );
  const [status, setStatus] = useState<PurchaseOrderStatus>(po?.status ?? "발주");
  const [note, setNote] = useState(po?.note ?? "");
  const [advance, setAdvance] = useState(false);

  if (!row) {
    return (
      <Modal open={false} title="" onClose={onClose}>
        {null}
      </Modal>
    );
  }

  const canAdvance = status === "입고완료" && row.orderStatus === "외주발주";
  const costNum = Number(unitCost) || 0;
  const qtyNum = Number(quantity) || 0;
  const matchedVendor = vendors.find((v) => v.name === vendorName.trim());

  const blank = (s: string) => (s.trim() === "" ? null : s.trim());

  async function submit() {
    if (vendorName.trim() === "") return;
    const ok = await onSave(
      {
        vendorName: vendorName.trim(),
        poNumber: blank(poNumber),
        orderedDate,
        expectedDate: blank(expectedDate),
        receivedDate: blank(receivedDate),
        unitCost: unitCost.trim() === "" ? null : Number(unitCost),
        quantity: quantity.trim() === "" ? null : Number(quantity),
        status,
        note: blank(note),
      },
      canAdvance && advance,
    );
    if (ok) onClose();
  }

  return (
    <Modal
      open={!!row}
      title={po ? "발주 내용 수정" : "외주 발주 등록"}
      onClose={onClose}
      size="md"
      footer={
        <>
          {po ? (
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={async () => {
                if (await onDelete()) onClose();
              }}
            >
              발주 삭제
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            닫기
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || vendorName.trim() === ""}
            onClick={submit}
          >
            {po ? "저장" : "발주 등록"}
          </button>
        </>
      }
    >
      <dl className="info-list">
        <div>
          <dt>주문번호</dt>
          <dd className="mono">{row.orderNo}</dd>
        </div>
        <div>
          <dt>주문자</dt>
          <dd>{row.customerName}</dd>
        </div>
        <div className="info-full">
          <dt>상품 · 옵션</dt>
          <dd>
            {row.productName}
            <span className="subrow">
              {row.optionText ? `${row.optionText} · ` : ""}
              주문수량 {num(row.orderQuantity)}개
            </span>
          </dd>
        </div>
      </dl>

      <h3 className="section-title">발주 내용</h3>
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="po-vendor">
            외주 업체 <span className="req">*</span>
          </label>
          <input
            id="po-vendor"
            list="po-vendor-list"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            placeholder="등록된 업체를 선택하거나 직접 입력"
          />
          <datalist id="po-vendor-list">
            {vendors.map((v) => (
              <option key={v.id} value={v.name}>
                {v.category ?? ""}
              </option>
            ))}
          </datalist>
          {matchedVendor ? (
            <span className="hint">
              {matchedVendor.category ? `${matchedVendor.category} · ` : ""}
              {matchedVendor.contact ?? ""}
              {matchedVendor.phone ? ` (${matchedVendor.phone})` : ""}
              {matchedVendor.memo ? ` — ${matchedVendor.memo}` : ""}
            </span>
          ) : null}
        </div>
        <div className="field">
          <label htmlFor="po-number">발주서 번호</label>
          <input id="po-number" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="po-status">발주 상태</label>
          <select
            id="po-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="po-ordered">발주일 (주문 넘긴 날)</label>
          <input
            id="po-ordered"
            type="date"
            value={orderedDate}
            onChange={(e) => setOrderedDate(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="po-expected">입고 예정일</label>
          <input
            id="po-expected"
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="po-cost">발주 단가</label>
          <input
            id="po-cost"
            inputMode="numeric"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="po-qty">발주 수량</label>
          <input
            id="po-qty"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="po-received">입고 완료일</label>
          <input
            id="po-received"
            type="date"
            value={receivedDate}
            onChange={(e) => setReceivedDate(e.target.value)}
          />
        </div>
        <div className="field-total">
          <span>발주 금액</span>
          <b>{won(costNum * qtyNum)}</b>
        </div>
        <div className="field full">
          <label htmlFor="po-note">메모 (요청사항·전달 내용)</label>
          <textarea
            id="po-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="업체에 전달한 시안·규격·주의사항 등을 기록하세요."
          />
        </div>
        {canAdvance ? (
          <label className="field-check">
            <input
              type="checkbox"
              checked={advance}
              onChange={(e) => setAdvance(e.target.checked)}
            />
            입고 완료 처리 → 주문 진행상태를 &lsquo;인쇄팀전달&rsquo;로 이동
          </label>
        ) : null}
      </div>
    </Modal>
  );
}
