import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import api from "../api/client";
import { AuthProvider, useAuth } from "./AuthContext";

function AuthState() {
  const { user } = useAuth();
  return <p>{user ? `Signed in as ${user.name}` : "Signed out"}</p>;
}

describe("AuthProvider session handling", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("treats corrupted localStorage auth data as logged out", () => {
    localStorage.setItem("algomentor_token", "stored-token");
    localStorage.setItem("algomentor_user", "{not-valid-json");

    render(<AuthProvider><AuthState /></AuthProvider>);

    expect(screen.getByText("Signed out")).toBeInTheDocument();
    expect(localStorage.getItem("algomentor_token")).toBe(null);
    expect(localStorage.getItem("algomentor_user")).toBe(null);
  });

  it("logs the user out immediately after any 401 response", async () => {
    localStorage.setItem("algomentor_token", "expired-token");
    localStorage.setItem("algomentor_user", JSON.stringify({ id: "user-1", name: "Ada" }));
    render(<AuthProvider><AuthState /></AuthProvider>);

    expect(screen.getByText("Signed in as Ada")).toBeInTheDocument();

    await act(async () => {
      await api.get("/protected", {
        adapter: async () => {
          const error = new Error("Unauthorized");
          error.response = { status: 401 };
          throw error;
        }
      }).catch(() => {});
    });

    expect(screen.getByText("Signed out")).toBeInTheDocument();
    expect(localStorage.getItem("algomentor_token")).toBe(null);
    expect(localStorage.getItem("algomentor_user")).toBe(null);
  });
});
