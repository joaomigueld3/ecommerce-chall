import { CustomError } from '../../utils/errorHandler.js';

class OrderItemService {
  constructor(orderItemRepository, productService, connection = null, orderRepository = null) {
    this.orderItemRepository = orderItemRepository;
    this.productService = productService;
    this.connection = connection;
    this.orderRepository = orderRepository;
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
    if (!this.connection) {
      return this.orderItemRepository.delete(itemId);
    }

    return this.connection.transaction(async (transaction) => {
      const item = await this.orderItemRepository.findById(itemId);
      if (!item) return null;

      let shouldRestoreStock = true;
      if (this.orderRepository) {
        const order = await this.orderRepository.findById(item.orderId, { transaction });
        if (order && (order.status === 'Pending Payment' || order.status === 'Cancelled')) {
          shouldRestoreStock = false;
        }
      }

      if (shouldRestoreStock && this.productService) {
        await this.productService.updateProductQuantity(item.productId, item.quantity, { transaction });
      }

      await this.orderItemRepository.delete(itemId, { transaction });

      if (this.orderRepository) {
        const remainingItems = await this.orderItemRepository.findByOrderId(item.orderId, { transaction });
        const totalCents = remainingItems.reduce(
          (sum, current) => sum + Math.round(parseFloat(current.pricePerUnit) * 100) * current.quantity,
          0,
        );
        await this.orderRepository.update(
          item.orderId,
          { total: (totalCents / 100).toFixed(2) },
          { transaction },
        );
      }

      return item;
    });
  }

  async createOrderItem(orderId, productId, quantity, pricePerUnit) {
    return this.connection.transaction(async (transaction) => {
      const product = await this.productService.getProductByIdForUpdate(productId, transaction);
      if (!product) {
        throw new CustomError('Product not found.', 404);
      }
      if (product.quantityInStock < quantity) {
        throw new CustomError(
          `Insufficient quantity in stock for product ${productId} (requested ${quantity}, available ${product.quantityInStock}).`,
          409,
        );
      }

      const orderItem = await this.orderItemRepository.create(
        {
          orderId,
          productId,
          quantity,
          pricePerUnit,
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
