import assert from "node:assert/strict";
import test from "node:test";
import { validateManualImport } from "../src/controllers/syncController.js";
import { normalizeAcceptedCodeforcesSubmissions } from "../src/services/codeforcesSync.service.js";
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
  const result = normalizeAcceptedCodeforcesSubmissions([submission(), submission({ id: 999 })]);
  assert.equal(result.records.length, 1);
  assert.equal(result.totalAccepted, 1);
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
