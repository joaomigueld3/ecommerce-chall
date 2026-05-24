import { Model, DataTypes } from 'sequelize';

class Order extends Model {
  static init(sequelize) {
    super.init(
      {
        orderId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          unique: true,
          field: 'order_id',
        },
        clientId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'client_id',
          references: {
            model: 'Client',
            key: 'id',
          },
        },
        status: {
          type: DataTypes.ENUM('Received', 'In Preparation', 'Dispatched', 'Delivered', 'Cancelled'),
          allowNull: false,
        },
        orderDate: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: 'order_date',
        },
        total: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'Order',
        tableName: 'table_orders',
        timestamps: false,
        underscored: true,
      },
    );
  }

  static associate(models) {
    this.belongsTo(models.Client, { foreignKey: 'clientId' });
    this.hasMany(models.OrderItem, { foreignKey: 'orderId' });
  }

  toDict() {
    return {
      id: this.id,
      status: this.status,
      orderDate: this.orderDate,
      total: this.total,
    };
  }
}
export default Order;
