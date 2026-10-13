export type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

export type Order = {
  id: string | number;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  paymentMethod: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  items: OrderItem[];
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function normaliseOrder(raw: Record<string, unknown>): Order {
  const rawItems = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.order_items)
      ? raw.order_items
      : [];

  const items: OrderItem[] = rawItems.map((entry, index) => {
    const item = (entry ?? {}) as Record<string, unknown>;
    const product = (item.product ?? {}) as Record<string, unknown>;

    return {
      id: String(item.id ?? `${raw.id}-${index}`),
      name:
        toText(item.name) ||
        toText(item.product_name) ||
        toText(product.name) ||
        "Product",
      quantity: toNumber(item.quantity ?? 1),
      price: toNumber(item.price ?? item.unit_price ?? product.price),
    };
  });

  const itemsTotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const total = toNumber(
    raw.total ?? raw.total_amount ?? raw.grand_total ?? itemsTotal,
  );

  return {
    id: (raw.id as string | number) ?? String(raw.order_number ?? ""),
    orderNumber: toText(raw.order_number) || `#${String(raw.id ?? "")}`,
    status: toText(raw.status) || "PENDING",
    total: total || itemsTotal,
    createdAt: toText(raw.created_at),
    paymentMethod: toText(raw.payment_method),
    shippingName: toText(raw.shipping_name),
    shippingPhone: toText(raw.shipping_phone),
    shippingAddress: toText(raw.shipping_address),
    shippingCity: toText(raw.shipping_city),
    items,
  };
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  })
    .format(price)
    .replace("KES", "KSh");
}

export function formatDate(value: string): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

export function statusClasses(status: string): string {
  switch (status.toUpperCase()) {
    case "PENDING":
      return "bg-[#fff3d6] text-[#8a6410]";
    case "PROCESSING":
    case "CONFIRMED":
      return "bg-[#e0ecfa] text-[#27578f]";
    case "SHIPPED":
    case "OUT_FOR_DELIVERY":
      return "bg-[#e7e0f7] text-[#5a3d9a]";
    case "DELIVERED":
    case "COMPLETED":
    case "PAID":
      return "bg-[#dcefe2] text-[#286a4c]";
    case "CANCELLED":
    case "CANCELED":
    case "FAILED":
      return "bg-[#fbe5e1] text-[#a33d2c]";
    default:
      return "bg-[#eeeee6] text-[#525b54]";
  }
}