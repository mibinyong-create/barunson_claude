-- =============================================================================
--  코드/마스터 기준 데이터
--  original/custom-order.html 의 상수(STATUS_LIST, PRODUCT_ICONS,
--  PRODUCT_CODE_SLUGS, 택배사 select)를 그대로 옮긴 것입니다.
-- =============================================================================

-- 진행 상태 9종 ---------------------------------------------------------------
INSERT INTO order_statuses (code, sort_order, is_active_stage, is_quick_tile, css_class, ink_color, bg_color) VALUES
  ('주문완료',     1, true,  true,  'st-received',  '#3E5D78', '#E6EDF3'),
  ('초안등록',     2, true,  true,  'st-draft',     '#5B6472', '#E9ECEF'),
  ('고객확정완료', 3, true,  true,  'st-ready',     '#5B4C96', '#EAE5F5'),
  ('외주발주',     4, true,  false, 'st-outsource', '#B4551E', '#F7E3CE'),
  ('인쇄팀전달',   5, true,  true,  'st-production','#93691F', '#F4EAD3'),
  ('인쇄완료',     6, true,  false, 'st-printed',   '#9C4B6B', '#F6E3EC'),
  ('배송중',       7, true,  false, 'st-shipping',  '#256F5D', '#DFEEE9'),
  ('배송완료',     8, false, false, 'st-done',      '#3B7A45', '#E1F0E3'),
  ('취소',         9, false, false, 'st-cancelled', '#8C4A4A', '#F3E3E3');

-- 결제 상태 3종 ---------------------------------------------------------------
INSERT INTO payment_statuses (code, sort_order, css_class, ink_color, bg_color) VALUES
  ('결제대기', 1, 'pay-wait',      '#93691F', '#F4EAD3'),
  ('결제완료', 2, 'pay-done',      '#3B7A45', '#E1F0E3'),
  ('결제취소', 3, 'pay-cancelled', '#8C4A4A', '#F3E3E3');

-- 수령 방법 -------------------------------------------------------------------
INSERT INTO delivery_methods (code, sort_order, requires_address) VALUES
  ('택배배송', 1, true),
  ('방문수령', 2, false);

-- 택배사 ----------------------------------------------------------------------
INSERT INTO couriers (name, tracking_url_template, sort_order) VALUES
  ('CJ대한통운', 'https://trace.cjlogistics.com/next/tracking.html?wblNo={{no}}', 1),
  ('롯데택배',   'https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo={{no}}', 2),
  ('한진택배',   'https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2={{no}}', 3),
  ('우체국택배', 'https://service.epost.go.kr/trace.RetrieveEmsRigiTraceList.comm?sid1={{no}}', 4),
  ('로젠택배',   'https://www.ilogen.com/web/personal/trace/{{no}}', 5);

-- 외주 제작 업체 (발주처) --------------------------------------------------------
INSERT INTO vendors (name, category, contact, phone, memo, sort_order) VALUES
  ('오브제 아크릴',   '아크릴 (키링·폰그립·마그넷·등신대)', '김도현 실장', '031-8005-1120', '레이저 커팅·UV 인쇄. 최소 발주 50개, 통상 5영업일', 1),
  ('우드메이트 공방', '원목·퍼즐액자·테이블캘린더',          '박세진 대표', '032-624-7788', '원목 재단·조립. 우천 시 도장 건조 지연 가능', 2),
  ('스탬프공작소',    '웨딩스탬프 (각인·수제)',              '이가람',      '02-334-9021', '이니셜/문구 각인. 시안 확정 후 3영업일', 3),
  ('프린트팩토리 서울', '지류 인쇄 (신문·엽서·메시지카드)',    '정하늘 과장', '02-2088-4400', '옵셋·디지털 겸업. 대량 5층인쇄 대행 가능', 4),
  ('굿즈랩 판교',     '커스텀 스티커·부자재',                '한유리',      '031-707-3355', '도무송·에폭시·홀로그램. 소량 다품종 강점', 5),
  ('레터프레스 하우스', '레터프레스·박·형압',                 '오승우 대표', '070-4123-8899', '금박/은박/공목. 종이 결 방향 지정 필요', 6),
  ('즉석프린팅 랩',   '포토프린팅·즉석 인화',                '문지호',      '02-512-6070', '현장 인화 장비 대여도 진행', 7),
  ('한빛 패키징',     '포장·상자·부가자재',                  '서나연',      '031-950-2244', '개별 OPP·기프트박스 제작', 8);

