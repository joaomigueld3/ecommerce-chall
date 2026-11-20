import express from 'express';
import { requireAdmin } from '../../../utils/middlewareAuth.js';
import Order from '../../../entities/models/Order.js';
import OrderItem from '../../../entities/models/OrderItem.js';
import Product from '../../../entities/models/Product.js';
import Client from '../../../entities/models/Client.js';
import IdempotencyKey from '../../../entities/models/IdempotencyKey.js';
import StockMovement from '../../../entities/models/StockMovement.js';
import OrderController from '../../primary/controllers/OrderController.js';
import OrderService from '../../../entities/services/OrderService.js';
import OrderRepository from '../../../entities/repositories/OrderRepository.js';
import OrderItemRepository from '../../../entities/repositories/OrderItemRepository.js';
import ProductRepository from '../../../entities/repositories/ProductRepository.js';
import ClientRepository from '../../../entities/repositories/ClientRepository.js';
import IdempotencyKeyRepository from '../../../entities/repositories/IdempotencyKeyRepository.js';
import StockMovementRepository from '../../../entities/repositories/StockMovementRepository.js';
import OrderValidation from '../../../validation/OrderValidation.js';
import connection from '../../../database/index.js';

const orderRouter = express.Router();

const orderRepository = new OrderRepository(Order);
const orderItemRepository = new OrderItemRepository(OrderItem);
const productRepository = new ProductRepository(Product);
const clientRepository = new ClientRepository(Client);
const idempotencyKeyRepository = new IdempotencyKeyRepository(IdempotencyKey);
const stockMovementRepository = new StockMovementRepository(StockMovement);

const orderService = new OrderService(orderRepository, {
  orderItemRepository,
  productRepository,
  clientRepository,
  idempotencyKeyRepository,
  stockMovementRepository,
  connection,
});
const orderController = new OrderController(orderService, clientRepository);

orderRouter.post('/', OrderValidation.createOrderValidation, orderController.createOrder.bind(orderController));
orderRouter.post('/checkout', OrderValidation.checkoutOrderSchema, orderController.checkout.bind(orderController));
orderRouter.post('/filters', OrderValidation.getOrdersByFiltersSchema, orderController.getOrdersByFilters.bind(orderController));
orderRouter.get('/', orderController.getAllOrders.bind(orderController));
orderRouter.get('/:orderId/summary', OrderValidation.getOrderByIdSchema, orderController.getOrderSummary.bind(orderController));
orderRouter.post('/:orderId/payment', OrderValidation.getOrderByIdSchema, OrderValidation.paymentOrderSchema, orderController.processPayment.bind(orderController));
orderRouter.patch('/:orderId/status', requireAdmin, OrderValidation.getOrderByIdSchema, OrderValidation.changeOrderStatusSchema, orderController.changeOrderStatus.bind(orderController));
orderRouter.post('/:orderId/cancel', OrderValidation.getOrderByIdSchema, orderController.cancelOrder.bind(orderController));
orderRouter.put('/update-status/:orderId', requireAdmin, OrderValidation.updateOrderStatusSchema, orderController.updateOrder.bind(orderController));
orderRouter.get('/:orderId', OrderValidation.getOrderByIdSchema, orderController.getOrderById.bind(orderController));
orderRouter.put('/:orderId', requireAdmin, OrderValidation.updateOrderSchema, orderController.updateOrder.bind(orderController));
orderRouter.delete('/:orderId', requireAdmin, OrderValidation.deleteOrderSchema, orderController.deleteOrder.bind(orderController));

export default orderRouter;
