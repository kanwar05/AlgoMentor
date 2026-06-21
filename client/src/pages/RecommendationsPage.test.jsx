import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../api/client";
import RecommendationsPage from "./RecommendationsPage";

const refetch = vi.fn();

vi.mock("../api/client", () => ({
  default: { put: vi.fn() }
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ demoMode: false })
}));

vi.mock("../hooks/useRemoteData", () => ({
  useRemoteData: () => ({
    data: {
      targetCompany: "Google",
      recommendations: [{
        problemId: "house-robber",
        title: "House Robber",
        platform: "LeetCode",
        difficulty: "Medium",
        topics: ["Dynamic Programming"],
        companies: ["Google"],
        link: "https://leetcode.com/problems/house-robber/",
        reason: "Targets Dynamic Programming",
        savedForLater: false
      }]
    },
    loading: false,
    error: null,
    refetch
  })
}));

describe("RecommendationsPage feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.put.mockResolvedValue({ data: { feedback: {} } });
  });

  it("persists feedback and refetches adaptive recommendations", async () => {
    render(<MemoryRouter><RecommendationsPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Too hard" }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith(
      "/recommendations/house-robber/feedback",
      { feedback: "too_hard" }
    ));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders all five feedback actions", () => {
    render(<MemoryRouter><RecommendationsPage /></MemoryRouter>);
    for (const label of ["Too easy", "Too hard", "Already solved", "Not relevant", "Save for later"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("shows API feedback errors without crashing", async () => {
    api.put.mockRejectedValueOnce(new Error("Backend unavailable"));
    render(<MemoryRouter><RecommendationsPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Not relevant" }));
    expect(await screen.findByText("Backend unavailable")).toBeInTheDocument();
  });
});
