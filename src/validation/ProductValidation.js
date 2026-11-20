import Joi from 'joi';
import validateSchema from '../utils/validationUtils.js';

class ProductValidation {
  static createProductSchema(req, res, next) {
    const schema = Joi.object().keys({
      productName: Joi.string().trim().required(),
      sku: Joi.string().trim().max(64).allow('', null),
      slug: Joi.string().trim().max(180).allow('', null),
      description: Joi.string().allow(''),
      category: Joi.string().trim().max(80).default('General'),
      categoryId: Joi.number().integer().positive().allow(null),
      brandId: Joi.number().integer().positive().allow(null),
      imageUrl: Joi.string().trim().max(500).allow('', null),
      price: Joi.number().positive().required(),
      originalPrice: Joi.number().positive().allow(null),
      costPrice: Joi.number().min(0).allow(null),
      quantityInStock: Joi.number().integer().min(0).required(),
      minStockLevel: Joi.number().integer().min(0).default(5),
      weightKg: Joi.number().min(0).allow(null),
      dimensions: Joi.object().unknown(true).allow(null),
      specs: Joi.object().unknown(true).allow(null),
      featured: Joi.boolean().default(false),
      isDealOfDay: Joi.boolean().default(false),
      active: Joi.boolean().default(true),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static updateProductSchema(req, res, next) {
    const schema = Joi.object().keys({
      productName: Joi.string().trim(),
      sku: Joi.string().trim().max(64).allow('', null),
      slug: Joi.string().trim().max(180).allow('', null),
      description: Joi.string().allow(''),
      category: Joi.string().trim().max(80),
      categoryId: Joi.number().integer().positive().allow(null),
      brandId: Joi.number().integer().positive().allow(null),
      imageUrl: Joi.string().trim().max(500).allow('', null),
      price: Joi.number().positive(),
      originalPrice: Joi.number().positive().allow(null),
      costPrice: Joi.number().min(0).allow(null),
      quantityInStock: Joi.number().integer().min(0),
      minStockLevel: Joi.number().integer().min(0),
      weightKg: Joi.number().min(0).allow(null),
      dimensions: Joi.object().unknown(true).allow(null),
      specs: Joi.object().unknown(true).allow(null),
      featured: Joi.boolean(),
      isDealOfDay: Joi.boolean(),
      active: Joi.boolean(),
    }).min(1);
    validateSchema('body', schema)(req, res, next);
  }

  static getProductByIdSchema(req, res, next) {
    const schema = Joi.object({
      productId: Joi.number().integer().required(),
    });
    validateSchema('params', schema)(req, res, next);
  }

  static deleteProductSchema(req, res, next) {
    const schema = Joi.object({
      productId: Joi.number().integer().required(),
    });
    validateSchema('params', schema)(req, res, next);
  }

  static getProductsByFiltersSchema(req, res, next) {
    const schema = Joi.object({
      productName: Joi.string().allow(''),
      description: Joi.string().allow(''),
      category: Joi.string().allow(''),
      categories: Joi.alternatives().try(
        Joi.array().items(Joi.string()),
        Joi.string().allow(''),
      ),
      categoryId: Joi.number().integer().positive(),
      brandId: Joi.number().integer().positive(),
      featured: Joi.boolean(),
      isDealOfDay: Joi.boolean(),
      minRating: Joi.number().min(0).max(5),
      minPrice: Joi.number().min(0),
      maxPrice: Joi.number().min(0),
      available: Joi.boolean(),
      quantityInStock: Joi.number().integer().min(0),
    });
    validateSchema('body', schema)(req, res, next);
  }
}

export default ProductValidation;
