import express from 'express';
import authToken, { optionalAuthenticateToken, requireAdmin } from '../../../utils/middlewareAuth.js';
import ProductRepository from '../../../entities/repositories/ProductRepository.js';
import ProductService from '../../../entities/services/ProductService.js';
import ProductController from '../../primary/controllers/ProductController.js';
import Product from '../../../entities/models/Product.js';
import Brand from '../../../entities/models/Brand.js';
import Category from '../../../entities/models/Category.js';
import ProductImage from '../../../entities/models/ProductImage.js';
import ProductVariant from '../../../entities/models/ProductVariant.js';
import OrderItem from '../../../entities/models/OrderItem.js';
import StockMovement from '../../../entities/models/StockMovement.js';
import ProductValidation from '../../../validation/ProductValidation.js';
import CatalogValidation from '../../../validation/CatalogValidation.js';
import { engagementController } from './EngagementRoutes.js';

const productRouter = express.Router();

const productRepository = new ProductRepository(Product);
const productService = new ProductService(productRepository, {
  models: {
    Brand,
    Category,
    ProductImage,
    ProductVariant,
    OrderItem,
    StockMovement,
  },
});
const productController = new ProductController(productService);

productRouter.get('/', optionalAuthenticateToken, productController.getAllProducts.bind(productController));
productRouter.get('/categories', optionalAuthenticateToken, productController.getCategories.bind(productController));
productRouter.get('/low-stock', authToken, requireAdmin, productController.getLowStockProducts.bind(productController));
productRouter.post('/filters', optionalAuthenticateToken, ProductValidation.getProductsByFiltersSchema, productController.getProductsByFilters.bind(productController));

productRouter.get('/:productId/related', optionalAuthenticateToken, ProductValidation.getProductByIdSchema, productController.getRelatedProducts.bind(productController));
productRouter.get('/:productId/reviews', optionalAuthenticateToken, ProductValidation.getProductByIdSchema, engagementController.getProductReviews.bind(engagementController));
productRouter.post('/:productId/reviews', authToken, ProductValidation.getProductByIdSchema, CatalogValidation.createReviewSchema, engagementController.createReview.bind(engagementController));
productRouter.post('/:productId/reviews/:reviewId/helpful', optionalAuthenticateToken, engagementController.markReviewHelpful.bind(engagementController));

productRouter.get('/:productId/questions', optionalAuthenticateToken, ProductValidation.getProductByIdSchema, engagementController.getProductQuestions.bind(engagementController));
productRouter.post('/:productId/questions', authToken, ProductValidation.getProductByIdSchema, CatalogValidation.createQuestionSchema, engagementController.createQuestion.bind(engagementController));

productRouter.post('/:productId/images', authToken, requireAdmin, ProductValidation.getProductByIdSchema, CatalogValidation.addProductImageSchema, productController.addProductImage.bind(productController));
productRouter.delete('/:productId/images/:imageId', authToken, requireAdmin, productController.deleteProductImage.bind(productController));

productRouter.post('/:productId/variants', authToken, requireAdmin, ProductValidation.getProductByIdSchema, CatalogValidation.createVariantSchema, productController.createVariant.bind(productController));
productRouter.put('/:productId/variants/:variantId', authToken, requireAdmin, CatalogValidation.updateVariantSchema, productController.updateVariant.bind(productController));
productRouter.delete('/:productId/variants/:variantId', authToken, requireAdmin, productController.deleteVariant.bind(productController));

productRouter.get('/:productId', optionalAuthenticateToken, ProductValidation.getProductByIdSchema, productController.getProductById.bind(productController));
productRouter.post('/', authToken, requireAdmin, ProductValidation.createProductSchema, productController.createProduct.bind(productController));
productRouter.put('/:productId', authToken, requireAdmin, ProductValidation.updateProductSchema, productController.updateProduct.bind(productController));
productRouter.delete('/:productId', authToken, requireAdmin, ProductValidation.deleteProductSchema, productController.deleteProduct.bind(productController));

export default productRouter;
