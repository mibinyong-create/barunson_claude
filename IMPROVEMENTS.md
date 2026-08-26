# 코드 리뷰 및 개선 보고서

CODE-REVIEW-AND-FIX.md 워크플로우를 적용한 결과입니다.
분석은 7개 에이전트(A~G)를 **병렬**로, 수정은 메인 에이전트가 **파일 단위로 순차** 적용했습니다.

## 1. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 프로젝트 유형 | **Next.js 풀스택** (App Router) — 포트 3000 |
| 언어 · 프레임워크 | TypeScript / Next.js 16.3.3, React 19.2.8 |
| DB | PostgreSQL 17 (`pg` 8.x, ORM 없이 직접 SQL) |
| 진입점 | `package.json` → `start: next start` / standalone `server.js` |
| 주요 파일 | `src/lib/db.ts`, `src/lib/repositories/*`, `src/app/api/**/route.ts`, `src/components/orders/OrdersView.tsx`, `db/schema.sql` |
| Docker Manager 배포 준비 상태 | **준비 완료** (수동 조치 항목은 6장 참고) |
| 원본 커밋 (롤백 지점) | `9b28100e5c20dfea3c9a3f4f43da4fff16fb0c83` |

**Pre-Check (멀티 애플리케이션 저장소 검사)**: 통과. 최상위 `package.json` 1개뿐이며
`client/`·`server/` 등 독립 앱 디렉토리가 없습니다. `src/app/api/` 는 Next.js 풀스택 구조로 정상입니다.

## 2. Docker Manager 호환성 결과

| 항목 | 상태 | 비고 |
|---|---|---|
| 프로젝트 유형 감지 | OK | Next.js 풀스택 (App Router) |
| start 스크립트 | OK | `next start` |
| `output: 'standalone'` | OK | `.next/standalone/server.js` 생성 확인 |
| 포트 설정 | OK | 코드 내 하드코딩 없음. `PORT`/`HOSTNAME` 환경변수 사용 |
| 헬스체크 (GET /health) | OK (수정) | 단순 200 + `{"status":"ok"}`. `force-dynamic` 추가로 정적 프리렌더 차단 |
| 0.0.0.0 바인딩 | OK | `HOSTNAME=0.0.0.0` (.env.example 문서화) |
| 절대경로 → 상대경로 | OK | 모든 fetch 가 `apiFetch()` 경유. 잔존 절대경로 0건 |
| `.env.example` | OK (재작성) | 코드가 실제 참조하는 변수만 포함 |
| 하드코딩 DB 연결 제거 | OK | 3개 파일의 fallback 제거, 시크릿 0건 |
| 기존 Dockerfile/.dockerignore/deploy.yml | 해당 없음 | 존재하지 않아 삭제 대상 없음 |
| `docker-compose.yml` | 유지 | 로컬 개발 전용임을 파일 상단에 명시 |
| 빌드 시 DB 접속 | OK | `DATABASE_URL` 없이 `next build` 성공 확인 |

## 3. 우선순위별 발견 사항 및 수정 내용

### 높음 (배포 필수 / 보안 / 안정성)

