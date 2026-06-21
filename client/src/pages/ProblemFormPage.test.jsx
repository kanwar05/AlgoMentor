import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../api/client";
import ProblemFormPage from "./ProblemFormPage";

vi.mock("../api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  }
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ demoMode: false })
}));

const problem = {
  _id: "507f1f77bcf86cd799439011",
  title: "Two Sum",
  platform: "LeetCode",
  difficulty: "Easy",
  topics: ["Array", "Hash Map"],
  status: "Solved",
  confidence: 88,
  link: "https://leetcode.com/problems/two-sum/",
  solvedDate: "2026-06-01T00:00:00.000Z",
  notes: "Use a complement map"
};

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function renderEdit(state) {
  return render(
    <MemoryRouter initialEntries={[{
      pathname: `/app/problems/${problem._id}/edit`,
      state
    }]}>
      <Routes>
        <Route path="/app/problems/:id/edit" element={<ProblemFormPage />} />
        <Route path="/app/problems" element={<div>Problems page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProblemFormPage direct edit loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses router state immediately when it is available", () => {
    renderEdit({ problem });

    expect(screen.getByLabelText("Problem title")).toHaveValue("Two Sum");
    expect(screen.getByLabelText("Difficulty")).toHaveValue("Easy");
    expect(screen.getByLabelText("Confidence (optional)")).toHaveValue(88);
    expect(api.get).not.toHaveBeenCalled();
  });

  it("fetches and prefills the problem when router state is missing", async () => {
    api.get.mockResolvedValueOnce({ data: problem });
    renderEdit(null);

    await waitFor(() => expect(screen.getByLabelText("Problem title")).toHaveValue("Two Sum"));
    expect(api.get).toHaveBeenCalledWith(`/problems/${problem._id}`);
    expect(screen.getByLabelText("Problem link")).toHaveValue(problem.link);
    expect(screen.getByLabelText("Notes (optional)")).toHaveValue(problem.notes);
  });

  it("shows a loading state while fetching the problem", () => {
    const request = deferred();
    api.get.mockReturnValueOnce(request.promise);
    renderEdit(null);

    expect(screen.getByRole("status")).toHaveTextContent("Loading problem");
  });

  it("shows an error state and back link when fetching fails", async () => {
    api.get.mockRejectedValueOnce({ response: { data: { message: "Problem not found" } } });
    renderEdit(null);

    expect(await screen.findByRole("alert")).toHaveTextContent("Problem not found");
    expect(screen.getByRole("link", { name: /back to problems/i })).toHaveAttribute("href", "/app/problems");
  });

  it("retries a failed direct edit request", async () => {
    api.get
      .mockRejectedValueOnce(new Error("Backend unavailable"))
      .mockResolvedValueOnce({ data: problem });
    renderEdit(null);

    fireEvent.click(await screen.findByRole("button", { name: /try again/i }));
    await waitFor(() => expect(screen.getByLabelText("Problem title")).toHaveValue("Two Sum"));
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
