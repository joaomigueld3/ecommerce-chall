import Joi from 'joi';
import validateSchema from '../utils/validationUtils.js';
import { STOCK_MOVEMENT_TYPES } from '../entities/models/StockMovement.js';

class CatalogValidation {
  static createCategorySchema(req, res, next) {
    const schema = Joi.object({
      name: Joi.string().trim().min(2).max(100)
        .required(),
      slug: Joi.string().trim().max(120).allow('', null),
      description: Joi.string().allow('', null),
      imageUrl: Joi.string().trim().max(500).allow('', null),
      parentId: Joi.number().integer().positive().allow(null),
      displayOrder: Joi.number().integer().min(0).default(0),
      active: Joi.boolean().default(true),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static updateCategorySchema(req, res, next) {
    const schema = Joi.object({
      name: Joi.string().trim().min(2).max(100),
      slug: Joi.string().trim().max(120),
      description: Joi.string().allow('', null),
      imageUrl: Joi.string().trim().max(500).allow('', null),
      parentId: Joi.number().integer().positive().allow(null),
      displayOrder: Joi.number().integer().min(0),
      active: Joi.boolean(),
    }).min(1);
    validateSchema('body', schema)(req, res, next);
  }

  static createBrandSchema(req, res, next) {
    const schema = Joi.object({
      name: Joi.string().trim().min(2).max(100)
        .required(),
      slug: Joi.string().trim().max(120).allow('', null),
      logoUrl: Joi.string().trim().max(500).allow('', null),
      active: Joi.boolean().default(true),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static updateBrandSchema(req, res, next) {
    const schema = Joi.object({
      name: Joi.string().trim().min(2).max(100),
      slug: Joi.string().trim().max(120),
      logoUrl: Joi.string().trim().max(500).allow('', null),
      active: Joi.boolean(),
    }).min(1);
    validateSchema('body', schema)(req, res, next);
  }

  static addProductImageSchema(req, res, next) {
    const schema = Joi.object({
      url: Joi.string().trim().max(500).required(),
      altText: Joi.string().trim().max(200).allow('', null),
      isPrimary: Joi.boolean().default(false),
      sortOrder: Joi.number().integer().min(0).default(0),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static createVariantSchema(req, res, next) {
    const schema = Joi.object({
      sku: Joi.string().trim().max(64).required(),
      name: Joi.string().trim().max(120).required(),
      attributes: Joi.object().unknown(true).allow(null),
      priceOverride: Joi.number().positive().allow(null),
      quantityInStock: Joi.number().integer().min(0).default(0),
      active: Joi.boolean().default(true),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static updateVariantSchema(req, res, next) {
    const schema = Joi.object({
      sku: Joi.string().trim().max(64),
      name: Joi.string().trim().max(120),
      attributes: Joi.object().unknown(true).allow(null),
      priceOverride: Joi.number().positive().allow(null),
      quantityInStock: Joi.number().integer().min(0),
      active: Joi.boolean(),
    }).min(1);
    validateSchema('body', schema)(req, res, next);
  }

  static createReviewSchema(req, res, next) {
    const schema = Joi.object({
      rating: Joi.number().integer().min(1).max(5)
        .required(),
      title: Joi.string().trim().min(3).max(140)
        .required(),
      comment: Joi.string().trim().min(5).max(2000)
        .required(),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static updateReviewStatusSchema(req, res, next) {
    const schema = Joi.object({
      status: Joi.string().valid('Approved', 'Pending', 'Hidden').required(),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static createQuestionSchema(req, res, next) {
    const schema = Joi.object({
      question: Joi.string().trim().min(5).max(1000)
        .required(),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static answerQuestionSchema(req, res, next) {
    const schema = Joi.object({
      answer: Joi.string().trim().min(2).max(2000)
        .required(),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static updateQuestionStatusSchema(req, res, next) {
    const schema = Joi.object({
      status: Joi.string().valid('Published', 'Hidden').required(),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static createStockMovementSchema(req, res, next) {
    const schema = Joi.object({
      productId: Joi.number().integer().positive().required(),
      variantId: Joi.number().integer().positive().allow(null),
      type: Joi.string()
        .valid(...STOCK_MOVEMENT_TYPES.filter((t) => t !== 'SALE' && t !== 'CANCELLATION_RESTOCK'))
        .required(),
      quantity: Joi.number().integer().not(0).required(),
      reason: Joi.string().trim().min(3).max(255)
        .required(),
    });
    validateSchema('body', schema)(req, res, next);
  }
}

export default CatalogValidation;
