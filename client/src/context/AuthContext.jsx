import { createContext, useContext, useMemo, useState } from "react";
import api from "../api/client";
import { demoUser } from "../data/demoData";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("algomentor_user") || "null"));
  const [demoMode, setDemoMode] = useState(() => localStorage.getItem("algomentor_demo") === "true");

  const persist = (payload) => {
    localStorage.setItem("algomentor_token", payload.token);
    localStorage.setItem("algomentor_user", JSON.stringify(payload.user));
    localStorage.removeItem("algomentor_demo");
    setDemoMode(false);
    setUser(payload.user);
  };

  const authenticate = async (path, values) => {
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
  };
  const login = (credentials) => authenticate("/auth/login", credentials);
  const register = (values) => authenticate("/auth/register", values);
  const enterDemo = () => {
    localStorage.removeItem("algomentor_token");
    localStorage.setItem("algomentor_demo", "true");
    localStorage.setItem("algomentor_user", JSON.stringify(demoUser));
    setDemoMode(true);
    setUser(demoUser);
  };
  const logout = () => {
    localStorage.removeItem("algomentor_token");
    localStorage.removeItem("algomentor_user");
    localStorage.removeItem("algomentor_demo");
    setDemoMode(false);
    setUser(null);
  };
  const updateUser = (next) => {
    setUser(next);
    localStorage.setItem("algomentor_user", JSON.stringify(next));
  };

  const value = useMemo(() => ({ user, demoMode, login, register, enterDemo, logout, updateUser }), [user, demoMode]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
