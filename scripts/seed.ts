/**
 * 샘플 데이터 생성 스크립트.
 *   npm run db:seed
 *
 * 1) original/custom-order.html 의 시드 26건을 주문번호·날짜까지 그대로 재현
 * 2) 그 위에 2026년 전체에 걸친 주문을 추가 생성 (기본 500건)
 * 3) 첨부/초안 파일, 고객 요청사항, 상태 변경 이력까지 함께 생성
 *
 * 난수는 시드 고정(mulberry32)이라 몇 번을 돌려도 같은 데이터가 나옵니다.
 */
import "dotenv/config";
import { Client } from "pg";

const parsedOrderCount = Number(process.env.SEED_ORDER_COUNT);
const TOTAL_ORDERS =
  Number.isInteger(parsedOrderCount) && parsedOrderCount > 0 ? parsedOrderCount : 500;
const TODAY = "2026-08-24";

// ─── 시드 고정 난수 ───────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  return function rand() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260824);
const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const pick = <T>(arr: readonly T[]): T => arr[randInt(0, arr.length - 1)];
const chance = (p: number) => rand() < p;

// ─── 날짜 유틸 ───────────────────────────────────────────────────────────────
const iso = (d: Date) => d.toISOString().slice(0, 10);
function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}
function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) /
      86_400_000,
  );
}

// ─── 사람 이름 / 주소 풀 ──────────────────────────────────────────────────────
const SURNAMES = [
  "김","이","박","최","정","강","조","윤","장","임","한","오","서","신","권","황",
  "안","송","전","홍","유","고","문","양","손","배","백","허","남","심","노","하",
];
const GIVEN_NAMES = [
  "지민","서준","도윤","하윤","서연","민준","예준","시우","주원","지호","건우","우진",
  "지우","하준","은우","선우","연우","정우","승현","유진","다인","하람","나윤","소연",
  "윤서","서영","태양","민서","채원","가은","수아","지안","현우","성민","동현","재원",
  "예린","다혜","보람","혜인","슬기","도현","성훈","준혁","나연","지영","현서","수빈",
];

const REGIONS: readonly [string, readonly string[], readonly string[]][] = [
  ["서울시", ["강남구", "마포구", "송파구", "종로구", "성동구", "서초구", "용산구"],
    ["테헤란로", "양화로", "올림픽로", "세종대로", "왕십리로", "강남대로", "이태원로"]],
  ["부산시", ["해운대구", "수영구", "부산진구", "동래구"],
    ["센텀로", "광안해변로", "중앙대로", "충렬대로"]],
  ["대구시", ["수성구", "중구", "달서구"], ["동대구로", "국채보상로", "달구벌대로"]],
  ["인천시", ["연수구", "남동구", "부평구"], ["송도과학로", "인주대로", "부평대로"]],
  ["대전시", ["서구", "유성구"], ["둔산로", "대학로"]],
  ["광주시", ["서구", "북구"], ["상무대로", "무등로"]],
  ["울산시", ["남구", "중구"], ["삼산로", "번영로"]],
  ["수원시", ["영통구", "팔달구"], ["광교로", "효원로"]],
  ["성남시", ["분당구", "수정구"], ["판교로", "성남대로"]],
  ["고양시", ["일산동구", "덕양구"], ["중앙로", "화정로"]],
  ["천안시", ["서북구", "동남구"], ["불당대로", "천안대로"]],
  ["청주시", ["흥덕구", "상당구"], ["사직대로", "상당로"]],
  ["전주시", ["완산구", "덕진구"], ["홍산로", "백제대로"]],
  ["창원시", ["성산구", "의창구"], ["창이대로", "원이대로"]],
  ["제주시", ["일도동", "노형동"], ["중앙로", "노연로"]],
];

function makeAddress(): string {
  const [city, districts, roads] = pick(REGIONS);
  return `${city} ${pick(districts)} ${pick(roads)} ${randInt(1, 220)}`;
}
function makePhone(): string {
  return `010-${String(randInt(1000, 9999))}-${String(randInt(1000, 9999))}`;
}

