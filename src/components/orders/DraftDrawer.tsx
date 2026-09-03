"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { ImageLightbox } from "@/components/ImageLightbox";
import { FolderIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { api } from "@/lib/client-api";
import { apiUrl } from "@/lib/api";
import { fmtDate, fmtDateTime, fmtFileSize, num, won } from "@/lib/format";
import type { OrderDetail, OrderFile } from "@/lib/types";

const fileContentUrl = (orderId: number, fileId: number) =>
  apiUrl(`/api/orders/${orderId}/files/${fileId}/content`);

const isImage = (f: OrderFile) => f.hasData && !!f.contentType?.startsWith("image/");

/** 주문번호 클릭 → 하단 시트. 주문 요약 + 요청사항 + 초안 업로드 */
export function DraftDrawer({
  order,
  onClose,
  onChanged,
  onError,
}: {
  order: OrderDetail | null;
  onClose: () => void;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  // 부모가 key={order.id} 로 리마운트시키므로 초기값 계산만으로 충분하다.
  const [drafts, setDrafts] = useState<OrderFile[]>(order?.drafts ?? []);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState<{ src: string; name: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handlePick(list: FileList | null) {
    if (!list?.length || !order) return;
    setBusy(true);
    try {
      for (const f of Array.from(list)) {
        const created = await api.addFile(order.id, "draft", f);
        setDrafts((prev) => [...prev, created]);
      }
      onChanged();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(fileId: number) {
    if (!order) return;
    setBusy(true);
    try {
      await api.deleteFile(order.id, fileId);
      setDrafts((prev) => prev.filter((f) => f.id !== fileId));
      onChanged();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={!!order}
      variant="sheet"
      title="주문 내용 · 초안 업로드"
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          닫기
        </button>
      }
    >
      {order ? (
        <>
          <dl className="info-list cols-3">
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
              <dt>상품</dt>
              <dd>
                {order.productName}
                {order.optionText ? <span className="subrow">{order.optionText}</span> : null}
              </dd>
            </div>
            <div>
              <dt>수량 · 금액</dt>
              <dd className="mono">
                {num(order.quantity)} · {won(order.totalAmount)}
              </dd>
            </div>
            <div>
              <dt>예식일</dt>
              <dd className="mono">{fmtDate(order.weddingDate)}</dd>
            </div>
            <div>
              <dt>진행상태</dt>
              <dd>
                <span className={`pill st-${order.orderStatus}`}>{order.orderStatus}</span>
              </dd>
            </div>
          </dl>

          {order.orderStatus === "수정요청" || order.revisionNote ? (
            <div className="revision-callout">
              <div className="revision-callout-head">
                <span className="pill st-수정요청">수정요청</span>
                <span>고객이 요청한 수정 내용</span>
              </div>
              <p className="revision-callout-body">
                {order.revisionNote?.trim()
                  ? order.revisionNote
                  : "수정 요청 내용이 아직 등록되지 않았습니다. 주문 수정에서 입력해주세요."}
              </p>
            </div>
          ) : null}

          <h3 className="section-title">고객 요청사항</h3>
          <p className="note-text">{order.memo || "등록된 요청사항이 없습니다."}</p>

          <h3 className="section-title">
            초안 파일 <span className="count-badge">{drafts.length}</span>
          </h3>
          <div className="file-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              <PlusIcon /> 초안 업로드
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => handlePick(e.target.files)}
            />
            <span className="file-hint">이미지는 미리보기로 표시됩니다. (최대 8MB)</span>
          </div>

          {drafts.length === 0 ? (
            <div className="empty">
              <div className="big">등록된 초안이 없어요</div>
              초안을 업로드하면 여기에 표시됩니다.
            </div>
          ) : (
            <ul className="file-list">
              {drafts.map((f) => (
                <li key={f.id}>
                  {isImage(f) ? (
                    <button
                      type="button"
                      className="file-thumb"
                      onClick={() =>
                        setZoom({ src: fileContentUrl(order.id, f.id), name: f.fileName })
                      }
                      title={`${f.fileName} 크게 보기`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={fileContentUrl(order.id, f.id)} alt={f.fileName} loading="lazy" />
                    </button>
                  ) : (
                    <span className="file-icon">
                      <FolderIcon />
                    </span>
                  )}
                  <span className="file-meta">
                    <b>{f.fileName}</b>
                    <small className="mono">
                      {fmtFileSize(f.fileSize)}
                      {f.fileSize ? " · " : ""}
                      {fmtDateTime(f.uploadedAt)}
                    </small>
                  </span>
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => handleDelete(f.id)}
                    disabled={busy}
                    aria-label={`${f.fileName} 삭제`}
                    title="삭제"
                  >
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <h3 className="section-title">진행 상태 이력</h3>
          <ul className="history-list">
            {order.statusHistory.map((h) => (
              <li key={h.id}>
                <span className={`pill st-${h.toStatus}`}>{h.toStatus}</span>
                <span className="mono hist-date">{fmtDateTime(h.changedAt)}</span>
                <span className="hist-note">
                  {h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : (h.note ?? "")}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {zoom ? (
        <ImageLightbox src={zoom.src} alt={zoom.name} onClose={() => setZoom(null)} />
      ) : null}
    </Modal>
  );
}
