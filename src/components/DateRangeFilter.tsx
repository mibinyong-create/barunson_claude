"use client";

import { fmtDate } from "@/lib/format";
import {
  DATE_PRESET_CHECKS,
  resolveDateRange,
  type DatePreset,
} from "@/lib/date-range";
import { CalendarIcon } from "./icons";

/**
 * 목록 툴바 맨 앞에 놓는 날짜 필터.
 * 날짜를 고르면 그 주(월~일) 단위로 조회하고, 빠른 체크박스로 오늘/어제/3일치/전체를 고른다.
 */
export function DateRangeFilter({
  preset,
  anchor,
  onChange,
}: {
  preset: DatePreset;
  anchor: string;
  onChange: (preset: DatePreset, anchor: string) => void;
}) {
  const range = resolveDateRange(preset, anchor);

  return (
    <div className="date-filter">
      <div
        className={`date-picker${preset === "all" ? " disabled" : ""}`}
        title="날짜를 고르면 그 주(월~일) 주문을 조회합니다"
      >
        <CalendarIcon />
        <input
          type="date"
          value={range.from ?? anchor}
          disabled={preset === "all"}
          onChange={(e) => {
            if (e.target.value) onChange("week", e.target.value);
          }}
          aria-label="주문일자(주간) 필터"
        />
      </div>

      {!range.all && range.from ? (
        <span className="date-range-label">
          {fmtDate(range.from)}
          {range.to && range.to !== range.from ? ` ~ ${fmtDate(range.to)}` : ""}
          {preset === "week" ? " · 주간" : ""}
        </span>
      ) : null}

      {DATE_PRESET_CHECKS.map(([key, label]) => (
        <label key={key} className="date-check">
          <input
            type="checkbox"
            checked={preset === key}
            onChange={() => onChange(key, anchor)}
          />
          {label}
        </label>
      ))}
    </div>
  );
}
