/*
 * Integration-style contract tests: mount the real /api routes on an Express app
 * and assert the HTTP contracts that do not require a database connection
 * (auth middleware and Joi validation run before any query).
 *
 * Run with: npm run test:contract
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

describe('API route contracts (no database required)', () => {
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

  it('rejects unauthenticated access to protected order and report routes', async () => {
    const list = await call('/orders');
    assert.equal(list.status, 400);
    assert.equal(list.body.message, 'Missing authentication token.');

    const checkout = await call('/orders/checkout', {
      method: 'POST',
      body: { clientId: 1, items: [{ productId: 1, quantity: 1 }] },
    });
    assert.equal(checkout.status, 400);
    assert.equal(checkout.body.message, 'Missing authentication token.');

    const reports = await call('/reports');
    assert.equal(reports.status, 400);
    assert.equal(reports.body.message, 'Missing authentication token.');
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

  it('validates the signup payload contract and blocks public Admin creation', async () => {
    const invalidType = await call('/signin', {
      method: 'POST',
      body: { name: 'Someone', email: 'someone@example.com', password: '12345678', type: 'Owner' },
    });

    assert.equal(invalidType.status, 400);
    assert.equal(invalidType.body.success, false);
    assert.match(invalidType.body.error, /type/i);

    const adminAttempt = await call('/signin', {
      method: 'POST',
      body: { name: 'Attacker', email: 'attacker@example.com', password: '12345678', type: 'Admin' },
    });

    assert.equal(adminAttempt.status, 400);
    assert.equal(adminAttempt.body.success, false);
    assert.match(adminAttempt.body.error, /type/i);
  });

  it('allows public product catalog validation while still protecting product mutations with auth', async () => {
    // Public catalog endpoints reach Joi validation without requiring an auth token
    const invalidProductId = await call('/products/not-a-number');
    assert.equal(invalidProductId.status, 400);
    assert.equal(invalidProductId.body.success, false);
    assert.match(invalidProductId.body.error, /productId/i);

    const invalidFilter = await call('/products/filters', {
      method: 'POST',
      body: { minPrice: -10 },
    });
    assert.equal(invalidFilter.status, 400);
    assert.equal(invalidFilter.body.success, false);
    assert.match(invalidFilter.body.error, /minPrice/i);

    // Mutations remain strictly authenticated
    const createAttempt = await call('/products', {
      method: 'POST',
      body: { productName: 'Public Hack', category: 'General', price: 10, quantityInStock: 1 },
    });
    assert.equal(createAttempt.status, 400);
    assert.equal(createAttempt.body.message, 'Missing authentication token.');

    const updateAttempt = await call('/products/1', {
      method: 'PUT',
      body: { price: 1 },
    });
    assert.equal(updateAttempt.status, 400);
    assert.equal(updateAttempt.body.message, 'Missing authentication token.');

    const deleteAttempt = await call('/products/1', { method: 'DELETE' });
    assert.equal(deleteAttempt.status, 400);
    assert.equal(deleteAttempt.body.message, 'Missing authentication token.');
  });

  it('enforces auth contracts on Phase 2 taxonomy, inventory, reviews and questions endpoints', async () => {
    const createCategory = await call('/categories', {
      method: 'POST',
      body: { name: 'Smart Home' },
    });
    assert.equal(createCategory.status, 400);
    assert.equal(createCategory.body.message, 'Missing authentication token.');

    const createBrand = await call('/brands', {
      method: 'POST',
      body: { name: 'Sony' },
    });
    assert.equal(createBrand.status, 400);
    assert.equal(createBrand.body.message, 'Missing authentication token.');

    const inventoryMovements = await call('/inventory/movements');
    assert.equal(inventoryMovements.status, 400);
    assert.equal(inventoryMovements.body.message, 'Missing authentication token.');

    const postReview = await call('/products/1/reviews', {
      method: 'POST',
      body: { rating: 5, title: 'Great', comment: 'Works well!' },
    });
    assert.equal(postReview.status, 400);
    assert.equal(postReview.body.message, 'Missing authentication token.');

    const adminReviews = await call('/reviews');
    assert.equal(adminReviews.status, 400);
    assert.equal(adminReviews.body.message, 'Missing authentication token.');
  });

  it('enforces auth contracts on Phase 3 store-settings mutations, wishlist and client CRM routes', async () => {
    const updateSettings = await call('/store-settings', {
      method: 'PUT',
      body: { storeName: 'Hacked Store' },
    });
    assert.equal(updateSettings.status, 400);
    assert.equal(updateSettings.body.message, 'Missing authentication token.');

    const wishlist = await call('/wishlists');
    assert.equal(wishlist.status, 400);
    assert.equal(wishlist.body.message, 'Missing authentication token.');

    const clientOverview = await call('/clients/1/overview');
    assert.equal(clientOverview.status, 400);
    assert.equal(clientOverview.body.message, 'Missing authentication token.');
  });
});
