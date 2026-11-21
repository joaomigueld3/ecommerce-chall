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
        phone: {
          type: DataTypes.STRING(30),
          allowNull: true,
        },
        email: {
          type: DataTypes.STRING(150),
          allowNull: true,
        },
        documentType: {
          type: DataTypes.ENUM('CPF', 'CNPJ', 'TAX_ID', 'VAT_ID'),
          allowNull: true,
          field: 'document_type',
        },
        documentNumber: {
          type: DataTypes.STRING(40),
          allowNull: true,
          unique: true,
          field: 'document_number',
        },
        birthDate: {
          type: DataTypes.DATEONLY,
          allowNull: true,
          field: 'birth_date',
        },
        country: {
          type: DataTypes.ENUM('BR', 'US', 'EU'),
          allowNull: false,
          defaultValue: 'BR',
        },
        address: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        tier: {
          type: DataTypes.ENUM('Standard', 'Prime', 'VIP'),
          allowNull: false,
          defaultValue: 'Standard',
        },
        loyaltyPoints: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'loyalty_points',
        },
        creditBalance: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0.0,
          field: 'credit_balance',
        },
        internalNotes: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: 'internal_notes',
        },
        blockedReason: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'blocked_reason',
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
    this.hasMany(models.ClientAddress, { as: 'addresses', foreignKey: 'clientId' });
    this.hasMany(models.SavedPaymentMethod, { as: 'paymentMethods', foreignKey: 'clientId' });
    this.hasMany(models.Wishlist, { as: 'wishlists', foreignKey: 'clientId' });
  }

  toDict({ includeInternal = true } = {}) {
    const base = {
      clientId: this.clientId,
      userId: this.userId,
      fullName: this.fullName,
      contact: this.contact,
      phone: this.phone,
      email: this.email,
      documentType: this.documentType,
      documentNumber: this.documentNumber,
      birthDate: this.birthDate,
      country: this.country,
      address: this.address,
      tier: this.tier,
      loyaltyPoints: this.loyaltyPoints,
      creditBalance: this.creditBalance,
      status: this.status,
      blockedReason: this.blockedReason,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
    if (includeInternal) {
      base.internalNotes = this.internalNotes;
    }
    return base;
  }
}

export default Client;
