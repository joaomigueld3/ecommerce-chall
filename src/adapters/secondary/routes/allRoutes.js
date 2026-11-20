import express from 'express';
import authToken from '../../../utils/middlewareAuth.js';
import UserRouter from './UserRoutes.js';
import ClientRouter from './ClientRoutes.js';
import OrderRouter from './OrderRoutes.js';
import ProductRouter from './ProductRoutes.js';
import CategoryRouter from './CategoryRoutes.js';
import BrandRouter from './BrandRoutes.js';
import OrderItemRouter from './OrderItemRoutes.js';
import SalesReportRouter from './SalesReportRoutes.js';
import InventoryRouter from './InventoryRoutes.js';
import StoreSettingRouter from './StoreSettingRoutes.js';
import WishlistRouter from './WishlistRoutes.js';
import { reviewAdminRouter, questionAdminRouter } from './EngagementRoutes.js';

const allRoutes = express.Router();

allRoutes.use('/', UserRouter);
allRoutes.use('/store-settings', StoreSettingRouter);
allRoutes.use('/clients', authToken, ClientRouter);
allRoutes.use('/wishlists', authToken, WishlistRouter);
allRoutes.use('/orders', authToken, OrderRouter);
allRoutes.use('/products', ProductRouter);
allRoutes.use('/categories', CategoryRouter);
allRoutes.use('/brands', BrandRouter);
allRoutes.use('/reviews', authToken, reviewAdminRouter);
allRoutes.use('/questions', authToken, questionAdminRouter);
allRoutes.use('/inventory', authToken, InventoryRouter);
allRoutes.use('/order-items', authToken, OrderItemRouter);
allRoutes.use('/reports', authToken, SalesReportRouter);

export default allRoutes;
