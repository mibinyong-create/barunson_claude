"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ProductThumb } from "@/components/icons";
import { ProductPrepModal } from "@/components/products/ProductPrepModal";
import { useToast } from "@/components/Toast";
import { useAsyncData } from "@/hooks/useAsyncData";
import { api } from "@/lib/client-api";
import { TODAY } from "@/lib/constants";
import { num, won } from "@/lib/format";
import { PREP_STEPS, PREP_STEP_TOTAL } from "@/lib/prep-steps";
import type { Product } from "@/lib/types";

const YEAR = TODAY.slice(0, 4);
const itemCode = (p: Product) => p.erpCode ?? `${YEAR}_${p.slug}_01`;

const PROD_FILTERS = ["전체", "내부생산", "외부생산"] as const;

const COPY_HEADERS = [
  "품목코드",
  "상품명",
  "생산",
  "생산처",
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
  const onError = useCallback((m: string) => toast(m, "error"), [toast]);

  const [prodFilter, setProdFilter] = useState<(typeof PROD_FILTERS)[number]>("전체");

  // 준비 단계 저장 결과는 로컬에 얹어 즉시 반영한다.
  const [overrides, setOverrides] = useState<Record<number, Product>>({});
  const rows = useMemo(
    () =>
      products
        .map((p) => overrides[p.id] ?? p)
        .filter(
          (p) =>
            prodFilter === "전체" ||
            (prodFilter === "내부생산" && p.productionType === "내부") ||
            (prodFilter === "외부생산" && p.productionType === "외부"),
        ),
    [products, overrides, prodFilter],
  );
  const [prepId, setPrepId] = useState<number | null>(null);
  const prepProduct = rows.find((p) => p.id === prepId) ?? null;

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
    const picked = products.filter((p) => selectedSet.has(p.id));
    if (picked.length === 0) return;
    const tsv = [
      COPY_HEADERS.join("\t"),
      ...picked.map((p) =>
        [
          itemCode(p),
          p.name,
          `${p.productionType}생산`,
          p.productionVendor ?? "",
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
      toast(`${picked.length}개 상품을 클립보드에 복사했어요`);
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

      <div className="toolbar">
        <div className="chips">
          {PROD_FILTERS.map((f) => {
            const n =
              f === "전체"
                ? products.length
                : products.filter(
                    (p) => `${p.productionType}생산` === f,
                  ).length;
            return (
              <button
                key={f}
                type="button"
                className={`chip${prodFilter === f ? " active" : ""}`}
                onClick={() => setProdFilter(f)}
              >
                {f} <span className="chip-count">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

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
                <th className="col-l">상품</th>
                <th>품목코드</th>
                <th>생산</th>
                <th className="col-l">출시 준비</th>
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
                  <td colSpan={11}>
                    <div className="empty">불러오는 중…</div>
                  </td>
                </tr>
              ) : (
                rows.map((p) => {
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
                        <span className="item-code">{itemCode(p)}</span>
                      </td>
                      <td>
                        <span
                          className={`pill pill-sm prod-${p.productionType}`}
                          title={p.productionVendor ?? undefined}
                        >
                          {p.productionType}생산
                        </span>
                        {p.productionVendor ? (
                          <span className="prod-vendor">{p.productionVendor}</span>
                        ) : null}
                      </td>
                      <td className="col-l">
                        <button
                          type="button"
                          className="prep-cell"
                          onClick={() => setPrepId(p.id)}
                          title="출시 준비 단계 보기"
                        >
                          <span className="prep-bar">
                            {PREP_STEPS.map((m) => {
                              const done = p.prepSteps.find((s) => s.code === m.code)?.done;
                              return (
                                <span
                                  key={m.code}
                                  className={`prep-seg${done ? " done" : ""}`}
                                  title={m.label}
                                />
                              );
                            })}
                          </span>
                          <span className="prep-count mono">
                            {p.prepSteps.filter((s) => s.done).length}/{PREP_STEP_TOTAL}
                          </span>
                        </button>
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

      <ProductPrepModal
        key={prepId ?? "none"}
        product={prepProduct}
        onClose={() => setPrepId(null)}
        onSaved={(p) => setOverrides((o) => ({ ...o, [p.id]: p }))}
        onError={onError}
      />
    </AppShell>
  );
}