| # | 에이전트 | 문제 | 파일 | 수정 내용 | 상태 |
|---|---|---|---|---|---|
| 1 | A·D·F | `pg.Pool` 에 `error` 리스너가 없어 유휴 커넥션 오류 시 프로세스 종료 | `src/lib/db.ts` | `pool.on("error")` 등록 | 완료 |
| 2 | A·D | `transaction()` 의 ROLLBACK 실패가 원본 예외를 덮고, 오염된 커넥션이 풀로 반환 | `src/lib/db.ts` | ROLLBACK 을 자체 try 로 감싸 원본 예외 보존, 실패 시 `release(err)` 로 폐기 | 완료 |
| 3 | B·E·F | `DATABASE_URL` 하드코딩 fallback(비밀번호 포함) 3곳 | `src/lib/db.ts`, `scripts/migrate.ts`, `scripts/seed.ts` | fallback 제거 + fail-fast. 풀은 지연 생성해 빌드 시점 실패 방지 | 완료 |
| 4 | D | 프로덕션에서 풀을 전역 캐시하지 않아 모듈 중복 평가 시 풀 다중 생성 | `src/lib/db.ts` | 환경 구분 없이 전역 싱글턴 유지 | 완료 |
| 5 | D·E | 500 응답에 `e.message`(pg 에러의 테이블·컬럼·호스트) 그대로 노출 | `src/lib/api-helpers.ts` | 프로덕션에서는 generic 메시지, 상세는 서버 로그로 | 완료 |
| 6 | A | 검색 ILIKE 가 서로 다른 테이블 컬럼을 OR 로 묶어 trigram 인덱스 4개가 전부 미사용(`idx_scan=0`) | `src/lib/repositories/orders.ts` | 테이블별 `UNION` 으로 분해. 5개 키워드로 결과 동일성 실측 검증 | 완료 |
| 7 | D | 주문 33필드 매핑이 두 파일에 완전 중복 | `repositories/orders.ts`, `customers.ts` | `mapOrder` 를 export 해 재사용 (customers.ts 145→109줄) | 완료 |
| 8 | E | `bulk-delete` 의 `ids` 배열에 상한이 없어 단일 요청으로 전량 삭제 가능 | `src/lib/validation.ts` | `.max(500)` 추가 | 완료 |
| 9 | E·S-01 | 모든 API 가 무인증 (파괴적 삭제 포함) | 전 라우트 | **수동 조치** — 6장 참고 | 미적용 |
| 10 | E·S-02 | CSRF 방어 부재 | 전 라우트 | **수동 조치** — 6장 참고 | 미적용 |

### 중간 (성능 / 운영)

