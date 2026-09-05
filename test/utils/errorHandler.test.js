import { describe, it, expect, vi } from 'vitest';
import { ForeignKeyConstraintError } from 'sequelize';
import {
  CustomError, errorHandler, errorHandlerCustom, notFoundHandler,
} from '../../src/utils/errorHandler.js';

function makeRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

describe('errorHandler', () => {
  it('uses the statusCode from a CustomError', () => {
    const res = makeRes();
    errorHandler(new CustomError('Not found', 404), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Not found',
    }));
  });

  it('defaults to 500 for a generic error', () => {
    const res = makeRes();
    errorHandler(new Error('boom'), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('maps ForeignKeyConstraintError to a 400 response', () => {
    const res = makeRes();
    const error = new ForeignKeyConstraintError({ message: 'fk violation' });
    errorHandler(error, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      errorName: 'ForeignKeyConstraintError',
    }));
  });
});

describe('errorHandlerCustom', () => {
  it('responds with the given status and message', () => {
    const res = makeRes();
    errorHandlerCustom(res, 'Client not found.', 404);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Client not found.',
      errorName: 'CustomError',
    });
  });
});

describe('notFoundHandler', () => {
  it('responds with a 404 including the requested route', () => {
    const res = makeRes();
    notFoundHandler({ method: 'GET', originalUrl: '/api/nope' }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: expect.stringContaining('GET /api/nope'),
    }));
  });
});
