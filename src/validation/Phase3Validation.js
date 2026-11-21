import Joi from 'joi';
import validateSchema from '../utils/validationUtils.js';

const HEX_COLOR_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

class Phase3Validation {
  static updateStoreSettingsSchema(req, res, next) {
    const schema = Joi.object({
      storeName: Joi.string().trim().min(2).max(120),
      shortPrefix: Joi.string().trim().min(1).max(40),
      shortSuffix: Joi.string().trim().max(40).allow(''),
      tagline: Joi.string().trim().max(240).allow('', null),
      logoUrl: Joi.string().trim().max(500).allow('', null),
      primaryColor: Joi.string().pattern(HEX_COLOR_PATTERN),
      accentColor: Joi.string().pattern(HEX_COLOR_PATTERN),
      defaultRegion: Joi.string().valid('BR', 'US', 'EU'),
      freeShippingThresholdBr: Joi.number().min(0),
      freeShippingThresholdUs: Joi.number().min(0),
      freeShippingThresholdEu: Joi.number().min(0),
      supportEmail: Joi.string().email().allow('', null),
      supportPhone: Joi.string().trim().max(40).allow('', null),
      legalEntityName: Joi.string().trim().max(160).allow('', null),
      taxId: Joi.string().trim().max(60).allow('', null),
    }).min(1);
    validateSchema('body', schema)(req, res, next);
  }

  static createAddressSchema(req, res, next) {
    const schema = Joi.object({
      label: Joi.string().trim().max(60).default('Home'),
      recipientName: Joi.string().trim().min(2).max(120)
        .required(),
      recipientPhone: Joi.string().trim().max(30).allow('', null),
      country: Joi.string().valid('BR', 'US', 'EU').default('BR'),
      postalCode: Joi.string().trim().min(4).max(24)
        .required(),
      street: Joi.string().trim().min(2).max(180)
        .required(),
      number: Joi.string().trim().min(1).max(30)
        .required(),
      complement: Joi.string().trim().max(120).allow('', null),
      neighborhood: Joi.string().trim().max(120).allow('', null),
      city: Joi.string().trim().min(2).max(120)
        .required(),
      state: Joi.string().trim().min(2).max(60)
        .required(),
      reference: Joi.string().trim().max(200).allow('', null),
      isDefaultShipping: Joi.boolean().default(false),
      isDefaultBilling: Joi.boolean().default(false),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static updateAddressSchema(req, res, next) {
    const schema = Joi.object({
      label: Joi.string().trim().max(60),
      recipientName: Joi.string().trim().min(2).max(120),
      recipientPhone: Joi.string().trim().max(30).allow('', null),
      country: Joi.string().valid('BR', 'US', 'EU'),
      postalCode: Joi.string().trim().min(4).max(24),
      street: Joi.string().trim().min(2).max(180),
      number: Joi.string().trim().min(1).max(30),
      complement: Joi.string().trim().max(120).allow('', null),
      neighborhood: Joi.string().trim().max(120).allow('', null),
      city: Joi.string().trim().min(2).max(120),
      state: Joi.string().trim().min(2).max(60),
      reference: Joi.string().trim().max(200).allow('', null),
      isDefaultShipping: Joi.boolean(),
      isDefaultBilling: Joi.boolean(),
    }).min(1);
    validateSchema('body', schema)(req, res, next);
  }

  static createPaymentMethodSchema(req, res, next) {
    const schema = Joi.object({
      brand: Joi.string().trim().valid('Visa', 'Mastercard', 'Amex', 'Elo', 'PIX', 'SEPA').required(),
      holderName: Joi.string().trim().min(2).max(120)
        .required(),
      last4: Joi.string().pattern(/^\d{4}$/).required(),
      expMonth: Joi.number().integer().min(1).max(12)
        .allow(null),
      expYear: Joi.number().integer().min(2025).max(2060)
        .allow(null),
      nickname: Joi.string().trim().max(80).allow('', null),
      isDefault: Joi.boolean().default(false),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static updateClientCrmSchema(req, res, next) {
    const schema = Joi.object({
      tier: Joi.string().valid('Standard', 'Prime', 'VIP'),
      loyaltyPoints: Joi.number().integer().min(0),
      creditBalance: Joi.number().min(0),
      internalNotes: Joi.string().max(2000).allow('', null),
      status: Joi.boolean(),
      blockedReason: Joi.string().max(255).allow('', null),
    }).min(1);
    validateSchema('body', schema)(req, res, next);
  }

  static addWishlistItemSchema(req, res, next) {
    const schema = Joi.object({
      productId: Joi.number().integer().positive().required(),
    });
    validateSchema('body', schema)(req, res, next);
  }
}

export default Phase3Validation;
