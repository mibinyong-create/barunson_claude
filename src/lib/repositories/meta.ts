import { query } from "@/lib/db";
import { TODAY } from "@/lib/constants";
import type { Meta } from "@/lib/types";

/** 화면이 필요로 하는 코드 테이블 일체를 한 번에 내려준다. */
export async function getMeta(): Promise<Meta> {
  const [statuses, payments, deliveries, couriers, products] = await Promise.all([
    query<{
      code: string;
      sort_order: number;
      is_active_stage: boolean;
      is_quick_tile: boolean;
      css_class: string;
      ink_color: string;
      bg_color: string;
    }>(`SELECT * FROM order_statuses ORDER BY sort_order`),
    query<{
      code: string;
      sort_order: number;
      css_class: string;
      ink_color: string;
      bg_color: string;
    }>(`SELECT * FROM payment_statuses ORDER BY sort_order`),
    query<{ code: string; sort_order: number; requires_address: boolean }>(
      `SELECT * FROM delivery_methods ORDER BY sort_order`,
    ),
    query<{
      id: number;
      name: string;
      tracking_url_template: string | null;
      sort_order: number;
    }>(`SELECT * FROM couriers WHERE is_active ORDER BY sort_order`),
    query<{
      id: number;
      name: string;
      slug: string;
      default_unit_price: number;
      purchase_price: number;
      icon_path: string | null;
      link_url: string | null;
      sort_order: number;
      is_active: boolean;
    }>(`SELECT * FROM products WHERE is_active ORDER BY sort_order, name`),
  ]);

  return {
    orderStatuses: statuses.map((s) => ({
      code: s.code as Meta["orderStatuses"][number]["code"],
      sortOrder: s.sort_order,
      isActiveStage: s.is_active_stage,
      isQuickTile: s.is_quick_tile,
      cssClass: s.css_class,
      inkColor: s.ink_color,
      bgColor: s.bg_color,
    })),
    paymentStatuses: payments.map((p) => ({
      code: p.code as Meta["paymentStatuses"][number]["code"],
      sortOrder: p.sort_order,
      cssClass: p.css_class,
      inkColor: p.ink_color,
      bgColor: p.bg_color,
    })),
    deliveryMethods: deliveries.map((d) => ({
      code: d.code as Meta["deliveryMethods"][number]["code"],
      sortOrder: d.sort_order,
      requiresAddress: d.requires_address,
    })),
    couriers: couriers.map((c) => ({
      id: c.id,
      name: c.name,
      trackingUrlTemplate: c.tracking_url_template,
      sortOrder: c.sort_order,
    })),
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      defaultUnitPrice: p.default_unit_price,
      purchasePrice: p.purchase_price,
      iconPath: p.icon_path,
      linkUrl: p.link_url,
      sortOrder: p.sort_order,
      isActive: p.is_active,
    })),
    today: TODAY,
  };
}
