'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDesc = await queryInterface.describeTable('table_products');
    if (!tableDesc.image_url) {
      await queryInterface.addColumn('table_products', 'image_url', {
        type: Sequelize.STRING(500),
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    const tableDesc = await queryInterface.describeTable('table_products');
    if (tableDesc.image_url) {
      await queryInterface.removeColumn('table_products', 'image_url');
    }
  },
};
