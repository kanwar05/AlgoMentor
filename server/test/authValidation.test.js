import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { login, MAX_PASSWORD_LENGTH, register } from "../src/controllers/authController.js";
import User from "../src/models/User.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "auth-validation-test-secret";

async function runController(controller, body) {
  let responseBody;
  let statusCode = 200;
  let error;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      responseBody = payload;
      return this;
    }
  };

  await controller({ body }, response, (nextError) => {
    error = nextError;
  });
  return { error, responseBody, statusCode };
}

test("non-string email returns a consistent 400 response", async () => {
  for (const controller of [register, login]) {
    const body = controller === register
      ? { name: "Ada", email: { value: "ada@example.com" }, password: "StrongPass1" }
      : { email: ["ada@example.com"], password: "StrongPass1" };
    const { error } = await runController(controller, body);

    assert.equal(error.status, 400);
    assert.match(error.message, /valid email address/i);
  }
});

test("invalid email format returns 400", async () => {
  for (const controller of [register, login]) {
    const body = controller === register
      ? { name: "Ada", email: "not-an-email", password: "StrongPass1" }
      : { email: "not-an-email", password: "StrongPass1" };
    const { error } = await runController(controller, body);

    assert.equal(error.status, 400);
    assert.match(error.message, /valid email address/i);
  }
});

test("overly long passwords return 400", async () => {
  const password = "x".repeat(MAX_PASSWORD_LENGTH + 1);
  for (const controller of [register, login]) {
    const body = controller === register
      ? { name: "Ada", email: "ada@example.com", password }
      : { email: "ada@example.com", password };
    const { error } = await runController(controller, body);

    assert.equal(error.status, 400);
    assert.match(error.message, /at most 72 characters/i);
  }
});

test("registration trims and lowercases email before querying and saving", async () => {
  const originalExists = User.exists;
  const originalCreate = User.create;
  let existsFilter;
  let createdPayload;
  User.exists = async (filter) => {
    existsFilter = filter;
    return null;
  };
  User.create = async (payload) => {
    createdPayload = payload;
    return {
      _id: new mongoose.Types.ObjectId(),
      ...payload,
      weeklyGoal: 10
    };
  };

  try {
    const { error, responseBody, statusCode } = await runController(register, {
      name: "Ada",
      email: "  ADA@Example.COM  ",
      password: "StrongPass1"
    });

    assert.equal(error, undefined);
    assert.equal(statusCode, 201);
    assert.equal(existsFilter.email, "ada@example.com");
    assert.equal(createdPayload.email, "ada@example.com");
    assert.equal(responseBody.user.email, "ada@example.com");
  } finally {
    User.exists = originalExists;
    User.create = originalCreate;
  }
});

test("login trims and lowercases email before querying", async () => {
  const originalFindOne = User.findOne;
  let capturedFilter;
  let comparedPassword;
  User.findOne = (filter) => {
    capturedFilter = filter;
    return {
      select: async () => ({
        _id: new mongoose.Types.ObjectId(),
        name: "Ada",
        email: "ada@example.com",
        weeklyGoal: 10,
        async comparePassword(password) {
          comparedPassword = password;
          return true;
        }
      })
    };
  };

  try {
    const { error, responseBody } = await runController(login, {
      email: "  ADA@Example.COM  ",
      password: "StrongPass1"
    });

    assert.equal(error, undefined);
    assert.equal(capturedFilter.email, "ada@example.com");
    assert.equal(comparedPassword, "StrongPass1");
    assert.equal(responseBody.user.email, "ada@example.com");
  } finally {
    User.findOne = originalFindOne;
  }
});
