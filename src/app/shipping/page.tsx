"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { ProductThumb, SearchIcon } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { ShipmentModal, type ShipAction } from "@/components/shipping/ShipmentModal";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useDebounced } from "@/hooks/useDebounced";
import { api } from "@/lib/client-api";
import { TODAY } from "@/lib/constants";
import { resolveDateRange, type DatePreset } from "@/lib/date-range";
import { fmtDate, num, trackingUrl } from "@/lib/format";
import type { Meta, Order, Paged, StatusCountRow } from "@/lib/types";

const STAGES = [
  { key: "대기", label: "출고 대기", status: "인쇄완료" },
  { key: "배송중", label: "배송중", status: "배송중" },
  { key: "배송완료", label: "배송완료", status: "배송완료" },
  { key: "전체", label: "전체", status: null },
] as const;

export default function ShippingPage() {
  const toast = useToast();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [stage, setStage] = useState<string>("대기");
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
  const [chips, setChips] = useState<{ byStatus: StatusCountRow[] } | null>(null);
  const [active, setActive] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);

  const onError = useCallback((m: string) => toast(m, "error"), [toast]);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    const c = new AbortController();
    api.meta(c.signal).then(setMeta).catch((e: Error) => {
      if (!c.signal.aborted) onError(e.message);
    });
    return () => c.abort();
  }, [onError]);

  useEffect(() => {
    const c = new AbortController();
    api
      .chips(c.signal)
      .then((r) => setChips({ byStatus: r.byStatus }))
      .catch(() => {});
    return () => c.abort();
  }, [refreshKey]);

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
      api.shipping(
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
  const { data, error, loading } = useAsyncData<Paged<Order>>(
    `${stage}|${search}|${JSON.stringify(dateRange)}|${page}|${refreshKey}`,
    fetcher,
  );

  useEffect(() => {
    if (error) onError(error);
  }, [error, onError]);

  const countOf = (s: string) =>
    chips?.byStatus.find((c) => c.status === s)?.orderCount ?? 0;

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  async function handleAction(action: ShipAction): Promise<boolean> {
    if (!active) return false;
    // delivered_date >= order_date CHECK 제약을 지키도록 기준일을 보정한다.
    const shipDate = TODAY < active.orderDate ? active.orderDate : TODAY;
    setBusy(true);
    try {
      if (action.type === "complete") {
        await api.updateCourier(active.id, {
          courierName: active.courierName,
          trackingNumber: active.trackingNumber,
          deliveredDate: shipDate,
          deliveryMethod: active.deliveryMethod,
          shippingAddress: active.shippingAddress,
        });
        await api.updateStatus(active.id, "배송완료");
        toast("배송 완료로 처리했어요");
      } else if (action.type === "dispatch") {
        await api.updateCourier(active.id, {
          courierName: action.courierName,
          trackingNumber: action.trackingNumber,
          deliveredDate: active.deliveryMethod === "방문수령" ? shipDate : active.deliveredDate,
          dispatchedDate: shipDate,
          deliveryMethod: active.deliveryMethod,
          shippingAddress: active.shippingAddress,
        });
        await api.updateStatus(
          active.id,
          active.deliveryMethod === "방문수령" ? "배송완료" : "배송중",
        );
        toast(active.deliveryMethod === "방문수령" ? "수령 완료로 처리했어요" : "출고 처리했어요");
      } else {
        await api.updateCourier(active.id, {
          courierName: action.courierName,
          trackingNumber: action.trackingNumber,
          deliveredDate: active.deliveredDate,
          deliveryMethod: active.deliveryMethod,
          shippingAddress: active.shippingAddress,
        });
        toast("택배 정보를 저장했어요");
      }
      refresh();
      return true;
    } catch (e) {
      onError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const tiles = useMemo(
    () => [
      { label: "출고 대기", value: countOf("인쇄완료"), stage: "대기" },
      { label: "배송중", value: countOf("배송중"), stage: "배송중" },
      { label: "배송완료", value: countOf("배송완료"), stage: "배송완료" },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chips],
  );

  return (
    <AppShell title="출고관리" breadcrumb={["대시보드", "출고관리"]}>
      <div className="ship-tiles">
        {tiles.map((t) => (
          <button
            key={t.stage}
            type="button"
            className={`ship-tile${stage === t.stage ? " active" : ""}`}
            onClick={() => pickStage(t.stage)}
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
            placeholder="주문번호, 주문자, 연락처, 상품명으로 검색"
            aria-label="출고 검색"
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
                <th>연락처</th>
                <th>배송지</th>
                <th>상품</th>
                <th className="num">수량</th>
                <th>택배사</th>
                <th>운송장번호</th>
                <th>출고일</th>
                <th>배송완료일</th>
                <th>진행상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={12}>
                    <div className="empty">불러오는 중…</div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={12}>
                    <div className="empty">
                      <div className="big">해당 단계의 주문이 없어요</div>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((o) => {
                  const url = trackingUrl(o.trackingUrlTemplate, o.trackingNumber);
                  return (
                    <tr key={o.id}>
                      <td className="mono">{o.orderNoShort}</td>
                      <td>{o.customerName}</td>
                      <td className="mono">{o.customerPhone || "-"}</td>
                      <td className="col-l">
                        <span className="clip-text" title={o.shippingAddress ?? ""}>
                          {o.deliveryMethod === "방문수령"
                            ? "방문수령"
                            : o.shippingAddress || o.customerAddress || "-"}
                        </span>
                      </td>
                      <td>
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
                        {o.deliveryMethod === "방문수령" ? (
                          <span className="req-empty">방문수령</span>
                        ) : (
                          o.courierName || <span className="req-empty">미지정</span>
                        )}
                      </td>
                      <td className="mono">
                        {url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" className="order-link">
                            {o.trackingNumber}
                          </a>
                        ) : o.trackingNumber ? (
                          o.trackingNumber
                        ) : (
                          <span className="req-empty">
                            {o.deliveryMethod === "방문수령" ? "—" : "출고 전"}
                          </span>
                        )}
                      </td>
                      <td className="mono">
                        {o.dispatchedDate ? (
                          fmtDate(o.dispatchedDate)
                        ) : (
                          <span className="req-empty">출고 전</span>
                        )}
                      </td>
                      <td className="mono">
                        {o.deliveredDate ? (
                          fmtDate(o.deliveredDate)
                        ) : (
                          <span className="req-empty">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`pill st-${o.orderStatus}`}>{o.orderStatus}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setActive(o)}
                        >
                          {o.orderStatus === "인쇄완료"
                            ? o.deliveryMethod === "방문수령"
                              ? "수령 처리"
                              : "출고"
                            : o.orderStatus === "배송중"
                              ? "배송완료"
                              : "상세"}
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

      {meta ? (
        <ShipmentModal
          order={active}
          meta={meta}
          busy={busy}
          onClose={() => setActive(null)}
          onAction={handleAction}
        />
      ) : null}
    </AppShell>
  );
}
