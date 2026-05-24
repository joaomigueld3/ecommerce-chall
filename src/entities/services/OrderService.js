import crypto from 'crypto';
import { UniqueConstraintError } from 'sequelize';
import { CustomError } from '../../utils/errorHandler.js';
import { OrderStatus, CANCELLABLE_STATUSES, isTransitionAllowed } from '../orderStatus.js';

function toCents(value) {
  return Math.round(Number(value) * 100);
}

function fromCents(cents) {
  return (cents / 100).toFixed(2);
}

// Duplicated productIds in a checkout payload are MERGED into a single line item
// (quantities summed). Normalization is order-independent so the request hash used
// for idempotency is stable across re-orderings of the same payload.
function normalizeItems(items) {
  const merged = new Map();
  items.forEach(({ productId, quantity }) => {
    merged.set(productId, (merged.get(productId) || 0) + quantity);
  });
  return [...merged.entries()]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((a, b) => a.productId - b.productId);
}

function hashCheckoutRequest(clientId, normalizedItems) {
  const canonical = JSON.stringify({ clientId, items: normalizedItems });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

class OrderService {
  constructor(orderRepository, deps = {}) {
    this.orderRepository = orderRepository;
    this.orderItemRepository = deps.orderItemRepository;
    this.productRepository = deps.productRepository;
    this.clientRepository = deps.clientRepository;
    this.idempotencyKeyRepository = deps.idempotencyKeyRepository;
    this.sequelize = deps.sequelize;
  }

  async createOrder(orderData) {
    return this.orderRepository.create(orderData);
  }

  async getAllOrders() {
    return this.orderRepository.findAll();
  }

  async getOrderById(orderId) {
    return this.orderRepository.findById(orderId);
  }

  async updateOrder(orderId, updatedData) {
    if (updatedData.status) {
      const order = await this.orderRepository.findById(orderId);
      if (order && updatedData.status !== order.status && !isTransitionAllowed(order.status, updatedData.status)) {
        throw new CustomError(`Invalid status transition: '${order.status}' -> '${updatedData.status}'.`, 409);
      }
    }
    return this.orderRepository.update(orderId, updatedData);
  }

  async deleteOrder(orderId) {
    return this.orderRepository.delete(orderId);
  }

  async getOrdersByFilters(filters) {
    return this.orderRepository.findByFilters(filters);
  }

  async checkout({ clientId, items }, idempotencyKey = null) {
    const normalizedItems = normalizeItems(items);
    const requestHash = hashCheckoutRequest(clientId, normalizedItems);

    if (idempotencyKey) {
      const existing = await this.idempotencyKeyRepository.findByKeyAndClient(idempotencyKey, clientId);
      if (existing) {
        return this.replayIdempotentResponse(existing, requestHash);
      }
    }

    try {
      return await this.sequelize.transaction(async (transaction) => {
        const client = await this.clientRepository.findById(clientId);
        if (!client) {
          throw new CustomError(`Client ${clientId} not found.`, 404);
        }

        const productIds = normalizedItems.map((item) => item.productId);
        const products = await this.productRepository.findAllByIdsForUpdate(productIds, transaction);
        const productsById = new Map(products.map((product) => [product.productId, product]));

        const missingIds = productIds.filter((id) => !productsById.has(id));
        if (missingIds.length > 0) {
          throw new CustomError(`Product(s) not found: ${missingIds.join(', ')}.`, 404);
        }

        const insufficient = normalizedItems.filter(
          (item) => productsById.get(item.productId).quantityInStock < item.quantity,
        );
        if (insufficient.length > 0) {
          const details = insufficient
            .map((item) => `product ${item.productId} (requested ${item.quantity}, available ${productsById.get(item.productId).quantityInStock})`)
            .join('; ');
          throw new CustomError(`Insufficient stock for: ${details}.`, 409);
        }

        const totalCents = normalizedItems.reduce(
          (sum, item) => sum + toCents(productsById.get(item.productId).price) * item.quantity,
          0,
        );

        const order = await this.orderRepository.create(
          {
            clientId,
            status: OrderStatus.Received,
            orderDate: new Date(),
            total: fromCents(totalCents),
          },
          { transaction },
        );

        const createdItems = [];
        for (const item of normalizedItems) {
          const product = productsById.get(item.productId);
          const decremented = await this.productRepository.decrementStockGuarded(
            item.productId,
            item.quantity,
            transaction,
          );
          if (!decremented) {
            throw new CustomError(`Insufficient stock for: product ${item.productId}.`, 409);
          }
          const orderItem = await this.orderItemRepository.create(
            {
              orderId: order.orderId,
              productId: item.productId,
              quantity: item.quantity,
              pricePerUnit: Number(product.price),
            },
            { transaction },
          );
          createdItems.push(orderItem);
        }

        const response = {
          order: {
            orderId: order.orderId,
            clientId: order.clientId,
            status: order.status,
            orderDate: order.orderDate,
            total: fromCents(totalCents),
          },
          items: createdItems.map((orderItem) => ({
            itemId: orderItem.itemId,
            productId: orderItem.productId,
            quantity: orderItem.quantity,
            pricePerUnit: Number(orderItem.pricePerUnit).toFixed(2),
            subtotal: Number(orderItem.subtotal).toFixed(2),
          })),
        };

        if (idempotencyKey) {
          await this.idempotencyKeyRepository.create(
            {
              idempotencyKey,
              clientId,
              requestHash,
              orderId: order.orderId,
              responseBody: response,
            },
            { transaction },
          );
        }

        return { replayed: false, response };
      });
    } catch (error) {
      // A concurrent request with the same key won the race: our transaction
      // (including the duplicate order) was rolled back. Replay the winner's response.
      if (idempotencyKey && error instanceof UniqueConstraintError) {
        const winner = await this.idempotencyKeyRepository.findByKeyAndClient(idempotencyKey, clientId);
        if (winner) {
          return this.replayIdempotentResponse(winner, requestHash);
        }
      }
      throw error;
    }
  }

  replayIdempotentResponse(record, requestHash) {
    if (record.requestHash !== requestHash) {
      throw new CustomError(
        'Idempotency-Key already used with a different payload for this client.',
        409,
      );
    }
    return { replayed: true, response: record.responseBody };
  }

  async changeStatus(orderId, newStatus) {
    if (newStatus === OrderStatus.Cancelled) {
      return this.cancelOrder(orderId);
    }
    return this.sequelize.transaction(async (transaction) => {
      const order = await this.orderRepository.findByIdForUpdate(orderId, transaction);
      if (!order) {
        throw new CustomError('Order not found.', 404);
      }
      if (!isTransitionAllowed(order.status, newStatus)) {
        throw new CustomError(`Invalid status transition: '${order.status}' -> '${newStatus}'.`, 409);
      }
      const previousStatus = order.status;
      await order.update({ status: newStatus }, { transaction });
      return { order, previousStatus };
    });
  }

  async cancelOrder(orderId) {
    return this.sequelize.transaction(async (transaction) => {
      const order = await this.orderRepository.findByIdForUpdate(orderId, transaction);
      if (!order) {
        throw new CustomError('Order not found.', 404);
      }
      if (!CANCELLABLE_STATUSES.includes(order.status)) {
        throw new CustomError(
          `Order cannot be cancelled from status '${order.status}'. Cancellation is only allowed from: ${CANCELLABLE_STATUSES.join(', ')}.`,
          409,
        );
      }

      const items = await this.orderItemRepository.findByOrderId(orderId, { transaction });
      const restoredItems = [...items].sort((a, b) => a.productId - b.productId);
      for (const item of restoredItems) {
        await this.productRepository.incrementStock(item.productId, item.quantity, transaction);
      }

      const previousStatus = order.status;
      await order.update({ status: OrderStatus.Cancelled }, { transaction });

      return {
        order,
        previousStatus,
        restoredStock: restoredItems.map((item) => ({
          productId: item.productId,
          quantityRestored: item.quantity,
        })),
      };
    });
  }

  async getOrderSummary(orderId) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new CustomError('Order not found.', 404);
    }
    const items = await this.orderItemRepository.findByOrderId(orderId);

    const recomputedCents = items.reduce(
      (sum, item) => sum + toCents(item.pricePerUnit) * item.quantity,
      0,
    );
    const persistedCents = toCents(order.total);
    const consistent = recomputedCents === persistedCents;

    const summary = {
      order: {
        orderId: order.orderId,
        clientId: order.clientId,
        status: order.status,
        orderDate: order.orderDate,
      },
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        pricePerUnit: Number(item.pricePerUnit).toFixed(2),
        subtotal: Number(item.subtotal).toFixed(2),
      })),
      recomputedTotal: fromCents(recomputedCents),
      persistedTotal: fromCents(persistedCents),
      consistent,
    };

    if (!consistent) {
      summary.warning = `Persisted total (${summary.persistedTotal}) does not match the total recomputed from order items (${summary.recomputedTotal}).`;
    }

    return summary;
  }
}

export default OrderService;
