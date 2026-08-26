"use client";

import { Modal } from "@/components/Modal";

export function ConfirmDeleteModal({
  open,
  count,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  count: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      title="주문 삭제"
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            취소
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? "삭제 중…" : "삭제"}
          </button>
        </>
      }
    >
      <p className="confirm-text">
        선택한 <b>{count}건</b>의 주문을 삭제할까요?
      </p>
      <p className="confirm-sub">삭제한 주문은 되돌릴 수 없습니다.</p>
    </Modal>
  );
}
