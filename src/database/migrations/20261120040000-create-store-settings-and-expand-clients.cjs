'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('table_store_settings', {
      setting_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      store_name: {
        type: Sequelize.STRING(120),
        allowNull: false,
        defaultValue: 'omni.store',
      },
      short_prefix: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: 'omni',
      },
      short_suffix: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: '.store',
      },
      tagline: {
        type: Sequelize.STRING(240),
        allowNull: true,
        defaultValue: 'Everything you need, delivered fast.',
      },
      logo_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      primary_color: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: '#0094b6',
      },
      accent_color: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: '#00b4d8',
      },
      default_region: {
        type: Sequelize.ENUM('BR', 'US', 'EU'),
        allowNull: false,
        defaultValue: 'US',
      },
      free_shipping_threshold_br: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 200.00,
      },
      free_shipping_threshold_us: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 50.00,
      },
      free_shipping_threshold_eu: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 50.00,
      },
      support_email: {
        type: Sequelize.STRING(150),
        allowNull: true,
        defaultValue: 'support@omni.store',
      },
      support_phone: {
        type: Sequelize.STRING(40),
        allowNull: true,
      },
      legal_entity_name: {
        type: Sequelize.STRING(160),
        allowNull: true,
        defaultValue: 'Omni Store Commerce Ltd.',
      },
      tax_id: {
        type: Sequelize.STRING(60),
        allowNull: true,
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

    const clientDesc = await queryInterface.describeTable('table_clients');
    const clientCols = [
      ['document_type', { type: Sequelize.ENUM('CPF', 'CNPJ', 'TAX_ID', 'VAT_ID'), allowNull: true }],
      ['document_number', { type: Sequelize.STRING(40), allowNull: true, unique: true }],
      ['phone', { type: Sequelize.STRING(30), allowNull: true }],
      ['email', { type: Sequelize.STRING(150), allowNull: true }],
      ['birth_date', { type: Sequelize.DATEONLY, allowNull: true }],
      ['country', { type: Sequelize.ENUM('BR', 'US', 'EU'), allowNull: false, defaultValue: 'BR' }],
      ['tier', { type: Sequelize.ENUM('Standard', 'Prime', 'VIP'), allowNull: false, defaultValue: 'Standard' }],
      ['loyalty_points', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }],
      ['credit_balance', { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0.00 }],
      ['internal_notes', { type: Sequelize.TEXT, allowNull: true }],
      ['blocked_reason', { type: Sequelize.STRING(255), allowNull: true }],
    ];

    for (let i = 0; i < clientCols.length; i += 1) {
      const [colName, colDef] = clientCols[i];
      if (!clientDesc[colName]) {
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.addColumn('table_clients', colName, colDef);
      }
    }
  },

  down: async (queryInterface) => {
    const clientDesc = await queryInterface.describeTable('table_clients');
    const cols = [
      'blocked_reason',
      'internal_notes',
      'credit_balance',
      'loyalty_points',
      'tier',
      'country',
      'birth_date',
      'email',
      'phone',
      'document_number',
      'document_type',
    ];
    for (let i = 0; i < cols.length; i += 1) {
      if (clientDesc[cols[i]]) {
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.removeColumn('table_clients', cols[i]);
      }
    }
    await queryInterface.dropTable('table_store_settings');
  },
};
