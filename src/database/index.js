/* eslint-disable no-console */
import Sequelize from 'sequelize';
import dbconfig from '../config/database.js';

import User from '../entities/models/User.js';
import Client from '../entities/models/Client.js';
import Order from '../entities/models/Order.js';
import OrderItem from '../entities/models/OrderItem.js';
import Product from '../entities/models/Product.js';
import IdempotencyKey from '../entities/models/IdempotencyKey.js';
import syncModel from '../utils/modelSyncHelper.js';

const connection = new Sequelize(dbconfig);

async function syncModels() {
  try {
    await syncModel(User, 'User', connection);
    await syncModel(Client, 'Client', connection);
    await syncModel(Product, 'Product', connection);
    await syncModel(Order, 'Order', connection);
    await syncModel(OrderItem, 'OrderItem', connection);
    await syncModel(IdempotencyKey, 'IdempotencyKey', connection);

    User.associate(connection.models);
    Client.associate(connection.models);
    Product.associate(connection.models);
    Order.associate(connection.models);
    OrderItem.associate(connection.models);
    IdempotencyKey.associate(connection.models);
    console.log('All models synchronized and associated successfully.');
  } catch (error) {
    console.error('Error syncing models:', error);
    throw error;
  }
}

syncModels();

export default connection;
