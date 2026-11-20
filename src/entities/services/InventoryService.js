import { Op, col, where as seqWhere } from 'sequelize';
import { CustomError } from '../../utils/errorHandler.js';

class InventoryService {
  constructor(models, stockMovementRepository, connection) {
    this.Product = models.Product;
    this.ProductVariant = models.ProductVariant;
    this.StockMovement = models.StockMovement;
    this.User = models.User;
    this.stockMovementRepository = stockMovementRepository;
    this.connection = connection;
  }

  static computeDelta(type, rawQuantity) {
    const qty = Number(rawQuantity);
    if (!Number.isInteger(qty) || qty === 0) {
      throw new CustomError('Quantity must be a non-zero integer.', 400);
    }
    if (type === 'INBOUND' || type === 'RETURN_RESTOCK') {
      return Math.abs(qty);
    }
    if (type === 'DAMAGE_LOSS') {
      return -Math.abs(qty);
    }
    // MANUAL_ADJUSTMENT accepts positive or negative signed delta
    return qty;
  }

  async recordMovement({
    productId,
    variantId = null,
    type,
    quantity,
    reason,
    userId = null,
  }) {
    const delta = InventoryService.computeDelta(type, quantity);

    return this.connection.transaction(async (transaction) => {
      const product = await this.Product.findByPk(productId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!product) {
        throw new CustomError(`Product ${productId} not found.`, 404);
      }

      if (variantId) {
        const variant = await this.ProductVariant.findOne({
          where: { variantId, productId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!variant) {
          throw new CustomError(`Variant ${variantId} not found for product ${productId}.`, 404);
        }

        const prevVarStock = Number(variant.quantityInStock);
        const nextVarStock = prevVarStock + delta;
        if (nextVarStock < 0) {
          throw new CustomError(
            `Stock adjustment would result in negative variant stock (${prevVarStock} + ${delta}).`,
            409,
          );
        }
        await variant.update({ quantityInStock: nextVarStock }, { transaction });
      }

      const previousStock = Number(product.quantityInStock);
      const newStock = previousStock + delta;
      if (newStock < 0) {
        throw new CustomError(
          `Stock adjustment would result in negative product stock (${previousStock} + ${delta}).`,
          409,
        );
      }

      await product.update({ quantityInStock: newStock }, { transaction });

      const movement = await this.stockMovementRepository.create(
        {
          productId: product.productId,
          variantId: variantId || null,
          type,
          quantity: delta,
          previousStock,
          newStock,
          reason,
          createdByUserId: userId,
        },
        { transaction },
      );

      return {
        movement: movement.toDict ? movement.toDict() : movement,
        product: product.toDict ? product.toDict() : product,
      };
    });
  }

  async getMovements(filters = {}, queryOptions = {}) {
    const where = {};
    if (filters.productId) where.productId = Number(filters.productId);
    if (filters.type) where.type = filters.type;
    if (filters.startDate && filters.endDate) {
      where.createdAt = { [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)] };
    } else if (filters.startDate) {
      where.createdAt = { [Op.gte]: new Date(filters.startDate) };
    } else if (filters.endDate) {
      where.createdAt = { [Op.lte]: new Date(filters.endDate) };
    }

    const include = [
      {
        model: this.Product,
        attributes: ['productId', 'productName', 'sku', 'category'],
        required: false,
      },
      {
        model: this.User,
        attributes: ['id', 'name', 'email'],
        required: false,
      },
    ];

    if (queryOptions.paginated) {
      return this.stockMovementRepository.findAndCount(where, {
        include,
        order: queryOptions.order || [['movementId', 'DESC']],
        limit: queryOptions.limit,
        offset: queryOptions.offset,
      });
    }

    const rows = await this.stockMovementRepository.findAll(where, {
      include,
      order: queryOptions.order || [['movementId', 'DESC']],
      limit: 100,
    });
    return { rows, count: rows.length };
  }

  async getLowStockProducts({ includeInactive = false } = {}) {
    const where = {
      [Op.and]: [
        seqWhere(col('quantity_in_stock'), '<=', col('min_stock_level')),
      ],
    };
    if (!includeInactive) {
      where.active = true;
    }

    return this.Product.findAll({
      where,
      order: [['quantityInStock', 'ASC'], ['productId', 'ASC']],
    });
  }

  async getInventorySummary() {
    const allProducts = await this.Product.findAll({
      where: { active: true },
      attributes: ['productId', 'quantityInStock', 'minStockLevel', 'price', 'costPrice'],
    });

    let totalUnits = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;
    let retailValue = 0;
    let costValue = 0;

    allProducts.forEach((p) => {
      const qty = Number(p.quantityInStock) || 0;
      const min = Number(p.minStockLevel ?? 5);
      const price = Number(p.price) || 0;
      const cost = Number(p.costPrice ?? (price * 0.65));

      totalUnits += qty;
      retailValue += qty * price;
      costValue += qty * cost;

      if (qty === 0) outOfStockCount += 1;
      else if (qty <= min) lowStockCount += 1;
    });

    return {
      activeSkuCount: allProducts.length,
      totalUnits,
      outOfStockCount,
      lowStockCount,
      retailValue: retailValue.toFixed(2),
      costValue: costValue.toFixed(2),
    };
  }
}

export default InventoryService;
