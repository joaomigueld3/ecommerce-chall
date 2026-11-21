import { CustomError } from '../../utils/errorHandler.js';

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

class CatalogTaxonomyService {
  constructor(categoryModel, brandModel) {
    this.categoryModel = categoryModel;
    this.brandModel = brandModel;
  }

  async listCategories({ activeOnly = true } = {}) {
    const where = activeOnly ? { active: true } : {};
    return this.categoryModel.findAll({
      where,
      include: [{ model: this.categoryModel, as: 'children', required: false }],
      order: [['displayOrder', 'ASC'], ['name', 'ASC']],
    });
  }

  async getCategoryById(categoryId) {
    return this.categoryModel.findByPk(categoryId, {
      include: [
        { model: this.categoryModel, as: 'parent', required: false },
        { model: this.categoryModel, as: 'children', required: false },
      ],
    });
  }

  async createCategory(payload) {
    const slug = slugify(payload.slug || payload.name);
    if (!slug) throw new CustomError('Valid category name/slug is required.', 400);

    const existing = await this.categoryModel.findOne({ where: { slug } });
    if (existing) throw new CustomError(`Category slug '${slug}' already exists.`, 409);

    if (payload.parentId) {
      const parent = await this.categoryModel.findByPk(payload.parentId);
      if (!parent) throw new CustomError('Parent category not found.', 404);
    }

    return this.categoryModel.create({ ...payload, slug });
  }

  async updateCategory(categoryId, payload) {
    const category = await this.categoryModel.findByPk(categoryId);
    if (!category) return null;

    const updateData = { ...payload };
    if (payload.slug || payload.name) {
      const nextSlug = slugify(payload.slug || payload.name);
      const conflict = await this.categoryModel.findOne({ where: { slug: nextSlug } });
      if (conflict && Number(conflict.categoryId) !== Number(categoryId)) {
        throw new CustomError(`Category slug '${nextSlug}' already exists.`, 409);
      }
      if (payload.slug) updateData.slug = nextSlug;
    }

    if (payload.parentId && Number(payload.parentId) === Number(categoryId)) {
      throw new CustomError('Category cannot be its own parent.', 400);
    }

    return category.update(updateData);
  }

  async deleteCategory(categoryId) {
    const category = await this.categoryModel.findByPk(categoryId);
    if (!category) return null;
    await category.destroy();
    return category;
  }

  async listBrands({ activeOnly = true } = {}) {
    const where = activeOnly ? { active: true } : {};
    return this.brandModel.findAll({
      where,
      order: [['name', 'ASC']],
    });
  }

  async getBrandById(brandId) {
    return this.brandModel.findByPk(brandId);
  }

  async createBrand(payload) {
    const slug = slugify(payload.slug || payload.name);
    if (!slug) throw new CustomError('Valid brand name/slug is required.', 400);

    const existing = await this.brandModel.findOne({ where: { slug } });
    if (existing) throw new CustomError(`Brand slug '${slug}' already exists.`, 409);

    return this.brandModel.create({ ...payload, slug });
  }

  async updateBrand(brandId, payload) {
    const brand = await this.brandModel.findByPk(brandId);
    if (!brand) return null;

    const updateData = { ...payload };
    if (payload.slug) {
      const nextSlug = slugify(payload.slug);
      const conflict = await this.brandModel.findOne({ where: { slug: nextSlug } });
      if (conflict && Number(conflict.brandId) !== Number(brandId)) {
        throw new CustomError(`Brand slug '${nextSlug}' already exists.`, 409);
      }
      updateData.slug = nextSlug;
    }

    return brand.update(updateData);
  }

  async deleteBrand(brandId) {
    const brand = await this.brandModel.findByPk(brandId);
    if (!brand) return null;
    await brand.destroy();
    return brand;
  }
}

export default CatalogTaxonomyService;
export { slugify };
