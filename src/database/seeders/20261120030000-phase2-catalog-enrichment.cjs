'use strict';

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const BRAND_RULES = [
  ['Apple', /apple|iphone|ipad|airpods|homepod|magsafe|airpower/i],
  ['Samsung', /samsung|galaxy/i],
  ['Asus', /asus|zenbook/i],
  ['Dell', /dell|xps/i],
  ['Lenovo', /lenovo|yoga/i],
  ['Huawei', /huawei|matebook/i],
  ['Oppo', /oppo/i],
  ['Realme', /realme/i],
  ['Vivo', /vivo/i],
  ['Beats', /beats/i],
  ['Amazon', /amazon|echo/i],
  ['Rolex', /rolex/i],
  ['Longines', /longines/i],
  ['IWC', /iwc/i],
  ['Nike', /nike/i],
  ['Puma', /puma/i],
  ['Prada', /prada/i],
  ['Chanel', /chanel/i],
  ['Dior', /dior/i],
  ['Gucci', /gucci/i],
  ['Calvin Klein', /calvin klein/i],
  ['Knoll', /knoll/i],
  ['Annibale Colombo', /annibale colombo/i],
];

function detectBrand(productName) {
  for (let i = 0; i < BRAND_RULES.length; i += 1) {
    const [brandName, regex] = BRAND_RULES[i];
    if (regex.test(productName)) return brandName;
  }
  return 'Omni Essentials';
}

function buildSpecs(product, brandName) {
  const base = { Brand: brandName, Department: product.category || 'General', Warranty: '12 months official warranty' };
  switch (product.category) {
    case 'Laptops':
      return { ...base, Memory: '16GB RAM', Storage: '512GB NVMe SSD', Connectivity: 'Wi-Fi 6E, USB-C / Thunderbolt' };
    case 'Smartphones':
      return { ...base, Network: '5G / LTE Unlocked', Display: 'OLED High-Refresh', Protection: 'Water & Dust Resistant' };
    case 'Tablets':
      return { ...base, Storage: '128GB / 256GB', Audio: 'Stereo Speakers', Connectivity: 'Wi-Fi + Bluetooth 5.2' };
    case 'Audio & Smart':
      return { ...base, Connectivity: 'Bluetooth 5.3 / Wireless', Battery: 'Up to 24h playback', Controls: 'Touch & Voice Assistant' };
    case 'Watches':
      return { ...base, CaseMaterial: 'Stainless Steel', WaterResistance: 'Up to 100m', Crystal: 'Scratch-resistant Sapphire' };
    case 'Shoes':
      return { ...base, Upper: 'Breathable Leather / Mesh', Sole: 'Cushioned Rubber Outsole', Fit: 'True to size' };
    case 'Fragrances':
      return { ...base, Volume: '100 ml / 3.4 fl oz', Concentration: 'Eau de Parfum', Origin: 'Imported' };
    default:
      return { ...base, Condition: 'Brand New', Fulfillment: 'omni.store Official Stock' };
  }
}

