import { CustomError } from '../../utils/errorHandler.js';

class WishlistService {
  constructor(models) {
    this.Client = models.Client;
    this.Wishlist = models.Wishlist;
    this.WishlistItem = models.WishlistItem;
    this.Product = models.Product;
  }

  async resolveDefaultWishlistForUser(userId) {
    const client = await this.Client.findOne({ where: { userId } });
    if (!client) {
      throw new CustomError('Client profile required to use Wishlist. Please complete your profile first.', 400);
    }

    let wishlist = await this.Wishlist.findOne({
      where: { clientId: client.clientId, isDefault: true },
    });
    if (!wishlist) {
      wishlist = await this.Wishlist.create({
        clientId: client.clientId,
        name: 'Favorites',
        isDefault: true,
      });
    }
    return wishlist;
  }

  async getWishlistForUser(userId) {
    const client = await this.Client.findOne({ where: { userId } });
    if (!client) {
      return { wishlist: null, items: [] };
    }

    const wishlist = await this.resolveDefaultWishlistForUser(userId);
    const items = await this.WishlistItem.findAll({
      where: { wishlistId: wishlist.wishlistId },
      include: [
        {
          model: this.Product,
          as: 'product',
          required: true,
        },
      ],
      order: [['wishlistItemId', 'DESC']],
    });

    return {
      wishlist: wishlist.toDict ? wishlist.toDict() : wishlist,
      items: items.map((item) => ({
        wishlistItemId: item.wishlistItemId,
        productId: item.productId,
        createdAt: item.createdAt,
        product: item.product?.toDict ? item.product.toDict() : item.product,
      })),
    };
  }

  async addItem(userId, productId) {
    const product = await this.Product.findByPk(productId);
    if (!product) throw new CustomError('Product not found.', 404);

    const wishlist = await this.resolveDefaultWishlistForUser(userId);

    const [item, created] = await this.WishlistItem.findOrCreate({
      where: {
        wishlistId: wishlist.wishlistId,
        productId: Number(productId),
      },
      defaults: {
        wishlistId: wishlist.wishlistId,
        productId: Number(productId),
      },
    });

    return {
      created,
      item: item.toDict ? item.toDict() : item,
      product: product.toDict ? product.toDict() : product,
    };
  }

  async removeItem(userId, productId) {
    const wishlist = await this.resolveDefaultWishlistForUser(userId);
    const deleted = await this.WishlistItem.destroy({
      where: {
        wishlistId: wishlist.wishlistId,
        productId: Number(productId),
      },
    });
    if (!deleted) throw new CustomError('Item not found in wishlist.', 404);
    return { productId: Number(productId) };
  }
}

export default WishlistService;
