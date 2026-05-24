class IdempotencyKeyRepository {
  constructor(model) {
    this.model = model;
  }

  async findByKeyAndClient(key, clientId, options = {}) {
    return this.model.findOne({
      where: {
        key,
        clientId,
      },
      ...options,
    });
  }

  async create(idempotencyData, options = {}) {
    return this.model.create(idempotencyData, options);
  }

  async update(record, idempotencyData, options = {}) {
    return record.update(idempotencyData, options);
  }
}

export default IdempotencyKeyRepository;
