import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../api/client";
import RevisionPlanPage from "./RevisionPlanPage";

vi.mock("../api/client", () => ({
  default: { patch: vi.fn() }
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ demoMode: false })
}));

vi.mock("../hooks/useRemoteData", () => ({
  useRemoteData: () => ({
    data: {
      strategy: "Adaptive spaced repetition",
      days: [{
        day: 1,
        date: "2026-06-20",
        theme: "Dynamic Programming",
        tasks: [{
          id: "task-1",
          problemId: "problem-1",
          title: "Coin Change",
          difficulty: "Medium",
          topics: ["Dynamic Programming"],
          priority: 9
        }]
      }]
    },
    loading: false,
    error: null,
    refetch: vi.fn()
  })
}));

describe("RevisionPlanPage adaptive feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits result and confidence and shows the next review", async () => {
    api.patch.mockResolvedValueOnce({
      data: {
        attempt: {
          result: "hint",
          confidence: 60,
          interval: 1,
          nextReviewAt: "2026-06-21T00:00:00.000Z"
        }
      }
    });

    render(<MemoryRouter><RevisionPlanPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Confidence for Coin Change"), { target: { value: "60" } });
    fireEvent.change(screen.getByLabelText("Minutes spent on Coin Change"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Used hint" }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith(
      "/revision-plan/task-1/complete",
      { result: "hint", confidence: 60, timeTaken: 300 }
    ));
    expect(await screen.findByText(/Next review/)).toHaveTextContent("1 day interval");
  });
});
