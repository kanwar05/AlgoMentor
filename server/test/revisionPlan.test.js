import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import ReviewAttempt from "../src/models/ReviewAttempt.js";
import RevisionTask from "../src/models/RevisionTask.js";
import {
  calculateReviewSchedule,
  completeRevisionTask,
  DEFAULT_EASE_FACTOR,
  DEFAULT_REVIEW_INTERVAL,
  generateRevisionPlan,
  MIN_EASE_FACTOR,
  REVISION_COOLDOWN_DAYS
} from "../src/services/revisionService.js";

const DAY = 86_400_000;

class InMemoryRevisionTaskStore {
  constructor() {
    this.tasks = [];
    this.sequence = 0;
  }

  async findRelevant(userId, problemIds, recentSince) {
    const ids = new Set(problemIds.map(String));
    return this.tasks.filter((task) =>
      String(task.userId) === String(userId) &&
      ids.has(String(task.problemId)) &&
      (!task.completed || task.completedAt >= recentSince)
    );
  }

  async ensurePending(userId, problemId) {
    const existing = this.tasks.find((task) =>
      String(task.userId) === String(userId) &&
      String(task.problemId) === String(problemId) &&
      !task.completed
    );
    if (existing) return existing;

    const task = {
      _id: `task-${++this.sequence}`,
      userId,
      problemId,
      completed: false,
      completedAt: null,
      result: null,
      createdAt: new Date()
    };
    this.tasks.push(task);
    return task;
  }

  async complete(taskId, userId, result, completedAt) {
    const task = this.tasks.find((item) =>
      String(item._id) === String(taskId) &&
      String(item.userId) === String(userId) &&
      !item.completed
    );
    if (!task) return null;
    Object.assign(task, { completed: true, completedAt, result });
    return task;
  }
}

class InMemoryReviewAttemptStore {
  constructor() {
    this.attempts = [];
    this.sequence = 0;
  }

  async findLatest(userId, problemId) {
    return this.attempts
      .filter((attempt) =>
        String(attempt.userId) === String(userId) &&
        String(attempt.problemId) === String(problemId)
      )
      .sort((a, b) => b.reviewedAt - a.reviewedAt)[0] || null;
  }

  async findLatestForProblems(userId, problemIds) {
    const ids = new Set(problemIds.map(String));
    const map = new Map();
    this.attempts
      .filter((attempt) => String(attempt.userId) === String(userId) && ids.has(String(attempt.problemId)))
      .sort((a, b) => b.reviewedAt - a.reviewedAt)
      .forEach((attempt) => {
        const key = String(attempt.problemId);
        if (!map.has(key)) map.set(key, attempt);
      });
    return map;
  }

  async create(attempt) {
    const stored = { _id: `attempt-${++this.sequence}`, ...attempt };
    this.attempts.push(stored);
    return stored;
  }
}

function createInMemorySession(store, attemptStore) {
  return {
    async withTransaction(operation) {
      const taskSnapshot = structuredClone(store.tasks);
      const taskSequence = store.sequence;
      const attemptSnapshot = structuredClone(attemptStore.attempts);
      const attemptSequence = attemptStore.sequence;
      try {
        return await operation();
      } catch (error) {
        store.tasks = taskSnapshot;
        store.sequence = taskSequence;
        attemptStore.attempts = attemptSnapshot;
        attemptStore.sequence = attemptSequence;
        throw error;
      }
    },
    async endSession() {}
  };
}

const transactionOptions = (store, attemptStore) => ({
  startSession: async () => createInMemorySession(store, attemptStore)
});

const problem = (id, overrides = {}) => ({
  _id: id,
  title: `Problem ${id}`,
  difficulty: "Medium",
  topics: ["Dynamic Programming"],
  status: "Weak",
  solvedDate: new Date("2026-05-01T00:00:00.000Z"),
  link: "",
  ...overrides
});

test("RevisionTask model creates a valid pending task", () => {
  const task = new RevisionTask({
    userId: new mongoose.Types.ObjectId(),
    problemId: new mongoose.Types.ObjectId()
  });

  assert.equal(task.validateSync(), undefined);
  assert.equal(task.completed, false);
  assert.equal(task.completedAt, null);
  assert.equal(task.result, null);
});

test("ReviewAttempt model validates adaptive scheduling fields", () => {
  const attempt = new ReviewAttempt({
    userId: new mongoose.Types.ObjectId(),
    problemId: new mongoose.Types.ObjectId(),
    result: "solved",
    timeTaken: 420,
    confidence: 85,
    reviewedAt: new Date("2026-06-20T00:00:00.000Z"),
    nextReviewAt: new Date("2026-06-23T00:00:00.000Z"),
    interval: 3,
    easeFactor: 2.6
  });

  assert.equal(attempt.validateSync(), undefined);
});

