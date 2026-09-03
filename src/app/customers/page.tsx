"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SearchIcon } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { CustomerModal } from "@/components/orders/CustomerModal";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useDebounced } from "@/hooks/useDebounced";
import { api } from "@/lib/client-api";
import { fmtDate, num, won } from "@/lib/format";
import type { Customer, Paged } from "@/lib/types";

export default function CustomersPage() {
  const toast = useToast();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput, 300);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const fetcher = useCallback(
    (signal: AbortSignal) =>
      api.customers({ search: search || undefined, page, pageSize: 2000 }, signal),
    [search, page],
  );
  const { data, error, loading } = useAsyncData<Paged<Customer>>(
    `${search}|${page}`,
    fetcher,
  );

  useEffect(() => {
    if (error) toast(error, "error");
  }, [error, toast]);

  return (
    <AppShell title="고객관리" breadcrumb={["대시보드", "고객관리"]}>
      <div className="toolbar">
        <div className="toolbar-search wide">
          <SearchIcon />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder="고객명, 연락처, 주소, 주문번호로 검색"
            aria-label="고객 검색"
          />
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>고객명</th>
                <th>연락처</th>
                <th>주소</th>
                <th className="col-l">주문품목</th>
                <th className="num">주문 건수</th>
                <th className="num">진행중</th>
                <th className="num">누적 금액</th>
                <th>최근 주문일</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty">불러오는 중…</div>
                  </td>
                </tr>
              ) : (data?.items.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty">
                      <div className="big">조건에 맞는 고객이 없어요</div>
                      검색어를 조정해보세요.
                    </div>
                  </td>
                </tr>
              ) : (
                data?.items.map((c) => {
                  const isOpen = expanded.has(c.id);
                  return (
                    <Fragment key={c.id}>
                      <tr
                        className={isOpen ? "is-expanded" : undefined}
                        tabIndex={0}
                        aria-label={`${c.name} 고객 상세 열기`}
                        onClick={() => setOpenId(c.id)}
                        onKeyDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setOpenId(c.id);
                          }
                        }}
                      >
                        <td>
                          {/* 실제 클릭은 행 전체가 처리한다. button 으로 두면
                              스크린리더가 동작하지 않는 버튼으로 읽는다. */}
                          <span className="customer">{c.name}</span>
                        </td>
                        <td className="mono">{c.phone ?? "-"}</td>
                        <td>{c.address ?? "-"}</td>
                        <td className="col-l" onClick={(e) => e.stopPropagation()}>
                          {c.orders.length === 0 ? (
                            <span className="req-empty">-</span>
                          ) : (
                            <div className="recent-order">
                              <span className="ro-main">
                                <span className="mono ro-no">{c.orders[0].orderNoShort}</span>
                                <span className="ro-name">{c.orders[0].productName}</span>
                                {c.orders[0].optionText ? (
                                  <span className="ro-opt">{c.orders[0].optionText}</span>
                                ) : null}
                              </span>
                              {c.orders.length > 1 ? (
                                <button
                                  type="button"
                                  className={`order-toggle${isOpen ? " open" : ""}`}
                                  aria-expanded={isOpen}
                                  onClick={() => toggleExpand(c.id)}
                                >
                                  외 {c.orders.length - 1}건
                                  <span className="chev">{isOpen ? "▴" : "▾"}</span>
                                </button>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="num mono">{num(c.orderCount)}</td>
                        <td className="num mono">{num(c.activeOrderCount)}</td>
                        <td className="num mono">{won(c.totalAmount)}</td>
                        <td className="mono">{fmtDate(c.lastOrderDate)}</td>
                      </tr>
                      {isOpen && c.orders.length > 1 ? (
                        <tr className="cust-detail">
                          <td colSpan={8}>
                            <ul className="cust-orders">
                              {c.orders.slice(1).map((o) => (
                                <li key={o.orderNo}>
                                  <span className="mono co-no">{o.orderNoShort}</span>
                                  <span className="co-name">{o.productName}</span>
                                  {o.optionText ? (
                                    <span className="co-opt">{o.optionText}</span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="table-foot">
          <span className="foot-info">전체 {num(data?.total ?? 0)}명</span>
        </div>
      </div>

      <CustomerModal
        customerId={openId}
        onClose={() => setOpenId(null)}
        onError={(m) => toast(m, "error")}
      />
    </AppShell>
  );
}
