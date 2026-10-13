import { ChevronDown, ClipboardList, LoaderCircle, X } from "lucide-react";
import {
  formatDate,
  formatPrice,
  formatStatus,
  statusClasses,
  type Order,
} from "../lib/orders";

type OrdersPanelProps = {
  orders: Order[];
  loading: boolean;
  error: string;
  expandedOrderId: string | null;
  onToggle: (id: string | null) => void;
  onRefresh: () => void;
  onClose: () => void;
};

export default function OrdersPanel({
  orders,
  loading,
  error,
  expandedOrderId,
  onToggle,
  onRefresh,
  onClose,
}: OrdersPanelProps) {
  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-[#17251f]/40">
      <button
        aria-label="Close orders"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <aside className="relative flex h-full w-full max-w-md flex-col bg-[#fffefa] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e8e5dc] px-5 py-5">
          <div>
            <h2 className="text-xl font-semibold">My orders</h2>
            <p className="mt-1 text-xs text-[#7b827a]">
              {orders.length} {orders.length === 1 ? "order" : "orders"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#086b59] hover:bg-[#f0f7f2] disabled:opacity-50"
            >
              Refresh
            </button>
            <button
              onClick={onClose}
              aria-label="Close orders"
              className="rounded-full p-2 hover:bg-[#f0efe8]"
            >
              <X size={21} />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {loading && orders.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#737c73]">
              <LoaderCircle size={17} className="animate-spin" />
              Loading your orders...
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-[#f0cfc8] bg-[#fdf1ee] px-4 py-3 text-sm text-[#a33d2c]">
              <p>{error}</p>
              <button
                onClick={onRefresh}
                className="mt-2 text-xs font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <div className="py-16 text-center">
              <ClipboardList size={36} className="mx-auto text-[#98a097]" />
              <p className="mt-4 font-semibold">No orders yet</p>
              <p className="mt-1 text-sm text-[#7b827a]">
                Orders you place will appear here so you can track them.
              </p>
              <button
                onClick={onClose}
                className="mt-5 rounded-xl bg-[#086b59] px-5 py-3 text-sm font-semibold text-white"
              >
                Start shopping
              </button>
            </div>
          )}

          {orders.map((order) => {
            const key = String(order.id);
            const expanded = expandedOrderId === key;

            return (
              <article
                key={key}
                className="overflow-hidden rounded-2xl border border-[#e7e4db] bg-white"
              >
                <button
                  onClick={() => onToggle(expanded ? null : key)}
                  aria-expanded={expanded}
                  className="flex w-full items-start justify-between gap-3 p-4 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {order.orderNumber}
                    </p>
                    {order.createdAt && (
                      <p className="mt-0.5 text-xs text-[#7b827a]">
                        {formatDate(order.createdAt)}
                      </p>
                    )}
                    <p className="mt-2 text-sm font-bold text-[#086b59]">
                      {formatPrice(order.total)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusClasses(order.status)}`}
                    >
                      {formatStatus(order.status)}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-[#818981] transition ${
                        expanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {expanded && (
                  <div className="space-y-3 border-t border-[#eeece5] bg-[#fbfaf5] p-4 text-sm">
                    {order.items.length > 0 ? (
                      <ul className="space-y-2">
                        {order.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start justify-between gap-3"
                          >
                            <span className="min-w-0 flex-1">
                              {item.name}
                              <span className="text-[#7b827a]">
                                {" "}
                                × {item.quantity}
                              </span>
                            </span>
                            <span className="shrink-0 font-medium">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-[#7b827a]">
                        Item details are not available for this order.
                      </p>
                    )}

                    <div className="space-y-1 border-t border-[#eeece5] pt-3 text-xs text-[#525b54]">
                      {order.paymentMethod && (
                        <p>
                          <span className="font-medium">Payment:</span>{" "}
                          {formatStatus(order.paymentMethod)}
                        </p>
                      )}
                      {order.shippingName && (
                        <p>
                          <span className="font-medium">Deliver to:</span>{" "}
                          {order.shippingName}
                        </p>
                      )}
                      {order.shippingPhone && (
                        <p>
                          <span className="font-medium">Phone:</span>{" "}
                          {order.shippingPhone}
                        </p>
                      )}
                      {(order.shippingAddress || order.shippingCity) && (
                        <p>
                          <span className="font-medium">Address:</span>{" "}
                          {[order.shippingAddress, order.shippingCity]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </aside>
    </div>
  );
}