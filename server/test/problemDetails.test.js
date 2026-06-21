import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { getProblem } from "../src/controllers/problemController.js";
import { protect } from "../src/middleware/auth.js";
import Problem from "../src/models/Problem.js";
import User from "../src/models/User.js";
import problemRoutes from "../src/routes/problemRoutes.js";
import { createToken } from "../src/utils/token.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "problem-details-test-secret";

const userId = new mongoose.Types.ObjectId();
const otherUserId = new mongoose.Types.ObjectId();
const problemId = new mongoose.Types.ObjectId();
const token = createToken(userId);

function stubAuthenticatedUser() {
  const original = User.findById;
  User.findById = async (id) => String(id) === String(userId) ? { _id: userId } : null;
  return () => {
    User.findById = original;
  };
}

function stubProblemFindOne(result, inspectFilter) {
  const original = Problem.findOne;
  Problem.findOne = (filter) => {
    inspectFilter?.(filter);
    return { lean: async () => result };
  };
  return () => {
    Problem.findOne = original;
  };
}

async function authenticate(req) {
  let authError;
  await protect(req, {}, (error) => {
    authError = error;
  });
  return authError;
}

async function runGetProblem(req) {
  let body;
  let error;
  const res = {
    json(payload) {
      body = payload;
      return this;
    }
  };
  await getProblem(req, res, (nextError) => {
    error = nextError;
  });
  return { body, error };
}

test("problem details route registers authenticated GET /:id", () => {
  const layer = problemRoutes.stack.find((item) => item.route?.path === "/:id");
  assert.ok(layer);
  assert.ok(layer.route.methods.get);
  assert.equal(problemRoutes.stack[0].handle, protect);
});

test("authenticated user can fetch their own problem by ID", async () => {
  const restoreUser = stubAuthenticatedUser();
  const storedProblem = {
    _id: problemId,
    user: userId,
    title: "Two Sum",
    platform: "LeetCode",
    difficulty: "Easy",
    topics: ["Array", "Hash Map"],
    status: "Solved",
    confidence: 90
  };
  const restoreProblem = stubProblemFindOne(storedProblem, (filter) => {
    assert.equal(String(filter._id), String(problemId));
    assert.equal(String(filter.user), String(userId));
  });

  try {
    const req = {
      headers: { authorization: `Bearer ${token}` },
      params: { id: String(problemId) }
    };
    assert.equal(await authenticate(req), undefined);
    const { body, error } = await runGetProblem(req);

    assert.equal(error, undefined);
    assert.equal(body.title, "Two Sum");
    assert.deepEqual(body.topics, ["Array", "Hash Map"]);
  } finally {
    restoreProblem();
    restoreUser();
  }
});

test("unauthenticated request is rejected", async () => {
  const error = await authenticate({ headers: {}, params: { id: String(problemId) } });
  assert.equal(error.status, 401);
  assert.equal(error.message, "Authentication required");
});

test("user cannot fetch another user's problem", async () => {
  const restoreUser = stubAuthenticatedUser();
  const restoreProblem = stubProblemFindOne(null, (filter) => {
    assert.equal(String(filter.user), String(userId));
    assert.notEqual(String(filter.user), String(otherUserId));
  });

  try {
    const req = {
      headers: { authorization: `Bearer ${token}` },
      params: { id: String(problemId) }
    };
    assert.equal(await authenticate(req), undefined);
    const { error } = await runGetProblem(req);

    assert.equal(error.status, 404);
    assert.equal(error.message, "Problem not found");
  } finally {
    restoreProblem();
    restoreUser();
  }
});

test("missing and invalid problem IDs return 404", async (t) => {
  const restoreProblem = stubProblemFindOne(null);
  try {
    await t.test("missing valid ID", async () => {
      const { error } = await runGetProblem({
        user: { _id: userId },
        params: { id: String(new mongoose.Types.ObjectId()) }
      });
      assert.equal(error.status, 404);
      assert.equal(error.message, "Problem not found");
    });

    await t.test("invalid ID", async () => {
      const { error } = await runGetProblem({
        user: { _id: userId },
        params: { id: "not-a-valid-id" }
      });
      assert.equal(error.status, 404);
      assert.equal(error.message, "Problem not found");
    });
  } finally {
    restoreProblem();
  }
});
