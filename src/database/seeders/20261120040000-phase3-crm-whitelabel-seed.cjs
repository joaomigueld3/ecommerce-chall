'use strict';

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    const [{ count: settingsCount }] = await queryInterface.sequelize.query(
      'SELECT COUNT(*)::INTEGER AS count FROM table_store_settings',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    if (settingsCount === 0) {
      await queryInterface.bulkInsert('table_store_settings', [
        {
          store_name: 'omni.store',
          short_prefix: 'omni',
          short_suffix: '.store',
          tagline: 'Everything you need, delivered fast.',
          primary_color: '#0094b6',
          accent_color: '#00b4d8',
          default_region: 'US',
          free_shipping_threshold_br: 200.0,
          free_shipping_threshold_us: 50.0,
          free_shipping_threshold_eu: 50.0,
          support_email: 'support@omni.store',
          support_phone: '+55 81 99999-0000',
          legal_entity_name: 'Omni Store Commerce Ltd.',
          tax_id: '11.222.333/0001-81',
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    const clients = await queryInterface.sequelize.query(
      'SELECT client_id, full_name, contact FROM table_clients ORDER BY client_id ASC',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    if (clients.length === 0) return;

    const demoClient = clients.find((c) => c.full_name === 'DEMO CLIENT') || clients[0];
    const demoClientId = demoClient.client_id;

    await queryInterface.sequelize.query(
      `UPDATE table_clients
       SET phone = COALESCE(phone, '+55 81 99999-0002'),
           email = COALESCE(email, 'client@loomi.dev'),
           country = 'BR',
           tier = 'Prime',
           loyalty_points = GREATEST(loyalty_points, 350),
           credit_balance = GREATEST(credit_balance, 50.00),
           updated_at = :now
       WHERE client_id = :clientId`,
      { replacements: { now, clientId: demoClientId } },
    );

    const [{ count: addrCount }] = await queryInterface.sequelize.query(
      'SELECT COUNT(*)::INTEGER AS count FROM table_client_addresses WHERE client_id = :clientId',
      { replacements: { clientId: demoClientId }, type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    if (addrCount === 0) {
      await queryInterface.bulkInsert('table_client_addresses', [
        {
          client_id: demoClientId,
          label: 'Home (Brazil)',
          recipient_name: 'Demo Client',
          recipient_phone: '+55 81 99999-0002',
          country: 'BR',
          postal_code: '50030-170',
          street: 'Rua do Bom Jesus',
          number: '42',
          complement: 'Apt 302',
          neighborhood: 'Recife Antigo',
          city: 'Recife',
          state: 'PE',
          is_default_shipping: true,
          is_default_billing: true,
          created_at: now,
          updated_at: now,
        },
        {
          client_id: demoClientId,
          label: 'US Office',
          recipient_name: 'Demo Client',
          recipient_phone: '+1 212 555 0199',
          country: 'US',
          postal_code: '10001',
          street: '350 5th Ave',
          number: 'Suite 4200',
          city: 'New York',
          state: 'NY',
          is_default_shipping: false,
          is_default_billing: false,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    const [{ count: pmCount }] = await queryInterface.sequelize.query(
      'SELECT COUNT(*)::INTEGER AS count FROM table_saved_payment_methods WHERE client_id = :clientId',
      { replacements: { clientId: demoClientId }, type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    if (pmCount === 0) {
      await queryInterface.bulkInsert('table_saved_payment_methods', [
        {
          client_id: demoClientId,
          brand: 'Visa',
          holder_name: 'DEMO CLIENT',
          last4: '4242',
          exp_month: 8,
          exp_year: 2029,
          nickname: 'Personal Visa',
          is_default: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    const [{ count: wishCount }] = await queryInterface.sequelize.query(
      'SELECT COUNT(*)::INTEGER AS count FROM table_wishlists WHERE client_id = :clientId',
      { replacements: { clientId: demoClientId }, type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    if (wishCount === 0) {
      await queryInterface.bulkInsert('table_wishlists', [
        {
          client_id: demoClientId,
          name: 'Favorites',
          is_default: true,
          created_at: now,
          updated_at: now,
        },
      ]);
      const [wishlist] = await queryInterface.sequelize.query(
        'SELECT wishlist_id FROM table_wishlists WHERE client_id = :clientId ORDER BY wishlist_id ASC LIMIT 1',
        { replacements: { clientId: demoClientId }, type: queryInterface.sequelize.QueryTypes.SELECT },
      );
      const sampleProducts = await queryInterface.sequelize.query(
        'SELECT product_id FROM table_products WHERE active = true ORDER BY product_id ASC LIMIT 2',
        { type: queryInterface.sequelize.QueryTypes.SELECT },
      );
      if (wishlist && sampleProducts.length > 0) {
        await queryInterface.bulkInsert(
          'table_wishlist_items',
          sampleProducts.map((p) => ({
            wishlist_id: wishlist.wishlist_id,
            product_id: p.product_id,
            created_at: now,
            updated_at: now,
          })),
        );
      }
    }
  },

  down: async () => {},
};
