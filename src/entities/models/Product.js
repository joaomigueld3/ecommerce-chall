import { Model, DataTypes } from 'sequelize';

class Product extends Model {
  static init(sequelize) {
    super.init(
      {
        productId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          field: 'product_id',
        },
        productName: {
          type: DataTypes.STRING,
          allowNull: false,
          field: 'product_name',
        },
        description: {
          type: DataTypes.TEXT,
        },
        category: {
          type: DataTypes.STRING(80),
          allowNull: false,
          defaultValue: 'General',
        },
        price: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        quantityInStock: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'quantity_in_stock',
        },
      },
      {
        sequelize,
        modelName: 'Product',
        tableName: 'table_products',
        timestamps: true,
        underscored: true,
      },
    );
  }

  static associate(models) {
    this.hasMany(models.OrderItem, { foreignKey: 'productId' });
  }

  toDict() {
    return {
      productId: this.productId,
      productName: this.productName,
      description: this.description,
      category: this.category,
      price: this.price,
      quantityInStock: this.quantityInStock,
    };
  }
}

export default Product;