| # | 에이전트 | 문제 | 파일 | 수정 내용 | 상태 |
|---|---|---|---|---|---|
| 11 | A | 쿼리 타임아웃 미설정 — 느린 쿼리가 풀 슬롯 무기한 점유 | `src/lib/db.ts` | `statement_timeout`/`query_timeout`/`idle_in_transaction_session_timeout` 추가 | 완료 |
| 12 | A·B | `PGPOOL_MAX` 가 빈 문자열이면 `max:0` 으로 풀이 잠김 | `src/lib/db.ts` | 양의 정수 검증 후 기본값 10 | 완료 |
| 13 | A·D | graceful shutdown 부재 | `src/lib/db.ts` | 프로덕션에서 SIGTERM/SIGINT 시 `pool.end()` | 완료 |
| 14 | E | `/api/customers` 의 page/pageSize 가 `Number()` 변환만 — `?page=abc` → 500 | `api/customers/route.ts` | `customerListQuerySchema` 적용 (400 반환 확인) | 완료 |
| 15 | E·F | `/api/stats/*` 의 `date` 미검증 — `?date=zzz` → 500 | `api/stats/*` 4개 | `statsQuerySchema` 적용 | 완료 |
| 16 | A | `getQuickStats` 가 전체 주문 조인 후 집계에서 날짜 필터 | `repositories/stats.ts` | 날짜 조건을 `ON` 절로 이동. 9개 상태 결과 동일성 실측 | 완료 |
| 17 | A | 고객 검색의 `coalesce()` 래핑이 인덱스 사용을 차단, WHERE 괄호 누락 | `repositories/customers.ts` | `coalesce` 제거 + 괄호 추가 | 완료 |
| 18 | A·F | `getCustomerWithOrders` 가 LIMIT 없이 전량 조회 | `repositories/customers.ts` | 안전 상한 `LIMIT 200` | 완료 |
| 19 | A | 고객 목록 count 가 집계 뷰를 거쳐 전체 GROUP BY 유발 | `repositories/customers.ts` | 원본 `customers` 테이블에서 카운트 | 완료 |
| 20 | A | `getOrder` 의 files/history 조회가 직렬 | `repositories/orders.ts` | `Promise.all` 병렬화 | 완료 |
| 21 | A·D | count/목록 쿼리가 같은 파라미터 배열을 공유하는 순서 의존 | `repositories/orders.ts` | 배열 스냅샷으로 분리 | 완료 |
| 22 | D·E | `ProductThumb` 이 DB `icon_path` 를 검증 없이 SVG 주입 | `src/components/icons.tsx` | 도형 태그 화이트리스트 sanitize. 시드 11종 통과·공격 5종 차단 검증 | 완료 |
| 23 | D | `Toast` 타이머가 언마운트 시 미정리 | `src/components/Toast.tsx` | cleanup 추가 + 불필요한 `useMemo` 제거 | 완료 |
| 24 | D | 빈 catch 4곳 — 실패 원인 추적 불가 | `OrdersView`, `AppShell`, `settings`, `client-api` | `console.warn` 로깅 추가 (화면 동작 불변) | 완료 |
| 25 | D | 클릭 가능한 `<tr>` 이 키보드로 접근 불가 | `OrdersView.tsx`, `customers/page.tsx` | `tabIndex`/`aria-label`/Enter·Space 핸들러 추가 | 완료 |
| 26 | D | 모달에 포커스 이동/복원 없음 | `src/components/Modal.tsx` | 열릴 때 첫 포커서블로 이동, 닫힐 때 복원 | 완료 |
| 27 | E | `docker-compose.yml`·`package.json` 에 DB 비밀번호 평문 | `docker-compose.yml`, `package.json` | `\${POSTGRES_PASSWORD:?}` 로 환경변수화, `db:psql` 의 PGPASSWORD 제거 | 완료 |
| 28 | B·E | `.env.example` 에 실제 비밀번호, DB 호스트가 로컬 기준 | `.env.example` | `shared-postgres:5432` 기본값 + `CHANGE_ME` 플레이스홀더로 재작성 | 완료 |
| 29 | B·F | DB 연결 실패 503 응답이 `docker compose up -d` 안내를 노출 | `src/lib/api-helpers.ts` | 프로덕션에서 중립 메시지 | 완료 |
| 30 | G | `engines` 부재로 배포 Node 버전 통제 불가 | `package.json` | `"node": ">=22.13.0"` 명시 | 완료 |
| 31 | F | `/health` 가 정적 프리렌더로 전환될 여지 | `src/app/health/route.ts` | `export const dynamic = "force-dynamic"` | 완료 |
| 32 | A | seed 의 COMMIT 이후 코드가 try 안에 있어 불필요한 ROLLBACK 시도 | `scripts/seed.ts` | COMMIT 이후 분리 + `ANALYZE` 추가 | 완료 |

### 낮음 (품질 / 관리)