-- 상품 11종 (default_unit_price = 판매 기본단가, purchase_price = 매입단가/원가) -----
INSERT INTO products (name, slug, default_unit_price, purchase_price, sort_order, icon_path, link_url) VALUES
  ('아크릴 키링',     'keyring',    2800,  1400, 1,
   '<path d="M12 3l7 4v10l-7 4-7-4V7l7-4Z"/><circle cx="12" cy="12" r="2"/>',
   'https://www.barunsoncard.com/Product/OptionDetail/42056'),
  ('아크릴 폰그립',   'phonegrip',  5200,  2600, 2,
   '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/>',
   'https://www.barunsoncard.com/Product/OptionDetail/42057'),
  ('아크릴 마그넷',   'magnet',     2400,  1150, 3,
   '<path d="M7 4v7a5 5 0 0 0 10 0V4"/><path d="M7 4h4M13 4h4"/><path d="M7 11h4M13 11h4"/>',
   'https://www.barunsoncard.com/Product/OptionDetail/42324'),
  ('즉석 포토프린팅', 'photo',      1900,   800, 4,
   '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 15l-5-5-4 4-3-3-6 6"/>',
   'https://www.barunsoncard.com/Product/OptionDetail/41488'),
  ('웨딩스탬프',      'stamp',     35000, 18500, 5,
   '<rect x="5" y="4" width="14" height="16" rx="1.5"/><path d="M5 8l2-1 2 1 2-1 2 1 2-1 2 1V4H5v4Z"/><circle cx="12" cy="13" r="3"/>',
   'https://www.barunsoncard.com/Product/OptionDetail/41890'),
  ('웨딩신문',        'newspaper', 12000,  6400, 6,
   '<rect x="3" y="5" width="15" height="15" rx="1"/><path d="M18 8h3v10a2 2 0 0 1-2 2H8"/><path d="M6 9h9M6 12h9M6 15h5"/>',
   'https://www.barunsoncard.com/Product/OptionDetail/41881'),
  ('커스텀 스티커',   'sticker',    1500,   600, 7,
   '<path d="M12 3l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8L12 3Z"/>',
   'https://www.barunsoncard.com/Product/OptionDetail/40957'),
  ('메시지카드',      'card',       2100,   950, 8,
   '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
   'https://www.barunsoncard.com/Product/OptionDetail/42211'),
  ('퍼즐액자',        'puzzle',     6200,  3300, 9,
   '<path d="M6 3h5v3.5a1.5 1.5 0 0 0 3 0V3h5v5h-3.5a1.5 1.5 0 0 0 0 3H19v5h-5v-3.5a1.5 1.5 0 0 0-3 0V16H6v-5h3.5a1.5 1.5 0 0 0 0-3H6V3Z"/>',
   'https://www.barunsoncard.com/Product/OptionDetail/41448'),
  ('엽서 세트',       'postcard',   2000,   850, 10,
   '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 7l9 5 9-5"/><path d="M15 15h4"/><path d="M15 17.5h4"/>',
   'https://www.barunsoncard.com/Product/OptionDetail/41330'),
  ('테이블 캘린더',   'calendar',   2900,  1400, 11,
   '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16"/><path d="M8 3v4M16 3v4"/><circle cx="8.5" cy="14.5" r="1"/><circle cx="12" cy="14.5" r="1"/><circle cx="15.5" cy="14.5" r="1"/>',
   'https://www.barunsoncard.com/Product/CardList?MdSeq=137');
