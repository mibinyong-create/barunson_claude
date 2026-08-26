"use client";

import { useCallback, useEffect, useState } from "react";
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

  const fetcher = useCallback(
    (signal: AbortSignal) =>
      api.customers({ search: search || undefined, page, pageSize: 25 }, signal),
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
            placeholder="고객명, 연락처, 주소로 검색"
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
                <th className="num">주문 건수</th>
                <th className="num">진행중</th>
                <th className="num">누적 금액</th>
                <th>최근 주문일</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">불러오는 중…</div>
                  </td>
                </tr>
              ) : (data?.items.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">
                      <div className="big">조건에 맞는 고객이 없어요</div>
                      검색어를 조정해보세요.
                    </div>
                  </td>
                </tr>
              ) : (
                data?.items.map((c) => (
                  <tr key={c.id} onClick={() => setOpenId(c.id)}>
                    <td>
                      <button type="button" className="customer">
                        {c.name}
                      </button>
                    </td>
                    <td className="mono">{c.phone ?? "-"}</td>
                    <td>{c.address ?? "-"}</td>
                    <td className="num mono">{num(c.orderCount)}</td>
                    <td className="num mono">{num(c.activeOrderCount)}</td>
                    <td className="num mono">{won(c.totalAmount)}</td>
                    <td className="mono">{fmtDate(c.lastOrderDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-foot">
          <span className="foot-info">전체 {num(data?.total ?? 0)}명</span>
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
              disabled={page >= (data?.totalPages ?? 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              ›
            </button>
          </div>
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
