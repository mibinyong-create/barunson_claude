import { TODAY } from "./constants";
import { toISODate, weekRange } from "./format";

/**
 * 목록 화면의 날짜 필터 프리셋.
 * - today / yesterday / 3days : 기준일(TODAY) 기준 상대 범위
 * - week : anchor 가 속한 주(월~일)
 * - day  : anchor 하루 (드릴다운용)
 * - all  : 날짜 필터 없음
 */
export type DatePreset = "today" | "yesterday" | "3days" | "week" | "day" | "all";

/** YYYY-MM-DD 에 일수를 더한 새 날짜 문자열 */
export function shiftDay(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export type DateRange = { from?: string; to?: string; all: boolean };

export function resolveDateRange(preset: DatePreset, anchor: string): DateRange {
  switch (preset) {
    case "all":
      return { all: true };
    case "today":
      return { from: TODAY, to: TODAY, all: false };
    case "yesterday": {
      const y = shiftDay(TODAY, -1);
      return { from: y, to: y, all: false };
    }
    case "3days":
      return { from: shiftDay(TODAY, -2), to: TODAY, all: false };
    case "day":
      return { from: anchor, to: anchor, all: false };
    case "week": {
      const w = weekRange(anchor);
      return { from: w.start, to: w.end, all: false };
    }
  }
}

/** 빠른 선택 체크박스 (라디오처럼 하나만 활성) */
export const DATE_PRESET_CHECKS = [
  ["all", "전체 주문건"],
  ["today", "오늘 주문건"],
  ["yesterday", "어제 주문건"],
  ["3days", "3일치 주문건"],
] as const;
