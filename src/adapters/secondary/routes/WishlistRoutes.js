import express from 'express';
import Client from '../../../entities/models/Client.js';
import Wishlist from '../../../entities/models/Wishlist.js';
import WishlistItem from '../../../entities/models/WishlistItem.js';
import Product from '../../../entities/models/Product.js';
import WishlistService from '../../../entities/services/WishlistService.js';
import WishlistController from '../../primary/controllers/WishlistController.js';
import Phase3Validation from '../../../validation/Phase3Validation.js';

const wishlistRouter = express.Router();
const wishlistService = new WishlistService({
  Client, Wishlist, WishlistItem, Product,
});
const wishlistController = new WishlistController(wishlistService);

wishlistRouter.get('/', wishlistController.getWishlist.bind(wishlistController));
wishlistRouter.post('/items', Phase3Validation.addWishlistItemSchema, wishlistController.addItem.bind(wishlistController));
wishlistRouter.delete('/items/:productId', wishlistController.removeItem.bind(wishlistController));

export default wishlistRouter;
