import express from 'express';
import authToken, { optionalAuthenticateToken, requireAdmin } from '../../../utils/middlewareAuth.js';
import Category from '../../../entities/models/Category.js';
import Brand from '../../../entities/models/Brand.js';
import CatalogTaxonomyService from '../../../entities/services/CatalogTaxonomyService.js';
import CatalogTaxonomyController from '../../primary/controllers/CatalogTaxonomyController.js';
import CatalogValidation from '../../../validation/CatalogValidation.js';

const brandRouter = express.Router();
const taxonomyService = new CatalogTaxonomyService(Category, Brand);
const taxonomyController = new CatalogTaxonomyController(taxonomyService);

brandRouter.get('/', optionalAuthenticateToken, taxonomyController.listBrands.bind(taxonomyController));
brandRouter.get('/:brandId', optionalAuthenticateToken, taxonomyController.getBrandById.bind(taxonomyController));
brandRouter.post('/', authToken, requireAdmin, CatalogValidation.createBrandSchema, taxonomyController.createBrand.bind(taxonomyController));
brandRouter.put('/:brandId', authToken, requireAdmin, CatalogValidation.updateBrandSchema, taxonomyController.updateBrand.bind(taxonomyController));
brandRouter.delete('/:brandId', authToken, requireAdmin, taxonomyController.deleteBrand.bind(taxonomyController));

export default brandRouter;
