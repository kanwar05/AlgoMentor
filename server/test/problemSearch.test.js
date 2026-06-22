import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import {
  escapeRegex,
  listProblems,
  MAX_PROBLEM_SEARCH_LENGTH
} from "../src/controllers/problemController.js";
import Problem from "../src/models/Problem.js";

const userId = new mongoose.Types.ObjectId();

async function runListProblems(search, aggregateResult = [{ problems: [], metadata: [] }]) {
  const originalAggregate = Problem.aggregate;
  let pipeline;
  let body;
  let error;
  Problem.aggregate = async (value) => {
    pipeline = value;
    return aggregateResult;
  };

  try {
    await listProblems(
      { user: { _id: userId }, query: { search } },
      { json(payload) { body = payload; } },
      (nextError) => { error = nextError; }
    );
    return { body, error, pipeline };
  } finally {
    Problem.aggregate = originalAggregate;
  }
}

test("escapeRegex escapes MongoDB regex metacharacters", () => {
  assert.equal(escapeRegex(".*[("), "\\.\\*\\[\\(");
});

test("normal problem search is trimmed and remains case insensitive", async () => {
  const { error, pipeline, body } = await runListProblems("  Two Sum  ", [{
    problems: [{ title: "Two Sum" }],
    metadata: [{ total: 1 }]
  }]);

  assert.equal(error, undefined);
  assert.deepEqual(pipeline[0].$match.title, { $regex: "Two Sum", $options: "i" });
  assert.deepEqual(
    pipeline[2].$unionWith.pipeline[0].$match.title,
    { $regex: "Two Sum", $options: "i" }
  );
  assert.equal(body.problems[0].title, "Two Sum");
});

test("problem search treats regex characters as literal text", async () => {
  for (const search of [".", "*", "[", "("]) {
    const { error, pipeline } = await runListProblems(search);

    assert.equal(error, undefined);
    assert.equal(pipeline[0].$match.title.$regex, `\\${search}`);
    assert.equal(pipeline[0].$match.title.$options, "i");
  }
});

test("overly long problem search returns 400 before querying MongoDB", async () => {
  const { error, pipeline } = await runListProblems("x".repeat(MAX_PROBLEM_SEARCH_LENGTH + 1));

  assert.equal(pipeline, undefined);
  assert.equal(error.status, 400);
  assert.match(error.message, /search must be at most 100 characters/i);
});
