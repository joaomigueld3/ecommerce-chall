import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';
import ProductService from '../../src/entities/services/ProductService.js';

function makeRepository() {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findByFilters: vi.fn(),
  };
}

describe('ProductService.updateProductQuantity', () => {
  let repository;
  let service;

  beforeEach(() => {
    repository = makeRepository();
    service = new ProductService(repository);
  });

  it('rejects when the product does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.updateProductQuantity(1, -5))
      .rejects.toMatchObject({ message: 'Product not found.', statusCode: 404 });

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects when the change would make stock negative', async () => {
    repository.findById.mockResolvedValue({ quantityInStock: 3 });

    await expect(service.updateProductQuantity(1, -5))
      .rejects.toMatchObject({ message: 'Insufficient quantity in stock.', statusCode: 400 });

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('persists the new computed quantity', async () => {
    repository.findById.mockResolvedValue({ quantityInStock: 10 });

    await service.updateProductQuantity(1, -4, { transaction: 'tx' });

    expect(repository.update).toHaveBeenCalledWith(1, { quantityInStock: 6 }, { transaction: 'tx' });
  });
});