// ─── 상품별 옵션 문구 ────────────────────────────────────────────────────────
const OPTIONS: Record<string, readonly string[]> = {
  "아크릴 키링": ["원형 5cm / 시안 A", "하트형 4cm / 시안 F", "사각 5cm / 시안 B", "원형 5cm / 시안 G", "별형 4.5cm / 각인 이니셜"],
  "아크릴 폰그립": ["미니 캐릭터 시안 / 골드 링", "미니 캐릭터 시안 / 실버 링", "원형 4cm / 로즈골드 링"],
  "아크릴 마그넷": ["하트형 / 시안 C", "원형 6cm / 시안 E", "사각 5cm / 시안 A"],
  "즉석 포토프린팅": ["2x6 필름 / 프레임 포함", "2x6 필름 / 프레임 없음", "4x6 필름 / 앨범 포함"],
  "웨딩스탬프": ["원형 3cm / 각인 이니셜", "사각 4cm / 각인 성함", "원형 3.5cm / 각인 예식일"],
  "웨딩신문": ["타블로이드 / 20부", "타블로이드 / 25부", "타블로이드 / 40부", "베를리너 / 30부"],
  "커스텀 스티커": ["원형 4cm / 30매 시트", "하트형 / 20매 시트", "사각 5cm / 20매 시트"],
  "메시지카드": ["금박 레터링 / 5x7", "은박 레터링 / 4x6", "무광 인쇄 / 5x7"],
  "퍼즐액자": ["200pcs / 6x8 프레임", "300pcs / 8x10 프레임", "500pcs / 10x12 프레임"],
  "엽서 세트": ["6매입 / 시안 A", "8매입 / 시안 B", "10매입 / 시안 C"],
  "테이블 캘린더": ["탁상형 / 커플 사진 인쇄", "탁상형 / 웨딩 사진 인쇄", "벽걸이형 / 12개월"],
};

const MEMOS = [
  "예식 2주 전까지 수령 희망합니다.",
  "각인 문구 오타 없는지 한 번 더 확인 부탁드려요.",
  "시안 확정 후 바로 인쇄 진행해주세요.",
  "포장은 개별 포장으로 부탁드립니다.",
  "색상은 실물 기준으로 조금 더 진하게 뽑아주세요.",
  "배송 전에 문자로 연락 주시면 감사하겠습니다.",
  "주말 수령이 어려워 평일 오전 배송 부탁드려요.",
  "청첩장과 같은 폰트로 맞춰주세요.",
  "샘플 1개 먼저 확인하고 싶습니다.",
  "수량 변경 가능성 있어 확정 전 연락 주세요.",
];
const CANCEL_MEMOS = [
  "고객 요청으로 주문 취소",
  "예식 일정 변경으로 취소",
  "중복 주문으로 취소 처리",
  "고객 카드 결제 취소로 재결제 안내 필요",
];

const ATTACHMENT_NAMES = [
  "시안_최종확인.jpg", "각인문구.txt", "스티커시안_v2.ai", "로고_벡터.svg",
  "커플사진_원본.png", "폰트가이드.pdf", "색상시안_비교.jpg", "레이아웃_확정.pdf",
];
const DRAFT_NAMES = [
  "초안_1차.pdf", "초안_2차_수정.pdf", "초안_최종.pdf", "교정지_v1.jpg",
  "인쇄용_CMYK.pdf", "시안_A안.png", "시안_B안.png",
];

// ─── 원본 HTML 의 시드 26건 (그대로 재현) ──────────────────────────────────────
type SeedOrder = {
  orderNo: string; customerName: string; phone: string; weddingDate: string;
  productName: string; option: string; quantity: number; unitPrice: number;
  orderDate: string; deliveryMethod: string; address: string;
  paymentStatus: string; orderStatus: string; withInvitation: boolean;
  courierCompany?: string; trackingNumber?: string; deliveredDate?: string;
  memo?: string; attachments?: string[];
};

