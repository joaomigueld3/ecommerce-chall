/* eslint-disable no-console */
/*
 * End-to-end verification of the order lifecycle, simulated payment, RBAC and sales reports:
 * checkout, payment confirmation/denial, stock locking, status state machine, cancellation, idempotency and CSV reports.
 *
 * Requirements to run:
 *   1. PostgreSQL reachable with the credentials in .env / src/config/database.cjs
 *      (use a DEDICATED database: this suite WIPES order/product/user/report tables).
 *   2. Migrations applied: npx sequelize-cli db:migrate
 *   3. Run with: npm run test:e2e
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
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
import SalesReport from '../src/entities/models/SalesReport.js';

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
const createdReportFiles = [];

async function api(pathname, { method = 'GET', body, headers = {}, authToken = token } = {}) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: response.status, headers: response.headers, body: json, text };
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

describe('order lifecycle, payment, RBAC and reports E2E', () => {
  before(async () => {
    const dbName = connection.config?.database || connection.options?.database || '';
    if (!process.env.ALLOW_DB_WIPE && !dbName.toLowerCase().includes('test')) {
      throw new Error(
        `Refusing to run: database '${dbName}' does not look like a test database. `
        + 'Point .env at a dedicated test database or set ALLOW_DB_WIPE=1.',
      );
    }

    await connection.authenticate();

    await SalesReport.destroy({ where: {} });
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

    products.A = await Product.create({ productName: 'WF PRODUCT A', category: 'Peripherals', price: 10.50, quantityInStock: 100 });
    products.B = await Product.create({ productName: 'WF PRODUCT B', category: 'Audio', price: 19.99, quantityInStock: 50 });
    products.C = await Product.create({ productName: 'WF PRODUCT C', category: 'Accessories', price: 5.00, quantityInStock: 5 });
    products.D = await Product.create({ productName: 'WF PRODUCT D', category: 'Electronics', price: 7.25, quantityInStock: 3 });
    products.E = await Product.create({ productName: 'WF PRODUCT E', category: 'Electronics', price: 12.34, quantityInStock: 10 });

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
      authToken: null,
    });
    assert.equal(login.status, 200, `Login failed: ${JSON.stringify(login.body)}`);
    token = login.body.token;
  });

  after(async () => {
    createdReportFiles.forEach((relPath) => {
      const absPath = path.resolve(ROOT_DIR, relPath);
      if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
    });
    if (serverProcess) serverProcess.kill('SIGTERM');
    await connection.close();
  });

  let lifecycleOrderId = null;
  let cancelOrderId = null;
  let deniedOrderId = null;
  let idempotentOrderId = null;

  it('1. checkout creates Pending Payment order without debiting stock; confirm payment debits stock and sets Received', async () => {
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
    assert.equal(response.body.order.status, 'Pending Payment');
    assert.equal(response.body.order.total, '80.97');
    assert.equal(response.body.items.length, 2);

    // Stock stays untouched until payment confirmation
    assert.equal(await getStock(products.A.productId), 100);
    assert.equal(await getStock(products.B.productId), 50);

    lifecycleOrderId = response.body.order.orderId;

    const payment = await api(`/orders/${lifecycleOrderId}/payment`, {
      method: 'POST',
      body: { action: 'confirm' },
    });
    assert.equal(payment.status, 200, JSON.stringify(payment.body));
    assert.equal(payment.body.paymentStatus, 'confirmed');
    assert.equal(payment.body.order.status, 'Received');

    assert.equal(await getStock(products.A.productId), 98);
    assert.equal(await getStock(products.B.productId), 47);
  });

  it('2. merges duplicated productId entries and supports payment denial without stock debit', async () => {
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

    cancelOrderId = response.body.order.orderId;

    const confirm = await api(`/orders/${cancelOrderId}/payment`, {
      method: 'POST',
      body: { action: 'confirm' },
    });
    assert.equal(confirm.status, 200);
    assert.equal(await getStock(products.A.productId), stockBefore - 3);

    const deniedCheckout = await api('/orders/checkout', {
      method: 'POST',
      body: { clientId, items: [{ productId: products.A.productId, quantity: 2 }] },
    });
    deniedOrderId = deniedCheckout.body.order.orderId;

    const deny = await api(`/orders/${deniedOrderId}/payment`, {
      method: 'POST',
      body: { action: 'deny' },
    });
    assert.equal(deny.status, 200);
    assert.equal(deny.body.order.status, 'Cancelled');
    assert.equal(await getStock(products.A.productId), stockBefore - 3);
  });

  it('3. rolls back checkout when any product has insufficient stock', async () => {
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

    assert.equal(await countRows(Order), ordersBefore);
    assert.equal(await countRows(OrderItem), itemsBefore);
    assert.equal(await getStock(products.A.productId), stockABefore);
    assert.equal(await getStock(products.D.productId), stockDBefore);
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
      // eslint-disable-next-line no-await-in-loop
      const response = await api(`/orders/${lifecycleOrderId}/status`, {
        method: 'PATCH',
        body: { status },
      });
      assert.equal(response.status, 200, JSON.stringify(response.body));
      assert.equal(response.body.order.status, status);
    }

    const cancelDelivered = await api(`/orders/${lifecycleOrderId}/cancel`, { method: 'POST' });
    assert.equal(cancelDelivered.status, 409);

    const patchDelivered = await api(`/orders/${lifecycleOrderId}/status`, {
      method: 'PATCH',
      body: { status: 'In Preparation' },
    });
    assert.equal(patchDelivered.status, 409);

    const summary = await api(`/orders/${lifecycleOrderId}/summary`);
    assert.equal(summary.status, 200);
    assert.equal(summary.body.consistent, true);
    assert.equal(summary.body.recomputedTotal, summary.body.persistedTotal);
  });

  it('6. cancellation restores stock for paid orders and freezes Cancelled state', async () => {
    const stockBefore = await getStock(products.A.productId);

    const response = await api(`/orders/${cancelOrderId}/cancel`, { method: 'POST' });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.order.status, 'Cancelled');
    assert.equal(response.body.order.total, '31.50');
    assert.deepEqual(response.body.restoredItems, [
      { productId: products.A.productId, quantityRestored: 3 },
    ]);
    assert.equal(await getStock(products.A.productId), stockBefore + 3);

    const secondCancel = await api(`/orders/${cancelOrderId}/cancel`, { method: 'POST' });
    assert.equal(secondCancel.status, 409);
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

    const retry = await api('/orders/checkout', { method: 'POST', body: payload, headers });
    assert.equal(retry.status, 201, JSON.stringify(retry.body));
    assert.equal(retry.headers.get('idempotency-replayed'), 'true');
    assert.equal(retry.body.order.orderId, idempotentOrderId);

    assert.equal(await countRows(Order), ordersBefore);
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

  it('9. prevents overselling under concurrent payment confirmations', async () => {
    const productId = products.C.productId;
    const initialStock = await getStock(productId); // seeded with 5

    const attempts = 10;
    const checkoutResults = await Promise.all(
      Array.from({ length: attempts }, () => api('/orders/checkout', {
        method: 'POST',
        body: { clientId, items: [{ productId, quantity: 1 }] },
      })),
    );

    const orderIds = checkoutResults.map((r) => r.body.order.orderId);

    const paymentResults = await Promise.all(
      orderIds.map((id) => api(`/orders/${id}/payment`, {
        method: 'POST',
        body: { action: 'confirm' },
      })),
    );

    const succeeded = paymentResults.filter((r) => r.status === 200).length;
    const rejected = paymentResults.filter((r) => r.status === 409).length;

    assert.equal(succeeded, initialStock, `exactly ${initialStock} payments may succeed`);
    assert.equal(rejected, attempts - initialStock, 'remaining payments must be rejected with 409');

    const finalStock = await getStock(productId);
    assert.equal(finalStock, 0);
  });

  it('10. generates and downloads SQL+CSV sales report for confirmed orders', async () => {
    const now = new Date();
    const startDate = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const endDate = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    const reportRes = await api('/reports', {
      method: 'POST',
      body: { startDate, endDate },
    });

    assert.equal(reportRes.status, 201, JSON.stringify(reportRes.body));
    assert.ok(reportRes.body.report.reportId);
    createdReportFiles.push(reportRes.body.report.filePath);

    // Paid orders so far: lifecycleOrder (2*10.50 + 3*19.99 = 80.97, 5 units) + 5 concurrent C orders (5*5.00 = 25.00, 5 units)
    assert.equal(reportRes.body.report.productsSold, 10);
    assert.equal(reportRes.body.report.totalSales, '105.97');

    const download = await api(`/reports/${reportRes.body.report.reportId}/download`);
    assert.equal(download.status, 200);
    assert.match(download.text, /WF PRODUCT A/);
    assert.match(download.text, /TOTAL,,,10,105\.97/);
  });

  it('11. enforces Client RBAC end-to-end (signup -> confirm -> login -> catalog -> checkout -> 403 on admin routes)', async () => {
    const clientEmail = `client-${Date.now()}@test.local`;
    const signup = await api('/signin', {
      method: 'POST',
      body: { name: 'E2E Client', email: clientEmail, password: 'Client@1234', type: 'Client' },
      authToken: null,
    });
    assert.equal(signup.status, 201, JSON.stringify(signup.body));
    assert.ok(signup.body.confirmationToken);

    const confirm = await api(`/confirmation/${signup.body.confirmationToken}`, {
      headers: { Accept: 'application/json' },
      authToken: null,
    });
    assert.equal(confirm.status, 200, JSON.stringify(confirm.body));

    const clientLogin = await api('/login', {
      method: 'POST',
      body: { email: clientEmail, password: 'Client@1234' },
      authToken: null,
    });
    assert.equal(clientLogin.status, 200, JSON.stringify(clientLogin.body));
    const clientToken = clientLogin.body.token;

    // Client can read/filter products
    const filteredProducts = await api('/products?category=Audio&available=true', { authToken: clientToken });
    assert.equal(filteredProducts.status, 200);
    assert.ok(filteredProducts.body.length >= 1);

    // Client is forbidden from admin endpoints
    const forbiddenReport = await api('/reports', { authToken: clientToken });
    assert.equal(forbiddenReport.status, 403);

    const forbiddenProductCreate = await api('/products', {
      method: 'POST',
      body: { productName: 'Hack', category: 'General', price: 10, quantityInStock: 1 },
      authToken: clientToken,
    });
    assert.equal(forbiddenProductCreate.status, 403);

    // Client can create own client profile & checkout own order
    const createdClient = await api('/clients', {
      method: 'POST',
      body: { fullName: 'E2E Client', contact: `999-${Date.now()}`, address: 'Rua Teste' },
      authToken: clientToken,
    });
    assert.equal(createdClient.status, 201, JSON.stringify(createdClient.body));

    const ownCheckout = await api('/orders/checkout', {
      method: 'POST',
      body: { clientId: createdClient.body.clientId, items: [{ productId: products.A.productId, quantity: 1 }] },
      authToken: clientToken,
    });
    assert.equal(ownCheckout.status, 201, JSON.stringify(ownCheckout.body));

    // Client cannot checkout for another client
    const otherCheckout = await api('/orders/checkout', {
      method: 'POST',
      body: { clientId, items: [{ productId: products.A.productId, quantity: 1 }] },
      authToken: clientToken,
    });
    assert.equal(otherCheckout.status, 403);
  });
});
