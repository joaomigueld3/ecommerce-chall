import { Model, DataTypes } from 'sequelize';

class Client extends Model {
  static init(sequelize) {
    super.init(
      {
        clientId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          unique: true,
          field: 'client_id',
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'user_id',
          references: {
            model: 'User',
            key: 'id',
          },
        },
        fullName: {
          type: DataTypes.STRING(80),
          allowNull: false,
          field: 'full_name',
          set(value) {
            this.setDataValue('fullName', value.toUpperCase());
          },
        },
        contact: {
          type: DataTypes.STRING(30),
          allowNull: false,
          unique: true,
        },
        address: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        sequelize,
        modelName: 'Client',
        tableName: 'table_clients',
        timestamps: true,
        underscored: true,
      },
    );
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'userId', unique: true });
    this.hasMany(models.Order, { foreignKey: 'clientId' });
  }

  toDict() {
    return {
      clientId: this.clientId,
      userId: this.userId,
      fullName: this.fullName,
      contact: this.contact,
      address: this.address,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default Client;
