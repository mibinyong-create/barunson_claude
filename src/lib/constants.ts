import type { OrderSort } from "./types";

/**
 * 화면 전체의 "오늘" 기준일.
 * 원본 프로토타입은 TODAY = "2026-08-24" 로 하드코딩되어 있었다.
 * NEXT_PUBLIC_TODAY 로 고정할 수 있고, 비우면 실제 오늘 날짜를 쓴다.
 */
export function resolveToday(): string {
  const fixed = process.env.NEXT_PUBLIC_TODAY;
  if (fixed && /^\d{4}-\d{2}-\d{2}$/.test(fixed)) return fixed;
  return new Date().toISOString().slice(0, 10);
}

export const TODAY = resolveToday();

export const SORT_OPTIONS: { value: OrderSort; label: string }[] = [
  { value: "orderDateDesc", label: "주문일 최신순" },
  { value: "orderDateAsc", label: "주문일 오래된순" },
  { value: "weddingDateAsc", label: "예식일 임박순" },
  { value: "amountDesc", label: "금액 높은순" },
];

export const PAGE_SIZES = [10, 25, 50] as const;

/** 예식일이 이 일수 미만으로 남으면 목록에서 빨간색으로 강조 */
export const URGENT_DAYS = 10;
