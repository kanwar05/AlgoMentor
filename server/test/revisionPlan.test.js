import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import RevisionTask from "../src/models/RevisionTask.js";
import {
  completeRevisionTask,
  generateRevisionPlan,
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

test("revision plan creates and reuses persistent pending tasks", async () => {
  const store = new InMemoryRevisionTaskStore();
  const now = new Date("2026-06-20T00:00:00.000Z");
  const problems = [problem("problem-1"), problem("problem-2")];
  const weakTopics = [{ topic: "Dynamic Programming" }];

  const first = await generateRevisionPlan("user-1", problems, weakTopics, { store, now });
  const second = await generateRevisionPlan("user-1", problems, weakTopics, { store, now });
  const firstIds = first.days.flatMap((day) => day.tasks.map((task) => task.id));
  const secondIds = second.days.flatMap((day) => day.tasks.map((task) => task.id));

  assert.equal(store.tasks.length, 2);
  assert.deepEqual(secondIds, firstIds);
});

test("completing a revision task persists result and timestamp", async () => {
  const store = new InMemoryRevisionTaskStore();
  const task = await store.ensurePending("user-1", "problem-1");
  const completedAt = new Date("2026-06-20T10:00:00.000Z");

  const completed = await completeRevisionTask({
    taskId: task._id,
    userId: "user-1",
    result: "hint",
    completedAt
  }, store);

  assert.equal(completed.completed, true);
  assert.equal(completed.result, "hint");
  assert.equal(completed.completedAt, completedAt);
});

test("a user cannot complete another user's revision task", async () => {
  const store = new InMemoryRevisionTaskStore();
  const task = await store.ensurePending("user-1", "problem-1");

  await assert.rejects(
    completeRevisionTask({
      taskId: task._id,
      userId: "user-2",
      result: "solved"
    }, store),
    (error) => error.status === 404 && /not found/i.test(error.message)
  );
  assert.equal(task.completed, false);
});

test("completed tasks stay excluded after revision-plan refetch", async () => {
  const store = new InMemoryRevisionTaskStore();
  const now = new Date("2026-06-20T00:00:00.000Z");
  const problems = [problem("problem-1"), problem("problem-2")];
  const weakTopics = [{ topic: "Dynamic Programming" }];
  const initial = await generateRevisionPlan("user-1", problems, weakTopics, { store, now });
  const completedTaskId = initial.days.flatMap((day) => day.tasks)[0].id;

  await completeRevisionTask({
    taskId: completedTaskId,
    userId: "user-1",
    result: "solved",
    completedAt: now
  }, store);
  const refreshed = await generateRevisionPlan("user-1", problems, weakTopics, { store, now });
  const refreshedTasks = refreshed.days.flatMap((day) => day.tasks);

  assert.equal(refreshedTasks.some((task) => task.id === completedTaskId), false);
  assert.equal(refreshedTasks.some((task) => String(task.problemId) === "problem-1"), false);
  assert.equal(refreshedTasks.some((task) => String(task.problemId) === "problem-2"), true);
});

test("recent completions are excluded for the revision cooldown window", async () => {
  const store = new InMemoryRevisionTaskStore();
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
    { store, now }
  );

  assert.equal(plan.days.flatMap((day) => day.tasks).length, 0);
});
