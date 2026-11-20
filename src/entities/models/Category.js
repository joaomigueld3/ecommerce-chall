import { Model, DataTypes } from 'sequelize';

class Category extends Model {
  static init(sequelize) {
    super.init(
      {
        categoryId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          field: 'category_id',
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
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        imageUrl: {
          type: DataTypes.STRING(500),
          allowNull: true,
          field: 'image_url',
        },
        parentId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'parent_id',
        },
        displayOrder: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'display_order',
        },
        active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        sequelize,
        modelName: 'Category',
        tableName: 'table_categories',
        timestamps: true,
        underscored: true,
      },
    );
  }

  static associate(models) {
    this.belongsTo(models.Category, { as: 'parent', foreignKey: 'parentId' });
    this.hasMany(models.Category, { as: 'children', foreignKey: 'parentId' });
    this.hasMany(models.Product, { foreignKey: 'categoryId' });
  }

  toDict() {
    return {
      categoryId: this.categoryId,
      name: this.name,
      slug: this.slug,
      description: this.description,
      imageUrl: this.imageUrl,
      parentId: this.parentId,
      displayOrder: this.displayOrder,
      active: this.active,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default Category;
