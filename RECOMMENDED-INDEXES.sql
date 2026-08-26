-- =============================================================================
--  RECOMMENDED-INDEXES.sql
--  코드 리뷰(에이전트 A) 의 인덱스 권장사항입니다.
--
--  ⚠ 지금 바로 적용하지 마세요.
--    현재 데이터(주문 500건)에서는 모든 쿼리가 1ms 미만이라 아래 인덱스가
--    실행 시간을 개선하지 못하고 쓰기 비용만 늘립니다.
--    주문이 수만 건 이상으로 늘어난 뒤 EXPLAIN 으로 효과를 확인하고 적용하세요.
--
--  db/schema.sql 에 이미 존재하는 인덱스는 제외했습니다.
-- =============================================================================


-- ─── (A) 최우선: 인덱스가 아예 없는 검색 컬럼 ────────────────────────────────
-- listCustomers() 의 address ILIKE 검색은 현재 인덱스가 전혀 없어 전체 스캔입니다.
-- (코드 리뷰에서 coalesce() 래핑을 제거했으므로 이 인덱스가 실제로 사용됩니다.)
CREATE INDEX IF NOT EXISTS customers_address_trgm_idx
  ON customers USING gin (address gin_trgm_ops);


-- ─── (B) 정렬 tie-breaker 를 포함한 복합 인덱스 ──────────────────────────────
-- 주문 목록의 정렬 4종은 모두 ", id" 를 tie-breaker 로 붙이는데
-- 기존 인덱스는 단일 컬럼이라 EXPLAIN 에 Incremental Sort 가 남습니다.
-- 아래를 추가하면 완전히 정렬된 상태로 스캔할 수 있습니다.
-- (적용 시 기존 orders_order_date_idx / orders_wedding_date_idx /
--  orders_total_amount_idx 는 중복이므로 제거를 검토하세요.)
CREATE INDEX IF NOT EXISTS orders_order_date_id_idx   ON orders (order_date DESC, id DESC);
CREATE INDEX IF NOT EXISTS orders_wedding_date_id_idx ON orders (wedding_date ASC, id ASC);
CREATE INDEX IF NOT EXISTS orders_total_amount_id_idx ON orders (total_amount DESC, id DESC);


-- ─── (C) 통계 집계용 커버링 인덱스 ───────────────────────────────────────────
-- getBreakdown(): order_date BETWEEN + product_id GROUP BY + quantity/total_amount 합계.
-- INCLUDE 로 heap 접근 없이 index-only scan 이 가능해집니다.
CREATE INDEX IF NOT EXISTS orders_date_product_idx
  ON orders (order_date, product_id)
  INCLUDE (quantity, total_amount);

-- getStatusChipCounts() 의 상태별 집계.
-- 기존 orders_date_status_idx 는 (order_date, order_status) 순서라
-- 상태를 선행 조건으로 쓰는 조회에는 사용할 수 없습니다.
CREATE INDEX IF NOT EXISTS orders_status_date_idx ON orders (order_status, order_date);


-- ─── (D) 고객 상세 모달 ─────────────────────────────────────────────────────
-- getCustomerWithOrders(): WHERE customer_id = $1 ORDER BY order_date DESC, id DESC.
-- 기존 orders_customer_idx 는 customer_id 단일이라 정렬 단계가 남습니다.
CREATE INDEX IF NOT EXISTS orders_customer_date_idx
  ON orders (customer_id, order_date DESC, id DESC);


-- ─── (E) 유지보수 ───────────────────────────────────────────────────────────
-- 대량 INSERT 후에는 플래너 통계를 갱신해야 인덱스가 제대로 선택됩니다.
-- (scripts/seed.ts 는 이미 마지막에 ANALYZE 를 수행합니다.)
ANALYZE orders;
ANALYZE customers;
ANALYZE order_files;
ANALYZE order_status_history;


-- =============================================================================
--  참고: 현재 사용되지 않는 인덱스 (pg_stat_user_indexes 기준 idx_scan = 0)
--
--    orders_product_idx, orders_payment_status_idx,
--    products_name_trgm_idx, customers_name_trgm_idx,
--    customers_phone_trgm_idx, orders_order_no_trgm_idx
--
--  이 중 trigram 인덱스 4개는 검색 쿼리가 여러 테이블의 컬럼을 OR 로 묶어
--  어떤 인덱스도 타지 못했기 때문이었고, 코드 리뷰에서 쿼리를 테이블별
--  UNION 으로 분해해 이제 사용 가능한 상태가 되었습니다.
--  운영 데이터가 쌓인 뒤 아래로 실제 사용 여부를 재확인하세요.
--
--    SELECT relname, indexrelname, idx_scan
--      FROM pg_stat_user_indexes
--     ORDER BY idx_scan, relname;
-- =============================================================================
