/* eslint-disable no-console */
/**
 * Deterministic verification of the order lifecycle.
 *
 * Prerequisites:
 *   1. Postgres running and reachable with the credentials in .env
 *   2. Migrations applied:        npx sequelize-cli db:migrate
 *   3. API server running:        npm run dev   (same .env, PORT set)
 *
 * Run:
 *   node scripts/verify-order-lifecycle.js
 *
 * The script seeds its own admin user, client and products directly through the
 * models (signup needs a working SMTP transport, which is not assumed here),
 * then exercises every scenario over HTTP. Exits 0 only if all scenarios pass.
 */
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import connection from '../src/database/index.js';
import User from '../src/entities/models/User.js';
import Client from '../src/entities/models/Client.js';
import Product from '../src/entities/models/Product.js';

dotenv.config({ path: '.env' });

const BASE_URL = process.env.VERIFY_BASE_URL || `http://localhost:${process.env.PORT}/api`;
const RUN_ID = Date.now();

const results = [];
let token = null;

async function api(method, path, { body, headers = {} } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, body: json };
}

async function getStock(productId) {
  const product = await Product.findByPk(productId);
  return product.quantityInStock;
}

async function scenario(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  PASS  ${name}`);
  } catch (err) {
    results.push({ name, ok: false, error: err });
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
  }
}

async function seed() {
  const password = await bcrypt.hash('Verify123!', 10);
  const user = await User.create({
    name: `verify admin ${RUN_ID}`,
    email: `verify-${RUN_ID}@example.com`,
    password,
    type: 'Admin',
    confirmed: true,
  });
  const client = await Client.create({
    userId: user.id,
    fullName: `verify client ${RUN_ID}`,
    contact: `verify-${RUN_ID}`,
    address: 'verification street',
    status: true,
  });
  const productA = await Product.create({
    productName: `verify-A-${RUN_ID}`, description: 'verification', price: 10.00, quantityInStock: 100,
  });
  const productB = await Product.create({
    productName: `verify-B-${RUN_ID}`, description: 'verification', price: 19.99, quantityInStock: 50,
  });
  const productScarce = await Product.create({
    productName: `verify-scarce-${RUN_ID}`, description: 'verification', price: 5.00, quantityInStock: 5,
  });

  const login = await api('POST', '/login', {
    body: { email: user.email, password: 'Verify123!' },
  });
  assert.equal(login.status, 200, `login failed: ${JSON.stringify(login.body)}`);
  token = login.body.token;

  return {
    clientId: client.clientId,
    productA: productA.productId,
    productB: productB.productId,
    productScarce: productScarce.productId,
  };
}

async function main() {
  console.log(`Verifying against ${BASE_URL}`);
  const ctx = await seed();
  console.log(`Seeded clientId=${ctx.clientId} products=[${ctx.productA}, ${ctx.productB}, ${ctx.productScarce}]\n`);

  // 1. Successful checkout with 2 distinct items
  await scenario('1. successful checkout with 2 distinct items', async () => {
    const stockA = await getStock(ctx.productA);
    const stockB = await getStock(ctx.productB);
    const res = await api('POST', '/orders/checkout', {
      body: {
        clientId: ctx.clientId,
        items: [
          { productId: ctx.productA, quantity: 2 },
          { productId: ctx.productB, quantity: 1 },
        ],
      },
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.order.status, 'Received');
    assert.equal(res.body.order.total, '39.99'); // 2*10.00 + 1*19.99
    assert.equal(res.body.items.length, 2);
    assert.equal(await getStock(ctx.productA), stockA - 2);
    assert.equal(await getStock(ctx.productB), stockB - 1);
    ctx.orderForStatus = res.body.order.orderId;
  });

  // 2. Duplicate productId entries are merged into one line item
  await scenario('2. duplicate productIds are merged into a single line item', async () => {
    const stockA = await getStock(ctx.productA);
    const res = await api('POST', '/orders/checkout', {
      body: {
        clientId: ctx.clientId,
        items: [
          { productId: ctx.productA, quantity: 1 },
          { productId: ctx.productA, quantity: 2 },
        ],
      },
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.items.length, 1, 'duplicates must merge to one line');
    assert.equal(res.body.items[0].quantity, 3);
    assert.equal(res.body.order.total, '30.00');
    assert.equal(await getStock(ctx.productA), stockA - 3);
    ctx.orderForCancel = res.body.order.orderId;
  });

  // 3. Insufficient stock causes full rollback
  await scenario('3. insufficient stock rolls back the entire checkout', async () => {
    const stockA = await getStock(ctx.productA);
    const stockScarce = await getStock(ctx.productScarce);
    const ordersBefore = (await api('GET', '/orders')).body.allOrders.length;
    const res = await api('POST', '/orders/checkout', {
      body: {
        clientId: ctx.clientId,
        items: [
          { productId: ctx.productA, quantity: 1 },
          { productId: ctx.productScarce, quantity: stockScarce + 1 },
        ],
      },
    });
    assert.equal(res.status, 409, JSON.stringify(res.body));
    assert.match(res.body.message, /Insufficient stock/);
    assert.equal(await getStock(ctx.productA), stockA, 'product A stock must be untouched');
    assert.equal(await getStock(ctx.productScarce), stockScarce, 'scarce product stock must be untouched');
    const ordersAfter = (await api('GET', '/orders')).body.allOrders.length;
    assert.equal(ordersAfter, ordersBefore, 'no order row may be created');
  });

  // 3b. Validation: empty items / non-positive quantity
  await scenario('3b. empty items array and quantity <= 0 are rejected with 400', async () => {
    const empty = await api('POST', '/orders/checkout', { body: { clientId: ctx.clientId, items: [] } });
    assert.equal(empty.status, 400, JSON.stringify(empty.body));
    const zero = await api('POST', '/orders/checkout', {
      body: { clientId: ctx.clientId, items: [{ productId: ctx.productA, quantity: 0 }] },
    });
    assert.equal(zero.status, 400, JSON.stringify(zero.body));
    const fractional = await api('POST', '/orders/checkout', {
      body: { clientId: ctx.clientId, items: [{ productId: ctx.productA, quantity: 1.5 }] },
    });
    assert.equal(fractional.status, 400, JSON.stringify(fractional.body));
  });

  // 4. Invalid status transition returns 409
  await scenario('4. invalid status transition returns 409', async () => {
    const res = await api('PATCH', `/orders/${ctx.orderForStatus}/status`, {
      body: { status: 'Delivered' }, // Received -> Delivered is not allowed
    });
    assert.equal(res.status, 409, JSON.stringify(res.body));
    assert.match(res.body.message, /Invalid status transition/);
  });

  // 5. Valid status transitions succeed
  await scenario('5. valid transitions Received -> In Preparation -> Dispatched -> Delivered', async () => {
    for (const status of ['In Preparation', 'Dispatched', 'Delivered']) {
      const res = await api('PATCH', `/orders/${ctx.orderForStatus}/status`, { body: { status } });
      assert.equal(res.status, 200, `${status}: ${JSON.stringify(res.body)}`);
      assert.equal(res.body.status, status);
    }
    // Terminal state: nothing may follow Delivered
    const after = await api('PATCH', `/orders/${ctx.orderForStatus}/status`, { body: { status: 'In Preparation' } });
    assert.equal(after.status, 409, JSON.stringify(after.body));
    const cancelDelivered = await api('POST', `/orders/${ctx.orderForStatus}/cancel`);
    assert.equal(cancelDelivered.status, 409, JSON.stringify(cancelDelivered.body));
  });

  // 6. Cancellation restores stock
  await scenario('6. cancellation restores stock and is terminal', async () => {
    const stockA = await getStock(ctx.productA);
    const res = await api('POST', `/orders/${ctx.orderForCancel}/cancel`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.status, 'Cancelled');
    assert.equal(await getStock(ctx.productA), stockA + 3, 'the 3 units from scenario 2 must be restored');
    const summary = await api('GET', `/orders/${ctx.orderForCancel}/summary`);
    assert.equal(summary.body.persistedTotal, '30.00', 'total must remain historically accurate');
    assert.equal(summary.body.consistent, true);
    const again = await api('POST', `/orders/${ctx.orderForCancel}/cancel`);
    assert.equal(again.status, 409, 'cancelling twice must fail');
  });

  // 6b. Summary consistency flag
  await scenario('6b. summary reports recomputed vs persisted total', async () => {
    const res = await api('GET', `/orders/${ctx.orderForStatus}/summary`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.recomputedTotal, res.body.persistedTotal);
    assert.equal(res.body.consistent, true);
    assert.equal(res.body.warning, undefined);
    assert.ok(Array.isArray(res.body.items) && res.body.items.length === 2);
  });

  // 7. Idempotency key retry returns the same order
  await scenario('7. idempotency key retry returns the original order, no duplicate', async () => {
    const key = `verify-key-${RUN_ID}`;
    const payload = { clientId: ctx.clientId, items: [{ productId: ctx.productB, quantity: 1 }] };
    const stockB = await getStock(ctx.productB);
    const first = await api('POST', '/orders/checkout', { body: payload, headers: { 'Idempotency-Key': key } });
    assert.equal(first.status, 201, JSON.stringify(first.body));
    const second = await api('POST', '/orders/checkout', { body: payload, headers: { 'Idempotency-Key': key } });
    assert.equal(second.status, 200, JSON.stringify(second.body));
    assert.equal(second.body.idempotentReplay, true);
    assert.equal(second.body.order.orderId, first.body.order.orderId, 'must return the same order');
    assert.equal(await getStock(ctx.productB), stockB - 1, 'stock must be decremented exactly once');
    ctx.idempotencyKey = key;
  });

  // 8. Idempotency key reuse with a different payload returns 409
  await scenario('8. idempotency key reused with a different payload returns 409', async () => {
    const res = await api('POST', '/orders/checkout', {
      body: { clientId: ctx.clientId, items: [{ productId: ctx.productB, quantity: 2 }] },
      headers: { 'Idempotency-Key': ctx.idempotencyKey },
    });
    assert.equal(res.status, 409, JSON.stringify(res.body));
    assert.match(res.body.message, /different payload/);
  });

  // 9. Concurrent checkouts cannot oversell
  await scenario('9. two concurrent checkouts cannot drive stock negative', async () => {
    const scarce = await Product.create({
      productName: `verify-race-${RUN_ID}`, description: 'verification', price: 1.00, quantityInStock: 5,
    });
    const body = { clientId: ctx.clientId, items: [{ productId: scarce.productId, quantity: 3 }] };
    const [a, b] = await Promise.all([
      api('POST', '/orders/checkout', { body }),
      api('POST', '/orders/checkout', { body }),
    ]);
    const statuses = [a.status, b.status].sort();
    assert.deepEqual(statuses, [201, 409], `expected exactly one success, got ${a.status} and ${b.status}`);
    const finalStock = await getStock(scarce.productId);
    assert.equal(finalStock, 2, `stock must be 5 - 3 = 2, got ${finalStock}`);
    assert.ok(finalStock >= 0, 'stock must never go negative');
  });

  console.log('');
  const failed = results.filter((r) => !r.ok);
  console.log(`${results.length - failed.length}/${results.length} scenarios passed.`);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
  await connection.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
