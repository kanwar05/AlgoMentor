import assert from "node:assert/strict";
import test from "node:test";
import { validateManualImport } from "../src/controllers/syncController.js";
import Problem from "../src/models/Problem.js";
import { normalizeAcceptedCodeforcesSubmissions } from "../src/services/codeforcesSync.service.js";
import { fetchLeetCodeAccepted } from "../src/services/leetcodeSync.service.js";
import { buildTopicStats, generateAnalytics } from "../src/services/analyticsService.js";
import { mapCodeforcesTopics, mapLeetCodeTopics } from "../src/services/platformTopicMapping.js";
import { recommendProblems } from "../src/services/recommendationService.js";
import { normalizeTopic, normalizeTopics } from "../src/utils/topicNormalizer.js";

const submission = (overrides = {}) => ({
  id: 101,
  verdict: "OK",
  programmingLanguage: "GNU C++17",
  creationTimeSeconds: 1_700_000_000,
  problem: {
    contestId: 1800,
    index: "A",
    name: "Array Coloring",
    tags: ["implementation", "greedy"],
    rating: 900
  },
  ...overrides
});

test("Codeforces sync keeps accepted submissions only", () => {
  const result = normalizeAcceptedCodeforcesSubmissions([
    submission(),
    submission({ id: 102, verdict: "WRONG_ANSWER", problem: { contestId: 1800, index: "B", name: "Wrong", tags: [] } })
  ]);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].title, "Array Coloring");
});

test("Codeforces sync prevents duplicate contestId + index records", () => {
  const result = normalizeAcceptedCodeforcesSubmissions([
    submission(),
    submission({ id: 999, creationTimeSeconds: 1_600_000_000 })
  ]);
  assert.equal(result.records.length, 1);
  assert.equal(result.totalAccepted, 1);
  assert.equal(result.records[0].submissionId, "999");
  assert.equal(result.records[0].solvedAt.toISOString(), new Date(1_600_000_000 * 1000).toISOString());
});

test("platform tags map to AlgoMentor topics", () => {
  assert.deepEqual(mapCodeforcesTopics(["implementation", "dp", "shortest paths"]), [
    "Array", "Basic Programming", "Dynamic Programming", "Graph"
  ]);
  assert.deepEqual(mapLeetCodeTopics(["array", "hash-table", "heap-priority-queue"]), [
    "Array", "Hash Map", "Heap"
  ]);
});

test("topic normalization handles aliases safely and removes duplicates", () => {
  assert.equal(normalizeTopic(null), "");
  assert.equal(normalizeTopic("  ARRAYS  "), "Array");
  assert.equal(normalizeTopic("hash-table"), "Hash Map");
  assert.deepEqual(
    normalizeTopics(["Array", " arrays ", "hash-table", "Hash Map", null, undefined]),
    ["Array", "Hash Map"]
  );
});

test("problem documents store canonical normalized topics", () => {
  const problem = new Problem({
    user: "507f1f77bcf86cd799439011",
    title: "Alias test",
    platform: "LeetCode",
    difficulty: "Easy",
    topics: ["Arrays", "array", "hash-table", "Hashing"]
  });

  assert.deepEqual(problem.topics, ["Array", "Hash Map"]);
});

test("analytics groups equivalent topics under one canonical name", () => {
  const stats = buildTopicStats([
    { topics: ["Array", "Arrays"], status: "Solved" },
    { topics: [" arrays "], status: "Revision" },
    { topics: ["hash-table"], status: "Solved" },
    { topics: ["Hash Map"], status: "Weak" }
  ]);

  assert.equal(stats.find((item) => item.topic === "Array").total, 2);
  assert.equal(stats.find((item) => item.topic === "Hash Map").total, 2);
  assert.equal(stats.some((item) => item.topic === "Arrays"), false);
});

