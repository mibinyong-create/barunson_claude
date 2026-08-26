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
    <html lang="ko">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
