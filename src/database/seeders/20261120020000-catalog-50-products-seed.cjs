'use strict';

const REAL_PRODUCTS_CATALOG = [
  {
    "product_name": "Apple MacBook Pro 14 Inch Space Grey",
    "description": "The MacBook Pro 14 Inch in Space Grey is a powerful and sleek laptop, featuring Apple's M1 Pro chip for exceptional performance and a stunning Retina display.",
    "category": "Laptops",
    "image_url": "/images/products/apple-macbook-pro-14-inch-space-grey.webp",
    "price": 1999.99,
    "quantity_in_stock": 24
  },
  {
    "product_name": "Asus Zenbook Pro Dual Screen Laptop",
    "description": "The Asus Zenbook Pro Dual Screen Laptop is a high-performance device with dual screens, providing productivity and versatility for creative professionals.",
    "category": "Laptops",
    "image_url": "/images/products/asus-zenbook-pro-dual-screen-laptop.webp",
    "price": 1799.99,
    "quantity_in_stock": 45
  },
  {
    "product_name": "Huawei Matebook X Pro",
    "description": "The Huawei Matebook X Pro is a slim and stylish laptop with a high-resolution touchscreen display, offering a premium experience for users on the go.",
    "category": "Laptops",
    "image_url": "/images/products/huawei-matebook-x-pro.webp",
    "price": 1399.99,
    "quantity_in_stock": 75
  },
  {
    "product_name": "Lenovo Yoga 920",
    "description": "The Lenovo Yoga 920 is a 2-in-1 convertible laptop with a flexible hinge, allowing you to use it as a laptop or tablet, offering versatility and portability.",
    "category": "Laptops",
    "image_url": "/images/products/lenovo-yoga-920.webp",
    "price": 1099.99,
    "quantity_in_stock": 40
  },
  {
    "product_name": "New DELL XPS 13 9300 Laptop",
    "description": "The New DELL XPS 13 9300 Laptop is a compact and powerful device, featuring a virtually borderless InfinityEdge display and high-end performance for various tasks.",
    "category": "Laptops",
    "image_url": "/images/products/new-dell-xps-13-9300-laptop.webp",
    "price": 1499.99,
    "quantity_in_stock": 74
  },
  {
    "product_name": "iPhone 13 Pro",
    "description": "The iPhone 13 Pro is a cutting-edge smartphone with a powerful camera system, high-performance chip, and stunning display. It offers advanced features for users who demand top-notch technology.",
    "category": "Smartphones",
    "image_url": "/images/products/iphone-13-pro.webp",
    "price": 1099.99,
    "quantity_in_stock": 56
  },
  {
    "product_name": "iPhone X",
    "description": "The iPhone X is a flagship smartphone featuring a bezel-less OLED display, facial recognition technology (Face ID), and impressive performance. It represents a milestone in iPhone design and innovation.",
    "category": "Smartphones",
    "image_url": "/images/products/iphone-x.webp",
    "price": 899.99,
    "quantity_in_stock": 37
  },
  {
    "product_name": "Samsung Galaxy S10",
    "description": "The Samsung Galaxy S10 is a flagship device featuring a dynamic AMOLED display, versatile camera system, and powerful performance. It represents innovation and excellence in smartphone technology.",
    "category": "Smartphones",
    "image_url": "/images/products/samsung-galaxy-s10.webp",
    "price": 699.99,
    "quantity_in_stock": 19
  },
  {
    "product_name": "Samsung Galaxy S8",
    "description": "The Samsung Galaxy S8 is a premium smartphone with an Infinity Display, offering a stunning visual experience. It boasts advanced camera capabilities and cutting-edge technology.",
    "category": "Smartphones",
    "image_url": "/images/products/samsung-galaxy-s8.webp",
    "price": 499.99,
    "quantity_in_stock": 0
  },
  {
    "product_name": "Samsung Galaxy S7",
    "description": "The Samsung Galaxy S7 is a flagship smartphone known for its sleek design and advanced features. It features a high-resolution display, powerful camera, and robust performance.",
    "category": "Smartphones",
    "image_url": "/images/products/samsung-galaxy-s7.webp",
    "price": 299.99,
    "quantity_in_stock": 67
  },
  {
    "product_name": "Oppo F19 Pro Plus",
    "description": "The Oppo F19 Pro Plus is a feature-rich smartphone with a focus on camera capabilities. It boasts advanced photography features and a powerful performance for a premium user experience.",
    "category": "Smartphones",
    "image_url": "/images/products/oppo-f19-pro-plus.webp",
    "price": 399.99,
    "quantity_in_stock": 78
  },
  {
    "product_name": "Realme XT",
    "description": "The Realme XT is a feature-rich smartphone with a focus on camera technology. It comes equipped with advanced camera sensors, delivering high-quality photos and videos for photography enthusiasts.",
    "category": "Smartphones",
    "image_url": "/images/products/realme-xt.webp",
    "price": 349.99,
    "quantity_in_stock": 80
  },
  {
    "product_name": "Vivo X21",
    "description": "The Vivo X21 is a premium smartphone with a focus on cutting-edge technology. It features an in-display fingerprint sensor, a high-resolution display, and advanced camera capabilities.",
    "category": "Smartphones",
    "image_url": "/images/products/vivo-x21.webp",
    "price": 499.99,
    "quantity_in_stock": 7
  },
  {
    "product_name": "iPad Mini 2021 Starlight",
    "description": "The iPad Mini 2021 in Starlight is a compact and powerful tablet from Apple. Featuring a stunning Retina display, powerful A-series chip, and a sleek design, it offers a premium tablet experience.",
    "category": "Tablets",
    "image_url": "/images/products/ipad-mini-2021-starlight.webp",
    "price": 499.99,
    "quantity_in_stock": 47
  },
  {
    "product_name": "Samsung Galaxy Tab S8 Plus Grey",
    "description": "The Samsung Galaxy Tab S8 Plus in Grey is a high-performance Android tablet by Samsung. With a large AMOLED display, powerful processor, and S Pen support, it's ideal for productivity and entertainment.",
    "category": "Tablets",
    "image_url": "/images/products/samsung-galaxy-tab-s8-plus-grey.webp",
    "price": 599.99,
    "quantity_in_stock": 62
  },
  {
    "product_name": "Samsung Galaxy Tab White",
    "description": "The Samsung Galaxy Tab in White is a sleek and versatile Android tablet. With a vibrant display, long-lasting battery, and a range of features, it offers a great user experience for various tasks.",
    "category": "Tablets",
    "image_url": "/images/products/samsung-galaxy-tab-white.webp",
    "price": 349.99,
    "quantity_in_stock": 92
  },
  {
    "product_name": "Apple AirPods Max Silver",
    "description": "The Apple AirPods Max in Silver are premium over-ear headphones with high-fidelity audio, adaptive EQ, and active noise cancellation. Experience immersive sound in style.",
    "category": "Audio & Smart",
    "image_url": "/images/products/apple-airpods-max-silver.webp",
    "price": 549.99,
    "quantity_in_stock": 59
  },
  {
    "product_name": "Apple Airpods",
    "description": "The Apple Airpods offer a seamless wireless audio experience. With easy pairing, high-quality sound, and Siri integration, they are perfect for on-the-go listening.",
    "category": "Audio & Smart",
    "image_url": "/images/products/apple-airpods.webp",
    "price": 129.99,
    "quantity_in_stock": 67
  },
  {
    "product_name": "Beats Flex Wireless Earphones",
    "description": "The Beats Flex Wireless Earphones offer a comfortable and versatile audio experience. With magnetic earbuds and up to 12 hours of battery life, they are ideal for everyday use.",
    "category": "Audio & Smart",
    "image_url": "/images/products/beats-flex-wireless-earphones.webp",
    "price": 49.99,
    "quantity_in_stock": 50
  },
  {
    "product_name": "Apple HomePod Mini Cosmic Grey",
    "description": "The Apple HomePod Mini in Cosmic Grey is a compact smart speaker that delivers impressive audio and integrates seamlessly with the Apple ecosystem for a smart home experience.",
    "category": "Audio & Smart",
    "image_url": "/images/products/apple-homepod-mini-cosmic-grey.webp",
    "price": 99.99,
    "quantity_in_stock": 27
  },
  {
    "product_name": "Amazon Echo Plus",
    "description": "The Amazon Echo Plus is a smart speaker with built-in Alexa voice control. It features premium sound quality and serves as a hub for controlling smart home devices.",
    "category": "Audio & Smart",
    "image_url": "/images/products/amazon-echo-plus.webp",
    "price": 99.99,
    "quantity_in_stock": 61
  },
  {
    "product_name": "Apple Watch Series 4 Gold",
    "description": "The Apple Watch Series 4 in Gold is a stylish and advanced smartwatch with features like heart rate monitoring, fitness tracking, and a beautiful Retina display.",
    "category": "Audio & Smart",
    "image_url": "/images/products/apple-watch-series-4-gold.webp",
    "price": 349.99,
    "quantity_in_stock": 33
  },
  {
    "product_name": "Apple Airpower Wireless Charger",
    "description": "The Apple AirPower Wireless Charger provides a convenient way to charge your compatible Apple devices wirelessly. Simply place your devices on the charging mat for effortless charging.",
    "category": "Accessories",
    "image_url": "/images/products/apple-airpower-wireless-charger.webp",
    "price": 79.99,
    "quantity_in_stock": 1
  },
  {
    "product_name": "Apple MagSafe Battery Pack",
    "description": "The Apple MagSafe Battery Pack is a portable and convenient way to add extra battery life to your MagSafe-compatible iPhone. Attach it magnetically for a secure connection.",
    "category": "Accessories",
    "image_url": "/images/products/apple-magsafe-battery-pack.webp",
    "price": 99.99,
    "quantity_in_stock": 1
  },
  {
    "product_name": "iPhone 12 Silicone Case with MagSafe Plum",
    "description": "The iPhone 12 Silicone Case with MagSafe in Plum is a stylish and protective case designed for the iPhone 12. It features MagSafe technology for easy attachment of accessories.",
    "category": "Accessories",
    "image_url": "/images/products/iphone-12-silicone-case-with-magsafe-plum.webp",
    "price": 29.99,
    "quantity_in_stock": 69
  },
  {
    "product_name": "Apple iPhone Charger",
    "description": "The Apple iPhone Charger is a high-quality charger designed for fast and efficient charging of your iPhone. Ensure your device stays powered up and ready to go.",
    "category": "Accessories",
    "image_url": "/images/products/apple-iphone-charger.webp",
    "price": 19.99,
    "quantity_in_stock": 31
  },
  {
    "product_name": "Selfie Lamp with iPhone",
    "description": "The Selfie Lamp with iPhone is a portable and adjustable LED light designed to enhance your selfies and video calls. Attach it to your iPhone for well-lit photos.",
    "category": "Accessories",
    "image_url": "/images/products/selfie-lamp-with-iphone.webp",
    "price": 14.99,
    "quantity_in_stock": 58
  },
  {
    "product_name": "Rolex Submariner Watch",
    "description": "The Rolex Submariner is a legendary dive watch with a rich history. Known for its durability and water resistance, it's a symbol of adventure and exploration.",
    "category": "Watches",
    "image_url": "/images/products/rolex-submariner-watch.webp",
    "price": 13999.99,
    "quantity_in_stock": 55
  },
  {
    "product_name": "Rolex Datejust",
    "description": "The Rolex Datejust is an iconic and versatile timepiece with a date window. Known for its timeless design and reliability, it's a symbol of Rolex's watchmaking excellence.",
    "category": "Watches",
    "image_url": "/images/products/rolex-datejust.webp",
    "price": 10999.99,
    "quantity_in_stock": 86
  },
  {
    "product_name": "Rolex Cellini Date Black Dial",
    "description": "The Rolex Cellini Date with Black Dial is a classic and prestigious watch. With a black dial and date complication, it exudes sophistication and is a symbol of Rolex's heritage.",
    "category": "Watches",
    "image_url": "/images/products/rolex-cellini-date-black-dial.webp",
    "price": 8999.99,
    "quantity_in_stock": 40
  },
  {
    "product_name": "Longines Master Collection",
    "description": "The Longines Master Collection is an elegant and refined watch known for its precision and craftsmanship. With a timeless design, it's a symbol of luxury and sophistication.",
    "category": "Watches",
    "image_url": "/images/products/longines-master-collection.webp",
    "price": 1499.99,
    "quantity_in_stock": 100
  },
  {
    "product_name": "IWC Ingenieur Automatic Steel",
    "description": "The IWC Ingenieur Automatic Steel watch is a durable and sophisticated timepiece. With a stainless steel case and automatic movement, it combines precision and style for watch enthusiasts.",
    "category": "Watches",
    "image_url": "/images/products/iwc-ingenieur-automatic-steel.webp",
    "price": 4999.99,
    "quantity_in_stock": 90
  },
  {
    "product_name": "Brown Leather Belt Watch",
    "description": "The Brown Leather Belt Watch is a stylish timepiece with a classic design. Featuring a genuine leather strap and a sleek dial, it adds a touch of sophistication to your look.",
    "category": "Watches",
    "image_url": "/images/products/brown-leather-belt-watch.webp",
    "price": 89.99,
    "quantity_in_stock": 32
  },
  {
    "product_name": "Nike Air Jordan 1 Red And Black",
    "description": "The Nike Air Jordan 1 in Red and Black is an iconic basketball sneaker known for its stylish design and high-performance features, making it a favorite among sneaker enthusiasts and athletes.",
    "category": "Shoes",
    "image_url": "/images/products/nike-air-jordan-1-red-and-black.webp",
    "price": 149.99,
    "quantity_in_stock": 7
  },
  {
    "product_name": "Puma Future Rider Trainers",
    "description": "The Puma Future Rider Trainers offer a blend of retro style and modern comfort. Perfect for casual wear, these trainers provide a fashionable and comfortable option for everyday use.",
    "category": "Shoes",
    "image_url": "/images/products/puma-future-rider-trainers.webp",
    "price": 89.99,
    "quantity_in_stock": 90
  },
  {
    "product_name": "Nike Baseball Cleats",
    "description": "Nike Baseball Cleats are designed for maximum traction and performance on the baseball field. They provide stability and support for players during games and practices.",
    "category": "Shoes",
    "image_url": "/images/products/nike-baseball-cleats.webp",
    "price": 79.99,
    "quantity_in_stock": 12
  },
  {
    "product_name": "Sports Sneakers Off White & Red",
    "description": "The Sports Sneakers in Off White and Red combine style and functionality, making them a fashionable choice for sports enthusiasts. The red and off-white color combination adds a bold and energetic touch.",
    "category": "Shoes",
    "image_url": "/images/products/sports-sneakers-off-white-red.webp",
    "price": 119.99,
    "quantity_in_stock": 17
  },
  {
    "product_name": "Prada Women Bag",
    "description": "The Prada Women Bag is an iconic designer bag that exudes elegance and luxury. Crafted with precision and featuring the Prada logo, it's a statement piece for fashion enthusiasts.",
    "category": "Bags & Eyewear",
    "image_url": "/images/products/prada-women-bag.webp",
    "price": 599.99,
    "quantity_in_stock": 75
  },
  {
    "product_name": "Heshe Women's Leather Bag",
    "description": "The Heshe Women's Leather Bag is a luxurious and high-quality leather bag for the sophisticated woman. With a timeless design and durable craftsmanship, it's a versatile accessory.",
    "category": "Bags & Eyewear",
    "image_url": "/images/products/heshe-women-s-leather-bag.webp",
    "price": 129.99,
    "quantity_in_stock": 99
  },
  {
    "product_name": "White Faux Leather Backpack",
    "description": "The White Faux Leather Backpack is a trendy and practical backpack for the modern woman. With a sleek white design and ample storage space, it's perfect for both casual and on-the-go styles.",
    "category": "Bags & Eyewear",
    "image_url": "/images/products/white-faux-leather-backpack.webp",
    "price": 39.99,
    "quantity_in_stock": 39
  },
  {
    "product_name": "Black Sun Glasses",
    "description": "The Black Sun Glasses are a classic and stylish choice, featuring a sleek black frame and tinted lenses. They provide both UV protection and a fashionable look.",
    "category": "Bags & Eyewear",
    "image_url": "/images/products/black-sun-glasses.webp",
    "price": 29.99,
    "quantity_in_stock": 60
  },
  {
    "product_name": "Knoll Saarinen Executive Conference Chair",
    "description": "The Knoll Saarinen Executive Conference Chair is a modern and ergonomic chair, perfect for your office or conference room with its timeless design.",
    "category": "Home & Furniture",
    "image_url": "/images/products/knoll-saarinen-executive-conference-chair.webp",
    "price": 499.99,
    "quantity_in_stock": 26
  },
  {
    "product_name": "Annibale Colombo Sofa",
    "description": "The Annibale Colombo Sofa is a sophisticated and comfortable seating option, featuring exquisite design and premium upholstery for your living room.",
    "category": "Home & Furniture",
    "image_url": "/images/products/annibale-colombo-sofa.webp",
    "price": 2499.99,
    "quantity_in_stock": 60
  },
  {
    "product_name": "Bedside Table African Cherry",
    "description": "The Bedside Table in African Cherry is a stylish and functional addition to your bedroom, providing convenient storage space and a touch of elegance.",
    "category": "Home & Furniture",
    "image_url": "/images/products/bedside-table-african-cherry.webp",
    "price": 299.99,
    "quantity_in_stock": 64
  },
  {
    "product_name": "Table Lamp",
    "description": "The Table Lamp is a functional and decorative lighting solution for your living space. With a modern design, it provides both ambient and task lighting, enhancing the atmosphere.",
    "category": "Home & Furniture",
    "image_url": "/images/products/table-lamp.webp",
    "price": 49.99,
    "quantity_in_stock": 9
  },
  {
    "product_name": "House Showpiece Plant",
    "description": "The House Showpiece Plant is an artificial plant that brings a touch of nature to your home without the need for maintenance. It adds greenery and style to any space.",
    "category": "Home & Furniture",
    "image_url": "/images/products/house-showpiece-plant.webp",
    "price": 39.99,
    "quantity_in_stock": 28
  },
  {
    "product_name": "Chanel Coco Noir Eau De",
    "description": "Coco Noir by Chanel is an elegant and mysterious fragrance, featuring notes of grapefruit, rose, and sandalwood. Perfect for evening occasions.",
    "category": "Fragrances",
    "image_url": "/images/products/chanel-coco-noir-eau-de.webp",
    "price": 129.99,
    "quantity_in_stock": 58
  },
  {
    "product_name": "Dior J'adore",
    "description": "J'adore by Dior is a luxurious and floral fragrance, known for its blend of ylang-ylang, rose, and jasmine. It embodies femininity and sophistication.",
    "category": "Fragrances",
    "image_url": "/images/products/dior-j-adore.webp",
    "price": 89.99,
    "quantity_in_stock": 98
  },
  {
    "product_name": "Gucci Bloom Eau de",
    "description": "Gucci Bloom by Gucci is a floral and captivating fragrance, with notes of tuberose, jasmine, and Rangoon creeper. It's a modern and romantic scent.",
    "category": "Fragrances",
    "image_url": "/images/products/gucci-bloom-eau-de.webp",
    "price": 79.99,
    "quantity_in_stock": 91
  },
  {
    "product_name": "Calvin Klein CK One",
    "description": "CK One by Calvin Klein is a classic unisex fragrance, known for its fresh and clean scent. It's a versatile fragrance suitable for everyday wear.",
    "category": "Fragrances",
    "image_url": "/images/products/calvin-klein-ck-one.webp",
    "price": 49.99,
    "quantity_in_stock": 29
  }
];

