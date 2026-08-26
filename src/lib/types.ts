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
  unitPrice: number;
  totalAmount: number;
  orderDate: string;
  weddingDate: string;
  deliveryMethod: DeliveryMethod;
  shippingAddress: string | null;
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
  paymentStatus?: string;
  productId?: number;
  orderDate?: string;
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
};

export type Product = ProductMeta & {
  orderCount: number;
  totalQuantity: number;
  totalAmount: number;
  activeOrderCount: number;
};
