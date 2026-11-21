import { Model, DataTypes } from 'sequelize';

class StoreSetting extends Model {
  static init(sequelize) {
    super.init(
      {
        settingId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          field: 'setting_id',
        },
        storeName: {
          type: DataTypes.STRING(120),
          allowNull: false,
          defaultValue: 'omni.store',
          field: 'store_name',
        },
        shortPrefix: {
          type: DataTypes.STRING(40),
          allowNull: false,
          defaultValue: 'omni',
          field: 'short_prefix',
        },
        shortSuffix: {
          type: DataTypes.STRING(40),
          allowNull: false,
          defaultValue: '.store',
          field: 'short_suffix',
        },
        tagline: {
          type: DataTypes.STRING(240),
          allowNull: true,
          defaultValue: 'Everything you need, delivered fast.',
        },
        logoUrl: {
          type: DataTypes.STRING(500),
          allowNull: true,
          field: 'logo_url',
        },
        primaryColor: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: '#0094b6',
          field: 'primary_color',
        },
        accentColor: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: '#00b4d8',
          field: 'accent_color',
        },
        defaultRegion: {
          type: DataTypes.ENUM('BR', 'US', 'EU'),
          allowNull: false,
          defaultValue: 'US',
          field: 'default_region',
        },
        freeShippingThresholdBr: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 200.0,
          field: 'free_shipping_threshold_br',
        },
        freeShippingThresholdUs: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 50.0,
          field: 'free_shipping_threshold_us',
        },
        freeShippingThresholdEu: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 50.0,
          field: 'free_shipping_threshold_eu',
        },
        supportEmail: {
          type: DataTypes.STRING(150),
          allowNull: true,
          defaultValue: 'support@omni.store',
          field: 'support_email',
        },
        supportPhone: {
          type: DataTypes.STRING(40),
          allowNull: true,
          field: 'support_phone',
        },
        legalEntityName: {
          type: DataTypes.STRING(160),
          allowNull: true,
          defaultValue: 'Omni Store Commerce Ltd.',
          field: 'legal_entity_name',
        },
        taxId: {
          type: DataTypes.STRING(60),
          allowNull: true,
          field: 'tax_id',
        },
      },
      {
        sequelize,
        modelName: 'StoreSetting',
        tableName: 'table_store_settings',
        timestamps: true,
        underscored: true,
      },
    );
  }

  static associate() {}

  toDict() {
    return {
      settingId: this.settingId,
      storeName: this.storeName,
      shortPrefix: this.shortPrefix,
      shortSuffix: this.shortSuffix,
      tagline: this.tagline,
      logoUrl: this.logoUrl,
      primaryColor: this.primaryColor,
      accentColor: this.accentColor,
      defaultRegion: this.defaultRegion,
      freeShippingThresholdBr: Number(this.freeShippingThresholdBr),
      freeShippingThresholdUs: Number(this.freeShippingThresholdUs),
      freeShippingThresholdEu: Number(this.freeShippingThresholdEu),
      supportEmail: this.supportEmail,
      supportPhone: this.supportPhone,
      legalEntityName: this.legalEntityName,
      taxId: this.taxId,
      updatedAt: this.updatedAt,
    };
  }
}

export default StoreSetting;