const ORIGINAL: SeedOrder[] = [
  {orderNo:"ORD-2026-000001",customerName:"한지민",phone:"010-1111-2222",weddingDate:"2026-05-02",productName:"웨딩스탬프",option:"원형 3cm / 각인 이니셜",quantity:1,unitPrice:35000,orderDate:"2026-04-14",deliveryMethod:"방문수령",address:"",paymentStatus:"결제완료",orderStatus:"배송완료",withInvitation:true,deliveredDate:"2026-04-16"},
  {orderNo:"ORD-2026-000002",customerName:"오승훈",phone:"010-2323-4545",weddingDate:"2026-05-24",productName:"웨딩신문",option:"타블로이드 / 20부",quantity:20,unitPrice:12000,orderDate:"2026-05-06",deliveryMethod:"택배배송",address:"서울시 강남구 테헤란로 101",paymentStatus:"결제완료",orderStatus:"배송완료",withInvitation:false,courierCompany:"CJ대한통운",trackingNumber:"654321098765",deliveredDate:"2026-05-12"},
  {orderNo:"ORD-2026-000003",customerName:"김나연",phone:"010-3434-5656",weddingDate:"2026-06-20",productName:"메시지카드",option:"금박 레터링 / 5x7",quantity:150,unitPrice:2100,orderDate:"2026-05-29",deliveryMethod:"택배배송",address:"대구시 수성구 동대구로 55",paymentStatus:"결제완료",orderStatus:"배송완료",withInvitation:true,courierCompany:"롯데택배",trackingNumber:"402198765432",deliveredDate:"2026-06-03"},
  {orderNo:"ORD-2026-000004",customerName:"이준혁",phone:"010-4545-6767",weddingDate:"2026-07-11",productName:"엽서 세트",option:"6매입 / 시안 A",quantity:130,unitPrice:2000,orderDate:"2026-06-12",deliveryMethod:"택배배송",address:"대전시 서구 둔산로 20",paymentStatus:"결제완료",orderStatus:"배송완료",withInvitation:false,courierCompany:"한진택배",trackingNumber:"588213467890",deliveredDate:"2026-06-17"},
  {orderNo:"ORD-2026-000005",customerName:"박지영",phone:"010-5656-7878",weddingDate:"2026-08-15",productName:"커스텀 스티커",option:"원형 4cm / 30매 시트",quantity:200,unitPrice:1500,orderDate:"2026-06-30",deliveryMethod:"방문수령",address:"",paymentStatus:"결제완료",orderStatus:"배송완료",withInvitation:true,deliveredDate:"2026-07-03"},
  {orderNo:"ORD-2026-000006",customerName:"서준혁",phone:"010-6262-3535",weddingDate:"2026-07-30",productName:"테이블 캘린더",option:"탁상형 / 커플 사진 인쇄",quantity:110,unitPrice:2900,orderDate:"2026-07-01",deliveryMethod:"택배배송",address:"광주시 서구 상무대로 21",paymentStatus:"결제완료",orderStatus:"취소",withInvitation:false,memo:"고객 요청으로 주문 취소"},
  {orderNo:"ORD-2026-000007",customerName:"윤지호",phone:"010-7777-9090",weddingDate:"2026-08-24",productName:"아크릴 마그넷",option:"하트형 / 시안 C",quantity:100,unitPrice:2400,orderDate:"2026-07-28",deliveryMethod:"방문수령",address:"",paymentStatus:"결제완료",orderStatus:"배송완료",withInvitation:false,deliveredDate:"2026-08-01"},
  {orderNo:"ORD-2026-000008",customerName:"임현우",phone:"010-3131-8282",weddingDate:"2026-08-27",productName:"아크릴 폰그립",option:"미니 캐릭터 시안 / 골드 링",quantity:90,unitPrice:5200,orderDate:"2026-08-01",deliveryMethod:"택배배송",address:"대전시 유성구 대학로 55",paymentStatus:"결제완료",orderStatus:"인쇄완료",withInvitation:true},
  {orderNo:"ORD-2026-000009",customerName:"박서준",phone:"010-2222-3333",weddingDate:"2026-08-29",productName:"즉석 포토프린팅",option:"2x6 필름 / 프레임 포함",quantity:120,unitPrice:1900,orderDate:"2026-08-05",deliveryMethod:"방문수령",address:"",paymentStatus:"결제완료",orderStatus:"배송중",withInvitation:false},
  {orderNo:"ORD-2026-000010",customerName:"김도윤",phone:"010-1234-5678",weddingDate:"2026-09-12",productName:"아크릴 키링",option:"원형 5cm / 시안 A",quantity:120,unitPrice:2800,orderDate:"2026-08-10",deliveryMethod:"택배배송",address:"서울시 마포구 양화로 12",paymentStatus:"결제완료",orderStatus:"인쇄팀전달",withInvitation:true,memo:"9/5까지 제작 완료 요청",attachments:["시안_최종확인.jpg","각인문구.txt"]},
  {orderNo:"ORD-2026-000011",customerName:"정우진",phone:"010-4444-1212",weddingDate:"2026-10-03",productName:"퍼즐액자",option:"200pcs / 6x8 프레임",quantity:150,unitPrice:6200,orderDate:"2026-08-18",deliveryMethod:"택배배송",address:"인천시 연수구 송도과학로 32",paymentStatus:"결제대기",orderStatus:"고객확정완료",withInvitation:false},
  {orderNo:"ORD-2026-000012",customerName:"강민재",phone:"010-5555-6161",weddingDate:"2026-09-20",productName:"커스텀 스티커",option:"하트형 / 20매 시트",quantity:200,unitPrice:1600,orderDate:"2026-08-22",deliveryMethod:"택배배송",address:"부산시 해운대구 센텀로 8",paymentStatus:"결제대기",orderStatus:"고객확정완료",withInvitation:true},
  {orderNo:"ORD-2026-000013",customerName:"조성민",phone:"010-9090-1414",weddingDate:"2026-11-08",productName:"메시지카드",option:"금박 레터링 / 5x7",quantity:130,unitPrice:2100,orderDate:"2026-08-24",deliveryMethod:"방문수령",address:"",paymentStatus:"결제대기",orderStatus:"고객확정완료",withInvitation:false},
  {orderNo:"ORD-2026-000014",customerName:"한다인",phone:"010-1010-2020",weddingDate:"2026-09-05",productName:"아크릴 키링",option:"원형 5cm / 시안 D",quantity:100,unitPrice:2800,orderDate:"2026-08-24",deliveryMethod:"택배배송",address:"서울시 송파구 올림픽로 45",paymentStatus:"결제완료",orderStatus:"고객확정완료",withInvitation:true},
  {orderNo:"ORD-2026-000015",customerName:"오지훈",phone:"010-2020-3030",weddingDate:"2026-09-01",productName:"웨딩스탬프",option:"사각 4cm / 각인 성함",quantity:1,unitPrice:36000,orderDate:"2026-08-24",deliveryMethod:"방문수령",address:"",paymentStatus:"결제대기",orderStatus:"고객확정완료",withInvitation:false},
  {orderNo:"ORD-2026-000016",customerName:"배소연",phone:"010-3030-4040",weddingDate:"2026-09-18",productName:"커스텀 스티커",option:"사각 5cm / 20매 시트",quantity:150,unitPrice:1500,orderDate:"2026-08-24",deliveryMethod:"택배배송",address:"수원시 영통구 광교로 12",paymentStatus:"결제완료",orderStatus:"외주발주",withInvitation:true,attachments:["스티커시안_v2.ai"]},
  {orderNo:"ORD-2026-000017",customerName:"최윤서",phone:"010-4040-5050",weddingDate:"2026-10-02",productName:"아크릴 마그넷",option:"원형 6cm / 시안 E",quantity:120,unitPrice:2400,orderDate:"2026-08-25",deliveryMethod:"택배배송",address:"창원시 성산구 창이대로 88",paymentStatus:"결제대기",orderStatus:"초안등록",withInvitation:false},
  {orderNo:"ORD-2026-000018",customerName:"장하늘",phone:"010-5050-6060",weddingDate:"2026-09-27",productName:"메시지카드",option:"은박 레터링 / 4x6",quantity:140,unitPrice:2100,orderDate:"2026-08-25",deliveryMethod:"방문수령",address:"",paymentStatus:"결제완료",orderStatus:"초안등록",withInvitation:true},
  {orderNo:"ORD-2026-000019",customerName:"심유진",phone:"010-6060-7070",weddingDate:"2026-10-10",productName:"아크릴 키링",option:"하트형 4cm / 시안 F",quantity:110,unitPrice:2800,orderDate:"2026-08-26",deliveryMethod:"택배배송",address:"전주시 완산구 홍산로 5",paymentStatus:"결제대기",orderStatus:"초안등록",withInvitation:false},
  {orderNo:"ORD-2026-000020",customerName:"노태양",phone:"010-7070-8080",weddingDate:"2026-09-14",productName:"웨딩신문",option:"타블로이드 / 25부",quantity:25,unitPrice:12000,orderDate:"2026-08-26",deliveryMethod:"택배배송",address:"청주시 흥덕구 사직대로 20",paymentStatus:"결제완료",orderStatus:"초안등록",withInvitation:false},
  {orderNo:"ORD-2026-000021",customerName:"구민서",phone:"010-8080-9090",weddingDate:"2026-09-30",productName:"즉석 포토프린팅",option:"2x6 필름 / 프레임 없음",quantity:100,unitPrice:1900,orderDate:"2026-08-27",deliveryMethod:"방문수령",address:"",paymentStatus:"결제대기",orderStatus:"초안등록",withInvitation:true},
  {orderNo:"ORD-2026-000022",customerName:"홍서준",phone:"010-9090-0101",weddingDate:"2026-10-15",productName:"퍼즐액자",option:"300pcs / 8x10 프레임",quantity:130,unitPrice:6200,orderDate:"2026-08-27",deliveryMethod:"택배배송",address:"천안시 서북구 불당대로 30",paymentStatus:"결제취소",orderStatus:"주문완료",withInvitation:false,memo:"고객 카드 결제 취소로 재결제 안내 필요"},
  {orderNo:"ORD-2026-000023",customerName:"권나윤",phone:"010-0101-1212",weddingDate:"2026-09-22",productName:"엽서 세트",option:"8매입 / 시안 B",quantity:100,unitPrice:2000,orderDate:"2026-08-28",deliveryMethod:"택배배송",address:"울산시 남구 삼산로 15",paymentStatus:"결제대기",orderStatus:"주문완료",withInvitation:true},
  {orderNo:"ORD-2026-000024",customerName:"안도현",phone:"010-1212-2323",weddingDate:"2026-10-20",productName:"테이블 캘린더",option:"탁상형 / 웨딩 사진 인쇄",quantity:90,unitPrice:2900,orderDate:"2026-08-29",deliveryMethod:"방문수령",address:"",paymentStatus:"결제완료",orderStatus:"주문완료",withInvitation:false},
  {orderNo:"ORD-2026-000025",customerName:"문서영",phone:"010-2323-3434",weddingDate:"2026-11-01",productName:"아크릴 키링",option:"원형 5cm / 시안 G",quantity:130,unitPrice:2800,orderDate:"2026-08-30",deliveryMethod:"택배배송",address:"성남시 분당구 판교로 22",paymentStatus:"결제대기",orderStatus:"주문완료",withInvitation:true},
  {orderNo:"ORD-2026-000026",customerName:"윤하람",phone:"010-3434-4545",weddingDate:"2026-09-25",productName:"아크릴 폰그립",option:"미니 캐릭터 시안 / 실버 링",quantity:95,unitPrice:5200,orderDate:"2026-08-30",deliveryMethod:"택배배송",address:"광주시 북구 무등로 60",paymentStatus:"결제완료",orderStatus:"주문완료",withInvitation:false},
];

