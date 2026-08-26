import { z } from "zod";

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다.");

export const orderInputSchema = z.object({
  customerName: z.string().trim().min(1, "주문자명은 필수입니다.").max(100),
  phone: z.string().trim().max(40).nullish(),
  productName: z.string().trim().min(1, "상품명은 필수입니다.").max(120),
  optionText: z.string().trim().max(500).nullish(),
  quantity: z.coerce.number().int().min(1, "수량은 1 이상이어야 합니다."),
  unitPrice: z.coerce.number().int().min(0, "단가는 0 이상이어야 합니다."),
  orderDate: dateStr,
  weddingDate: dateStr,
  deliveryMethod: z.enum(["택배배송", "방문수령"]),
  shippingAddress: z.string().trim().max(300).nullish(),
  paymentStatus: z.enum(["결제대기", "결제완료", "결제취소"]),
  orderStatus: z.enum([
    "주문완료",
    "초안등록",
    "고객확정완료",
    "외주발주",
    "인쇄팀전달",
    "인쇄완료",
    "배송중",
    "배송완료",
    "취소",
  ]),
  withInvitation: z.coerce.boolean().default(false),
  courierName: z.string().trim().max(60).nullish(),
  trackingNumber: z.string().trim().max(60).nullish(),
  deliveredDate: dateStr.nullish(),
  memo: z.string().trim().max(2000).nullish(),
});

export const orderStatusSchema = z.object({
  orderStatus: z.enum([
    "주문완료",
    "초안등록",
    "고객확정완료",
    "외주발주",
    "인쇄팀전달",
    "인쇄완료",
    "배송중",
    "배송완료",
    "취소",
  ]),
});

export const courierSchema = z.object({
  courierName: z.string().trim().max(60).nullish(),
  trackingNumber: z.string().trim().max(60).nullish(),
  deliveredDate: dateStr.nullish(),
  deliveryMethod: z.enum(["택배배송", "방문수령"]).nullish(),
  shippingAddress: z.string().trim().max(300).nullish(),
});

export const fileInputSchema = z.object({
  kind: z.enum(["attachment", "draft"]),
  fileName: z.string().trim().min(1, "파일명은 필수입니다.").max(255),
  fileSize: z.coerce.number().int().min(0).nullish(),
  contentType: z.string().trim().max(120).nullish(),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1, "삭제할 주문을 선택하세요."),
});

export const customerUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(40).nullish(),
  address: z.string().trim().max(300).nullish(),
  memo: z.string().trim().max(2000).nullish(),
});

export const productUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  defaultUnitPrice: z.coerce.number().int().min(0).optional(),
  isActive: z.coerce.boolean().optional(),
  linkUrl: z.string().trim().max(500).nullish(),
});

export const orderListQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
  paymentStatus: z.string().trim().optional(),
  productId: z.coerce.number().int().positive().optional(),
  orderDate: dateStr.optional(),
  showAllDates: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .transform((v) => v === true || v === "true")
    .optional(),
  sort: z
    .enum(["orderDateDesc", "orderDateAsc", "weddingDateAsc", "amountDesc"])
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});
