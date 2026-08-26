"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/client-api";
import { TODAY } from "@/lib/constants";
import { num, won } from "@/lib/format";
import type { Product, StatusCountRow, SummaryStats } from "@/lib/types";

type Trend = { month: string; orderCount: number; totalAmount: number };

export default function DashboardPage() {
  const toast = useToast();
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [chips, setChips] = useState<{ total: number; byStatus: StatusCountRow[] } | null>(null);
  const [trend, setTrend] = useState<Trend[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const c = new AbortController();
    Promise.all([
      api.summary(TODAY, c.signal).then(setSummary),
      api.chips(c.signal).then(setChips),
      api.trend(12, c.signal).then(setTrend),
      api.products(c.signal).then(setProducts),
    ]).catch((e: Error) => {
      if (!c.signal.aborted) toast(e.message, "error");
    });
    return () => c.abort();
  }, [toast]);

  const maxCount = Math.max(1, ...trend.map((t) => t.orderCount));
  const topProducts = [...products].sort((a, b) => b.orderCount - a.orderCount).slice(0, 6);

  return (
    <AppShell title="대시보드" breadcrumb={["대시보드"]}>
      <section className="stats">
        <div className="stat">
          <div className="label">
            <span className="dot" />
            전체 주문
          </div>
          <div className="value">
            {summary ? num(summary.totalOrders) : "-"} <small>건</small>
          </div>
        </div>
        <div className="stat">
          <div className="label">
            <span className="dot" />
            진행중
          </div>
          <div className="value">
            {summary ? num(summary.activeOrders) : "-"} <small>건</small>
          </div>
        </div>
        <div className="stat">
          <div className="label">
            <span className="dot" />
            오늘 신규 주문
          </div>
          <div className="value">
            {summary ? num(summary.todayNewOrders) : "-"} <small>건</small>
          </div>
        </div>
        <div className="stat">
          <div className="label">
            <span className="dot" />
            총 주문 금액
          </div>
          <div className="value">{summary ? won(summary.totalAmount) : "-"}</div>
        </div>
      </section>

      <section className="trend-card">
        <div className="trend-head">
          <h3>월별 주문 추이</h3>
          <span className="total">최근 {trend.length}개월</span>
        </div>
        <div className="bar-chart">
          {trend.map((t) => (
            <div className="bar-col" key={t.month} title={`${t.month} · ${t.orderCount}건`}>
              <div className="bar-value mono">{t.orderCount}</div>
              <div
                className="bar"
                style={{ height: `${Math.round((t.orderCount / maxCount) * 100)}%` }}
              />
              <div className="bar-label mono">{t.month.slice(5)}월</div>
            </div>
          ))}
        </div>
      </section>

      <section className="breakdown-card">
        <div className="trend-head">
          <h3>진행 상태별 분포</h3>
          <span className="total">전체 {chips ? num(chips.total) : 0}건</span>
        </div>
        <div className="status-dist">
          {chips?.byStatus.map((s) => (
            <div className="dist-row" key={s.status}>
              <span className={`pill st-${s.status}`}>{s.status}</span>
              <div className="dist-track">
                <div
                  className="dist-fill"
                  style={{
                    width: `${chips.total ? (s.orderCount / chips.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="mono dist-count">{num(s.orderCount)}건</span>
            </div>
          ))}
        </div>
      </section>

      <section className="breakdown-card">
        <div className="trend-head">
          <h3>주문 많은 상품 TOP 6</h3>
        </div>
        <div className="breakdown-rows">
          {topProducts.map((p) => (
            <div className="breakdown-row static" key={p.id}>
              <span className="bd-name">{p.name}</span>
              <span className="bd-qty mono">{num(p.totalQuantity)}개</span>
              <span className="bd-amount mono">{won(p.totalAmount)}</span>
              <span className="bd-count mono">{num(p.orderCount)}건</span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
