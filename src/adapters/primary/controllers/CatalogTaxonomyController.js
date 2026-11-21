import { errorHandler, errorHandlerCustom } from '../../../utils/errorHandler.js';

class CatalogTaxonomyController {
  constructor(taxonomyService) {
    this.taxonomyService = taxonomyService;
  }

  async listCategories(req, res) {
    try {
      const includeInactive = req.user?.type === 'Admin' && req.query.includeInactive === 'true';
      const categories = await this.taxonomyService.listCategories({ activeOnly: !includeInactive });
      return res.status(200).json({ categories });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getCategoryById(req, res) {
    try {
      const category = await this.taxonomyService.getCategoryById(req.params.categoryId);
      if (!category) return errorHandlerCustom(res, 'Category not found.', 404);
      return res.status(200).json(category);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async createCategory(req, res) {
    try {
      const category = await this.taxonomyService.createCategory(req.body);
      return res.status(201).json({ message: 'Category created successfully.', category });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async updateCategory(req, res) {
    try {
      const category = await this.taxonomyService.updateCategory(req.params.categoryId, req.body);
      if (!category) return errorHandlerCustom(res, 'Category not found.', 404);
      return res.status(200).json({ message: 'Category updated successfully.', category });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async deleteCategory(req, res) {
    try {
      const deleted = await this.taxonomyService.deleteCategory(req.params.categoryId);
      if (!deleted) return errorHandlerCustom(res, 'Category not found.', 404);
      return res.status(200).json({ message: 'Category deleted successfully.', deletedCategory: deleted });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async listBrands(req, res) {
    try {
      const includeInactive = req.user?.type === 'Admin' && req.query.includeInactive === 'true';
      const brands = await this.taxonomyService.listBrands({ activeOnly: !includeInactive });
      return res.status(200).json({ brands });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getBrandById(req, res) {
    try {
      const brand = await this.taxonomyService.getBrandById(req.params.brandId);
      if (!brand) return errorHandlerCustom(res, 'Brand not found.', 404);
      return res.status(200).json(brand);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async createBrand(req, res) {
    try {
      const brand = await this.taxonomyService.createBrand(req.body);
      return res.status(201).json({ message: 'Brand created successfully.', brand });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async updateBrand(req, res) {
    try {
      const brand = await this.taxonomyService.updateBrand(req.params.brandId, req.body);
      if (!brand) return errorHandlerCustom(res, 'Brand not found.', 404);
      return res.status(200).json({ message: 'Brand updated successfully.', brand });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async deleteBrand(req, res) {
    try {
      const deleted = await this.taxonomyService.deleteBrand(req.params.brandId);
      if (!deleted) return errorHandlerCustom(res, 'Brand not found.', 404);
      return res.status(200).json({ message: 'Brand deleted successfully.', deletedBrand: deleted });
    } catch (e) {
      return errorHandler(e, res);
    }
  }
}

export default CatalogTaxonomyController;
