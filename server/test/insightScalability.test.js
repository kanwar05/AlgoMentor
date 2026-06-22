import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { addRoadmapExplanation } from "../src/controllers/insightController.js";
import { generateAnalyticsFromSnapshot } from "../src/services/analyticsService.js";
import {
  buildAnalyticsSnapshotPipeline,
  buildRevisionCandidatePipeline,
  buildSolvedRecommendationPipeline,
  loadAnalyticsSnapshot,
  REVISION_CANDIDATE_LIMIT
} from "../src/services/insightDataService.js";

const userId = new mongoose.Types.ObjectId();

test("analytics snapshot is aggregated and deduplicated inside MongoDB", async () => {
  let capturedPipeline;
  const model = {
    async aggregate(pipeline) {
      capturedPipeline = pipeline;
      return [{
        totals: [{ totalSolved: 0, mediumHard: 0, easy: 0, medium: 0, hard: 0 }],
        platforms: [],
        topics: [],
        activity: []
      }];
    }
  };

  await loadAnalyticsSnapshot(userId, new Date("2026-06-22T00:00:00.000Z"), model);

  assert.ok(capturedPipeline.some((stage) => stage.$unionWith));
  assert.ok(capturedPipeline.some((stage) => stage.$group?.problem?.$first === "$$ROOT"));
  const facet = capturedPipeline.find((stage) => stage.$facet)?.$facet;
  assert.deepEqual(Object.keys(facet).sort(), ["activity", "platforms", "topics", "totals"]);
  assert.equal(capturedPipeline.some((stage) => stage.$project?.notes), false);
});

test("revision and recommendation queries return bounded projections", () => {
  const revisionPipeline = buildRevisionCandidatePipeline(userId, ["Graph"]);
  const revisionLimit = revisionPipeline.find((stage) => stage.$limit);
  const revisionProjection = revisionPipeline.at(-1).$project;

  assert.equal(revisionLimit.$limit, REVISION_CANDIDATE_LIMIT);
  assert.equal(revisionProjection.notes, undefined);
  assert.equal(revisionProjection.confidence, undefined);
  assert.equal(revisionProjection.title, 1);

  const titles = ["Two Sum", "Course Schedule"];
  const recommendationPipeline = buildSolvedRecommendationPipeline(userId, titles);
  assert.equal(recommendationPipeline.at(-1).$limit, titles.length);
  assert.deepEqual(recommendationPipeline.at(-2).$project, { _id: 1, title: 1 });
  assert.deepEqual(recommendationPipeline.at(-3).$match.normalizedTitle.$in, ["two sum", "course schedule"]);
});

test("analytics snapshots preserve the public response shape", () => {
  const analytics = generateAnalyticsFromSnapshot({
    totals: { totalSolved: 2, mediumHard: 1, easy: 1, medium: 1, hard: 0 },
    platforms: [{ _id: "LeetCode", count: 2 }],
    topics: [{
      _id: "Array",
      total: 2,
      easy: 1,
      medium: 1,
      hard: 0,
      weak: 1,
      revision: 0,
      confidenceTotal: 80,
      confidenceCount: 1
    }],
    activity: [{ _id: "2026-06-22", count: 2 }]
  }, 10, new Date("2026-06-22T10:00:00.000Z"));

  assert.equal(analytics.summary.totalSolved, 2);
  assert.deepEqual(analytics.summary.difficulty, { Easy: 1, Medium: 1, Hard: 0 });
  assert.equal(analytics.summary.platformCounts.LeetCode, 2);
  assert.equal(analytics.topics[0].name, "Array");
  assert.equal(analytics.activity.length, 120);
  assert.equal(analytics.weeklyActivity.length, 7);
  assert.ok(Array.isArray(analytics.allTopicStats));
  assert.ok(Array.isArray(analytics.weakTopics));
});

test("roadmap AI explanation failure falls back to the regular roadmap", async () => {
  const roadmap = {
    focusTopics: ["Graph"],
    path: [{ topic: "Graph" }]
  };
  const client = {
    responses: {
      async create() {
        throw new Error("OpenAI timeout");
      }
    }
  };

  const result = await addRoadmapExplanation(roadmap, { client, apiKey: "test-key" });

  assert.equal(result, roadmap);
  assert.equal(result.aiExplanation, null);
});

test("roadmap AI explanation is retained when generation succeeds", async () => {
  const roadmap = {
    focusTopics: ["Graph"],
    path: [{ topic: "Graph" }]
  };
  const client = {
    responses: {
      async create() {
        return { output_text: "Start with graph traversal fundamentals." };
      }
    }
  };

  const result = await addRoadmapExplanation(roadmap, { client, apiKey: "test-key" });

  assert.equal(result.aiExplanation, "Start with graph traversal fundamentals.");
});

test("analytics pipeline includes a bounded activity window", () => {
  const pipeline = buildAnalyticsSnapshotPipeline(userId, new Date("2026-06-22T00:00:00.000Z"));
  const activityMatch = pipeline.find((stage) => stage.$facet).$facet.activity[0].$match;
  assert.ok(activityMatch.solvedDate.$gte instanceof Date);
  assert.equal(activityMatch.solvedDate.$gte.toISOString(), "2026-02-23T00:00:00.000Z");
});
