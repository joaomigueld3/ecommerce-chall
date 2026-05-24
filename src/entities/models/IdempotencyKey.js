import { Model, DataTypes } from 'sequelize';

class IdempotencyKey extends Model {
  static init(sequelize) {
    super.init(
      {
        idempotencyKeyId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          field: 'idempotency_key_id',
        },
        key: {
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
        responseStatus: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'response_status',
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
            name: 'unique_idempotency_key_per_client',
            fields: ['idempotency_key', 'client_id'],
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
      idempotencyKeyId: this.idempotencyKeyId,
      key: this.key,
      clientId: this.clientId,
      requestHash: this.requestHash,
      orderId: this.orderId,
      responseStatus: this.responseStatus,
      responseBody: this.responseBody,
    };
  }
}

export default IdempotencyKey;
