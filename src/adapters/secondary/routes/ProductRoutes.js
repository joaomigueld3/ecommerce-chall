import express from 'express';
import { requireAdmin } from '../../../utils/middlewareAuth.js';
import ProductRepository from '../../../entities/repositories/ProductRepository.js';
import ProductService from '../../../entities/services/ProductService.js';
import ProductController from '../../primary/controllers/ProductController.js';
import Product from '../../../entities/models/Product.js';
import ProductValidation from '../../../validation/ProductValidation.js';

const productRouter = express.Router();

const productRepository = new ProductRepository(Product);
const productService = new ProductService(productRepository);
const productController = new ProductController(productService);

productRouter.get('/', productController.getAllProducts.bind(productController));
productRouter.post('/filters', ProductValidation.getProductsByFiltersSchema, productController.getProductsByFilters.bind(productController));
productRouter.get('/:productId', ProductValidation.getProductByIdSchema, productController.getProductById.bind(productController));
productRouter.post('/', requireAdmin, ProductValidation.createProductSchema, productController.createProduct.bind(productController));
productRouter.put('/:productId', requireAdmin, ProductValidation.updateProductSchema, productController.updateProduct.bind(productController));
productRouter.delete('/:productId', requireAdmin, ProductValidation.deleteProductSchema, productController.deleteProduct.bind(productController));

export default productRouter;
