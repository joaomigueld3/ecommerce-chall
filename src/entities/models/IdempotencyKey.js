import { Model, DataTypes } from 'sequelize';

class IdempotencyKey extends Model {
  static init(sequelize) {
    super.init(
      {
        idempotencyId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          field: 'idempotency_id',
        },
        idempotencyKey: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: 'idempotency_key',
        },
        clientId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'client_id',
          references: {
            model: 'Client',
            key: 'clientId',
          },
        },
        requestHash: {
          type: DataTypes.STRING(64),
          allowNull: false,
          field: 'request_hash',
        },
        orderId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'order_id',
          references: {
            model: 'Order',
            key: 'orderId',
          },
        },
        responseBody: {
          type: DataTypes.JSONB,
          allowNull: true,
          field: 'response_body',
        },
      },
      {
        sequelize,
        modelName: 'IdempotencyKey',
        tableName: 'table_idempotency_keys',
        timestamps: true,
        underscored: true,
        indexes: [
          {
            unique: true,
            fields: ['idempotency_key', 'client_id'],
            name: 'uq_idempotency_key_client',
          },
        ],
      },
    );
  }

  static associate(models) {
    this.belongsTo(models.Client, { foreignKey: 'clientId' });
    this.belongsTo(models.Order, { foreignKey: 'orderId' });
  }

  toDict() {
    return {
      idempotencyId: this.idempotencyId,
      idempotencyKey: this.idempotencyKey,
      clientId: this.clientId,
      requestHash: this.requestHash,
      orderId: this.orderId,
      responseBody: this.responseBody,
    };
  }
}

export default IdempotencyKey;
