import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import OrderService from '../src/entities/services/OrderService.js';
import { OrderStatus } from '../src/entities/orderStatus.js';

// In-memory stand-ins for the repository layer so the business rules can be
// exercised without Postgres.
function buildFixture({ products = [], persistedOrder = null, persistedItems = [] } = {}) {
  const state = {
    createdOrders: [],
    createdItems: [],
    decrements: [],
  };

  const fakeTransaction = { LOCK: { UPDATE: 'UPDATE' } };

  const orderRepository = {
    async findById() { return persistedOrder; },
    async findByIdForUpdate() { return persistedOrder; },
    async create(data) {
      const order = { orderId: 101, ...data };
      state.createdOrders.push(order);
      return order;
    },
    async update() { return persistedOrder; },
  };

  const orderItemRepository = {
    async create(data) {
      const item = {
        itemId: state.createdItems.length + 1,
        ...data,
        subtotal: data.quantity * data.pricePerUnit,
      };
      state.createdItems.push(item);
      return item;
    },
    async findByOrderId() { return persistedItems; },
  };

  const productRepository = {
    async findAllByIdsForUpdate(ids) {
      return products.filter((p) => ids.includes(p.productId));
    },
    async decrementStockGuarded(productId, quantity) {
      state.decrements.push({ productId, quantity });
      const product = products.find((p) => p.productId === productId);
      return Boolean(product) && product.quantityInStock >= quantity;
    },
    async incrementStock() {},
  };

  const clientRepository = {
    async findById(clientId) { return { clientId }; },
  };

  const idempotencyKeyRepository = {
    async findByKeyAndClient() { return null; },
    async create() {},
  };

  const sequelize = {
    async transaction(callback) { return callback(fakeTransaction); },
  };

  const service = new OrderService(orderRepository, {
    orderItemRepository,
    productRepository,
    clientRepository,
    idempotencyKeyRepository,
    sequelize,
  });

  return { service, state };
}

describe('OrderService.checkout', () => {
  it('merges duplicate productIds and prices the order from the database', async () => {
    const { service, state } = buildFixture({
      products: [
        { productId: 1, price: '10.00', quantityInStock: 100 },
        { productId: 2, price: '19.99', quantityInStock: 50 },
      ],
    });

    const result = await service.checkout({
      clientId: 7,
      items: [
        { productId: 2, quantity: 1 },
        { productId: 1, quantity: 1 },
        { productId: 1, quantity: 2 },
      ],
    });

    assert.equal(result.replayed, false);
    assert.equal(result.response.items.length, 2, 'duplicates must collapse into one line');
    assert.equal(result.response.order.total, '49.99'); // 3 * 10.00 + 1 * 19.99
    assert.deepEqual(
      state.decrements,
      [{ productId: 1, quantity: 3 }, { productId: 2, quantity: 1 }],
      'stock must be decremented once per product with the merged quantity',
    );
    assert.equal(result.response.order.status, OrderStatus.Received);
  });

  it('rejects insufficient stock with 409 and creates nothing', async () => {
    const { service, state } = buildFixture({
      products: [{ productId: 1, price: '5.00', quantityInStock: 2 }],
    });

    await assert.rejects(
      service.checkout({ clientId: 7, items: [{ productId: 1, quantity: 3 }] }),
      (err) => err.statusCode === 409 && /Insufficient stock/.test(err.message),
    );
    assert.equal(state.createdOrders.length, 0);
    assert.equal(state.createdItems.length, 0);
  });

  it('rejects unknown products with 404', async () => {
    const { service } = buildFixture({ products: [] });

    await assert.rejects(
      service.checkout({ clientId: 7, items: [{ productId: 99, quantity: 1 }] }),
      (err) => err.statusCode === 404 && /99/.test(err.message),
    );
  });
});

describe('OrderService.updateOrder status guard', () => {
  it('rejects an invalid transition with 409', async () => {
    const { service } = buildFixture({
      persistedOrder: { orderId: 1, status: OrderStatus.Received },
    });

    await assert.rejects(
      service.updateOrder(1, { status: OrderStatus.Delivered }),
      (err) => err.statusCode === 409 && /Invalid status transition/.test(err.message),
    );
  });

  it('allows a valid transition', async () => {
    const { service } = buildFixture({
      persistedOrder: { orderId: 1, status: OrderStatus.Received },
    });
    await assert.doesNotReject(service.updateOrder(1, { status: OrderStatus.InPreparation }));
  });
});

describe('OrderService.getOrderSummary', () => {
  it('flags a mismatch between the persisted total and the items', async () => {
    const { service } = buildFixture({
      persistedOrder: {
        orderId: 1, clientId: 7, status: OrderStatus.Received, orderDate: '2026-01-01', total: '99.99',
      },
      persistedItems: [
        { productId: 1, quantity: 2, pricePerUnit: '10.00', subtotal: '20.00' },
      ],
    });

    const summary = await service.getOrderSummary(1);
    assert.equal(summary.recomputedTotal, '20.00');
    assert.equal(summary.persistedTotal, '99.99');
    assert.equal(summary.consistent, false);
    assert.match(summary.warning, /does not match/);
  });

  it('reports consistency when totals agree', async () => {
    const { service } = buildFixture({
      persistedOrder: {
        orderId: 1, clientId: 7, status: OrderStatus.Received, orderDate: '2026-01-01', total: '20.00',
      },
      persistedItems: [
        { productId: 1, quantity: 2, pricePerUnit: '10.00', subtotal: '20.00' },
      ],
    });

    const summary = await service.getOrderSummary(1);
    assert.equal(summary.consistent, true);
    assert.equal(summary.warning, undefined);
  });
});
