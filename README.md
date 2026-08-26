# 커스텀 주문관리 (Custom Order Manager)

웨딩 굿즈·커스텀 인쇄물 주문을 **접수 → 초안 → 인쇄 → 배송**까지 관리하는 어드민입니다.

`original/custom-order.html` (localStorage 기반 단일 파일 프로토타입)의 화면과 데이터 모델을
분석해 **Next.js(App Router) + TypeScript + REST API + PostgreSQL** 풀스택 애플리케이션으로
재구현한 것입니다. 원본의 디자인 토큰·클래스명·화면 흐름은 그대로 유지했습니다.

---

## 빠른 시작

```bash
# 1) 환경변수 준비 (CHANGE_ME 를 실제 비밀번호로 바꾸고,
#    로컬 개발이면 DATABASE_URL 호스트를 localhost:5433 으로 두세요.
#    Docker 없이 PostgreSQL 을 직접 설치했다면 포트는 5432 입니다)
cp .env.example .env
$EDITOR .env

# 2) PostgreSQL 컨테이너 기동 (호스트 5433 포트)
#    ※ Docker 가 없다면(예: Intel MacBook) 아래 "로컬 PostgreSQL 실행" 절을 먼저 보세요.
npm run db:up

# 3) 의존성
npm install

# 4) 스키마 생성 + 샘플 데이터 500건 주입
npm run db:reset

# 5) 개발 서버
npm run dev            # http://localhost:3000
```

> `.env` 를 먼저 만들어야 합니다. `docker-compose.yml` 이 `POSTGRES_PASSWORD` 를 `.env` 에서 읽고,
> 앱과 스크립트도 `DATABASE_URL` 이 없으면 하드코딩 폴백 없이 즉시 실패합니다.

첫 화면의 주문일자 필터는 기준일(`2026-08-24`)로 걸려 있습니다.
전체 목록을 보려면 **"전체 주문건 보기"** 체크박스를 켜세요.

> **개발 환경 참고 — Intel MacBook.** 이 프로젝트의 개발자는 Intel(x86_64) MacBook 을 사용하며,
> **Docker Desktop 은 구동하지 않는 것을 전제로 합니다.** 위 2번(`npm run db:up`)은 Docker 가
> 있을 때의 경로이므로, 그대로 실행되지 않습니다. Docker 없이 PostgreSQL 을 띄우는 방법은
> 바로 아래 절을 보세요.

### 로컬 PostgreSQL 실행 (Docker Desktop 없이)

앱이 요구하는 것은 **접속 가능한 PostgreSQL 17 인스턴스 하나**뿐입니다.
`DATABASE_URL` 만 올바르면 `db:migrate` · `db:seed` · 개발 서버는 Docker 유무와 무관하게 동작합니다.
Docker 에 의존하는 것은 `db:up` / `db:down` / `db:psql` **세 개의 npm 스크립트뿐**이며, 아래에 대체 명령을 적어 두었습니다.

세 가지 선택지가 있습니다.

| 방법 | 포트 | `npm run db:up`/`db:psql` | 비고 |
|---|---|---|---|
| A. Homebrew `postgresql@17` | 5432 | 사용 불가 (대체 명령 사용) | **Intel Mac 권장.** 가장 가볍고 빠름 |
| B. Postgres.app | 5432 | 사용 불가 (대체 명령 사용) | GUI 로 기동/정지. 설치가 가장 쉬움 |
| C. Colima + docker CLI | 5433 | **그대로 사용 가능** | 기존 워크플로 유지. Linux VM 이 하나 더 뜸 |

#### 방법 A — Homebrew PostgreSQL 17 (권장)

```bash
brew install postgresql@17

# Intel Mac 의 Homebrew prefix 는 /usr/local 입니다. (Apple Silicon 은 /opt/homebrew)
echo 'export PATH="/usr/local/opt/postgresql@17/bin:$PATH"' >> ~/.zshrc
exec "$SHELL" -l

# 기동 (로그인 시 자동 시작). 기본 포트 5432
brew services start postgresql@17

# 계정 · DB 생성 — Homebrew 는 macOS 로그인 계정을 슈퍼유저로 만들어 둡니다.
psql -d postgres -c "CREATE ROLE order_admin LOGIN PASSWORD '실제비밀번호';"
createdb -O order_admin order_manager      # -O 로 소유자를 지정하는 것이 중요합니다 (아래 주의 참고)

# 컨테이너 설정(TZ/PGTZ=Asia/Seoul)과 동일하게 타임존 고정
psql -d order_manager -c "ALTER DATABASE order_manager SET timezone = 'Asia/Seoul';"
```

