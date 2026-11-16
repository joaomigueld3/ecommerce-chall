/*
 * Pure unit tests for UserService (account creation, password hashing, login, confirmation).
 * Run with: npm run test:unit
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';

import UserService from '../src/entities/services/UserService.js';
import { CustomError } from '../src/utils/errorHandler.js';

function createMockUserRepository(initialUsers = []) {
  const users = [...initialUsers];
  let nextId = users.length + 1;

  return {
    users,
    async findByEmail(email) {
      return users.find((u) => u.email === email) || null;
    },
    async findById(id) {
      return users.find((u) => u.id === Number(id)) || null;
    },
    async create(data) {
      const created = { id: nextId, ...data };
      nextId += 1;
      users.push(created);
      return created;
    },
    async updateByEmail(email, patch) {
      const user = users.find((u) => u.email === email);
      if (!user) return [0];
      Object.assign(user, patch);
      return [1];
    },
  };
}

describe('UserService (account creation & authentication)', () => {
  it('creates a new Client account with hashed password and confirmed=false by default', async () => {
    const repo = createMockUserRepository();
    const service = new UserService(repo);

    const created = await service.createUser({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'Password123',
    });

    assert.equal(created.email, 'alice@example.com');
    assert.equal(created.type, 'Client');
    assert.equal(created.confirmed, false);
    assert.notEqual(created.password, 'Password123');
    assert.equal(await bcrypt.compare('Password123', created.password), true);
  });

  it('rejects duplicate email registration with 400 CustomError', async () => {
    const repo = createMockUserRepository([
      { id: 1, name: 'EXISTING', email: 'taken@example.com', password: 'hash', type: 'Client', confirmed: true },
    ]);
    const service = new UserService(repo);

    await assert.rejects(
      () => service.createUser({ name: 'Bob', email: 'taken@example.com', password: 'Password123' }),
      (error) => error instanceof CustomError && error.statusCode === 400 && /Email already in use/.test(error.message),
    );
  });

  it('rejects login when user does not exist (404), is unconfirmed (400), or password mismatches (400)', async () => {
    const hash = await bcrypt.hash('CorrectPass1', 10);
    const repo = createMockUserRepository([
      { id: 1, email: 'unconfirmed@example.com', password: hash, type: 'Client', confirmed: false },
      { id: 2, email: 'confirmed@example.com', password: hash, type: 'Client', confirmed: true },
    ]);
    const service = new UserService(repo);

    await assert.rejects(
      () => service.login('missing@example.com', 'CorrectPass1'),
      (error) => error instanceof CustomError && error.statusCode === 404,
    );

    await assert.rejects(
      () => service.login('unconfirmed@example.com', 'CorrectPass1'),
      (error) => error instanceof CustomError && error.statusCode === 400 && /confirm your email/i.test(error.message),
    );

    await assert.rejects(
      () => service.login('confirmed@example.com', 'WrongPass1'),
      (error) => error instanceof CustomError && error.statusCode === 400 && /Wrong password/i.test(error.message),
    );
  });

  it('logs in a confirmed user with matching password and hashes changed passwords', async () => {
    const hash = await bcrypt.hash('OldPass123', 10);
    const repo = createMockUserRepository([
      { id: 1, email: 'user@example.com', password: hash, type: 'Client', confirmed: true },
    ]);
    const service = new UserService(repo);

    const loggedIn = await service.login('user@example.com', 'OldPass123');
    assert.equal(loggedIn.id, 1);

    await service.changePassword('user@example.com', 'NewPass456');
    const updated = await service.login('user@example.com', 'NewPass456');
    assert.equal(updated.id, 1);
  });
});
