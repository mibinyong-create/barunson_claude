"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons";

type Props = {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** 하단 시트(드로어) 형태로 띄울지 — 원본의 draftOverlay */
  variant?: "modal" | "sheet";
  size?: "sm" | "md" | "lg";
};

/**
 * 원본의 .overlay / .modal 마크업을 그대로 쓰는 공용 오버레이.
 * Esc 키와 배경 클릭으로 닫히고, 열려 있는 동안 body 스크롤을 잠근다.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  variant = "modal",
  size = "md",
}: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  // 열릴 때 다이얼로그 안으로 포커스를 옮기고, 닫히면 원래 위치로 되돌린다.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current
      ?.querySelector<HTMLElement>(
        'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      ?.focus();
    return () => previous?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxWidth = size === "sm" ? 420 : size === "lg" ? 900 : 640;

  return (
    <div
      className={variant === "sheet" ? "overlay overlay-sheet" : "overlay"}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={variant === "sheet" ? "sheet" : "modal"}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={variant === "sheet" ? undefined : { maxWidth }}
      >
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}
