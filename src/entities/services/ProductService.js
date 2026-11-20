import { CustomError } from '../../utils/errorHandler.js';

class ProductService {
  constructor(productRepository, dependencies = {}) {
    this.productRepository = productRepository;
    this.models = dependencies.models ?? {};
  }

  async getAllProducts(options = {}) {
    return this.productRepository.findAll(options);
  }

  async getProductById(productId) {
    return this.productRepository.findById(productId);
  }

  async getDetailedProductById(productId) {
    if (typeof this.productRepository.findDetailedById === 'function' && Object.keys(this.models).length > 0) {
      return this.productRepository.findDetailedById(productId, this.models);
    }
    return this.productRepository.findById(productId);
  }

  async getProductByIdForUpdate(productId, transaction) {
    return this.productRepository.findByIdForUpdate(productId, transaction);
  }

  async createProduct(productData) {
    return this.productRepository.create(productData);
  }

  async updateProduct(productId, productData) {
    return this.productRepository.update(productId, productData);
  }

  async deleteProduct(productId) {
    const product = await this.productRepository.findById(productId);
    if (!product) return null;

    const { OrderItem, StockMovement } = this.models;
    let hasHistory = false;

    if (OrderItem) {
      const orderCount = await OrderItem.count({ where: { productId } });
      if (orderCount > 0) hasHistory = true;
    }
    if (!hasHistory && StockMovement) {
      const movementCount = await StockMovement.count({ where: { productId } });
      if (movementCount > 0) hasHistory = true;
    }

    if (hasHistory) {
      const archived = await this.productRepository.update(productId, { active: false });
      return { archived: true, product: archived };
    }

    await this.productRepository.delete(productId);
    return { archived: false, product };
  }

  async getProductsByFilters(filters, options = {}) {
    return this.productRepository.findByFilters(filters, options);
  }

  async getProductsPaginated(filters = {}, options = {}) {
    return this.productRepository.findAndCountByFilters(filters, options);
  }

  async getRelatedProducts(productId, limit = 4) {
    const product = await this.productRepository.findById(productId);
    if (!product) throw new CustomError('Product not found', 404);
    return this.productRepository.findRelated(product, limit);
  }

  async getLowStockProducts(includeInactive = false) {
    return this.productRepository.findLowStock(includeInactive);
  }

  async getCategories() {
    return this.productRepository.getCategories();
  }

  async addProductImage(productId, payload) {
    const product = await this.productRepository.findById(productId);
    if (!product) throw new CustomError('Product not found', 404);

    const { ProductImage } = this.models;
    if (payload.isPrimary) {
      await ProductImage.update({ isPrimary: false }, { where: { productId } });
      await this.productRepository.update(productId, { imageUrl: payload.url });
    }

    return ProductImage.create({
      productId: Number(productId),
      url: payload.url,
      altText: payload.altText || product.productName,
      isPrimary: Boolean(payload.isPrimary),
      sortOrder: Number(payload.sortOrder || 0),
    });
  }

  async deleteProductImage(productId, imageId) {
    const { ProductImage } = this.models;
    const image = await ProductImage.findOne({ where: { imageId, productId } });
    if (!image) throw new CustomError('Product image not found', 404);
    await image.destroy();
    return image;
  }

  async createVariant(productId, payload) {
    const product = await this.productRepository.findById(productId);
    if (!product) throw new CustomError('Product not found', 404);

    const { ProductVariant } = this.models;
    const existingSku = await ProductVariant.findOne({ where: { sku: payload.sku } });
    if (existingSku) throw new CustomError(`Variant SKU '${payload.sku}' already exists.`, 409);

    return ProductVariant.create({
      productId: Number(productId),
      sku: payload.sku,
      name: payload.name,
      attributes: payload.attributes ?? null,
      priceOverride: payload.priceOverride ?? null,
      quantityInStock: Number(payload.quantityInStock ?? 0),
      active: payload.active !== undefined ? Boolean(payload.active) : true,
    });
  }

  async updateVariant(productId, variantId, payload) {
    const { ProductVariant } = this.models;
    const variant = await ProductVariant.findOne({ where: { variantId, productId } });
    if (!variant) throw new CustomError('Product variant not found', 404);

    if (payload.sku && payload.sku !== variant.sku) {
      const existingSku = await ProductVariant.findOne({ where: { sku: payload.sku } });
      if (existingSku) throw new CustomError(`Variant SKU '${payload.sku}' already exists.`, 409);
    }

    return variant.update(payload);
  }

  async deleteVariant(productId, variantId) {
    const { ProductVariant } = this.models;
    const variant = await ProductVariant.findOne({ where: { variantId, productId } });
    if (!variant) throw new CustomError('Product variant not found', 404);
    await variant.destroy();
    return variant;
  }

  async updateProductQuantity(productId, quantityChange, options = {}) {
    const product = await this.productRepository.findById(productId, options);

    if (!product) {
      throw new Error('Product not found.');
    }

    const newQuantity = product.quantityInStock + quantityChange;

    await this.productRepository.update(productId, { quantityInStock: newQuantity }, options);
  }
}

export default ProductService;
