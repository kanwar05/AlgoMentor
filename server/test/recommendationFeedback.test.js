import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { saveRecommendationFeedback } from "../src/controllers/insightController.js";
import RecommendationFeedback from "../src/models/RecommendationFeedback.js";
import { recommendProblems } from "../src/services/recommendationService.js";

const userId = new mongoose.Types.ObjectId();

async function runController(req) {
  let body;
  let error;
  const res = {
    json(payload) {
      body = payload;
      return this;
    }
  };
  await saveRecommendationFeedback(req, res, (nextError) => {
    error = nextError;
  });
  return { body, error };
}

test("RecommendationFeedback model validates supported feedback", () => {
  const feedback = new RecommendationFeedback({
    userId,
    problemId: "two-sum",
    feedback: "too_easy"
  });
  assert.equal(feedback.validateSync(), undefined);
});

test("feedback endpoint upserts by authenticated user and problem", async () => {
  const original = RecommendationFeedback.findOneAndUpdate;
  let capturedFilter;
  let capturedUpdate;
  RecommendationFeedback.findOneAndUpdate = (filter, update) => {
    capturedFilter = filter;
    capturedUpdate = update;
    return {
      lean: async () => ({
        userId,
        problemId: "two-sum",
        feedback: "save_for_later"
      })
    };
  };

  try {
    const { body, error } = await runController({
      user: { _id: userId },
      params: { problemId: "two-sum" },
      body: { feedback: "save_for_later" }
    });

    assert.equal(error, undefined);
    assert.equal(String(capturedFilter.userId), String(userId));
    assert.equal(capturedFilter.problemId, "two-sum");
    assert.equal(capturedUpdate.$set.feedback, "save_for_later");
    assert.equal(body.feedback.feedback, "save_for_later");
  } finally {
    RecommendationFeedback.findOneAndUpdate = original;
  }
});

test("feedback endpoint rejects unsupported values", async () => {
  const { error } = await runController({
    user: { _id: userId },
    params: { problemId: "two-sum" },
    body: { feedback: "skip" }
  });
  assert.equal(error.status, 400);
});

test("dismissive feedback prevents the same recommendation from repeating", () => {
  for (const feedback of ["too_easy", "too_hard", "already_solved", "not_relevant"]) {
    const recommendations = recommendProblems([], [], "Other", [{
      problemId: "two-sum",
      feedback
    }]);
    assert.equal(recommendations.some((item) => item.problemId === "two-sum"), false);
  }
});

test("too-easy and too-hard feedback adapt difficulty scores", () => {
  const harder = recommendProblems([], [], "Other", [{ problemId: "two-sum", feedback: "too_easy" }]);
  const easier = recommendProblems([], [], "Other", [{ problemId: "trapping-rain-water", feedback: "too_hard" }]);

  assert.equal(harder.some((item) => item.difficulty === "Hard"), true);
  assert.equal(easier[0].difficulty, "Easy");
});

test("not-relevant feedback reduces weight for related topics", () => {
  const baseline = recommendProblems([], [{ topic: "Array" }], "Other");
  const adapted = recommendProblems([], [{ topic: "Array" }], "Other", [{
    problemId: "two-sum",
    feedback: "not_relevant"
  }]);

  const baselineArray = baseline.find((item) => item.problemId === "container-with-most-water");
  const adaptedArray = adapted.find((item) => item.problemId === "container-with-most-water");
  assert.ok(adaptedArray.score < baselineArray.score);
});

test("saved-for-later recommendations stay visible and rank first", () => {
  const recommendations = recommendProblems([], [], "Other", [{
    problemId: "merge-k-sorted-lists",
    feedback: "save_for_later"
  }]);
  assert.equal(recommendations[0].problemId, "merge-k-sorted-lists");
  assert.equal(recommendations[0].savedForLater, true);
});
