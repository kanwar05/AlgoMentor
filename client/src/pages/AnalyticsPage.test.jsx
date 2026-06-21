import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AnalyticsPage from "./AnalyticsPage";
import { useRemoteData } from "../hooks/useRemoteData";

vi.mock("../hooks/useRemoteData", () => ({
  useRemoteData: vi.fn()
}));

vi.mock("recharts", () => {
  const Component = ({ children }) => <div>{children}</div>;
  return {
    Bar: Component,
    BarChart: Component,
    CartesianGrid: Component,
    Cell: Component,
    Pie: Component,
    PieChart: Component,
    ResponsiveContainer: Component,
    Tooltip: Component,
    XAxis: Component,
    YAxis: Component
  };
});

vi.mock("../components/TopicBubbleMap", () => ({
  default: ({ topics }) => <div data-testid="topic-map">{topics.length} topics</div>
}));

function renderPage() {
  return render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);
}

describe("AnalyticsPage request states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the loading state", () => {
    useRemoteData.mockReturnValue({ data: null, loading: true, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Building your insights");
  });

  it("renders an API failure and retries on demand", () => {
    const refetch = vi.fn();
    useRemoteData.mockReturnValue({ data: null, loading: false, error: "Server unavailable", refetch });
    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent("Server unavailable");
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders the empty state for a null response", () => {
    useRemoteData.mockReturnValue({ data: null, loading: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("does not crash when a successful response is partial", () => {
    useRemoteData.mockReturnValue({ data: { summary: null, readiness: null }, loading: false, error: null, refetch: vi.fn() });
    renderPage();

    expect(screen.getByText("Topic Mastery Map")).toBeInTheDocument();
    expect(screen.getByTestId("topic-map")).toHaveTextContent("0 topics");
    expect(screen.getByText("0-day streak")).toBeInTheDocument();
  });
});
