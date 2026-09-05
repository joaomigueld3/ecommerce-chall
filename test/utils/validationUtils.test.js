import { describe, it, expect, vi } from 'vitest';
import Joi from 'joi';
import validateSchema from '../../src/utils/validationUtils.js';

function makeRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

const schema = Joi.object({ name: Joi.string().required() });

describe('validateSchema', () => {
  it('calls next when the data is valid', () => {
    const req = { body: { name: 'Ana' } };
    const res = makeRes();
    const next = vi.fn();

    validateSchema('body', schema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('responds with 400 and the Joi message when invalid', () => {
    const req = { body: {} };
    const res = makeRes();
    const next = vi.fn();

    validateSchema('body', schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.stringContaining('name'),
    }));
  });

  it('validates params instead of body when dataType is params', () => {
    const req = { params: { name: 'Ana' }, body: {} };
    const res = makeRes();
    const next = vi.fn();

    validateSchema('params', schema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
