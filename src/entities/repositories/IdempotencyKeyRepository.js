class IdempotencyKeyRepository {
  constructor(model) {
    this.model = model;
  }

  async findByKeyAndClient(idempotencyKey, clientId, options = {}) {
    return this.model.findOne({
      where: { idempotencyKey, clientId },
      ...options,
    });
  }

  async create(idempotencyData, options = {}) {
    return this.model.create(idempotencyData, options);
  }
}

export default IdempotencyKeyRepository;
