import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidCnpj,
  isValidCpf,
  validateRegionalDocument,
} from '../src/utils/documentValidator.js';
import ClientProfileService from '../src/entities/services/ClientProfileService.js';
import ClientService from '../src/entities/services/ClientService.js';

describe('Phase 3 unit tests (Regional Documents, CRM Metrics & Safe Client Deactivation)', () => {
  it('validates Brazilian CPF/CNPJ, US Tax ID and EU VAT ID accurately', () => {
    assert.equal(isValidCpf('52998224725'), true);
    assert.equal(isValidCpf('11111111111'), false);
    assert.equal(isValidCpf('52998224720'), false);

    assert.equal(isValidCnpj('11.222.333/0001-81'), true);
    assert.equal(isValidCnpj('11.222.333/0001-00'), false);

    assert.deepEqual(validateRegionalDocument('CPF', '529.982.247-25'), {
      valid: true,
      normalized: '52998224725',
    });
    assert.deepEqual(validateRegionalDocument('TAX_ID', '123-45-6789'), {
      valid: true,
      normalized: '123456789',
    });
    assert.deepEqual(validateRegionalDocument('VAT_ID', 'de 123456789'), {
      valid: true,
      normalized: 'DE123456789',
    });

    assert.equal(validateRegionalDocument('VAT_ID', '12345').valid, false);
    assert.equal(validateRegionalDocument('TAX_ID', '123').valid, false);
  });

  it('computes CRM LTV, average ticket, cancellation rate and last order date', () => {
    const metrics = ClientProfileService.computeCrmMetrics([
      { status: 'Delivered', total: '200.00', orderDate: '2026-11-10T10:00:00.000Z' },
      { status: 'Received', total: '100.00', orderDate: '2026-11-18T10:00:00.000Z' },
      { status: 'Cancelled', total: '50.00', orderDate: '2026-11-12T10:00:00.000Z' },
      { status: 'Pending Payment', total: '80.00', orderDate: '2026-11-19T10:00:00.000Z' },
    ]);

    assert.equal(metrics.totalOrders, 4);
    assert.equal(metrics.paidOrdersCount, 2);
    assert.equal(metrics.cancelledOrdersCount, 1);
    assert.equal(metrics.cancellationRate, 25);
    assert.equal(metrics.ltv, '300.00');
    assert.equal(metrics.averageOrderValue, '150.00');
    assert.equal(metrics.lastOrderDate, '2026-11-19T10:00:00.000Z');
  });

  it('safely deactivates a client with order history instead of hard-deleting', async () => {
    const updates = [];
    const hardDeletes = [];
    const fakeRepo = {
      findById: async (id) => ({ clientId: id, status: true, blockedReason: null }),
      update: async (id, patch) => { updates.push({ id, patch }); },
      delete: async (id) => { hardDeletes.push(id); },
    };

    const withOrders = new ClientService(fakeRepo, { Order: { count: async () => 3 } });
    const res1 = await withOrders.deleteClient(5);
    assert.equal(res1.deactivated, true);
    assert.equal(updates[0].patch.status, false);
    assert.equal(hardDeletes.length, 0);

    const withoutOrders = new ClientService(fakeRepo, { Order: { count: async () => 0 } });
    const res2 = await withoutOrders.deleteClient(6);
    assert.equal(res2.deactivated, false);
    assert.deepEqual(hardDeletes, [6]);
  });
});
