import { CustomError } from '../../utils/errorHandler.js';

class ProductService {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  async getAllProducts() {
    return this.productRepository.findAll();
  }

  async getProductById(productId, options = {}) {
    return this.productRepository.findById(productId, options);
  }

  async createProduct(productData) {
    return this.productRepository.create(productData);
  }

  async updateProduct(productId, productData) {
    return this.productRepository.update(productId, productData);
  }

  async deleteProduct(productId) {
    return this.productRepository.delete(productId);
  }

  async getProductsByFilters(filters) {
    return this.productRepository.findByFilters(filters);
  }

  async updateProductQuantity(productId, quantityChange, options = {}) {
    const product = await this.productRepository.findById(productId, options);

    if (!product) {
      throw new CustomError('Product not found.', 404);
    }

    const newQuantity = product.quantityInStock + quantityChange;
    if (newQuantity < 0) {
      throw new CustomError('Insufficient quantity in stock.', 400);
    }

    await this.productRepository.update(productId, { quantityInStock: newQuantity }, options);
  }
}

export default ProductService;
