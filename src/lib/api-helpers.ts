import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return Response.json(data, init);
}

export function fail(message: string, status = 400, extra?: unknown) {
  return Response.json({ error: message, details: extra }, { status });
}

/**
 * 라우트 핸들러 공통 래퍼.
 * zod 검증 실패 → 400 + 필드별 메시지, 그 외 예외 → 500.
 */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ZodError) {
      return fail("입력값이 올바르지 않습니다.", 400, e.issues);
    }
    if (isPgError(e)) {
      // 23503 FK 위반, 23505 UNIQUE 위반, 23514 CHECK 위반
      if (e.code === "23505") return fail("이미 존재하는 값입니다.", 409);
      if (e.code === "23503") return fail("참조하는 데이터가 존재하지 않습니다.", 400);
      if (e.code === "23514") return fail("데이터 제약 조건을 위반했습니다.", 400);
      if (e.code === "ECONNREFUSED" || e.code === "57P03") {
        return fail(
          "데이터베이스에 연결할 수 없습니다. `docker compose up -d` 로 postgres 를 먼저 띄워주세요.",
          503,
        );
      }
    }
    console.error("[api] unhandled error:", e);
    const message = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
    return fail(message, 500);
  }
}

function isPgError(e: unknown): e is { code?: string; message?: string } {
  return typeof e === "object" && e !== null && "code" in e;
}

/** URL 의 [id] 세그먼트를 정수로 파싱 */
export function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function searchParamsToObject(sp: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  sp.forEach((v, k) => {
    if (v !== "") out[k] = v;
  });
  return out;
}
