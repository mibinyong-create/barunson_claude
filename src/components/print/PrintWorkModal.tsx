"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { ImageLightbox } from "@/components/ImageLightbox";
import { FolderIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { api } from "@/lib/client-api";
import { apiUrl } from "@/lib/api";
import { fmtDateTime, fmtFileSize, num, won } from "@/lib/format";
import type { OrderDetail, OrderFile } from "@/lib/types";

const METHODS = ["내부디지털", "5층인쇄", "외부생산"] as const;

const fileUrl = (orderId: number, fileId: number) =>
  apiUrl(`/api/orders/${orderId}/files/${fileId}/content`);
const isImage = (f: OrderFile) => f.hasData && !!f.contentType?.startsWith("image/");

export function PrintWorkModal({
  orderId,
  onClose,
  onChanged,
  onError,
}: {
  orderId: number | null;
  onClose: () => void;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [drafts, setDrafts] = useState<OrderFile[]>([]);
  const [method, setMethod] = useState<string>("내부디지털");
  const [links, setLinks] = useState("");
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState<{ src: string; name: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (orderId == null) return;
    const c = new AbortController();
    api
      .getOrder(orderId, c.signal)
      .then((o) => {
        setOrder(o);
        setDrafts(o.drafts);
        setMethod(o.printMethod ?? "내부디지털");
        setLinks(o.sourceLinks ?? "");
      })
      .catch((e: Error) => {
        if (!c.signal.aborted) onError(e.message);
      });
    return () => c.abort();
  }, [orderId, onError]);

  async function pickFiles(list: FileList | null) {
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

  async function deleteFile(fileId: number) {
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

  async function saveMethod(next: string) {
    if (!order) return;
    setMethod(next);
    try {
      await api.updatePrintInfo(order.id, { printMethod: next });
      onChanged();
    } catch (e) {
      onError((e as Error).message);
    }
  }

  async function saveLinks() {
    if (!order) return;
    const cleaned = links
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n");
    if (!cleaned) {
      onError("원본 링크를 입력하세요. 빈 내용으로는 저장할 수 없습니다.");
      return;
    }
    setBusy(true);
    try {
      await api.updatePrintInfo(order.id, { sourceLinks: cleaned });
      setLinks(cleaned);
      onChanged();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sendToPrint() {
    if (!order) return;
    if (!(order.sourceLinks && order.sourceLinks.trim())) {
      onError("원본 링크를 먼저 등록해야 인쇄팀에 전달할 수 있습니다.");
      return;
    }
    setBusy(true);
    try {
      await api.updateStatus(order.id, "인쇄팀전달");
      onChanged();
      onClose();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const linksRegistered = !!(order?.sourceLinks && order.sourceLinks.trim());

  return (
    <Modal
      open={orderId != null}
      variant="sheet"
      title={
        order
          ? `주문 ${order.orderNo} — ${order.productName}`
          : "인쇄작업"
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            닫기
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !order || order.orderStatus === "인쇄팀전달" || !linksRegistered}
            onClick={sendToPrint}
            title={linksRegistered ? "" : "원본 링크 등록 후 전달 가능"}
          >
            인쇄팀 전달
          </button>
        </>
      }
    >
      {!order ? (
        <div className="empty">불러오는 중…</div>
      ) : (
        <div className="print-grid">
          <div>
            <dl className="info-list">
              <div>
                <dt>주문자</dt>
                <dd>
                  {order.customerName}
                  <span className="mono subrow">{order.customerPhone ?? "-"}</span>
                </dd>
              </div>
              <div>
                <dt>주문일</dt>
                <dd className="mono">{fmtDateTime(order.createdAt)}</dd>
              </div>
              <div>
                <dt>상품코드</dt>
                <dd className="mono">{order.productCode}</dd>
              </div>
              <div>
                <dt>주문 수량</dt>
                <dd className="mono">{num(order.quantity)}</dd>
              </div>
              <div className="info-full">
                <dt>결제</dt>
                <dd className="mono">
                  {won(order.totalAmount)}
                  <span className="subrow">{order.paymentStatus}</span>
                </dd>
              </div>
            </dl>

            <h3 className="section-title">
              초안 미리보기 <span className="count-badge">{drafts.length}</span>
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
                accept="image/*,application/pdf"
                multiple
                hidden
                onChange={(e) => pickFiles(e.target.files)}
              />
              <span className="file-hint">이미지는 미리보기로 표시됩니다. (최대 8MB)</span>
            </div>

            {drafts.length === 0 ? (
              <div className="empty">
                <div className="big">등록된 초안이 없어요</div>
              </div>
            ) : (
              <ul className="file-list">
                {drafts.map((f) => (
                  <li key={f.id}>
                    {isImage(f) ? (
                      <button
                        type="button"
                        className="file-thumb"
                        title={`${f.fileName} 크게 보기`}
                        onClick={() =>
                          setZoom({ src: fileUrl(order.id, f.id), name: f.fileName })
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={fileUrl(order.id, f.id)} alt={f.fileName} loading="lazy" />
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
                      onClick={() => deleteFile(f.id)}
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
          </div>

          <div>
            <h3 className="section-title">인쇄구분</h3>
            <div className="seg">
              {METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`seg-btn${method === m ? " active" : ""}`}
                  onClick={() => saveMethod(m)}
                  disabled={busy}
                >
                  {m}
                </button>
              ))}
            </div>

            <h3 className="section-title">
              원본 작업 파일 (구글 드라이브 링크 — 고객 컨펌 후)
            </h3>
            <div className="field full">
              <label htmlFor="src-links">구글 드라이브 링크 (한 줄에 하나씩)</label>
              <textarea
                id="src-links"
                rows={5}
                value={links}
                onChange={(e) => setLinks(e.target.value)}
                placeholder="https://drive.google.com/..."
              />
              <span className="hint">
                팀 공유드라이브 링크만 등록(.ai/.pdf 무관). 여러 파일이면 줄바꿈으로 구분하며,
                저장 시 입력한 내용 전체로 교체됩니다.
              </span>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={saveLinks}
              disabled={busy}
            >
              원본 링크 저장
            </button>
            <p className="print-note">
              {linksRegistered
                ? "원본 링크가 등록되어 인쇄팀에 전달할 수 있습니다."
                : "원본 링크를 먼저 등록해야 인쇄팀에 전달할 수 있습니다."}
            </p>

            <h3 className="section-title">진행 상태 이력</h3>
            <ul className="history-list">
              {order.statusHistory.slice(0, 6).map((h) => (
                <li key={h.id}>
                  <span className={`pill st-${h.toStatus}`}>{h.toStatus}</span>
                  <span className="mono hist-date">{fmtDateTime(h.changedAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {zoom ? (
        <ImageLightbox src={zoom.src} alt={zoom.name} onClose={() => setZoom(null)} />
      ) : null}
    </Modal>
  );
}
