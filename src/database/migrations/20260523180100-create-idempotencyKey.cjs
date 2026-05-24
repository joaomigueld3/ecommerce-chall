'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('table_idempotency_keys', {
      idempotency_key_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      idempotency_key: {
        type: Sequelize.STRING(255),
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
      request_hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'table_orders',
          key: 'order_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      response_status: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      response_body: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addConstraint('table_idempotency_keys', {
      fields: ['idempotency_key', 'client_id'],
      type: 'unique',
      name: 'unique_idempotency_key_per_client',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('table_idempotency_keys');
  },
};
