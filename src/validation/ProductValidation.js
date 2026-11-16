import Joi from 'joi';
import validateSchema from '../utils/validationUtils.js';

class ProductValidation {
  static createProductSchema(req, res, next) {
    const schema = Joi.object().keys({
      productName: Joi.string().trim().required(),
      description: Joi.string().allow(''),
      category: Joi.string().trim().max(80).default('General'),
      price: Joi.number().positive().required(),
      quantityInStock: Joi.number().integer().min(0).required(),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static updateProductSchema(req, res, next) {
    const schema = Joi.object().keys({
      productName: Joi.string().trim(),
      description: Joi.string().allow(''),
      category: Joi.string().trim().max(80),
      price: Joi.number().positive(),
      quantityInStock: Joi.number().integer().min(0),
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
      minPrice: Joi.number().min(0),
      maxPrice: Joi.number().min(0),
      available: Joi.boolean(),
      quantityInStock: Joi.number().integer().min(0),
    });
    validateSchema('body', schema)(req, res, next);
  }
}

export default ProductValidation;
