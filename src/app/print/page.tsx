"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { FolderIcon, ProductThumb, SearchIcon } from "@/components/icons";
import { PrintWorkModal } from "@/components/print/PrintWorkModal";
import { useToast } from "@/components/Toast";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useDebounced } from "@/hooks/useDebounced";
import { api } from "@/lib/client-api";
import { TODAY } from "@/lib/constants";
import { resolveDateRange, type DatePreset } from "@/lib/date-range";
import { fmtDate, num } from "@/lib/format";
import type { Order, Paged, StatusCountRow } from "@/lib/types";

/** 요약 타일 = 진행상태 묶음. 클릭하면 그 묶음으로 상태 필터가 걸린다. */
const TILES = [
  { key: "초안 대기", statuses: ["주문완료", "초안등록"] },
  { key: "고객확정 완료", statuses: ["고객확정완료"] },
  { key: "외주 발주", statuses: ["외주발주"] },
  { key: "인쇄팀 전달", statuses: ["인쇄팀전달"] },
] as const;

const STATUS_OPTIONS = [
  "주문완료",
  "초안등록",
  "고객확정완료",
  "외주발주",
  "인쇄팀전달",
  "인쇄완료",
  "취소",
] as const;
const METHOD_OPTIONS = ["내부디지털", "5층인쇄", "외부생산"] as const;
const SEARCH_TYPES = [
  { value: "order_no", label: "주문번호" },
  { value: "member", label: "회원ID" },
  { value: "phone", label: "전화번호" },
  { value: "product", label: "상품명" },
] as const;

