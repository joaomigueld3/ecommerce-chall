import express from 'express';
import { requireAdmin } from '../../../utils/middlewareAuth.js';
import OrderItemRepository from '../../../entities/repositories/OrderItemRepository.js';
import OrderRepository from '../../../entities/repositories/OrderRepository.js';
import OrderItemService from '../../../entities/services/OrderItemService.js';
import OrderItemController from '../../primary/controllers/OrderItemController.js';
import OrderItem from '../../../entities/models/OrderItem.js';
import Order from '../../../entities/models/Order.js';
import Product from '../../../entities/models/Product.js';
import ProductService from '../../../entities/services/ProductService.js';
import ProductRepository from '../../../entities/repositories/ProductRepository.js';
import OrderItemValidation from '../../../validation/OrderItemValidation.js';
import connection from '../../../database/index.js';

const orderItemRouter = express.Router();

const productRepository = new ProductRepository(Product);
const productService = new ProductService(productRepository);
const orderRepository = new OrderRepository(Order);

const orderItemRepository = new OrderItemRepository(OrderItem);
const orderItemService = new OrderItemService(orderItemRepository, productService, connection, orderRepository);
const orderItemController = new OrderItemController(orderItemService);

orderItemRouter.get('/', orderItemController.getAllOrderItems.bind(orderItemController));
orderItemRouter.post('/filters', requireAdmin, OrderItemValidation.getOrderItemsByFiltersSchema, orderItemController.getOrderItemsByFilters.bind(orderItemController));
orderItemRouter.get('/:itemId', OrderItemValidation.getOrderItemByIdSchema, orderItemController.getOrderItemById.bind(orderItemController));
orderItemRouter.post('/', OrderItemValidation.createOrderItemValidation, orderItemController.createOrderItem.bind(orderItemController));
orderItemRouter.put('/:itemId', requireAdmin, OrderItemValidation.updateOrderItemSchema, orderItemController.updateOrderItem.bind(orderItemController));
orderItemRouter.delete('/:itemId', requireAdmin, OrderItemValidation.deleteOrderItemSchema, orderItemController.deleteOrderItem.bind(orderItemController));

export default orderItemRouter;
