import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SyncedProblemsTable from "./SyncedProblemsTable";

const problem = {
  _id: "problem-1",
  title: "Two Sum",
  platform: "LeetCode",
  difficulty: "Easy",
  topics: ["Array", "Hash Map"],
  status: "Strong",
  notes: "",
  confidence: null,
  lastReviewedAt: null,
  problemUrl: "https://leetcode.com/problems/two-sum/"
};

describe("SyncedProblemsTable annotations", () => {
  it("opens existing annotations and saves edited learning data", async () => {
    const onSaveAnnotations = vi.fn().mockResolvedValue(undefined);
    render(<SyncedProblemsTable problems={[problem]} onSaveAnnotations={onSaveAnnotations} />);

    fireEvent.click(screen.getByRole("button", { name: "Annotate Two Sum" }));
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "Revision" } });
    fireEvent.change(screen.getByLabelText("Confidence"), { target: { value: "60" } });
    fireEvent.change(screen.getByLabelText("Last reviewed"), { target: { value: "2026-06-20" } });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Review complement lookup" } });
    fireEvent.click(screen.getByRole("button", { name: "Save annotations" }));

    await waitFor(() => expect(onSaveAnnotations).toHaveBeenCalledWith("problem-1", {
      status: "Revision",
      confidence: 60,
      lastReviewedAt: "2026-06-20",
      notes: "Review complement lookup"
    }));
  });

  it("shows annotation save failures without closing the editor", async () => {
    const onSaveAnnotations = vi.fn().mockRejectedValue(new Error("Backend unavailable"));
    render(<SyncedProblemsTable problems={[problem]} onSaveAnnotations={onSaveAnnotations} />);

    fireEvent.click(screen.getByRole("button", { name: "Annotate Two Sum" }));
    fireEvent.click(screen.getByRole("button", { name: "Save annotations" }));

    expect(await screen.findByText("Backend unavailable")).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
  });
});
