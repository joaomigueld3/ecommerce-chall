class SalesReportRepository {
  constructor(model) {
    this.model = model;
  }

  async create(reportData, options = {}) {
    return this.model.create(reportData, options);
  }

  async findAll(options = {}) {
    return this.model.findAll({
      order: [['reportId', 'DESC']],
      ...options,
    });
  }

  async findById(reportId, options = {}) {
    return this.model.findByPk(reportId, options);
  }

  async update(reportId, updatedData, options = {}) {
    const report = await this.findById(reportId, options);
    if (!report) return null;
    return report.update(updatedData, options);
  }

  async delete(reportId) {
    return this.model.destroy({
      where: { reportId },
    });
  }

  async findByFilters(filters, options = {}) {
    return this.model.findAll({
      where: filters,
      order: [['reportId', 'DESC']],
      ...options,
    });
  }

  async findAndCountByFilters(filters = {}, options = {}) {
    return this.model.findAndCountAll({
      where: filters,
      order: [['reportId', 'DESC']],
      ...options,
    });
  }
}

export default SalesReportRepository;
