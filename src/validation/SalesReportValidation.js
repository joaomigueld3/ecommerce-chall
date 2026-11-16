import Joi from 'joi';
import validateSchema from '../utils/validationUtils.js';

class SalesReportValidation {
  static createReportSchema(req, res, next) {
    const schema = Joi.object({
      startDate: Joi.date().required(),
      endDate: Joi.date().min(Joi.ref('startDate')).required(),
      category: Joi.string().trim().allow(''),
      status: Joi.string().valid('Received', 'In Preparation', 'Dispatched', 'Delivered').allow(''),
      clientId: Joi.number().integer().positive(),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static getReportByIdSchema(req, res, next) {
    const schema = Joi.object({
      reportId: Joi.number().integer().positive().required(),
    });
    validateSchema('params', schema)(req, res, next);
  }

  static updateReportSchema(req, res, next) {
    const schema = Joi.object({
      period: Joi.date(),
      periodStart: Joi.date(),
      periodEnd: Joi.date(),
      filePath: Joi.string().trim(),
    }).min(1);
    validateSchema('body', schema)(req, res, next);
  }

  static getReportsByFiltersSchema(req, res, next) {
    const schema = Joi.object({
      startDate: Joi.date(),
      endDate: Joi.date(),
      minTotalSales: Joi.number().min(0),
      maxTotalSales: Joi.number().min(0),
    });
    validateSchema('body', schema)(req, res, next);
  }
}

export default SalesReportValidation;
