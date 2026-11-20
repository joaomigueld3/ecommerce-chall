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
        sku: {
          type: DataTypes.STRING(64),
          allowNull: true,
          unique: true,
        },
        slug: {
          type: DataTypes.STRING(180),
          allowNull: true,
          unique: true,
        },
        description: {
          type: DataTypes.TEXT,
        },
        category: {
          type: DataTypes.STRING(80),
          allowNull: false,
          defaultValue: 'General',
        },
        categoryId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'category_id',
        },
        brandId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'brand_id',
        },
        imageUrl: {
          type: DataTypes.STRING(500),
          allowNull: true,
          field: 'image_url',
        },
        price: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        originalPrice: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          field: 'original_price',
        },
        costPrice: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          field: 'cost_price',
        },
        quantityInStock: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'quantity_in_stock',
        },
        minStockLevel: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 5,
          field: 'min_stock_level',
        },
        weightKg: {
          type: DataTypes.DECIMAL(8, 3),
          allowNull: true,
          field: 'weight_kg',
        },
        dimensions: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        specs: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        featured: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        isDealOfDay: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'is_deal_of_day',
        },
        active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        ratingAvg: {
          type: DataTypes.DECIMAL(3, 2),
          allowNull: false,
          defaultValue: 0,
          field: 'rating_avg',
        },
        ratingCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'rating_count',
        },
        salesCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'sales_count',
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
    this.belongsTo(models.Category, { as: 'categoryInfo', foreignKey: 'categoryId' });
    this.belongsTo(models.Brand, { as: 'brand', foreignKey: 'brandId' });
    this.hasMany(models.ProductImage, { as: 'images', foreignKey: 'productId' });
    this.hasMany(models.ProductVariant, { as: 'variants', foreignKey: 'productId' });
    this.hasMany(models.ProductReview, { as: 'reviews', foreignKey: 'productId' });
    this.hasMany(models.ProductQuestion, { as: 'questions', foreignKey: 'productId' });
    this.hasMany(models.StockMovement, { as: 'stockMovements', foreignKey: 'productId' });
    this.hasMany(models.OrderItem, { foreignKey: 'productId' });
  }

  toDict() {
    return {
      productId: this.productId,
      productName: this.productName,
      sku: this.sku,
      slug: this.slug,
      description: this.description,
      category: this.category,
      categoryId: this.categoryId,
      brandId: this.brandId,
      imageUrl: this.imageUrl,
      price: this.price,
      originalPrice: this.originalPrice,
      costPrice: this.costPrice,
      quantityInStock: this.quantityInStock,
      minStockLevel: this.minStockLevel,
      weightKg: this.weightKg,
      dimensions: this.dimensions,
      specs: this.specs,
      featured: this.featured,
      isDealOfDay: this.isDealOfDay,
      active: this.active,
      ratingAvg: this.ratingAvg,
      ratingCount: this.ratingCount,
      salesCount: this.salesCount,
    };
  }
}

export default Product;
