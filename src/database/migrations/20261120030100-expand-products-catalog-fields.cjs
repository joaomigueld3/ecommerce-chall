'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const desc = await queryInterface.describeTable('table_products');

    const columns = [
      ['sku', { type: Sequelize.STRING(64), allowNull: true, unique: true }],
      ['slug', { type: Sequelize.STRING(180), allowNull: true, unique: true }],
      [
        'brand_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'table_brands', key: 'brand_id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
      ],
      [
        'category_id',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'table_categories', key: 'category_id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
      ],
      ['original_price', { type: Sequelize.DECIMAL(10, 2), allowNull: true }],
      ['cost_price', { type: Sequelize.DECIMAL(10, 2), allowNull: true }],
      ['weight_kg', { type: Sequelize.DECIMAL(8, 3), allowNull: true }],
      ['dimensions', { type: Sequelize.JSONB, allowNull: true }],
      ['specs', { type: Sequelize.JSONB, allowNull: true }],
      ['featured', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }],
      ['is_deal_of_day', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }],
      ['active', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true }],
      ['min_stock_level', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5 }],
      ['rating_avg', { type: Sequelize.DECIMAL(3, 2), allowNull: false, defaultValue: 0 }],
      ['rating_count', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }],
      ['sales_count', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }],
    ];

    for (let i = 0; i < columns.length; i += 1) {
      const [colName, colDef] = columns[i];
      if (!desc[colName]) {
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.addColumn('table_products', colName, colDef);
      }
    }
  },

  down: async (queryInterface) => {
    const desc = await queryInterface.describeTable('table_products');
    const cols = [
      'sales_count',
      'rating_count',
      'rating_avg',
      'min_stock_level',
      'active',
      'is_deal_of_day',
      'featured',
      'specs',
      'dimensions',
      'weight_kg',
      'cost_price',
      'original_price',
      'category_id',
      'brand_id',
      'slug',
      'sku',
    ];
    for (let i = 0; i < cols.length; i += 1) {
      if (desc[cols[i]]) {
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.removeColumn('table_products', cols[i]);
      }
    }
  },
};
