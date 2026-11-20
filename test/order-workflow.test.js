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
import Category from '../src/entities/models/Category.js';
import Brand from '../src/entities/models/Brand.js';
import ProductImage from '../src/entities/models/ProductImage.js';
import ProductVariant from '../src/entities/models/ProductVariant.js';
import ProductReview from '../src/entities/models/ProductReview.js';
import ProductQuestion from '../src/entities/models/ProductQuestion.js';
import StockMovement from '../src/entities/models/StockMovement.js';
import StoreSetting from '../src/entities/models/StoreSetting.js';
import ClientAddress from '../src/entities/models/ClientAddress.js';
import SavedPaymentMethod from '../src/entities/models/SavedPaymentMethod.js';
import Wishlist from '../src/entities/models/Wishlist.js';
import WishlistItem from '../src/entities/models/WishlistItem.js';

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
    await WishlistItem.destroy({ where: {} });
    await Wishlist.destroy({ where: {} });
    await SavedPaymentMethod.destroy({ where: {} });
    await ClientAddress.destroy({ where: {} });
    await StoreSetting.destroy({ where: {} });
    await StockMovement.destroy({ where: {} });
    await ProductReview.destroy({ where: {} });
    await ProductQuestion.destroy({ where: {} });
    await ProductVariant.destroy({ where: {} });
    await ProductImage.destroy({ where: {} });
    await IdempotencyKey.destroy({ where: {} });
    await OrderItem.destroy({ where: {} });
    await Order.destroy({ where: {} });
    await Client.destroy({ where: {} });
    await Product.destroy({ where: {} });
    await Brand.destroy({ where: {} });
    await Category.destroy({ where: {} });
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

  it('12. serves public catalog, department counts, sorting and pagination headers against PostgreSQL', async () => {
    // Public catalog listing (no auth token)
    const publicList = await api('/products', { authToken: null });
    assert.equal(publicList.status, 200, JSON.stringify(publicList.body));
    assert.ok(Array.isArray(publicList.body));
    assert.equal(publicList.body.length, 5);

    // Public single product lookup (no auth token)
    const publicDetail = await api(`/products/${products.A.productId}`, { authToken: null });
    assert.equal(publicDetail.status, 200);
    assert.equal(publicDetail.body.productName, 'WF PRODUCT A');

    // Public department counts via SQL GROUP BY
    const categoriesRes = await api('/products/categories', { authToken: null });
    assert.equal(categoriesRes.status, 200, JSON.stringify(categoriesRes.body));
    assert.deepEqual(categoriesRes.body.categories, [
      { category: 'Accessories', productCount: 1 },
      { category: 'Audio', productCount: 1 },
      { category: 'Electronics', productCount: 2 },
      { category: 'Peripherals', productCount: 1 },
    ]);

    // Public paginated + sorted product query
    const page1 = await api('/products?page=1&limit=2&sortBy=price&sortOrder=asc', { authToken: null });
    assert.equal(page1.status, 200, JSON.stringify(page1.body));
    assert.equal(page1.body.items.length, 2);
    assert.equal(page1.body.items[0].productName, 'WF PRODUCT C'); // 5.00
    assert.equal(page1.body.items[1].productName, 'WF PRODUCT D'); // 7.25
    assert.deepEqual(page1.body.pagination, {
      page: 1,
      limit: 2,
      total: 5,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: false,
    });
    assert.equal(page1.headers.get('x-total-count'), '5');
    assert.equal(page1.headers.get('x-page'), '1');
    assert.equal(page1.headers.get('x-limit'), '2');
    assert.equal(page1.headers.get('x-total-pages'), '3');

    const page3 = await api('/products?page=3&limit=2&sortBy=price&sortOrder=asc', { authToken: null });
    assert.equal(page3.status, 200);
    assert.equal(page3.body.items.length, 1);
    assert.equal(page3.body.items[0].productName, 'WF PRODUCT B'); // 19.99
    assert.equal(page3.body.pagination.hasNextPage, false);
    assert.equal(page3.body.pagination.hasPrevPage, true);

    // Paginated orders & clients preserve existing keys while adding pagination metadata
    const ordersPage = await api('/orders?page=1&limit=2&sortBy=orderId&sortOrder=asc');
    assert.equal(ordersPage.status, 200);
    assert.equal(ordersPage.body.allOrders.length, 2);
    assert.ok(ordersPage.body.pagination.total >= 2);
    assert.equal(ordersPage.headers.get('x-limit'), '2');

    const clientsPage = await api('/clients?page=1&limit=1');
    assert.equal(clientsPage.status, 200);
    assert.equal(clientsPage.body.allClients.length, 1);
    assert.ok(clientsPage.body.pagination.total >= 2);
  });

  it('13. executes Phase 2 flows end-to-end (taxonomy, variants, verified reviews, Q&A, Kardex and soft-archive)', async () => {
    // Taxonomy: Category & Brand
    const catRes = await api('/categories', {
      method: 'POST',
      body: { name: 'Laptops E2E', description: 'Portable workstations' },
    });
    assert.equal(catRes.status, 201, JSON.stringify(catRes.body));

    const brandRes = await api('/brands', {
      method: 'POST',
      body: { name: 'OmniTech' },
    });
    assert.equal(brandRes.status, 201, JSON.stringify(brandRes.body));

    // Product variant + image on product A
    const varRes = await api(`/products/${products.A.productId}/variants`, {
      method: 'POST',
      body: { sku: `VAR-${Date.now()}`, name: '512GB Space Grey', quantityInStock: 10 },
    });
    assert.equal(varRes.status, 201, JSON.stringify(varRes.body));

    const detail = await api(`/products/${products.A.productId}`, { authToken: null });
    assert.equal(detail.status, 200);
    assert.equal(detail.body.variants.length, 1);

    // Review by admin user (who has a Delivered order containing product A -> verifiedPurchase=true!)
    const reviewRes = await api(`/products/${products.A.productId}/reviews`, {
      method: 'POST',
      body: { rating: 5, title: 'Solid E2E quality', comment: 'Tested against real PostgreSQL.' },
    });
    assert.equal(reviewRes.status, 201, JSON.stringify(reviewRes.body));
    assert.equal(reviewRes.body.review.verifiedPurchase, true);
    assert.equal(reviewRes.body.ratingSummary.ratingAvg, 5);
    assert.equal(reviewRes.body.ratingSummary.ratingCount, 1);

    // Public reviews list + histogram
    const reviewsList = await api(`/products/${products.A.productId}/reviews`, { authToken: null });
    assert.equal(reviewsList.status, 200);
    assert.equal(reviewsList.body.summary.histogram[5], 1);

    // Q&A + Admin answer
    const qRes = await api(`/products/${products.A.productId}/questions`, {
      method: 'POST',
      body: { question: 'Does it support USB-C charging?' },
    });
    assert.equal(qRes.status, 201, JSON.stringify(qRes.body));
    const questionId = qRes.body.question.questionId;

    const ansRes = await api(`/questions/${questionId}/answer`, {
      method: 'PATCH',
      body: { answer: 'Yes, up to 100W USB-C PD.' },
    });
    assert.equal(ansRes.status, 200, JSON.stringify(ansRes.body));
    assert.equal(ansRes.body.question.answer, 'Yes, up to 100W USB-C PD.');

    // Kardex Inventory: automatic SALE/CANCELLATION_RESTOCK movements already logged + manual INBOUND
    const stockBefore = await getStock(products.A.productId);
    const moveRes = await api('/inventory/movements', {
      method: 'POST',
      body: { productId: products.A.productId, type: 'INBOUND', quantity: 15, reason: 'E2E supplier shipment' },
    });
    assert.equal(moveRes.status, 201, JSON.stringify(moveRes.body));
    assert.equal(await getStock(products.A.productId), stockBefore + 15);

    const kardex = await api(`/inventory/movements?productId=${products.A.productId}`);
    assert.equal(kardex.status, 200);
    const movementTypes = new Set(kardex.body.movements.map((m) => m.type));
    assert.ok(movementTypes.has('SALE'));
    assert.ok(movementTypes.has('CANCELLATION_RESTOCK'));
    assert.ok(movementTypes.has('INBOUND'));

    // Soft-archive protection when deleting a product that has order/movement history
    const archiveRes = await api(`/products/${products.A.productId}`, { method: 'DELETE' });
    assert.equal(archiveRes.status, 200, JSON.stringify(archiveRes.body));
    assert.equal(archiveRes.body.archived, true);
    assert.equal(archiveRes.body.deletedProduct.active, false);
  });

  it('14. executes Phase 3 flows end-to-end (white-label settings, CPF/VAT, international addresses, wallet, wishlist & CRM 360)', async () => {
    // Public store settings read + Admin update
    const getSettings = await api('/store-settings', { authToken: null });
    assert.equal(getSettings.status, 200, JSON.stringify(getSettings.body));
    assert.equal(getSettings.body.settings.storeName, 'omni.store');

    const putSettings = await api('/store-settings', {
      method: 'PUT',
      body: { storeName: 'omni.store', primaryColor: '#0094b6', defaultRegion: 'BR' },
    });
    assert.equal(putSettings.status, 200, JSON.stringify(putSettings.body));
    assert.equal(putSettings.body.settings.defaultRegion, 'BR');

    // Invalid CPF rejected with 400; valid CPF accepted
    const badCpf = await api(`/clients/${clientId}`, {
      method: 'PUT',
      body: { documentType: 'CPF', documentNumber: '111.111.111-11' },
    });
    assert.equal(badCpf.status, 400);

    const goodCpf = await api(`/clients/${clientId}`, {
      method: 'PUT',
      body: { documentType: 'CPF', documentNumber: '529.982.247-25', country: 'BR', phone: '+55 81 98888-7777' },
    });
    assert.equal(goodCpf.status, 200, JSON.stringify(goodCpf.body));
    assert.equal(goodCpf.body.updatedClient.documentNumber, '52998224725');

    // Multi-region Address Book
    const addrBr = await api(`/clients/${clientId}/addresses`, {
      method: 'POST',
      body: {
        label: 'Home BR',
        recipientName: 'Workflow Client',
        country: 'BR',
        postalCode: '50030-170',
        street: 'Rua do Bom Jesus',
        number: '42',
        city: 'Recife',
        state: 'PE',
      },
    });
    assert.equal(addrBr.status, 201, JSON.stringify(addrBr.body));
    assert.equal(addrBr.body.address.isDefaultShipping, true);

    const addrEu = await api(`/clients/${clientId}/addresses`, {
      method: 'POST',
      body: {
        label: 'Lisbon Office',
        recipientName: 'Workflow Client',
        country: 'EU',
        postalCode: '1100-148',
        street: 'Av. da Liberdade',
        number: '110',
        city: 'Lisbon',
        state: 'PT',
        isDefaultShipping: true,
      },
    });
    assert.equal(addrEu.status, 201, JSON.stringify(addrEu.body));

    // Saved Payment Methods (no CVV/PAN stored)
    const cardRes = await api(`/clients/${clientId}/payment-methods`, {
      method: 'POST',
      body: { brand: 'Visa', holderName: 'WORKFLOW CLIENT', last4: '4242', expMonth: 12, expYear: 2029 },
    });
    assert.equal(cardRes.status, 201, JSON.stringify(cardRes.body));
    assert.equal(cardRes.body.paymentMethod.isDefault, true);

    // Wishlist add, read, remove
    const wishAdd = await api('/wishlists/items', {
      method: 'POST',
      body: { productId: products.B.productId },
    });
    assert.equal(wishAdd.status, 201, JSON.stringify(wishAdd.body));

    const wishList = await api('/wishlists');
    assert.equal(wishList.status, 200);
    assert.equal(wishList.body.items.length, 1);

    const wishDel = await api(`/wishlists/items/${products.B.productId}`, { method: 'DELETE' });
    assert.equal(wishDel.status, 200);

    // Client 360° Overview & CRM update
    const crmUpdate = await api(`/clients/${clientId}/crm`, {
      method: 'PATCH',
      body: { tier: 'VIP', loyaltyPoints: 500, creditBalance: 75.5, internalNotes: 'Key account' },
    });
    assert.equal(crmUpdate.status, 200, JSON.stringify(crmUpdate.body));
    assert.equal(crmUpdate.body.updatedClient.tier, 'VIP');

    const overview = await api(`/clients/${clientId}/overview`);
    assert.equal(overview.status, 200, JSON.stringify(overview.body));
    assert.equal(overview.body.client.tier, 'VIP');
    assert.equal(overview.body.addresses.length, 2);
    assert.equal(overview.body.paymentMethods.length, 1);
    assert.ok(overview.body.crm.totalOrders >= 1);
    assert.ok(Number(overview.body.crm.ltv) > 0);

    // Safe deactivation when deleting a client that has orders
    const safeDel = await api(`/clients/${clientId}`, { method: 'DELETE' });
    assert.equal(safeDel.status, 200, JSON.stringify(safeDel.body));
    assert.equal(safeDel.body.deactivated, true);
    assert.equal(safeDel.body.deletedClient.status, false);
  });
});
