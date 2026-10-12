
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://sajims-techstore.test/api"
).replace(/\/+$/, "");

const TOKEN_KEY = "sajims_techstore_token";

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  authenticated?: boolean;
};

export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  const { method = "GET", body, authenticated = false } = options;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const token = authenticated ? getAuthToken() : null;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}/${endpoint.replace(/^\/+/, "")}`,
      {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      },
    );
  } catch {
    throw new Error(
      "Cannot connect to the Laravel API. Check that Herd is running and CORS is configured.",
    );
  }

  const text = await response.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        response.ok
          ? "The API returned an unexpected response."
          : `API request failed with status ${response.status}.`,
      );
    }
  }

  if (!response.ok) {
    const payload =
      data && typeof data === "object"
        ? (data as Record<string, unknown>)
        : {};

    const errors = payload.errors;

    if (errors && typeof errors === "object") {
      for (const value of Object.values(
        errors as Record<string, unknown>,
      )) {
        if (Array.isArray(value) && value.length > 0) {
          throw new Error(String(value[0]));
        }
      }
    }

    throw new Error(
      String(payload.message ?? `Request failed (${response.status}).`),
    );
  }

  return data as T;
}

export const api = {
  get: <T>(endpoint: string, authenticated = false) =>
    apiRequest<T>(endpoint, { authenticated }),

  post: <T>(endpoint: string, body: unknown, authenticated = false) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body,
      authenticated,
    }),

  patch: <T>(endpoint: string, body: unknown, authenticated = false) =>
    apiRequest<T>(endpoint, {
      method: "PATCH",
      body,
      authenticated,
    }),

  put: <T>(endpoint: string, body: unknown, authenticated = false) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      body,
      authenticated,
    }),

  delete: <T>(endpoint: string, authenticated = false) =>
    apiRequest<T>(endpoint, {
      method: "DELETE",
      authenticated,
    }),
};
