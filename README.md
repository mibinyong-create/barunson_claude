# 커스텀 주문관리 (Custom Order Manager)

웨딩 굿즈·커스텀 인쇄물 주문을 **접수 → 초안 → 인쇄 → 배송**까지 관리하는 어드민입니다.

`original/custom-order.html` (localStorage 기반 단일 파일 프로토타입)의 화면과 데이터 모델을
분석해 **Next.js(App Router) + TypeScript + REST API + PostgreSQL** 풀스택 애플리케이션으로
재구현한 것입니다. 원본의 디자인 토큰·클래스명·화면 흐름은 그대로 유지했습니다.

---

## 빠른 시작

```bash
# 1) PostgreSQL 컨테이너 기동 (호스트 5433 포트)
npm run db:up

# 2) 환경변수
cp .env.example .env

# 3) 의존성
npm install

# 4) 스키마 생성 + 샘플 데이터 500건 주입
npm run db:reset

# 5) 개발 서버
npm run dev            # http://localhost:3000
```

첫 화면의 주문일자 필터는 기준일(`2026-08-24`)로 걸려 있습니다.
전체 목록을 보려면 **"전체 주문건 보기"** 체크박스를 켜세요.

### npm 스크립트

| 스크립트 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` / `npm start` | 프로덕션 빌드 / 실행 (`output: 'standalone'`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:up` / `db:down` | postgres 컨테이너 기동 / 종료 |
| `npm run db:migrate` | `db/schema.sql` + `db/reference-data.sql` 실행 (**기존 데이터 삭제**) |
| `npm run db:seed` | 샘플 데이터 생성 (멱등 — 시드 고정 난수) |
| `npm run db:reset` | migrate + seed |
| `npm run db:psql` | 컨테이너 psql 접속 |

---

## 기술 스택

| 영역 | 선택 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) · React 19 · TypeScript |
| API | Next.js Route Handlers (REST) |
| DB | PostgreSQL 17 (Docker) |
| DB 접근 | `pg` (node-postgres) + 직접 작성한 SQL — ORM 없음 |
| 검증 | zod |
| 스타일 | 원본 HTML의 CSS를 그대로 이식한 `globals.css` (CSS 변수 기반) |
| 배포 | `output: 'standalone'` |

---

## 프로젝트 구조

```
.
├── docker-compose.yml          # postgres:17-alpine (호스트 5433 → 컨테이너 5432)
├── db/
│   ├── schema.sql              # 테이블·뷰·트리거·함수 DDL
│   └── reference-data.sql      # 상태/결제/택배사/상품 기준 데이터
├── scripts/
│   ├── migrate.ts              # 스키마 재생성
│   └── seed.ts                 # 샘플 데이터 생성
├── original/                   # 분석 대상 원본 프로토타입
│   ├── custom-order.html
│   └── README.md               # 원본 화면/동작 분석 문서
└── src/
    ├── app/
    │   ├── page.tsx            # 주문관리 (메인)
    │   ├── dashboard/          # 대시보드
    │   ├── customers/          # 고객관리
    │   ├── products/           # 상품관리
    │   ├── settings/           # 설정 (시스템 상태·코드 정의)
    │   ├── health/route.ts     # 얕은 헬스체크
    │   ├── globals.css         # 디자인 시스템
    │   └── api/                # REST API (아래 표 참고)
    ├── components/
    │   ├── AppShell.tsx        # 사이드바 + 상단바 + 페이지 헤드
    │   ├── Modal.tsx           # 공용 오버레이 (Esc/배경클릭 닫기)
    │   ├── Toast.tsx           # 전역 토스트
    │   ├── icons.tsx           # 인라인 SVG 아이콘 + 상품 썸네일
    │   └── orders/             # 주문 화면 구성요소 + 8종 오버레이
    ├── hooks/
    │   ├── useAsyncData.ts     # key 기반 조회 훅
    │   └── useDebounced.ts
    └── lib/
        ├── db.ts               # pg Pool + query/transaction
        ├── api.ts              # apiUrl / apiFetch (basePath 처리)
        ├── client-api.ts       # 프론트엔드용 API 클라이언트
        ├── repositories/       # SQL 계층 (orders/customers/products/stats/meta)
        ├── types.ts · validation.ts · format.ts · constants.ts
        └── api-helpers.ts      # 응답/에러 공통 처리
```

