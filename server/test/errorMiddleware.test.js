import assert from "node:assert/strict";
import test from "node:test";
import { duplicateKeyMessage, errorHandler } from "../src/middleware/error.js";

function runError(error) {
  let statusCode;
  let body;
  errorHandler(error, {}, {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    }
  });
  return { statusCode, body };
}

test("duplicate email errors keep the account-specific message", () => {
  const error = {
    code: 11000,
    keyPattern: { email: 1 },
    keyValue: { email: "ada@example.com" }
  };

  assert.equal(duplicateKeyMessage(error), "An account with that email already exists");
  const response = runError(error);
  assert.equal(response.statusCode, 409);
  assert.equal(response.body.message, "An account with that email already exists");
});

test("duplicate-key errors identify non-email conflicted fields", () => {
  const response = runError({
    code: 11000,
    keyValue: {
      userId: "user-1",
      platform: "LeetCode",
      platformProblemId: "two-sum"
    },
    modelName: "SyncedProblem"
  });

  assert.equal(response.statusCode, 409);
  assert.match(response.body.message, /synced problem record/i);
  assert.match(response.body.message, /user id and platform and platform problem id/i);
  assert.doesNotMatch(response.body.message, /email/i);
});

test("duplicate-key errors have a safe generic fallback", () => {
  assert.equal(
    duplicateKeyMessage({ code: 11000 }),
    "A record with that unique value already exists"
  );
});
