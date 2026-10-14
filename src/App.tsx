import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Heart,
  LoaderCircle,
  Menu,
  Monitor,
  Package,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
  X,
} from "lucide-react";

import AdminOrdersPanel from "./components/AdminOrdersPanel";
import AuthModal from "./components/AuthModal";
import OrdersPanel from "./components/OrdersPanel";
import { api, getAuthToken } from "./lib/api";
import { loadCart, saveCart } from "./lib/cartStorage";
import { formatPrice, normaliseOrder, type Order } from "./lib/orders";
import { authService } from "./services/auth";
import type { AuthUser } from "./types/store";
import { shopService } from "./services/shop";

type Product = {
  id: string | number;
  name: string;
  slug?: string;
  brand: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  description?: string;
  rating: number;
  reviews: number;
};

type PaymentMethod = "MPESA" | "CARD" | "CASH" | "BANK_TRANSFER";

type CheckoutForm = {
  name: string;
  phone: string;
  address: string;
  city: string;
  notes: string;
  paymentMethod: PaymentMethod;
};

const emptyCheckoutForm: CheckoutForm = {
  name: "",
  phone: "",
  address: "",
  city: "",
  notes: "",
  paymentMethod: "CASH",
};

const sampleProducts: Product[] = [
  {
    id: "sample-hp-elitebook",
    name: "HP EliteBook 840 G10",
    brand: "HP",
    category: "Laptops",
    price: 65000,
    stock: 8,
    image:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=85",
    description: "A professional laptop for work and productivity.",
    rating: 4.8,
    reviews: 12,
  },
  {
    id: "sample-dell-optiplex",
    name: "Dell OptiPlex 7020",
    brand: "Dell",
    category: "Desktops",
    price: 45000,
    stock: 6,
    image:
      "https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=900&q=85",
    description: "Reliable desktop computing for work and home.",
    rating: 4.7,
    reviews: 8,
  },
  {
    id: "sample-kingston-ram",
    name: "Kingston 8GB DDR4 RAM",
    brand: "Kingston",
    category: "RAM",
    price: 3500,
    stock: 20,
    image:
      "https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=900&q=85",
    description: "A memory upgrade for compatible computers.",
    rating: 4.6,
    reviews: 25,
  },
  {
    id: "sample-logitech-mouse",
    name: "Logitech M171 Wireless Mouse",
    brand: "Logitech",
    category: "Mouse",
    price: 1500,
    stock: 25,
    image:
      "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=85",
    description: "A compact wireless mouse for everyday use.",
    rating: 4.8,
    reviews: 18,
  },
];

const defaultCategories = [
  "Accessories",
  "Desktops",
  "Keyboards",
  "Laptops",
  "Monitors",
  "Mouse",
  "Networking",
  "Printers",
  "RAM",
  "Storage",
];

const fallbackImages: Record<string, string> = {
  laptop:
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=85",
  desktop:
    "https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=900&q=85",
  ram:
    "https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=900&q=85",
  mouse:
    "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=85",
  monitor:
    "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=85",
  default:
    "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=900&q=85",
};

function unwrapArray<T>(payload: unknown, key: string): T[] {
  if (Array.isArray(payload)) return payload as T[];

  if (payload && typeof payload === "object") {
    const object = payload as Record<string, unknown>;

    if (Array.isArray(object[key])) {
      return object[key] as T[];
    }

    if (Array.isArray(object.data)) {
      return object.data as T[];
    }

    if (
      object.data &&
      typeof object.data === "object" &&
      Array.isArray((object.data as Record<string, unknown>).data)
    ) {
      return (object.data as { data: T[] }).data;
    }
  }

  return [];
}

function getCategoryName(value: unknown): string {
  if (typeof value === "string") return value;

  if (value && typeof value === "object") {
    const category = value as Record<string, unknown>;
    if (typeof category.name === "string") return category.name;
  }

  return "Accessories";
}

function getProductImage(product: Record<string, unknown>): string {
  const directImage = product.image_url ?? product.image;

  if (typeof directImage === "string" && directImage.trim()) {
    return directImage;
  }

  const name = String(product.name ?? "").toLowerCase();
  const category = getCategoryName(product.category).toLowerCase();
  const combined = `${name} ${category}`;

  if (combined.includes("laptop") || combined.includes("elitebook")) {
    return fallbackImages.laptop;
  }

  if (
    combined.includes("desktop") ||
    combined.includes("optiplex") ||
    combined.includes("computer")
  ) {
    return fallbackImages.desktop;
  }

  if (combined.includes("ram") || combined.includes("memory")) {
    return fallbackImages.ram;
  }

  if (combined.includes("mouse")) return fallbackImages.mouse;

  if (combined.includes("monitor") || combined.includes("display")) {
    return fallbackImages.monitor;
  }

  return fallbackImages.default;
}

