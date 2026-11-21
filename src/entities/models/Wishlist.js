import { Model, DataTypes } from 'sequelize';

class Wishlist extends Model {
  static init(sequelize) {
    super.init(
      {
        wishlistId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          field: 'wishlist_id',
        },
        clientId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'client_id',
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
          defaultValue: 'Favorites',
        },
        isDefault: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          field: 'is_default',
        },
      },
      {
        sequelize,
        modelName: 'Wishlist',
        tableName: 'table_wishlists',
        timestamps: true,
        underscored: true,
      },
    );
  }

  static associate(models) {
    this.belongsTo(models.Client, { foreignKey: 'clientId' });
    this.hasMany(models.WishlistItem, { as: 'items', foreignKey: 'wishlistId' });
  }

  toDict() {
    return {
      wishlistId: this.wishlistId,
      clientId: this.clientId,
      name: this.name,
      isDefault: this.isDefault,
      createdAt: this.createdAt,
    };
  }
}

export default Wishlist;
