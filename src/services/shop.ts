import { api } from "../lib/api";
import type {
  ApiResponse,
  Category,
  Order,
  Product,
} from "../types/store";
import type { CartItem } from "../lib/cartStorage";

type LaravelCartResponse = {
  success: boolean;
  message: string;
  data: {
    cart: ServerCart;
  };
};

export type ServerCartItem = {
  id: number;
  product_id: number;
  product: Product;
  quantity: number;
  price: number;
  subtotal: number;
};

export type ServerCart = {
  id: number;
  user_id: number;
  items: ServerCartItem[];
  item_count: number;
  total: number;
};

export type CheckoutPayload = {
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_notes?: string;
  payment_method?: "MPESA" | "CARD" | "CASH" | "BANK_TRANSFER";
};

export type CheckoutResponse = {
  success: boolean;
  message: string;
  data: {
    order: Order;
  };
};

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

async function getList<T>(endpoint: string): Promise<T[]> {
  const response = await api.get<
    T[] | ApiResponse<T[]> | { data: T[] }
  >(endpoint);

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
}

function extractOrders(response: unknown): Order[] {
  let result = response as Record<string, unknown> | Order[];

  // Handle Laravel paginator responses and wrapped API responses.
  for (let i = 0; i < 4; i++) {
    if (Array.isArray(result)) {
      return result as Order[];
    }

    if (!result || typeof result !== "object") {
      return [];
    }

    const object = result as Record<string, unknown>;

    if (Array.isArray(object.data)) {
      return object.data as Order[];
    }

    if (object.data && typeof object.data === "object") {
      result = object.data as Record<string, unknown>;
      continue;
    }

    if (Array.isArray(object.orders)) {
      return object.orders as Order[];
    }

    return [];
  }

  return Array.isArray(result) ? (result as Order[]) : [];
}

export const shopService = {
  getProducts(): Promise<Product[]> {
    return getList<Product>("products");
  },

  getCategories(): Promise<Category[]> {
    return getList<Category>("categories");
  },

  async getCart(): Promise<ServerCart> {
    const response = await api.get<LaravelCartResponse>(
      "cart",
      true,
    );

    return response.data.cart;
  },

  async addCartItem(
    productId: string | number,
    quantity = 1,
  ): Promise<ServerCart> {
    const response = await api.post<LaravelCartResponse>(
      "cart/items",
      {
        product_id: productId,
        quantity,
      },
      true,
    );

    return response.data.cart;
  },

  async updateCartItem(
    itemId: string | number,
    quantity: number,
  ): Promise<ServerCart> {
    const response = await api.patch<LaravelCartResponse>(
      `cart/items/${itemId}`,
      { quantity },
      true,
    );

    return response.data.cart;
  },

  async removeCartItem(
    itemId: string | number,
  ): Promise<ServerCart> {
    const response = await api.delete<LaravelCartResponse>(
      `cart/items/${itemId}`,
      true,
    );

    return response.data.cart;
  },

  async clearServerCart(): Promise<ServerCart> {
    const response = await api.delete<LaravelCartResponse>(
      "cart",
      true,
    );

    return response.data.cart;
  },

  async checkout(payload: CheckoutPayload): Promise<Order> {
    const response = await api.post<CheckoutResponse>(
      "checkout",
      payload,
      true,
    );

    return response.data.order;
  },

  async getOrders(): Promise<Order[]> {
    const response = await api.get<unknown>("orders", true);
    return extractOrders(response);
  },

  async getOrder(orderId: number | string): Promise<unknown> {
    return api.get(`orders/${orderId}`, true);
  },

  async cancelOrder(orderId: number | string): Promise<unknown> {
    return api.post(`orders/${orderId}/cancel`, {}, true);
  },

  async createPaymentIntent(
    orderId: number | string,
  ): Promise<unknown> {
    return api.post(`orders/${orderId}/payment`, {}, true);
  },

  async getPaymentIntent(
    paymentId: number | string,
  ): Promise<unknown> {
    return api.get(`payments/${paymentId}`, true);
  },

  async syncCart(items: CartItem[]): Promise<ServerCart> {
    for (const item of items) {
      await this.addCartItem(item.productId, item.quantity);
    }

    return this.getCart();
  },
};