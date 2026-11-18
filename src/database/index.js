import Sequelize from 'sequelize';
import dbconfig from '../config/database.cjs';

import User from '../entities/models/User.js';
import Client from '../entities/models/Client.js';
import Order from '../entities/models/Order.js';
import OrderItem from '../entities/models/OrderItem.js';
import Product from '../entities/models/Product.js';
import IdempotencyKey from '../entities/models/IdempotencyKey.js';
import SalesReport from '../entities/models/SalesReport.js';

const connection = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, dbconfig)
  : new Sequelize(dbconfig);

const models = [
  User,
  Client,
  Product,
  Order,
  OrderItem,
  IdempotencyKey,
  SalesReport,
];

models.forEach((model) => model.init(connection));
models.forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(connection.models);
  }
});

export default connection;
