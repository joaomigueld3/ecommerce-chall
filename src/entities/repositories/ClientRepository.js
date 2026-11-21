import { Op } from 'sequelize';

class ClientRepository {
  constructor(client) {
    this.client = client;
  }

  async findById(clientId, options = {}) {
    return this.client.findByPk(clientId, options);
  }

  async findByUserId(userId, options = {}) {
    return this.client.findOne({
      where: {
        userId,
      },
      ...options,
    });
  }

  async findByContact(contact) {
    return this.client.findOne({
      where: {
        contact,
      },
    });
  }

  async findAll(options = {}) {
    return this.client.findAll(options);
  }

  async create(client) {
    return this.client.create(client);
  }

  async update(clientId, updatedClient) {
    return this.client.update(updatedClient, {
      where: {
        clientId,
      },
    });
  }

  async delete(clientId) {
    return this.client.destroy({
      where: {
        clientId,
      },
    });
  }

  async findByName(name) {
    try {
      const clients = await this.client.findAll({
        where: {
          fullName: {
            [Op.iLike]: `%${name}%`,
          },
        },
      });
      return clients;
    } catch (e) {
      throw new Error(e);
    }
  }

  async findByFilters(filters, options = {}) {
    try {
      const clients = await this.client.findAll({
        where: filters,
        ...options,
      });
      return clients;
    } catch (e) {
      throw new Error(e);
    }
  }

  async findAndCountByFilters(filters = {}, options = {}) {
    try {
      return await this.client.findAndCountAll({
        where: filters,
        ...options,
      });
    } catch (e) {
      throw new Error(e);
    }
  }
}

export default ClientRepository;
