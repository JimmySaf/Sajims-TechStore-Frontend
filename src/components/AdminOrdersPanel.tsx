import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import {
  RefreshCw,
  Package,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";

type AdminOrderItem = {
  id: number;
  quantity: number;
  price: number | string;
  subtotal?: number | string;
  product?: {
    id: number;
    name: string;
    sku?: string;
  } | null;
};

type AdminOrder = {
  id: number;
  order_number?: string;
  status: string;
  payment_status?: string;
  payment_method?: string;
  total?: number | string;
  total_amount?: number | string;
  created_at?: string;
  user?: {
    id: number;
    name: string;
    email: string;
  } | null;
  items?: AdminOrderItem[];
};

type LaravelOrderResponse = {
  success?: boolean;
  message?: string;
  data?:
    | AdminOrder[]
    | {
        data?: AdminOrder[];
        current_page?: number;
        last_page?: number;
        total?: number;
      };
};

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const PAYMENT_STATUSES = [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
];

function money(value: number | string | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function extractOrders(response: unknown): AdminOrder[] {
  let value = response as Record<string, unknown> | AdminOrder[];

  for (let i = 0; i < 4; i++) {
    if (Array.isArray(value)) {
      return value as AdminOrder[];
    }

    if (!value || typeof value !== "object") {
      return [];
    }

    const object = value as Record<string, unknown>;

    if (Array.isArray(object.data)) {
      return object.data as AdminOrder[];
    }

    if (object.data && typeof object.data === "object") {
      value = object.data as Record<string, unknown>;
      continue;
    }

    return [];
  }

  return [];
}

export default function AdminOrdersPanel() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const params = new URLSearchParams();

      params.set("per_page", "100");

      if (statusFilter) {
        params.set("status", statusFilter);
      }

      if (paymentFilter) {
        params.set("payment_status", paymentFilter);
      }

      const response = await api.get<LaravelOrderResponse>(
        `admin/orders?${params.toString()}`,
        true,
      );

      setOrders(extractOrders(response));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load admin orders.",
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter, paymentFilter]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  async function updateStatus(
    orderId: number,
    newStatus: string,
  ) {
    setUpdatingId(orderId);
    setError("");
    setNotice("");

    try {
      await api.patch(
        `admin/orders/${orderId}/status`,
        { status: newStatus },
        true,
      );

      setNotice(`Order status updated to ${newStatus}.`);
      await loadOrders();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update the order status.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section className="min-h-screen bg-[#f5f3eb] px-5 py-8 text-[#202923] sm:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#086b59]">
              Sajims TechStore
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Admin Orders
            </h1>
            <p className="mt-2 text-sm text-[#707970]">
              Review customer orders and manage fulfilment status.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadOrders()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#dedbd1] bg-white px-4 py-3 text-sm font-semibold hover:bg-[#f8f7f1] disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">
              Order status
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-12 w-full rounded-xl border border-[#dedbd1] bg-white px-3 outline-none focus:border-[#086b59]"
            >
              <option value="">All order statuses</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">
              Payment status
            </span>
            <select
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value)}
              className="h-12 w-full rounded-xl border border-[#dedbd1] bg-white px-3 outline-none focus:border-[#086b59]"
            >
              <option value="">All payment statuses</option>
              {PAYMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <p
            role="status"
            className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {notice}
          </p>
        )}

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Customer orders</h2>
          {!loading && (
            <span className="text-sm text-[#707970]">
              {orders.length} returned
            </span>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#e4e1d8] bg-white">
          {loading ? (
            <div className="flex items-center justify-center gap-3 p-12 text-sm text-[#707970]">
              <LoaderCircle size={20} className="animate-spin" />
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center p-12 text-center">
              <Package size={36} className="mb-3 text-[#8a928a]" />
              <p className="font-semibold">No orders found</p>
              <p className="mt-1 text-sm text-[#707970]">
                Try another filter or refresh the list.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-[#f8f7f1] text-xs uppercase tracking-wide text-[#687168]">
                  <tr>
                    <th className="px-5 py-4">Order</th>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Items</th>
                    <th className="px-5 py-4">Total</th>
                    <th className="px-5 py-4">Payment</th>
                    <th className="px-5 py-4">Order status</th>
                    <th className="px-5 py-4">Update status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#eeece5]">
                  {orders.map((order) => (
                    <tr key={order.id} className="align-top hover:bg-[#fcfbf7]">
                      <td className="px-5 py-5">
                        <p className="font-semibold">
                          {order.order_number ?? `#${order.id}`}
                        </p>
                        <p className="mt-1 text-xs text-[#707970]">
                          {order.created_at
                            ? new Date(order.created_at).toLocaleString()
                            : "Date unavailable"}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <p className="font-medium">
                          {order.user?.name ?? "Customer"}
                        </p>
                        <p className="mt-1 text-xs text-[#707970]">
                          {order.user?.email ?? "Email unavailable"}
                        </p>
                      </td>

                      <td className="max-w-64 px-5 py-5">
                        {order.items?.length ? (
                          <ul className="space-y-2">
                            {order.items.map((item) => (
                              <li key={item.id}>
                                <span className="font-medium">
                                  {item.product?.name ?? "Product"}
                                </span>
                                <span className="text-[#707970]">
                                  {" "}× {item.quantity}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-[#707970]">
                            No item details
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-5 font-semibold">
                        {money(order.total ?? order.total_amount)}
                      </td>

                      <td className="px-5 py-5">
                        <p className="font-medium">
                          {order.payment_status ?? "PENDING"}
                        </p>
                        <p className="mt-1 text-xs text-[#707970]">
                          {order.payment_method ?? "Method unavailable"}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <span className="inline-flex rounded-full bg-[#e4f2e9] px-3 py-1 text-xs font-semibold text-[#236b49]">
                          {order.status}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <select
                          aria-label={`Update status for order ${order.order_number ?? order.id}`}
                          value={order.status}
                          disabled={updatingId === order.id}
                          onChange={(event) =>
                            void updateStatus(order.id, event.target.value)
                          }
                          className="h-10 min-w-40 rounded-lg border border-[#dedbd1] bg-white px-2 outline-none focus:border-[#086b59] disabled:opacity-60"
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>

                        {updatingId === order.id && (
                          <p className="mt-2 text-xs text-[#707970]">
                            Updating...
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs leading-5 text-[#707970]">
          Only authorized administrators can access these API operations.
          Payment status is managed separately from order fulfilment status.
        </p>
      </div>
    </section>
  );
}