// ─── 진행 상태 결정 로직 ─────────────────────────────────────────────────────
const PIPELINE = [
  "주문완료", "초안등록", "고객확정완료", "외주발주", "인쇄팀전달", "인쇄완료", "배송중", "배송완료",
] as const;

/** 주문일로부터 기준일까지 흐른 시간에 따라 자연스러운 진행 상태를 고른다. */
function decideStatus(orderDate: string, weddingDate: string): string {
  if (chance(0.035)) return "취소";

  const elapsed = daysBetween(orderDate, TODAY);
  const untilWedding = daysBetween(TODAY, weddingDate);

  if (elapsed < 0) return "주문완료";              // 미래에 접수된 예약 주문
  if (untilWedding < -3) return "배송완료";        // 예식이 지났으면 마감
  if (elapsed >= 45) return chance(0.9) ? "배송완료" : "배송중";

  // 대략 5~7일에 한 단계씩 진행
  const step = Math.min(Math.floor(elapsed / 6), PIPELINE.length - 1);
  const jitter = chance(0.25) ? -1 : 0;
  return PIPELINE[Math.max(0, Math.min(step + jitter, PIPELINE.length - 1))];
}

function decidePayment(status: string): string {
  if (status === "취소") return chance(0.6) ? "결제취소" : "결제완료";
  if (status === "주문완료") return chance(0.55) ? "결제대기" : "결제완료";
  if (status === "초안등록") return chance(0.4) ? "결제대기" : "결제완료";
  if (status === "고객확정완료") return chance(0.3) ? "결제대기" : "결제완료";
  return chance(0.06) ? "결제대기" : "결제완료";
}

