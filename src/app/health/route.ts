// 헬스체크는 항상 런타임에 200 을 반환해야 하므로 정적 프리렌더를 막는다.
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ status: 'ok' });
}