| # | 에이전트 | 문제 | 파일 | 수정 내용 | 상태 |
|---|---|---|---|---|---|
| 33 | C | `apiUrl()` 이 선행 슬래시·후행 슬래시 경계를 처리하지 않음 | `src/lib/api.ts` | 정규화 로직 + `basePath` export | 완료 |
| 34 | C | `settings` 화면이 정규화 전 원본 env 를 표시 | `src/app/settings/page.tsx` | `basePath` import 사용 | 완료 |
| 35 | A·E | `SORT_SQL` 이 프로토타입 체인 멤버를 반환할 수 있음 | `repositories/orders.ts` | `Map` 으로 교체 (`?sort=constructor` → 400 확인) | 완료 |
| 36 | E·F | `/api/stats/trend` 의 `months` 가 음수·거대값 허용 | `api/stats/trend/route.ts` | `trendQuerySchema` (1~120) | 완료 |
| 37 | E | 파일명에 경로 구분자 허용 (향후 업로드 기능 대비) | `src/lib/validation.ts` | 경로 구분자·널바이트 차단 | 완료 |
| 38 | E | 상품 `linkUrl` 스킴 미검증 (저장형 오픈 리다이렉트) | `src/lib/validation.ts` | http(s) 만 허용 | 완료 |
| 39 | E | 보안 응답 헤더 전무 | `next.config.ts` | X-Frame-Options / nosniff / Referrer-Policy 추가 (CSP 는 제외, 6장 참고) | 완료 |
| 40 | A·D·E | `listOrderIds` 데드코드 (pageSize 10000 이 200 으로 잘리는 잠재 버그 포함) | `repositories/orders.ts` | 삭제 | 완료 |
| 41 | C·D | `SIDEBAR_MENUS`, `orderNoShort()` 미사용 | `constants.ts`, `format.ts` | 삭제 | 완료 |
| 42 | C·D | `public/*.svg` 5개 참조 0건 | `public/` | 삭제 | 완료 |
| 43 | D | `products/page.tsx` 만 다른 로딩 패턴 (abort 시 로딩 고착) | `src/app/products/page.tsx` | `useAsyncData` 로 통일 | 완료 |
| 44 | D | 동작하지 않는 `<button>` 이 스크린리더에 버튼으로 읽힘 | `src/app/customers/page.tsx` | `<span>` 으로 교체 | 완료 |
| 45 | D | 선택 상태 조회가 O(n²) | `OrdersView.tsx` | `Set` 으로 교체 | 완료 |
| 46 | A | INT8 파서가 2^53 초과 시 조용히 정밀도 손실 | `src/lib/db.ts` | `Number.isSafeInteger` 가드 | 완료 |
| 47 | B·A | `SEED_ORDER_COUNT` 파싱 방어 부족 | `scripts/seed.ts` | 양의 정수 검증 | 완료 |
| 48 | G | `@types/node` 가 실행 환경(Node 22)과 불일치 | `package.json` | `^20` → `^22` | 완료 |
| 49 | B | `docker-compose.yml` 의 용도가 불명확 | `docker-compose.yml` | 로컬 개발 전용 주석 추가 | 완료 |

### 검토 후 적용하지 않은 항목

| 에이전트 | 제안 | 적용하지 않은 이유 |
|---|---|---|
| B·C·F | `next.config.ts` 에 `basePath` 직접 추가 | **지시서 명시**: basePath 는 Docker Manager 가 승인 시 자동 주입합니다. 직접 추가하면 객체 키가 중복되어 빌드가 깨집니다. 대신 basePath 를 주입한 상태로 빌드·기동해 헬스체크 200 을 실측 검증했습니다 |
| E | CSP 헤더 추가 | Next.js 인라인 스크립트 때문에 nonce 전략이 필요하고 서브패스와 상호작용합니다. 에이전트 E 도 "적용 후 전 화면 확인 선행" 을 조건으로 달았습니다 |
| A | `resolveProductId` UPSERT 전환 | `ON CONFLICT` 시에도 `nextval()` 이 호출되어 시퀀스를 소모하는 부작용이 있습니다 |
| A | `getMonthlyTrend` 에 날짜 술어 추가 | 결과 집합이 "데이터가 있는 N개월" → "최근 N개월" 로 바뀝니다. **비즈니스 로직 변경 금지** 원칙에 저촉 |
| A | 존재 확인 SELECT 제거 (TOCTOU) | 이득 대비 에러 매핑 동작이 미묘하게 달라질 위험 |
| A·D | `listOrders` 를 `count(*) OVER ()` 로 통합 | 빈 페이지에서 total 이 0 이 되어 페이지네이션 표시가 달라집니다 |
| D | `OrdersView.tsx`(785줄) 컴포넌트 분리 | 우선순위 낮음(품질). 렌더 결과가 동일해야 하는 대규모 구조 변경이라 별도 작업으로 분리 |
| D | `globals.css` / `seed.ts` 파일 분할 | 위와 동일 |
| D | `Record<string, unknown>` → row 인터페이스 도입 | 위와 동일. 타입 안전성 개선이나 33×3 필드 선언이 필요 |
| F·D·E | `/api/hello` 삭제 | **사용자가 프로젝트 생성 시 명시적으로 요청한 예시 라우트**입니다. 임의 삭제하지 않았습니다. 배포 전 제거 여부는 6장 참고 |
| G | ESLint 10 / TypeScript 7 업그레이드 | 취약점 0건이며 메이저 업그레이드는 회귀 검증이 필요합니다 |

