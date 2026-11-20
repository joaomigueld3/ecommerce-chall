import { Op } from 'sequelize';
import { errorHandler, errorHandlerCustom } from '../../../utils/errorHandler.js';
import {
  buildPaginationMeta,
  parsePaginationAndSort,
  setPaginationHeaders,
} from '../../../utils/pagination.js';

const REPORT_SORT_FIELDS = [
  'reportId',
  'period',
  'periodStart',
  'periodEnd',
  'totalSales',
  'productsSold',
  'createdAt',
];

function buildReportFilters(filters) {
  const filterOptions = {};
  if (filters.startDate) {
    filterOptions.periodStart = { [Op.gte]: new Date(filters.startDate) };
  }
  if (filters.endDate) {
    filterOptions.periodEnd = { [Op.lte]: new Date(filters.endDate) };
  }
  if (filters.minTotalSales !== undefined && filters.minTotalSales !== '') {
    filterOptions.totalSales = { [Op.gte]: parseFloat(filters.minTotalSales) };
  }
  if (filters.maxTotalSales !== undefined && filters.maxTotalSales !== '') {
    filterOptions.totalSales = {
      ...filterOptions.totalSales,
      [Op.lte]: parseFloat(filters.maxTotalSales),
    };
  }
  return filterOptions;
}

class SalesReportController {
  constructor(salesReportService) {
    this.salesReportService = salesReportService;
  }

  async generateReport(req, res) {
    try {
      const result = await this.salesReportService.generateReport(req.body);
      return res.status(201).json({
        message: 'Sales report generated successfully.',
        ...result,
      });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getAllReports(req, res) {
    try {
      const filterOptions = buildReportFilters(req.query);
      const {
        isPaginated,
        page,
        limit,
        offset,
        order,
      } = parsePaginationAndSort(req.query, {
        allowedSortFields: REPORT_SORT_FIELDS,
        defaultSortField: 'reportId',
        defaultSortOrder: 'DESC',
        tieBreakerField: 'reportId',
      });

      if (isPaginated) {
        const { rows, count } = await this.salesReportService.getReportsPaginated(filterOptions, {
          order,
          limit,
          offset,
        });
        const pagination = buildPaginationMeta(count, page, limit);
        setPaginationHeaders(res, pagination);
        return res.status(200).json({ allReports: rows, pagination });
      }

      const reports = Object.keys(filterOptions).length > 0
        ? await this.salesReportService.getReportsByFilters(filterOptions, { order })
        : await this.salesReportService.getAllReports({ order });
      return res.status(200).json({ allReports: reports });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getReportById(req, res) {
    try {
      const { reportId } = req.params;
      const report = await this.salesReportService.getReportById(reportId);
      if (!report) return errorHandlerCustom(res, 'Report not found.', 404);
      return res.status(200).json(report);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getReportsByFilters(req, res) {
    try {
      const filterOptions = buildReportFilters(req.body);
      const reports = await this.salesReportService.getReportsByFilters(filterOptions);
      if (reports.length < 1) {
        return errorHandlerCustom(res, 'Reports not found.', 404);
      }
      return res.status(200).json(reports);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async updateReport(req, res) {
    try {
      const { reportId } = req.params;
      const updated = await this.salesReportService.updateReport(reportId, req.body);
      if (!updated) return errorHandlerCustom(res, 'Report not found.', 404);
      return res.status(200).json({
        message: 'Report updated successfully.',
        updatedReport: updated,
      });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async deleteReport(req, res) {
    try {
      const { reportId } = req.params;
      const deletedReport = await this.salesReportService.deleteReport(reportId);
      if (!deletedReport) return errorHandlerCustom(res, 'Report not found.', 404);
      return res.status(200).json({
        message: 'Report deleted successfully.',
        deletedReport,
      });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async downloadReport(req, res) {
    try {
      const { reportId } = req.params;
      const { filePath, fileName } = await this.salesReportService.getReportFile(reportId);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.status(200).sendFile(filePath);
    } catch (e) {
      return errorHandler(e, res);
    }
  }
}

export default SalesReportController;
