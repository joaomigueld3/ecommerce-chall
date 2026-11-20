import Sequelize from 'sequelize';
import dbconfig from '../config/database.cjs';

import StoreSetting from '../entities/models/StoreSetting.js';
import User from '../entities/models/User.js';
import Client from '../entities/models/Client.js';
import ClientAddress from '../entities/models/ClientAddress.js';
import SavedPaymentMethod from '../entities/models/SavedPaymentMethod.js';
import Wishlist from '../entities/models/Wishlist.js';
import WishlistItem from '../entities/models/WishlistItem.js';
import Category from '../entities/models/Category.js';
import Brand from '../entities/models/Brand.js';
import Product from '../entities/models/Product.js';
import ProductImage from '../entities/models/ProductImage.js';
import ProductVariant from '../entities/models/ProductVariant.js';
import ProductReview from '../entities/models/ProductReview.js';
import ProductQuestion from '../entities/models/ProductQuestion.js';
import Order from '../entities/models/Order.js';
import OrderItem from '../entities/models/OrderItem.js';
import IdempotencyKey from '../entities/models/IdempotencyKey.js';
import StockMovement from '../entities/models/StockMovement.js';
import SalesReport from '../entities/models/SalesReport.js';

const connection = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, dbconfig)
  : new Sequelize(dbconfig);

const models = [
  StoreSetting,
  User,
  Client,
  ClientAddress,
  SavedPaymentMethod,
  Wishlist,
  WishlistItem,
  Category,
  Brand,
  Product,
  ProductImage,
  ProductVariant,
  ProductReview,
  ProductQuestion,
  Order,
  OrderItem,
  IdempotencyKey,
  StockMovement,
  SalesReport,
];

models.forEach((model) => model.init(connection));
models.forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(connection.models);
  }
});

export default connection;
