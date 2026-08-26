"use client";

import { useEffect, useState } from "react";
import { CalendarIcon, ProductThumb } from "@/components/icons";
import { api } from "@/lib/client-api";
import { fmtDate, num, won } from "@/lib/format";
import type { BreakdownRow, SummaryStats } from "@/lib/types";

type QuickRow = { status: string; orderCount: number; isQuickTile: boolean };

export function SummaryView({
  today,
  productFilter,
  onPickProduct,
  onPickStatusTile,
  onError,
  refreshKey,
}: {
  today: string;
  productFilter: number | null;
  onPickProduct: (productId: number) => void;
  onPickStatusTile: (status: string, date: string) => void;
  onError: (message: string) => void;
  refreshKey: number;
}) {
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [period, setPeriod] = useState<"day" | "week">("day");
  const [breakdown, setBreakdown] = useState<{
    rows: BreakdownRow[];
    from: string;
    to: string;
  } | null>(null);
  const [quickDate, setQuickDate] = useState(today);
  const [quick, setQuick] = useState<QuickRow[]>([]);

  useEffect(() => {
    const c = new AbortController();
    api
      .summary(today, c.signal)
      .then(setSummary)
      .catch((e: Error) => !c.signal.aborted && onError(e.message));
    return () => c.abort();
  }, [today, onError, refreshKey]);

  useEffect(() => {
    const c = new AbortController();
    api
      .breakdown(today, period, c.signal)
      .then(setBreakdown)
      .catch((e: Error) => !c.signal.aborted && onError(e.message));
    return () => c.abort();
  }, [today, period, onError, refreshKey]);

  useEffect(() => {
    const c = new AbortController();
    api
      .quick(quickDate, c.signal)
      .then(setQuick)
      .catch((e: Error) => !c.signal.aborted && onError(e.message));
    return () => c.abort();
  }, [quickDate, onError, refreshKey]);

  const breakdownTotal = breakdown?.rows.reduce((a, r) => a + r.orderCount, 0) ?? 0;
  const quickTiles = quick.filter((q) => q.isQuickTile);

  return (
    <>
      <section className="stats">
        <Stat label="전체 주문" value={summary?.totalOrders} unit="건" />
        <Stat label="진행중" value={summary?.activeOrders} unit="건" />
        <Stat label="오늘 신규 주문" value={summary?.todayNewOrders} unit="건" />
        <Stat label="총 주문 금액" money={summary?.totalAmount} />
      </section>

      <section className="breakdown-card">
        <div className="trend-head">
          <h3>
            품목별 주문 현황{" "}
            <span className="total">
              {period === "day"
                ? fmtDate(today)
                : `${fmtDate(breakdown?.from ?? today)} ~ ${fmtDate(breakdown?.to ?? today)}`}{" "}
              · {breakdownTotal}건
            </span>
          </h3>
          <div className="seg">
            <button
              type="button"
              className={`seg-btn${period === "day" ? " active" : ""}`}
              onClick={() => setPeriod("day")}
            >
              일일
            </button>
            <button
              type="button"
              className={`seg-btn${period === "week" ? " active" : ""}`}
              onClick={() => setPeriod("week")}
            >
              주간
            </button>
          </div>
        </div>

        <div className="breakdown-rows">
          {breakdown && breakdown.rows.length > 0 ? (
            breakdown.rows.map((r) => (
              <button
                type="button"
                key={r.productId}
                className={`breakdown-row${productFilter === r.productId ? " active" : ""}`}
                onClick={() => onPickProduct(r.productId)}
              >
                <span className="bd-thumb">
                  <ProductThumb name={r.productName} iconPath={r.iconPath} linkUrl={null} />
                </span>
                <span className="bd-name">{r.productName}</span>
                <span className="bd-qty mono">{num(r.totalQuantity)}개</span>
                <span className="bd-amount mono">{won(r.totalAmount)}</span>
                <span className="bd-count mono">{r.orderCount}건</span>
              </button>
            ))
          ) : (
            <div className="empty">
              <div className="big">해당 기간의 주문이 없어요</div>
              일일/주간 토글이나 기준일을 바꿔보세요.
            </div>
          )}
        </div>
      </section>

      <section className="trend-card">
        <div className="trend-head">
          <h3>진행상태별 건수</h3>
          <div className="date-picker">
            <CalendarIcon />
            <input
              type="date"
              value={quickDate}
              onChange={(e) => setQuickDate(e.target.value)}
              aria-label="진행상태별 건수 기준일"
            />
          </div>
        </div>
        <div className="quick-stats">
          {quickTiles.map((q) => (
            <button
              type="button"
              key={q.status}
              className="quick-tile"
              onClick={() => onPickStatusTile(q.status, quickDate)}
            >
              <span className={`pill st-${q.status}`}>{q.status}</span>
              <b className="mono">{q.orderCount}</b>
              <small>건</small>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function Stat({
  label,
  value,
  unit,
  money,
}: {
  label: string;
  value?: number;
  unit?: string;
  money?: number;
}) {
  return (
    <div className="stat">
      <div className="label">
        <span className="dot" />
        {label}
      </div>
      <div className="value">
        {money !== undefined ? (
          won(money)
        ) : (
          <>
            {value ?? "-"} <small>{unit}</small>
          </>
        )}
      </div>
    </div>
  );
}
