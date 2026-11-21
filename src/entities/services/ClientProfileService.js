import { CustomError } from '../../utils/errorHandler.js';

const PAID_ORDER_STATUSES = ['Received', 'In Preparation', 'Dispatched', 'Delivered'];

class ClientProfileService {
  constructor(models, connection) {
    this.Client = models.Client;
    this.ClientAddress = models.ClientAddress;
    this.SavedPaymentMethod = models.SavedPaymentMethod;
    this.Order = models.Order;
    this.User = models.User;
    this.connection = connection;
  }

  static computeCrmMetrics(orders = []) {
    const totalOrders = orders.length;
    const paidOrders = orders.filter((o) => PAID_ORDER_STATUSES.includes(o.status));
    const cancelledOrders = orders.filter((o) => o.status === 'Cancelled');

    const ltvCents = paidOrders.reduce(
      (sum, order) => sum + Math.round(parseFloat(order.total || 0) * 100),
      0,
    );
    const avgCents = paidOrders.length > 0 ? Math.round(ltvCents / paidOrders.length) : 0;
    const cancellationRate = totalOrders > 0
      ? Number(((cancelledOrders.length / totalOrders) * 100).toFixed(1))
      : 0;

    const sortedDates = orders
      .map((o) => new Date(o.orderDate))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => b - a);

