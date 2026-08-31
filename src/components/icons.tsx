/** 원본 HTML 의 인라인 SVG 아이콘을 컴포넌트로 옮긴 것 */
"use client";

import { useCallback, useEffect, useRef, useState, type SVGProps } from "react";
import { createPortal } from "react-dom";
import { basePath } from "@/lib/api";

const base = (size: number): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
});

export const DashboardIcon = ({ size = 16 }: { size?: number }) => (
  <svg {...base(size)} aria-hidden>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);

export const OrdersIcon = ({ size = 16 }: { size?: number }) => (
  <svg {...base(size)} aria-hidden>
    <path d="M21 8 12 3 3 8l9 5 9-5Z" />
    <path d="M3 8v8l9 5 9-5V8" />
    <path d="M12 13v8" />
  </svg>
);

export const CustomersIcon = ({ size = 16 }: { size?: number }) => (
  <svg {...base(size)} aria-hidden>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const ProductsIcon = ({ size = 16 }: { size?: number }) => (
  <svg {...base(size)} aria-hidden>
    <rect x="3" y="8" width="18" height="13" rx="1.5" />
    <path d="M3 8V6a2 2 0 0 1 2-2h4l2 2 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M12 12v5" />
    <path d="M9.5 14.5h5" />
  </svg>
);

export const SettingsIcon = ({ size = 16 }: { size?: number }) => (
  <svg {...base(size)} aria-hidden>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

export const BellIcon = ({ size = 16 }: { size?: number }) => (
  <svg {...base(size)} aria-hidden>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export const SearchIcon = ({ size = 15 }: { size?: number }) => (
  <svg {...base(size)} aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const CalendarIcon = ({ size = 14 }: { size?: number }) => (
  <svg {...base(size)} aria-hidden>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

export const CloseIcon = ({ size = 16 }: { size?: number }) => (
  <svg {...base(size)} aria-hidden>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const FolderIcon = ({ size = 14 }: { size?: number }) => (
  <svg {...base(size)} aria-hidden>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
);

export const NoteIcon = ({ size = 14 }: { size?: number }) => (
  <svg {...base(size)} aria-hidden>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

export const PlusIcon = ({ size = 15 }: { size?: number }) => (
  <svg {...base(size)} aria-hidden>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const TrashIcon = ({ size = 14 }: { size?: number }) => (
  <svg {...base(size)} aria-hidden>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);

export const ClipboardIcon = ({ size = 16 }: { size?: number }) => (
  <svg {...base(size)} aria-hidden>
    <rect x="6" y="4" width="12" height="17" rx="2" />
    <path d="M9 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1H9V4Z" />
    <path d="M9 11h6M9 15h6" />
  </svg>
);

export const TruckIcon = ({ size = 16 }: { size?: number }) => (
  <svg {...base(size)} aria-hidden>
    <path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z" />
    <circle cx="7" cy="18" r="1.6" />
    <circle cx="17.5" cy="18" r="1.6" />
  </svg>
);

export const LogoutIcon = ({ size = 16 }: { size?: number }) => (
  <svg {...base(size)} aria-hidden>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

const FALLBACK_ICON_PATH =
  '<path d="M4 8l8-4 8 4v9l-8 4-8-4V8Z"/><path d="M4 8l8 4 8-4"/><path d="M12 12v9"/>';

/** SVG 도형 태그만 허용한다. script/foreignObject/on* 핸들러 등은 전부 거른다. */
const SAFE_SVG_TAG =
  /^<(?:path|circle|rect|line|polyline|polygon|ellipse|g)\b[^<>]*\/?>$|^<\/g>$/;

function sanitizeIconPath(rawPath: string | null): string | null {
  if (!rawPath) return null;
  if (/<\s*(script|foreignObject|iframe|image|use|a)\b/i.test(rawPath)) return null;
  if (/\son\w+\s*=/i.test(rawPath)) return null;
  if (/(javascript|data)\s*:/i.test(rawPath)) return null;

  const tags = rawPath.match(/<[^>]+>/g) ?? [];
  if (tags.length === 0) return null;
  return tags.every((t) => SAFE_SVG_TAG.test(t)) ? rawPath : null;
}

/** 슬러그별 상품 사진 (public/products/<slug>.jpg). 없으면 SVG 아이콘으로 폴백.
 *  이미지 출처: barunsoncard.com 기념굿즈 카탈로그의 대표 상품컷을 축소해 동봉. */
const PRODUCT_PHOTO_SLUGS = new Set([
  "keyring",
  "phonegrip",
  "magnet",
  "photo",
  "stamp",
  "newspaper",
  "sticker",
  "card",
  "puzzle",
  "postcard",
]);

/** 상품 썸네일 (원본 productIcon) — 상품 사진이 있으면 사진, 없으면 icon_path SVG */
export function ProductThumb({
  name,
  slug,
  iconPath,
  linkUrl,
}: {
  name: string;
  slug?: string | null;
  iconPath: string | null;
  linkUrl: string | null;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = !!slug && PRODUCT_PHOTO_SLUGS.has(slug) && !photoFailed;
  const photoSrc = `${basePath}/products/${slug}.jpg`;

  // 마우스 오버 시 큰 미리보기. 목록 테이블은 overflow 로 잘리므로 body 로 포탈한다.
  const ZOOM_SIZE = 260;
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [zoomAt, setZoomAt] = useState<{ top: number; left: number } | null>(null);

  const openZoom = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 12;
    let left = r.right + gap;
    if (left + ZOOM_SIZE > window.innerWidth - 8) left = r.left - gap - ZOOM_SIZE;
    left = Math.max(8, left);
    const top = Math.max(
      8,
      Math.min(r.top + r.height / 2 - ZOOM_SIZE / 2, window.innerHeight - ZOOM_SIZE - 8),
    );
    setZoomAt({ top, left });
  }, []);
  const closeZoom = useCallback(() => setZoomAt(null), []);

  useEffect(() => {
    if (!zoomAt) return;
    window.addEventListener("scroll", closeZoom, true);
    window.addEventListener("resize", closeZoom);
    return () => {
      window.removeEventListener("scroll", closeZoom, true);
      window.removeEventListener("resize", closeZoom);
    };
  }, [zoomAt, closeZoom]);

  const svg = (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: sanitizeIconPath(iconPath) ?? FALLBACK_ICON_PATH }}
    />
  );

  const inner = showPhoto ? (
    // 46px 썸네일 + basePath 프리픽스가 필요해 next/image 대신 순수 img 사용
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="product-thumb-img"
      src={photoSrc}
      alt=""
      loading="lazy"
      onError={() => setPhotoFailed(true)}
    />
  ) : (
    svg
  );

  const thumb = linkUrl ? (
    <a
      className="product-thumb"
      href={linkUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`바른손카드에서 ${name} 보기`}
      onClick={(e) => e.stopPropagation()}
    >
      {inner}
    </a>
  ) : (
    <span className="product-thumb">{inner}</span>
  );

  if (!showPhoto) return thumb;

  return (
    <span
      ref={wrapRef}
      className="product-thumb-wrap"
      onMouseEnter={openZoom}
      onMouseLeave={closeZoom}
    >
      {thumb}
      {zoomAt && typeof document !== "undefined"
        ? createPortal(
            <span
              className="product-thumb-zoom"
              style={{ top: zoomAt.top, left: zoomAt.left, width: ZOOM_SIZE, height: ZOOM_SIZE }}
              aria-hidden
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoSrc} alt="" />
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
