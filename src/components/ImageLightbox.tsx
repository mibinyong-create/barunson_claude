"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * 이미지 원본을 화면 가득 크게 보여주는 라이트박스.
 * 배경 클릭 · ✕ · Esc 로 닫힌다. Modal(드로어) 위에 겹쳐 뜰 수 있도록 body 로 포탈한다.
 */
export function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // 같은 document 에 걸린 Modal 의 Esc 핸들러까지 막아 드로어가 함께 닫히지 않게 한다.
        e.stopImmediatePropagation();
        onClose();
      }
    };
    // 캡처 단계에서 먼저 처리한다.
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <button type="button" className="lightbox-close" onClick={onClose} aria-label="닫기">
        ✕
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="lightbox-img"
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
}
