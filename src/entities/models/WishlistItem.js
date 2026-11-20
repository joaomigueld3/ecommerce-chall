import { Model, DataTypes } from 'sequelize';

class WishlistItem extends Model {
  static init(sequelize) {
    super.init(
      {
        wishlistItemId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          field: 'wishlist_item_id',
        },
        wishlistId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'wishlist_id',
        },
        productId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'product_id',
        },
      },
      {
        sequelize,
        modelName: 'WishlistItem',
        tableName: 'table_wishlist_items',
        timestamps: true,
        underscored: true,
      },
    );
  }

  static associate(models) {
    this.belongsTo(models.Wishlist, { foreignKey: 'wishlistId' });
    this.belongsTo(models.Product, { as: 'product', foreignKey: 'productId' });
  }

  toDict() {
    return {
      wishlistItemId: this.wishlistItemId,
      wishlistId: this.wishlistId,
      productId: this.productId,
      createdAt: this.createdAt,
    };
  }
}

export default WishlistItem;