function normaliseProduct(raw: Record<string, unknown>): Product {
  const brand =
    typeof raw.brand === "string" && raw.brand.trim()
      ? raw.brand
      : "Sajims";

  const category = getCategoryName(raw.category);

  const rawPrice = Number(raw.price ?? raw.unit_price ?? 0);
  const rawStock = Number(raw.stock ?? raw.quantity ?? 0);

  return {
    id: (raw.id as string | number) ?? String(raw.slug ?? raw.name ?? ""),
    name: String(raw.name ?? "Unnamed product"),
    slug: typeof raw.slug === "string" ? raw.slug : undefined,
    brand,
    category,
    price: Number.isFinite(rawPrice) ? rawPrice : 0,
    stock: Number.isFinite(rawStock) ? rawStock : 0,
    image: getProductImage(raw),
    description:
      typeof raw.description === "string" ? raw.description : undefined,
    rating: 4.8,
    reviews: 0,
  };
}

function App() {
  const [products, setProducts] = useState<Product[]>(sampleProducts);
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  const [usingSampleProducts, setUsingSampleProducts] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedBrand, setSelectedBrand] = useState("All brands");
  const [selectedPrice, setSelectedPrice] = useState("Any price");

  const [cart, setCart] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      loadCart().map((item) => [String(item.productId), item.quantity]),
    ),
  );

  const [favorites, setFavorites] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutForm, setCheckoutForm] =
    useState<CheckoutForm>(emptyCheckoutForm);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Admin state
  const [adminOpen, setAdminOpen] = useState(false);
  const isAdmin = currentUser?.role?.toUpperCase() === "ADMIN";

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);

    try {
      const [productPayload, categoryPayload] = await Promise.all([
        api.get<unknown>("products"),
        api.get<unknown>("categories"),
      ]);

      const rawProducts = unwrapArray<Record<string, unknown>>(
        productPayload,
        "products",
      );

      const rawCategories = unwrapArray<Record<string, unknown>>(
        categoryPayload,
        "categories",
      );

      const liveProducts = rawProducts.map(normaliseProduct);

      setApiConnected(true);

            if (liveProducts.length > 0) {
        setProducts(liveProducts);
        setUsingSampleProducts(false);

        // Drop cart items that are not in the live catalog (e.g. preview items).
        const liveIds = new Set(liveProducts.map((p) => String(p.id)));
        setCart((previous) =>
          Object.fromEntries(
            Object.entries(previous).filter(([id]) => liveIds.has(id)),
          ),
        );
      } else {
        setProducts(sampleProducts);
        setUsingSampleProducts(true);
      }

      if (rawCategories.length > 0) {
        setCategories(
          rawCategories
            .map((category) => String(category.name ?? ""))
            .filter(Boolean),
        );
      }
    } catch (error) {
      console.error("Unable to load the Laravel catalog:", error);
      setApiConnected(false);
      setProducts(sampleProducts);
      setUsingSampleProducts(true);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  // Loads the signed-in customer's orders (authenticated via shopService).
  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError("");

    try {
      const rawOrders = (await shopService.getOrders()) as unknown as Record<
        string,
        unknown
      >[];

      const loaded = rawOrders.map(normaliseOrder).sort((a, b) => {
        const first = new Date(a.createdAt).getTime() || 0;
        const second = new Date(b.createdAt).getTime() || 0;
        return second - first;
      });

      setOrders(loaded);
    } catch (error) {
      console.error("Unable to load orders:", error);
      setOrdersError(
        error instanceof Error
          ? error.message
          : "We could not load your orders. Please try again.",
      );
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  // Open the admin dashboard for admins; close it for everyone else.
  useEffect(() => {
    setAdminOpen(isAdmin);
  }, [isAdmin]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    saveCart(
      Object.entries(cart).map(([productId, quantity]) => ({
        productId,
        quantity,
      })),
    );
  }, [cart]);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!getAuthToken()) {
        setAuthLoading(false);
        return;
      }

      try {
        const user = await authService.me();

        if (!cancelled) setCurrentUser(user);
      } catch {
        authService.clearSession();

        if (!cancelled) setCurrentUser(null);
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // Pre-fill the delivery name once the user is signed in.
  useEffect(() => {
    if (currentUser?.name) {
      setCheckoutForm((previous) =>
        previous.name ? previous : { ...previous, name: currentUser.name },
      );
    }
  }, [currentUser]);

  // Refresh orders every time the orders panel is opened.
  useEffect(() => {
    if (ordersOpen && currentUser) {
      void loadOrders();
    }
  }, [ordersOpen, currentUser, loadOrders]);

  useEffect(() => {
    if (!notice) return;

    const timeout = window.setTimeout(() => setNotice(""), 3500);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  const brands = useMemo(
    () =>
      Array.from(new Set(products.map((product) => product.brand))).sort(),
    [products],
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const term = searchTerm.trim().toLowerCase();

      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.brand.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term);

      const matchesCategory =
        activeCategory === "All" ||
        product.category.toLowerCase() === activeCategory.toLowerCase();

      const matchesBrand =
        selectedBrand === "All brands" || product.brand === selectedBrand;

      let matchesPrice = true;

      if (selectedPrice === "Under KSh 5,000") {
        matchesPrice = product.price < 5000;
      } else if (selectedPrice === "KSh 5,000–20,000") {
        matchesPrice = product.price >= 5000 && product.price <= 20000;
      } else if (selectedPrice === "KSh 20,000–50,000") {
        matchesPrice = product.price > 20000 && product.price <= 50000;
      } else if (selectedPrice === "Over KSh 50,000") {
        matchesPrice = product.price > 50000;
      }

      return (
        matchesSearch && matchesCategory && matchesBrand && matchesPrice
      );
    });
  }, [products, searchTerm, activeCategory, selectedBrand, selectedPrice]);

  const cartCount = Object.values(cart).reduce(
    (total, quantity) => total + quantity,
    0,
  );

  const cartProducts = products.filter(
    (product) => (cart[String(product.id)] ?? 0) > 0,
  );

  const cartTotal = cartProducts.reduce(
    (total, product) =>
      total + product.price * (cart[String(product.id)] ?? 0),
    0,
  );

  function addToCart(product: Product) {
    if (product.stock <= 0) {
      setNotice("This product is currently out of stock.");
      return;
    }

    setCart((previous) => ({
      ...previous,
      [String(product.id)]: Math.min(
        (previous[String(product.id)] ?? 0) + 1,
        product.stock,
      ),
    }));

    setNotice(`${product.name} added to cart.`);
  }

  function changeQuantity(product: Product, delta: number) {
    setCart((previous) => {
      const id = String(product.id);
      const nextQuantity = (previous[id] ?? 0) + delta;
      const next = { ...previous };

      if (nextQuantity <= 0) {
        delete next[id];
      } else if (nextQuantity <= product.stock) {
        next[id] = nextQuantity;
      }

      return next;
    });
  }

  function toggleFavorite(product: Product) {
    const id = String(product.id);

    setFavorites((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  }

  function updateCheckoutField<K extends keyof CheckoutForm>(
    field: K,
    value: CheckoutForm[K],
  ) {
    setCheckoutForm((previous) => ({ ...previous, [field]: value }));
  }

  function clearAllFilters() {
    setSearchInput("");
    setSearchTerm("");
    setActiveCategory("All");
    setSelectedBrand("All brands");
    setSelectedPrice("Any price");
  }

  function openOrders() {
    if (!currentUser) {
      setMobileMenuOpen(false);
      setAuthOpen(true);
      setNotice("Please sign in to view your orders.");
      return;
    }

    setCartOpen(false);
    setMobileMenuOpen(false);
    setOrdersOpen(true);
  }

  async function handleSignOut() {
    try {
      await authService.logout();
      setNotice("You have signed out.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "There was a problem signing out.",
      );
    } finally {
      setCurrentUser(null);
      setOrders([]);
      setOrdersOpen(false);
      setOrdersError("");
      setExpandedOrderId(null);
      setAdminOpen(false);
    }
  }

  async function handleCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUser) {
      setCartOpen(false);
      setAuthOpen(true);
      setNotice("Please sign in before checking out.");
      return;
    }

    if (cartProducts.length === 0) {
      setNotice("Your cart is empty.");
      return;
    }

    if (usingSampleProducts) {
      setNotice(
        "Checkout is unavailable while preview products are showing. Connect the API first.",
      );
      return;
    }

    if (!checkoutForm.name.trim() || !checkoutForm.city.trim()) {
      setNotice("Enter the delivery name and town or city.");
      return;
    }

    setCheckoutBusy(true);

    try {
      // Replace the server cart with the current local cart so repeated
      // checkout attempts do not add the same products twice.
      await shopService.clearServerCart();

      await shopService.syncCart(
        Object.entries(cart)
          .filter(([, quantity]) => quantity > 0)
          .map(([productId, quantity]) => ({
            productId,
            quantity,
          })),
      );

      const order = await shopService.checkout({
        shipping_name: checkoutForm.name.trim(),
        shipping_phone: checkoutForm.phone.trim(),
        shipping_address: checkoutForm.address.trim(),
        shipping_city: checkoutForm.city.trim(),
        shipping_notes: checkoutForm.notes.trim() || undefined,
        payment_method: checkoutForm.paymentMethod,
      });

      setCart({});
      setCartOpen(false);

      setCheckoutForm({
        ...emptyCheckoutForm,
        name: currentUser.name,
      });

      setNotice(
        `Order ${order.order_number ?? `#${order.id}`} placed successfully! Status: ${order.status}.`,
      );

      // Show the customer their new order straight away.
      setOrdersOpen(true);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Checkout failed. Please review your cart and try again.",
      );
    } finally {
      setCheckoutBusy(false);
    }
  }

  const navItems = ["Shop", "Laptops", "Displays", "Storage"];

  function navCategory(item: string) {
    return item === "Shop" ? "All" : item === "Displays" ? "Monitors" : item;
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-[#e4e1d8] bg-white px-3 text-sm outline-none focus:border-[#086b59]";

  return (
    <div className="min-h-screen bg-[#f5f3eb] text-[#202923]">
      <header className="sticky top-0 z-40 border-b border-[#e8e5dc] bg-[#fffefa]/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-5 px-5 sm:px-7 lg:px-10">
          <a href="#" className="flex shrink-0 items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#086b59] text-lg font-semibold text-white shadow-sm">
              S
            </span>
            <span className="text-lg font-semibold tracking-tight sm:text-xl">
              Sajims <span className="font-normal text-[#667169]">TechStore</span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setActiveCategory(navCategory(item));
                  document
                    .getElementById("catalog")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`border-b-2 py-6 text-sm transition ${
                  activeCategory === navCategory(item)
                    ? "border-[#086b59] font-semibold text-[#086b59]"
                    : "border-transparent text-[#525b54] hover:text-[#086b59]"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <button
              aria-label="Focus product search"
              onClick={() =>
                document.getElementById("product-search")?.focus()
              }
              className="hidden rounded-full p-2.5 text-[#38433c] transition hover:bg-[#eeeee6] sm:inline-flex"
            >
              <Search size={20} />
            </button>

            <button
              onClick={openOrders}
              aria-label="My orders"
              title="My orders"
              className="flex items-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium text-[#38433c] transition hover:bg-[#eeeee6]"
            >
              <ClipboardList size={21} />
              <span className="hidden lg:inline">My Orders</span>
            </button>

            <button
              onClick={() => {
                setOrdersOpen(false);
                setCartOpen(true);
              }}
              aria-label={`Shopping cart with ${cartCount} items`}
              className="relative rounded-full p-2.5 text-[#38433c] transition hover:bg-[#eeeee6]"
            >
              <ShoppingCart size={21} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#08735e] px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>

            {currentUser ? (
              <div className="hidden items-center gap-2 sm:flex">
                <span className="max-w-28 truncate text-sm font-medium">
                  {currentUser.name}
                </span>

                {isAdmin && (
                  <button
                    onClick={() => setAdminOpen(true)}
                    className="rounded-xl bg-[#086b59] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#075747]"
                  >
                    Admin Dashboard
                  </button>
                )}

                <button
                  onClick={() => void handleSignOut()}
                  className="rounded-xl border border-[#e7e5dd] bg-white px-4 py-2.5 text-sm font-medium hover:border-[#086b59] hover:text-[#086b59]"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                disabled={authLoading}
                className="hidden rounded-xl border border-[#e7e5dd] bg-white px-5 py-2.5 text-sm font-medium transition hover:border-[#086b59] hover:text-[#086b59] sm:block disabled:opacity-60"
              >
                {authLoading ? "Loading..." : "Sign In"}
              </button>
            )}

            <button
              aria-label="Toggle menu"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="rounded-lg p-2 hover:bg-[#eeeee6] md:hidden"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="border-t border-[#e8e5dc] bg-[#fffefa] px-5 py-4 md:hidden">
            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setActiveCategory(navCategory(item));
                  setMobileMenuOpen(false);
                  document
                    .getElementById("catalog")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="block w-full rounded-lg px-3 py-3 text-left text-sm hover:bg-[#f0efe8]"
              >
                {item}
              </button>
            ))}

            <button
              onClick={openOrders}
              className="block w-full rounded-lg px-3 py-3 text-left text-sm font-medium text-[#086b59] hover:bg-[#f0efe8]"
            >
              My Orders
            </button>

            {!currentUser && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAuthOpen(true);
                }}
                className="mt-2 w-full rounded-xl bg-[#086b59] px-4 py-3 text-sm font-semibold text-white"
              >
                Sign In / Register
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAdminOpen(true);
                }}
                className="mt-2 w-full rounded-xl bg-[#086b59] px-4 py-3 text-sm font-semibold text-white"
              >
                Admin Dashboard
              </button>
            )}

            {currentUser && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  void handleSignOut();
                }}
                className="mt-2 w-full rounded-xl border border-[#e7e5dd] px-4 py-3 text-sm"
              >
                Sign Out
              </button>
            )}
          </nav>
        )}
      </header>

      <main
        id="catalog"
        className="mx-auto max-w-[1600px] px-5 py-8 sm:px-7 sm:py-10 lg:px-10"
      >
        <section className="mb-6">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-[#737c73]">
            Catalog
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-[#1f2520] sm:text-5xl">
                All hardware
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#788077] sm:text-base">
                Search by name, brand, or category. Prices are in Kenyan shillings.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#737c73]">
              {apiConnected ? (
                <>
                  <CheckCircle2 size={15} className="text-[#08735e]" />
                  <span>Live catalog connected</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>Preview catalog</span>
                </>
              )}
            </div>
          </div>
        </section>

        {usingSampleProducts && (
          <div className="mb-5 rounded-xl border border-[#e5d9b9] bg-[#fff9e9] px-4 py-3 text-sm leading-6 text-[#76613a]">
            Showing preview products. Connect the Laravel API to display your
            actual inventory and stock.
          </div>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSearchTerm(searchInput);
          }}
          className="mb-6 flex flex-col gap-3 sm:flex-row"
        >
          <label className="flex h-[52px] min-w-0 flex-1 items-center gap-3 rounded-xl border border-[#e4e1d8] bg-[#fffefa] px-4 shadow-sm transition focus-within:border-[#08735e]">
            <Search size={21} className="shrink-0 text-[#818981]" />
            <input
              id="product-search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search laptops, RAM, printers..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9a9f98]"
            />
            {searchInput && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearchInput("");
                  setSearchTerm("");
                }}
                className="rounded-full p-1 text-[#818981] hover:bg-[#eeeee6]"
              >
                <X size={17} />
              </button>
            )}
          </label>
          <button
            type="submit"
            className="flex h-[52px] items-center justify-center gap-2 rounded-xl bg-[#086b59] px-8 text-sm font-semibold text-white shadow-sm transition hover:bg-[#075747]"
          >
            Search
            <ArrowRight size={17} />
          </button>
        </form>

        <div className="mb-5 flex gap-2.5 overflow-x-auto pb-2">
          {["All", ...categories].map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`shrink-0 rounded-full border px-5 py-2.5 text-sm font-medium transition ${
                activeCategory === category
                  ? "border-[#086b59] bg-[#086b59] text-white shadow-sm"
                  : "border-[#e5e2d9] bg-[#fffefa] text-[#303a33] hover:border-[#a9c4b9]"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="mb-7 flex flex-wrap items-center gap-3">
          <div className="flex h-12 items-center gap-2 rounded-xl border border-[#e4e1d8] bg-[#fffefa] px-3.5">
            <SlidersHorizontal size={16} className="text-[#818981]" />
            <select
              aria-label="Filter by brand"
              value={selectedBrand}
              onChange={(event) => setSelectedBrand(event.target.value)}
              className="max-w-40 bg-transparent text-sm outline-none"
            >
              <option value="All brands">Any brand</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          <select
            aria-label="Filter by price"
            value={selectedPrice}
            onChange={(event) => setSelectedPrice(event.target.value)}
            className="h-12 min-w-48 rounded-xl border border-[#e4e1d8] bg-[#fffefa] px-3.5 text-sm outline-none focus:border-[#08735e]"
          >
            <option value="Any price">Any price</option>
            <option value="Under KSh 5,000">Under KSh 5,000</option>
            <option value="KSh 5,000–20,000">KSh 5,000–20,000</option>
            <option value="KSh 20,000–50,000">KSh 20,000–50,000</option>
            <option value="Over KSh 50,000">Over KSh 50,000</option>
          </select>

          {(searchTerm ||
            activeCategory !== "All" ||
            selectedBrand !== "All brands" ||
            selectedPrice !== "Any price") && (
            <button
              onClick={clearAllFilters}
              className="text-sm font-medium text-[#086b59] hover:underline"
            >
              Clear filters
            </button>
          )}

          <p className="ml-auto text-sm text-[#7c837a]">
            {filteredProducts.length}{" "}
            {filteredProducts.length === 1 ? "product" : "products"}
          </p>
        </div>

        {catalogLoading && (
          <div className="mb-5 flex items-center gap-2 text-sm text-[#737c73]">
            <LoaderCircle size={17} className="animate-spin" />
            Checking the live catalog...
          </div>
        )}

        {filteredProducts.length > 0 ? (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const id = String(product.id);
              const inStock = product.stock > 0;
              const favorite = favorites.includes(id);

              return (
                <article
                  key={id}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#e7e4db] bg-[#fffefa] p-2.5 shadow-[0_2px_8px_rgba(36,45,37,0.025)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(36,45,37,0.08)]"
                >
                  <div className="relative h-52 overflow-hidden rounded-xl bg-[#f2f0e9] sm:h-48">
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.src = fallbackImages.default;
                      }}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.035]"
                    />

                    <span
                      className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        inStock
                          ? "bg-[#dcefe2]/95 text-[#286a4c]"
                          : "bg-[#fbe5e1]/95 text-[#a33d2c]"
                      }`}
                    >
                      {inStock ? "In stock" : "Out of stock"}
                    </span>

                    <button
                      onClick={() => toggleFavorite(product)}
                      aria-label={
                        favorite ? "Remove from favourites" : "Add to favourites"
                      }
                      className={`absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-[#e8e5dc] bg-[#fffefa]/95 transition ${
                        favorite
                          ? "text-rose-600"
                          : "text-[#778078] hover:text-rose-600"
                      }`}
                    >
                      <Heart
                        size={16}
                        fill={favorite ? "currentColor" : "none"}
                      />
                    </button>
                  </div>

                  <div className="flex flex-1 flex-col px-1.5 pt-3.5 pb-1">
                    <h2 className="line-clamp-2 min-h-10 text-[14px] font-semibold leading-5 text-[#202923]">
                      {product.name}
                    </h2>
                    <p className="mt-1 text-xs text-[#7b827a]">
                      {product.brand}
                    </p>

                    <p className="mt-2 text-lg font-bold tracking-tight text-[#086b59]">
                      {formatPrice(product.price)}
                    </p>

                    <div className="mt-1 flex items-center gap-1.5 text-xs text-[#7b827a]">
                      <span className="tracking-[1px] text-[#e8ac2d]">
                        ★★★★★
                      </span>
                      <span>({product.reviews})</span>
                    </div>

                    <div className="mt-3 grid grid-cols-[48px_1fr] gap-2 border-t border-[#eeece5] pt-3">
                      <button
                        onClick={() => {
                          addToCart(product);
                          setCartOpen(true);
                        }}
                        disabled={!inStock}
                        aria-label={`Add ${product.name} to cart`}
                        className="flex h-10 items-center justify-center rounded-xl border border-[#e6e4db] text-[#38695b] transition hover:border-[#086b59] hover:bg-[#f0f7f2] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ShoppingCart size={17} />
                      </button>

                      <button
                        onClick={() => addToCart(product)}
                        disabled={!inStock}
                        className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#086b59] px-2 text-xs font-semibold text-white transition hover:bg-[#075747] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#dcd9cf] bg-[#fffefa]/70 px-6 py-16 text-center">
            <Package size={35} className="mx-auto text-[#98a097]" />
            <h2 className="mt-4 text-lg font-semibold">No products found</h2>
            <p className="mt-1 text-sm text-[#7b827a]">
              Try a different search or remove some filters.
            </p>
            <button
              onClick={clearAllFilters}
              className="mt-5 rounded-xl bg-[#086b59] px-5 py-3 text-sm font-semibold text-white hover:bg-[#075747]"
            >
              Clear all filters
            </button>
          </div>
        )}

        <section className="mt-12 grid gap-4 border-t border-[#e4e1d8] pt-8 sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-xl bg-[#fffefa]/65 p-4">
            <Truck size={22} className="mt-0.5 shrink-0 text-[#086b59]" />
            <div>
              <h3 className="text-sm font-semibold">Convenient shopping</h3>
              <p className="mt-1 text-xs leading-5 text-[#7b827a]">
                Browse available hardware and build your cart online.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-[#fffefa]/65 p-4">
            <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-[#086b59]" />
            <div>
              <h3 className="text-sm font-semibold">Live inventory</h3>
              <p className="mt-1 text-xs leading-5 text-[#7b827a]">
                Stock information comes from the catalog when the API is connected.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-[#fffefa]/65 p-4">
            <Monitor size={22} className="mt-0.5 shrink-0 text-[#086b59]" />
            <div>
              <h3 className="text-sm font-semibold">Hardware for your setup</h3>
              <p className="mt-1 text-xs leading-5 text-[#7b827a]">
                Explore computers, displays, memory, and accessories.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e4e1d8] bg-[#fffefa]">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-5 py-6 text-sm text-[#737c73] sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-10">
          <p>
            © {new Date().getFullYear()} Sajims TechStore. All rights reserved.
          </p>
          <p>Technology for work, learning, and everyday life.</p>
        </div>
      </footer>

      {notice && (
        <div
          role="status"
          className="fixed right-4 bottom-4 z-[120] max-w-sm rounded-xl border border-[#dce5dc] bg-[#fffefa] px-4 py-3 text-sm font-medium text-[#244d3d] shadow-xl"
        >
          {notice}
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-[90] flex justify-end bg-[#17251f]/40">
          <button
            aria-label="Close cart"
            onClick={() => setCartOpen(false)}
            className="absolute inset-0 cursor-default"
          />

          <aside className="relative flex h-full w-full max-w-md flex-col bg-[#fffefa] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e8e5dc] px-5 py-5">
              <div>
                <h2 className="text-xl font-semibold">Your cart</h2>
                <p className="mt-1 text-xs text-[#7b827a]">
                  {cartCount} {cartCount === 1 ? "item" : "items"}
                </p>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                aria-label="Close cart"
                className="rounded-full p-2 hover:bg-[#f0efe8]"
              >
                <X size={21} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {cartProducts.length === 0 ? (
                <div className="py-16 text-center">
                  <ShoppingCart
                    size={36}
                    className="mx-auto text-[#98a097]"
                  />
                  <p className="mt-4 font-semibold">Your cart is empty</p>
                  <p className="mt-1 text-sm text-[#7b827a]">
                    Add a product to get started.
                  </p>
                  <button
                    onClick={() => setCartOpen(false)}
                    className="mt-5 rounded-xl bg-[#086b59] px-5 py-3 text-sm font-semibold text-white"
                  >
                    Continue shopping
                  </button>
                </div>
              ) : (
                cartProducts.map((product) => {
                  const quantity = cart[String(product.id)] ?? 0;

                  return (
                    <div
                      key={String(product.id)}
                      className="flex gap-3 border-b border-[#eeece5] pb-4"
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-20 w-20 rounded-xl bg-[#f2f0e9] object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold leading-5">
                          {product.name}
                        </h3>
                        <p className="mt-1 text-sm font-bold text-[#086b59]">
                          {formatPrice(product.price)}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <button
                            onClick={() => changeQuantity(product, -1)}
                            aria-label="Decrease quantity"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e4e1d8]"
                          >
                            −
                          </button>
                          <span className="min-w-4 text-center text-sm">
                            {quantity}
                          </span>
                          <button
                            onClick={() => changeQuantity(product, 1)}
                            aria-label="Increase quantity"
                            disabled={quantity >= product.stock}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#e4e1d8] disabled:opacity-40"
                          >
                            +
                          </button>
                          <button
                            onClick={() =>
                              setCart((previous) => {
                                const next = { ...previous };
                                delete next[String(product.id)];
                                return next;
                              })
                            }
                            className="ml-auto text-xs text-[#a33d2c] hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {cartProducts.length > 0 && (
              <div className="max-h-[70vh] overflow-y-auto border-t border-[#e8e5dc] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-[#737c73]">Subtotal</span>
                  <span className="text-xl font-bold text-[#086b59]">
                    {formatPrice(cartTotal)}
                  </span>
                </div>

                <p className="mb-4 text-xs leading-5 text-[#858b83]">
                  Delivery charges and final totals must be confirmed by the
                  server during checkout.
                </p>

                <form onSubmit={handleCheckout} className="space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[#525b54]">
                      Delivery name
                    </span>
                    <input
                      required
                      maxLength={255}
                      value={checkoutForm.name}
                      onChange={(event) =>
                        updateCheckoutField("name", event.target.value)
                      }
                      placeholder="Full name for delivery"
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[#525b54]">
                      Phone number
                    </span>
                    <input
                      required
                      maxLength={30}
                      value={checkoutForm.phone}
                      onChange={(event) =>
                        updateCheckoutField("phone", event.target.value)
                      }
                      placeholder="e.g. 07xx xxx xxx"
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[#525b54]">
                      Delivery address
                    </span>
                    <input
                      required
                      maxLength={255}
                      value={checkoutForm.address}
                      onChange={(event) =>
                        updateCheckoutField("address", event.target.value)
                      }
                      placeholder="Estate, street, or delivery location"
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[#525b54]">
                      Town / City
                    </span>
                    <input
                      required
                      maxLength={100}
                      value={checkoutForm.city}
                      onChange={(event) =>
                        updateCheckoutField("city", event.target.value)
                      }
                      placeholder="e.g. Nairobi, Kilifi, Mombasa"
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[#525b54]">
                      Payment method
                    </span>
                    <select
                      required
                      value={checkoutForm.paymentMethod}
                      onChange={(event) =>
                        updateCheckoutField(
                          "paymentMethod",
                          event.target.value as PaymentMethod,
                        )
                      }
                      className={inputClass}
                    >
                      <option value="CASH">Cash</option>
                      <option value="MPESA">M-Pesa</option>
                      <option value="CARD">Card</option>
                      <option value="BANK_TRANSFER">Bank transfer</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[#525b54]">
                      Order notes (optional)
                    </span>
                    <textarea
                      maxLength={1000}
                      value={checkoutForm.notes}
                      onChange={(event) =>
                        updateCheckoutField("notes", event.target.value)
                      }
                      rows={2}
                      placeholder="Any delivery instructions"
                      className="w-full resize-none rounded-xl border border-[#e4e1d8] bg-white px-3 py-2 text-sm outline-none focus:border-[#086b59]"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={checkoutBusy}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#086b59] px-4 text-sm font-semibold text-white hover:bg-[#075747] disabled:opacity-60"
                  >
                    {checkoutBusy && (
                      <LoaderCircle size={17} className="animate-spin" />
                    )}
                    {currentUser ? "Place Order" : "Sign In to Checkout"}
                  </button>
                </form>
              </div>
            )}
          </aside>
        </div>
      )}

      {ordersOpen && (
        <OrdersPanel
          orders={orders}
          loading={ordersLoading}
          error={ordersError}
          expandedOrderId={expandedOrderId}
          onToggle={setExpandedOrderId}
          onRefresh={() => void loadOrders()}
          onClose={() => setOrdersOpen(false)}
        />
      )}

      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onAuthenticated={(user) => {
            setCurrentUser(user);
            setNotice(`Welcome, ${user.name}!`);
          }}
        />
      )}

      {adminOpen && isAdmin && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#f5f3eb]">
          <div className="sticky top-0 z-10 border-b border-[#e8e5dc] bg-[#fffefa] px-5 py-3">
            <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
              <span className="font-semibold text-[#202923]">
                Sajims TechStore — Admin
              </span>

              <button
                onClick={() => setAdminOpen(false)}
                className="rounded-xl bg-[#086b59] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#075747]"
              >
                Back to Shop
              </button>
            </div>
          </div>

          <AdminOrdersPanel />
        </div>
      )}
    </div>
  );
}

export default App;