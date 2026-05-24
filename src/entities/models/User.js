import { Model, DataTypes } from 'sequelize';

const UserType = {
  Admin: 'Admin',
  Client: 'Client',
};

class User extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING(80),
          allowNull: false,
          set(value) {
            this.setDataValue('name', value.toUpperCase());
          },
        },
        email: {
          type: DataTypes.STRING(150),
          allowNull: false,
          unique: true,
        },
        password: {
          type: DataTypes.STRING(120),
          allowNull: false,
        },
        type: {
          type: DataTypes.ENUM(...Object.values(UserType)),
          defaultValue: UserType.Client,
        },
        confirmed: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      {
        sequelize,
        modelName: 'User',
        tableName: 'table_users',
        timestamps: true,
        underscored: true,
      },
    );
  }

  static associate(models) {
    this.hasOne(models.Client, { foreignKey: 'userId' });
  }

  toDict() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      type: this.type,
      confirmed: this.confirmed,
      createdAt: this.createdAt,
      updatedAt: this.createdAt,
    };
  }
}

export default User;
