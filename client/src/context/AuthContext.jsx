import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { clearStoredAuth, subscribeToUnauthorized } from "../api/client";
import { demoUser } from "../data/demoData";

const AuthContext = createContext(null);

function readStoredAuth() {
  try {
    const storedUser = localStorage.getItem("algomentor_user");
    const token = localStorage.getItem("algomentor_token");
    const demoMode = localStorage.getItem("algomentor_demo") === "true";

    if (!storedUser && !token && !demoMode) return { user: null, demoMode: false };

    const user = JSON.parse(storedUser);
    const validUser = user && typeof user === "object" && !Array.isArray(user);
    if (!validUser || (!demoMode && !token)) {
      clearStoredAuth();
      return { user: null, demoMode: false };
    }
    return { user, demoMode };
  } catch {
    clearStoredAuth();
    return { user: null, demoMode: false };
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth);
  const { user, demoMode } = auth;

  const persist = useCallback((payload) => {
    localStorage.setItem("algomentor_token", payload.token);
    localStorage.setItem("algomentor_user", JSON.stringify(payload.user));
    localStorage.removeItem("algomentor_demo");
    setAuth({ user: payload.user, demoMode: false });
  }, []);

  const authenticate = useCallback(async (path, values) => {
    try {
      const response = await api.post(path, values);
      const payload = response?.data;
      if (!payload?.token || !payload?.user) throw new Error("Authentication data was not returned");
      persist(payload);
      return payload;
    } catch (err) {
      if (err.response) throw err;
      throw new Error(err.message || "Authentication failed");
    }
  }, [persist]);
  const login = useCallback((credentials) => authenticate("/auth/login", credentials), [authenticate]);
  const register = useCallback((values) => authenticate("/auth/register", values), [authenticate]);
  const enterDemo = useCallback(() => {
    localStorage.removeItem("algomentor_token");
    localStorage.setItem("algomentor_demo", "true");
    localStorage.setItem("algomentor_user", JSON.stringify(demoUser));
    setAuth({ user: demoUser, demoMode: true });
  }, []);
  const logout = useCallback(() => {
    clearStoredAuth();
    setAuth({ user: null, demoMode: false });
  }, []);
  const updateUser = useCallback((next) => {
    setAuth((current) => ({ ...current, user: next }));
    localStorage.setItem("algomentor_user", JSON.stringify(next));
  }, []);

  useEffect(() => subscribeToUnauthorized(logout), [logout]);

  const value = useMemo(
    () => ({ user, demoMode, login, register, enterDemo, logout, updateUser }),
    [user, demoMode, login, register, enterDemo, logout, updateUser]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
