"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch, basePath } from "@/lib/api";
import { TODAY } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import type { Meta } from "@/lib/types";
import { api } from "@/lib/client-api";

type Health = {
  status: string;
  database: { connected: boolean; latencyMs: number; orderCount: number; version: string | null };
};

export default function SettingsPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);

  useEffect(() => {
    const c = new AbortController();
    apiFetch("/api/health", { signal: c.signal })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body?.error ?? "헬스체크 실패");
        return body as Health;
      })
      .then(setHealth)
      .catch((e: Error) => !c.signal.aborted && setHealthError(e.message));

    api
      .meta(c.signal)
      .then(setMeta)
      .catch((e: unknown) => {
        // 코드 목록은 화면을 막지 않되, 원인 추적은 가능해야 한다.
        if (!c.signal.aborted) console.warn("[settings] meta 조회 실패:", e);
      });

    return () => c.abort();
  }, []);

  return (
    <AppShell title="설정" breadcrumb={["대시보드", "설정"]}>
      <section className="trend-card">
        <div className="trend-head">
          <h3>시스템 상태</h3>
        </div>
        <dl className="info-list cols-3">
          <div>
            <dt>데이터베이스</dt>
            <dd>
              {healthError ? (
                <span className="pill st-취소">연결 실패</span>
              ) : health ? (
                <span className="pill st-배송완료">연결됨</span>
              ) : (
                "확인 중…"
              )}
            </dd>
          </div>
          <div>
            <dt>응답 시간</dt>
            <dd className="mono">{health ? `${health.database.latencyMs}ms` : "-"}</dd>
          </div>
          <div>
            <dt>PostgreSQL</dt>
            <dd className="mono">{health?.database.version ?? "-"}</dd>
          </div>
          <div>
            <dt>등록된 주문</dt>
            <dd className="mono">{health ? `${health.database.orderCount}건` : "-"}</dd>
          </div>
          <div>
            <dt>기준일 (TODAY)</dt>
            <dd className="mono">{fmtDate(TODAY)}</dd>
          </div>
          <div>
            <dt>Base path</dt>
            <dd className="mono">{basePath || "(없음)"}</dd>
          </div>
        </dl>
        {healthError ? <p className="form-error">{healthError}</p> : null}
      </section>

      <section className="breakdown-card">
        <div className="trend-head">
          <h3>코드 정의</h3>
          <span className="total">DB 의 코드 테이블에서 읽어옵니다</span>
        </div>
        <div className="code-groups">
          <div>
            <h4>진행 상태 ({meta?.orderStatuses.length ?? 0})</h4>
            <div className="chips">
              {meta?.orderStatuses.map((s) => (
                <span key={s.code} className={`pill st-${s.code}`}>
                  {s.code}
                  {s.isActiveStage ? " · 진행중" : ""}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4>결제 상태 ({meta?.paymentStatuses.length ?? 0})</h4>
            <div className="chips">
              {meta?.paymentStatuses.map((p) => (
                <span key={p.code} className={`pill pay-${p.code}`}>
                  {p.code}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4>택배사 ({meta?.couriers.length ?? 0})</h4>
            <div className="chips">
              {meta?.couriers.map((c) => (
                <span key={c.id} className="pill inv-no">
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
