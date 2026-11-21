class StockMovementRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data, options = {}) {
    return this.model.create(data, options);
  }

  async findAndCount(where = {}, options = {}) {
    return this.model.findAndCountAll({
      where,
      ...options,
    });
  }

  async findAll(where = {}, options = {}) {
    return this.model.findAll({
      where,
      ...options,
    });
  }

  async countByProductId(productId) {
    return this.model.count({ where: { productId } });
  }
}

export default StockMovementRepository;
