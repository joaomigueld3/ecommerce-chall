import { Model, DataTypes } from 'sequelize';

class ProductQuestion extends Model {
  static init(sequelize) {
    super.init(
      {
        questionId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          field: 'question_id',
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
        authorName: {
          type: DataTypes.STRING(120),
          allowNull: false,
          field: 'author_name',
        },
        question: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        answer: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        answeredByUserId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'answered_by_user_id',
        },
        answeredByName: {
          type: DataTypes.STRING(120),
          allowNull: true,
          field: 'answered_by_name',
        },
        answeredAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'answered_at',
        },
        status: {
          type: DataTypes.ENUM('Published', 'Hidden'),
          allowNull: false,
          defaultValue: 'Published',
        },
      },
      {
        sequelize,
        modelName: 'ProductQuestion',
        tableName: 'table_product_questions',
        timestamps: true,
        underscored: true,
      },
    );
  }

  static associate(models) {
    this.belongsTo(models.Product, { foreignKey: 'productId' });
    this.belongsTo(models.User, { foreignKey: 'userId' });
  }

  toDict() {
    return {
      questionId: this.questionId,
      productId: this.productId,
      userId: this.userId,
      authorName: this.authorName,
      question: this.question,
      answer: this.answer,
      answeredByUserId: this.answeredByUserId,
      answeredByName: this.answeredByName,
      answeredAt: this.answeredAt,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default ProductQuestion;
