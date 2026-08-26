// Nginx 리버스 프록시가 /c/프로젝트명/ 서브패스로 앱을 노출하므로,
// fetch 경로에는 basePath 를 직접 붙여야 한다.
// (Link / router / _next 정적자산은 Next.js 가 자동으로 붙여준다.)
const raw = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** 후행 슬래시를 제거한 base path. 설정되지 않았으면 빈 문자열. */
export const basePath = raw.endsWith("/") ? raw.slice(0, -1) : raw;

export function apiUrl(path: string): string {
  return `${basePath}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), options);
}
