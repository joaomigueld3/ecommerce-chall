/*
 * Pure unit tests for the order business rules (no database, no HTTP).
 * Run with: npm run test:unit
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import OrderService, { ORDER_STATUS } from '../src/entities/services/OrderService.js';
import { CustomError } from '../src/utils/errorHandler.js';

function assertCustomError(fn, expectedStatus, messagePattern) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof CustomError, `expected CustomError, got ${error.constructor.name}`);
    assert.equal(error.statusCode, expectedStatus);
    if (messagePattern) assert.match(error.message, messagePattern);
    return true;
  });
}

async function assertAsyncCustomError(fn, expectedStatus, messagePattern) {
  await assert.rejects(fn, (error) => {
    assert.ok(error instanceof CustomError, `expected CustomError, got ${error.constructor.name}`);
    assert.equal(error.statusCode, expectedStatus);
    if (messagePattern) assert.match(error.message, messagePattern);
    return true;
  });
}

describe('OrderService.assertStatusTransition (state machine)', () => {
  it('allows every documented transition', () => {
    const allowed = [
      [ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.RECEIVED, ORDER_STATUS.IN_PREPARATION],
      [ORDER_STATUS.IN_PREPARATION, ORDER_STATUS.DISPATCHED],
      [ORDER_STATUS.DISPATCHED, ORDER_STATUS.DELIVERED],
      [ORDER_STATUS.RECEIVED, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.IN_PREPARATION, ORDER_STATUS.CANCELLED],
    ];

    allowed.forEach(([from, to]) => {
      assert.doesNotThrow(() => OrderService.assertStatusTransition(from, to), `${from} -> ${to} should be allowed`);
    });
  });

  it('rejects skipping steps, bypassing payment and backwards transitions with 409', () => {
    const invalid = [
      [ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.RECEIVED],
      [ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.DELIVERED],
      [ORDER_STATUS.RECEIVED, ORDER_STATUS.DISPATCHED],
      [ORDER_STATUS.RECEIVED, ORDER_STATUS.DELIVERED],
      [ORDER_STATUS.IN_PREPARATION, ORDER_STATUS.RECEIVED],
      [ORDER_STATUS.DISPATCHED, ORDER_STATUS.CANCELLED],
      [ORDER_STATUS.DISPATCHED, ORDER_STATUS.RECEIVED],
    ];

    invalid.forEach(([from, to]) => {
      assertCustomError(() => OrderService.assertStatusTransition(from, to), 409, /Invalid status transition/);
    });
  });

  it('freezes terminal states (Delivered and Cancelled)', () => {
    const targets = Object.values(ORDER_STATUS);

    targets.forEach((target) => {
      assertCustomError(() => OrderService.assertStatusTransition(ORDER_STATUS.DELIVERED, target), 409);
      assertCustomError(() => OrderService.assertStatusTransition(ORDER_STATUS.CANCELLED, target), 409);
    });
  });
});

describe('OrderService.normalizeCheckoutItems (payload normalization)', () => {
  it('merges duplicated productIds and sorts by productId', () => {
    const normalized = OrderService.normalizeCheckoutItems([
      { productId: 5, quantity: 1 },
      { productId: 2, quantity: 2 },
      { productId: 5, quantity: 3 },
      { productId: '2', quantity: '4' },
    ]);

    assert.deepEqual(normalized, [
      { productId: 2, quantity: 6 },
      { productId: 5, quantity: 4 },
    ]);
  });

  it('rejects non-positive or non-integer quantities with 400', () => {
    assertCustomError(() => OrderService.normalizeCheckoutItems([{ productId: 1, quantity: 0 }]), 400, /quantity/i);
    assertCustomError(() => OrderService.normalizeCheckoutItems([{ productId: 1, quantity: -2 }]), 400, /quantity/i);
    assertCustomError(() => OrderService.normalizeCheckoutItems([{ productId: 1, quantity: 1.5 }]), 400, /quantity/i);
  });

  it('rejects invalid productIds with 400', () => {
    assertCustomError(() => OrderService.normalizeCheckoutItems([{ productId: 0, quantity: 1 }]), 400, /productId/i);
    assertCustomError(() => OrderService.normalizeCheckoutItems([{ productId: 'abc', quantity: 1 }]), 400, /productId/i);
  });
});

describe('OrderService.buildCheckoutRequestHash (idempotency hashing)', () => {
  it('is deterministic for equivalent payloads and differs for different payloads', () => {
    const itemsA = OrderService.normalizeCheckoutItems([
      { productId: 2, quantity: 1 },
      { productId: 1, quantity: 2 },
    ]);
    const itemsB = OrderService.normalizeCheckoutItems([
      { productId: 1, quantity: 2 },
      { productId: 2, quantity: 1 },
    ]);
    const itemsC = OrderService.normalizeCheckoutItems([
      { productId: 1, quantity: 3 },
      { productId: 2, quantity: 1 },
    ]);

    assert.equal(
      OrderService.buildCheckoutRequestHash(10, itemsA),
      OrderService.buildCheckoutRequestHash('10', itemsB),
    );
    assert.notEqual(
      OrderService.buildCheckoutRequestHash(10, itemsA),
      OrderService.buildCheckoutRequestHash(10, itemsC),
    );
  });
});

describe('OrderService.processPayment & cancelOrder (simulated payment + stock rules)', () => {
  function createPaymentTestDeps(initialOrder, initialItems, initialProducts) {
    const orders = new Map([[initialOrder.orderId, { ...initialOrder }]]);
    const products = new Map(initialProducts.map((p) => [p.productId, { ...p }]));

    const connection = {
      async transaction(fn) {
        return fn({ LOCK: { UPDATE: 'UPDATE' } });
      },
    };

    const orderRepository = {
      async findById(id) {
        return orders.get(Number(id)) || null;
      },
      async update(id, patch) {
        const order = orders.get(Number(id));
        Object.assign(order, patch);
        return order;
      },
    };

    const orderItemRepository = {
      async findByOrderId(orderId) {
        return initialItems.filter((item) => item.orderId === Number(orderId));
      },
    };

    const productRepository = {
      async findByIdForUpdate(productId) {
        return products.get(Number(productId)) || null;
      },
      async update(productId, patch) {
        const prod = products.get(Number(productId));
        Object.assign(prod, patch);
        return prod;
      },
    };

    return {
      service: new OrderService(orderRepository, { orderItemRepository, productRepository, connection }),
      orders,
      products,
    };
  }

  it('confirms payment, debits stock and moves order to Received', async () => {
    const { service, products } = createPaymentTestDeps(
      { orderId: 1, clientId: 10, status: ORDER_STATUS.PENDING_PAYMENT, orderDate: new Date(), total: '50.00' },
      [{ itemId: 1, orderId: 1, productId: 2, quantity: 3, pricePerUnit: '10.00', subtotal: '30.00' }],
      [{ productId: 2, quantityInStock: 10 }],
    );

    const result = await service.processPayment(1, 'confirm');
    assert.equal(result.paymentStatus, 'confirmed');
    assert.equal(result.order.status, ORDER_STATUS.RECEIVED);
    assert.equal(products.get(2).quantityInStock, 7);
  });

  it('denies payment, cancels order and keeps stock untouched', async () => {
    const { service, products } = createPaymentTestDeps(
      { orderId: 1, clientId: 10, status: ORDER_STATUS.PENDING_PAYMENT, orderDate: new Date(), total: '50.00' },
      [{ itemId: 1, orderId: 1, productId: 2, quantity: 3, pricePerUnit: '10.00', subtotal: '30.00' }],
      [{ productId: 2, quantityInStock: 10 }],
    );

    const result = await service.processPayment(1, 'deny');
    assert.equal(result.paymentStatus, 'denied');
    assert.equal(result.order.status, ORDER_STATUS.CANCELLED);
    assert.equal(products.get(2).quantityInStock, 10);
  });

  it('cancels Pending Payment without inflating stock and cancels Received restoring stock', async () => {
    const pendingCtx = createPaymentTestDeps(
      { orderId: 1, clientId: 10, status: ORDER_STATUS.PENDING_PAYMENT, orderDate: new Date(), total: '20.00' },
      [{ itemId: 1, orderId: 1, productId: 2, quantity: 4, pricePerUnit: '5.00', subtotal: '20.00' }],
      [{ productId: 2, quantityInStock: 10 }],
    );
    const pendingCancel = await pendingCtx.service.cancelOrder(1);
    assert.equal(pendingCancel.restoredItems.length, 0);
    assert.equal(pendingCtx.products.get(2).quantityInStock, 10);

    const paidCtx = createPaymentTestDeps(
      { orderId: 2, clientId: 10, status: ORDER_STATUS.RECEIVED, orderDate: new Date(), total: '20.00' },
      [{ itemId: 2, orderId: 2, productId: 2, quantity: 4, pricePerUnit: '5.00', subtotal: '20.00' }],
      [{ productId: 2, quantityInStock: 6 }],
    );
    const paidCancel = await paidCtx.service.cancelOrder(2);
    assert.deepEqual(paidCancel.restoredItems, [{ productId: 2, quantityRestored: 4 }]);
    assert.equal(paidCtx.products.get(2).quantityInStock, 10);
  });

  it('rejects payment for non-Pending Payment orders (409) and insufficient stock (409)', async () => {
    const alreadyPaid = createPaymentTestDeps(
      { orderId: 1, clientId: 10, status: ORDER_STATUS.RECEIVED, orderDate: new Date(), total: '20.00' },
      [],
      [],
    );
    await assertAsyncCustomError(() => alreadyPaid.service.processPayment(1, 'confirm'), 409, /cannot process payment/);

    const noStock = createPaymentTestDeps(
      { orderId: 2, clientId: 10, status: ORDER_STATUS.PENDING_PAYMENT, orderDate: new Date(), total: '20.00' },
      [{ itemId: 1, orderId: 2, productId: 5, quantity: 8, pricePerUnit: '5.00', subtotal: '40.00' }],
      [{ productId: 5, quantityInStock: 3 }],
    );
    await assertAsyncCustomError(() => noStock.service.processPayment(2, 'confirm'), 409, /Insufficient stock/);
    assert.equal(noStock.products.get(5).quantityInStock, 3);
  });
});
