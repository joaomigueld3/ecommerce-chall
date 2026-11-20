import { errorHandler } from '../../../utils/errorHandler.js';

class WishlistController {
  constructor(wishlistService) {
    this.wishlistService = wishlistService;
  }

  async getWishlist(req, res) {
    try {
      const data = await this.wishlistService.getWishlistForUser(req.user.id);
      return res.status(200).json(data);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async addItem(req, res) {
    try {
      const result = await this.wishlistService.addItem(req.user.id, req.body.productId);
      return res.status(result.created ? 201 : 200).json({
        message: result.created ? 'Product added to wishlist.' : 'Product already in wishlist.',
        ...result,
      });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async removeItem(req, res) {
    try {
      const result = await this.wishlistService.removeItem(req.user.id, req.params.productId);
      return res.status(200).json({
        message: 'Product removed from wishlist.',
        ...result,
      });
    } catch (e) {
      return errorHandler(e, res);
    }
  }
}

export default WishlistController;
