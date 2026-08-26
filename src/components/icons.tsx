/** 원본 HTML 의 인라인 SVG 아이콘을 컴포넌트로 옮긴 것 */
import type { SVGProps } from "react";

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

/** 상품 썸네일 (원본 productIcon) — DB 의 icon_path 문자열을 검증 후 그린다 */
export function ProductThumb({
  name,
  iconPath,
  linkUrl,
}: {
  name: string;
  iconPath: string | null;
  linkUrl: string | null;
}) {
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

  if (!linkUrl) return <span className="product-thumb">{svg}</span>;

  return (
    <a
      className="product-thumb"
      href={linkUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`바른손카드에서 ${name} 보기`}
      onClick={(e) => e.stopPropagation()}
    >
      {svg}
    </a>
  );
}