---

## 데이터베이스 설계

원본은 주문 1건이 고객명·상품명·첨부파일 배열까지 모두 들고 있는 **평면 객체**였습니다.
이를 다음과 같이 정규화했습니다.

```
order_statuses ─┐
payment_statuses┤
delivery_methods┼─< orders >─┬─ customers
couriers ───────┘            ├─ products
                             ├─< order_files          (attachment | draft)
                             └─< order_status_history (트리거 자동 기록)
```

### 테이블

| 테이블 | 역할 | 원본 대응 |
|---|---|---|
| `order_statuses` | 진행 상태 9종 + 색상 토큰 + `is_active_stage` / `is_quick_tile` | `STATUS_LIST`, `ACTIVE_STATUSES`, `QUICK_STATUSES`, CSS 변수 |
| `payment_statuses` | 결제 상태 3종 + 색상 | `.pill.pay-*` |
| `delivery_methods` | 수령 방법 2종 | `select[name=deliveryMethod]` |
| `couriers` | 택배사 5종 + 배송조회 URL 템플릿 | `select[name=courierCompany]` |
| `customers` | 고객 (이름+연락처 유니크) | `customerName`, `phone`, `address` |
| `products` | 상품 11종 + 슬러그 + 기본 단가 + SVG 아이콘 | `datalist#productList`, `PRODUCT_ICONS`, `PRODUCT_CODE_SLUGS` |
| `orders` | 주문 본문 | order 객체 |
| `order_files` | 첨부(`attachment`)·초안(`draft`) 파일 메타데이터 | `attachments[]`, `drafts[]` 두 배열을 통합 |
| `order_status_history` | 상태 변경 이력 | **신규** (원본에 없음) |
| `order_no_counters` | 연도별 주문번호 채번 | `nextOrderNo()` |

### 주요 설계 포인트

- **`orders.total_amount`** 은 `GENERATED ALWAYS AS (quantity * unit_price) STORED` 생성 컬럼입니다.
  원본이 매번 파생 계산하던 값을 DB가 보장합니다.
- **상태 이력 자동화** — `orders.order_status` 가 바뀌면 `log_order_status_change()` 트리거가
  `order_status_history` 에 이전/이후 상태를 기록합니다. INSERT 시에는 `'주문 등록'` 으로 남습니다.
- **주문번호 채번** — `next_order_no(year)` 함수가 `order_no_counters` 를 `INSERT … ON CONFLICT
  DO UPDATE … RETURNING` 으로 갱신해 동시성 안전하게 `ORD-2026-000123` 을 만듭니다.
- **`updated_at` 자동 갱신** — `set_updated_at()` 트리거.
- **조회 뷰 3종**
  - `order_list_view` — 목록 화면이 필요한 컬럼(고객명·상품명·품목코드·첨부 건수)을 조인해 한 번에
  - `customer_summary_view` — 고객별 주문 건수/누적 금액/진행중 건수
  - `product_summary_view` — 상품별 집계
- **검색 인덱스** — `pg_trgm` GIN 인덱스로 주문자명·연락처·상품명·주문번호 부분일치 검색.
- **품목코드**(`2026_keyring_01`)는 뷰에서 `주문연도 + 슬러그` 로 계산합니다.

---

## REST API

모든 응답은 JSON이며, 오류는 `{ "error": string, "details"?: unknown }` + 적절한 상태 코드입니다.