## 4. 에이전트별 분석 요약

| 에이전트 | 영역 | 상태 | 발견 문제 수 | 수정 완료 수 |
|---|---|---|---|---|
| A | DB 커넥션 / 쿼리 | 문제 있음 | 23 | 15 |
| B | 환경변수 / 설정 | 문제 있음 | 17 | 13 |
| C | 서브패스 경로 호환성 | 대체로 양호 | 5 | 3 |
| D | 코드 품질 | 문제 있음 | 34 | 20 |
| E | 보안 | 문제 있음 | 24 | 14 |
| F | Docker Manager 호환성 | 문제 있음 | 9 | 6 |
| G | 의존성 | 양호 (취약점 0건) | 6 | 2 |
| **합계** | | | **118** (중복 포함) | **49건 반영** |

에이전트 간 중복 보고가 많아(예: `pool.on("error")` 는 A·D·F 가 동시 지적) 고유 항목 기준으로는 49건을 수정했습니다.

## 5. 생성된 파일

| 파일 | 내용 |
|---|---|
| `.env.example` | 재작성. 코드가 실제 참조하는 변수만 포함, Docker Manager 기본값 |
| `RECOMMENDED-INDEXES.sql` | 에이전트 A 의 인덱스 권장사항 (현 데이터 규모에서는 적용 보류 권고 포함) |
| `IMPROVEMENTS.md` | 이 문서 |
| `README.md` | 갱신 (Phase 6) |

## 6. 수동 조치 필요 항목

1. **인증/인가 도입 결정 (최우선)** — 모든 API 가 무인증입니다. 특히 `DELETE /api/orders/:id` 와
   `POST /api/orders/bulk-delete` 는 되돌릴 수 없는 데이터 손실로 직결됩니다.
   일괄 삭제는 500건 상한을 걸어 두었지만 근본 해결은 아닙니다.
   - 권장(코드 변경 0): Nginx `location /c/프로젝트명/` 에 IP allowlist 또는 `auth_basic`
   - 또는 Docker Manager 레벨 SSO / 포워드 인증 연동

2. **CSRF 방어** — `request.json()` 은 Content-Type 을 검증하지 않아 `text/plain` POST 가
   preflight 없이 도달합니다. Origin / Sec-Fetch-Site 검사 미들웨어가 필요하나,
   서브패스 프록시 뒤에서 `req.nextUrl.origin` 이 내부 origin 으로 잡힐 수 있어
   Nginx 의 `proxy_set_header Host / X-Forwarded-Proto` 설정과 함께 검증해야 합니다.

3. **DB 비밀번호 로테이션** — 하드코딩되어 있던 DB 비밀번호를 환경변수로 옮겼지만
   **Git 히스토리에는 값이 남아 있습니다.** 환경변수화만으로는 실효가 없으므로
   배포 시 새 비밀번호로 교체하세요.

4. **`NEXT_PUBLIC_BASE_PATH` 주입 시점** — 이 변수는 클라이언트 번들에 **빌드 시점**에 인라인됩니다.
   Dockerfile 에서 `ENV NEXT_PUBLIC_BASE_PATH` 가 반드시 `npm run build` **이전**에 있어야 합니다.
   배포 후 `/c/프로젝트명/settings` 화면의 **Base path** 항목이 `/c/프로젝트명` 으로
   표시되면 정상입니다 (진단 UI 내장).

