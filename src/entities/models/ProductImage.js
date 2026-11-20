import { Model, DataTypes } from 'sequelize';

class ProductImage extends Model {
  static init(sequelize) {
    super.init(
      {
        imageId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          field: 'image_id',
        },
        productId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'product_id',
        },
        url: {
          type: DataTypes.STRING(500),
          allowNull: false,
        },
        altText: {
          type: DataTypes.STRING(200),
          allowNull: true,
          field: 'alt_text',
        },
        isPrimary: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_primary',
        },
        sortOrder: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'sort_order',
        },
      },
      {
        sequelize,
        modelName: 'ProductImage',
        tableName: 'table_product_images',
        timestamps: true,
        underscored: true,
      },
    );
  }

  static associate(models) {
    this.belongsTo(models.Product, { foreignKey: 'productId' });
  }

  toDict() {
    return {
      imageId: this.imageId,
      productId: this.productId,
      url: this.url,
      altText: this.altText,
      isPrimary: this.isPrimary,
      sortOrder: this.sortOrder,
    };
  }
}

export default ProductImage;
