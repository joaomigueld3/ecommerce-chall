import { Op } from 'sequelize';
import { errorHandler, errorHandlerCustom } from '../../../utils/errorHandler.js';

function buildOrderItemFilters(filters) {
  const filterOptions = {};
  if (filters.orderId) {
    filterOptions.orderId = Number(filters.orderId);
  }
  if (filters.productId) {
    filterOptions.productId = Number(filters.productId);
  }
  if (filters.quantity) {
    filterOptions.quantity = Number(filters.quantity);
  }
  if (filters.minPricePerUnit) {
    filterOptions.pricePerUnit = { [Op.gte]: parseFloat(filters.minPricePerUnit) };
  }
  if (filters.maxPricePerUnit) {
    filterOptions.pricePerUnit = { ...filterOptions.pricePerUnit, [Op.lte]: parseFloat(filters.maxPricePerUnit) };
  }
  if (filters.minSubtotal) {
    filterOptions.subtotal = { [Op.gte]: parseFloat(filters.minSubtotal) };
  }
  if (filters.maxSubtotal) {
    filterOptions.subtotal = { ...filterOptions.subtotal, [Op.lte]: parseFloat(filters.maxSubtotal) };
  }
  return filterOptions;
}

class OrderItemController {
  constructor(orderItemService) {
    this.orderItemService = orderItemService;
  }

  async getAllOrderItems(req, res) {
    try {
      const filterOptions = buildOrderItemFilters(req.query);
      const orderItems = Object.keys(filterOptions).length > 0
        ? await this.orderItemService.getOrderItemsByFilters(filterOptions)
        : await this.orderItemService.getAllOrderItems();
      return res.status(200).json(orderItems);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getOrderItemById(req, res) {
    try {
      const { itemId } = req.params;
      const orderItem = await this.orderItemService.getOrderItemById(itemId);
      if (!orderItem) return errorHandlerCustom(res, 'OrderItem not found', 404);
      return res.status(200).json(orderItem);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async createOrderItem(req, res) {
    try {
      const {
        orderId, productId, quantity, pricePerUnit,
      } = req.body;

      const orderItem = await this.orderItemService.createOrderItem(
        orderId,
        productId,
        quantity,
        pricePerUnit,
      );
      return res.status(201).json({ message: 'OrderItem created', orderItem });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async updateOrderItem(req, res) {
    try {
      const { itemId } = req.params;
      const orderItemData = req.body;
      const orderItem = await this.orderItemService.getOrderItemById(itemId);
      if (!orderItem) return errorHandlerCustom(res, 'OrderItem not found', 404);

      const updatedOrderItem = await this.orderItemService.updateOrderItem(itemId, orderItemData);
      return res.status(200).json({ message: 'OrderItem updated successfully', updatedOrderItem });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async deleteOrderItem(req, res) {
    try {
      const { itemId } = req.params;
      const orderItem = await this.orderItemService.getOrderItemById(itemId);
      if (!orderItem) return errorHandlerCustom(res, 'OrderItem not found', 404);

      const deletedOrderItem = orderItem;
      await this.orderItemService.deleteOrderItem(itemId);
      return res.status(200).json({ message: 'OrderItem deleted successfully', deletedOrderItem });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getOrderItemsByFilters(req, res) {
    try {
      const filterOptions = buildOrderItemFilters(req.body);
      const filteredOrderItems = await this.orderItemService.getOrderItemsByFilters(filterOptions);
      if (filteredOrderItems.length < 1) {
        return res.status(404).json({ error: 'Order items not found' });
      }

      return res.status(200).json(filteredOrderItems);
    } catch (error) {
      return errorHandler(error, res);
    }
  }
}

export default OrderItemController;
