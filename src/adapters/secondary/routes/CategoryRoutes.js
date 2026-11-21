import express from 'express';
import authToken, { optionalAuthenticateToken, requireAdmin } from '../../../utils/middlewareAuth.js';
import Category from '../../../entities/models/Category.js';
import Brand from '../../../entities/models/Brand.js';
import CatalogTaxonomyService from '../../../entities/services/CatalogTaxonomyService.js';
import CatalogTaxonomyController from '../../primary/controllers/CatalogTaxonomyController.js';
import CatalogValidation from '../../../validation/CatalogValidation.js';

const categoryRouter = express.Router();
const taxonomyService = new CatalogTaxonomyService(Category, Brand);
const taxonomyController = new CatalogTaxonomyController(taxonomyService);

categoryRouter.get('/', optionalAuthenticateToken, taxonomyController.listCategories.bind(taxonomyController));
categoryRouter.get('/:categoryId', optionalAuthenticateToken, taxonomyController.getCategoryById.bind(taxonomyController));
categoryRouter.post('/', authToken, requireAdmin, CatalogValidation.createCategorySchema, taxonomyController.createCategory.bind(taxonomyController));
categoryRouter.put('/:categoryId', authToken, requireAdmin, CatalogValidation.updateCategorySchema, taxonomyController.updateCategory.bind(taxonomyController));
categoryRouter.delete('/:categoryId', authToken, requireAdmin, taxonomyController.deleteCategory.bind(taxonomyController));

export default categoryRouter;
