/*
 * Integration-style contract tests: mount the real /api routes on an Express app
 * and assert the HTTP contracts that do not require a database connection
 * (auth middleware and Joi validation run before any query).
 *
 * Requires src/config/database.js to exist (gitignored; see docs/order-workflow.md) —
 * the suite is skipped with an explanation when it is missing.
 *
 * Run with: npm run test:contract
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';

const dbConfigPath = fileURLToPath(new URL('../src/config/database.js', import.meta.url));
const skipReason = existsSync(dbConfigPath)
  ? false
  : 'src/config/database.js is missing (gitignored) — create it as documented in docs/order-workflow.md';

describe('API route contracts (no database required)', { skip: skipReason }, () => {
  let server;
  let baseUrl;

  before(async () => {
    const { default: allRoutes } = await import('../src/adapters/secondary/routes/allRoutes.js');

    const app = express();
    app.use(express.json());
    app.use('/api', allRoutes);

    server = app.listen(0);
    await new Promise((resolve) => {
      server.once('listening', resolve);
    });
    baseUrl = `http://localhost:${server.address().port}/api`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
  });

  async function call(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
      method: options.method ?? 'GET',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    return { status: response.status, body: await response.json() };
  }

  it('rejects unauthenticated access to protected order routes', async () => {
    const list = await call('/orders');
    assert.equal(list.status, 400);
    assert.equal(list.body.message, 'Missing authentication token.');

    const checkout = await call('/orders/checkout', {
      method: 'POST',
      body: { clientId: 1, items: [{ productId: 1, quantity: 1 }] },
    });
    assert.equal(checkout.status, 400);
    assert.equal(checkout.body.message, 'Missing authentication token.');
  });

  it('rejects an invalid token with 401', async () => {
    const response = await call('/orders', {
      headers: { Authorization: 'Bearer not-a-real-token' },
    });
    assert.equal(response.status, 401);
    assert.equal(response.body.message, 'Invalid Token.');
  });

  it('validates the login payload before reaching the database', async () => {
    const response = await call('/login', {
      method: 'POST',
      body: { email: 'not-an-email', password: 'short' },
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.match(response.body.error, /email|password/i);
  });

  it('validates the signup payload contract', async () => {
    const response = await call('/signin', {
      method: 'POST',
      body: { name: 'Someone', email: 'someone@example.com', password: '12345678', type: 'Owner' },
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.match(response.body.error, /type/i);
  });
});
