'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      "ALTER TYPE \"enum_table_orders_status\" ADD VALUE IF NOT EXISTS 'Cancelled';",
    );
  },

  down: async () => {
    // Removing a value from a PostgreSQL enum requires recreating the type and
    // rewriting every row that uses it. Intentionally left as a no-op.
  },
};
