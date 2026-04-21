import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface AuthContextValue {
  token: string | null;
  adminToken: string | null;
  isAuthenticated: boolean;
  isAdminAuthenticated: boolean;
  setToken: (token: string | null) => void;
  setAdminToken: (token: string | null) => void;
  logout: () => void;
  logoutAdmin: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("token"));
  const [adminToken, setAdminTokenState] = useState<string | null>(() => localStorage.getItem("admin_token"));

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  useEffect(() => {
    if (adminToken) {
      localStorage.setItem("admin_token", adminToken);
    } else {
      localStorage.removeItem("admin_token");
    }
  }, [adminToken]);

  const value = useMemo(
    () => ({
      token,
      adminToken,
      isAuthenticated: Boolean(token),
      isAdminAuthenticated: Boolean(adminToken),
      setToken: setTokenState,
      setAdminToken: setAdminTokenState,
      logout: () => setTokenState(null),
      logoutAdmin: () => setAdminTokenState(null),
    }),
    [adminToken, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
