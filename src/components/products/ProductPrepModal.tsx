"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { PREP_STEPS } from "@/lib/prep-steps";
import { api } from "@/lib/client-api";
import type { PrepStepCode, Product, ProductPrepStep } from "@/lib/types";

type Props = {
  product: Product | null;
  onClose: () => void;
  onSaved: (p: Product) => void;
  onError: (m: string) => void;
};

const blank = (s: string) => (s.trim() === "" ? null : s.trim());

/** 상품 준비 6단계(디자인→인쇄→촬영→보정·연출→웹디자인→출시) 상세·편집 */
export function ProductPrepModal({ product, onClose, onSaved, onError }: Props) {
  const [steps, setSteps] = useState<ProductPrepStep[]>(product?.prepSteps ?? []);
  const [busy, setBusy] = useState<PrepStepCode | null>(null);

  if (!product) {
    return (
      <Modal open={false} title="" onClose={onClose}>
        {null}
      </Modal>
    );
  }

  const byCode = (c: PrepStepCode) =>
    steps.find((s) => s.code === c) ?? {
      code: c,
      order: 0,
      done: false,
      targetDate: null,
      doneDate: null,
    };

  const doneCount = steps.filter((s) => s.done).length;

  const prod = product;

  async function save(code: PrepStepCode, patch: Partial<ProductPrepStep>) {
    const cur = byCode(code);
    const next = { ...cur, ...patch };
    // 낙관적 업데이트
    setSteps((prev) => {
      const others = prev.filter((s) => s.code !== code);
      return [...others, next].sort((a, b) => a.order - b.order);
    });
    setBusy(code);
    try {
      const updated = await api.updatePrepStep(prod.id, {
        code,
        done: next.done,
        targetDate: next.targetDate,
        doneDate: next.doneDate,
      });
      setSteps(updated.prepSteps);
      onSaved(updated);
    } catch (e) {
      onError((e as Error).message);
      setSteps(prod.prepSteps); // 롤백
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal
      open={!!product}
      title={`출시 준비 · ${product.name}`}
      onClose={onClose}
      size="md"
      footer={
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          닫기
        </button>
      }
    >
      <div className="prep-progress">
        <span className="prep-progress-label">
          진행 {doneCount} / {PREP_STEPS.length}단계
        </span>
        <span className="prep-bar prep-bar-lg">
          {PREP_STEPS.map((m) => (
            <span
              key={m.code}
              className={`prep-seg${byCode(m.code).done ? " done" : ""}`}
              title={m.label}
            />
          ))}
        </span>
      </div>

      <ul className="prep-steps">
        {PREP_STEPS.map((m) => {
          const st = byCode(m.code);
          return (
            <li key={m.code} className={`prep-step${st.done ? " done" : ""}`}>
              <label className="prep-step-check">
                <input
                  type="checkbox"
                  checked={st.done}
                  disabled={busy === m.code}
                  onChange={(e) => save(m.code, { done: e.target.checked })}
                />
                <span className="prep-step-no">{m.order}</span>
                <span className="prep-step-name">
                  {m.label}
                  <span className="prep-step-owner">{m.team} · {m.owner}</span>
                </span>
              </label>
              <div className="prep-step-dates">
                <label>
                  목표일
                  <input
                    type="date"
                    value={st.targetDate ?? ""}
                    disabled={busy === m.code}
                    onChange={(e) => save(m.code, { targetDate: blank(e.target.value) })}
                  />
                </label>
                <label>
                  완료일
                  <input
                    type="date"
                    value={st.doneDate ?? ""}
                    disabled={busy === m.code}
                    onChange={(e) => save(m.code, { doneDate: blank(e.target.value) })}
                  />
                </label>
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