5. **프로덕션 DB 스키마 초기화 경로** — `.next/standalone` 에는 `scripts/`·`db/` 와
   `tsx`/`dotenv`(devDependencies)가 포함되지 않아 컨테이너 안에서 `npm run db:migrate` 를
   실행할 수 없습니다. 빌드 머신이나 별도 접속으로 아래 중 하나를 수행하세요.
   ```bash
   DATABASE_URL=postgresql://... npm run db:migrate   # devDependencies 가 있는 환경에서
   # 또는
   psql "$DATABASE_URL" -f db/schema.sql && psql "$DATABASE_URL" -f db/reference-data.sql
   ```

6. **Rate limiting / 요청 본문 크기 제한** — App Router 에는 본문 크기 제한이 없습니다.
   Nginx 에 `client_max_body_size`, `limit_req_zone` 설정을 권장합니다.

7. **CSP 헤더** — 안전한 3종만 적용했습니다. CSP 는 Next.js 인라인 스크립트 때문에
   nonce 전략이 필요하며, 적용 시 전 화면 회귀 확인이 선행되어야 합니다.

8. **`/api/hello` 유지 여부** — 프로젝트 생성 시 요청받은 REST API 예시 라우트라 유지했습니다.
   실서비스에 불필요하면 `src/app/api/hello/` 디렉토리를 삭제하세요.

9. **로컬 Node 버전** — `engines` 를 `>=22.13.0` 으로 명시했습니다. 현재 개발 환경이
   v22.12.0 이라 `npm install` 시 EBADENGINE 경고가 표시됩니다(설치·빌드는 정상).
   Node 22.13 이상으로 올리면 사라집니다.

## 7. 검증 결과

- **DB 접속 환경**: 접속 가능 (`docker compose` postgres, healthy)
- **Sanity 테스트**: **PASS**
  - `tsc --noEmit` 통과
  - `eslint` 무경고
  - `next build` 성공 (27개 라우트)
  - **`DATABASE_URL` 없이도 빌드 성공** — Docker 이미지 빌드 환경 모사 검증
- **실행 검증**: **PASS**
  - 의존성 설치: 성공 (`npm audit` 취약점 0건)
  - 앱 실행: 성공 (`NODE_ENV=production` standalone)
  - 헬스체크 `GET /health`: **HTTP 200** `{"status":"ok"}`
  - basePath 시나리오 `GET /c/barunson-order-manager/health`: **HTTP 200**
  - 리다이렉트 루프: 없음 (`/c/.../` → 308 → 200, 1회로 종결)
  - 전 라우트 스모크 20개: 전부 200
  - CRUD 회귀: 생성 → 상태변경(이력 자동기록) → 파일 추가/삭제 → 수정 → 택배정보 → 일괄삭제 → 404 전부 정상
  - 서버 로그 unhandled/idle 에러: 0건
  - 실행 오류 수정 횟수: 0회
- **Docker Manager 호환성**: **PASS**
- **절대 경로 잔존 검사**: **PASS** (0건)
- **쿼리 재작성 동일성 실측**
  - 검색 UNION 재작성: 5개 키워드 모두 차집합 0
  - `getQuickStats` ON 절 이동: 9개 상태 전부 일치
  - `count(o.id)` → `count(o.order_status)`: 불일치 0
  - SVG sanitize: 시드 아이콘 11종 통과, 공격 페이로드 5종 차단
- **신규 검증 동작 확인** (기존 500 → 400)
  - `?page=abc`, `?date=zzz`, `?months=-1`, `?months=1e9`, `?sort=constructor`,
    `bulk-delete` 501건, 파일명 `../../etc/passwd` → 전부 **400**
- **시드 재현성**: `npm run db:reset` 재실행 시 동일 데이터(고객 336 / 주문 500 / 파일 522 / 이력 2,177)
- **미해결 오류**: 없음
- **롤백한 수정**: 없음

## 8. 롤백 방법

```bash
git diff 9b28100e5c20dfea3c9a3f4f43da4fff16fb0c83      # 변경 내역 확인
git checkout 9b28100e5c20dfea3c9a3f4f43da4fff16fb0c83 . # 원본으로 복구
```
