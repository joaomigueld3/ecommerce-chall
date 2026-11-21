import {
  fn, col, Op, where as seqWhere,
} from 'sequelize';

class ProductRepository {
  constructor(model) {
    this.model = model;
  }

  async findAll(options = {}) {
    return this.model.findAll(options);
  }

  async findById(productId, options = {}) {
    return this.model.findByPk(productId, options);
  }

  async findDetailedById(productId, models = {}) {
    const include = [];
    if (models.Brand) {
      include.push({ model: models.Brand, as: 'brand', required: false });
    }
    if (models.Category) {
      include.push({ model: models.Category, as: 'categoryInfo', required: false });
    }
    if (models.ProductImage) {
      include.push({ model: models.ProductImage, as: 'images', required: false });
    }
    if (models.ProductVariant) {
      include.push({
        model: models.ProductVariant,
        as: 'variants',
        where: { active: true },
        required: false,
      });
    }

    const order = [];
    if (models.ProductImage) {
      order.push([{ model: models.ProductImage, as: 'images' }, 'isPrimary', 'DESC']);
      order.push([{ model: models.ProductImage, as: 'images' }, 'sortOrder', 'ASC']);
    }
    if (models.ProductVariant) {
      order.push([{ model: models.ProductVariant, as: 'variants' }, 'variantId', 'ASC']);
    }

    return this.model.findByPk(productId, {
      include,
      ...(order.length ? { order } : {}),
    });
  }

  async findByIdForUpdate(productId, transaction) {
    return this.model.findByPk(productId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }

  async create(productData) {
    return this.model.create(productData);
  }

  async update(productId, productData, options = {}) {
    const product = await this.findById(productId, options);
    if (product) {
      return product.update(productData, options);
    }
    return null;
  }

  async delete(productId) {
    const product = await this.findById(productId);
    if (product) {
      await product.destroy();
    }
  }

  async findByFilters(filters, options = {}) {
    try {
      const products = await this.model.findAll({
        where: filters,
        ...options,
      });
      return products;
    } catch (e) {
      throw new Error(e);
    }
  }

  async findAndCountByFilters(filters = {}, options = {}) {
    try {
      return await this.model.findAndCountAll({
        where: filters,
        ...options,
      });
    } catch (e) {
      throw new Error(e);
    }
  }

  async findRelated(product, limit = 4) {
    return this.model.findAll({
      where: {
        active: true,
        productId: { [Op.ne]: product.productId },
        category: product.category,
      },
      order: [['salesCount', 'DESC'], ['ratingAvg', 'DESC'], ['productId', 'DESC']],
      limit,
    });
  }

  async findLowStock(includeInactive = false) {
    const where = {
      [Op.and]: [
        seqWhere(col('quantity_in_stock'), '<=', col('min_stock_level')),
      ],
    };
    if (!includeInactive) where.active = true;

    return this.model.findAll({
      where,
      order: [['quantityInStock', 'ASC'], ['productId', 'ASC']],
    });
  }

  async getCategories() {
    const rows = await this.model.findAll({
      where: { active: true },
      attributes: [
        'category',
        [fn('COUNT', col('product_id')), 'productCount'],
      ],
      group: ['category'],
      order: [['category', 'ASC']],
      raw: true,
    });

    return rows.map((row) => ({
      category: row.category || 'General',
      productCount: Number(row.productCount) || 0,
    }));
  }
}

export default ProductRepository;