### 주문

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET` | `/api/orders` | 목록. `search` `status` `paymentStatus` `productId` `orderDate` `showAllDates` `sort` `page` `pageSize` |
| `POST` | `/api/orders` | 등록 (주문번호는 DB가 채번) |
| `GET` | `/api/orders/:id` | 상세 (첨부·초안·상태이력 포함) |
| `PUT` | `/api/orders/:id` | 전체 수정 |
| `DELETE` | `/api/orders/:id` | 단건 삭제 |
| `PATCH` | `/api/orders/:id/status` | 진행 상태만 변경 |
| `PATCH` | `/api/orders/:id/courier` | 택배 정보만 변경 |
| `POST` | `/api/orders/bulk-delete` | 다중 삭제 `{ ids: number[] }` |
| `GET`·`POST` | `/api/orders/:id/files` | 파일 목록 / 추가 (`kind=attachment\|draft`) |
| `DELETE` | `/api/orders/:id/files/:fileId` | 파일 삭제 |

`sort` 값: `orderDateDesc`(기본) · `orderDateAsc` · `weddingDateAsc` · `amountDesc`

### 통계 · 마스터 · 헬스체크

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET` | `/api/stats/summary?date=` | 전체/진행중/오늘 신규/총 금액 |
| `GET` | `/api/stats/chips` | 상태별 필터 칩 건수 |
| `GET` | `/api/stats/breakdown?date=&period=day\|week` | 품목별 주문 현황 (주간은 월~일) |
| `GET` | `/api/stats/quick?date=` | 진행상태별 건수 타일 |
| `GET` | `/api/stats/status-detail?date=&status=` | 특정 날짜·상태의 품목별 분해 |
| `GET` | `/api/stats/trend?months=12` | 월별 주문 추이 |
| `GET` | `/api/meta` | 상태·결제·수령방법·택배사·상품 코드 일체 |
| `GET` | `/api/customers`, `/api/customers/:id`, `PATCH /api/customers/:id` | 고객 |
| `GET` | `/api/products`, `/api/products/:id`, `PATCH /api/products/:id` | 상품 |
| `GET` | `/health` | 얕은 헬스체크 `{"status":"ok"}` |
| `GET` | `/api/health` | DB 연결까지 확인하는 심층 헬스체크 |

### 예시

```bash
# 목록 (전체 기간, 인쇄팀전달 상태, 금액 높은순)
curl "http://localhost:3000/api/orders?showAllDates=true&status=인쇄팀전달&sort=amountDesc&pageSize=5"

# 등록
curl -X POST http://localhost:3000/api/orders \
  -H 'Content-Type: application/json' \
  -d '{"customerName":"김도윤","phone":"010-1234-5678","productName":"아크릴 키링",
       "optionText":"원형 5cm / 시안 A","quantity":120,"unitPrice":2800,
       "orderDate":"2026-08-24","weddingDate":"2026-09-12","deliveryMethod":"택배배송",
       "shippingAddress":"서울시 마포구 양화로 12","paymentStatus":"결제대기",
       "orderStatus":"주문완료","withInvitation":true}'

# 상태 변경 (이력 자동 기록)
curl -X PATCH http://localhost:3000/api/orders/1/status \
  -H 'Content-Type: application/json' -d '{"orderStatus":"초안등록"}'
```

---

## 화면

### 주문관리 (`/`)

원본의 모든 상호작용을 재현했습니다.

- **필터** — 상태 칩(전체 + 9종, 건수 배지) · 결제 상태 · 검색(주문자명/주문번호/연락처/상품명,
  300ms 디바운스) · 주문일자 · 전체 주문건 보기 · 품목 필터
- **정렬** 4종, **페이지네이션** 10/25/50건
- **다중 선택** — 헤더 체크박스(부분 선택 시 indeterminate), 선택 삭제 + 확인 모달
- **예식일 임박 강조** — D-Day 10일 미만이면 빨간색
- **행 클릭 분기**
  | 클릭 위치 | 동작 |
  |---|---|
  | 주문번호 | 초안 업로드 드로어 (요약 + 요청사항 + 초안 + 상태 이력) |
  | 주문자명 | 고객 정보 모달 (해당 고객의 전체 주문) |
  | 상품 썸네일 | 바른손카드 상품 페이지 |
  | 📁 | 첨부파일 모달 |
  | 💬 | 고객 요청사항 모달 |
  | 그 외 | `배송완료` → 택배 정보 모달 / 그 외 → 주문 수정 모달 |
- **요약 탭** — 통계 타일, 품목별 주문 현황(일일/주간), 진행상태별 건수 타일
  (타일 클릭 → 상세 모달 → 행 클릭 시 상태+품목 필터가 걸린 목록으로 이동)

> 원본에서 **미구현이던 "신규 주문 등록" 버튼을 추가**했습니다. (원본은 폼만 있고 여는 버튼이 없었음)

### 그 외