    return {
      totalOrders,
      paidOrdersCount: paidOrders.length,
      cancelledOrdersCount: cancelledOrders.length,
      cancellationRate,
      ltv: (ltvCents / 100).toFixed(2),
      averageOrderValue: (avgCents / 100).toFixed(2),
      lastOrderDate: sortedDates[0] ? sortedDates[0].toISOString() : null,
    };
  }

  async listAddresses(clientId) {
    const client = await this.Client.findByPk(clientId);
    if (!client) throw new CustomError('Client not found.', 404);

    const addresses = await this.ClientAddress.findAll({
      where: { clientId },
      order: [['isDefaultShipping', 'DESC'], ['addressId', 'DESC']],
    });
    return addresses.map((a) => (a.toDict ? a.toDict() : a));
  }

  async createAddress(clientId, payload) {
    return this.connection.transaction(async (transaction) => {
      const client = await this.Client.findByPk(clientId, { transaction });
      if (!client) throw new CustomError('Client not found.', 404);

      const existingCount = await this.ClientAddress.count({
        where: { clientId },
        transaction,
      });

      const isDefaultShipping = existingCount === 0 ? true : Boolean(payload.isDefaultShipping);
      const isDefaultBilling = existingCount === 0 ? true : Boolean(payload.isDefaultBilling);

      if (isDefaultShipping) {
        await this.ClientAddress.update(
          { isDefaultShipping: false },
          { where: { clientId }, transaction },
        );
      }
      if (isDefaultBilling) {
        await this.ClientAddress.update(
          { isDefaultBilling: false },
          { where: { clientId }, transaction },
        );
      }

      const created = await this.ClientAddress.create(
        {
          ...payload,
          clientId: Number(clientId),
          isDefaultShipping,
          isDefaultBilling,
        },
        { transaction },
      );

      return created.toDict ? created.toDict() : created;
    });
  }

  async updateAddress(clientId, addressId, payload) {
    return this.connection.transaction(async (transaction) => {
      const address = await this.ClientAddress.findOne({
        where: { addressId, clientId },
        transaction,
      });
      if (!address) throw new CustomError('Address not found.', 404);

      if (payload.isDefaultShipping) {
        await this.ClientAddress.update(
          { isDefaultShipping: false },
          { where: { clientId }, transaction },
        );
      }
      if (payload.isDefaultBilling) {
        await this.ClientAddress.update(
          { isDefaultBilling: false },
          { where: { clientId }, transaction },
        );
      }

      const updated = await address.update(payload, { transaction });
      return updated.toDict ? updated.toDict() : updated;
    });
  }

  async deleteAddress(clientId, addressId) {
    const address = await this.ClientAddress.findOne({
      where: { addressId, clientId },
    });
    if (!address) throw new CustomError('Address not found.', 404);
    await address.destroy();
    return address.toDict ? address.toDict() : address;
  }

  async listPaymentMethods(clientId) {
    const client = await this.Client.findByPk(clientId);
    if (!client) throw new CustomError('Client not found.', 404);

    const methods = await this.SavedPaymentMethod.findAll({
      where: { clientId },
      order: [['isDefault', 'DESC'], ['paymentMethodId', 'DESC']],
    });
    return methods.map((m) => (m.toDict ? m.toDict() : m));
  }

  async createPaymentMethod(clientId, payload) {
    return this.connection.transaction(async (transaction) => {
      const client = await this.Client.findByPk(clientId, { transaction });
      if (!client) throw new CustomError('Client not found.', 404);

      const existingCount = await this.SavedPaymentMethod.count({
        where: { clientId },
        transaction,
      });
      const isDefault = existingCount === 0 ? true : Boolean(payload.isDefault);

      if (isDefault) {
        await this.SavedPaymentMethod.update(
          { isDefault: false },
          { where: { clientId }, transaction },
        );
      }

      const created = await this.SavedPaymentMethod.create(
        {
          clientId: Number(clientId),
          brand: payload.brand,
          holderName: payload.holderName,
          last4: payload.last4,
          expMonth: payload.expMonth ?? null,
          expYear: payload.expYear ?? null,
          nickname: payload.nickname ?? null,
          isDefault,
        },
        { transaction },
      );

      return created.toDict ? created.toDict() : created;
    });
  }

  async setDefaultPaymentMethod(clientId, paymentMethodId) {
    return this.connection.transaction(async (transaction) => {
      const method = await this.SavedPaymentMethod.findOne({
        where: { paymentMethodId, clientId },
        transaction,
      });
      if (!method) throw new CustomError('Payment method not found.', 404);

      await this.SavedPaymentMethod.update(
        { isDefault: false },
        { where: { clientId }, transaction },
      );

      const updated = await method.update({ isDefault: true }, { transaction });
      return updated.toDict ? updated.toDict() : updated;
    });
  }

  async deletePaymentMethod(clientId, paymentMethodId) {
    const method = await this.SavedPaymentMethod.findOne({
      where: { paymentMethodId, clientId },
    });
    if (!method) throw new CustomError('Payment method not found.', 404);
    await method.destroy();
    return method.toDict ? method.toDict() : method;
  }

  async getClientOverview(clientId) {
    const client = await this.Client.findByPk(clientId, {
      include: [
        { model: this.User, attributes: ['id', 'name', 'email', 'type', 'confirmed', 'createdAt'], required: false },
      ],
    });
    if (!client) throw new CustomError('Client not found.', 404);

    const [addresses, paymentMethods, orders] = await Promise.all([
      this.ClientAddress.findAll({
        where: { clientId },
        order: [['isDefaultShipping', 'DESC'], ['addressId', 'DESC']],
      }),
      this.SavedPaymentMethod.findAll({
        where: { clientId },
        order: [['isDefault', 'DESC'], ['paymentMethodId', 'DESC']],
      }),
      this.Order.findAll({
        where: { clientId },
        order: [['orderId', 'DESC']],
      }),
    ]);

    const plainOrders = orders.map((o) => (o.toDict ? o.toDict() : o));
    const crm = ClientProfileService.computeCrmMetrics(plainOrders);

    return {
      client: client.toDict({ includeInternal: true }),
      linkedUser: client.User ? {
        id: client.User.id,
        name: client.User.name,
        email: client.User.email,
        type: client.User.type,
        confirmed: client.User.confirmed,
        createdAt: client.User.createdAt,
      } : null,
      crm,
      addresses: addresses.map((a) => (a.toDict ? a.toDict() : a)),
      paymentMethods: paymentMethods.map((m) => (m.toDict ? m.toDict() : m)),
      orders: plainOrders,
    };
  }

  async updateClientCrm(clientId, payload) {
    const client = await this.Client.findByPk(clientId);
    if (!client) throw new CustomError('Client not found.', 404);

    const updated = await client.update(payload);
    return updated.toDict({ includeInternal: true });
  }
}

export default ClientProfileService;