`.env` 의 `DATABASE_URL` 을 **5432** 로 맞춥니다. (5433 은 docker compose 가 호스트로 매핑하던 포트입니다.)

```bash
DATABASE_URL=postgresql://order_admin:실제비밀번호@localhost:5432/order_manager
```

이후는 동일합니다.

```bash
npm install
npm run db:reset       # 스키마 생성 + 샘플 데이터 500건
npm run dev
```

기동/정지/상태 확인:

```bash
brew services start postgresql@17
brew services stop  postgresql@17
brew services list
```

데이터는 `/usr/local/var/postgresql@17` 에 있습니다. 초기화는 볼륨 삭제가 아니라 `npm run db:reset` 으로 합니다.

#### 방법 B — Postgres.app

1. <https://postgresapp.com> 에서 내려받아 `/Applications` 에 설치 (Intel 빌드 제공).
2. 앱을 열고 **Initialize** → PostgreSQL 17 서버가 포트 5432 로 뜹니다.
3. CLI(`psql` · `createdb`) 경로 등록:

```bash
sudo mkdir -p /etc/paths.d
echo /Applications/Postgres.app/Contents/Versions/latest/bin | sudo tee /etc/paths.d/postgresapp
exec "$SHELL" -l
```

이후 계정·DB 생성과 `DATABASE_URL`(포트 5432)은 **방법 A 와 동일**합니다.
기동·정지는 메뉴 막대 아이콘에서 합니다.

#### 방법 C — Colima (docker compose 를 그대로 쓰고 싶을 때)

Docker Desktop 없이 Docker 엔진만 띄우는 방식입니다. `docker-compose.yml` 과 `db:*` 스크립트를
**수정 없이** 그대로 쓸 수 있고, 포트도 기존 **5433** 이 유지됩니다.

```bash
brew install colima docker docker-compose

# Homebrew 의 docker-compose 를 docker CLI 플러그인으로 연결 (Intel prefix: /usr/local)
mkdir -p ~/.docker/cli-plugins
ln -sfn /usr/local/opt/docker-compose/bin/docker-compose ~/.docker/cli-plugins/docker-compose

# macOS 13+ 라면 Apple Virtualization.framework 백엔드가 QEMU 보다 빠릅니다 (Intel 에서도 동작).
colima start --cpu 2 --memory 4 --vm-type vz
# macOS 12 이하라면 --vm-type 을 빼면 기본값 qemu 로 뜹니다.

npm run db:up                      # 이후 db:down · db:psql 도 그대로 동작
```

- Colima 의 기본 `vmType` 은 `qemu` 이며, **VM 생성 후에는 바꿀 수 없습니다.**
  백엔드를 바꾸려면 `colima delete` 후 다시 `colima start --vm-type vz` 로 만들어야 합니다.
- `--vm-type vz` 자체는 Intel Mac 에서도 됩니다(macOS 13 이상). **Apple Silicon 전용인 것은
  `--vz-rosetta` (amd64 에뮬레이션)** 이고, Intel Mac 은 amd64 가 네이티브라 애초에 필요 없습니다.
- 사용을 마치면 `colima stop` 으로 VM 을 내립니다. DB 하나만 필요한 상황이면 방법 A 가 더 가볍습니다.

#### 참고 — Intel Mac 에서 쓸 수 있는 Docker Desktop 대안 (2026-08 기준)

| 도구 | Intel Mac | 최소 macOS | 비용 | 메모 |
|---|---|---|---|---|
| **Colima** (+ docker CLI) | ✅ | 제한 없음 (`vz` 는 13+) | 무료 · OSS | CLI 전용. 가장 가볍고 이 프로젝트에 충분 |
| **OrbStack** | ✅ (Intel 빌드 별도 배포) | **14.0+** | 개인 무료 / 업무 $8·인·월 | 가장 빠르고 GUI 완비. macOS 14 미만이면 불가 |
| **Rancher Desktop** | ✅ (VT-x 필요) | 13+ | 무료 · OSS | GUI + Kubernetes. 8GB RAM·4코어 권장 |
| **Podman Desktop** | ⚠️ **기한 있음** | — | 무료 · OSS | **Podman 6 이 Intel Mac 지원 중단.** Podman Desktop 이 Intel 에는 Podman 5 를 계속 번들하나 **2027-06 까지** |
| **Finch** (AWS) | ✅ | 최근 2개 메이저 (26/15) | 무료 · OSS | 내부적으로 Lima 사용. 구형 macOS 면 대상 밖 |
| Docker Desktop | ✅ (중단 공지 없음) | 최신 + 직전 2개 메이저 | 개인/소규모 무료 | Intel 지원은 유지되나 구형 macOS 는 지원 창 밖 |

