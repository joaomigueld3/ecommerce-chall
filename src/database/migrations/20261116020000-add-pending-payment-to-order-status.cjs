'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      "ALTER TYPE \"enum_table_orders_status\" ADD VALUE IF NOT EXISTS 'Pending Payment';",
    );
  },

  down: async () => {
    // Removing an enum value in PostgreSQL requires recreating the type.
  },
};
