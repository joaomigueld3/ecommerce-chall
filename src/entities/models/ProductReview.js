import { Model, DataTypes } from 'sequelize';

class ProductReview extends Model {
  static init(sequelize) {
    super.init(
      {
        reviewId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          field: 'review_id',
        },
        productId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'product_id',
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'user_id',
        },
        clientId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'client_id',
        },
        authorName: {
          type: DataTypes.STRING(120),
          allowNull: false,
          field: 'author_name',
        },
        rating: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        title: {
          type: DataTypes.STRING(140),
          allowNull: false,
        },
        comment: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        verifiedPurchase: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'verified_purchase',
        },
        helpfulVotes: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'helpful_votes',
        },
        status: {
          type: DataTypes.ENUM('Approved', 'Pending', 'Hidden'),
          allowNull: false,
          defaultValue: 'Approved',
        },
      },
      {
        sequelize,
        modelName: 'ProductReview',
        tableName: 'table_product_reviews',
        timestamps: true,
        underscored: true,
      },
    );
  }

  static associate(models) {
    this.belongsTo(models.Product, { foreignKey: 'productId' });
    this.belongsTo(models.User, { foreignKey: 'userId' });
    this.belongsTo(models.Client, { foreignKey: 'clientId' });
  }

  toDict() {
    return {
      reviewId: this.reviewId,
      productId: this.productId,
      userId: this.userId,
      clientId: this.clientId,
      authorName: this.authorName,
      rating: this.rating,
      title: this.title,
      comment: this.comment,
      verifiedPurchase: this.verifiedPurchase,
      helpfulVotes: this.helpfulVotes,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default ProductReview;
