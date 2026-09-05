import { describe, it, expect, vi } from 'vitest';
import { authorize, selfOrAdmin } from '../../src/utils/authorize.js';

function makeRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

describe('authorize', () => {
  it('rejects unauthenticated requests', () => {
    const req = {};
    const res = makeRes();
    const next = vi.fn();

    authorize('Admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks a user type that is not in the allowed list', () => {
    const req = { user: { type: 'Client' } };
    const res = makeRes();
    const next = vi.fn();

    authorize('Admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a user type that is in the allowed list', () => {
    const req = { user: { type: 'Admin' } };
    const res = makeRes();
    const next = vi.fn();

    authorize('Admin', 'Client')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('selfOrAdmin', () => {
  it('allows an Admin to access any id', () => {
    const req = { user: { type: 'Admin', id: 1 }, params: { id: '999' } };
    const res = makeRes();
    const next = vi.fn();

    selfOrAdmin('id')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('allows a Client to access their own id', () => {
    const req = { user: { type: 'Client', id: 42 }, params: { id: '42' } };
    const res = makeRes();
    const next = vi.fn();

    selfOrAdmin('id')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('blocks a Client from accessing another id', () => {
    const req = { user: { type: 'Client', id: 42 }, params: { id: '7' } };
    const res = makeRes();
    const next = vi.fn();

    selfOrAdmin('id')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
