import assert from "node:assert/strict";
import test from "node:test";
import { validateManualImport } from "../src/controllers/syncController.js";
import { normalizeAcceptedCodeforcesSubmissions } from "../src/services/codeforcesSync.service.js";
import { fetchLeetCodeAccepted } from "../src/services/leetcodeSync.service.js";
import { generateAnalytics } from "../src/services/analyticsService.js";
import { mapCodeforcesTopics, mapLeetCodeTopics } from "../src/services/platformTopicMapping.js";

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
    "Arrays", "Basic Programming", "Dynamic Programming", "Graphs"
  ]);
  assert.deepEqual(mapLeetCodeTopics(["array", "hash-table", "heap-priority-queue"]), [
    "Arrays", "Hashing", "Heap / Priority Queue"
  ]);
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
  assert.deepEqual(valid.topics, ["Arrays", "Hashing"]);
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
  assert.deepEqual(valid.topics, ["Arrays", "Dynamic Programming"]);
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
