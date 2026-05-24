import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import allRoutes from '../src/adapters/secondary/routes/allRoutes.js';
import orderRouter from '../src/adapters/secondary/routes/OrderRoutes.js';

/**
 * Integration-style tests: the real Express routers are mounted and hit over
 * HTTP on an ephemeral port. These assertions cover the parts of the HTTP
 * contract that do not require a Postgres connection (auth and validation
 * middleware run before any query is issued). Full DB-backed flows are covered
 * by scripts/verify-order-lifecycle.js.
 */
describe('API route contracts', () => {
  let server;
  let baseUrl;

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api', allRoutes);
    // The same order router, mounted without the auth middleware, so the
    // validation contract can be asserted without a database-backed login.
    app.use('/unauthenticated/orders', orderRouter);
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => new Promise((resolve) => { server.close(resolve); }));

  it('rejects protected routes without a token (400 + message)', async () => {
    const res = await fetch(`${baseUrl}/api/products`);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.message, 'Missing authentication token.');
  });

  it('rejects an invalid login payload with the project error shape', async () => {
    const res = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: '12345678' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error, /email/);
  });

  it('rejects a checkout with an empty items array', async () => {
    const res = await fetch(`${baseUrl}/unauthenticated/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: 1, items: [] }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error, /items/);
  });

  it('rejects a checkout item with a non-positive quantity', async () => {
    const res = await fetch(`${baseUrl}/unauthenticated/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: 1, items: [{ productId: 1, quantity: 0 }] }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error, /quantity/);
  });

  it('rejects a client-priced checkout payload (unknown keys are not allowed)', async () => {
    const res = await fetch(`${baseUrl}/unauthenticated/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: 1, items: [{ productId: 1, quantity: 1, price: 0.01 }] }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error, /not allowed/);
  });
});
