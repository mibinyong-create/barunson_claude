import { TODAY } from "./constants";

/** 120000 → "₩120,000" */
export function won(n: number | null | undefined): string {
  return "₩" + Number(n ?? 0).toLocaleString("ko-KR");
}

/** 1200 → "1,200" */
export function num(n: number | null | undefined): string {
  return Number(n ?? 0).toLocaleString("ko-KR");
}

/** "2026-08-24" → "2026.08.24" */
export function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  const p = d.slice(0, 10).split("-");
  if (p.length !== 3) return d;
  return `${p[0]}.${p[1]}.${p[2]}`;
}

/** "2026-08-24T05:00:00Z" → "2026.08.24 14:00" */
export function fmtDateTime(v: string | null | undefined): string {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 기준일 대비 예식일까지 남은 일수 */
export function diffDays(weddingDate: string, today: string = TODAY): number {
  const a = new Date(`${weddingDate.slice(0, 10)}T00:00:00`);
  const b = new Date(`${today}T00:00:00`);
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

/** 12 → "D-12", 0 → "D-DAY", -3 → "D+3" */
export function dday(diff: number): string {
  if (diff === 0) return "D-DAY";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

/** 해당 날짜가 속한 주의 월요일 (원본 weekStart 과 동일) */
export function weekStart(dateStr: string): Date {
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  const day = d.getDay();
  const shift = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + shift);
  return d;
}

export function toISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 해당 날짜가 속한 주(월~일)의 시작/종료일 */
export function weekRange(dateStr: string): { start: string; end: string } {
  const s = weekStart(dateStr);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return { start: toISODate(s), end: toISODate(e) };
}

/** "ORD-2026-000010" → "000010" */
export function orderNoShort(orderNo: string): string {
  const m = /(\d{6})$/.exec(orderNo ?? "");
  return m ? m[1] : (orderNo ?? "");
}

/** 1024 → "1.0 KB" */
export function fmtFileSize(bytes: number | null | undefined): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** 택배사 조회 URL 조립 */
export function trackingUrl(
  template: string | null | undefined,
  trackingNumber: string | null | undefined,
): string | null {
  if (!template || !trackingNumber) return null;
  return template.replace("{{no}}", encodeURIComponent(trackingNumber));
}
