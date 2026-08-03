import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "@/api/auth";
import { usersApi } from "@/api/users";
import { tokenStorage } from "@/utils/storage";
import { extractEmailFromToken, isTokenExpired } from "@/utils/jwt";
import { profileCache } from "@/utils/profileCache";
import { ChangePasswordRequest, LoginRequest, RegisterRequest, User } from "@/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  changePassword: (payload: ChangePasswordRequest) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    restoreSession();
  }, []);

  async function buildUserFromToken(accessToken: string): Promise<User> {
    const email = extractEmailFromToken(accessToken);
    const cachedName = await profileCache.getName(email);
    return { email, name: cachedName ?? undefined };
  }

  async function restoreSession() {
    const token = await tokenStorage.getAccessToken();
    const refreshToken = await tokenStorage.getRefreshToken();

    if (!token || !refreshToken) {
      setIsLoading(false);
      return;
    }

    try {
      if (isTokenExpired(token)) {
        const { data } = await authApi.refresh(refreshToken);
        await tokenStorage.setTokens(data.accessToken, data.refreshToken);
        setUser(await buildUserFromToken(data.accessToken));
      } else {
        setUser(await buildUserFromToken(token));
      }
    } catch {
      await tokenStorage.clear();
    } finally {
      setIsLoading(false);
    }
  }

  async function login(payload: LoginRequest) {
    setError(null);
    try {
      const { data } = await authApi.login(payload);
      await tokenStorage.setTokens(data.accessToken, data.refreshToken);
      setUser(await buildUserFromToken(data.accessToken));
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo iniciar sesion");
      throw err;
    }
  }

  async function register(payload: RegisterRequest) {
    setError(null);
    try {
      await authApi.register(payload);
      await profileCache.setName(payload.email, payload.name);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo registrar el usuario");
      throw err;
    }
  }


  async function changePassword(payload: ChangePasswordRequest) {
    setError(null);
    try {
      const { data } = await usersApi.changePassword(payload);
      await tokenStorage.setTokens(data.accessToken, data.refreshToken);
      setUser(await buildUserFromToken(data.accessToken));
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo cambiar la contrasena");
      throw err;
    }
  }

  async function logout() {
    await tokenStorage.clear();
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      changePassword,
      logout,
      error,
    }),
    [user, isLoading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
