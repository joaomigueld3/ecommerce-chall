import { Op } from 'sequelize';
import { errorHandlerCustom, errorHandler } from '../../../utils/errorHandler.js';
import {
  buildPaginationMeta,
  parsePaginationAndSort,
  setPaginationHeaders,
} from '../../../utils/pagination.js';

const ORDER_SORT_FIELDS = ['orderId', 'orderDate', 'total', 'status', 'clientId'];

function buildOrderFilters(filters) {
  const filterOptions = {};
  if (filters.clientId) {
    filterOptions.clientId = Number(filters.clientId);
  }
  if (filters.status) {
    filterOptions.status = filters.status;
  }
  if (filters.startDate && filters.endDate) {
    filterOptions.orderDate = {
      [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)],
    };
  } else if (filters.startDate) {
    filterOptions.orderDate = { [Op.gte]: new Date(filters.startDate) };
  } else if (filters.endDate) {
    filterOptions.orderDate = { [Op.lte]: new Date(filters.endDate) };
  }
  return filterOptions;
}

class OrderController {
  constructor(orderService, clientRepository = null) {
    this.orderService = orderService;
    this.clientRepository = clientRepository;
  }

  async resolveClientScope(req) {
    if (req.user?.type !== 'Client' || !this.clientRepository) {
      return null;
    }
    return this.clientRepository.findByUserId(req.user.id);
  }

  async assertClientOwnsOrder(req, order) {
    if (req.user?.type !== 'Client' || !this.clientRepository) {
      return true;
    }
    const ownClient = await this.clientRepository.findByUserId(req.user.id);
    if (!ownClient || Number(order.clientId) !== Number(ownClient.clientId)) {
      return false;
    }
    return true;
  }

  async createOrder(req, res) {
    try {
      const orderData = req.body;
      if (req.user?.type === 'Client' && this.clientRepository) {
        const ownClient = await this.clientRepository.findByUserId(req.user.id);
        if (!ownClient || Number(orderData.clientId) !== Number(ownClient.clientId)) {
          return errorHandlerCustom(res, 'Permission denied: cannot create order for another client.', 403);
        }
      }

      const createdOrder = await this.orderService.createOrder(orderData);
      return res.status(201).json({ message: 'Order Created', createdOrder });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getAllOrders(req, res) {
    try {
      const filterOptions = buildOrderFilters(req.query);

      if (req.user?.type === 'Client' && this.clientRepository) {
        const ownClient = await this.resolveClientScope(req);
        if (!ownClient) {
          return res.status(200).json({ allOrders: [] });
        }
        filterOptions.clientId = ownClient.clientId;
      }

      const {
        isPaginated,
        page,
        limit,
        offset,
        order,
      } = parsePaginationAndSort(req.query, {
        allowedSortFields: ORDER_SORT_FIELDS,
        defaultSortField: 'orderId',
        defaultSortOrder: 'DESC',
        tieBreakerField: 'orderId',
      });

      if (isPaginated) {
        const { rows, count } = await this.orderService.getOrdersPaginated(filterOptions, {
          order,
          limit,
          offset,
        });
        const pagination = buildPaginationMeta(count, page, limit);
        setPaginationHeaders(res, pagination);
        return res.status(200).json({ allOrders: rows, pagination });
      }

      const orders = Object.keys(filterOptions).length > 0
        ? await this.orderService.getOrdersByFilters(filterOptions, { order })
        : await this.orderService.getAllOrders({ order });

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

      if (!(await this.assertClientOwnsOrder(req, order))) {
        return errorHandlerCustom(res, 'Permission denied.', 403);
      }

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

      if (req.user?.type === 'Client' && this.clientRepository) {
        const ownClient = await this.clientRepository.findByUserId(req.user.id);
        if (!ownClient || Number(clientId) !== Number(ownClient.clientId)) {
          return errorHandlerCustom(res, 'Permission denied: cannot checkout for another client.', 403);
        }
      }

      const result = await this.orderService.checkout({ clientId, items }, idempotencyKey);

      if (result.replayed) {
        res.set('Idempotency-Replayed', 'true');
      }
      return res.status(result.statusCode).json(result.body);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async processPayment(req, res) {
    try {
      const { orderId } = req.params;
      const { action } = req.body;

      const existingOrder = await this.orderService.getOrderById(orderId);
      if (!existingOrder) return errorHandlerCustom(res, 'Order not found.', 404);

      if (!(await this.assertClientOwnsOrder(req, existingOrder))) {
        return errorHandlerCustom(res, 'Permission denied.', 403);
      }

      const result = await this.orderService.processPayment(orderId, action);
      const message = result.paymentStatus === 'confirmed'
        ? 'Payment confirmed and stock debited.'
        : 'Payment denied and order cancelled.';

      return res.status(200).json({ message, ...result });
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
      const existingOrder = await this.orderService.getOrderById(orderId);
      if (!existingOrder) return errorHandlerCustom(res, 'Order not found.', 404);

      if (!(await this.assertClientOwnsOrder(req, existingOrder))) {
        return errorHandlerCustom(res, 'Permission denied.', 403);
      }

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

      if (!(await this.assertClientOwnsOrder(req, summary.order))) {
        return errorHandlerCustom(res, 'Permission denied.', 403);
      }

      return res.status(200).json(summary);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getOrdersByFilters(req, res) {
    try {
      const filterOptions = buildOrderFilters(req.body);

      if (req.user?.type === 'Client' && this.clientRepository) {
        const ownClient = await this.resolveClientScope(req);
        if (!ownClient) {
          return res.status(404).json({ error: 'Orders not found' });
        }
        filterOptions.clientId = ownClient.clientId;
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
