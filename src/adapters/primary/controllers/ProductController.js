import { Op } from 'sequelize';
import { errorHandlerCustom, errorHandler } from '../../../utils/errorHandler.js';

function parseCategories(rawCategories, rawCategory) {
  let list = [];
  if (Array.isArray(rawCategories)) {
    list = rawCategories;
  } else if (typeof rawCategories === 'string' && rawCategories.trim()) {
    list = rawCategories.split(',');
  }
  if (typeof rawCategory === 'string' && rawCategory.trim()) {
    list.push(...rawCategory.split(','));
  }
  return [...new Set(list.map((c) => c.trim()).filter(Boolean))];
}

function buildProductFilterOptions(filters) {
  const filterOptions = {};

  if (filters.productName) {
    filterOptions.productName = { [Op.iLike]: `%${filters.productName}%` };
  }
  if (filters.description) {
    filterOptions.description = { [Op.iLike]: `%${filters.description}%` };
  }

  const categories = parseCategories(filters.categories, filters.category);
  if (categories.length === 1) {
    filterOptions.category = { [Op.iLike]: categories[0] };
  } else if (categories.length > 1) {
    filterOptions.category = {
      [Op.or]: categories.map((cat) => ({ [Op.iLike]: cat })),
    };
  }

  if (filters.minPrice !== undefined && filters.minPrice !== '') {
    filterOptions.price = { [Op.gte]: parseFloat(filters.minPrice) };
  }
  if (filters.maxPrice !== undefined && filters.maxPrice !== '') {
    filterOptions.price = { ...filterOptions.price, [Op.lte]: parseFloat(filters.maxPrice) };
  }

  if (filters.available !== undefined && filters.available !== '') {
    const isAvailable = filters.available === true || filters.available === 'true';
    filterOptions.quantityInStock = isAvailable ? { [Op.gt]: 0 } : 0;
  } else if (filters.quantityInStock !== undefined && filters.quantityInStock !== '') {
    filterOptions.quantityInStock = parseInt(filters.quantityInStock, 10);
  }

  return filterOptions;
}

class ProductController {
  constructor(productService) {
    this.productService = productService;
  }

  async getAllProducts(req, res) {
    try {
      const filterOptions = buildProductFilterOptions(req.query);
      const products = Object.keys(filterOptions).length > 0
        ? await this.productService.getProductsByFilters(filterOptions)
        : await this.productService.getAllProducts();

      return res.status(200).json(products);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getProductById(req, res) {
    try {
      const { productId } = req.params;
      const product = await this.productService.getProductById(productId);
      if (!product) return errorHandlerCustom(res, 'Product not found', 404);
      return res.status(200).json(product);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async createProduct(req, res) {
    try {
      const productData = req.body;
      const product = await this.productService.createProduct(productData);
      return res.status(201).json({ message: 'Product created', product });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async updateProduct(req, res) {
    try {
      const { productId } = req.params;
      const productData = req.body;
      const product = await this.productService.getProductById(productId);
      if (!product) return errorHandlerCustom(res, 'Product not found', 404);

      const updatedProduct = await this.productService.updateProduct(productId, productData);
      return res.status(200).json({ message: 'Product updated successfully', updatedProduct });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async deleteProduct(req, res) {
    try {
      const { productId } = req.params;
      const product = await this.productService.getProductById(productId);
      if (!product) return errorHandlerCustom(res, 'Product not found', 404);

      const deletedProduct = product;
      await this.productService.deleteProduct(productId);
      return res.status(200).json({ message: 'Product deleted successfully.', deletedProduct });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getProductsByFilters(req, res) {
    try {
      const filterOptions = buildProductFilterOptions(req.body);
      const filteredProducts = await this.productService.getProductsByFilters(filterOptions);
      if (filteredProducts.length < 1) return errorHandlerCustom(res, 'Products not found', 404);

      return res.status(200).json(filteredProducts);
    } catch (e) {
      return errorHandler(e, res);
    }
  }
}

export default ProductController;
