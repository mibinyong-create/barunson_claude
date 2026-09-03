"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { FolderIcon, NoteIcon, PlusIcon, ProductThumb, SearchIcon } from "@/components/icons";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { useToast } from "@/components/Toast";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useDebounced } from "@/hooks/useDebounced";
import { api } from "@/lib/client-api";
import { SORT_OPTIONS, TODAY } from "@/lib/constants";
import { resolveDateRange, type DatePreset } from "@/lib/date-range";
import { fmtDate, num, won } from "@/lib/format";
import type {
  Meta,
  Order,
  OrderDetail,
  OrderSort,
  Paged,
  StatusCountRow,
} from "@/lib/types";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { CourierModal } from "./CourierModal";
import { CustomerModal } from "./CustomerModal";
import { DraftDrawer } from "./DraftDrawer";
import { FilesModal } from "./FilesModal";
import { NoteModal } from "./NoteModal";
import { OrderFormModal, type OrderFormValues } from "./OrderFormModal";
import { StatusDetailModal } from "./StatusDetailModal";
import { SummaryView } from "./SummaryView";

/** 폼 값 → API 페이로드 */
function toPayload(v: OrderFormValues) {
  const blankToNull = (s: string) => (s.trim() === "" ? null : s.trim());
  return {
    customerName: v.customerName.trim(),
    phone: blankToNull(v.phone),
    productName: v.productName.trim(),
    optionText: blankToNull(v.optionText),
    quantity: Number(v.quantity),
    unitPrice: Number(v.unitPrice),
    orderDate: v.orderDate,
    weddingDate: v.weddingDate,
    deliveryMethod: v.deliveryMethod,
    shippingAddress: blankToNull(v.shippingAddress),
    paymentStatus: v.paymentStatus,
    orderStatus: v.orderStatus,
    withInvitation: v.withInvitation,
    courierName: blankToNull(v.courierName),
    trackingNumber: blankToNull(v.trackingNumber),
    deliveredDate: blankToNull(v.deliveredDate),
    memo: blankToNull(v.memo),
    revisionNote: blankToNull(v.revisionNote),
  };
}

