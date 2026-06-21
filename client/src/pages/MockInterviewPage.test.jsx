import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../api/client";
import MockInterviewPage from "./MockInterviewPage";

vi.mock("../api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn()
  }
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    demoMode: false,
    user: { targetCompany: "Google" }
  })
}));

const activeInterview = {
  _id: "507f1f77bcf86cd799439011",
  company: "Google",
  difficulty: "Medium",
  duration: 45,
  status: "active",
  startedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 45 * 60_000).toISOString(),
  problems: [
    { problemId: "house-robber", title: "House Robber", platform: "LeetCode", difficulty: "Medium", topics: ["Dynamic Programming"], link: "https://leetcode.com/problems/house-robber/" },
    { problemId: "course-schedule", title: "Course Schedule", platform: "LeetCode", difficulty: "Medium", topics: ["Graph"], link: "https://leetcode.com/problems/course-schedule/" }
  ]
};

describe("MockInterviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("creates a configured interview and starts the timer", async () => {
    api.post.mockResolvedValueOnce({ data: { interview: activeInterview } });
    render(<MemoryRouter><MockInterviewPage /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText("Company"), { target: { value: "Amazon" } });
    fireEvent.change(screen.getByLabelText("Duration"), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: /start mock interview/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/mock-interviews", {
      company: "Amazon",
      difficulty: "Medium",
      duration: 60
    }));
    expect(await screen.findByText("House Robber")).toBeInTheDocument();
    expect(screen.getByText(/results recorded/)).toBeInTheDocument();
  });

  it("records attempts and renders the scored summary", async () => {
    api.post.mockResolvedValueOnce({ data: { interview: activeInterview } });
    api.patch.mockResolvedValueOnce({
      data: {
        interview: {
          ...activeInterview,
          status: "completed",
          score: 80,
          weakTopics: ["Graph"],
          problems: [
            { ...activeInterview.problems[0], result: "solved" },
            { ...activeInterview.problems[1], result: "hint" }
          ],
          nextPracticePlan: [{ problemId: "number-of-islands", title: "Number of Islands", difficulty: "Medium", topics: ["Graph"], link: "https://leetcode.com/problems/number-of-islands/" }]
        }
      }
    });
    render(<MemoryRouter><MockInterviewPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /start mock interview/i }));
    await screen.findByText("House Robber");

    const solvedButtons = screen.getAllByRole("button", { name: "Solved" });
    const hintButtons = screen.getAllByRole("button", { name: "Used hint" });
    fireEvent.click(solvedButtons[0]);
    fireEvent.click(hintButtons[1]);
    fireEvent.click(screen.getByRole("button", { name: /finish and score interview/i }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith(
      `/mock-interviews/${activeInterview._id}/complete`,
      { attempts: [
        { problemId: "house-robber", result: "solved" },
        { problemId: "course-schedule", result: "hint" }
      ] }
    ));
    expect(await screen.findByText("80%")).toBeInTheDocument();
    expect(screen.getByText("Weak topics")).toBeInTheDocument();
    expect(screen.getByText("Number of Islands")).toBeInTheDocument();
  });

  it("resumes a persisted active interview after refresh", async () => {
    localStorage.setItem("algomentor_active_mock_interview", activeInterview._id);
    api.get.mockResolvedValueOnce({ data: { interview: activeInterview } });
    render(<MemoryRouter><MockInterviewPage /></MemoryRouter>);

    expect(await screen.findByText("Course Schedule")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(`/mock-interviews/${activeInterview._id}`);
  });
});
