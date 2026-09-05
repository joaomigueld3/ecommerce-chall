import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';
import jwt from 'jsonwebtoken';

vi.mock('../../src/entities/models/User.js', () => ({
  default: { findByPk: vi.fn() },
}));

// eslint-disable-next-line import/first
import User from '../../src/entities/models/User.js';
// eslint-disable-next-line import/first
import authenticateToken from '../../src/utils/middlewareAuth.js';

const SECRET = 'test-secret';

function makeRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

function signToken(payload, secret = SECRET) {
  return jwt.sign(payload, secret, { expiresIn: '1h' });
}

describe('authenticateToken', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
    User.findByPk.mockReset();
  });

  it('rejects a request with no authorization header', async () => {
    const req = { headers: {} };
    const res = makeRes();
    const next = vi.fn();

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an invalid token', async () => {
    const req = { headers: { authorization: 'Bearer not-a-real-token' } };
    const res = makeRes();
    const next = vi.fn();

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a token signed with the wrong secret', async () => {
    const token = signToken({ id: 1, email: 'a@a.com', type: 'Client' }, 'wrong-secret');
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();
    const next = vi.fn();

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a valid token when the user no longer exists', async () => {
    User.findByPk.mockResolvedValue(null);
    const token = signToken({ id: 1, email: 'a@a.com', type: 'Client' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();
    const next = vi.fn();

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches req.user and calls next for a valid token', async () => {
    User.findByPk.mockResolvedValue({ id: 1, email: 'a@a.com' });
    const token = signToken({ id: 1, email: 'a@a.com', type: 'Client' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();
    const next = vi.fn();

    await authenticateToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({ id: 1, email: 'a@a.com', type: 'Client' });
  });

  it('accepts a raw token without the Bearer prefix', async () => {
    User.findByPk.mockResolvedValue({ id: 1 });
    const token = signToken({ id: 1, email: 'a@a.com', type: 'Admin' });
    const req = { headers: { authorization: token } };
    const res = makeRes();
    const next = vi.fn();

    await authenticateToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
