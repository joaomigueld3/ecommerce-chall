import crypto from 'node:crypto';
import { UniqueConstraintError } from 'sequelize';
import { CustomError } from '../../utils/errorHandler.js';

const ORDER_STATUS = {
  PENDING_PAYMENT: 'Pending Payment',
  RECEIVED: 'Received',
  IN_PREPARATION: 'In Preparation',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const ALLOWED_STATUS_TRANSITIONS = {
  [ORDER_STATUS.PENDING_PAYMENT]: [ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.RECEIVED]: [ORDER_STATUS.IN_PREPARATION, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.IN_PREPARATION]: [ORDER_STATUS.DISPATCHED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.DISPATCHED]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
};

const CANCELLABLE_STATUSES = [
  ORDER_STATUS.PENDING_PAYMENT,
  ORDER_STATUS.RECEIVED,
  ORDER_STATUS.IN_PREPARATION,
];

const STOCK_ALLOCATED_STATUSES = [
  ORDER_STATUS.RECEIVED,
  ORDER_STATUS.IN_PREPARATION,
];

const IDEMPOTENCY_CONSTRAINT = 'unique_idempotency_key_per_client';

function toCents(value) {
  return Math.round(parseFloat(value) * 100);
}

function centsToDecimalString(cents) {
  return (cents / 100).toFixed(2);
}

function orderToPlain(order) {
  return {
    orderId: order.orderId,
    clientId: order.clientId,
    status: order.status,
    orderDate: order.orderDate,
    total: order.total,
  };
}

function orderItemToPlain(orderItem) {
  return {
    itemId: orderItem.itemId,
    orderId: orderItem.orderId,
    productId: orderItem.productId,
    quantity: orderItem.quantity,
    pricePerUnit: orderItem.pricePerUnit,
    subtotal: orderItem.subtotal,
  };
}

class OrderService {
  constructor(orderRepository, dependencies = {}) {
    this.orderRepository = orderRepository;
    this.orderItemRepository = dependencies.orderItemRepository ?? null;
    this.productRepository = dependencies.productRepository ?? null;
    this.clientRepository = dependencies.clientRepository ?? null;
    this.idempotencyKeyRepository = dependencies.idempotencyKeyRepository ?? null;
    this.connection = dependencies.connection ?? null;
  }

  async createOrder(orderData) {
    return this.orderRepository.create(orderData);
  }

  async getAllOrders(options = {}) {
    return this.orderRepository.findAll(options);
  }

  async getOrderById(orderId, options = {}) {
    return this.orderRepository.findById(orderId, options);
  }

  async updateOrder(orderId, updatedData) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) return null;

    if (updatedData.status && updatedData.status !== order.status) {
      OrderService.assertStatusTransition(order.status, updatedData.status);
    }

    return this.orderRepository.update(orderId, updatedData);
  }

  async deleteOrder(orderId) {
    return this.orderRepository.delete(orderId);
  }

  async getOrdersByFilters(filters) {
    return this.orderRepository.findByFilters(filters);
  }

  static assertStatusTransition(currentStatus, targetStatus) {
    const allowedTargets = ALLOWED_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowedTargets.includes(targetStatus)) {
      throw new CustomError(
        `Invalid status transition: '${currentStatus}' -> '${targetStatus}'. Allowed transitions from '${currentStatus}': ${allowedTargets.length ? allowedTargets.join(', ') : 'none'}.`,
        409,
      );
    }
  }

  static normalizeCheckoutItems(items) {
    const mergedByProductId = new Map();

    items.forEach((item) => {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);

      if (!Number.isInteger(productId) || productId <= 0) {
        throw new CustomError(`Invalid productId '${item.productId}'. It must be a positive integer.`, 400);
      }
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new CustomError(`Invalid quantity for product ${productId}. It must be an integer greater than 0.`, 400);
      }

      const accumulated = mergedByProductId.get(productId) ?? 0;
      mergedByProductId.set(productId, accumulated + quantity);
    });

    // Sorted by productId so concurrent transactions always lock product rows
    // in the same order, preventing deadlocks.
    return [...mergedByProductId.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([productId, quantity]) => ({ productId, quantity }));
  }

  static buildCheckoutRequestHash(clientId, normalizedItems) {
    const payload = JSON.stringify({ clientId: Number(clientId), items: normalizedItems });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  static buildIdempotentReplay(record, requestHash) {
    if (record.requestHash !== requestHash) {
      throw new CustomError(
        'Idempotency-Key was already used with a different checkout payload.',
        409,
      );
    }
    return {
      replayed: true,
      statusCode: record.responseStatus,
      body: record.responseBody,
    };
  }

  async checkout({ clientId, items }, idempotencyKey = null) {
    const normalizedItems = OrderService.normalizeCheckoutItems(items);
    const requestHash = OrderService.buildCheckoutRequestHash(clientId, normalizedItems);

    if (idempotencyKey) {
      const existingRecord = await this.idempotencyKeyRepository
        .findByKeyAndClient(idempotencyKey, clientId);
      if (existingRecord) {
        return OrderService.buildIdempotentReplay(existingRecord, requestHash);
      }
    }

    try {
      const responseBody = await this.connection.transaction(async (transaction) => {
        const client = await this.clientRepository.findById(clientId, { transaction });
        if (!client) {
          throw new CustomError(`Client ${clientId} not found.`, 404);
        }

        let idempotencyRecord = null;
        if (idempotencyKey) {
          idempotencyRecord = await this.idempotencyKeyRepository.create(
            { key: idempotencyKey, clientId, requestHash },
            { transaction },
          );
        }

        let totalCents = 0;
        const lineItems = [];

        for (let i = 0; i < normalizedItems.length; i += 1) {
          const item = normalizedItems[i];
          // eslint-disable-next-line no-await-in-loop
          const product = await this.productRepository.findById(item.productId, { transaction });
          if (!product) {
            throw new CustomError(`Product ${item.productId} not found.`, 404);
          }
          if (product.quantityInStock < item.quantity) {
            throw new CustomError(
              `Insufficient stock for product ${item.productId} (requested ${item.quantity}, available ${product.quantityInStock}).`,
              409,
            );
          }

          const unitCents = toCents(product.price);
          const subtotalCents = unitCents * item.quantity;
          totalCents += subtotalCents;

          lineItems.push({
            product,
            quantity: item.quantity,
            unitCents,
            subtotalCents,
          });
        }

        const order = await this.orderRepository.create(
          {
            clientId,
            status: ORDER_STATUS.PENDING_PAYMENT,
            orderDate: new Date(),
            total: centsToDecimalString(totalCents),
          },
          { transaction },
        );

        const createdItems = [];
        for (let i = 0; i < lineItems.length; i += 1) {
          const line = lineItems[i];
          // eslint-disable-next-line no-await-in-loop
          const orderItem = await this.orderItemRepository.create(
            {
              orderId: order.orderId,
              productId: line.product.productId,
              quantity: line.quantity,
              pricePerUnit: centsToDecimalString(line.unitCents),
              subtotal: centsToDecimalString(line.subtotalCents),
            },
            { transaction },
          );
          createdItems.push(orderItem);
        }

        const body = {
          message: 'Checkout created. Awaiting payment confirmation.',
          order: orderToPlain(order),
          items: createdItems.map(orderItemToPlain),
        };

        if (idempotencyRecord) {
          await this.idempotencyKeyRepository.update(
            idempotencyRecord,
            { orderId: order.orderId, responseStatus: 201, responseBody: body },
            { transaction },
          );
        }

        return body;
      });

      return { replayed: false, statusCode: 201, body: responseBody };
    } catch (error) {
      const isIdempotencyConflict = error instanceof UniqueConstraintError
        && (!error.parent?.constraint || error.parent.constraint === IDEMPOTENCY_CONSTRAINT);

      if (idempotencyKey && isIdempotencyConflict) {
        const winnerRecord = await this.idempotencyKeyRepository
          .findByKeyAndClient(idempotencyKey, clientId);
        if (winnerRecord && winnerRecord.responseBody) {
          return OrderService.buildIdempotentReplay(winnerRecord, requestHash);
        }
      }
      throw error;
    }
  }

  async processPayment(orderId, action) {
    if (action !== 'confirm' && action !== 'deny') {
      throw new CustomError(`Invalid payment action '${action}'. Expected 'confirm' or 'deny'.`, 400);
    }

    return this.connection.transaction(async (transaction) => {
      const order = await this.orderRepository.findById(orderId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!order) {
        throw new CustomError('Order not found.', 404);
      }

      if (order.status !== ORDER_STATUS.PENDING_PAYMENT) {
        throw new CustomError(
          `Order in status '${order.status}' cannot process payment. Payment is only allowed when status is '${ORDER_STATUS.PENDING_PAYMENT}'.`,
          409,
        );
      }

      if (action === 'deny') {
        const deniedOrder = await this.orderRepository.update(
          orderId,
          { status: ORDER_STATUS.CANCELLED },
          { transaction },
        );
        return {
          paymentStatus: 'denied',
          order: orderToPlain(deniedOrder),
          debitedItems: [],
        };
      }

      const orderItems = await this.orderItemRepository.findByOrderId(orderId, { transaction });
      const quantityByProductId = new Map();
      orderItems.forEach((item) => {
        const accumulated = quantityByProductId.get(item.productId) ?? 0;
        quantityByProductId.set(item.productId, accumulated + item.quantity);
      });

      const sortedProductIds = [...quantityByProductId.keys()].sort((a, b) => a - b);
      const debitedItems = [];

      for (let i = 0; i < sortedProductIds.length; i += 1) {
        const productId = sortedProductIds[i];
        const quantity = quantityByProductId.get(productId);
        // eslint-disable-next-line no-await-in-loop
        const product = await this.productRepository.findByIdForUpdate(productId, transaction);
        if (!product) {
          throw new CustomError(`Product ${productId} not found.`, 404);
        }
        if (product.quantityInStock < quantity) {
          throw new CustomError(
            `Insufficient stock for product ${productId} (requested ${quantity}, available ${product.quantityInStock}).`,
            409,
          );
        }

        // eslint-disable-next-line no-await-in-loop
        await this.productRepository.update(
          productId,
          { quantityInStock: product.quantityInStock - quantity },
          { transaction },
        );
        debitedItems.push({ productId, quantityDebited: quantity });
      }

      const confirmedOrder = await this.orderRepository.update(
        orderId,
        { status: ORDER_STATUS.RECEIVED },
        { transaction },
      );

      return {
        paymentStatus: 'confirmed',
        order: orderToPlain(confirmedOrder),
        debitedItems,
      };
    });
  }

  async changeOrderStatus(orderId, targetStatus) {
    if (targetStatus === ORDER_STATUS.CANCELLED) {
      const cancellation = await this.cancelOrder(orderId);
      return { order: cancellation.order, restoredItems: cancellation.restoredItems };
    }

    return this.connection.transaction(async (transaction) => {
      const order = await this.orderRepository.findById(orderId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!order) {
        throw new CustomError('Order not found.', 404);
      }

      OrderService.assertStatusTransition(order.status, targetStatus);

      const updatedOrder = await this.orderRepository.update(
        orderId,
        { status: targetStatus },
        { transaction },
      );

      return { order: orderToPlain(updatedOrder) };
    });
  }

  async cancelOrder(orderId) {
    return this.connection.transaction(async (transaction) => {
      const order = await this.orderRepository.findById(orderId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!order) {
        throw new CustomError('Order not found.', 404);
      }

      if (!CANCELLABLE_STATUSES.includes(order.status)) {
        throw new CustomError(
          `Order in status '${order.status}' cannot be cancelled. Cancellation is only allowed from: ${CANCELLABLE_STATUSES.join(', ')}.`,
          409,
        );
      }

      const restoredItems = [];

      if (STOCK_ALLOCATED_STATUSES.includes(order.status)) {
        const orderItems = await this.orderItemRepository.findByOrderId(orderId, { transaction });

        const quantityByProductId = new Map();
        orderItems.forEach((item) => {
          const accumulated = quantityByProductId.get(item.productId) ?? 0;
          quantityByProductId.set(item.productId, accumulated + item.quantity);
        });

        const sortedProductIds = [...quantityByProductId.keys()].sort((a, b) => a - b);

        for (let i = 0; i < sortedProductIds.length; i += 1) {
          const productId = sortedProductIds[i];
          const quantityToRestore = quantityByProductId.get(productId);
          // eslint-disable-next-line no-await-in-loop
          const product = await this.productRepository.findByIdForUpdate(productId, transaction);
          if (product) {
            // eslint-disable-next-line no-await-in-loop
            await this.productRepository.update(
              productId,
              { quantityInStock: product.quantityInStock + quantityToRestore },
              { transaction },
            );
            restoredItems.push({ productId, quantityRestored: quantityToRestore });
          }
        }
      }

      const cancelledOrder = await this.orderRepository.update(
        orderId,
        { status: ORDER_STATUS.CANCELLED },
        { transaction },
      );

      return {
        order: orderToPlain(cancelledOrder),
        restoredItems,
      };
    });
  }

  async getOrderSummary(orderId) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new CustomError('Order not found.', 404);
    }

    const orderItems = await this.orderItemRepository.findByOrderId(orderId);

    const recomputedCents = orderItems.reduce(
      (sum, item) => sum + toCents(item.pricePerUnit) * item.quantity,
      0,
    );
    const persistedCents = toCents(order.total);
    const consistent = recomputedCents === persistedCents;

    const summary = {
      order: orderToPlain(order),
      items: orderItems.map(orderItemToPlain),
      recomputedTotal: centsToDecimalString(recomputedCents),
      persistedTotal: centsToDecimalString(persistedCents),
      consistent,
    };

    if (!consistent) {
      summary.warning = 'Persisted order total does not match the total recomputed from its order items.';
    }

    return summary;
  }
}

export default OrderService;
export {
  ORDER_STATUS,
  ALLOWED_STATUS_TRANSITIONS,
  CANCELLABLE_STATUSES,
  STOCK_ALLOCATED_STATUSES,
};