test("weak-topic and readiness calculations do not split equivalent topics", () => {
  const base = {
    platform: "LeetCode",
    difficulty: "Medium",
    status: "Solved",
    solvedDate: new Date()
  };
  const aliases = generateAnalytics([
    { ...base, title: "One", topics: ["Array"] },
    { ...base, title: "Two", topics: ["Arrays"] },
    { ...base, title: "Three", topics: ["array", "Array"] }
  ], 10);
  const canonical = generateAnalytics([
    { ...base, title: "One", topics: ["Array"] },
    { ...base, title: "Two", topics: ["Array"] },
    { ...base, title: "Three", topics: ["Array"] }
  ], 10);

  assert.deepEqual(aliases.topicStats.map((item) => item.topic), ["Array"]);
  assert.equal(aliases.topicStats[0].total, 3);
  assert.deepEqual(aliases.weakTopics, canonical.weakTopics);
  assert.deepEqual(aliases.readiness, canonical.readiness);
});

test("recommendations match weak topics through normalized aliases", () => {
  const recommendations = recommendProblems([], [{ topic: "hash-table" }], "Other");
  const twoSum = recommendations.find((item) => item.title === "Two Sum");

  assert.ok(twoSum);
  assert.ok(twoSum.topics.includes("Hash Map"));
  assert.match(twoSum.reason, /Hash Map/);
});

test("readiness score updates after synced problems are added", () => {
  const before = generateAnalytics([], 10);
  const synced = Array.from({ length: 20 }, (_, index) => ({
    title: `Problem ${index}`,
    platform: "Codeforces",
    difficulty: index % 3 === 0 ? "Easy" : "Medium",
    topics: [index % 2 ? "Dynamic Programming" : "Graphs"],
    status: "Solved",
    solvedDate: new Date()
  }));
  const after = generateAnalytics(synced, 10);
  assert.ok(after.summary.readinessScore > before.summary.readinessScore);
  assert.equal(after.summary.codeforcesSolved, 20);
});

test("manual import validates shape, platform, and URLs", () => {
  assert.throws(() => validateManualImport({}), /non-empty array/);
  assert.throws(() => validateManualImport([{ platform: "HackerRank", title: "Test" }]), /valid platform/);
  assert.throws(() => validateManualImport([{ platform: "LeetCode", title: "Two Sum", problemUrl: "not-a-url" }]), /invalid problemUrl/);

  const [valid] = validateManualImport([{
    platform: "LeetCode",
    title: "Two Sum",
    difficulty: "Easy",
    topics: ["array", "hash-table"],
    problemUrl: "https://leetcode.com/problems/two-sum/"
  }]);
  assert.equal(valid.platformProblemId, "two-sum");
  assert.deepEqual(valid.topics, ["Array", "Hash Map"]);
  assert.equal(valid.solvedAt, null);
});

test("manual import accepts LeetCode exporter field names", () => {
  const [valid] = validateManualImport([{
    platform: "LeetCode",
    frontendQuestionId: "42",
    title: "Trapping Rain Water",
    titleSlug: "trapping-rain-water",
    difficulty: "HARD",
    topicTags: [{ name: "Array", slug: "array" }, { name: "Dynamic Programming", slug: "dynamic-programming" }]
  }]);
  assert.equal(valid.platformProblemId, "42");
  assert.equal(valid.slug, "trapping-rain-water");
  assert.deepEqual(valid.topics, ["Array", "Dynamic Programming"]);
  assert.equal(valid.solvedAt, null);
});

test("manual import preserves the real accepted timestamp", () => {
  const [valid] = validateManualImport([{
    platform: "LeetCode",
    title: "Two Sum",
    solvedAt: "2024-03-15T10:30:00.000Z"
  }]);
  assert.equal(valid.solvedAt.toISOString(), "2024-03-15T10:30:00.000Z");
});

test("LeetCode sync reports the full solved count separately from its public recent list", async () => {
  const responses = [
    {
      data: {
        recentAcSubmissionList: [{ id: "1", title: "Two Sum", titleSlug: "two-sum", timestamp: "1700000000", lang: "javascript" }],
        matchedUser: {
          username: "coder",
          submitStatsGlobal: { acSubmissionNum: [{ difficulty: "All", count: 250 }] }
        }
      }
    },
    {
      data: {
        question: {
          questionFrontendId: "1",
          difficulty: "Easy",
          topicTags: [{ name: "Array", slug: "array" }]
        }
      }
    }
  ];
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => responses.shift()
  });

  const result = await fetchLeetCodeAccepted("coder", fetchImpl);
  assert.equal(result.records.length, 1);
  assert.equal(result.totalSolved, 250);
});
