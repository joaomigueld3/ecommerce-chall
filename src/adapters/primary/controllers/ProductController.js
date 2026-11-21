import { Op } from 'sequelize';
import { errorHandlerCustom, errorHandler } from '../../../utils/errorHandler.js';
import {
  buildPaginationMeta,
  parsePaginationAndSort,
  setPaginationHeaders,
} from '../../../utils/pagination.js';

const PRODUCT_SORT_FIELDS = [
  'productId',
  'productName',
  'sku',
  'category',
  'price',
  'originalPrice',
  'quantityInStock',
  'ratingAvg',
  'salesCount',
  'createdAt',
  'updatedAt',
];

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

function buildProductFilterOptions(filters, { isAdmin = false } = {}) {
  const filterOptions = {};

  if (!isAdmin || filters.includeInactive !== 'true') {
    filterOptions.active = true;
  }

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

  if (filters.categoryId) {
    filterOptions.categoryId = Number(filters.categoryId);
  }
  if (filters.brandId) {
    filterOptions.brandId = Number(filters.brandId);
  }
  if (filters.featured === true || filters.featured === 'true') {
    filterOptions.featured = true;
  }
  if (filters.isDealOfDay === true || filters.isDealOfDay === 'true') {
    filterOptions.isDealOfDay = true;
  }
  if (filters.minRating !== undefined && filters.minRating !== '') {
    filterOptions.ratingAvg = { [Op.gte]: parseFloat(filters.minRating) };
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
      const isAdmin = req.user?.type === 'Admin';
      const filterOptions = buildProductFilterOptions(req.query, { isAdmin });
      const {
        isPaginated,
        page,
        limit,
        offset,
        order,
      } = parsePaginationAndSort(req.query, {
        allowedSortFields: PRODUCT_SORT_FIELDS,
        defaultSortField: 'productId',
        defaultSortOrder: 'DESC',
        tieBreakerField: 'productId',
      });

      if (isPaginated) {
        const { rows, count } = await this.productService.getProductsPaginated(filterOptions, {
          order,
          limit,
          offset,
        });
        const pagination = buildPaginationMeta(count, page, limit);
        setPaginationHeaders(res, pagination);
        return res.status(200).json({ items: rows, pagination });
      }

      const products = await this.productService.getProductsByFilters(filterOptions, { order });
      return res.status(200).json(products);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getCategories(req, res) {
    try {
      const categories = await this.productService.getCategories();
      return res.status(200).json({ categories });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getLowStockProducts(req, res) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const products = await this.productService.getLowStockProducts(includeInactive);
      return res.status(200).json({ products });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getProductById(req, res) {
    try {
      const { productId } = req.params;
      const product = await this.productService.getDetailedProductById(productId);
      if (!product) return errorHandlerCustom(res, 'Product not found', 404);
      return res.status(200).json(product);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getRelatedProducts(req, res) {
    try {
      const { productId } = req.params;
      const limit = Math.min(12, Math.max(1, Number.parseInt(req.query.limit || '4', 10) || 4));
      const products = await this.productService.getRelatedProducts(productId, limit);
      return res.status(200).json({ products });
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
      const result = await this.productService.deleteProduct(productId);
      if (!result) return errorHandlerCustom(res, 'Product not found', 404);

      if (result.archived) {
        return res.status(200).json({
          message: 'Product has order or inventory history and was archived (active=false).',
          archived: true,
          deletedProduct: result.product,
        });
      }

      return res.status(200).json({
        message: 'Product deleted successfully.',
        archived: false,
        deletedProduct: result.product,
      });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async addProductImage(req, res) {
    try {
      const image = await this.productService.addProductImage(req.params.productId, req.body);
      return res.status(201).json({ message: 'Product image added.', image });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async deleteProductImage(req, res) {
    try {
      const image = await this.productService.deleteProductImage(
        req.params.productId,
        req.params.imageId,
      );
      return res.status(200).json({ message: 'Product image deleted.', deletedImage: image });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async createVariant(req, res) {
    try {
      const variant = await this.productService.createVariant(req.params.productId, req.body);
      return res.status(201).json({ message: 'Product variant created.', variant });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async updateVariant(req, res) {
    try {
      const variant = await this.productService.updateVariant(
        req.params.productId,
        req.params.variantId,
        req.body,
      );
      return res.status(200).json({ message: 'Product variant updated.', variant });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async deleteVariant(req, res) {
    try {
      const variant = await this.productService.deleteVariant(
        req.params.productId,
        req.params.variantId,
      );
      return res.status(200).json({ message: 'Product variant deleted.', deletedVariant: variant });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getProductsByFilters(req, res) {
    try {
      const isAdmin = req.user?.type === 'Admin';
      const filterOptions = buildProductFilterOptions(req.body, { isAdmin });
      const filteredProducts = await this.productService.getProductsByFilters(filterOptions);
      if (filteredProducts.length < 1) return errorHandlerCustom(res, 'Products not found', 404);

      return res.status(200).json(filteredProducts);
    } catch (e) {
      return errorHandler(e, res);
    }
  }
}

export default ProductController;
