import { Model, DataTypes } from 'sequelize';

class Brand extends Model {
  static init(sequelize) {
    super.init(
      {
        brandId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          field: 'brand_id',
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        slug: {
          type: DataTypes.STRING(120),
          allowNull: false,
          unique: true,
        },
        logoUrl: {
          type: DataTypes.STRING(500),
          allowNull: true,
          field: 'logo_url',
        },
        active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        sequelize,
        modelName: 'Brand',
        tableName: 'table_brands',
        timestamps: true,
        underscored: true,
      },
    );
  }

  static associate(models) {
    this.hasMany(models.Product, { foreignKey: 'brandId' });
  }

  toDict() {
    return {
      brandId: this.brandId,
      name: this.name,
      slug: this.slug,
      logoUrl: this.logoUrl,
      active: this.active,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default Brand;
