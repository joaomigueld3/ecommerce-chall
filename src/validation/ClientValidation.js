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
      userId: Joi.number().integer().positive().allow(null),
      fullName: Joi.string().trim().required(),
      contact: Joi.string().trim().required(),
      phone: Joi.string().trim().max(30).allow('', null),
      email: Joi.string().email().allow('', null),
      documentType: Joi.string().valid('CPF', 'CNPJ', 'TAX_ID', 'VAT_ID').allow('', null),
      documentNumber: Joi.string().trim().max(40).allow('', null),
      birthDate: Joi.string().isoDate().allow('', null),
      country: Joi.string().valid('BR', 'US', 'EU').default('BR'),
      address: Joi.string().allow('', null),
      tier: Joi.string().valid('Standard', 'Prime', 'VIP').default('Standard'),
      loyaltyPoints: Joi.number().integer().min(0).default(0),
      creditBalance: Joi.number().min(0).default(0),
      internalNotes: Joi.string().max(2000).allow('', null),
      blockedReason: Joi.string().max(255).allow('', null),
      status: Joi.boolean().default(true),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static updateClientSchema(req, res, next) {
    const schema = Joi.object({
      userId: Joi.number().integer().positive().allow(null),
      fullName: Joi.string().trim(),
      contact: Joi.string().trim(),
      phone: Joi.string().trim().max(30).allow('', null),
      email: Joi.string().email().allow('', null),
      documentType: Joi.string().valid('CPF', 'CNPJ', 'TAX_ID', 'VAT_ID').allow('', null),
      documentNumber: Joi.string().trim().max(40).allow('', null),
      birthDate: Joi.string().isoDate().allow('', null),
      country: Joi.string().valid('BR', 'US', 'EU'),
      address: Joi.string().allow('', null),
      tier: Joi.string().valid('Standard', 'Prime', 'VIP'),
      loyaltyPoints: Joi.number().integer().min(0),
      creditBalance: Joi.number().min(0),
      internalNotes: Joi.string().max(2000).allow('', null),
      blockedReason: Joi.string().max(255).allow('', null),
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
      country: Joi.string().valid('BR', 'US', 'EU').allow(''),
      tier: Joi.string().valid('Standard', 'Prime', 'VIP').allow(''),
      status: Joi.boolean().allow(''),
    });
    validateSchema('body', schema)(req, res, next);
  }
}

export default ClientValidation;
