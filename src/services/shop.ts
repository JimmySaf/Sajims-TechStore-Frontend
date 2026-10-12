
import { api } from "../lib/api";
import type {
  ApiResponse,
  Category,
  Order,
  Product,
} from "../types/store";
import type { CartItem } from "../lib/cartStorage";

function unwrap<T>(response: T | ApiResponse<T>): T {
  if (
    response !== null &&
    typeof response === "object" &&
    "data" in response
  ) {
    const value = (response as ApiResponse<T>).data;

    if (value !== undefined) {
      return value;
    }
  }

  return response as T;
}

export const shopService = {
  async getProducts(): Promise<Product[]> {
    const response = await api.get<
      Product[] | ApiResponse<Product[]> | { data: Product[] }
    >("products");

    const result = unwrap(response);

    if (Array.isArray(result)) {
      return result;
    }

    if (
      result &&
      typeof result === "object" &&
      "data" in result &&
      Array.isArray(result.data)
    ) {
      return result.data;
    }

    return [];
  },

  async getCategories(): Promise<Category[]> {
    const response = await api.get<
      Category[] | ApiResponse<Category[]> | { data: Category[] }
    >("categories");

    const result = unwrap(response);

    if (Array.isArray(result)) {
      return result;
    }

    if (
      result &&
      typeof result === "object" &&
      "data" in result &&
      Array.isArray(result.data)
    ) {
      return result.data;
    }

    return [];
  },

  async getCart() {
    return api.get("cart", true);
  },

  async addCartItem(productId: string | number, quantity = 1) {
    return api.post(
      "cart",
      {
        product_id: productId,
        quantity,
      },
      true,
    );
  },

  async updateCartItem(itemId: string | number, quantity: number) {
    return api.patch(
      `cart/${itemId}`,
      { quantity },
      true,
    );
  },

  async removeCartItem(itemId: string | number) {
    return api.delete(`cart/${itemId}`, true);
  },

  async clearServerCart() {
    return api.delete("cart", true);
  },

  async checkout(payload: Record<string, unknown>) {
    return api.post("checkout", payload, true);
  },

  async getOrders(): Promise<Order[]> {
    const response = await api.get<
      Order[] | ApiResponse<Order[]> | { data: Order[] }
    >("orders", true);

    const result = unwrap(response);

    if (Array.isArray(result)) {
      return result;
    }

    if (
      result &&
      typeof result === "object" &&
      "data" in result &&
      Array.isArray(result.data)
    ) {
      return result.data;
    }

    return [];
  },

  async getOrder(orderId: number | string) {
    return api.get(`orders/${orderId}`, true);
  },

  async cancelOrder(orderId: number | string) {
    return api.post(`orders/${orderId}/cancel`, {}, true);
  },

  async createPaymentIntent(orderId: number | string) {
    return api.post(
      `orders/${orderId}/payment-intent`,
      {},
      true,
    );
  },

  async getPaymentIntent(paymentId: number | string) {
    return api.get(`payments/${paymentId}`, true);
  },

  async syncCart(items: CartItem[]) {
    for (const item of items) {
      await this.addCartItem(item.productId, item.quantity);
    }

    return this.getCart();
  },
};
