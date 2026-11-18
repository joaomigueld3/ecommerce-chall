'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('table_products', 'category', {
      type: Sequelize.STRING(80),
      allowNull: false,
      defaultValue: 'General',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('table_products', 'category');
  },
};
