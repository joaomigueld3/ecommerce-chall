import fs from 'node:fs';
import path from 'node:path';
import { QueryTypes } from 'sequelize';
import { CustomError } from '../../utils/errorHandler.js';

const DEFAULT_PAID_STATUSES = ['Received', 'In Preparation', 'Dispatched', 'Delivered'];
const DEFAULT_REPORTS_DIR = path.resolve(process.cwd(), 'storage', 'reports');

function toCents(value) {
  return Math.round(parseFloat(value || 0) * 100);
}

class SalesReportService {
  constructor(salesReportRepository, connection, options = {}) {
    this.salesReportRepository = salesReportRepository;
    this.connection = connection;
    this.reportsDir = options.reportsDir ?? DEFAULT_REPORTS_DIR;
  }

  static escapeCsvCell(value) {
    const raw = String(value ?? '');
    const neutralized = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    if (/[",\n\r]/.test(neutralized)) {
      return `"${neutralized.replace(/"/g, '""')}"`;
    }
    return neutralized;
  }

  static formatReportCsv(items, summary) {
    const header = 'productId,productName,category,quantitySold,revenue';
    const rows = items.map((item) => [
      SalesReportService.escapeCsvCell(item.productId),
      SalesReportService.escapeCsvCell(item.productName),
      SalesReportService.escapeCsvCell(item.category),
      SalesReportService.escapeCsvCell(item.quantitySold),
      SalesReportService.escapeCsvCell(Number(item.revenue).toFixed(2)),
    ].join(','));

    const totalRow = [
      'TOTAL',
      '',
      '',
      SalesReportService.escapeCsvCell(summary.productsSold),
      SalesReportService.escapeCsvCell(Number(summary.totalSales).toFixed(2)),
    ].join(',');

    return [header, ...rows, totalRow].join('\n');
  }

  static buildAggregationQuery({ category, clientId }) {
    const clauses = [
      'o.order_date >= :startDate',
      'o.order_date <= :endDate',
      'o.status IN (:statuses)',
    ];

    if (category) {
      clauses.push('p.category ILIKE :category');
    }
    if (clientId) {
      clauses.push('o.client_id = :clientId');
    }

    return `
      SELECT
        p.product_id AS "productId",
        p.product_name AS "productName",
        p.category AS "category",
        COALESCE(SUM(oi.quantity), 0)::INTEGER AS "quantitySold",
        COALESCE(SUM(oi.subtotal), 0)::NUMERIC(12, 2) AS "revenue"
      FROM table_order_items oi
      INNER JOIN table_orders o ON o.order_id = oi.order_id
      INNER JOIN table_products p ON p.product_id = oi.product_id
      WHERE ${clauses.join(' AND ')}
      GROUP BY p.product_id, p.product_name, p.category
      ORDER BY "revenue" DESC, "quantitySold" DESC, p.product_id ASC
    `;
  }

  async generateReport({
    startDate,
    endDate,
    category,
    status,
    clientId,
  }) {
    const periodStart = new Date(startDate);
    const periodEnd = new Date(endDate);

    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
      throw new CustomError('Invalid startDate or endDate.', 400);
    }
    if (periodEnd < periodStart) {
      throw new CustomError('endDate must be greater than or equal to startDate.', 400);
    }

    const statuses = status ? [status] : DEFAULT_PAID_STATUSES;
    const sql = SalesReportService.buildAggregationQuery({
      category: Boolean(category),
      clientId: Boolean(clientId),
    });

    const replacements = {
      startDate: periodStart,
      endDate: periodEnd,
      statuses,
      ...(category ? { category: `%${category}%` } : {}),
      ...(clientId ? { clientId: Number(clientId) } : {}),
    };

    const aggregatedRows = await this.connection.query(sql, {
      replacements,
      type: QueryTypes.SELECT,
    });

    let productsSold = 0;
    let totalSalesCents = 0;

    const normalizedItems = aggregatedRows.map((row) => {
      const quantitySold = Number(row.quantitySold) || 0;
      const revenueCents = toCents(row.revenue);
      productsSold += quantitySold;
      totalSalesCents += revenueCents;

      return {
        productId: Number(row.productId),
        productName: row.productName,
        category: row.category || 'General',
        quantitySold,
        revenue: (revenueCents / 100).toFixed(2),
      };
    });

    const totalSales = (totalSalesCents / 100).toFixed(2);
    const csvContent = SalesReportService.formatReportCsv(normalizedItems, {
      productsSold,
      totalSales,
    });

    fs.mkdirSync(this.reportsDir, { recursive: true });
    const fileName = `sales-report-${Date.now()}.csv`;
    const absoluteFilePath = path.resolve(this.reportsDir, fileName);
    fs.writeFileSync(absoluteFilePath, csvContent, 'utf8');

    const relativeFilePath = path.posix.join('storage', 'reports', fileName);
    const filters = {};
    if (category) filters.category = category;
    if (status) filters.status = status;
    if (clientId) filters.clientId = Number(clientId);

    const report = await this.salesReportRepository.create({
      period: periodEnd,
      periodStart,
      periodEnd,
      totalSales,
      productsSold,
      filePath: relativeFilePath,
      filters: Object.keys(filters).length ? filters : null,
    });

    return {
      report: report.toDict ? report.toDict() : report,
      items: normalizedItems,
    };
  }

  async getAllReports(options = {}) {
    return this.salesReportRepository.findAll(options);
  }

  async getReportById(reportId) {
    return this.salesReportRepository.findById(reportId);
  }

  async getReportsByFilters(filters, options = {}) {
    return this.salesReportRepository.findByFilters(filters, options);
  }

  async getReportsPaginated(filters = {}, options = {}) {
    return this.salesReportRepository.findAndCountByFilters(filters, options);
  }

  async updateReport(reportId, updatedData) {
    return this.salesReportRepository.update(reportId, updatedData);
  }

  async deleteReport(reportId) {
    const report = await this.salesReportRepository.findById(reportId);
    if (!report) return null;

    const resolved = this.resolveSafeFilePath(report.filePath);
    if (resolved && fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
    }

    await this.salesReportRepository.delete(reportId);
    return report;
  }

  resolveSafeFilePath(storedPath) {
    if (!storedPath) return null;
    const baseName = path.basename(storedPath);
    const resolved = path.resolve(this.reportsDir, baseName);
    if (!resolved.startsWith(this.reportsDir)) {
      return null;
    }
    return resolved;
  }

  async getReportFile(reportId) {
    const report = await this.salesReportRepository.findById(reportId);
    if (!report) {
      throw new CustomError('Report not found.', 404);
    }

    const filePath = this.resolveSafeFilePath(report.filePath);
    if (!filePath || !fs.existsSync(filePath)) {
      throw new CustomError('Report CSV file not found on storage.', 404);
    }

    return {
      report,
      filePath,
      fileName: path.basename(filePath),
    };
  }
}

export default SalesReportService;
