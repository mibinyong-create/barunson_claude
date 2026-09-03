"use client";

import { Modal } from "@/components/Modal";
import type { PurchasingRow, VendorMeta } from "@/lib/types";

type Props = {
  row: PurchasingRow | null;
  vendors: VendorMeta[];
  onClose: () => void;
};

/** 발주 행의 외주 업체명을 눌렀을 때 뜨는 요약 팝업.
 *  업체 마스터 정보 + 이 발주의 주문 사이트·결제 방법을 보여준다. */
export function VendorInfoModal({ row, vendors, onClose }: Props) {
  const po = row?.po ?? null;
  const vendorName = po?.vendorName ?? "";
  const vendor = vendors.find((v) => v.name === vendorName.trim());

  const site = po?.orderSite ?? null;
  const siteHref =
    site && /^https?:\/\//i.test(site)
      ? site
      : site && /\.[a-z]{2,}/i.test(site)
        ? `https://${site}`
        : null;

  return (
    <Modal open={!!row} title={vendorName || "외주 업체"} onClose={onClose} size="sm">
      <dl className="info-list">
        {vendor?.category ? (
          <div>
            <dt>분류</dt>
            <dd>{vendor.category}</dd>
          </div>
        ) : null}
        {vendor?.contact || vendor?.phone ? (
          <div>
            <dt>담당자</dt>
            <dd>
              {vendor?.contact ?? "-"}
              {vendor?.phone ? <span className="mono subrow">{vendor.phone}</span> : null}
            </dd>
          </div>
        ) : null}
        <div className="info-full">
          <dt>주문 사이트</dt>
          <dd>
            {site ? (
              siteHref ? (
                <a
                  className="order-link"
                  href={siteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {site} ↗
                </a>
              ) : (
                site
              )
            ) : (
              <span className="req-empty">미입력</span>
            )}
          </dd>
        </div>
        <div>
          <dt>주문 방법</dt>
          <dd>{po?.paymentMethod ?? <span className="req-empty">미입력</span>}</dd>
        </div>
        {vendor?.memo ? (
          <div className="info-full">
            <dt>메모</dt>
            <dd>{vendor.memo}</dd>
          </div>
        ) : null}
      </dl>
      {!vendor ? (
        <p className="note-text">업체 마스터에 등록되지 않은 업체입니다.</p>
      ) : null}
    </Modal>
  );
}
