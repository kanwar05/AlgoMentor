import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { completeMockInterview, getMockInterview } from "../src/controllers/mockInterviewController.js";
import MockInterview from "../src/models/MockInterview.js";
import {
  buildNextPracticePlan,
  generateMockInterviewProblems,
  mockInterviewExpiry,
  scoreMockInterview
} from "../src/services/mockInterviewService.js";

async function runCompleteMockInterview(interview, attempts) {
  const original = MockInterview.findOne;
  const userId = interview.userId;
  let body;
  let error;
  MockInterview.findOne = async () => interview;

  try {
    await completeMockInterview(
      {
        user: { _id: userId },
        params: { id: String(interview._id) },
        body: { attempts }
      },
      { json(payload) { body = payload; } },
      (nextError) => { error = nextError; }
    );
    return { body, error };
  } finally {
    MockInterview.findOne = original;
  }
}

function completionInterview(expiresAt) {
  const problems = generateMockInterviewProblems({
    company: "Google",
    difficulty: "Medium",
    duration: 45
  });
  let saveCalls = 0;
  return {
    _id: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(),
    company: "Google",
    difficulty: "Medium",
    duration: 45,
    status: "active",
    expiresAt,
    problems: problems.map((problem) => ({
      ...problem,
      toObject() {
        const { toObject: _toObject, ...plain } = this;
        return plain;
      }
    })),
    get saveCalls() {
      return saveCalls;
    },
    async save() {
      saveCalls += 1;
      return this;
    }
  };
}

test("MockInterview model validates a persistent active session", () => {
  const startedAt = new Date("2026-06-20T10:00:00.000Z");
  const problems = generateMockInterviewProblems({
    company: "Google",
    difficulty: "Medium",
    duration: 45
  });
  const interview = new MockInterview({
    userId: new mongoose.Types.ObjectId(),
    company: "Google",
    difficulty: "Medium",
    duration: 45,
    problems,
    startedAt,
    expiresAt: mockInterviewExpiry(startedAt, 45)
  });

  assert.equal(interview.validateSync(), undefined);
  assert.equal(interview.problems.length, 2);
  assert.equal(interview.status, "active");
});

test("mock generation honors difficulty, company preference, solved history, and duration", () => {
  const problems = generateMockInterviewProblems({
    company: "Google",
    difficulty: "Medium",
    duration: 60,
    solvedTitles: ["Longest Substring Without Repeating Characters"],
    feedbackItems: [{ problemId: "container-with-most-water", feedback: "not_relevant" }]
  });

  assert.equal(problems.length, 3);
  assert.equal(problems.every((problem) => problem.difficulty === "Medium"), true);
  assert.equal(problems.some((problem) => problem.title === "Longest Substring Without Repeating Characters"), false);
  assert.equal(problems.some((problem) => problem.problemId === "container-with-most-water"), false);
  assert.equal(problems[0].companies.includes("Google"), true);
});

test("hard interviews gracefully use two problems when only two are available", () => {
  const problems = generateMockInterviewProblems({
    company: "Google",
    difficulty: "Hard",
    duration: 90
  });
  assert.equal(problems.length, 2);
});

test("mock scoring calculates score and weak topics from attempt results", () => {
  const problems = generateMockInterviewProblems({
    company: "Amazon",
    difficulty: "Easy",
    duration: 30
  });
  const result = scoreMockInterview(problems, [
    { problemId: problems[0].problemId, result: "solved" },
    { problemId: problems[1].problemId, result: "hint" }
  ]);

  assert.equal(result.score, 80);
  assert.equal(result.problems[0].result, "solved");
  assert.equal(result.problems[1].result, "hint");
  assert.ok(result.weakTopics.length > 0);
});

test("invalid attempt results are rejected", () => {
  const problems = generateMockInterviewProblems({
    company: "Other",
    difficulty: "Easy",
    duration: 30
  });
  assert.throws(
    () => scoreMockInterview(problems, [{ problemId: problems[0].problemId, result: "cheated" }]),
    /invalid mock interview result/i
  );
});

test("next practice plan targets weak topics and excludes interview problems", () => {
  const plan = buildNextPracticePlan({
    weakTopics: ["Dynamic Programming"],
    completedProblemIds: ["house-robber"],
    difficulty: "Medium"
  });
  assert.equal(plan.some((problem) => problem.problemId === "house-robber"), false);
  assert.equal(plan.every((problem) => problem.topics.includes("Dynamic Programming")), true);
});

test("mock interview reload is scoped to the authenticated user", async () => {
  const original = MockInterview.findOne;
  const userId = new mongoose.Types.ObjectId();
  const interviewId = new mongoose.Types.ObjectId();
  let capturedFilter;
  MockInterview.findOne = (filter) => {
    capturedFilter = filter;
    return { lean: async () => ({ _id: interviewId, userId, status: "active" }) };
  };
  let body;
  let error;

  try {
    await getMockInterview(
      { user: { _id: userId }, params: { id: String(interviewId) } },
      { json(payload) { body = payload; } },
      (nextError) => { error = nextError; }
    );
    assert.equal(error, undefined);
    assert.equal(String(capturedFilter.userId), String(userId));
    assert.equal(String(capturedFilter._id), String(interviewId));
    assert.equal(body.interview.status, "active");
  } finally {
    MockInterview.findOne = original;
  }
});

test("another user's or missing mock interview returns 404", async () => {
  const original = MockInterview.findOne;
  MockInterview.findOne = () => ({ lean: async () => null });
  let error;
  try {
    await getMockInterview(
      {
        user: { _id: new mongoose.Types.ObjectId() },
        params: { id: String(new mongoose.Types.ObjectId()) }
      },
      {},
      (nextError) => { error = nextError; }
    );
    assert.equal(error.status, 404);
    assert.equal(error.message, "Mock interview not found");
  } finally {
    MockInterview.findOne = original;
  }
});

test("expired mock interview submissions are rejected without saving results", async () => {
  const interview = completionInterview(new Date(Date.now() - 1_000));
  const attempts = interview.problems.map((problem) => ({
    problemId: problem.problemId,
    result: "solved"
  }));

  const { body, error } = await runCompleteMockInterview(interview, attempts);

  assert.equal(body, undefined);
  assert.equal(error.status, 400);
  assert.match(error.message, /mock interview has expired/i);
  assert.equal(interview.status, "active");
  assert.equal(interview.score, undefined);
  assert.equal(interview.saveCalls, 0);
});

test("active mock interview submissions are scored and saved", async () => {
  const interview = completionInterview(new Date(Date.now() + 60_000));
  const attempts = [
    { problemId: interview.problems[0].problemId, result: "solved" },
    { problemId: interview.problems[1].problemId, result: "hint" }
  ];

  const { body, error } = await runCompleteMockInterview(interview, attempts);

  assert.equal(error, undefined);
  assert.equal(body.interview, interview);
  assert.equal(interview.status, "completed");
  assert.equal(interview.score, 80);
  assert.equal(interview.problems[0].result, "solved");
  assert.equal(interview.problems[1].result, "hint");
  assert.equal(interview.saveCalls, 1);
});
