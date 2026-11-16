import { request, requestBlob } from '@/lib/api-client';

function buildReportsQuery(filters = {}) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.minTotalSales) params.set('minTotalSales', String(filters.minTotalSales));
  if (filters.maxTotalSales) params.set('maxTotalSales', String(filters.maxTotalSales));
  return params.toString();
}

export function getReports(token, filters) {
  const qs = filters ? buildReportsQuery(filters) : '';
  return request(qs ? `/reports?${qs}` : '/reports', { token });
}

export function generateReport(token, payload) {
  return request('/reports', { method: 'POST', body: payload, token });
}

export function deleteReport(token, reportId) {
  return request(`/reports/${reportId}`, { method: 'DELETE', token });
}

export function downloadReportCsv(token, reportId) {
  return requestBlob(`/reports/${reportId}/download`, { token });
}
