import { Model, DataTypes } from 'sequelize';

class SavedPaymentMethod extends Model {
  static init(sequelize) {
    super.init(
      {
        paymentMethodId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          field: 'payment_method_id',
        },
        clientId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'client_id',
        },
        brand: {
          type: DataTypes.STRING(40),
          allowNull: false,
        },
        holderName: {
          type: DataTypes.STRING(120),
          allowNull: false,
          field: 'holder_name',
        },
        last4: {
          type: DataTypes.STRING(4),
          allowNull: false,
        },
        expMonth: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'exp_month',
        },
        expYear: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'exp_year',
        },
        nickname: {
          type: DataTypes.STRING(80),
          allowNull: true,
        },
        isDefault: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_default',
        },
      },
      {
        sequelize,
        modelName: 'SavedPaymentMethod',
        tableName: 'table_saved_payment_methods',
        timestamps: true,
        underscored: true,
      },
    );
  }

  static associate(models) {
    this.belongsTo(models.Client, { foreignKey: 'clientId' });
  }

  toDict() {
    return {
      paymentMethodId: this.paymentMethodId,
      clientId: this.clientId,
      brand: this.brand,
      holderName: this.holderName,
      last4: this.last4,
      expMonth: this.expMonth,
      expYear: this.expYear,
      nickname: this.nickname,
      isDefault: this.isDefault,
      createdAt: this.createdAt,
    };
  }
}

export default SavedPaymentMethod;
