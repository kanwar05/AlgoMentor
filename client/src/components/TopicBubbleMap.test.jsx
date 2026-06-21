import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import TopicBubbleMap, { layoutTopicBubbles } from "./TopicBubbleMap";

const arrayTopic = {
  name: "Array",
  solved: 42,
  easy: 15,
  medium: 20,
  hard: 7,
  weak: 4,
  revision: 6,
  strong: 32,
  averageConfidence: 82,
  strengthScore: 78
};

function LocationDisplay() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

function renderMap(topics) {
  return render(
    <MemoryRouter initialEntries={["/app/analytics"]}>
      <TopicBubbleMap topics={topics} />
      <LocationDisplay />
    </MemoryRouter>
  );
}

describe("TopicBubbleMap", () => {
  it("places the full topic set without dropping bubbles", () => {
    const topics = Array.from({ length: 24 }, (_, index) => ({
      ...arrayTopic,
      name: `Topic ${index + 1}`,
      solved: 24 - index
    }));
    expect(layoutTopicBubbles(topics)).toHaveLength(topics.length);
  });

  it("renders the requested empty state", () => {
    renderMap([]);
    expect(screen.getByText("Solve problems to build your topic mastery map.")).toBeInTheDocument();
  });

  it("navigates to topic-filtered problems when a bubble is clicked", () => {
    renderMap([arrayTopic]);
    fireEvent.click(screen.getByRole("button", { name: /Array: 42 solved/i }));
    expect(screen.getByTestId("location")).toHaveTextContent("/app/problems?topic=Array");
  });

  it("renders complete topic data in the hover tooltip", () => {
    renderMap([arrayTopic]);
    fireEvent.mouseEnter(screen.getByRole("button", { name: /Array: 42 solved/i }));

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Array");
    expect(tooltip).toHaveTextContent("42 solved");
    expect(tooltip).toHaveTextContent("Easy15");
    expect(tooltip).toHaveTextContent("Medium20");
    expect(tooltip).toHaveTextContent("Hard7");
    expect(tooltip).toHaveTextContent("Strong 32 · Revision 6 · Weak 4");
    expect(tooltip).toHaveTextContent("Average confidence 82%");
    expect(tooltip).toHaveTextContent("78%");
  });
});
