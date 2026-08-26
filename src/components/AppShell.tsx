"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/client-api";
import { TODAY } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import {
  BellIcon,
  CustomersIcon,
  DashboardIcon,
  OrdersIcon,
  ProductsIcon,
  SettingsIcon,
} from "./icons";

const NAV = [
  { href: "/dashboard", label: "대시보드", Icon: DashboardIcon },
  { href: "/", label: "주문관리", Icon: OrdersIcon },
  { href: "/customers", label: "고객관리", Icon: CustomersIcon },
  { href: "/products", label: "상품관리", Icon: ProductsIcon },
  { href: "/settings", label: "설정", Icon: SettingsIcon },
];

type Props = {
  title: string;
  breadcrumb: string[];
  children: ReactNode;
  /** 우측 상단 액션 (예: 신규 주문 등록 버튼) */
  actions?: ReactNode;
};

export function AppShell({ title, breadcrumb, children, actions }: Props) {
  const pathname = usePathname();
  const [todayCount, setTodayCount] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .summary(TODAY, controller.signal)
      .then((s) => setTodayCount(s.todayNewOrders))
      .catch((e: unknown) => {
        // 벨 배지는 실패해도 화면을 막지 않되, 원인은 남긴다.
        if (!controller.signal.aborted) console.warn("[shell] 오늘 신규 주문 조회 실패:", e);
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="dot" />
          커스텀
        </div>
        <nav className="sidebar-nav">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              className={`nav-item${pathname === href ? " active" : ""}`}
              href={href}
            >
              <Icon />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="main">
        <div className="topbar-new">
          <div className="topbar-right">
            <button type="button" className="bell-btn" title="오늘 신규 주문">
              <BellIcon />
              <span className="badge">{todayCount ?? 0}</span>
            </button>
            <div className="user-chip">
              <div className="avatar">🎀</div>
              <span className="uname">스튜디오</span>
            </div>
          </div>
        </div>

        <div className="page-head">
          <div>
            <h1>{title}</h1>
            <div className="breadcrumb">
              {breadcrumb.map((b, i) => (
                <span key={b}>
                  {i > 0 ? <span className="sep">›</span> : null}
                  <span className={i === breadcrumb.length - 1 ? "current" : undefined}>{b}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="page-head-right">
            {actions}
            <div className="today">{fmtDate(TODAY)} 기준</div>
          </div>
        </div>

        <div className="app">{children}</div>
      </div>
    </div>
  );
}
