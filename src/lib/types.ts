export type Settings = {
  restaurant_name: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  is_open: boolean;
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  tax_rate_bps: number;
  delivery_fee_cents: number;
  min_order_cents: number;
  prep_time_minutes: number;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  item_count?: number;
};

export type MenuItem = {
  id: number;
  category_id: number | null;
  category_name?: string | null;
  name: string;
  description: string;
  image_url: string | null;
  price_cents: number;
  discount_price_cents: number | null;
  track_stock: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  is_available: boolean;
  is_featured: boolean;
  tags: string[];
  calories: number | null;
  sort_order: number;
  updated_at?: string;
};

/** What the storefront needs; no admin-only fields. */
export type PublicMenuItem = {
  id: number;
  category_id: number | null;
  name: string;
  description: string;
  image_url: string | null;
  price_cents: number;
  discount_price_cents: number | null;
  in_stock: boolean;
  /** Only set when stock is tracked and low, so customers see "Only 3 left". */
  remaining: number | null;
  is_featured: boolean;
  tags: string[];
  calories: number | null;
};

export const ORDER_STATUSES = [
  "pending_payment",
  "new",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type PaymentStatus = "unpaid" | "paid" | "refunded" | "partially_refunded" | "failed" | "expired";

export type Order = {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment_type: "pickup" | "delivery";
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  subtotal_cents: number;
  savings_cents: number;
  tax_cents: number;
  delivery_fee_cents: number;
  tip_cents: number;
  total_cents: number;
  refunded_cents: number;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  item_count?: number;
};

export type OrderItem = {
  id: number;
  order_id: string;
  menu_item_id: number | null;
  name: string;
  unit_price_cents: number;
  original_price_cents: number;
  quantity: number;
  line_total_cents: number;
};

export type OrderEvent = {
  id: number;
  type: string;
  message: string;
  actor: string;
  created_at: string;
};

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: "owner" | "staff";
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
};