test("adaptive review schedule changes interval and ease factor by result", () => {
  const reviewedAt = new Date("2026-06-20T00:00:00.000Z");
  const solved = calculateReviewSchedule({ result: "solved", reviewedAt });
  const hint = calculateReviewSchedule({ result: "hint", reviewedAt });
  const failed = calculateReviewSchedule({ result: "failed", reviewedAt });

  assert.equal(solved.interval, DEFAULT_REVIEW_INTERVAL * DEFAULT_EASE_FACTOR);
  assert.equal(solved.easeFactor, 2.6);
  assert.equal(solved.nextReviewAt.toISOString(), "2026-06-22T12:00:00.000Z");
  assert.equal(hint.interval, 1);
  assert.equal(hint.easeFactor, 2.4);
  assert.equal(failed.interval, 1);
  assert.equal(failed.easeFactor, 2.3);
});

test("ease factor never drops below the safe minimum", () => {
  const schedule = calculateReviewSchedule({
    result: "failed",
    previousInterval: 1,
    previousEaseFactor: MIN_EASE_FACTOR
  });
  assert.equal(schedule.easeFactor, MIN_EASE_FACTOR);
});

test("invalid review metrics are rejected before completing the task", async () => {
  const store = new InMemoryRevisionTaskStore();
  const attemptStore = new InMemoryReviewAttemptStore();
  const task = await store.ensurePending("user-1", "problem-1");

  await assert.rejects(
    completeRevisionTask({
      taskId: task._id,
      userId: "user-1",
      result: "solved",
      confidence: 120
    }, store, attemptStore, transactionOptions(store, attemptStore)),
    (error) => error.status === 400 && /confidence/i.test(error.message)
  );
  assert.equal(task.completed, false);
});

test("revision plan creates and reuses persistent pending tasks", async () => {
  const store = new InMemoryRevisionTaskStore();
  const attemptStore = new InMemoryReviewAttemptStore();
  const now = new Date("2026-06-20T00:00:00.000Z");
  const problems = [problem("problem-1"), problem("problem-2")];
  const weakTopics = [{ topic: "Dynamic Programming" }];

  const first = await generateRevisionPlan("user-1", problems, weakTopics, { store, attemptStore, now });
  const second = await generateRevisionPlan("user-1", problems, weakTopics, { store, attemptStore, now });
  const firstIds = first.days.flatMap((day) => day.tasks.map((task) => task.id));
  const secondIds = second.days.flatMap((day) => day.tasks.map((task) => task.id));

  assert.equal(store.tasks.length, 2);
  assert.deepEqual(secondIds, firstIds);
});

test("completing a revision task persists result and timestamp", async () => {
  const store = new InMemoryRevisionTaskStore();
  const attemptStore = new InMemoryReviewAttemptStore();
  const task = await store.ensurePending("user-1", "problem-1");
  const completedAt = new Date("2026-06-20T10:00:00.000Z");

  const completed = await completeRevisionTask({
    taskId: task._id,
    userId: "user-1",
    result: "hint",
    completedAt,
    timeTaken: 300,
    confidence: 60
  }, store, attemptStore, transactionOptions(store, attemptStore));

  assert.equal(completed.completed, true);
  assert.equal(completed.result, "hint");
  assert.equal(completed.completedAt, completedAt);
  assert.equal(completed.attempt.result, "hint");
  assert.equal(completed.attempt.timeTaken, 300);
  assert.equal(completed.attempt.confidence, 60);
  assert.equal(completed.attempt.interval, 1);
  assert.equal(completed.attempt.easeFactor, 2.4);
  assert.equal(completed.attempt.nextReviewAt.toISOString(), "2026-06-21T10:00:00.000Z");
});

test("revision completion rolls back the task when attempt creation fails", async () => {
  const store = new InMemoryRevisionTaskStore();
  const attemptStore = new InMemoryReviewAttemptStore();
  const task = await store.ensurePending("user-1", "problem-1");
  attemptStore.create = async () => {
    throw new Error("Attempt creation failed");
  };

  await assert.rejects(
    completeRevisionTask({
      taskId: task._id,
      userId: "user-1",
      result: "solved"
    }, store, attemptStore, transactionOptions(store, attemptStore)),
    /Attempt creation failed/
  );

  assert.equal(store.tasks[0].completed, false);
  assert.equal(store.tasks[0].completedAt, null);
  assert.equal(store.tasks[0].result, null);
  assert.equal(attemptStore.attempts.length, 0);
});

