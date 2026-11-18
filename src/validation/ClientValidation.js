import Joi from 'joi';
import validateSchema from '../utils/validationUtils.js';

class ClientValidation {
  static getAllClientsSchema(req, res, next) {
    next();
  }

  static getClientByIdSchema(req, res, next) {
    const schema = Joi.object({
      clientId: Joi.number().integer().required(),
    });
    validateSchema('params', schema)(req, res, next);
  }

  static createClientSchema(req, res, next) {
    const schema = Joi.object({
      userId: Joi.number().integer().positive(),
      fullName: Joi.string().trim().required(),
      contact: Joi.string().trim().required(),
      address: Joi.string().allow(''),
      status: Joi.boolean().default(true),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static updateClientSchema(req, res, next) {
    const schema = Joi.object({
      userId: Joi.number().integer().positive().allow(null),
      fullName: Joi.string().trim(),
      contact: Joi.string().trim(),
      address: Joi.string().allow(''),
      status: Joi.boolean(),
    }).min(1);
    validateSchema('body', schema)(req, res, next);
  }

  static deleteClientSchema(req, res, next) {
    const schema = Joi.object({
      clientId: Joi.number().integer().required(),
    });
    validateSchema('params', schema)(req, res, next);
  }

  static getClientByNameSchema(req, res, next) {
    const schema = Joi.object({
      fullName: Joi.string().required(),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static getClientsByFiltersSchema(req, res, next) {
    const schema = Joi.object({
      fullName: Joi.string().allow(''),
      contact: Joi.string().allow(''),
      address: Joi.string().allow(''),
      status: Joi.boolean().allow(''),
    });
    validateSchema('body', schema)(req, res, next);
  }
}

export default ClientValidation;