export function OrdersView() {
  const toast = useToast();

  // ── 필터 · 정렬 · 페이지 상태 (원본 state 객체와 1:1) ──────────────────────
  const [view, setView] = useState<"list" | "summary">("list");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput, 300);
  const [status, setStatus] = useState("전체");
  const [paymentStatus, setPaymentStatus] = useState("전체");
  const [productFilter, setProductFilter] = useState<number | null>(null);
  // 날짜 필터: 프리셋 + 기준일(anchor). "week" 는 anchor 가 속한 주(월~일), "day" 는 anchor 하루.
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateAnchor, setDateAnchor] = useState(TODAY);
  const [sort, setSort] = useState<OrderSort>("orderDateDesc");
  const [page, setPage] = useState(1);
  // 페이지 분할 없이 조건에 맞는 전체 목록을 한 번에 불러와 세로로 쭉 본다.
  const [pageSize] = useState<number>(2000);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // ── 서버 데이터 ────────────────────────────────────────────────────────────
  const [meta, setMeta] = useState<Meta | null>(null);
  const [chips, setChips] = useState<{ total: number; byStatus: StatusCountRow[] } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── 오버레이 상태 ──────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [formOrder, setFormOrder] = useState<OrderDetail | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [noteOrder, setNoteOrder] = useState<Order | null>(null);
  const [filesOrder, setFilesOrder] = useState<Order | null>(null);
  const [courierOrder, setCourierOrder] = useState<OrderDetail | null>(null);
  const [courierBusy, setCourierBusy] = useState(false);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [draftOrder, setDraftOrder] = useState<OrderDetail | null>(null);
  const [statusDetail, setStatusDetail] = useState<{ status: string; date: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const onError = useCallback(
    (message: string) => {
      setError(message);
      toast(message, "error");
    },
    [toast],
  );

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // ── meta 로드 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const c = new AbortController();
    api
      .meta(c.signal)
      .then(setMeta)
      .catch((e: Error) => {
        if (!c.signal.aborted) onError(e.message);
      });
    return () => c.abort();
  }, [onError]);

  // 프리셋 → 실제 조회 기간 [from, to] (또는 전체)
  const dateRange = useMemo(
    () => resolveDateRange(datePreset, dateAnchor),
    [datePreset, dateAnchor],
  );

  // ── 목록 로드 ──────────────────────────────────────────────────────────────
  const listParams = useMemo(
    () => ({
      search: search || undefined,
      status: status !== "전체" ? status : undefined,
      paymentStatus: paymentStatus !== "전체" ? paymentStatus : undefined,
      productId: productFilter ?? undefined,
      dateFrom: dateRange.all ? undefined : dateRange.from,
      dateTo: dateRange.all ? undefined : dateRange.to,
      showAllDates: dateRange.all,
      sort,
      page,
      pageSize,
    }),
    [search, status, paymentStatus, productFilter, dateRange, sort, page, pageSize],
  );

  const listFetcher = useCallback(
    (signal: AbortSignal) => api.listOrders(listParams, signal),
    [listParams],
  );
  const {
    data: paged,
    error: listError,
    loading,
  } = useAsyncData<Paged<Order>>(
    `${JSON.stringify(listParams)}|${refreshKey}`,
    listFetcher,
  );

  // ── 칩 건수 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const c = new AbortController();
    api
      .chips(c.signal)
      .then(setChips)
      .catch((e: unknown) => {
        // 칩 건수 실패는 화면을 막지 않되, 원인 추적은 가능해야 한다.
        if (!c.signal.aborted) console.warn("[orders] chips 조회 실패:", e);
      });
    return () => c.abort();
  }, [refreshKey]);

  // 필터가 바뀌면 항상 1페이지로
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setPage(1);
    setSelectedIds([]);
  }, [search, status, paymentStatus, productFilter, datePreset, dateAnchor, sort, pageSize]);

  const items = paged?.items ?? [];
  const total = paged?.total ?? 0;

  const pageIds = items.map((o) => o.id);
  // includes 반복은 O(page × selected) 라 Set 으로 조회한다.
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selectedSet.has(id));
  const someChecked = pageIds.some((id) => selectedSet.has(id));

  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = !allChecked && someChecked;
    }
  }, [allChecked, someChecked]);

  // ── 행 액션 ────────────────────────────────────────────────────────────────
  async function openDetail(id: number, target: "form" | "draft" | "courier") {
    try {
      const detail = await api.getOrder(id);
      if (target === "form") {
        setFormOrder(detail);
        setFormError(null);
        setFormOpen(true);
      } else if (target === "draft") {
        setDraftOrder(detail);
      } else {
        setCourierOrder(detail);
      }
    } catch (e) {
      onError((e as Error).message);
    }
  }

  function handleRowClick(o: Order) {
    if (o.orderStatus === "배송완료") void openDetail(o.id, "courier");
    else void openDetail(o.id, "form");
  }

  async function handleSubmitForm(values: OrderFormValues) {
    setFormBusy(true);
    setFormError(null);
    try {
      const payload = toPayload(values);
      if (formOrder) {
        await api.updateOrder(formOrder.id, payload);
        toast("주문을 수정했어요.");
      } else {
        await api.createOrder(payload);
        toast("주문을 등록했어요.");
      }
      setFormOpen(false);
      setFormOrder(null);
      refresh();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setFormBusy(false);
    }
  }

  async function handleBulkDelete() {
    setDeleteBusy(true);
    try {
      const { deleted } = await api.bulkDelete(selectedIds);
      toast(`${deleted}건을 삭제했어요.`);
      setSelectedIds([]);
      setDeleteOpen(false);
      setPage(1);
      refresh();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleCourierSave(
    data: Parameters<typeof api.updateCourier>[1],
  ): Promise<boolean> {
    if (!courierOrder) return false;
    setCourierBusy(true);
    try {
      const updated = await api.updateCourier(courierOrder.id, data);
      setCourierOrder(updated);
      toast("택배 정보를 수정했어요.");
      refresh();
      return true;
    } catch (e) {
      onError((e as Error).message);
      return false;
    } finally {
      setCourierBusy(false);
    }
  }

  const activeCount = useMemo(() => {
    if (!chips || !meta) return 0;
    const activeCodes = new Set(
      meta.orderStatuses.filter((s) => s.isActiveStage).map((s) => s.code as string),
    );
    return chips.byStatus
      .filter((s) => activeCodes.has(s.status))
      .reduce((a, s) => a + s.orderCount, 0);
  }, [chips, meta]);

  if (!meta) {
    return (
      <AppShell title="전체 주문" breadcrumb={["대시보드", "주문관리", "전체 주문"]}>
        <div className="empty">
          {error || listError ? (
            <>
              <div className="big">데이터를 불러오지 못했어요</div>
              {error ?? listError}
            </>
          ) : (
            "불러오는 중…"
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="전체 주문"
      breadcrumb={["대시보드", "주문관리", "전체 주문"]}
      actions={
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setFormOrder(null);
            setFormError(null);
            setFormOpen(true);
          }}
        >
          <PlusIcon /> 신규 주문 등록
        </button>
      }
    >
      <div className="view-tabs">
        <button
          type="button"
          className={`view-tab${view === "list" ? " active" : ""}`}
          onClick={() => setView("list")}
        >
          주문 목록
        </button>
        <button
          type="button"
          className={`view-tab${view === "summary" ? " active" : ""}`}
          onClick={() => setView("summary")}
        >
          요약 <span className="view-tab-badge">진행중 {activeCount}</span>
        </button>
      </div>

      {view === "summary" ? (
        <SummaryView
          today={TODAY}
          productFilter={productFilter}
          refreshKey={refreshKey}
          onError={onError}
          onPickProduct={(id) => {
            setProductFilter((prev) => (prev === id ? null : id));
            setView("list");
            setDatePreset("all");
          }}
          onPickStatusTile={(s, d) => setStatusDetail({ status: s, date: d })}
        />
      ) : (
        <>
          <div className="toolbar">
            {/* 날짜 검색 — 맨 앞. 날짜를 고르면 그 주(월~일) 단위로 조회 */}
            <DateRangeFilter
              preset={datePreset}
              anchor={dateAnchor}
              onChange={(p, a) => {
                setDatePreset(p);
                setDateAnchor(a);
              }}
            />

            <div className="chips">
              <button
                type="button"
                className={`chip${status === "전체" ? " active" : ""}`}
                onClick={() => setStatus("전체")}
              >
                전체 <span className="chip-count">{chips?.total ?? 0}</span>
              </button>
              {meta.orderStatuses.map((s) => {
                const count =
                  chips?.byStatus.find((c) => c.status === s.code)?.orderCount ?? 0;
                return (
                  <button
                    type="button"
                    key={s.code}
                    className={`chip${status === s.code ? " active" : ""}`}
                    onClick={() => setStatus(s.code)}
                  >
                    {s.code} <span className="chip-count">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="sort">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as OrderSort)}
                aria-label="정렬"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sort">
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                aria-label="결제 상태 필터"
              >
                <option value="전체">결제 전체</option>
                {meta.paymentStatuses.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="toolbar-search">
              <SearchIcon />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="주문자명, 주문번호, 연락처, 상품명으로 검색"
                aria-label="주문 검색"
              />
            </div>

            {productFilter ? (
              <button
                type="button"
                className="chip active filter-clear"
                onClick={() => setProductFilter(null)}
              >
                품목: {meta.products.find((p) => p.id === productFilter)?.name ?? productFilter} ✕
              </button>
            ) : null}
          </div>

          {selectedIds.length > 0 ? (
            <div className="bulk-bar">
              <span>{selectedIds.length}건 선택됨</span>
              <button
                type="button"
                className="btn-bulk-delete"
                onClick={() => setDeleteOpen(true)}
              >
                선택 삭제
              </button>
            </div>
          ) : null}

          <div className="table-wrap orders-table">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th className="checkbox-col">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        aria-label="현재 페이지 전체 선택"
                        checked={allChecked}
                        onChange={(e) => {
                          setSelectedIds((prev) =>
                            e.target.checked
                              ? [...new Set([...prev, ...pageIds])]
                              : prev.filter((id) => !pageIds.includes(id)),
                          );
                        }}
                      />
                    </th>
                    <th>주문일자</th>
                    <th>주문방식</th>
                    <th>주문번호</th>
                    <th>주문자명</th>
                    <th>연락처</th>
                    <th className="col-l">배송지</th>
                    <th>배송요청사항</th>
                    <th className="col-l">상품명</th>
                    <th>품목코드</th>
                    <th className="num">주문수량</th>
                    <th className="num">인쇄수량</th>
                    <th className="num">결제금액</th>
                    <th>첨부파일</th>
                    <th>결제상태</th>
                    <th>진행상태</th>
                  </tr>
                </thead>
                <tbody>
                  {listError ? (
                    <tr>
                      <td colSpan={16}>
                        <div className="empty">
                          <div className="big">목록을 불러오지 못했어요</div>
                          {listError}
                        </div>
                      </td>
                    </tr>
                  ) : loading && items.length === 0 ? (
                    <tr>
                      <td colSpan={16}>
                        <div className="empty">불러오는 중…</div>
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={16}>
                        <div className="empty">
                          <div className="big">조건에 맞는 주문이 없어요</div>
                          검색어나 필터를 조정해보세요. 날짜 범위가 좁다면 &lsquo;전체 주문건&rsquo;을
                          체크해보세요.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    items.map((o) => {
                      const checked = selectedSet.has(o.id);
                      const address = o.shippingAddress || o.customerAddress || "-";
                      return (
                        <tr
                          key={o.id}
                          className={checked ? "is-selected" : undefined}
                          tabIndex={0}
                          aria-label={`${o.orderNo} 상세 열기`}
                          onClick={() => handleRowClick(o)}
                          onKeyDown={(e) => {
                            // 행 안의 버튼·체크박스에서 올라온 키 입력은 무시한다.
                            if (e.target !== e.currentTarget) return;
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleRowClick(o);
                            }
                          }}
                        >
                          <td className="checkbox-col" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="row-check"
                              checked={checked}
                              aria-label={`${o.orderNo} 선택`}
                              onChange={(e) =>
                                setSelectedIds((prev) =>
                                  e.target.checked
                                    ? [...prev, o.id]
                                    : prev.filter((id) => id !== o.id),
                                )
                              }
                            />
                          </td>

                          {/* 주문일자 */}
                          <td className="mono">{fmtDate(o.orderDate)}</td>

                          {/* 주문방식 */}
                          <td>
                            {o.withInvitation ? (
                              <span className="pill inv-yes">청첩장 함께</span>
                            ) : (
                              <span className="pill inv-no">단독 주문</span>
                            )}
                          </td>

                          {/* 주문번호 */}
                          <td onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className={`order-link mono${
                                o.paymentStatus === "결제취소" ? " payment-cancelled" : ""
                              }`}
                              onClick={() => void openDetail(o.id, "draft")}
                            >
                              {o.orderNoShort}
                            </button>
                          </td>

                          {/* 주문자명 */}
                          <td onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="customer"
                              onClick={() => setCustomerId(o.customerId)}
                            >
                              {o.customerName}
                            </button>
                          </td>

                          {/* 연락처 */}
                          <td className="mono">{o.customerPhone || "-"}</td>

                          {/* 배송지 */}
                          <td className="col-l">
                            <span className="clip-text" title={address}>
                              {address}
                            </span>
                          </td>

                          {/* 배송요청사항 (아이콘 클릭 → 모달) */}
                          <td onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className={`icon-btn${o.memo ? " note-active" : ""}`}
                              title={o.memo ? "배송요청사항 보기" : "배송요청사항 없음"}
                              disabled={!o.memo}
                              onClick={() => setNoteOrder(o)}
                            >
                              <NoteIcon />
                            </button>
                          </td>

                          {/* 상품명 */}
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

                          {/* 품목코드 */}
                          <td>
                            <span className="item-code">{o.productCode}</span>
                          </td>

                          {/* 주문수량 */}
                          <td className="num mono">{num(o.quantity)}</td>

                          {/* 인쇄수량 */}
                          <td className="num mono">{num(o.printQuantity ?? o.quantity)}</td>

                          {/* 결제금액 */}
                          <td className="num mono">{won(o.totalAmount)}</td>

                          {/* 첨부파일 */}
                          <td onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className={`icon-btn${o.attachmentCount ? " note-active" : ""}`}
                              title={
                                o.attachmentCount ? `첨부파일 (${o.attachmentCount}건)` : "첨부파일 추가"
                              }
                              onClick={() => setFilesOrder(o)}
                            >
                              <FolderIcon />
                              {o.attachmentCount ? (
                                <span className="mini-badge">{o.attachmentCount}</span>
                              ) : null}
                            </button>
                          </td>

                          {/* 결제상태 (작게, '결제' 접두어 제외) */}
                          <td>
                            <span
                              className={`pill pill-sm pay-${o.paymentStatus}`}
                              title={o.paymentStatus}
                            >
                              {o.paymentStatus.replace(/^결제/, "")}
                            </span>
                          </td>

                          {/* 진행상태 */}
                          <td>
                            <span className={`pill st-${o.orderStatus}`}>{o.orderStatus}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-foot">
              <span className="foot-info">
                전체 {num(total)}건{items.length < total ? ` 중 ${num(items.length)}건 표시` : ""}
              </span>
            </div>
          </div>
        </>
      )}

      {/* ── 오버레이들 ─────────────────────────────────────────────────────── */}
      <OrderFormModal
        key={`form-${formOrder?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        meta={meta}
        today={TODAY}
        order={formOrder}
        busy={formBusy}
        error={formError}
        onClose={() => {
          setFormOpen(false);
          setFormOrder(null);
        }}
        onSubmit={handleSubmitForm}
      />

      <NoteModal order={noteOrder} onClose={() => setNoteOrder(null)} />

      <FilesModal
        open={!!filesOrder}
        orderId={filesOrder?.id ?? null}
        orderNo={filesOrder?.orderNo ?? ""}
        kind="attachment"
        title="첨부파일"
        onClose={() => setFilesOrder(null)}
        onChanged={refresh}
        onError={onError}
      />

      <CourierModal
        key={`courier-${courierOrder?.id ?? "none"}`}
        open={!!courierOrder}
        order={courierOrder}
        meta={meta}
        busy={courierBusy}
        onClose={() => setCourierOrder(null)}
        onSave={handleCourierSave}
      />

      <CustomerModal
        customerId={customerId}
        onClose={() => setCustomerId(null)}
        onError={onError}
        onOpenOrder={(orderId) => {
          setCustomerId(null);
          void openDetail(orderId, "form");
        }}
      />

      <DraftDrawer
        key={`draft-${draftOrder?.id ?? "none"}`}
        order={draftOrder}
        onClose={() => setDraftOrder(null)}
        onChanged={refresh}
        onError={onError}
      />

      <StatusDetailModal
        date={statusDetail?.date ?? TODAY}
        status={statusDetail?.status ?? null}
        onClose={() => setStatusDetail(null)}
        onError={onError}
        onPickProduct={(productId) => {
          if (statusDetail) {
            setStatus(statusDetail.status);
            setDateAnchor(statusDetail.date);
            setDatePreset("day");
          }
          setProductFilter(productId);
          setStatusDetail(null);
          setView("list");
        }}
      />

      <ConfirmDeleteModal
        open={deleteOpen}
        count={selectedIds.length}
        busy={deleteBusy}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleBulkDelete}
      />
    </AppShell>
  );
}
