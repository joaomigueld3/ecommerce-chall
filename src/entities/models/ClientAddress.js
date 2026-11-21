import { Model, DataTypes } from 'sequelize';

class ClientAddress extends Model {
  static init(sequelize) {
    super.init(
      {
        addressId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          field: 'address_id',
        },
        clientId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'client_id',
        },
        label: {
          type: DataTypes.STRING(60),
          allowNull: false,
          defaultValue: 'Home',
        },
        recipientName: {
          type: DataTypes.STRING(120),
          allowNull: false,
          field: 'recipient_name',
        },
        recipientPhone: {
          type: DataTypes.STRING(30),
          allowNull: true,
          field: 'recipient_phone',
        },
        country: {
          type: DataTypes.ENUM('BR', 'US', 'EU'),
          allowNull: false,
          defaultValue: 'BR',
        },
        postalCode: {
          type: DataTypes.STRING(24),
          allowNull: false,
          field: 'postal_code',
        },
        street: {
          type: DataTypes.STRING(180),
          allowNull: false,
        },
        number: {
          type: DataTypes.STRING(30),
          allowNull: false,
        },
        complement: {
          type: DataTypes.STRING(120),
          allowNull: true,
        },
        neighborhood: {
          type: DataTypes.STRING(120),
          allowNull: true,
        },
        city: {
          type: DataTypes.STRING(120),
          allowNull: false,
        },
        state: {
          type: DataTypes.STRING(60),
          allowNull: false,
        },
        reference: {
          type: DataTypes.STRING(200),
          allowNull: true,
        },
        isDefaultShipping: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_default_shipping',
        },
        isDefaultBilling: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_default_billing',
        },
      },
      {
        sequelize,
        modelName: 'ClientAddress',
        tableName: 'table_client_addresses',
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
      addressId: this.addressId,
      clientId: this.clientId,
      label: this.label,
      recipientName: this.recipientName,
      recipientPhone: this.recipientPhone,
      country: this.country,
      postalCode: this.postalCode,
      street: this.street,
      number: this.number,
      complement: this.complement,
      neighborhood: this.neighborhood,
      city: this.city,
      state: this.state,
      reference: this.reference,
      isDefaultShipping: this.isDefaultShipping,
      isDefaultBilling: this.isDefaultBilling,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default ClientAddress;
