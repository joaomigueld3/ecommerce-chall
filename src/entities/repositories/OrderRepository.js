class OrderRepository {
  constructor(orderModel) {
    this.orderModel = orderModel;
  }

  async findById(orderId, options = {}) {
    return this.orderModel.findByPk(orderId, options);
  }

  async findAll() {
    return this.orderModel.findAll();
  }

  async create(orderData, options = {}) {
    return this.orderModel.create(orderData, options);
  }

  async update(orderId, updateOrderData, options = {}) {
    const order = await this.findById(orderId, options);
    if (order) {
      return order.update(updateOrderData, options);
    }
    return null;
  }

  async delete(orderId) {
    return this.orderModel.destroy({
      where: {
        orderId,
      },
    });
  }

  async findByFilters(filters) {
    try {
      const orders = await this.orderModel.findAll({
        where: filters,
      });
      return orders;
    } catch (e) {
      throw new Error(e);
    }
  }
}

export default OrderRepository;
