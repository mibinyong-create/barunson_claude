"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ProductThumb } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/client-api";
import { num, won } from "@/lib/format";
import type { Product } from "@/lib/types";

export default function ProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const c = new AbortController();
    api
      .products(c.signal)
      .then(setProducts)
      .catch((e: Error) => !c.signal.aborted && toast(e.message, "error"))
      .finally(() => !c.signal.aborted && setLoading(false));
    return () => c.abort();
  }, [toast]);

  return (
    <AppShell title="상품관리" breadcrumb={["대시보드", "상품관리"]}>
      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>상품</th>
                <th>슬러그</th>
                <th className="num">기본 단가</th>
                <th className="num">주문 건수</th>
                <th className="num">진행중</th>
                <th className="num">총 수량</th>
                <th className="num">누적 금액</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">불러오는 중…</div>
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="product">
                        <ProductThumb name={p.name} iconPath={p.iconPath} linkUrl={p.linkUrl} />
                        <div className="product-text">
                          <span className="name">{p.name}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="item-code">{p.slug}</span>
                    </td>
                    <td className="num mono">{won(p.defaultUnitPrice)}</td>
                    <td className="num mono">{num(p.orderCount)}</td>
                    <td className="num mono">{num(p.activeOrderCount)}</td>
                    <td className="num mono">{num(p.totalQuantity)}</td>
                    <td className="num mono">{won(p.totalAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
