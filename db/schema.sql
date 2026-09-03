-- =============================================================================
--  커스텀 주문관리 (Custom Order Manager) — PostgreSQL 스키마
--  original/custom-order.html 의 화면/데이터 모델을 정규화한 결과입니다.
--
--  실행:  npm run db:migrate   (scripts/migrate.ts 가 이 파일을 통째로 실행)
--  ※ 멱등(idempotent) 하지 않습니다. DROP SCHEMA 후 재생성합니다.
-- =============================================================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- -----------------------------------------------------------------------------
-- 공통: updated_at 자동 갱신 트리거 함수
-- -----------------------------------------------------------------------------
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 1. 코드 테이블 (화면의 칩 / 셀렉트 박스 원본)
-- =============================================================================

-- 진행 상태 10종. 색상 토큰까지 DB 에서 관리해 프론트 칩 색을 그대로 재현합니다.
CREATE TABLE order_statuses (
  code            text    PRIMARY KEY,
  sort_order      smallint NOT NULL,
  -- '진행중' 집계에 포함되는 상태인지 (배송완료·취소 제외 = 원본의 ACTIVE_STATUSES)
  is_active_stage boolean NOT NULL DEFAULT true,
  -- 요약 탭 '진행상태별 건수' 타일로 노출되는 상태인지 (원본의 QUICK_STATUSES)
  is_quick_tile   boolean NOT NULL DEFAULT false,
  css_class       text    NOT NULL,
  ink_color       text    NOT NULL,
  bg_color        text    NOT NULL
);
COMMENT ON TABLE order_statuses IS '주문 진행 상태 코드 (원본 STATUS_LIST)';

CREATE TABLE payment_statuses (
  code       text     PRIMARY KEY,
  sort_order smallint NOT NULL,
  css_class  text     NOT NULL,
  ink_color  text     NOT NULL,
  bg_color   text     NOT NULL
);
COMMENT ON TABLE payment_statuses IS '결제 상태 코드';

CREATE TABLE delivery_methods (
  code             text     PRIMARY KEY,
  sort_order       smallint NOT NULL,
  requires_address boolean  NOT NULL DEFAULT false
);
COMMENT ON TABLE delivery_methods IS '수령 방법 코드';

CREATE TABLE couriers (
  id                    serial   PRIMARY KEY,
  name                  text     NOT NULL UNIQUE,
  tracking_url_template text,
  sort_order            smallint NOT NULL DEFAULT 0,
  is_active             boolean  NOT NULL DEFAULT true
);
COMMENT ON TABLE couriers IS '택배사';
COMMENT ON COLUMN couriers.tracking_url_template IS '{{no}} 자리에 운송장번호를 치환';

-- 외주 제작 업체. 발주관리에서 발주처로 선택한다.
CREATE TABLE vendors (
  id         serial   PRIMARY KEY,
  name       text     NOT NULL UNIQUE,
  category   text,                          -- 취급 품목 (아크릴 / 인쇄 / 스탬프 등)
  contact    text,                          -- 담당자
  phone      text,
  memo       text,
  sort_order smallint NOT NULL DEFAULT 0,
  is_active  boolean  NOT NULL DEFAULT true
);
COMMENT ON TABLE vendors IS '외주 제작 업체 (발주처)';


-- =============================================================================
-- 2. 마스터 테이블
-- =============================================================================

