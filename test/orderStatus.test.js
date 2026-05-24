import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  OrderStatus,
  ALLOWED_TRANSITIONS,
  CANCELLABLE_STATUSES,
  isTransitionAllowed,
} from '../src/entities/orderStatus.js';

describe('order status state machine', () => {
  it('allows exactly the documented forward transitions', () => {
    assert.equal(isTransitionAllowed(OrderStatus.Received, OrderStatus.InPreparation), true);
    assert.equal(isTransitionAllowed(OrderStatus.InPreparation, OrderStatus.Dispatched), true);
    assert.equal(isTransitionAllowed(OrderStatus.Dispatched, OrderStatus.Delivered), true);
  });

  it('allows cancellation only from Received and In Preparation', () => {
    assert.equal(isTransitionAllowed(OrderStatus.Received, OrderStatus.Cancelled), true);
    assert.equal(isTransitionAllowed(OrderStatus.InPreparation, OrderStatus.Cancelled), true);
    assert.equal(isTransitionAllowed(OrderStatus.Dispatched, OrderStatus.Cancelled), false);
    assert.equal(isTransitionAllowed(OrderStatus.Delivered, OrderStatus.Cancelled), false);
    assert.deepEqual(CANCELLABLE_STATUSES, [OrderStatus.Received, OrderStatus.InPreparation]);
  });

  it('rejects skipping steps and moving backwards', () => {
    assert.equal(isTransitionAllowed(OrderStatus.Received, OrderStatus.Dispatched), false);
    assert.equal(isTransitionAllowed(OrderStatus.Received, OrderStatus.Delivered), false);
    assert.equal(isTransitionAllowed(OrderStatus.Dispatched, OrderStatus.Received), false);
    assert.equal(isTransitionAllowed(OrderStatus.Delivered, OrderStatus.InPreparation), false);
  });

  it('treats Delivered and Cancelled as terminal', () => {
    assert.deepEqual(ALLOWED_TRANSITIONS[OrderStatus.Delivered], []);
    assert.deepEqual(ALLOWED_TRANSITIONS[OrderStatus.Cancelled], []);
    Object.values(OrderStatus).forEach((target) => {
      assert.equal(isTransitionAllowed(OrderStatus.Delivered, target), false);
      assert.equal(isTransitionAllowed(OrderStatus.Cancelled, target), false);
    });
  });

  it('returns false for unknown statuses instead of throwing', () => {
    assert.equal(isTransitionAllowed('Bogus', OrderStatus.Delivered), false);
    assert.equal(isTransitionAllowed(OrderStatus.Received, 'Bogus'), false);
  });
});
