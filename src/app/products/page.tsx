"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ProductThumb } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { useAsyncData } from "@/hooks/useAsyncData";
import { api } from "@/lib/client-api";
import { TODAY } from "@/lib/constants";
import { num, won } from "@/lib/format";
import type { Product } from "@/lib/types";

const YEAR = TODAY.slice(0, 4);
const itemCode = (slug: string) => `${YEAR}_${slug}_01`;

const COPY_HEADERS = [
  "품목코드",
  "상품명",
  "매입단가",
  "판매단가",
  "주문 건수",
  "진행중",
  "총 수량",
  "누적 금액",
];

export default function ProductsPage() {
  const toast = useToast();
  const fetcher = useCallback((signal: AbortSignal) => api.products(signal), []);
  const { data, error, loading } = useAsyncData<Product[]>("products", fetcher);
  const products = useMemo(() => data ?? [], [data]);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    if (error) toast(error, "error");
  }, [error, toast]);

  const allIds = products.map((p) => p.id);
  const allChecked = allIds.length > 0 && allIds.every((id) => selectedSet.has(id));
  const someChecked = allIds.some((id) => selectedSet.has(id));

  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = !allChecked && someChecked;
  }, [allChecked, someChecked]);

  async function copySelected() {
    const rows = products.filter((p) => selectedSet.has(p.id));
    if (rows.length === 0) return;
    const tsv = [
      COPY_HEADERS.join("\t"),
      ...rows.map((p) =>
        [
          itemCode(p.slug),
          p.name,
          p.purchasePrice || "",
          p.defaultUnitPrice,
          p.orderCount,
          p.activeOrderCount,
          p.totalQuantity,
          p.totalAmount,
        ].join("\t"),
      ),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      toast(`${rows.length}개 상품을 클립보드에 복사했어요`);
    } catch {
      toast("복사에 실패했어요. 브라우저 권한을 확인해 주세요.", "error");
    }
  }

  return (
    <AppShell title="상품관리" breadcrumb={["대시보드", "상품관리"]}>
      {selectedIds.length > 0 ? (
        <div className="bulk-bar">
          <span>{selectedIds.length}개 선택됨</span>
          <button type="button" className="btn-bulk-delete" onClick={copySelected}>
            선택 복사
          </button>
        </div>
      ) : null}

      <div className="table-wrap products-table">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th className="checkbox-col">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    aria-label="전체 선택"
                    checked={allChecked}
                    onChange={(e) =>
                      setSelectedIds(e.target.checked ? allIds : [])
                    }
                  />
                </th>
                <th>상품</th>
                <th>품목코드</th>
                <th className="num">매입단가</th>
                <th className="num">판매단가</th>
                <th className="num">주문 건수</th>
                <th className="num">진행중</th>
                <th className="num">총 수량</th>
                <th className="num">누적 금액</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty">불러오는 중…</div>
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const checked = selectedSet.has(p.id);
                  return (
                    <tr key={p.id} className={checked ? "is-selected" : undefined}>
                      <td className="checkbox-col">
                        <input
                          type="checkbox"
                          className="row-check"
                          checked={checked}
                          aria-label={`${p.name} 선택`}
                          onChange={(e) =>
                            setSelectedIds((prev) =>
                              e.target.checked
                                ? [...prev, p.id]
                                : prev.filter((id) => id !== p.id),
                            )
                          }
                        />
                      </td>
                      <td>
                        <div className="product">
                          <ProductThumb
                            name={p.name}
                            slug={p.slug}
                            iconPath={p.iconPath}
                            linkUrl={p.linkUrl}
                          />
                          <div className="product-text">
                            <span className="name">{p.name}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="item-code">{itemCode(p.slug)}</span>
                      </td>
                      <td className="num mono">
                        {p.purchasePrice ? won(p.purchasePrice) : "-"}
                      </td>
                      <td className="num mono">{won(p.defaultUnitPrice)}</td>
                      <td className="num mono">{num(p.orderCount)}</td>
                      <td className="num mono">{num(p.activeOrderCount)}</td>
                      <td className="num mono">{num(p.totalQuantity)}</td>
                      <td className="num mono">{won(p.totalAmount)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
