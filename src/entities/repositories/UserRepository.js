class UserRepository {
  constructor(user) {
    this.user = user;
  }

  async findById(id) {
    return this.user.findByPk(id);
  }

  async findByEmail(email) {
    return this.user.findOne({
      where: {
        email,
      },
    });
  }

  async findAll(options = {}) {
    return this.user.findAll(options);
  }

  async create(user) {
    return this.user.create(user);
  }

  async update(id, updatedUser) {
    return this.user.update(updatedUser, {
      where: {
        id,
      },
    });
  }

  async updateByEmail(email, updatedUser) {
    return this.user.update(updatedUser, {
      where: {
        email,
      },
    });
  }

  async delete(id) {
    return this.user.destroy({
      where: {
        id,
      },
    });
  }

  async findByFilters(filters, options = {}) {
    try {
      const users = await this.user.findAll({
        where: filters,
        ...options,
      });
      return users;
    } catch (e) {
      throw new Error(e);
    }
  }

  async findAndCountByFilters(filters = {}, options = {}) {
    try {
      return await this.user.findAndCountAll({
        where: filters,
        ...options,
      });
    } catch (e) {
      throw new Error(e);
    }
  }
}

export default UserRepository;
