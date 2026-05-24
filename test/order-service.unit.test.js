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

describe('OrderService.assertStatusTransition (state machine)', () => {
  it('allows every documented transition', () => {
    const allowed = [
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

  it('rejects skipping steps and backwards transitions with 409', () => {
    const invalid = [
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