// ─── main ───────────────────────────────────────────────────────────────────
type ProductRow = { id: number; name: string; slug: string; default_unit_price: number };

async function main() {
  // TRUNCATE ... CASCADE 를 실행하므로 기본값 폴백을 두지 않는다.
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL 이 설정되지 않았습니다. .env 를 확인하세요.");
    process.exit(1);
  }
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query("BEGIN");

    console.log("▸ 기존 주문/고객 데이터 삭제…");
    await client.query(
      `TRUNCATE order_status_history, order_files, orders, customers
       RESTART IDENTITY CASCADE`,
    );
    await client.query(`TRUNCATE order_no_counters`);

    const { rows: products } = await client.query<ProductRow>(
      `SELECT id, name, slug, default_unit_price FROM products ORDER BY sort_order`,
    );
    const productByName = new Map(products.map((p) => [p.name, p]));
    const { rows: couriers } = await client.query<{ id: number; name: string }>(
      `SELECT id, name FROM couriers ORDER BY sort_order`,
    );

    // ── 1. 고객 ──────────────────────────────────────────────────────────────
    console.log("▸ 고객 생성…");
    type CustomerSeed = { name: string; phone: string; address: string | null };
    const customerSeeds: CustomerSeed[] = ORIGINAL.map((o) => ({
      name: o.customerName,
      phone: o.phone,
      address: o.address || null,
    }));

    const seenPhone = new Set(customerSeeds.map((c) => c.phone));
    const extraCustomerCount = Math.round(TOTAL_ORDERS * 0.62);
    while (customerSeeds.length < ORIGINAL.length + extraCustomerCount) {
      const phone = makePhone();
      if (seenPhone.has(phone)) continue;
      seenPhone.add(phone);
      customerSeeds.push({
        name: pick(SURNAMES) + pick(GIVEN_NAMES),
        phone,
        address: chance(0.75) ? makeAddress() : null,
      });
    }

    const customerIds: number[] = [];
    for (let i = 0; i < customerSeeds.length; i += 200) {
      const chunk = customerSeeds.slice(i, i + 200);
      const values: unknown[] = [];
      const tuples = chunk.map((c) => {
        const a = values.push(c.name);
        const b = values.push(c.phone);
        const d = values.push(c.address);
        return `($${a},$${b},$${d})`;
      });
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO customers (name, phone, address) VALUES ${tuples.join(",")}
         ON CONFLICT (name, coalesce(phone,'')) DO UPDATE SET phone = EXCLUDED.phone
         RETURNING id`,
        values,
      );
      customerIds.push(...rows.map((r) => r.id));
    }
    console.log(`  고객 ${customerIds.length}명`);

    // ── 2. 주문 ──────────────────────────────────────────────────────────────
    console.log("▸ 주문 생성…");
    type OrderSeed = {
      orderNo: string; customerIdx: number; productName: string; option: string;
      quantity: number; unitPrice: number; orderDate: string; weddingDate: string;
      deliveryMethod: string; address: string | null; paymentStatus: string;
      orderStatus: string; withInvitation: boolean; courierName: string | null;
      trackingNumber: string | null; deliveredDate: string | null; memo: string | null;
      attachments: string[]; drafts: string[];
    };

    const orderSeeds: OrderSeed[] = ORIGINAL.map((o, idx) => ({
      orderNo: o.orderNo,
      customerIdx: idx,
      productName: o.productName,
      option: o.option,
      quantity: o.quantity,
      unitPrice: o.unitPrice,
      orderDate: o.orderDate,
      weddingDate: o.weddingDate,
      deliveryMethod: o.deliveryMethod,
      address: o.address || null,
      paymentStatus: o.paymentStatus,
      orderStatus: o.orderStatus,
      withInvitation: o.withInvitation,
      courierName: o.courierCompany ?? null,
      trackingNumber: o.trackingNumber ?? null,
      deliveredDate: o.deliveredDate ?? null,
      memo: o.memo ?? null,
      attachments: o.attachments ?? [],
      drafts: [],
    }));

    // 원본 26건은 ORD-2026-000001~26 을 쓰므로 그 뒤부터 이어서 채번
    const seqByYear = new Map<number, number>([[2026, ORIGINAL.length]]);
    const nextNo = (year: number) => {
      const next = (seqByYear.get(year) ?? 0) + 1;
      seqByYear.set(year, next);
      return `ORD-${year}-${String(next).padStart(6, "0")}`;
    };

    while (orderSeeds.length < TOTAL_ORDERS) {
      // 주문일: 2026-01-05 ~ 2026-12-15. 기준일 부근(성수기)에 가중치를 준다.
      const spread = chance(0.42)
        ? randInt(-45, 20)                       // 기준일 전후 (진행중 주문이 많이 잡히도록)
        : randInt(-230, 110);
      const orderDate = addDays(TODAY, spread);
      if (orderDate < "2026-01-05" || orderDate > "2026-12-15") continue;

      const weddingDate = addDays(orderDate, randInt(18, 160));
      if (weddingDate > "2027-06-30") continue;

      const product = pick(products);
      const quantity =
        product.name === "웨딩스탬프" ? randInt(1, 2)
        : product.name === "웨딩신문" ? randInt(15, 45)
        : product.name === "퍼즐액자" ? randInt(60, 160)
        : randInt(80, 260);

      // 단가는 기본가 기준으로 ±10% 흔들어 준다 (100원 단위)
      const unitPrice =
        Math.max(100, Math.round((product.default_unit_price * (0.9 + rand() * 0.2)) / 100) * 100);

      const orderStatus = decideStatus(orderDate, weddingDate);
      const paymentStatus = decidePayment(orderStatus);
      const deliveryMethod = chance(0.68) ? "택배배송" : "방문수령";
      const address = deliveryMethod === "택배배송" ? makeAddress() : null;

      const shipped = orderStatus === "배송중" || orderStatus === "배송완료";
      const courierName =
        shipped && deliveryMethod === "택배배송" ? pick(couriers).name : null;
      const trackingNumber = courierName ? String(randInt(100000000000, 999999999999)) : null;

      let deliveredDate: string | null = null;
      if (orderStatus === "배송완료") {
        const base = addDays(orderDate, randInt(5, 30));
        deliveredDate = base > TODAY ? TODAY : base;
        if (deliveredDate < orderDate) deliveredDate = orderDate;
      }

      const memo =
        orderStatus === "취소" ? pick(CANCEL_MEMOS) : chance(0.28) ? pick(MEMOS) : null;

      // 진행 단계가 올라갈수록 파일이 붙어 있을 확률이 높다
      const stageIdx = PIPELINE.indexOf(orderStatus as (typeof PIPELINE)[number]);
      const attachments: string[] = [];
      if (chance(0.32)) {
        const n = randInt(1, 3);
        for (let k = 0; k < n; k++) attachments.push(pick(ATTACHMENT_NAMES));
      }
      const drafts: string[] = [];
      if (stageIdx >= 1 && chance(0.55)) {
        const n = randInt(1, 3);
        for (let k = 0; k < n; k++) drafts.push(pick(DRAFT_NAMES));
      }

      orderSeeds.push({
        orderNo: nextNo(Number(orderDate.slice(0, 4))),
        customerIdx: randInt(0, customerIds.length - 1),
        productName: product.name,
        option: pick(OPTIONS[product.name] ?? ["기본 옵션"]),
        quantity,
        unitPrice,
        orderDate,
        weddingDate,
        deliveryMethod,
        address,
        paymentStatus,
        orderStatus,
        withInvitation: chance(0.45),
        courierName,
        trackingNumber,
        deliveredDate,
        memo,
        attachments: [...new Set(attachments)],
        drafts: [...new Set(drafts)],
      });
    }

    const courierIdByName = new Map(couriers.map((c) => [c.name, c.id]));
    const orderIds: number[] = [];

    for (let i = 0; i < orderSeeds.length; i += 100) {
      const chunk = orderSeeds.slice(i, i + 100);
      const values: unknown[] = [];
      const tuples = chunk.map((o) => {
        const p = (v: unknown) => `$${values.push(v)}`;
        return `(${p(o.orderNo)},${p(customerIds[o.customerIdx])},${p(
          productByName.get(o.productName)?.id ?? products[0].id,
        )},${p(o.option)},${p(o.quantity)},${p(o.unitPrice)},${p(o.orderDate)},${p(
          o.weddingDate,
        )},${p(o.deliveryMethod)},${p(o.address)},${p(o.paymentStatus)},${p(
          o.orderStatus,
        )},${p(o.withInvitation)},${p(
          o.courierName ? (courierIdByName.get(o.courierName) ?? null) : null,
        )},${p(o.trackingNumber)},${p(o.deliveredDate)},${p(o.memo)})`;
      });

      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO orders (
           order_no, customer_id, product_id, option_text, quantity, unit_price,
           order_date, wedding_date, delivery_method, shipping_address,
           payment_status, order_status, with_invitation,
           courier_id, tracking_number, delivered_date, memo
         ) VALUES ${tuples.join(",")}
         RETURNING id`,
        values,
      );
      orderIds.push(...rows.map((r) => r.id));
    }
    console.log(`  주문 ${orderIds.length}건`);

    // ── 3. 첨부/초안 파일 ────────────────────────────────────────────────────
    console.log("▸ 첨부·초안 파일 생성…");
    type FileSeed = { orderId: number; kind: string; name: string };
    const fileSeeds: FileSeed[] = [];
    orderSeeds.forEach((o, idx) => {
      o.attachments.forEach((n) =>
        fileSeeds.push({ orderId: orderIds[idx], kind: "attachment", name: n }),
      );
      o.drafts.forEach((n) =>
        fileSeeds.push({ orderId: orderIds[idx], kind: "draft", name: n }),
      );
    });

    for (let i = 0; i < fileSeeds.length; i += 300) {
      const chunk = fileSeeds.slice(i, i + 300);
      const values: unknown[] = [];
      const tuples = chunk.map((f) => {
        const p = (v: unknown) => `$${values.push(v)}`;
        return `(${p(f.orderId)},${p(f.kind)}::order_file_kind,${p(f.name)},${p(
          randInt(48_000, 5_400_000),
        )},${p(guessMime(f.name))})`;
      });
      await client.query(
        `INSERT INTO order_files (order_id, kind, file_name, file_size, content_type)
         VALUES ${tuples.join(",")}`,
        values,
      );
    }
    console.log(`  파일 ${fileSeeds.length}건`);

    // ── 4. 상태 변경 이력 재구성 ──────────────────────────────────────────────
    // INSERT 트리거가 남긴 '주문 등록' 1건을 지우고, 현재 상태까지의 단계를
    // 주문일~완료일 사이에 고르게 분포시킨 이력으로 다시 만든다.
    console.log("▸ 상태 변경 이력 재구성…");
    await client.query(`TRUNCATE order_status_history RESTART IDENTITY`);
    await client.query(`
      WITH steps AS (
        SELECT
          o.id                                   AS order_id,
          os.code                                AS to_status,
          os.sort_order                          AS step_no,
          lag(os.code) OVER (PARTITION BY o.id ORDER BY os.sort_order) AS from_status,
          o.order_date,
          coalesce(o.delivered_date, LEAST(o.wedding_date, DATE '2026-08-24')) AS end_date,
          max(os.sort_order) OVER (PARTITION BY o.id) AS last_step
        FROM orders o
        JOIN order_statuses os
          ON (
               -- 취소 주문은 '주문완료 → 취소' 2단계만
               (o.order_status = '취소' AND os.code IN ('주문완료','취소'))
               OR
               (o.order_status <> '취소'
                AND os.sort_order <= (SELECT sort_order FROM order_statuses WHERE code = o.order_status)
                AND os.code <> '취소')
             )
      )
      INSERT INTO order_status_history (order_id, from_status, to_status, note, changed_by, changed_at)
      SELECT
        order_id,
        from_status,
        to_status,
        CASE WHEN from_status IS NULL THEN '주문 등록' ELSE NULL END,
        '스튜디오',
        (order_date::timestamptz
          + (GREATEST(end_date - order_date, 1) * (step_no - 1)::numeric
             / GREATEST(last_step, 1)) * INTERVAL '1 day'
          + (random() * 8 + 9) * INTERVAL '1 hour')
      FROM steps
      ORDER BY order_id, step_no
    `);
    const { rows: histRows } = await client.query<{ c: number }>(
      `SELECT count(*)::int AS c FROM order_status_history`,
    );
    console.log(`  이력 ${histRows[0].c}건`);

    // ── 5. 주문번호 채번 카운터 동기화 ────────────────────────────────────────
    await client.query(`
      INSERT INTO order_no_counters (year, last_seq)
      SELECT split_part(order_no, '-', 2)::int,
             max(split_part(order_no, '-', 3)::int)
      FROM orders
      GROUP BY 1
      ON CONFLICT (year) DO UPDATE SET last_seq = EXCLUDED.last_seq
    `);

    await client.query("COMMIT");
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // 이미 종료된 트랜잭션이면 무시한다. 원본 예외를 가려서는 안 된다.
    }
    await client.end();
    throw e;
  }

  try {
    // 대량 INSERT 직후에는 플래너 통계를 갱신해야 인덱스가 제대로 선택된다.
    console.log("▸ 통계 갱신(ANALYZE)…");
    await client.query(
      "ANALYZE orders; ANALYZE customers; ANALYZE order_files; ANALYZE order_status_history;",
    );

    // ── 요약 출력 ────────────────────────────────────────────────────────────
    const { rows: summary } = await client.query(`
      SELECT
        (SELECT count(*) FROM customers)            AS customers,
        (SELECT count(*) FROM orders)               AS orders,
        (SELECT count(*) FROM order_files)          AS files,
        (SELECT count(*) FROM order_status_history) AS history,
        (SELECT to_char(sum(total_amount), 'FM999,999,999,999') FROM orders) AS amount,
        (SELECT count(*) FROM orders WHERE order_date = DATE '2026-08-24')   AS today_orders
    `);
    console.log("\n샘플 데이터 생성 완료");
    console.table(summary[0]);
  } finally {
    await client.end();
  }
}

function guessMime(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "svg": return "image/svg+xml";
    case "pdf": return "application/pdf";
    case "ai": return "application/postscript";
    case "txt": return "text/plain";
    default: return "application/octet-stream";
  }
}

main().catch((e) => {
  console.error("\n시드 생성 실패:", e);
  process.exit(1);
});
