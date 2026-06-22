import assert from "node:assert/strict";
import test from "node:test";
import authRoutes, { authRateLimiter } from "../src/routes/authRoutes.js";

function routeLimiter(path) {
  const route = authRoutes.stack.find((layer) => layer.route?.path === path);
  assert.ok(route, `${path} route should be registered`);
  assert.equal(route.route.stack[0].handle, authRateLimiter);
  return route.route.stack[0].handle;
}

function createRequest(ip) {
  return {
    ip,
    headers: {},
    app: {
      get(setting) {
        return setting === "trust proxy" ? false : undefined;
      }
    }
  };
}

function createResponse() {
  const headers = new Map();
  return {
    statusCode: 200,
    body: null,
    headersSent: false,
    writableEnded: false,
    setHeader(name, value) {
      headers.set(name.toLowerCase(), value);
    },
    getHeader(name) {
      return headers.get(name.toLowerCase());
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(payload) {
      this.body = payload;
      this.writableEnded = true;
      return this;
    }
  };
}

async function runLimiter(limiter, ip) {
  const request = createRequest(ip);
  const response = createResponse();
  let allowed = false;
  let error;

  await limiter(request, response, (nextError) => {
    error = nextError;
    allowed = !nextError;
  });

  if (error) throw error;
  return { allowed, response };
}

async function assertRateLimited(path, ip) {
  const limiter = routeLimiter(path);
  authRateLimiter.resetKey(ip);

  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await runLimiter(limiter, ip);
      assert.equal(result.allowed, true);
      assert.notEqual(result.response.statusCode, 429);
    }

    const blocked = await runLimiter(limiter, ip);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.response.statusCode, 429);
    assert.equal(blocked.response.body.success, false);
    assert.match(blocked.response.body.message, /too many authentication attempts/i);
  } finally {
    authRateLimiter.resetKey(ip);
  }
}

test("repeated login attempts are blocked by the strict auth limiter", async () => {
  await assertRateLimited("/login", "198.51.100.10");
});

test("repeated registration attempts are blocked by the strict auth limiter", async () => {
  await assertRateLimited("/register", "198.51.100.11");
});
