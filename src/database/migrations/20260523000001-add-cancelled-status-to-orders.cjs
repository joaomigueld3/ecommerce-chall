'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      "ALTER TYPE \"enum_table_orders_status\" ADD VALUE IF NOT EXISTS 'Cancelled';",
    );
  },

  down: async () => {
    // Postgres does not support removing a value from an enum type.
    // Leaving the value in place is harmless; no-op on rollback.
  },
};
