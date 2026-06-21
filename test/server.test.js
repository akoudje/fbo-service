import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/index.js";

test("serves the root status without requiring the internal token", async (t) => {
  const server = createApp().listen(0);
  t.after(() => server.close());

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { status: "FBO service running" });
});
