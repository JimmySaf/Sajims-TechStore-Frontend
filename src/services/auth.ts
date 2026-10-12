
import { api } from "../lib/api";
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from "../lib/api";
import type { AuthUser } from "../types/store";

type AuthPayload = {
  user?: AuthUser;
  token?: string;
  access_token?: string;
  message?: string;
  data?: {
    user?: AuthUser;
    token?: string;
    access_token?: string;
  };
};

function saveSession(response: AuthPayload): AuthUser {
  const user = response.user ?? response.data?.user;
  const token =
    response.token ??
    response.access_token ??
    response.data?.token ??
    response.data?.access_token;

  if (token) {
    setAuthToken(token);
  }

  if (!user) {
    throw new Error(
      "Authentication succeeded, but the API did not return a user. Check the Laravel authentication response.",
    );
  }

  return user;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthUser> {
    const response = await api.post<AuthPayload>("auth/login", {
      email,
      password,
    });

    return saveSession(response);
  },

  async register(
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
  ): Promise<AuthUser> {
    const response = await api.post<AuthPayload>("auth/register", {
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
    });

    return saveSession(response);
  },

  async me(): Promise<AuthUser> {
    if (!getAuthToken()) {
      throw new Error("Please sign in to continue.");
    }

    const response = await api.get<AuthPayload>("auth/me", true);
    const user = response.user ?? response.data?.user;

    if (!user) {
      throw new Error("Could not load the signed-in customer.");
    }

    return user;
  },

  async logout(): Promise<void> {
    try {
      if (getAuthToken()) {
        await api.post("auth/logout", {}, true);
      }
    } finally {
      clearAuthToken();
    }
  },

  clearSession(): void {
    clearAuthToken();
  },
};
