import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import EngagementService from '../src/entities/services/EngagementService.js';
import InventoryService from '../src/entities/services/InventoryService.js';
import ProductService from '../src/entities/services/ProductService.js';

describe('Phase 2 services (Engagement, Inventory Kardex & Soft-Archive)', () => {
  it('computes accurate rating histogram and average from reviews', () => {
    const result = EngagementService.buildHistogram([
      { rating: 5 },
      { rating: 5 },
      { rating: 4 },
      { rating: 2 },
    ]);

    assert.equal(result.total, 4);
    assert.equal(result.average, 4);
    assert.deepEqual(result.histogram, { 5: 2, 4: 1, 3: 0, 2: 1, 1: 0 });

    const empty = EngagementService.buildHistogram([]);
    assert.equal(empty.total, 0);
    assert.equal(empty.average, 0);
  });

  it('normalizes stock deltas by movement type and rejects zero quantities', () => {
    assert.equal(InventoryService.computeDelta('INBOUND', -10), 10);
    assert.equal(InventoryService.computeDelta('RETURN_RESTOCK', 3), 3);
    assert.equal(InventoryService.computeDelta('DAMAGE_LOSS', 4), -4);
    assert.equal(InventoryService.computeDelta('MANUAL_ADJUSTMENT', -2), -2);
    assert.equal(InventoryService.computeDelta('MANUAL_ADJUSTMENT', 5), 5);

    assert.throws(
      () => InventoryService.computeDelta('INBOUND', 0),
      (err) => err.statusCode === 400,
    );
  });

  it('records stock movement transactionally and rejects negative resulting stock with 409', async () => {
    const fakeProduct = {
      productId: 10,
      quantityInStock: 5,
      update: async function update(patch) {
        this.quantityInStock = patch.quantityInStock;
        return this;
      },
      toDict() {
        return { productId: this.productId, quantityInStock: this.quantityInStock };
      },
    };

    const recorded = [];
    const fakeConnection = {
      transaction: async (cb) => cb({ LOCK: { UPDATE: 'UPDATE' } }),
    };

    const inventoryService = new InventoryService(
      { Product: { findByPk: async () => fakeProduct }, ProductVariant: null },
      {
        create: async (row) => {
          const item = { movementId: recorded.length + 1, ...row };
          recorded.push(item);
          return item;
        },
      },
      fakeConnection,
    );

    const inbound = await inventoryService.recordMovement({
      productId: 10,
      type: 'INBOUND',
      quantity: 8,
      reason: 'Supplier restock',
      userId: 1,
    });
    assert.equal(inbound.product.quantityInStock, 13);
    assert.equal(recorded[0].previousStock, 5);
    assert.equal(recorded[0].newStock, 13);

    await assert.rejects(
      () => inventoryService.recordMovement({
        productId: 10,
        type: 'DAMAGE_LOSS',
        quantity: 20,
        reason: 'Broken units',
        userId: 1,
      }),
      (err) => err.statusCode === 409 && /negative product stock/i.test(err.message),
    );
  });

  it('soft-archives a product on delete when it has order or stock movement history', async () => {
    const updates = [];
    const hardDeletes = [];
    const fakeRepo = {
      findById: async (id) => ({ productId: id, active: true }),
      update: async (id, patch) => {
        updates.push({ id, patch });
        return { productId: id, ...patch };
      },
      delete: async (id) => {
        hardDeletes.push(id);
      },
    };

    const serviceWithHistory = new ProductService(fakeRepo, {
      models: {
        OrderItem: { count: async () => 2 },
        StockMovement: { count: async () => 0 },
      },
    });
    const archivedResult = await serviceWithHistory.deleteProduct(99);
    assert.equal(archivedResult.archived, true);
    assert.equal(updates[0].patch.active, false);
    assert.equal(hardDeletes.length, 0);

    const serviceWithoutHistory = new ProductService(fakeRepo, {
      models: {
        OrderItem: { count: async () => 0 },
        StockMovement: { count: async () => 0 },
      },
    });
    const deletedResult = await serviceWithoutHistory.deleteProduct(100);
    assert.equal(deletedResult.archived, false);
    assert.deepEqual(hardDeletes, [100]);
  });
});
