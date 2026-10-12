
export type CartItem = {
  productId: string | number;
  quantity: number;
};

const CART_STORAGE_KEY = "sajims_techstore_cart";

export function loadCart(): CartItem[] {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);

    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is CartItem => {
      return (
        item !== null &&
        typeof item === "object" &&
        "productId" in item &&
        "quantity" in item &&
        (typeof item.productId === "string" ||
          typeof item.productId === "number") &&
        typeof item.quantity === "number" &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
      );
    });
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Keep the current page usable if browser storage is unavailable.
  }
}

export function clearCartStorage(): void {
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    // Ignore unavailable browser storage.
  }
}