Intel MacBook 은 macOS 26 Tahoe 가 마지막 지원 버전이고 그마저 2019~2020 모델만 해당하므로,
구형 Intel 기기라면 **최소 macOS 요구사항이 사실상의 선택 기준**입니다.
OrbStack(14+)·Rancher(13+)·Finch(15+)가 막히는 경우에도 **Colima 는 QEMU 백엔드로 동작**합니다.

다만 이 프로젝트에 필요한 것은 컨테이너 런타임이 아니라 **PostgreSQL 하나**뿐이므로,
위 도구를 새로 도입하기보다 **방법 A(Homebrew) 를 권장**합니다.

#### 네이티브 설치 시 대체 명령

```bash
# npm run db:up / db:down  → brew services start|stop postgresql@17 (또는 Postgres.app 메뉴)

# npm run db:psql 대체
set -a; source .env; set +a
psql "$DATABASE_URL"

# 접속 확인
psql "$DATABASE_URL" -c "select version(), current_setting('TimeZone');"
```

#### 주의

- **`createdb -O order_admin` 으로 DB 소유자를 지정하세요.** `db/schema.sql` 이
  `DROP SCHEMA public CASCADE` 로 시작하는데, PostgreSQL 15+ 에서는 DB 소유자가 아니면
  `public` 스키마를 삭제할 권한이 없어 `npm run db:migrate` 가 실패합니다.
- **`pg_trgm` 확장이 필요합니다.** Homebrew·Postgres.app 모두 contrib 에 포함되어 있고,
  PostgreSQL 13+ 에서 trusted 확장이라 DB 소유자 권한이면 설치됩니다 (별도 슈퍼유저 불필요).
- **포트를 5433 으로 착각하지 마세요.** 네이티브 설치는 5432 입니다. `.env` 의 `DATABASE_URL`
  과 `.env.example` 주석의 5433 은 docker compose 전용 매핑 포트입니다.
- **`POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`** 는 `docker-compose.yml` 만 읽습니다.
  네이티브로 실행하면 이 값들은 무시되므로, 위 `CREATE ROLE` 에서 쓴 비밀번호가 곧 실제 값입니다.
- PostgreSQL 버전은 17 을 권장합니다(배포 환경과 동일). 스키마 자체는 15+ 면 동작합니다.

### npm 스크립트

| 스크립트 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` / `npm start` | 프로덕션 빌드 / 실행 (`output: 'standalone'`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:up` / `db:down` | postgres 컨테이너 기동 / 종료 (**Docker 필요**) |
| `npm run db:migrate` | `db/schema.sql` + `db/reference-data.sql` 실행 (**기존 데이터 삭제**) |
| `npm run db:seed` | 샘플 데이터 생성 (멱등 — 시드 고정 난수) |
| `npm run db:reset` | migrate + seed |
| `npm run db:psql` | 컨테이너 psql 접속 (`.env` 의 계정 정보 사용, **Docker 필요**) |

---

## 기술 스택

| 영역 | 선택 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) · React 19 · TypeScript |
| API | Next.js Route Handlers (REST) |
| DB | PostgreSQL 17 (Docker) |
| DB 접근 | `pg` (node-postgres) + 직접 작성한 SQL — ORM 없음 |
| 검증 | zod (요청 본문 + 쿼리스트링 전수 검증) |
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

| 변수 | 로컬 개발 | 배포 (Docker Manager) | 설명 |
|---|---|---|---|
| `DATABASE_URL` | `postgresql://order_admin:<PW>@localhost:5433/order_manager` (Docker 없이 네이티브 설치 시 **5432**) | `postgresql://order_admin:<PW>@shared-postgres:5432/order_manager` | **필수.** 미설정 시 폴백 없이 즉시 실패 |
| `PGPOOL_MAX` | `10` | `10` | 커넥션 풀 최대 크기 (양의 정수만 유효) |
| `POSTGRES_PASSWORD` / `POSTGRES_USER` / `POSTGRES_DB` | `.env` 값 | 사용 안 함 | 로컬 `docker-compose.yml` 전용 (네이티브 설치 시 무시됨) |
| `NEXT_PUBLIC_BASE_PATH` | (비움) | `/c/프로젝트명` | 서브패스 배포 시 `apiFetch` 가 붙일 prefix |
| `NEXT_PUBLIC_TODAY` | `2026-08-24` | (비움 권장) | 화면 기준일. 비우면 실제 오늘 날짜 |
| `PORT` / `HOSTNAME` | `3000` / `0.0.0.0` | 동일 | standalone 서버 |
| `SEED_ORDER_COUNT` | (선택) `500` | 사용 안 함 | 시드 생성 주문 건수 |