- `/dashboard` — 통계 타일, 월별 주문 추이 막대 차트, 진행 상태별 분포, 주문 많은 상품 TOP 6
- `/customers` — 고객 목록/검색, 행 클릭 시 고객 상세 모달
- `/products` — 상품별 주문 건수·수량·누적 금액
- `/settings` — DB 연결 상태·응답시간·PostgreSQL 버전, 코드 테이블 정의

---

## 샘플 데이터

`npm run db:seed` 는 **시드 고정 난수(mulberry32)** 를 쓰므로 몇 번을 실행해도 동일한 데이터가 나옵니다.

| 항목 | 건수 |
|---|---|
| 고객 | 336명 |
| 주문 | 500건 (총 ₩212,005,200) |
| 첨부·초안 파일 | 522건 |
| 상태 변경 이력 | 2,177건 |
| 기준일(2026-08-24) 주문 | 8건 |

- **원본 프로토타입의 시드 26건**(`ORD-2026-000001` ~ `000026`)을 주문번호·날짜·옵션·메모까지
  그대로 재현하고, 그 뒤에 474건을 이어 생성합니다.
- 주문일은 2026년 전체에 분포하되 기준일 부근(성수기)에 가중치를 둡니다.
- 진행 상태는 *주문일로부터 흐른 시간* 과 *예식일까지 남은 기간* 으로 결정해
  파이프라인을 자연스럽게 따라가고, 약 3.5%는 취소 처리됩니다.
- 결제 상태·택배사·운송장·배송완료일·요청사항·첨부파일 유무를 상태에 맞춰 상관되게 생성합니다.
- 상태 이력은 주문일 ~ 완료일 사이에 단계를 고르게 분포시켜 재구성합니다.

생성량 조절:

```bash
SEED_ORDER_COUNT=2000 npm run db:seed
```

---

## 환경변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `DATABASE_URL` | `postgresql://order_admin:order_admin_pw@localhost:5433/order_manager` | DB 접속 URL |
| `PGPOOL_MAX` | `10` | 커넥션 풀 최대 크기 |
| `NEXT_PUBLIC_BASE_PATH` | (없음) | 서브패스 배포 시 `apiFetch` 가 붙일 prefix |
| `NEXT_PUBLIC_TODAY` | `2026-08-24` | 화면 기준일. 비우면 실제 오늘 날짜 |
| `PORT` / `HOSTNAME` | `3000` / `0.0.0.0` | standalone 서버 |

`NEXT_PUBLIC_TODAY` 는 원본이 `TODAY = "2026-08-24"` 로 하드코딩되어 있던 것을 환경변수로 뺀 것입니다.
샘플 데이터가 이 날짜를 기준으로 생성되므로, 기본값으로 두어야 화면이 자연스럽습니다.

---

## 프로덕션 실행

```bash
npm run build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
node .next/standalone/server.js
```

`output: 'standalone'` 이므로 `.next/standalone` 만 배포하면 됩니다.
정적 자산(`.next/static`, `public`)은 위처럼 함께 복사해야 합니다.

---

## 원본 대비 변경 사항

| 원본 | 이 프로젝트 |
|---|---|
| `localStorage` 저장 | PostgreSQL + REST API (기기·브라우저 간 공유) |
| 신규 주문 등록 버튼 없음 | 페이지 헤드에 **신규 주문 등록** 버튼 추가 |
| 개별 삭제 경로 없음 | `DELETE /api/orders/:id` 추가 (UI는 다중 선택 삭제 유지) |
| `TODAY` 하드코딩 | `NEXT_PUBLIC_TODAY` 환경변수 |
| 주문번호 연도 2026 고정 | 주문일자 연도 기준으로 채번 |
| 첨부/초안이 문자열 배열 | `order_files` 테이블 (크기·MIME·업로드 시각 기록) |
| 상태 이력 없음 | `order_status_history` + 자동 기록 트리거 |
| 사이드바 메뉴 4종 미구현 | 대시보드·고객관리·상품관리·설정 화면 구현 |
| 상품 링크 고정 | `products.link_url` 로 상품별 관리 |

### 남아 있는 제약

- **파일은 메타데이터만 저장합니다.** 실제 바이너리 업로드/다운로드는 구현하지 않았습니다
  (파일명·크기·MIME·업로드 시각만 기록). 원본과 동일한 범위입니다.
- **인증/권한이 없습니다.** 업로더는 `'스튜디오'` 로 고정되어 있습니다.
