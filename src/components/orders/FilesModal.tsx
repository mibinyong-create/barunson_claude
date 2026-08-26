"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { FolderIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { useAsyncData } from "@/hooks/useAsyncData";
import { api } from "@/lib/client-api";
import { fmtDateTime, fmtFileSize } from "@/lib/format";
import type { OrderFile, OrderFileKind } from "@/lib/types";

type Props = {
  open: boolean;
  orderId: number | null;
  orderNo: string;
  kind: OrderFileKind;
  title: string;
  onClose: () => void;
  onChanged: () => void;
  onError: (message: string) => void;
};

/**
 * 첨부파일 / 초안 파일 목록 + 추가 + 삭제.
 * 실제 바이너리는 저장하지 않고 파일 메타데이터(이름·크기·타입)만 DB 에 남긴다.
 */
export function FilesModal({
  open,
  orderId,
  orderNo,
  kind,
  title,
  onClose,
  onChanged,
  onError,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [localVersion, setLocalVersion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetcher = useCallback(
    (signal: AbortSignal) => api.listFiles(orderId ?? 0, kind, signal),
    [orderId, kind],
  );
  const { data, error, loading } = useAsyncData<OrderFile[]>(
    `${orderId ?? ""}|${kind}|${localVersion}`,
    fetcher,
    open && !!orderId,
  );
  const files = data ?? [];

  useEffect(() => {
    if (error) onError(error);
  }, [error, onError]);

  async function handlePick(list: FileList | null) {
    if (!list?.length || !orderId) return;
    setBusy(true);
    try {
      for (const f of Array.from(list)) {
        await api.addFile(orderId, {
          kind,
          fileName: f.name,
          fileSize: f.size,
          contentType: f.type || undefined,
        });
      }
      setLocalVersion((v) => v + 1);
      onChanged();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(fileId: number) {
    if (!orderId) return;
    setBusy(true);
    try {
      await api.deleteFile(orderId, fileId);
      setLocalVersion((v) => v + 1);
      onChanged();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title={`${title} · ${orderNo}`}
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          닫기
        </button>
      }
    >
      <div className="file-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <PlusIcon /> 파일 추가
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => handlePick(e.target.files)}
        />
        <span className="file-hint">
          실제 파일은 전송하지 않고 파일명·크기만 기록합니다.
        </span>
      </div>

      {loading ? (
        <div className="empty">불러오는 중…</div>
      ) : files.length === 0 ? (
        <div className="empty">
          <div className="big">등록된 파일이 없어요</div>
          위의 &lsquo;파일 추가&rsquo;로 등록해보세요.
        </div>
      ) : (
        <ul className="file-list">
          {files.map((f) => (
            <li key={f.id}>
              <span className="file-icon">
                <FolderIcon />
              </span>
              <span className="file-meta">
                <b>{f.fileName}</b>
                <small className="mono">
                  {fmtFileSize(f.fileSize)}
                  {f.fileSize ? " · " : ""}
                  {fmtDateTime(f.uploadedAt)} · {f.uploadedBy}
                </small>
              </span>
              <button
                type="button"
                className="icon-btn danger"
                onClick={() => handleDelete(f.id)}
                disabled={busy}
                title="삭제"
                aria-label={`${f.fileName} 삭제`}
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
