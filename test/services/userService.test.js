import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import UserService from '../../src/entities/services/UserService.js';

function makeRepository() {
  return {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateByEmail: vi.fn(),
    delete: vi.fn(),
    findByFilters: vi.fn(),
  };
}

describe('UserService', () => {
  let repository;
  let service;

  beforeEach(() => {
    repository = makeRepository();
    service = new UserService(repository);
  });

  describe('createUser', () => {
    it('rejects when the email is already in use', async () => {
      repository.findByEmail.mockResolvedValue({ id: 1, email: 'a@a.com' });

      await expect(
        service.createUser({ name: 'A', email: 'a@a.com', password: 'password123', type: 'Client' }),
      ).rejects.toMatchObject({ message: 'Email already in use.', statusCode: 400 });

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('hashes the password before persisting', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockImplementation(async (user) => ({ id: 1, ...user }));

      const created = await service.createUser({
        name: 'A', email: 'a@a.com', password: 'password123', type: 'Client',
      });

      expect(created.password).not.toBe('password123');
      const matches = await bcrypt.compare('password123', created.password);
      expect(matches).toBe(true);
    });
  });

  describe('login', () => {
    it('rejects when the user does not exist', async () => {
      repository.findByEmail.mockResolvedValue(null);

      await expect(service.login('missing@a.com', 'password123'))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    it('rejects when the email has not been confirmed', async () => {
      repository.findByEmail.mockResolvedValue({ confirmed: false, password: 'hash' });

      await expect(service.login('a@a.com', 'password123'))
        .rejects.toMatchObject({ message: 'Please confirm your email to login', statusCode: 400 });
    });

    it('rejects when the password does not match', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 10);
      repository.findByEmail.mockResolvedValue({ confirmed: true, password: hashedPassword });

      await expect(service.login('a@a.com', 'wrong-password'))
        .rejects.toMatchObject({ message: 'Wrong password.', statusCode: 400 });
    });

    it('returns the user when credentials are valid', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 10);
      const user = {
        confirmed: true, password: hashedPassword, id: 1, email: 'a@a.com',
      };
      repository.findByEmail.mockResolvedValue(user);

      await expect(service.login('a@a.com', 'correct-password')).resolves.toBe(user);
    });
  });

  describe('changePassword', () => {
    it('rejects when the user does not exist', async () => {
      repository.findByEmail.mockResolvedValue(null);

      await expect(service.changePassword('missing@a.com', 'password123'))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    it('hashes and persists the new password', async () => {
      repository.findByEmail.mockResolvedValue({ email: 'a@a.com' });
      repository.updateByEmail.mockResolvedValue([1]);

      await service.changePassword('a@a.com', 'new-password');

      expect(repository.updateByEmail).toHaveBeenCalledWith('a@a.com', expect.objectContaining({
        password: expect.any(String),
      }));
      const [, { password }] = repository.updateByEmail.mock.calls[0];
      expect(password).not.toBe('new-password');
    });
  });
});
