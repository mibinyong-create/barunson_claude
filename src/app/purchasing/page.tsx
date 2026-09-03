"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { ProductThumb, SearchIcon } from "@/components/icons";
import { PurchaseOrderModal } from "@/components/purchasing/PurchaseOrderModal";
import { VendorInfoModal } from "@/components/purchasing/VendorInfoModal";
import { useToast } from "@/components/Toast";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useDebounced } from "@/hooks/useDebounced";
import { api } from "@/lib/client-api";
import { TODAY } from "@/lib/constants";
import { resolveDateRange, type DatePreset } from "@/lib/date-range";
import { fmtDate, num, trackingUrl, won } from "@/lib/format";
import type {
  CourierMeta,
  Paged,
  PurchaseOrderInput,
  PurchasingRow,
  VendorMeta,
} from "@/lib/types";

const STAGES = [
  { key: "미등록", label: "미등록" },
  { key: "발주", label: "발주 진행" },
  { key: "입고완료", label: "입고완료" },
  { key: "전체", label: "전체" },
] as const;

type ListResp = Paged<PurchasingRow> & {
  counts?: { unregistered: number; ordering: number; received: number };
};

export default function PurchasingPage() {
  const toast = useToast();
  const [stage, setStage] = useState<string>("발주");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput, 300);
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateAnchor, setDateAnchor] = useState(TODAY);
  const dateRange = useMemo(
    () => resolveDateRange(datePreset, dateAnchor),
    [datePreset, dateAnchor],
  );
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [active, setActive] = useState<PurchasingRow | null>(null);
  const [vendorInfo, setVendorInfo] = useState<PurchasingRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState<ListResp["counts"] | null>(null);
  const [vendors, setVendors] = useState<VendorMeta[]>([]);
  const [couriers, setCouriers] = useState<CourierMeta[]>([]);

  const onError = useCallback((m: string) => toast(m, "error"), [toast]);

  useEffect(() => {
    const c = new AbortController();
    api
      .meta(c.signal)
      .then((m) => {
        setVendors(m.vendors);
        setCouriers(m.couriers);
      })
      .catch(() => {});
    return () => c.abort();
  }, []);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const pickStage = useCallback((s: string) => {
    setStage(s);
    setPage(1);
  }, []);
  const changeDate = useCallback((p: DatePreset, a: string) => {
    setDatePreset(p);
    setDateAnchor(a);
    setPage(1);
  }, []);

  const fetcher = useCallback(
    (signal: AbortSignal) =>
      api.purchasing(
        {
          stage,
          search: search || undefined,
          dateFrom: dateRange.all ? undefined : dateRange.from,
          dateTo: dateRange.all ? undefined : dateRange.to,
          page,
          pageSize: 20,
        },
        signal,
      ),
    [stage, search, dateRange, page],
  );
  const { data, error, loading } = useAsyncData<ListResp>(
    `${stage}|${search}|${JSON.stringify(dateRange)}|${page}|${refreshKey}`,
    fetcher,
  );

  useEffect(() => {
    if (error) onError(error);
  }, [error, onError]);

  // 집계는 필터와 무관한 전체 기준 → 별도로 조회 (목록 리로드마다 깜빡이지 않게)
  useEffect(() => {
    const c = new AbortController();
    api
      .purchasing({ stage: "전체", pageSize: 1, withCounts: 1 }, c.signal)
      .then((r) => {
        if (r.counts) setCounts(r.counts);
      })
      .catch(() => {});
    return () => c.abort();
  }, [refreshKey]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const tiles = [
    { key: "미등록", label: "발주 미등록", value: counts?.unregistered ?? 0 },
    { key: "발주", label: "발주 진행중", value: counts?.ordering ?? 0 },
    { key: "입고완료", label: "입고완료", value: counts?.received ?? 0 },
  ];

  async function handleSave(
    body: PurchaseOrderInput,
    advanceStatus: boolean,
  ): Promise<boolean> {
    if (!active) return false;
    setBusy(true);
    try {
      await api.savePurchaseOrder(active.orderId, body);
      if (advanceStatus) await api.updateStatus(active.orderId, "인쇄팀전달");
      toast("발주 내용을 저장했어요");
      refresh();
      return true;
    } catch (e) {
      onError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(): Promise<boolean> {
    if (!active) return false;
    setBusy(true);
    try {
      await api.deletePurchaseOrder(active.orderId);
      toast("발주 기록을 삭제했어요");
      refresh();
      return true;
    } catch (e) {
      onError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="발주관리" breadcrumb={["대시보드", "발주관리"]}>
      <div className="ship-tiles">
        {tiles.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`ship-tile${stage === t.key ? " active" : ""}`}
            onClick={() => pickStage(t.key)}
          >
            <span className="label">{t.label}</span>
            <span className="value mono">{num(t.value)}</span>
          </button>
        ))}
      </div>

      <div className="toolbar">
        <DateRangeFilter preset={datePreset} anchor={dateAnchor} onChange={changeDate} />
        <div className="chips">
          {STAGES.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`chip${stage === s.key ? " active" : ""}`}
              onClick={() => pickStage(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="toolbar-search">
          <SearchIcon />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="주문번호, 주문자, 상품명, 업체명으로 검색"
            aria-label="발주 검색"
          />
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>주문번호</th>
                <th>주문자</th>
                <th>상품</th>
                <th className="num">주문수량</th>
                <th>외주 업체</th>
                <th>발주일</th>
                <th>업체 출고일</th>
                <th>택배사</th>
                <th>운송장번호</th>
                <th className="num">발주 금액</th>
                <th>발주 상태</th>
                <th>메모</th>
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
                      <div className="big">해당하는 발주건이 없어요</div>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((r) => {
                  const po = r.po;
                  const amount =
                    po && po.unitCost != null && po.quantity != null
                      ? po.unitCost * po.quantity
                      : null;
                  const inUrl = trackingUrl(po?.trackingUrlTemplate, po?.trackingNumber);
                  return (
                    <tr key={r.orderId}>
                      <td className="mono">{r.orderNoShort}</td>
                      <td>{r.customerName}</td>
                      <td>
                        <div className="product">
                          <ProductThumb
                            name={r.productName}
                            slug={r.productSlug}
                            iconPath={r.productIconPath}
                            linkUrl={r.productLinkUrl}
                          />
                          <div className="product-text">
                            <span className="name">{r.productName}</span>
                            {r.optionText ? <span className="opt">{r.optionText}</span> : null}
                          </div>
                        </div>
                      </td>
                      <td className="num mono">{num(r.orderQuantity)}</td>
                      <td>
                        {po ? (
                          <button
                            type="button"
                            className="order-link"
                            onClick={() => setVendorInfo(r)}
                          >
                            {po.vendorName}
                          </button>
                        ) : (
                          <span className="req-empty">미등록</span>
                        )}
                      </td>
                      <td className="mono">{fmtDate(po?.orderedDate ?? null)}</td>
                      <td className="mono">{fmtDate(po?.vendorShippedDate ?? null)}</td>
                      <td>{po?.courierName || <span className="req-empty">-</span>}</td>
                      <td className="mono">
                        {inUrl ? (
                          <a
                            href={inUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="order-link"
                          >
                            {po?.trackingNumber}
                          </a>
                        ) : po?.trackingNumber ? (
                          po.trackingNumber
                        ) : (
                          <span className="req-empty">-</span>
                        )}
                      </td>
                      <td className="num mono">{amount != null ? won(amount) : "-"}</td>
                      <td>
                        {po ? (
                          <span className={`pill po-${po.status}`}>{po.status}</span>
                        ) : (
                          <span className="pill inv-no">외주발주</span>
                        )}
                      </td>
                      <td className="col-l">
                        <span className="clip-text" title={po?.note ?? ""}>
                          {po?.note || "-"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setActive(r)}
                        >
                          {po ? "수정" : "발주 등록"}
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

      <PurchaseOrderModal
        key={active?.orderId ?? "none"}
        row={active}
        vendors={vendors}
        couriers={couriers}
        busy={busy}
        onClose={() => setActive(null)}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <VendorInfoModal
        row={vendorInfo}
        vendors={vendors}
        onClose={() => setVendorInfo(null)}
      />
    </AppShell>
  );
}
