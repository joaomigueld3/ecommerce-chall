import { Model, DataTypes } from 'sequelize';

class SalesReport extends Model {
  static init(sequelize) {
    super.init(
      {
        reportId: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          field: 'report_id',
        },
        period: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        periodStart: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'period_start',
        },
        periodEnd: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'period_end',
        },
        totalSales: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0.0,
          field: 'total_sales',
        },
        productsSold: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'products_sold',
        },
        filePath: {
          type: DataTypes.STRING(500),
          allowNull: false,
          field: 'file_path',
        },
        filters: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: 'SalesReport',
        tableName: 'table_sales_reports',
        timestamps: true,
        underscored: true,
      },
    );
  }

  static associate() {}

  toDict() {
    return {
      reportId: this.reportId,
      period: this.period,
      periodStart: this.periodStart,
      periodEnd: this.periodEnd,
      totalSales: this.totalSales,
      productsSold: this.productsSold,
      filePath: this.filePath,
      filters: this.filters,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default SalesReport;
