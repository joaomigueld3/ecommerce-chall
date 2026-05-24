import { CustomError } from '../../utils/errorHandler.js';

class OrderItemService {
  constructor(orderItemRepository, productService) {
    this.orderItemRepository = orderItemRepository;
    this.productService = productService;
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
    const { sequelize } = this.orderItemRepository.model;
    return sequelize.transaction(async (transaction) => {
      const product = await this.productService.getProductById(productId);
      if (!product) {
        throw new CustomError('Product not found or Insufficient quantity in stock.', 404);
      }

      const decremented = await this.productService.updateProductQuantity(productId, -quantity, transaction);
      if (!decremented) {
        throw new CustomError('Product not found or Insufficient quantity in stock.', 409);
      }

      return this.orderItemRepository.create({
        orderId,
        productId,
        quantity,
        pricePerUnit,
      }, { transaction });
    });
  }

  async getOrderItemsByFilters(filters) {
    return this.orderItemRepository.findByFilters(filters);
  }
}

export default OrderItemService;
