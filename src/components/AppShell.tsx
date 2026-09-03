"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/client-api";
import { TODAY } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import {
  BellIcon,
  ClipboardIcon,
  CustomersIcon,
  DashboardIcon,
  LogoutIcon,
  OrdersIcon,
  PrinterIcon,
  ProductsIcon,
  SettingsIcon,
  TruckIcon,
} from "./icons";

const NAV = [
  { href: "/dashboard", label: "대시보드", Icon: DashboardIcon },
  { href: "/", label: "주문관리", Icon: OrdersIcon },
  { href: "/print", label: "인쇄작업", Icon: PrinterIcon },
  { href: "/shipping", label: "출고관리", Icon: TruckIcon },
  { href: "/purchasing", label: "발주관리", Icon: ClipboardIcon },
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
        <Link href="/dashboard" className="sidebar-brand" aria-label="바른손 홈">
          <span>바른손</span>
        </Link>

        <nav className="sidebar-nav">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              className={`nav-item${pathname === href ? " active" : ""}`}
              href={href}
              title={label}
            >
              <span className="nav-ico">
                <Icon size={20} />
              </span>
              <span className="nav-label">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-foot">
          <Link href="/" className="nav-item" title="로그아웃">
            <span className="nav-ico">
              <LogoutIcon size={20} />
            </span>
            <span className="nav-label">로그아웃</span>
          </Link>
        </div>
      </aside>

      <div className="main">
        <header className="app-header">
          <div className="app-header-title">
            <h1>{title}</h1>
            {breadcrumb.length > 1 ? (
              <div className="breadcrumb">
                {breadcrumb.map((b, i) => (
                  <span key={b}>
                    {i > 0 ? <span className="sep">›</span> : null}
                    <span className={i === breadcrumb.length - 1 ? "current" : undefined}>
                      {b}
                    </span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="app-header-actions">
            {actions}
            <button type="button" className="hdr-bell" title="오늘 신규 주문" aria-label="오늘 신규 주문">
              <BellIcon size={17} />
              {todayCount ? <span className="badge">{todayCount}</span> : null}
            </button>
            <span className="hdr-today">{fmtDate(TODAY)} 기준</span>
          </div>
        </header>

        <div className="app">{children}</div>
      </div>
    </div>
  );
}
