import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { updateSyncedProblemAnnotations } from "../src/controllers/syncController.js";
import SyncedProblem from "../src/models/SyncedProblem.js";
import { upsertSyncedProblems } from "../src/services/syncPersistence.js";

const userId = new mongoose.Types.ObjectId();
const otherUserId = new mongoose.Types.ObjectId();
const problemId = new mongoose.Types.ObjectId();

async function runController(req) {
  let body;
  let error;
  const res = {
    json(payload) {
      body = payload;
      return this;
    }
  };
  await updateSyncedProblemAnnotations(req, res, (nextError) => {
    error = nextError;
  });
  return { body, error };
}

test("SyncedProblem supports interactive annotation fields", () => {
  const problem = new SyncedProblem({
    userId,
    platform: "LeetCode",
    platformProblemId: "1",
    title: "Two Sum",
    status: "Revision",
    notes: "Revisit complement lookup",
    confidence: 65,
    lastReviewedAt: new Date("2026-06-20T00:00:00.000Z")
  });

  assert.equal(problem.validateSync(), undefined);
  assert.equal(problem.notes, "Revisit complement lookup");
  assert.equal(problem.confidence, 65);
});

test("annotation update is scoped to the authenticated user", async () => {
  const original = SyncedProblem.findOneAndUpdate;
  let capturedFilter;
  let capturedUpdate;
  const updated = {
    _id: problemId,
    userId,
    status: "Weak",
    notes: "Missed the invariant",
    confidence: 35,
    lastReviewedAt: new Date("2026-06-20T00:00:00.000Z")
  };
  SyncedProblem.findOneAndUpdate = (filter, update) => {
    capturedFilter = filter;
    capturedUpdate = update;
    return { lean: async () => updated };
  };

  try {
    const { body, error } = await runController({
      user: { _id: userId },
      params: { id: String(problemId) },
      body: {
        status: "Weak",
        notes: "  Missed the invariant  ",
        confidence: 35,
        lastReviewedAt: "2026-06-20"
      }
    });

    assert.equal(error, undefined);
    assert.equal(String(capturedFilter.userId), String(userId));
    assert.notEqual(String(capturedFilter.userId), String(otherUserId));
    assert.equal(capturedUpdate.$set.status, "Weak");
    assert.equal(capturedUpdate.$set.notes, "Missed the invariant");
    assert.equal(capturedUpdate.$set.confidence, 35);
    assert.equal(body.problem.status, "Weak");
  } finally {
    SyncedProblem.findOneAndUpdate = original;
  }
});

test("another user's or missing synced problem returns 404", async () => {
  const original = SyncedProblem.findOneAndUpdate;
  SyncedProblem.findOneAndUpdate = () => ({ lean: async () => null });

  try {
    const { error } = await runController({
      user: { _id: userId },
      params: { id: String(problemId) },
      body: { status: "Strong" }
    });
    assert.equal(error.status, 404);
    assert.equal(error.message, "Synced problem not found");
  } finally {
    SyncedProblem.findOneAndUpdate = original;
  }
});

test("annotation update validates status, confidence, and dates", async () => {
  for (const body of [
    { status: "Solved" },
    { confidence: 101 },
    { lastReviewedAt: "not-a-date" },
    {}
  ]) {
    const { error } = await runController({
      user: { _id: userId },
      params: { id: String(problemId) },
      body
    });
    assert.equal(error.status, 400);
  }
});

test("platform re-sync preserves user annotations", async () => {
  let operations;
  const model = {
    find: () => ({ select: () => ({ lean: async () => [{ platformProblemId: "1" }] }) }),
    bulkWrite: async (value) => { operations = value; },
    countDocuments: async () => 1
  };

  await upsertSyncedProblems(userId, "LeetCode", [{
    platformProblemId: "1",
    title: "Two Sum",
    difficulty: "Easy",
    topics: ["Array"],
    status: "Strong"
  }], model);

  const update = operations[0].updateOne.update;
  assert.equal(update.$set.status, undefined);
  assert.equal(update.$set.notes, undefined);
  assert.equal(update.$set.confidence, undefined);
  assert.equal(update.$set.lastReviewedAt, undefined);
  assert.equal(update.$setOnInsert.status, "Strong");
});
