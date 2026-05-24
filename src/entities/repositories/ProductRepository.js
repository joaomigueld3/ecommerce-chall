import { Op } from 'sequelize';

class ProductRepository {
  constructor(model) {
    this.model = model;
  }

  async findAll() {
    return this.model.findAll();
  }

  async findById(productId, options = {}) {
    return this.model.findByPk(productId, options);
  }

  async findAllByIdsForUpdate(productIds, transaction) {
    return this.model.findAll({
      where: { productId: { [Op.in]: productIds } },
      order: [['productId', 'ASC']],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
  }

  async decrementStockGuarded(productId, quantity, transaction) {
    const [, affectedCount] = await this.model.decrement('quantityInStock', {
      by: quantity,
      where: {
        productId,
        quantityInStock: { [Op.gte]: quantity },
      },
      returning: true,
      transaction,
    });
    return affectedCount === 1;
  }

  async incrementStock(productId, quantity, transaction) {
    return this.model.increment('quantityInStock', {
      by: quantity,
      where: { productId },
      transaction,
    });
  }

  async create(productData) {
    return this.model.create(productData);
  }

  async update(productId, productData) {
    const product = await this.findById(productId);
    if (product) {
      return product.update(productData);
    }
    return null;
  }

  async delete(productId) {
    const product = await this.findById(productId);
    if (product) {
      await product.destroy();
    }
  }

  async findByFilters(filters) {
    try {
      const products = await this.model.findAll({
        where: filters,
      });
      return products;
    } catch (e) {
      throw new Error(e);
    }
  }
}

export default ProductRepository;
