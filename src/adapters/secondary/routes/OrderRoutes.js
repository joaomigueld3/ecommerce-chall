// routes/orderRoutes.js
import express from 'express';
import Order from '../../../entities/models/Order.js';
import OrderItem from '../../../entities/models/OrderItem.js';
import Product from '../../../entities/models/Product.js';
import Client from '../../../entities/models/Client.js';
import IdempotencyKey from '../../../entities/models/IdempotencyKey.js';
import OrderController from '../../primary/controllers/OrderController.js';
import OrderService from '../../../entities/services/OrderService.js';
import OrderRepository from '../../../entities/repositories/OrderRepository.js';
import OrderItemRepository from '../../../entities/repositories/OrderItemRepository.js';
import ProductRepository from '../../../entities/repositories/ProductRepository.js';
import ClientRepository from '../../../entities/repositories/ClientRepository.js';
import IdempotencyKeyRepository from '../../../entities/repositories/IdempotencyKeyRepository.js';
import OrderValidation from '../../../validation/OrderValidation.js';
import connection from '../../../database/index.js';

const orderRouter = express.Router();

const orderRepository = new OrderRepository(Order);
const orderService = new OrderService(orderRepository, {
  orderItemRepository: new OrderItemRepository(OrderItem),
  productRepository: new ProductRepository(Product),
  clientRepository: new ClientRepository(Client),
  idempotencyKeyRepository: new IdempotencyKeyRepository(IdempotencyKey),
  sequelize: connection,
});
const orderController = new OrderController(orderService);

orderRouter.post('/', OrderValidation.createOrderValidation, orderController.createOrder.bind(orderController));
orderRouter.post('/checkout', OrderValidation.checkoutValidation, orderController.checkout.bind(orderController));
orderRouter.get('/', orderController.getAllOrders.bind(orderController));
orderRouter.get('/:orderId/summary', OrderValidation.orderIdParamSchema, orderController.getOrderSummary.bind(orderController));
orderRouter.get('/:orderId', OrderValidation.getOrderByIdSchema, orderController.getOrderById.bind(orderController));
orderRouter.put('/:orderId', OrderValidation.updateOrderSchema, orderController.updateOrder.bind(orderController));
orderRouter.put('/update-status/:orderId', OrderValidation.updateOrderStatusSchema, orderController.updateOrder.bind(orderController));
orderRouter.patch('/:orderId/status', OrderValidation.orderIdParamSchema, OrderValidation.patchOrderStatusSchema, orderController.updateOrderStatus.bind(orderController));
orderRouter.post('/:orderId/cancel', OrderValidation.orderIdParamSchema, orderController.cancelOrder.bind(orderController));
orderRouter.delete('/:orderId', OrderValidation.deleteOrderSchema, orderController.deleteOrder.bind(orderController));
orderRouter.post('/filters', OrderValidation.getOrdersByFiltersSchema, orderController.getOrdersByFilters.bind(orderController));

export default orderRouter;