const VARIANT_TEMPLATES = [
  {
    match: /MacBook Pro 14/i,
    variants: [
      { suffix: '512-SG', name: 'Space Grey — 16GB / 512GB', attributes: { Color: 'Space Grey', Storage: '512GB' }, delta: 0, stock: 12 },
      { suffix: '1TB-SG', name: 'Space Grey — 32GB / 1TB', attributes: { Color: 'Space Grey', Storage: '1TB' }, delta: 400, stock: 7 },
      { suffix: '512-SL', name: 'Silver — 16GB / 512GB', attributes: { Color: 'Silver', Storage: '512GB' }, delta: 0, stock: 5 },
    ],
  },
  {
    match: /iPhone 13 Pro/i,
    variants: [
      { suffix: '128-GR', name: 'Graphite — 128GB', attributes: { Color: 'Graphite', Storage: '128GB' }, delta: 0, stock: 22 },
      { suffix: '256-SB', name: 'Sierra Blue — 256GB', attributes: { Color: 'Sierra Blue', Storage: '256GB' }, delta: 120, stock: 18 },
      { suffix: '512-GD', name: 'Gold — 512GB', attributes: { Color: 'Gold', Storage: '512GB' }, delta: 280, stock: 10 },
    ],
  },
  {
    match: /AirPods Max/i,
    variants: [
      { suffix: 'SLV', name: 'Silver', attributes: { Color: 'Silver' }, delta: 0, stock: 25 },
      { suffix: 'MID', name: 'Midnight Blue', attributes: { Color: 'Midnight Blue' }, delta: 20, stock: 18 },
      { suffix: 'GRN', name: 'Green', attributes: { Color: 'Green' }, delta: 0, stock: 16 },
    ],
  },
  {
    match: /Nike Air Jordan 1/i,
    variants: [
      { suffix: 'US9', name: 'Size US 9 / BR 41', attributes: { Size: 'US 9 / BR 41' }, delta: 0, stock: 4 },
      { suffix: 'US10', name: 'Size US 10 / BR 42', attributes: { Size: 'US 10 / BR 42' }, delta: 0, stock: 3 },
      { suffix: 'US11', name: 'Size US 11 / BR 43', attributes: { Size: 'US 11 / BR 43' }, delta: 10, stock: 2 },
    ],
  },
  {
    match: /Samsung Galaxy S10/i,
    variants: [
      { suffix: '128-BK', name: 'Prism Black — 128GB', attributes: { Color: 'Prism Black', Storage: '128GB' }, delta: 0, stock: 10 },
      { suffix: '256-WH', name: 'Prism White — 256GB', attributes: { Color: 'Prism White', Storage: '256GB' }, delta: 80, stock: 9 },
    ],
  },
  {
    match: /iPad Mini/i,
    variants: [
      { suffix: '64-ST', name: 'Starlight — 64GB Wi-Fi', attributes: { Color: 'Starlight', Storage: '64GB' }, delta: 0, stock: 25 },
      { suffix: '256-ST', name: 'Starlight — 256GB Wi-Fi', attributes: { Color: 'Starlight', Storage: '256GB' }, delta: 150, stock: 22 },
    ],
  },
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const products = await queryInterface.sequelize.query(
      'SELECT product_id, product_name, category, image_url, price, quantity_in_stock, sku, brand_id, category_id FROM table_products ORDER BY product_id ASC',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    if (products.length === 0) return;

    // 1. Seed categories
    const uniqueCategories = [...new Set(products.map((p) => p.category || 'General'))].sort();
    const existingCats = await queryInterface.sequelize.query(
      'SELECT category_id, slug, name FROM table_categories',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const catBySlug = new Map(existingCats.map((c) => [c.slug, c.category_id]));

    for (let i = 0; i < uniqueCategories.length; i += 1) {
      const name = uniqueCategories[i];
      const slug = slugify(name);
      if (!catBySlug.has(slug)) {
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.bulkInsert('table_categories', [
          {
            name,
            slug,
            description: `Curated ${name} collection at omni.store`,
            display_order: i + 1,
            active: true,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }

    const allCats = await queryInterface.sequelize.query(
      'SELECT category_id, slug FROM table_categories',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const catIdBySlug = new Map(allCats.map((c) => [c.slug, c.category_id]));

    // 2. Seed brands
    const uniqueBrands = [...new Set(products.map((p) => detectBrand(p.product_name)))].sort();
    const existingBrands = await queryInterface.sequelize.query(
      'SELECT brand_id, slug FROM table_brands',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const brandBySlug = new Map(existingBrands.map((b) => [b.slug, b.brand_id]));

    for (let i = 0; i < uniqueBrands.length; i += 1) {
      const name = uniqueBrands[i];
      const slug = slugify(name);
      if (!brandBySlug.has(slug)) {
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.bulkInsert('table_brands', [
          {
            name,
            slug,
            active: true,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }

    const allBrands = await queryInterface.sequelize.query(
      'SELECT brand_id, slug FROM table_brands',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const brandIdBySlug = new Map(allBrands.map((b) => [b.slug, b.brand_id]));

    // 3. Enrich every product with SKU, slug, brand_id, category_id, original_price, cost_price, specs, deals
    const dealIndices = new Set([0, 5, 16, 33]); // 4 Deals of the Day
    const featuredIndices = new Set([0, 5, 13, 16, 27, 33, 37, 46]);

    for (let i = 0; i < products.length; i += 1) {
      const p = products[i];
      const brandName = detectBrand(p.product_name);
      const brandId = brandIdBySlug.get(slugify(brandName)) || null;
      const categoryId = catIdBySlug.get(slugify(p.category || 'General')) || null;
      const sku = p.sku || `OMN-${String(p.product_id).padStart(4, '0')}`;
      const slug = `${slugify(p.product_name)}-${p.product_id}`;
      const priceNum = Number(p.price);
      const isDeal = dealIndices.has(i);
      const isFeatured = featuredIndices.has(i);
      const hasDiscount = isDeal || i % 3 === 0;
      const originalPrice = hasDiscount ? Number((priceNum * (isDeal ? 1.22 : 1.14)).toFixed(2)) : null;
      const costPrice = Number((priceNum * 0.64).toFixed(2));
      const minStockLevel = p.quantity_in_stock <= 10 ? 10 : 5;
      const specs = buildSpecs(p, brandName);

      // eslint-disable-next-line no-await-in-loop
      await queryInterface.sequelize.query(
        `UPDATE table_products
         SET sku = COALESCE(sku, :sku),
             slug = COALESCE(slug, :slug),
             brand_id = :brandId,
             category_id = :categoryId,
             original_price = COALESCE(original_price, :originalPrice),
             cost_price = COALESCE(cost_price, :costPrice),
             min_stock_level = :minStockLevel,
             specs = COALESCE(specs, CAST(:specs AS JSONB)),
             featured = :featured,
             is_deal_of_day = :isDealOfDay,
             updated_at = :now
         WHERE product_id = :productId`,
        {
          replacements: {
            sku,
            slug,
            brandId,
            categoryId,
            originalPrice,
            costPrice,
            minStockLevel,
            specs: JSON.stringify(specs),
            featured: isFeatured,
            isDealOfDay: isDeal,
            now,
            productId: p.product_id,
          },
        },
      );
    }

    // 4. Populate table_product_images if empty for each product
    const existingImages = await queryInterface.sequelize.query(
      'SELECT DISTINCT product_id FROM table_product_images',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const productsWithImages = new Set(existingImages.map((r) => r.product_id));
    const imagesToInsert = [];

    products.forEach((p) => {
      if (p.image_url && !productsWithImages.has(p.product_id)) {
        imagesToInsert.push({
          product_id: p.product_id,
          url: p.image_url,
          alt_text: p.product_name,
          is_primary: true,
          sort_order: 0,
          created_at: now,
          updated_at: now,
        });
      }
    });
    if (imagesToInsert.length > 0) {
      await queryInterface.bulkInsert('table_product_images', imagesToInsert);
    }

    // 5. Populate sample variants for flagship products
    const existingVariants = await queryInterface.sequelize.query(
      'SELECT sku FROM table_product_variants',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const existingVariantSkus = new Set(existingVariants.map((v) => v.sku));
    const variantsToInsert = [];

    products.forEach((p) => {
      const tpl = VARIANT_TEMPLATES.find((t) => t.match.test(p.product_name));
      if (!tpl) return;
      tpl.variants.forEach((v) => {
        const varSku = `OMN-${p.product_id}-${v.suffix}`;
        if (!existingVariantSkus.has(varSku)) {
          variantsToInsert.push({
            product_id: p.product_id,
            sku: varSku,
            name: v.name,
            attributes: JSON.stringify(v.attributes),
            price_override: v.delta !== 0 ? Number((Number(p.price) + v.delta).toFixed(2)) : null,
            quantity_in_stock: v.stock,
            active: true,
            created_at: now,
            updated_at: now,
          });
        }
      });
    });

    if (variantsToInsert.length > 0) {
      await queryInterface.bulkInsert('table_product_variants', variantsToInsert);
    }

    // 6. Seed initial INBOUND Kardex entries if table_stock_movements is empty
    const [{ count: movementCount }] = await queryInterface.sequelize.query(
      'SELECT COUNT(*)::INTEGER AS count FROM table_stock_movements',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const users = await queryInterface.sequelize.query(
      'SELECT id, name, email, type FROM table_users ORDER BY id ASC',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const adminUser = users.find((u) => u.type === 'Admin') || users[0];
    const clientUser = users.find((u) => u.type === 'Client') || adminUser;

    if (movementCount === 0 && products.length > 0) {
      const initialMovements = products.slice(0, 15).map((p) => ({
        product_id: p.product_id,
        type: 'INBOUND',
        quantity: Number(p.quantity_in_stock) || 10,
        previous_stock: 0,
        new_stock: Number(p.quantity_in_stock) || 10,
        reason: 'Initial catalog opening stock (omni.store)',
        created_by_user_id: adminUser?.id || null,
        created_at: now,
        updated_at: now,
      }));
      await queryInterface.bulkInsert('table_stock_movements', initialMovements);
    }

    // 7. Seed sample reviews & questions if tables are empty
    const [{ count: reviewCount }] = await queryInterface.sequelize.query(
      'SELECT COUNT(*)::INTEGER AS count FROM table_product_reviews',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    if (reviewCount === 0 && clientUser && products.length >= 6) {
      const sampleReviews = [
        {
          product_id: products[0].product_id,
          user_id: clientUser.id,
          author_name: 'DEMO CLIENT',
          rating: 5,
          title: 'Build quality and performance are outstanding',
          comment: 'Fast delivery from omni.store, factory sealed box, and crisp display. Easily handles heavy dev workloads.',
          verified_purchase: true,
          helpful_votes: 7,
          status: 'Approved',
          created_at: now,
          updated_at: now,
        },
        {
          product_id: products[0].product_id,
          user_id: adminUser.id,
          author_name: 'MARINA COSTA',
          rating: 4,
          title: 'Great battery life and silent thermals',
          comment: 'Very light to carry every day. Deducted one star only because I wish it included a sleeve in the box.',
          verified_purchase: true,
          helpful_votes: 3,
          status: 'Approved',
          created_at: now,
          updated_at: now,
        },
        {
          product_id: products[5].product_id,
          user_id: clientUser.id,
          author_name: 'DEMO CLIENT',
          rating: 5,
          title: 'Camera and screen exceed expectations',
          comment: 'Smooth 120Hz display and all-day battery. Great experience buying through omni.store.',
          verified_purchase: true,
          helpful_votes: 4,
          status: 'Approved',
          created_at: now,
          updated_at: now,
        },
        {
          product_id: products[16 % products.length].product_id,
          user_id: clientUser.id,
          author_name: 'CARLOS LIMA',
          rating: 5,
          title: 'Incredible sound isolation',
          comment: 'Blocks office noise completely and feels super comfortable during long flights.',
          verified_purchase: false,
          helpful_votes: 2,
          status: 'Approved',
          created_at: now,
          updated_at: now,
        },
      ];
      await queryInterface.bulkInsert('table_product_reviews', sampleReviews);

      // Sync rating_avg & rating_count on reviewed products
      await queryInterface.sequelize.query(`
        UPDATE table_products p
        SET rating_avg = COALESCE(r.avg_rating, 0),
            rating_count = COALESCE(r.cnt, 0)
        FROM (
          SELECT product_id, ROUND(AVG(rating)::numeric, 2) AS avg_rating, COUNT(*)::integer AS cnt
          FROM table_product_reviews
          WHERE status = 'Approved'
          GROUP BY product_id
        ) r
        WHERE p.product_id = r.product_id
      `);
    }

    const [{ count: questionCount }] = await queryInterface.sequelize.query(
      'SELECT COUNT(*)::INTEGER AS count FROM table_product_questions',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    if (questionCount === 0 && clientUser && products.length >= 6) {
      await queryInterface.bulkInsert('table_product_questions', [
        {
          product_id: products[0].product_id,
          user_id: clientUser.id,
          author_name: 'DEMO CLIENT',
          question: 'Does this unit come with an international warranty valid in Brazil, US, and Europe?',
          answer: 'Yes! All official electronics sold by omni.store include a 12-month manufacturer warranty and invoice.',
          answered_by_user_id: adminUser?.id || null,
          answered_by_name: 'omni.store Team',
          answered_at: now,
          status: 'Published',
          created_at: now,
          updated_at: now,
        },
        {
          product_id: products[5].product_id,
          user_id: clientUser.id,
          author_name: 'DEMO CLIENT',
          question: 'Is this smartphone unlocked for global 5G carriers?',
          answer: null,
          answered_by_user_id: null,
          answered_by_name: null,
          answered_at: null,
          status: 'Published',
          created_at: now,
          updated_at: now,
        },
      ]);
    }
  },

  down: async () => {},
};
