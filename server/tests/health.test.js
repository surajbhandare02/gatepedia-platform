const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { app } = require("../server");
const pool = require("../db");

test("health endpoint returns service status", async () => {
  const response = await request(app).get("/health").expect(200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.service, "gate-progress-api");
});

test("security headers are applied", async () => {
  const response = await request(app).get("/health").expect(200);
  assert.equal(response.headers["x-powered-by"], undefined);
  assert.ok(response.headers["x-content-type-options"]);
});

test.after(async () => {
  await pool.end();
});
