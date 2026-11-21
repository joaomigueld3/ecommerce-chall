import { Model, DataTypes } from 'sequelize';

class ProductVariant extends Model {
  static init(sequelize) {
    super.init(
      {
        variantId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          field: 'variant_id',
        },
        productId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'product_id',
        },
        sku: {
          type: DataTypes.STRING(64),
          allowNull: false,
          unique: true,
        },
        name: {
          type: DataTypes.STRING(120),
          allowNull: false,
        },
        attributes: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        priceOverride: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          field: 'price_override',
        },
        quantityInStock: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'quantity_in_stock',
        },
        active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        sequelize,
        modelName: 'ProductVariant',
        tableName: 'table_product_variants',
        timestamps: true,
        underscored: true,
      },
    );
  }

  static associate(models) {
    this.belongsTo(models.Product, { foreignKey: 'productId' });
    this.hasMany(models.StockMovement, { foreignKey: 'variantId' });
  }

  toDict() {
    return {
      variantId: this.variantId,
      productId: this.productId,
      sku: this.sku,
      name: this.name,
      attributes: this.attributes,
      priceOverride: this.priceOverride,
      quantityInStock: this.quantityInStock,
      active: this.active,
    };
  }
}

export default ProductVariant;
