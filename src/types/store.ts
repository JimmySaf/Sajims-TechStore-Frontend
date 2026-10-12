
export type Product = {
  id: number | string;
  name: string;
  slug?: string;
  brand: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  description?: string;
  rating?: number;
  reviews?: number;
};

export type Category = {
  id: number | string;
  name: string;
  slug?: string;
  description?: string;
  image?: string | null;
};

export type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data: T;
};

export type AuthUser = {
  id: number | string;
  name: string;
  email: string;
  role?: string;
};

export type Order = {
  id: number | string;
  status: string;
  payment_status?: string;
  total?: number | string;
  total_amount?: number | string;
  created_at?: string;
};
