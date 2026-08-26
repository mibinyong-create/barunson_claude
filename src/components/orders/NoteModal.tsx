"use client";

import { Modal } from "@/components/Modal";
import type { Order } from "@/lib/types";

/** 💬 아이콘 → 고객 요청사항 전문 */
export function NoteModal({ order, onClose }: { order: Order | null; onClose: () => void }) {
  return (
    <Modal open={!!order} title="고객 요청사항" onClose={onClose} size="sm">
      <p className="note-text">{order?.memo ?? "등록된 요청사항이 없습니다."}</p>
      {order ? (
        <div className="note-meta mono">
          {order.orderNo} · {order.customerName}
        </div>
      ) : null}
    </Modal>
  );
}
