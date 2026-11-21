import { Model, DataTypes } from 'sequelize';

const STOCK_MOVEMENT_TYPES = [
  'INBOUND',
  'SALE',
  'CANCELLATION_RESTOCK',
  'RETURN_RESTOCK',
  'MANUAL_ADJUSTMENT',
  'DAMAGE_LOSS',
];

class StockMovement extends Model {
  static init(sequelize) {
    super.init(
      {
        movementId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          field: 'movement_id',
        },
        productId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'product_id',
        },
        variantId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'variant_id',
        },
        type: {
          type: DataTypes.ENUM(...STOCK_MOVEMENT_TYPES),
          allowNull: false,
        },
        quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        previousStock: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'previous_stock',
        },
        newStock: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'new_stock',
        },
        reason: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        referenceOrderId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'reference_order_id',
        },
        createdByUserId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'created_by_user_id',
        },
      },
      {
        sequelize,
        modelName: 'StockMovement',
        tableName: 'table_stock_movements',
        timestamps: true,
        underscored: true,
      },
    );
  }

  static associate(models) {
    this.belongsTo(models.Product, { foreignKey: 'productId' });
    this.belongsTo(models.ProductVariant, { foreignKey: 'variantId' });
    this.belongsTo(models.Order, { foreignKey: 'referenceOrderId' });
    this.belongsTo(models.User, { foreignKey: 'createdByUserId' });
  }

  toDict() {
    return {
      movementId: this.movementId,
      productId: this.productId,
      variantId: this.variantId,
      type: this.type,
      quantity: this.quantity,
      previousStock: this.previousStock,
      newStock: this.newStock,
      reason: this.reason,
      referenceOrderId: this.referenceOrderId,
      createdByUserId: this.createdByUserId,
      createdAt: this.createdAt,
    };
  }
}

export default StockMovement;
export { STOCK_MOVEMENT_TYPES };
