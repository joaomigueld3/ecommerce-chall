import Joi from 'joi';
import validateSchema from '../utils/validationUtils.js';

class UserValidation {
  static createUserValidation(req, res, next) {
    const schema = Joi.object().keys({
      name: Joi.string().trim().required(),
      email: Joi.string().email({ tlds: { allow: false } }).required(),
      password: Joi.string().min(8).required(),
      type: Joi.string().valid('Client').default('Client'),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static createAdminUserValidation(req, res, next) {
    const schema = Joi.object().keys({
      name: Joi.string().trim().required(),
      email: Joi.string().email({ tlds: { allow: false } }).required(),
      password: Joi.string().min(8).required(),
      type: Joi.string().valid('Admin', 'Client').required(),
      confirmed: Joi.boolean(),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static getUserByIdSchema(req, res, next) {
    const schema = Joi.object({
      id: Joi.number().integer().required(),
    });
    validateSchema('params', schema)(req, res, next);
  }

  static updateUserByIdSchema(req, res, next) {
    const schema = Joi.object({
      name: Joi.string().trim(),
      email: Joi.string().email({ tlds: { allow: false } }),
      type: Joi.string().valid('Admin', 'Client'),
      confirmed: Joi.boolean(),
    }).min(1);
    validateSchema('body', schema)(req, res, next);
  }

  static loginOrchangePassSchema(req, res, next) {
    const schema = Joi.object({
      email: Joi.string().email({ tlds: { allow: false } }).required(),
      password: Joi.string().min(8).required(),
    });
    validateSchema('body', schema)(req, res, next);
  }

  static deleteUserByIdSchema(req, res, next) {
    const schema = Joi.object({
      id: Joi.number().integer().required(),
    });
    validateSchema('params', schema)(req, res, next);
  }

  static getUsersByFiltersSchema(req, res, next) {
    const schema = Joi.object({
      name: Joi.string().allow(''),
      email: Joi.string().email({ tlds: { allow: false } }).allow(''),
      type: Joi.string().valid('Admin', 'Client').allow(''),
    });
    validateSchema('body', schema)(req, res, next);
  }
}
export default UserValidation;
