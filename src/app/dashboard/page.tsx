"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/client-api";
import { TODAY } from "@/lib/constants";
import { fmtDate, num, won } from "@/lib/format";
import { PREP_STEPS, PREP_STEP_TOTAL } from "@/lib/prep-steps";
import type {
  DashboardData,
  Order,
  Product,
  StatusCountRow,
} from "@/lib/types";

/** "2026-08" → 이전/다음 달 */
function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 그 날짜의 요일 (0=일 ... 6=토) */
const weekday = (date: string) => new Date(date + "T00:00:00").getDay();

const CUR_MONTH = TODAY.slice(0, 7);

function weekTotals(
  daily: DashboardData["daily"],
  month: string,
): { orders: number; amount: number } | null {
  if (month !== CUR_MONTH) return null;
  const t = new Date(TODAY + "T00:00:00");
  const mon = new Date(t);
  mon.setDate(t.getDate() - ((t.getDay() + 6) % 7));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const inRange = daily.filter((d) => {
    const dd = new Date(d.date + "T00:00:00");
    return dd >= mon && dd <= sun;
  });
  return {
    orders: inRange.reduce((a, d) => a + d.orderCount, 0),
    amount: inRange.reduce((a, d) => a + d.totalAmount, 0),
  };
}

export default function DashboardPage() {
  const toast = useToast();
  const [month, setMonth] = useState(CUR_MONTH);
  const [data, setData] = useState<DashboardData | null>(null);
  const [chips, setChips] = useState<{ total: number; byStatus: StatusCountRow[] } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [recent, setRecent] = useState<Order[]>([]);

  useEffect(() => {
    const c = new AbortController();
    api
      .dashboard(month, TODAY, c.signal)
      .then(setData)
      .catch((e: Error) => {
        if (!c.signal.aborted) toast(e.message, "error");
      });
    return () => c.abort();
  }, [month, toast]);

  useEffect(() => {
    const c = new AbortController();
    Promise.all([
      api.chips(c.signal).then(setChips),
      api.products(c.signal).then(setProducts),
      api
        .listOrders({ sort: "orderDateDesc", pageSize: 6 }, c.signal)
        .then((r) => setRecent(r.items)),
    ]).catch(() => {});
    return () => c.abort();
  }, []);

  const daily = data?.daily ?? [];
  const maxDaily = Math.max(1, ...daily.map((d) => d.orderCount));
  const peak = daily.reduce(
    (best, d) => (d.totalAmount > best.totalAmount ? d : best),
    { date: "", totalAmount: 0, orderCount: 0, paidAmount: 0 },
  );
  const monthDays = daily.filter((d) => d.orderCount > 0).length || 1;

  // 이번 주(월~일, 오늘 포함) 매출 — 현재 달을 보고 있을 때만 의미 있음
  const week = weekTotals(daily, month);

  const todayRow = daily.find((d) => d.date === TODAY);

  const monthLabel = `${month.slice(0, 4)}년 ${Number(month.slice(5, 7))}월`;
  const activeStatuses =
    chips?.byStatus.filter(
      (s) => s.status !== "배송완료" && s.status !== "취소",
    ) ?? [];
  const activeMax = Math.max(1, ...activeStatuses.map((s) => s.orderCount));

  const prepReady = products.filter((p) => p.prepSteps.every((s) => s.done)).length;
  const prepByStep = PREP_STEPS.map((m) => ({
    ...m,
    doneCount: products.filter((p) => p.prepSteps.find((s) => s.code === m.code)?.done)
      .length,
  }));

  return (
    <AppShell title="대시보드" breadcrumb={["대시보드"]}>
      <div className="dash">
        {/* ── 상단: 월 요약 + 일별 차트 ─────────────────────────────── */}
        <div className="dash-top">
          <section className="card dash-month">
            <div className="dash-month-nav">
              <button
                type="button"
                aria-label="이전 달"
                onClick={() => setMonth((m) => shiftMonth(m, -1))}
              >
                ‹
              </button>
              <b>{monthLabel}</b>
              <button
                type="button"
                aria-label="다음 달"
                disabled={month >= CUR_MONTH}
                onClick={() => setMonth((m) => shiftMonth(m, 1))}
              >
                ›
              </button>
            </div>

            <div className="kpi-grid">
              <div className="kpi">
                <span className="kpi-label">주문 건수</span>
                <span className="kpi-val mono">{num(data?.monthOrders ?? 0)}<i>건</i></span>
              </div>
              <div className="kpi">
                <span className="kpi-label">결제완료 매출</span>
                <span className="kpi-val mono">{won(data?.monthPaidAmount ?? 0)}</span>
              </div>
              <div className="kpi">
                <span className="kpi-label">일평균 매출</span>
                <span className="kpi-val mono">
                  {won(Math.round((data?.monthAmount ?? 0) / monthDays))}
                </span>
              </div>
              <div className="kpi">
                <span className="kpi-label">최고 매출일</span>
                <span className="kpi-val mono sm">
                  {peak.date ? `${Number(peak.date.slice(8, 10))}일 · ${won(peak.totalAmount)}` : "-"}
                </span>
              </div>
            </div>

            <div className="kpi-sum">
              <span>{monthLabel} 매출 합계</span>
              <b className="mono">{won(data?.monthAmount ?? 0)}</b>
            </div>
            {month === CUR_MONTH ? (
              <div className="kpi-mini">
                <span>
                  오늘 <b className="mono">{num(todayRow?.orderCount ?? 0)}</b>건 ·{" "}
                  <b className="mono">{won(todayRow?.totalAmount ?? 0)}</b>
                </span>
                <span>
                  이번 주 <b className="mono">{num(week?.orders ?? 0)}</b>건 ·{" "}
                  <b className="mono">{won(week?.amount ?? 0)}</b>
                </span>
              </div>
            ) : null}
          </section>

          <section className="card dash-chart">
            <div className="card-head">
              <h3>{monthLabel} 일별 주문 현황</h3>
              <span className="muted">
                총 {num(data?.monthOrders ?? 0)}건 · {won(data?.monthAmount ?? 0)}
              </span>
            </div>
            <div className="day-chart">
              {daily.map((d) => {
                const wd = weekday(d.date);
                const isToday = d.date === TODAY;
                return (
                  <div
                    key={d.date}
                    className={`day-col${isToday ? " today" : ""}`}
                    title={`${fmtDate(d.date)} · ${d.orderCount}건 · ${won(d.totalAmount)}`}
                  >
                    <div className="day-bar-wrap">
                      <span
                        className="day-bar"
                        style={{ height: `${Math.round((d.orderCount / maxDaily) * 100)}%` }}
                      />
                    </div>
                    <span
                      className={`day-x${wd === 0 ? " sun" : wd === 6 ? " sat" : ""}${
                        isToday ? " today" : ""
                      }`}
                    >
                      {isToday ? "오늘" : Number(d.date.slice(8, 10))}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── 하단: 4개 카드 ────────────────────────────────────────── */}
        <div className="dash-row4">
          <section className="card">
            <div className="card-head">
              <h3>주문 상태 현황</h3>
            </div>
            <div className="bignum-row">
              <div className="bignum">
                <b className="mono">{num(data?.activeOrders ?? 0)}</b>
                <span>진행중</span>
              </div>
              <div className="bignum">
                <b className="mono">{num(data?.doneOrders ?? 0)}</b>
                <span>배송완료</span>
              </div>
              <div className="bignum">
                <b className="mono">{num(data?.totalOrders ?? 0)}</b>
                <span>전체</span>
              </div>
            </div>
            <ul className="mini-bars">
              {activeStatuses.map((s) => (
                <li key={s.status}>
                  <span className={`pill pill-sm st-${s.status}`}>{s.status}</span>
                  <span className="mini-track">
                    <span
                      className="mini-fill"
                      style={{ width: `${(s.orderCount / activeMax) * 100}%` }}
                    />
                  </span>
                  <span className="mono mini-n">{num(s.orderCount)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <div className="card-head">
              <h3>고객 현황</h3>
              <span className="muted">누적 {num(data?.totalCustomers ?? 0)}명</span>
            </div>
            <div className="cust-hero">
              <b className="mono">{num(data?.activeCustomers ?? 0)}</b>
              <span>명 진행중</span>
            </div>
            <span className="cust-track">
              <span
                className="cust-fill"
                style={{
                  width: `${
                    data && data.totalCustomers
                      ? (data.activeCustomers / data.totalCustomers) * 100
                      : 0
                  }%`,
                }}
              />
            </span>
            <ul className="cust-legend">
              <li>
                <span className="dot ok" /> 진행중 주문 보유
                <b className="mono">{num(data?.activeCustomers ?? 0)}명</b>
              </li>
              <li>
                <span className="dot new" /> 이번 달 신규
                <b className="mono">{num(data?.newCustomers ?? 0)}명</b>
              </li>
              <li>
                <span className="dot" /> 전체 누적
                <b className="mono">{num(data?.totalCustomers ?? 0)}명</b>
              </li>
            </ul>
          </section>

          <section className="card">
            <div className="card-head">
              <h3>최근 주문</h3>
              <span className="muted">{recent.length}건</span>
            </div>
            <ul className="recent-list">
              {recent.map((o) => (
                <li key={o.id}>
                  <span className="recent-dot" />
                  <div className="recent-body">
                    <span className="recent-when mono">{fmtDate(o.orderDate)}</span>
                    <span className="recent-main">
                      <b>{o.customerName}</b> · {o.productName}
                    </span>
                    <span className="recent-tags">
                      <span className={`pill pill-sm st-${o.orderStatus}`}>{o.orderStatus}</span>
                      <span className={`pill pill-sm pay-${o.paymentStatus}`}>
                        {o.paymentStatus.replace(/^결제/, "")}
                      </span>
                    </span>
                  </div>
                </li>
              ))}
              {recent.length === 0 ? <li className="muted">최근 주문이 없어요</li> : null}
            </ul>
          </section>

          <section className="card">
            <div className="card-head">
              <h3>상품 출시 준비</h3>
              <span className="muted">
                준비완료 {prepReady} / {products.length}
              </span>
            </div>
            <ul className="mini-bars">
              {prepByStep.map((m) => (
                <li key={m.code}>
                  <span className="prep-step-tag">
                    {m.order}. {m.label}
                  </span>
                  <span className="mini-track">
                    <span
                      className="mini-fill green"
                      style={{
                        width: `${
                          products.length ? (m.doneCount / products.length) * 100 : 0
                        }%`,
                      }}
                    />
                  </span>
                  <span className="mono mini-n">
                    {m.doneCount}/{products.length}
                  </span>
                </li>
              ))}
            </ul>
            <p className="muted prep-foot">
              단계 총 {PREP_STEP_TOTAL}개 · 전 상품 완료 시 출시 준비 완료
            </p>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
