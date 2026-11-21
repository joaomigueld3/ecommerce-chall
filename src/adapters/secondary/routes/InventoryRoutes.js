import express from 'express';
import { requireAdmin } from '../../../utils/middlewareAuth.js';
import Product from '../../../entities/models/Product.js';
import ProductVariant from '../../../entities/models/ProductVariant.js';
import StockMovement from '../../../entities/models/StockMovement.js';
import User from '../../../entities/models/User.js';
import StockMovementRepository from '../../../entities/repositories/StockMovementRepository.js';
import InventoryService from '../../../entities/services/InventoryService.js';
import InventoryController from '../../primary/controllers/InventoryController.js';
import CatalogValidation from '../../../validation/CatalogValidation.js';
import connection from '../../../database/index.js';

const inventoryRouter = express.Router();

const stockMovementRepository = new StockMovementRepository(StockMovement);
const inventoryService = new InventoryService(
  {
    Product, ProductVariant, StockMovement, User,
  },
  stockMovementRepository,
  connection,
);
const inventoryController = new InventoryController(inventoryService);

inventoryRouter.get('/summary', requireAdmin, inventoryController.getSummary.bind(inventoryController));
inventoryRouter.get('/low-stock', requireAdmin, inventoryController.getLowStock.bind(inventoryController));
inventoryRouter.get('/movements', requireAdmin, inventoryController.getMovements.bind(inventoryController));
inventoryRouter.post('/movements', requireAdmin, CatalogValidation.createStockMovementSchema, inventoryController.createMovement.bind(inventoryController));

export default inventoryRouter;
