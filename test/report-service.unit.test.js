/*
 * Pure unit tests for SalesReportService (SQL aggregation parameters, CSV generation, file safety).
 * Run with: npm run test:unit
 */
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import SalesReportService from '../src/entities/services/SalesReportService.js';
import { CustomError } from '../src/utils/errorHandler.js';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecommerce-report-test-'));

after(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('SalesReportService (CSV & SQL report generation)', () => {
  it('escapes commas, quotes and formula injection prefixes in CSV cells', () => {
    assert.equal(SalesReportService.escapeCsvCell('Mouse, RGB'), '"Mouse, RGB"');
    assert.equal(SalesReportService.escapeCsvCell('He said "Hi"'), '"He said ""Hi"""');
    assert.equal(SalesReportService.escapeCsvCell('=CMD()'), "'=CMD()");
    assert.equal(SalesReportService.escapeCsvCell('+100'), "'+100");
  });

  it('formats CSV header, rows and TOTAL summary row accurately', () => {
    const csv = SalesReportService.formatReportCsv(
      [
        {
          productId: 1,
          productName: 'Keyboard',
          category: 'Peripherals',
          quantitySold: 3,
          revenue: '150.00',
        },
        {
          productId: 2,
          productName: 'Mouse, Pro',
          category: 'Peripherals',
          quantitySold: 2,
          revenue: '80.50',
        },
      ],
      { productsSold: 5, totalSales: '230.50' },
    );

    const lines = csv.split('\n');
    assert.equal(lines[0], 'productId,productName,category,quantitySold,revenue');
    assert.equal(lines[1], '1,Keyboard,Peripherals,3,150.00');
    assert.equal(lines[2], '2,"Mouse, Pro",Peripherals,2,80.50');
    assert.equal(lines[3], 'TOTAL,,,5,230.50');
  });

  it('rejects invalid date ranges with 400 CustomError', async () => {
    const service = new SalesReportService({}, {}, { reportsDir: tempDir });

    await assert.rejects(
      () => service.generateReport({ startDate: 'invalid', endDate: '2026-11-16' }),
      (error) => error instanceof CustomError && error.statusCode === 400,
    );

    await assert.rejects(
      () => service.generateReport({ startDate: '2026-11-20', endDate: '2026-11-10' }),
      (error) => error instanceof CustomError && error.statusCode === 400,
    );
  });

  it('executes parameterized SQL query, writes CSV file, persists report, and deletes cleanly', async () => {
    const capturedQueries = [];
    const createdReports = [];

    const mockConnection = {
      async query(sql, options) {
        capturedQueries.push({ sql, options });
        return [
          { productId: 1, productName: 'Monitor 4K', category: 'Electronics', quantitySold: 2, revenue: '2000.00' },
          { productId: 4, productName: 'USB-C Hub', category: 'Accessories', quantitySold: 3, revenue: '300.30' },
        ];
      },
    };

    const mockRepository = {
      async create(data) {
        const record = { reportId: 1, ...data };
        createdReports.push(record);
        return record;
      },
      async findById(id) {
        return createdReports.find((r) => r.reportId === Number(id)) || null;
      },
      async delete(id) {
        const idx = createdReports.findIndex((r) => r.reportId === Number(id));
        if (idx >= 0) createdReports.splice(idx, 1);
        return 1;
      },
    };

    const service = new SalesReportService(mockRepository, mockConnection, { reportsDir: tempDir });

    const result = await service.generateReport({
      startDate: '2026-11-01T00:00:00.000Z',
      endDate: '2026-11-30T23:59:59.999Z',
      category: 'Electronics',
    });

    assert.equal(capturedQueries.length, 1);
    assert.match(capturedQueries[0].sql, /GROUP BY p\.product_id/i);
    assert.equal(capturedQueries[0].options.replacements.category, '%Electronics%');

    assert.equal(result.report.productsSold, 5);
    assert.equal(result.report.totalSales, '2300.30');
    assert.equal(result.items.length, 2);

    const { filePath } = await service.getReportFile(1);
    assert.equal(fs.existsSync(filePath), true);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    assert.match(fileContent, /Monitor 4K/);
    assert.match(fileContent, /TOTAL,,,5,2300\.30/);

    await service.deleteReport(1);
    assert.equal(fs.existsSync(filePath), false);
    assert.equal(createdReports.length, 0);
  });
});
