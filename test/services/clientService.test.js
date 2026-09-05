import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';
import ClientService from '../../src/entities/services/ClientService.js';

describe('ClientService.createClient', () => {
  let repository;
  let service;

  beforeEach(() => {
    repository = {
      findByContact: vi.fn(),
      create: vi.fn(),
    };
    service = new ClientService(repository);
  });

  it('rejects when the contact is already registered', async () => {
    repository.findByContact.mockResolvedValue({ clientId: 1 });

    await expect(service.createClient({ contact: '11999999999' }))
      .rejects.toMatchObject({ message: 'Contact already in use.', statusCode: 400 });

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('creates the client when the contact is free', async () => {
    repository.findByContact.mockResolvedValue(null);
    repository.create.mockResolvedValue({ clientId: 1, contact: '11999999999' });

    const client = { contact: '11999999999' };
    await expect(service.createClient(client)).resolves.toEqual({ clientId: 1, contact: '11999999999' });
    expect(repository.create).toHaveBeenCalledWith(client);
  });
});
