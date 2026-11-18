import express from 'express';
import { requireAdmin } from '../../../utils/middlewareAuth.js';
import SalesReport from '../../../entities/models/SalesReport.js';
import SalesReportRepository from '../../../entities/repositories/SalesReportRepository.js';
import SalesReportService from '../../../entities/services/SalesReportService.js';
import SalesReportController from '../../primary/controllers/SalesReportController.js';
import SalesReportValidation from '../../../validation/SalesReportValidation.js';
import connection from '../../../database/index.js';

const salesReportRouter = express.Router();

const salesReportRepository = new SalesReportRepository(SalesReport);
const salesReportService = new SalesReportService(salesReportRepository, connection);
const salesReportController = new SalesReportController(salesReportService);

salesReportRouter.use(requireAdmin);

salesReportRouter.get('/', salesReportController.getAllReports.bind(salesReportController));
salesReportRouter.post('/', SalesReportValidation.createReportSchema, salesReportController.generateReport.bind(salesReportController));
salesReportRouter.post('/filters', SalesReportValidation.getReportsByFiltersSchema, salesReportController.getReportsByFilters.bind(salesReportController));
salesReportRouter.get('/:reportId/download', SalesReportValidation.getReportByIdSchema, salesReportController.downloadReport.bind(salesReportController));
salesReportRouter.get('/:reportId', SalesReportValidation.getReportByIdSchema, salesReportController.getReportById.bind(salesReportController));
salesReportRouter.put('/:reportId', SalesReportValidation.getReportByIdSchema, SalesReportValidation.updateReportSchema, salesReportController.updateReport.bind(salesReportController));
salesReportRouter.delete('/:reportId', SalesReportValidation.getReportByIdSchema, salesReportController.deleteReport.bind(salesReportController));

export default salesReportRouter;
