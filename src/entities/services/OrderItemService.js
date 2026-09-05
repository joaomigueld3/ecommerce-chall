import { Transaction } from 'sequelize';
import { CustomError } from '../../utils/errorHandler.js';

class OrderItemService {
  constructor(orderItemRepository, productService, sequelize) {
    this.orderItemRepository = orderItemRepository;
    this.productService = productService;
    this.sequelize = sequelize;
  }

  async getAllOrderItems() {
    return this.orderItemRepository.findAll();
  }

  async getOrderItemById(itemId) {
    return this.orderItemRepository.findById(itemId);
  }

  async createOrderItemAux(orderItemData) {
    return this.orderItemRepository.create(orderItemData);
  }

  async updateOrderItem(itemId, orderItemData) {
    return this.orderItemRepository.update(itemId, orderItemData);
  }

  async deleteOrderItem(itemId) {
    return this.orderItemRepository.delete(itemId);
  }

  async createOrderItem(orderId, productId, quantity, pricePerUnit) {
    return this.sequelize.transaction(async (transaction) => {
      const product = await this.productService.getProductById(productId, {
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      if (!product) {
        throw new CustomError('Product not found.', 404);
      }
      if (product.quantityInStock < quantity) {
        throw new CustomError('Insufficient quantity in stock.', 400);
      }

      const orderItem = await this.orderItemRepository.create(
        {
          orderId, productId, quantity, pricePerUnit,
        },
        { transaction },
      );

      await this.productService.updateProductQuantity(productId, -quantity, { transaction });

      return orderItem;
    });
  }

  async getOrderItemsByFilters(filters) {
    return this.orderItemRepository.findByFilters(filters);
  }
}

export default OrderItemService;