> **`NEXT_PUBLIC_*` 는 빌드 시점에 클라이언트 번들로 인라인됩니다.**
> 컨테이너 런타임 환경변수만 바꿔도 브라우저 동작은 바뀌지 않으므로,
> `NEXT_PUBLIC_BASE_PATH` 는 반드시 `npm run build` **이전**에 설정되어야 합니다.
> 비밀번호는 이 문서가 아니라 `.env`(커밋 금지)에서 관리하세요.

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

---

## 주의사항

- **Nginx 서브패스 환경**(`/c/프로젝트명/`)에 배포됩니다. 클라이언트에서 절대 경로로
  직접 `fetch` 하지 마세요. 반드시 `src/lib/api.ts` 의 `apiFetch()` / `apiUrl()` 을 쓰세요.
  (`<Link>` 와 `router.push` 는 Next.js 가 basePath 를 자동 적용하므로 절대 경로 그대로 둡니다.)
- **`.env` 를 Git 에 커밋하지 마세요.** `.gitignore` 에 포함되어 있으며,
  `.env.example` 에는 실제 비밀번호 대신 `CHANGE_ME` 플레이스홀더만 둡니다.
- **`docker-compose.yml` 은 로컬 개발 전용입니다.** 배포 환경에서는 Docker Manager 의
  공유 서비스 `shared-postgres` 를 사용합니다.
- **Docker Desktop 을 전제하지 않습니다.** 개발자 환경이 Intel MacBook 이라 Homebrew /
  Postgres.app 로 PostgreSQL 을 직접 띄우는 것을 기본 경로로 봅니다. 자세한 절차는
  [로컬 PostgreSQL 실행 (Docker Desktop 없이)](#로컬-postgresql-실행-docker-desktop-없이) 참고.
- **DB 스키마 재생성은 파괴적입니다.** `npm run db:migrate` 는 `DROP SCHEMA public CASCADE` 로
  시작합니다. `DATABASE_URL` 을 반드시 확인하세요 (미설정 시 실행되지 않고 종료됩니다).
- **`NEXT_PUBLIC_TODAY`** 는 데모용 고정 기준일입니다. 실제 운영에서는 비워 두세요.

## 알려진 이슈

- **모든 API 가 무인증입니다.** 특히 `DELETE /api/orders/:id` 와 `POST /api/orders/bulk-delete`
  는 되돌릴 수 없는 삭제를 수행합니다. 일괄 삭제에 500건 상한을 두었으나 근본 대책은 아니며,
  배포 전 Nginx IP allowlist / Basic Auth 또는 SSO 연동이 필요합니다.
- **CSRF 방어가 없습니다.** 상태 변경 메서드에 대한 Origin 검사 미들웨어가 필요하지만,
  서브패스 프록시 설정과 함께 검증해야 해서 적용하지 않았습니다.
- **DB 비밀번호가 Git 히스토리에 남아 있습니다.** 환경변수로 옮겼으나 과거 커밋에서는 읽을 수
  있으므로, 배포 시 새 비밀번호로 교체하세요.
- **CSP 헤더가 없습니다.** `X-Frame-Options` / `X-Content-Type-Options` / `Referrer-Policy` 만
  적용했습니다. CSP 는 Next.js 인라인 스크립트 때문에 nonce 전략이 필요합니다.
- **Rate limiting 과 요청 본문 크기 제한이 없습니다.** Nginx 단에서 처리하세요.
- **`engines` 가 Node 22.13+ 를 요구합니다.** 그보다 낮은 로컬 Node 에서는 `npm install` 시
  EBADENGINE 경고가 표시됩니다 (설치·빌드는 정상 동작).

자세한 내용은 [IMPROVEMENTS.md](./IMPROVEMENTS.md) 의 "수동 조치 필요 항목" 을 참고하세요.