test("a user cannot complete another user's revision task", async () => {
  const store = new InMemoryRevisionTaskStore();
  const attemptStore = new InMemoryReviewAttemptStore();
  const task = await store.ensurePending("user-1", "problem-1");

  await assert.rejects(
    completeRevisionTask({
      taskId: task._id,
      userId: "user-2",
      result: "solved"
    }, store, attemptStore, transactionOptions(store, attemptStore)),
    (error) => error.status === 404 && /not found/i.test(error.message)
  );
  assert.equal(task.completed, false);
});

test("completed tasks are replaced by a new task on the adaptive due day", async () => {
  const store = new InMemoryRevisionTaskStore();
  const attemptStore = new InMemoryReviewAttemptStore();
  const now = new Date("2026-06-20T00:00:00.000Z");
  const problems = [problem("problem-1"), problem("problem-2")];
  const weakTopics = [{ topic: "Dynamic Programming" }];
  const initial = await generateRevisionPlan("user-1", problems, weakTopics, { store, attemptStore, now });
  const completedTaskId = initial.days.flatMap((day) => day.tasks)[0].id;

  await completeRevisionTask({
    taskId: completedTaskId,
    userId: "user-1",
    result: "solved",
    completedAt: now
  }, store, attemptStore, transactionOptions(store, attemptStore));
  const refreshed = await generateRevisionPlan("user-1", problems, weakTopics, { store, attemptStore, now });
  const refreshedTasks = refreshed.days.flatMap((day) => day.tasks);

  assert.equal(refreshedTasks.some((task) => task.id === completedTaskId), false);
  assert.equal(refreshed.days[3].tasks.some((task) => String(task.problemId) === "problem-1"), true);
  assert.equal(refreshedTasks.some((task) => String(task.problemId) === "problem-2"), true);
});

test("recent completions are excluded for the revision cooldown window", async () => {
  const store = new InMemoryRevisionTaskStore();
  const attemptStore = new InMemoryReviewAttemptStore();
  const now = new Date("2026-06-20T00:00:00.000Z");
  store.tasks.push({
    _id: "completed-task",
    userId: "user-1",
    problemId: "problem-1",
    completed: true,
    completedAt: new Date(now.getTime() - (REVISION_COOLDOWN_DAYS - 1) * DAY),
    result: "failed"
  });

  const plan = await generateRevisionPlan(
    "user-1",
    [problem("problem-1")],
    [{ topic: "Dynamic Programming" }],
    { store, attemptStore, now }
  );

  assert.equal(plan.days.flatMap((day) => day.tasks).length, 0);
});

test("reviews are scheduled on their adaptive due day", async () => {
  const store = new InMemoryRevisionTaskStore();
  const attemptStore = new InMemoryReviewAttemptStore();
  const now = new Date("2026-06-20T00:00:00.000Z");
  attemptStore.attempts.push({
    userId: "user-1",
    problemId: "problem-1",
    result: "solved",
    reviewedAt: new Date("2026-06-17T00:00:00.000Z"),
    nextReviewAt: new Date("2026-06-23T00:00:00.000Z"),
    interval: 6,
    easeFactor: 2.6
  });

  const plan = await generateRevisionPlan(
    "user-1",
    [problem("problem-1")],
    [{ topic: "Dynamic Programming" }],
    { store, attemptStore, now }
  );

  assert.equal(plan.days[0].tasks.length, 0);
  assert.equal(plan.days[3].tasks[0].problemId, "problem-1");
  assert.equal(plan.days[3].tasks[0].nextReviewAt.toISOString(), "2026-06-23T00:00:00.000Z");
});

test("reviews due after the seven-day plan are excluded", async () => {
  const store = new InMemoryRevisionTaskStore();
  const attemptStore = new InMemoryReviewAttemptStore();
  const now = new Date("2026-06-20T00:00:00.000Z");
  attemptStore.attempts.push({
    userId: "user-1",
    problemId: "problem-1",
    result: "solved",
    reviewedAt: now,
    nextReviewAt: new Date("2026-07-20T00:00:00.000Z"),
    interval: 30,
    easeFactor: 2.7
  });

  const plan = await generateRevisionPlan(
    "user-1",
    [problem("problem-1")],
    [{ topic: "Dynamic Programming" }],
    { store, attemptStore, now }
  );

  assert.equal(plan.days.flatMap((day) => day.tasks).length, 0);
});
