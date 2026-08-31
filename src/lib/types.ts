export type OrderStatus =
  | "주문완료"
  | "초안등록"
  | "고객확정완료"
  | "외주발주"
  | "인쇄팀전달"
  | "인쇄완료"
  | "배송중"
  | "배송완료"
  | "취소";

export type PaymentStatus = "결제대기" | "결제완료" | "결제취소";
export type DeliveryMethod = "택배배송" | "방문수령";
export type OrderFileKind = "attachment" | "draft";

export type OrderStatusMeta = {
  code: OrderStatus;
  sortOrder: number;
  isActiveStage: boolean;
  isQuickTile: boolean;
  cssClass: string;
  inkColor: string;
  bgColor: string;
};

export type PaymentStatusMeta = {
  code: PaymentStatus;
  sortOrder: number;
  cssClass: string;
  inkColor: string;
  bgColor: string;
};

export type CourierMeta = {
  id: number;
  name: string;
  trackingUrlTemplate: string | null;
  sortOrder: number;
};

export type ProductMeta = {
  id: number;
  name: string;
  slug: string;
  defaultUnitPrice: number;
  /** 매입단가 (원가). 0 이면 미입력. */
  purchasePrice: number;
  iconPath: string | null;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type Meta = {
  orderStatuses: OrderStatusMeta[];
  paymentStatuses: PaymentStatusMeta[];
  deliveryMethods: { code: DeliveryMethod; sortOrder: number; requiresAddress: boolean }[];
  couriers: CourierMeta[];
  products: ProductMeta[];
  today: string;
};

export type OrderFile = {
  id: number;
  orderId: number;
  kind: OrderFileKind;
  fileName: string;
  fileSize: number | null;
  contentType: string | null;
  /** 실제 바이너리가 DB 에 보관돼 있으면 true (미리보기·다운로드 가능) */
  hasData: boolean;
  uploadedBy: string;
  uploadedAt: string;
};

export type Order = {
  id: number;
  orderNo: string;
  orderNoShort: string;
  customerId: number;
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  productId: number;
  productName: string;
  productSlug: string;
  productIconPath: string | null;
  productLinkUrl: string | null;
  productCode: string;
  optionText: string | null;
  quantity: number;
  /** 실제 인쇄 수량 (여분 포함). 미입력이면 null → 주문수량과 동일하게 취급 */
  printQuantity: number | null;
  unitPrice: number;
  totalAmount: number;
  orderDate: string;
  weddingDate: string;
  deliveryMethod: DeliveryMethod;
  shippingAddress: string | null;
  /** 출고일 (택배 발송 처리한 날). 미출고면 null */
  dispatchedDate: string | null;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  isActiveStage: boolean;
  withInvitation: boolean;
  courierId: number | null;
  courierName: string | null;
  trackingUrlTemplate: string | null;
  trackingNumber: string | null;
  deliveredDate: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
  attachmentCount: number;
  draftCount: number;
};

export type OrderDetail = Order & {
  attachments: OrderFile[];
  drafts: OrderFile[];
  statusHistory: {
    id: number;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    note: string | null;
    changedBy: string;
    changedAt: string;
  }[];
};

export type Paged<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type OrderSort =
  | "orderDateDesc"
  | "orderDateAsc"
  | "weddingDateAsc"
  | "amountDesc";

export type OrderListParams = {
  search?: string;
  status?: string;
  /** 여러 상태를 한 번에 (출고관리 화면). status 와 함께 주면 둘 다 AND */
  statuses?: string[];
  paymentStatus?: string;
  productId?: number;
  orderDate?: string;
  /** 주문일자 범위 (from~to, 양끝 포함). 출고관리·주간 조회에서 사용 */
  dateFrom?: string;
  dateTo?: string;
  showAllDates?: boolean;
  sort?: OrderSort;
  page?: number;
  pageSize?: number;
};

export type SummaryStats = {
  totalOrders: number;
  activeOrders: number;
  todayNewOrders: number;
  totalAmount: number;
  activeAmount: number;
};

export type BreakdownRow = {
  productId: number;
  productName: string;
  productSlug: string;
  iconPath: string | null;
  orderCount: number;
  totalQuantity: number;
  totalAmount: number;
};

export type StatusCountRow = {
  status: OrderStatus;
  orderCount: number;
};

export type Customer = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  memo: string | null;
  createdAt: string;
  orderCount: number;
  totalAmount: number;
  activeOrderCount: number;
  lastOrderDate: string | null;
  nearestWeddingDate: string | null;
  /** 고객관리 목록에서 주문번호·품목을 모두 노출하기 위한 요약 (최신순) */
  orders: CustomerOrderBrief[];
};

export type CustomerOrderBrief = {
  orderNo: string;
  orderNoShort: string;
  productName: string;
  optionText: string | null;
};

export type Product = ProductMeta & {
  orderCount: number;
  totalQuantity: number;
  totalAmount: number;
  activeOrderCount: number;
};

// ── 외주 발주 (발주관리) ──────────────────────────────────────────────────────
export type PurchaseOrderStatus = "발주" | "제작중" | "입고완료" | "취소";

export type PurchaseOrder = {
  id: number;
  orderId: number;
  vendorName: string;
  poNumber: string | null;
  orderedDate: string;
  expectedDate: string | null;
  receivedDate: string | null;
  unitCost: number | null;
  quantity: number | null;
  status: PurchaseOrderStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

/** 발주관리 목록 한 행: 외주발주 대상 주문 + (있으면) 발주 기록 */
export type PurchasingRow = {
  orderId: number;
  orderNo: string;
  orderNoShort: string;
  orderStatus: OrderStatus;
  orderDate: string;
  orderQuantity: number;
  customerName: string;
  customerPhone: string | null;
  productName: string;
  productSlug: string;
  productIconPath: string | null;
  productLinkUrl: string | null;
  productPurchasePrice: number;
  optionText: string | null;
  po: PurchaseOrder | null;
};

export type PurchaseOrderInput = {
  vendorName: string;
  poNumber?: string | null;
  orderedDate: string;
  expectedDate?: string | null;
  receivedDate?: string | null;
  unitCost?: number | null;
  quantity?: number | null;
  status: PurchaseOrderStatus;
  note?: string | null;
};
