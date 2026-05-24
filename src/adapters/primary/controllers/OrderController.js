import { Op } from 'sequelize';
import { errorHandlerCustom, errorHandler } from '../../../utils/errorHandler.js';

class OrderController {
  constructor(orderService) {
    this.orderService = orderService;
  }

  async createOrder(req, res) {
    try {
      const orderData = req.body;
      const createdOrder = await this.orderService.createOrder(orderData);
      return res.status(201).json({ message: 'Order Created', createdOrder });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getAllOrders(req, res) {
    try {
      const orders = await this.orderService.getAllOrders();
      return res.status(200).json({ allOrders: orders });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getOrderById(req, res) {
    try {
      const { orderId } = req.params;
      const order = await this.orderService.getOrderById(orderId);
      if (!order) return errorHandlerCustom(res, 'Order not found.', 404);
      return res.status(200).json(order);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async updateOrder(req, res) {
    try {
      const { orderId } = req.params;
      const updatedOrderData = req.body;
      const order = await this.orderService.getOrderById(orderId);
      if (!order) return errorHandlerCustom(res, 'Order not found.', 404);

      const updatedOrder = await this.orderService.updateOrder(orderId, updatedOrderData);

      return res.status(200).json({ message: 'Order updated successfully.', updatedOrder });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async deleteOrder(req, res) {
    try {
      const { orderId } = req.params;
      const order = await this.orderService.getOrderById(orderId);
      if (!order) return errorHandlerCustom(res, 'Order not found', 404);

      const deletedOrder = order;

      await this.orderService.deleteOrder(orderId);
      return res.status(200).json({ message: 'Order deleted successfully', deletedOrder });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async checkout(req, res) {
    try {
      const rawIdempotencyKey = req.get('Idempotency-Key');
      let idempotencyKey = null;
      if (rawIdempotencyKey !== undefined) {
        idempotencyKey = rawIdempotencyKey.trim();
        if (!idempotencyKey || idempotencyKey.length > 255) {
          return errorHandlerCustom(res, 'Idempotency-Key header must be a non-empty string with at most 255 characters.', 400);
        }
      }

      const { clientId, items } = req.body;
      const result = await this.orderService.checkout({ clientId, items }, idempotencyKey);

      if (result.replayed) {
        res.set('Idempotency-Replayed', 'true');
      }
      return res.status(result.statusCode).json(result.body);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async changeOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      const result = await this.orderService.changeOrderStatus(orderId, status);

      const message = result.order.status === 'Cancelled'
        ? 'Order cancelled successfully.'
        : 'Order status updated successfully.';

      return res.status(200).json({ message, ...result });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async cancelOrder(req, res) {
    try {
      const { orderId } = req.params;
      const result = await this.orderService.cancelOrder(orderId);

      return res.status(200).json({ message: 'Order cancelled successfully.', ...result });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getOrderSummary(req, res) {
    try {
      const { orderId } = req.params;
      const summary = await this.orderService.getOrderSummary(orderId);

      return res.status(200).json(summary);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getOrdersByFilters(req, res) {
    try {
      const filters = req.body;

      const filterOptions = {};
      if (filters.clientId) {
        filterOptions.clientId = filters.clientId;
      }
      if (filters.status) {
        filterOptions.status = filters.status;
      }
      if (filters.startDate && filters.endDate) {
        filterOptions.orderDate = {
          [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)],
        };
      }

      const filteredOrders = await this.orderService.getOrdersByFilters(filterOptions);
      if (filteredOrders.length < 1) {
        return res.status(404).json({ error: 'Orders not found' });
      }

      return res.status(200).json(filteredOrders);
    } catch (error) {
      return errorHandler(error, res);
    }
  }
}

export default OrderController;
