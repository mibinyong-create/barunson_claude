import type { Metadata } from "next";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "커스텀 주문관리",
  description:
    "웨딩 굿즈·커스텀 인쇄물 주문을 접수부터 배송까지 관리하는 어드민 (Next.js + PostgreSQL)",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // 브라우저 확장 프로그램이 React 로드 전에 <html> 에 속성을 주입하는 경우가 있어
    // (예: data-hwp-extension) 하이드레이션 경고가 뜬다. 이 속성은 앱이 만드는 것이 아니므로
    // 루트 엘리먼트에 한해 경고를 억제한다. 한 단계 아래까지만 적용되므로
    // 실제 컴포넌트의 하이드레이션 불일치는 그대로 보고된다.
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
