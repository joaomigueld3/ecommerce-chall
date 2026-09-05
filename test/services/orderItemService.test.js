import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';
import OrderItemService from '../../src/entities/services/OrderItemService.js';

function makeSequelize() {
  return {
    transaction: vi.fn((callback) => callback({ id: 'fake-transaction' })),
  };
}

describe('OrderItemService.createOrderItem', () => {
  let orderItemRepository;
  let productService;
  let sequelize;
  let service;

  beforeEach(() => {
    orderItemRepository = { create: vi.fn() };
    productService = {
      getProductById: vi.fn(),
      updateProductQuantity: vi.fn(),
    };
    sequelize = makeSequelize();
    service = new OrderItemService(orderItemRepository, productService, sequelize);
  });

  it('runs the whole operation inside a single transaction', async () => {
    productService.getProductById.mockResolvedValue({ quantityInStock: 10 });
    orderItemRepository.create.mockResolvedValue({ id: 1 });

    await service.createOrderItem(1, 2, 3, 9.9);

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    const [, options] = productService.getProductById.mock.calls[0];
    expect(options.transaction).toEqual({ id: 'fake-transaction' });
    expect(orderItemRepository.create.mock.calls[0][1]).toEqual({ transaction: { id: 'fake-transaction' } });
    expect(productService.updateProductQuantity.mock.calls[0][2]).toEqual({ transaction: { id: 'fake-transaction' } });
  });

  it('rejects when the product does not exist and never creates the item', async () => {
    productService.getProductById.mockResolvedValue(null);

    await expect(service.createOrderItem(1, 2, 3, 9.9))
      .rejects.toMatchObject({ message: 'Product not found.', statusCode: 404 });

    expect(orderItemRepository.create).not.toHaveBeenCalled();
    expect(productService.updateProductQuantity).not.toHaveBeenCalled();
  });

  it('rejects when stock is insufficient and never creates the item', async () => {
    productService.getProductById.mockResolvedValue({ quantityInStock: 1 });

    await expect(service.createOrderItem(1, 2, 5, 9.9))
      .rejects.toMatchObject({ message: 'Insufficient quantity in stock.', statusCode: 400 });

    expect(orderItemRepository.create).not.toHaveBeenCalled();
    expect(productService.updateProductQuantity).not.toHaveBeenCalled();
  });

  it('decrements stock by the ordered quantity after creating the item', async () => {
    productService.getProductById.mockResolvedValue({ quantityInStock: 10 });
    orderItemRepository.create.mockResolvedValue({ id: 1 });

    await service.createOrderItem(1, 2, 4, 9.9);

    expect(productService.updateProductQuantity).toHaveBeenCalledWith(2, -4, { transaction: { id: 'fake-transaction' } });
  });
});