CREATE TABLE customers (
  id         serial      PRIMARY KEY,
  name       text        NOT NULL,
  phone      text,
  address    text,
  memo       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE customers IS '주문 고객. 원본의 customerName/phone/address 를 분리';

-- 동명이인은 연락처로 구분한다. 연락처가 없으면 이름만으로 유일.
CREATE UNIQUE INDEX customers_name_phone_uk ON customers (name, coalesce(phone, ''));
CREATE INDEX customers_name_trgm_idx  ON customers USING gin (name gin_trgm_ops);
CREATE INDEX customers_phone_trgm_idx ON customers USING gin (phone gin_trgm_ops);

CREATE TRIGGER customers_set_updated_at
  BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();


CREATE TABLE products (
  id                 serial      PRIMARY KEY,
  name               text        NOT NULL UNIQUE,
  -- 품목코드 생성용 슬러그. 원본 PRODUCT_CODE_SLUGS 와 동일 (미등록 상품은 'item')
  slug               text        NOT NULL UNIQUE,
  default_unit_price integer     NOT NULL DEFAULT 0 CHECK (default_unit_price >= 0),
  -- 매입단가 (원가). 마진 계산용. 0 이면 미입력.
  purchase_price     integer     NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  -- 원본 PRODUCT_ICONS 의 인라인 SVG path 문자열
  icon_path          text,
  link_url           text,
  sort_order         smallint    NOT NULL DEFAULT 0,
  is_active          boolean     NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE products IS '커스텀 상품 마스터 (원본 datalist#productList 11종)';

CREATE INDEX products_name_trgm_idx ON products USING gin (name gin_trgm_ops);

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- 3. 주문
-- =============================================================================

CREATE TABLE orders (
  id               serial      PRIMARY KEY,
  order_no         text        NOT NULL UNIQUE,
  customer_id      integer     NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  product_id       integer     NOT NULL REFERENCES products(id)  ON DELETE RESTRICT,
  option_text      text,
  quantity         integer     NOT NULL CHECK (quantity >= 1),
  -- 실제 인쇄 수량 (여분·불량 대비). 미입력이면 주문수량과 동일하게 본다.
  print_quantity   integer     CHECK (print_quantity IS NULL OR print_quantity >= 0),
  unit_price       integer     NOT NULL CHECK (unit_price >= 0),
  -- 원본에서 quantity × unitPrice 로 매번 파생 계산하던 값 = 생성 컬럼
  total_amount     integer     GENERATED ALWAYS AS (quantity * unit_price) STORED,
  order_date       date        NOT NULL,
  wedding_date     date        NOT NULL,
  delivery_method  text        NOT NULL REFERENCES delivery_methods(code),
  shipping_address text,
  -- 출고일 (택배 접수/발송 처리한 날). 출고관리 화면에서 기록.
  dispatched_date  date,
  -- 인쇄구분 (인쇄작업 화면). NULL 이면 내부디지털로 본다.
  print_method     text        CHECK (print_method IN ('내부디지털', '5층인쇄', '외부생산')),
  -- 원본 작업 파일 (구글 드라이브 링크, 줄바꿈으로 여러 개). 인쇄팀 전달 전 등록.
  source_links     text,
  payment_status   text        NOT NULL REFERENCES payment_statuses(code),
  order_status     text        NOT NULL REFERENCES order_statuses(code),
  with_invitation  boolean     NOT NULL DEFAULT false,
  courier_id       integer     REFERENCES couriers(id) ON DELETE SET NULL,
  tracking_number  text,
  delivered_date   date,
  memo             text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT orders_delivered_after_order
    CHECK (delivered_date IS NULL OR delivered_date >= order_date)
);
COMMENT ON TABLE orders IS '주문 1건. 원본 localStorage 의 order 객체에 대응';
COMMENT ON COLUMN orders.order_no IS 'ORD-{연도}-{6자리 일련번호}';
COMMENT ON COLUMN orders.total_amount IS '수량 × 단가 (생성 컬럼)';

CREATE INDEX orders_order_date_idx     ON orders (order_date DESC);
CREATE INDEX orders_wedding_date_idx   ON orders (wedding_date);
CREATE INDEX orders_order_status_idx   ON orders (order_status);
CREATE INDEX orders_payment_status_idx ON orders (payment_status);
CREATE INDEX orders_customer_idx       ON orders (customer_id);
CREATE INDEX orders_product_idx        ON orders (product_id);
CREATE INDEX orders_total_amount_idx   ON orders (total_amount DESC);
CREATE INDEX orders_order_no_trgm_idx  ON orders USING gin (order_no gin_trgm_ops);
-- 요약 탭의 '기준일 + 상태' 집계용
CREATE INDEX orders_date_status_idx    ON orders (order_date, order_status);

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- 첨부파일 / 초안 파일. 원본에서는 attachments·drafts 두 개의 문자열 배열이었으나
-- kind 로 구분하는 단일 테이블로 통합합니다.
CREATE TYPE order_file_kind AS ENUM ('attachment', 'draft');

CREATE TABLE order_files (
  id           serial          PRIMARY KEY,
  order_id     integer         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kind         order_file_kind NOT NULL,
  file_name    text            NOT NULL,
  file_size    bigint          CHECK (file_size IS NULL OR file_size >= 0),
  content_type text,
  -- 초안/첨부의 실제 바이너리. NULL 이면 메타데이터만 등록된 파일(구 방식).
  -- 애플리케이션에서 8MB 상한을 강제한다.
  data         bytea,
  uploaded_by  text            NOT NULL DEFAULT '스튜디오',
  uploaded_at  timestamptz     NOT NULL DEFAULT now()
);
COMMENT ON TABLE order_files IS '주문별 첨부파일(attachment)·초안(draft). data 가 있으면 실제 파일까지 보관';

CREATE INDEX order_files_order_kind_idx ON order_files (order_id, kind);


-- 진행 상태 변경 이력. 원본에는 없던 테이블이지만 상태 흐름 추적을 위해 추가.
CREATE TABLE order_status_history (
  id          serial      PRIMARY KEY,
  order_id    integer     NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status text        REFERENCES order_statuses(code),
  to_status   text        NOT NULL REFERENCES order_statuses(code),
  note        text,
  changed_by  text        NOT NULL DEFAULT '스튜디오',
  changed_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE order_status_history IS '주문 진행 상태 변경 이력 (트리거로 자동 기록)';

CREATE INDEX order_status_history_order_idx ON order_status_history (order_id, changed_at DESC);

-- orders.order_status 가 바뀌면 이력을 자동으로 남깁니다.
CREATE FUNCTION log_order_status_change() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO order_status_history (order_id, from_status, to_status, note)
    VALUES (NEW.id, NULL, NEW.order_status, '주문 등록');
  ELSIF NEW.order_status IS DISTINCT FROM OLD.order_status THEN
    INSERT INTO order_status_history (order_id, from_status, to_status)
    VALUES (NEW.id, OLD.order_status, NEW.order_status);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_log_status_change
  AFTER INSERT OR UPDATE OF order_status ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_status_change();


-- 외주 발주 기록. 외주발주(외부 업체 제작) 주문을 언제 어디로 넘겼는지 남긴다.
-- 주문 1건당 발주 1건 (order_id UNIQUE).
CREATE TABLE purchase_orders (
  id            serial      PRIMARY KEY,
  order_id      integer     NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  vendor_name   text        NOT NULL,
  po_number     text,
  ordered_date  date        NOT NULL,          -- 발주일 (주문을 업체에 넘긴 날)
  vendor_shipped_date date,                    -- 업체 출고일 (업체가 완제품을 발송한 날)
  unit_cost     integer     CHECK (unit_cost IS NULL OR unit_cost >= 0),
  quantity      integer     CHECK (quantity IS NULL OR quantity >= 0),
  status        text        NOT NULL DEFAULT '발주'
                            CHECK (status IN ('발주', '제작중', '입고완료', '취소')),
  order_site       text,                       -- 발주한 주문 사이트 (업체 발주 포털 URL·명칭)
  payment_method   text        CHECK (payment_method IS NULL OR payment_method IN ('카드', '현금', '계좌이체', '기타')),
  inbound_courier_id integer   REFERENCES couriers(id) ON DELETE SET NULL,  -- 업체 → 스튜디오 입고 택배사
  tracking_number  text,                       -- 입고 운송장번호
  note          text,
  created_by    text        NOT NULL DEFAULT '스튜디오',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE purchase_orders IS '외주 발주 기록 (외주발주 주문의 업체·발주일·단가·입고 상태)';

CREATE INDEX purchase_orders_status_idx ON purchase_orders (status, ordered_date DESC);

CREATE TRIGGER purchase_orders_set_updated_at
  BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- 4. 주문번호 채번 (ORD-2026-000001)
-- =============================================================================

CREATE TABLE order_no_counters (
  year     integer PRIMARY KEY,
  last_seq integer NOT NULL DEFAULT 0
);

-- UPSERT + RETURNING 으로 동시성 안전하게 다음 번호를 채번합니다.
CREATE FUNCTION next_order_no(p_year integer) RETURNS text AS $$
DECLARE
  v_seq integer;
BEGIN
  INSERT INTO order_no_counters (year, last_seq)
  VALUES (p_year, 1)
  ON CONFLICT (year) DO UPDATE SET last_seq = order_no_counters.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN 'ORD-' || p_year::text || '-' || lpad(v_seq::text, 6, '0');
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 5. 조회용 뷰 — 목록 화면이 필요로 하는 컬럼을 한 번에
-- =============================================================================

CREATE VIEW order_list_view AS
SELECT
  o.id,
  o.order_no,
  -- 원본 orderNoShort(): 뒤 6자리
  right(o.order_no, 6)                            AS order_no_short,
  o.customer_id,
  c.name                                          AS customer_name,
  c.phone                                         AS customer_phone,
  c.address                                       AS customer_address,
  o.product_id,
  p.name                                          AS product_name,
  p.slug                                          AS product_slug,
  p.icon_path                                     AS product_icon_path,
  p.link_url                                      AS product_link_url,
  -- 원본 productCode(): {주문연도}_{슬러그}_01
  extract(year FROM o.order_date)::int || '_' || p.slug || '_01' AS product_code,
  o.option_text,
  o.quantity,
  o.print_quantity,
  o.unit_price,
  o.total_amount,
  o.order_date,
  o.wedding_date,
  o.delivery_method,
  o.shipping_address,
  o.dispatched_date,
  o.print_method,
  o.source_links,
  o.payment_status,
  o.order_status,
  os.is_active_stage                              AS is_active_stage,
  o.with_invitation,
  o.courier_id,
  cr.name                                         AS courier_name,
  cr.tracking_url_template,
  o.tracking_number,
  o.delivered_date,
  o.memo,
  o.created_at,
  o.updated_at,
  coalesce(f.attachment_count, 0)                 AS attachment_count,
  coalesce(f.draft_count, 0)                      AS draft_count
FROM orders o
JOIN customers      c  ON c.id  = o.customer_id
JOIN products       p  ON p.id  = o.product_id
JOIN order_statuses os ON os.code = o.order_status
LEFT JOIN couriers  cr ON cr.id = o.courier_id
LEFT JOIN LATERAL (
  SELECT
    count(*) FILTER (WHERE kind = 'attachment') AS attachment_count,
    count(*) FILTER (WHERE kind = 'draft')      AS draft_count
  FROM order_files
  WHERE order_id = o.id
) f ON true;

COMMENT ON VIEW order_list_view IS '주문 목록/상세 화면용 조인 뷰';


-- 고객별 집계 (고객관리 화면 / 고객정보 모달)
CREATE VIEW customer_summary_view AS
SELECT
  c.id,
  c.name,
  c.phone,
  c.address,
  c.memo,
  c.created_at,
  count(o.id)                                                     AS order_count,
  coalesce(sum(o.total_amount), 0)::bigint                        AS total_amount,
  count(o.id) FILTER (WHERE os.is_active_stage)                   AS active_order_count,
  max(o.order_date)                                               AS last_order_date,
  min(o.wedding_date) FILTER (WHERE os.is_active_stage)           AS nearest_wedding_date
FROM customers c
LEFT JOIN orders        o  ON o.customer_id = c.id
LEFT JOIN order_statuses os ON os.code = o.order_status
GROUP BY c.id;

COMMENT ON VIEW customer_summary_view IS '고객별 주문 집계';


-- 상품별 집계 (상품관리 화면)
CREATE VIEW product_summary_view AS
SELECT
  p.id,
  p.name,
  p.slug,
  p.default_unit_price,
  p.purchase_price,
  p.icon_path,
  p.link_url,
  p.sort_order,
  p.is_active,
  count(o.id)                                   AS order_count,
  coalesce(sum(o.quantity), 0)::bigint          AS total_quantity,
  coalesce(sum(o.total_amount), 0)::bigint      AS total_amount,
  count(o.id) FILTER (WHERE os.is_active_stage) AS active_order_count
FROM products p
LEFT JOIN orders        o  ON o.product_id = p.id
LEFT JOIN order_statuses os ON os.code = o.order_status
GROUP BY p.id;

COMMENT ON VIEW product_summary_view IS '상품별 주문 집계';
