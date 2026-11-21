'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('table_client_addresses', {
      address_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      client_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'table_clients',
          key: 'client_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      label: {
        type: Sequelize.STRING(60),
        allowNull: false,
        defaultValue: 'Home',
      },
      recipient_name: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      recipient_phone: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      country: {
        type: Sequelize.ENUM('BR', 'US', 'EU'),
        allowNull: false,
        defaultValue: 'BR',
      },
      postal_code: {
        type: Sequelize.STRING(24),
        allowNull: false,
      },
      street: {
        type: Sequelize.STRING(180),
        allowNull: false,
      },
      number: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },
      complement: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      neighborhood: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      city: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      state: {
        type: Sequelize.STRING(60),
        allowNull: false,
      },
      reference: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      is_default_shipping: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_default_billing: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.createTable('table_saved_payment_methods', {
      payment_method_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      client_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'table_clients',
          key: 'client_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      brand: {
        type: Sequelize.STRING(40),
        allowNull: false,
      },
      holder_name: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      last4: {
        type: Sequelize.STRING(4),
        allowNull: false,
      },
      exp_month: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      exp_year: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      nickname: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.createTable('table_wishlists', {
      wishlist_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      client_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'table_clients',
          key: 'client_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'Favorites',
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.createTable('table_wishlist_items', {
      wishlist_item_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      wishlist_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'table_wishlists',
          key: 'wishlist_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'table_products',
          key: 'product_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('table_wishlist_items', ['wishlist_id', 'product_id'], {
      unique: true,
      name: 'unique_wishlist_product',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('table_wishlist_items');
    await queryInterface.dropTable('table_wishlists');
    await queryInterface.dropTable('table_saved_payment_methods');
    await queryInterface.dropTable('table_client_addresses');
  },
};