module.exports = {
  REAL_PRODUCTS_CATALOG,
  up: async (queryInterface) => {
    const now = new Date();
    const existing = await queryInterface.sequelize.query(
      'SELECT product_id, product_name, image_url FROM table_products',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    const existingByName = new Map(existing.map((row) => [row.product_name, row]));
    const toInsert = [];

    for (let i = 0; i < REAL_PRODUCTS_CATALOG.length; i += 1) {
      const item = REAL_PRODUCTS_CATALOG[i];
      const found = existingByName.get(item.product_name);

      if (found) {
        if (found.image_url !== item.image_url) {
          // eslint-disable-next-line no-await-in-loop
          await queryInterface.sequelize.query(
            'UPDATE table_products SET image_url = :imageUrl, description = :description, category = :category, updated_at = :now WHERE product_id = :productId',
            {
              replacements: {
                imageUrl: item.image_url,
                description: item.description,
                category: item.category,
                now,
                productId: found.product_id,
              },
            },
          );
        }
      } else {
        toInsert.push({
          ...item,
          created_at: now,
          updated_at: now,
        });
      }
    }

    if (toInsert.length > 0) {
      await queryInterface.bulkInsert('table_products', toInsert);
    }
  },

  down: async (queryInterface) => {
    const names = REAL_PRODUCTS_CATALOG.map((p) => p.product_name);
    await queryInterface.bulkDelete('table_products', { product_name: names });
  },
};
