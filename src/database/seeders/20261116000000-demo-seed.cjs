'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const adminEmail = 'admin@loomi.dev';
    const clientEmail = 'client@loomi.dev';

    const existingUsers = await queryInterface.sequelize.query(
      'SELECT id, email FROM table_users WHERE email IN (:emails)',
      {
        replacements: { emails: [adminEmail, clientEmail] },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );

    const existingByEmail = new Map(existingUsers.map((u) => [u.email, u.id]));

    if (!existingByEmail.has(adminEmail)) {
      const adminHash = await bcrypt.hash('Admin@1234', 10);
      await queryInterface.bulkInsert('table_users', [
        {
          name: 'DEMO ADMIN',
          email: adminEmail,
          password: adminHash,
          type: 'Admin',
          confirmed: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    if (!existingByEmail.has(clientEmail)) {
      const clientHash = await bcrypt.hash('Client@1234', 10);
      await queryInterface.bulkInsert('table_users', [
        {
          name: 'DEMO CLIENT',
          email: clientEmail,
          password: clientHash,
          type: 'Client',
          confirmed: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    const users = await queryInterface.sequelize.query(
      'SELECT id, email FROM table_users WHERE email IN (:emails)',
      {
        replacements: { emails: [adminEmail, clientEmail] },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );

    const userMap = new Map(users.map((u) => [u.email, u.id]));
    const clientUserId = userMap.get(clientEmail);
    const adminUserId = userMap.get(adminEmail);

    const existingClients = await queryInterface.sequelize.query(
      'SELECT client_id, user_id FROM table_clients WHERE user_id IN (:userIds)',
      {
        replacements: { userIds: [adminUserId, clientUserId].filter(Boolean) },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );
    const clientUserIds = new Set(existingClients.map((c) => c.user_id));

    const clientsToInsert = [];
    if (adminUserId && !clientUserIds.has(adminUserId)) {
      clientsToInsert.push({
        user_id: adminUserId,
        full_name: 'ADMIN TEST CLIENT',
        contact: '81999990001',
        address: 'Av. Boa Viagem, 100 - Recife/PE',
        status: true,
        created_at: now,
        updated_at: now,
      });
    }
    if (clientUserId && !clientUserIds.has(clientUserId)) {
      clientsToInsert.push({
        user_id: clientUserId,
        full_name: 'DEMO CLIENT',
        contact: '81999990002',
        address: 'Rua do Bom Jesus, 42 - Recife/PE',
        status: true,
        created_at: now,
        updated_at: now,
      });
    }
    if (clientsToInsert.length > 0) {
      await queryInterface.bulkInsert('table_clients', clientsToInsert);
    }

    const demoProducts = [
      {
        product_name: 'Mechanical Keyboard RGB',
        description: 'Compact 75% mechanical keyboard with hot-swap switches',
        category: 'Peripherals',
        price: 299.90,
        quantity_in_stock: 15,
      },
      {
        product_name: 'Wireless Ergonomic Mouse',
        description: 'Multi-device Bluetooth mouse with precision optical sensor',
        category: 'Peripherals',
        price: 149.50,
        quantity_in_stock: 25,
      },
      {
        product_name: '27" 4K IPS Monitor',
        description: 'Ultra HD monitor for development and design workflows',
        category: 'Electronics',
        price: 1899.00,
        quantity_in_stock: 8,
      },
      {
        product_name: 'Noise Cancelling Headphones',
        description: 'Over-ear wireless headphones with 40h battery life',
        category: 'Audio',
        price: 499.00,
        quantity_in_stock: 12,
      },
      {
        product_name: 'USB-C Hub 8-in-1',
        description: 'HDMI 4K, Ethernet, SD card reader and 100W PD pass-through',
        category: 'Accessories',
        price: 189.00,
        quantity_in_stock: 20,
      },
      {
        product_name: 'Studio Condenser Microphone',
        description: 'USB podcast and streaming microphone (limited edition)',
        category: 'Audio',
        price: 349.00,
        quantity_in_stock: 0,
      },
    ];

    const existingProducts = await queryInterface.sequelize.query(
      'SELECT product_name FROM table_products',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const existingNames = new Set(existingProducts.map((p) => p.product_name));

    const newProducts = demoProducts
      .filter((p) => !existingNames.has(p.product_name))
      .map((p) => ({
        ...p,
        created_at: now,
        updated_at: now,
      }));

    if (newProducts.length > 0) {
      await queryInterface.bulkInsert('table_products', newProducts);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('table_users', {
      email: ['admin@loomi.dev', 'client@loomi.dev'],
    });
  },
};