export default function PrintPage() {
  const toast = useToast();
  const onError = useCallback((m: string) => toast(m, "error"), [toast]);

  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateAnchor, setDateAnchor] = useState(TODAY);
  const dateRange = useMemo(
    () => resolveDateRange(datePreset, dateAnchor),
    [datePreset, dateAnchor],
  );
  const [statuses, setStatuses] = useState<Set<string>>(new Set());
  const [methods, setMethods] = useState<Set<string>>(new Set());
  const [searchType, setSearchType] = useState<string>("order_no");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput, 300);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [chips, setChips] = useState<StatusCountRow[] | null>(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    const c = new AbortController();
    api
      .chips(c.signal)
      .then((r) => setChips(r.byStatus))
      .catch(() => {});
    return () => c.abort();
  }, [refreshKey]);

  const countOf = (list: readonly string[]) =>
    list.reduce(
      (sum, s) => sum + (chips?.find((c) => c.status === s)?.orderCount ?? 0),
      0,
    );

  /** 타일 클릭 → 해당 상태 묶음으로 필터 (이미 그 묶음이면 해제) */
  const pickTile = (group: readonly string[]) => {
    const isActive =
      statuses.size === group.length && group.every((s) => statuses.has(s));
    setStatuses(isActive ? new Set() : new Set(group));
    setPage(1);
  };

  const toggleIn = (set: Set<string>, setter: (s: Set<string>) => void, v: string) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setter(next);
    setPage(1);
  };

  const fetcher = useCallback(
    (signal: AbortSignal) =>
      api.print(
        {
          statuses: statuses.size ? [...statuses].join(",") : undefined,
          methods: methods.size ? [...methods].join(",") : undefined,
          search: search || undefined,
          searchType: search ? searchType : undefined,
          dateFrom: dateRange.all ? undefined : dateRange.from,
          dateTo: dateRange.all ? undefined : dateRange.to,
          page,
          pageSize: 20,
        },
        signal,
      ),
    [statuses, methods, search, searchType, dateRange, page],
  );
  const { data, error, loading } = useAsyncData<Paged<Order>>(
    `${[...statuses]}|${[...methods]}|${search}|${searchType}|${JSON.stringify(dateRange)}|${page}|${refreshKey}`,
    fetcher,
  );

  useEffect(() => {
    if (error) onError(error);
  }, [error, onError]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const pageIds = items.map((o) => o.id);
  const selSet = useMemo(() => new Set(selected), [selected]);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selSet.has(id));
  const someChecked = pageIds.some((id) => selSet.has(id));
  const selAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selAllRef.current) selAllRef.current.indeterminate = !allChecked && someChecked;
  }, [allChecked, someChecked]);

  async function markPrinted() {
    if (selected.length === 0) return;
    setBusy(true);
    try {
      for (const id of selected) await api.updateStatus(id, "인쇄완료");
      toast(`${selected.length}건 인쇄완료 처리했어요`);
      setSelected([]);
      refresh();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="인쇄작업" breadcrumb={["대시보드", "인쇄작업"]}>
      <p className="page-sub">
        초안 미리보기 업로드 · 원본 작업 파일(구글 드라이브 링크) 등록 — 초안/인쇄 준비 통합 큐
      </p>

      <div className="ship-tiles cols-4">
        {TILES.map((t) => {
          const active =
            statuses.size === t.statuses.length &&
            t.statuses.every((s) => statuses.has(s));
          return (
            <button
              key={t.key}
              type="button"
              className={`ship-tile${active ? " active" : ""}`}
              onClick={() => pickTile(t.statuses)}
            >
              <span className="label">{t.key}</span>
              <span className="value mono">{num(countOf(t.statuses))}</span>
            </button>
          );
        })}
      </div>

      <div className="toolbar toolbar-col">
        <div className="tbrow">
          <DateRangeFilter
            preset={datePreset}
            anchor={dateAnchor}
            onChange={(p, a) => {
              setDatePreset(p);
              setDateAnchor(a);
              setPage(1);
            }}
          />
        </div>

        <div className="tbrow">
          <span className="tbrow-label">진행상태</span>
          {STATUS_OPTIONS.map((s) => (
            <label key={s} className="date-check">
              <input
                type="checkbox"
                checked={statuses.has(s)}
                onChange={() => toggleIn(statuses, setStatuses, s)}
              />
              {s}
            </label>
          ))}
        </div>

        <div className="tbrow">
          <span className="tbrow-label">인쇄구분</span>
          {METHOD_OPTIONS.map((m) => (
            <label key={m} className="date-check">
              <input
                type="checkbox"
                checked={methods.has(m)}
                onChange={() => toggleIn(methods, setMethods, m)}
              />
              {m}
            </label>
          ))}
        </div>

        <div className="tbrow">
          <select
            className="tb-select"
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            aria-label="검색 대상"
          >
            {SEARCH_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <div className="toolbar-search">
            <SearchIcon />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              placeholder="검색어"
              aria-label="인쇄작업 검색"
            />
          </div>
        </div>
      </div>

      <div className="queue-head">
        <h3 className="section-title">작업 큐 ({num(total)}건)</h3>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={busy || selected.length === 0}
          onClick={markPrinted}
        >
          선택 항목 인쇄완료 처리 {selected.length > 0 ? `(${selected.length})` : ""}
        </button>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th className="checkbox-col">
                  <input
                    ref={selAllRef}
                    type="checkbox"
                    aria-label="현재 페이지 전체 선택"
                    checked={allChecked}
                    onChange={(e) =>
                      setSelected((prev) =>
                        e.target.checked
                          ? [...new Set([...prev, ...pageIds])]
                          : prev.filter((id) => !pageIds.includes(id)),
                      )
                    }
                  />
                </th>
                <th>구분</th>
                <th>주문번호</th>
                <th>품목코드</th>
                <th className="col-l">상품명</th>
                <th className="num">수량</th>
                <th>인쇄구분</th>
                <th>주문자</th>
                <th>주문일</th>
                <th className="num">초안</th>
                <th>상태</th>
                <th>원본링크</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={13}>
                    <div className="empty">불러오는 중…</div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={13}>
                    <div className="empty">
                      <div className="big">조건에 맞는 작업이 없어요</div>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((o) => {
                  const checked = selSet.has(o.id);
                  return (
                    <tr key={o.id} className={checked ? "is-selected" : undefined}>
                      <td className="checkbox-col">
                        <input
                          type="checkbox"
                          className="row-check"
                          checked={checked}
                          aria-label={`${o.orderNo} 선택`}
                          onChange={(e) =>
                            setSelected((prev) =>
                              e.target.checked
                                ? [...prev, o.id]
                                : prev.filter((id) => id !== o.id),
                            )
                          }
                        />
                      </td>
                      <td>
                        <span className={`pill ${o.withInvitation ? "inv-yes" : "inv-no"}`}>
                          {o.withInvitation ? "청첩장주문" : "부가상품"}
                        </span>
                      </td>
                      <td className="mono">{o.orderNoShort}</td>
                      <td>
                        <span className="item-code">{o.productCode}</span>
                      </td>
                      <td className="col-l">
                        <div className="product">
                          <ProductThumb
                            name={o.productName}
                            slug={o.productSlug}
                            iconPath={o.productIconPath}
                            linkUrl={o.productLinkUrl}
                          />
                          <div className="product-text">
                            <span className="name">{o.productName}</span>
                            {o.optionText ? <span className="opt">{o.optionText}</span> : null}
                          </div>
                        </div>
                      </td>
                      <td className="num mono">{num(o.quantity)}</td>
                      <td>
                        <span className={`pill pm-${o.printMethod ?? "내부디지털"}`}>
                          {o.printMethod ?? "내부디지털"}
                        </span>
                      </td>
                      <td>{o.customerName}</td>
                      <td className="mono">{fmtDate(o.orderDate)}</td>
                      <td className="num mono">
                        {o.draftCount ? (
                          <span className="draft-count">
                            <FolderIcon /> {o.draftCount}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <span className={`pill st-${o.orderStatus}`}>{o.orderStatus}</span>
                      </td>
                      <td>
                        {o.sourceLinks && o.sourceLinks.trim() ? (
                          <span className="pill pm-외부생산">등록</span>
                        ) : (
                          <span className="req-empty">미등록</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setActiveId(o.id)}
                        >
                          작업
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="table-foot">
          <span className="foot-info">전체 {num(total)}건</span>
          <div className="pagination">
            <button
              type="button"
              className="page-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹
            </button>
            <span className="page-btn active">{page}</span>
            <button
              type="button"
              className="page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <PrintWorkModal
        key={activeId ?? "none"}
        orderId={activeId}
        onClose={() => setActiveId(null)}
        onChanged={refresh}
        onError={onError}
      />
    </AppShell>
  );
}
