import Joi from 'joi';
import validateSchema from '../utils/validationUtils.js';

class OrderValidation {
  static createOrderValidation(req, res, next) {
    const schema = Joi.object().keys({
      clientId: Joi.number().integer().required(),
      status: Joi.string().valid('Received', 'In Preparation', 'Dispatched', 'Delivered').required(),
      orderDate: Joi.date().required(),
      total: Joi.number().precision(2).required(),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static getOrderByIdSchema(req, res, next) {
    const schema = Joi.object({
      orderId: Joi.number().integer().required(),
    });
    validateSchema('params', schema)(req, res, next);
  }

  static checkoutValidation(req, res, next) {
    const schema = Joi.object().keys({
      clientId: Joi.number().integer().positive().required(),
      items: Joi.array().items(
        Joi.object().keys({
          productId: Joi.number().integer().positive().required(),
          quantity: Joi.number().integer().positive().required(),
        }),
      ).min(1).required(),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static patchOrderStatusSchema(req, res, next) {
    const schema = Joi.object().keys({
      status: Joi.string().valid('Received', 'In Preparation', 'Dispatched', 'Delivered', 'Cancelled').required(),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static orderIdParamSchema(req, res, next) {
    const schema = Joi.object({
      orderId: Joi.number().integer().positive().required(),
    });
    validateSchema('params', schema)(req, res, next);
  }

  static updateOrderSchema(req, res, next) {
    const schema = Joi.object().keys({
      clientId: Joi.number().integer(),
      status: Joi.string().valid('Received', 'In Preparation', 'Dispatched', 'Delivered'),
      orderDate: Joi.date(),
      total: Joi.number().precision(2),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static updateOrderStatusSchema(req, res, next) {
    const schema = Joi.object().keys({
      status: Joi.string().valid('Received', 'In Preparation', 'Dispatched', 'Delivered').required(),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static deleteOrderSchema(req, res, next) {
    const schema = Joi.object({
      orderId: Joi.number().integer().required(),
    });
    validateSchema('params', schema)(req, res, next);
  }

  static getOrdersByFiltersSchema(req, res, next) {
    const schema = Joi.object({
      clientId: Joi.number().integer().positive(),
      status: Joi.string().valid('Received', 'In Preparation', 'Dispatched', 'Delivered').allow(''),
      startDate: Joi.date(),
      endDate: Joi.date(),
    });
    validateSchema('body', schema)(req, res, next);
  }
}

export default OrderValidation;
