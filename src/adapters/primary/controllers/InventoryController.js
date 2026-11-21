import { errorHandler } from '../../../utils/errorHandler.js';
import {
  buildPaginationMeta,
  parsePaginationAndSort,
  setPaginationHeaders,
} from '../../../utils/pagination.js';

const MOVEMENT_SORT_FIELDS = ['movementId', 'createdAt', 'quantity', 'type', 'productId'];

class InventoryController {
  constructor(inventoryService) {
    this.inventoryService = inventoryService;
  }

  async getSummary(req, res) {
    try {
      const summary = await this.inventoryService.getInventorySummary();
      return res.status(200).json(summary);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getLowStock(req, res) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const products = await this.inventoryService.getLowStockProducts({ includeInactive });
      return res.status(200).json({ products });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getMovements(req, res) {
    try {
      const {
        isPaginated,
        page,
        limit,
        offset,
        order,
      } = parsePaginationAndSort(req.query, {
        allowedSortFields: MOVEMENT_SORT_FIELDS,
        defaultSortField: 'movementId',
        defaultSortOrder: 'DESC',
        tieBreakerField: 'movementId',
      });

      const { rows, count } = await this.inventoryService.getMovements(req.query, {
        paginated: isPaginated,
        limit,
        offset,
        order,
      });

      if (isPaginated) {
        const pagination = buildPaginationMeta(count, page, limit);
        setPaginationHeaders(res, pagination);
        return res.status(200).json({ movements: rows, pagination });
      }

      return res.status(200).json({ movements: rows });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async createMovement(req, res) {
    try {
      const result = await this.inventoryService.recordMovement({
        ...req.body,
        userId: req.user?.id || null,
      });
      return res.status(201).json({
        message: 'Stock movement recorded successfully.',
        ...result,
      });
    } catch (e) {
      return errorHandler(e, res);
    }
  }
}

export default InventoryController;
