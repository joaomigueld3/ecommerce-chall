/* eslint-disable no-console */
/*
 * End-to-end verification of the order lifecycle:
 * checkout, stock locking, status state machine, cancellation and idempotency.
 *
 * Requirements to run:
 *   1. PostgreSQL reachable with the credentials in .env / src/config/database.js
 *      (use a DEDICATED database: this suite WIPES order/product/user tables).
 *   2. Migrations applied: npx sequelize-cli db:migrate
 *   3. Run with: npm test
 *
 * Safety guard: refuses to run unless the database name contains "test"
 * or ALLOW_DB_WIPE=1 is set.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

import connection from '../src/database/index.js';
import User from '../src/entities/models/User.js';
import Client from '../src/entities/models/Client.js';
import Product from '../src/entities/models/Product.js';
import Order from '../src/entities/models/Order.js';
import OrderItem from '../src/entities/models/OrderItem.js';
import IdempotencyKey from '../src/entities/models/IdempotencyKey.js';

dotenv.config({ path: '.env' });

const PORT = process.env.PORT || 9095;
const BASE_URL = `http://localhost:${PORT}/api`;
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ADMIN_EMAIL = 'order-workflow-admin@test.local';
const ADMIN_PASSWORD = 'Test@12345';

let serverProcess = null;
const serverLogs = [];
let token = null;
let clientId = null;
const products = {};

async function api(pathname, { method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  return { status: response.status, headers: response.headers, body: json };
}

async function waitForServer(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(`${BASE_URL}/orders`);
      return;
    } catch {
      await new Promise((resolve) => { setTimeout(resolve, 250); });
    }
  }
  throw new Error(`Server did not become ready on port ${PORT}.\nServer logs:\n${serverLogs.join('')}`);
}

async function getStock(productId) {
  const product = await Product.findByPk(productId);
  return product.quantityInStock;
}

async function countRows(model) {
  return model.count();
}

describe('order lifecycle workflow', () => {
  before(async () => {
    const dbName = connection.config?.database || connection.options?.database || '';
    if (!process.env.ALLOW_DB_WIPE && !dbName.toLowerCase().includes('test')) {
      throw new Error(
        `Refusing to run: database '${dbName}' does not look like a test database. `
        + 'Point .env / src/config/database.js at a dedicated test database or set ALLOW_DB_WIPE=1.',
      );
    }

    await connection.authenticate();

    // Clean slate, respecting FK order.
    await IdempotencyKey.destroy({ where: {} });
    await OrderItem.destroy({ where: {} });
    await Order.destroy({ where: {} });
    await Client.destroy({ where: {} });
    await Product.destroy({ where: {} });
    await User.destroy({ where: {} });

    const admin = await User.create({
      name: 'WORKFLOW ADMIN',
      email: ADMIN_EMAIL,
      password: await bcrypt.hash(ADMIN_PASSWORD, 10),
      type: 'Admin',
      confirmed: true,
    });

    const client = await Client.create({
      userId: admin.id,
      fullName: 'WORKFLOW TEST CLIENT',
      contact: `workflow-${Date.now()}`,
      address: 'Test Street, 123',
      status: true,
    });
    clientId = client.clientId;

    products.A = await Product.create({ productName: 'WF PRODUCT A', price: 10.50, quantityInStock: 100 });
    products.B = await Product.create({ productName: 'WF PRODUCT B', price: 19.99, quantityInStock: 50 });
    products.C = await Product.create({ productName: 'WF PRODUCT C', price: 5.00, quantityInStock: 5 });
    products.D = await Product.create({ productName: 'WF PRODUCT D', price: 7.25, quantityInStock: 3 });
    products.E = await Product.create({ productName: 'WF PRODUCT E', price: 12.34, quantityInStock: 10 });

    serverProcess = spawn(process.execPath, ['src/index.js'], {
      cwd: ROOT_DIR,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    serverProcess.stdout.on('data', (chunk) => serverLogs.push(chunk.toString()));
    serverProcess.stderr.on('data', (chunk) => serverLogs.push(chunk.toString()));

    await waitForServer();

    const login = await api('/login', {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    assert.equal(login.status, 200, `Login failed: ${JSON.stringify(login.body)}`);
    token = login.body.token;
  });

  after(async () => {
    if (serverProcess) serverProcess.kill('SIGTERM');
    await connection.close();
  });

  let lifecycleOrderId = null;
  let cancelOrderId = null;
  let idempotentOrderId = null;

  it('1. completes checkout with two distinct items, server-side pricing and stock decrement', async () => {
    const response = await api('/orders/checkout', {
      method: 'POST',
      body: {
        clientId,
        items: [
          { productId: products.A.productId, quantity: 2 },
          { productId: products.B.productId, quantity: 3 },
        ],
      },
    });

    assert.equal(response.status, 201, JSON.stringify(response.body));
    assert.equal(response.body.order.status, 'Received');
    assert.equal(response.body.order.total, '80.97'); // 2*10.50 + 3*19.99, computed server-side
    assert.equal(response.body.items.length, 2);

    const itemA = response.body.items.find((i) => i.productId === products.A.productId);
    const itemB = response.body.items.find((i) => i.productId === products.B.productId);
    assert.equal(itemA.pricePerUnit, '10.50');
    assert.equal(itemA.subtotal, '21.00');
    assert.equal(itemB.pricePerUnit, '19.99');
    assert.equal(itemB.subtotal, '59.97');

    assert.equal(await getStock(products.A.productId), 98);
    assert.equal(await getStock(products.B.productId), 47);

    lifecycleOrderId = response.body.order.orderId;
  });

  it('2. merges duplicated productId entries into a single line item', async () => {
    const stockBefore = await getStock(products.A.productId);

    const response = await api('/orders/checkout', {
      method: 'POST',
      body: {
        clientId,
        items: [
          { productId: products.A.productId, quantity: 1 },
          { productId: products.A.productId, quantity: 2 },
        ],
      },
    });

    assert.equal(response.status, 201, JSON.stringify(response.body));
    assert.equal(response.body.items.length, 1);
    assert.equal(response.body.items[0].quantity, 3);
    assert.equal(response.body.order.total, '31.50');
    assert.equal(await getStock(products.A.productId), stockBefore - 3);

    cancelOrderId = response.body.order.orderId;
  });

  it('3. rolls back the whole checkout when any product has insufficient stock', async () => {
    const ordersBefore = await countRows(Order);
    const itemsBefore = await countRows(OrderItem);
    const stockABefore = await getStock(products.A.productId);
    const stockDBefore = await getStock(products.D.productId);

    const response = await api('/orders/checkout', {
      method: 'POST',
      body: {
        clientId,
        items: [
          { productId: products.A.productId, quantity: 1 },
          { productId: products.D.productId, quantity: 999 },
        ],
      },
    });

    assert.equal(response.status, 409, JSON.stringify(response.body));
    assert.match(response.body.message, /Insufficient stock/);

    assert.equal(await countRows(Order), ordersBefore, 'no order may be created');
    assert.equal(await countRows(OrderItem), itemsBefore, 'no order item may be created');
    assert.equal(await getStock(products.A.productId), stockABefore, 'stock of product A must be untouched');
    assert.equal(await getStock(products.D.productId), stockDBefore, 'stock of product D must be untouched');
  });

  it('4. rejects an invalid status transition with 409', async () => {
    const response = await api(`/orders/${lifecycleOrderId}/status`, {
      method: 'PATCH',
      body: { status: 'Delivered' },
    });

    assert.equal(response.status, 409, JSON.stringify(response.body));
    assert.match(response.body.message, /Invalid status transition/);
  });

  it('5. accepts the valid transition chain and freezes terminal states', async () => {
    for (const status of ['In Preparation', 'Dispatched', 'Delivered']) {
      const response = await api(`/orders/${lifecycleOrderId}/status`, {
        method: 'PATCH',
        body: { status },
      });
      assert.equal(response.status, 200, JSON.stringify(response.body));
      assert.equal(response.body.order.status, status);
    }

    const cancelDelivered = await api(`/orders/${lifecycleOrderId}/cancel`, { method: 'POST' });
    assert.equal(cancelDelivered.status, 409, 'a Delivered order cannot be cancelled');

    const patchDelivered = await api(`/orders/${lifecycleOrderId}/status`, {
      method: 'PATCH',
      body: { status: 'In Preparation' },
    });
    assert.equal(patchDelivered.status, 409, 'a Delivered order cannot change status');

    const summary = await api(`/orders/${lifecycleOrderId}/summary`);
    assert.equal(summary.status, 200);
    assert.equal(summary.body.consistent, true);
    assert.equal(summary.body.recomputedTotal, summary.body.persistedTotal);
  });

  it('6. cancellation restores stock, is transactional and preserves the order total', async () => {
    const stockBefore = await getStock(products.A.productId);

    const response = await api(`/orders/${cancelOrderId}/cancel`, { method: 'POST' });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.order.status, 'Cancelled');
    assert.equal(response.body.order.total, '31.50', 'total must stay historically accurate');
    assert.deepEqual(response.body.restoredItems, [
      { productId: products.A.productId, quantityRestored: 3 },
    ]);
    assert.equal(await getStock(products.A.productId), stockBefore + 3);

    const secondCancel = await api(`/orders/${cancelOrderId}/cancel`, { method: 'POST' });
    assert.equal(secondCancel.status, 409, 'a Cancelled order cannot be cancelled again');
  });

  it('7. replays the original checkout result when the same Idempotency-Key is retried', async () => {
    const payload = {
      clientId,
      items: [{ productId: products.E.productId, quantity: 2 }],
    };
    const headers = { 'Idempotency-Key': 'verify-idem-1' };

    const first = await api('/orders/checkout', { method: 'POST', body: payload, headers });
    assert.equal(first.status, 201, JSON.stringify(first.body));
    idempotentOrderId = first.body.order.orderId;

    const ordersBefore = await countRows(Order);
    const stockBefore = await getStock(products.E.productId);

    const retry = await api('/orders/checkout', { method: 'POST', body: payload, headers });
    assert.equal(retry.status, 201, JSON.stringify(retry.body));
    assert.equal(retry.headers.get('idempotency-replayed'), 'true');
    assert.equal(retry.body.order.orderId, idempotentOrderId, 'must return the original order');
    assert.equal(retry.body.order.total, first.body.order.total);

    assert.equal(await countRows(Order), ordersBefore, 'no duplicate order may be created');
    assert.equal(await getStock(products.E.productId), stockBefore, 'stock must not be decremented twice');
  });

  it('8. rejects reuse of an Idempotency-Key with a different payload with 409', async () => {
    const response = await api('/orders/checkout', {
      method: 'POST',
      body: {
        clientId,
        items: [{ productId: products.E.productId, quantity: 3 }],
      },
      headers: { 'Idempotency-Key': 'verify-idem-1' },
    });

    assert.equal(response.status, 409, JSON.stringify(response.body));
    assert.match(response.body.message, /different checkout payload/);
  });

  it('9. prevents overselling under concurrent checkouts', async () => {
    const productId = products.C.productId;
    const initialStock = await getStock(productId); // seeded with 5

    const attempts = 10;
    const results = await Promise.all(
      Array.from({ length: attempts }, () => api('/orders/checkout', {
        method: 'POST',
        body: { clientId, items: [{ productId, quantity: 1 }] },
      })),
    );

    const succeeded = results.filter((r) => r.status === 201).length;
    const rejected = results.filter((r) => r.status === 409).length;

    assert.equal(succeeded, initialStock, `exactly ${initialStock} checkouts may succeed`);
    assert.equal(rejected, attempts - initialStock, 'all other checkouts must be rejected');

    const finalStock = await getStock(productId);
    assert.equal(finalStock, 0, 'stock must end at exactly 0');
    assert.ok(finalStock >= 0, 'stock must never go negative');
  });
});
