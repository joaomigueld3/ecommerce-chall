'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RequireRole from '@/features/auth/RequireRole';
import { useAuth } from '@/features/auth/AuthContext';
import {
  deleteReport,
  downloadReportCsv,
  generateReport,
  getReports,
} from '@/features/reports/api';
import { formatDate, formatPrice } from '@/lib/format';
import Loading from '@/components/ui/Loading';
import ErrorMessage from '@/components/ui/ErrorMessage';
import EmptyState from '@/components/ui/EmptyState';

function ReportsAdminContent() {
  const { token, logout } = useAuth();
  const router = useRouter();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [startDate, setStartDate] = useState(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [message, setMessage] = useState(null);
  const [latestItems, setLatestItems] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const data = await getReports(token);
        if (ignore) return;
        setReports(data?.allReports ?? []);
        setError(null);
      } catch (err) {
        if (ignore) return;
        if (err.status === 401) {
          logout();
          router.replace('/login');
          return;
        }
        setError(err.message || 'Failed to load reports.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [token, reloadKey, logout, router]);

  function refresh() {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  async function handleGenerate(event) {
    event.preventDefault();
    setFormError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const payload = {
        startDate: `${startDate}T00:00:00.000Z`,
        endDate: `${endDate}T23:59:59.999Z`,
        ...(category.trim() ? { category: category.trim() } : {}),
        ...(status ? { status } : {}),
      };
      const res = await generateReport(token, payload);
      setLatestItems(res.items ?? []);
      setMessage(res.message || 'Sales report generated.');
      refresh();
    } catch (err) {
      setFormError(err.message || 'Failed to generate report.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownload(report) {
    setFormError(null);
    try {
      const blob = await downloadReportCsv(token, report.reportId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sales-report-${report.reportId}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setFormError(err.message || 'Failed to download CSV.');
    }
  }

  async function handleDelete(reportId) {
    if (!window.confirm(`Delete report #${reportId}?`)) return;
    setFormError(null);
    try {
      await deleteReport(token, reportId);
      setMessage(`Report #${reportId} deleted.`);
      refresh();
    } catch (err) {
      setFormError(err.message || 'Failed to delete report.');
    }
  }

  return (
    <section className="stack">
      <h1>Sales reports</h1>

      {message && <p className="alert alert-success">{message}</p>}
      {formError && <p className="alert alert-error">{formError}</p>}

      <div className="card">
        <h2>Generate report (SQL + CSV)</h2>
        <form onSubmit={handleGenerate} className="filters-bar">
          <label htmlFor="rep-start">
            Start date
            <input
              id="rep-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>
          <label htmlFor="rep-end">
            End date
            <input
              id="rep-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </label>
          <label htmlFor="rep-cat">
            Category (optional)
            <input
              id="rep-cat"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </label>
          <label htmlFor="rep-status">
            Status (optional)
            <select
              id="rep-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All paid statuses</option>
              <option value="Received">Received</option>
              <option value="In Preparation">In Preparation</option>
              <option value="Dispatched">Dispatched</option>
              <option value="Delivered">Delivered</option>
            </select>
          </label>
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Generating...' : 'Generate report'}
          </button>
        </form>
      </div>

      {latestItems && (
        <div className="card">
          <h2>Latest report breakdown</h2>
          {latestItems.length === 0 ? (
            <p className="muted">No paid sales matched this period/filter.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Units sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {latestItems.map((item) => (
                  <tr key={item.productId}>
                    <td>#{item.productId} — {item.productName}</td>
                    <td>{item.category}</td>
                    <td>{item.quantitySold}</td>
                    <td>$ {formatPrice(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <h2>Generated reports</h2>
      {loading && <Loading message="Loading reports..." />}
      {!loading && error && <ErrorMessage message={error} onRetry={refresh} />}
      {!loading && !error && reports.length === 0 && (
        <EmptyState message="No reports generated yet." />
      )}
      {!loading && !error && reports.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Id</th>
              <th>Period</th>
              <th>Products sold</th>
              <th>Total sales</th>
              <th>File path</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.reportId}>
                <td>#{report.reportId}</td>
                <td>
                  {formatDate(report.periodStart)} — {formatDate(report.periodEnd)}
                </td>
                <td>{report.productsSold}</td>
                <td>$ {formatPrice(report.totalSales)}</td>
                <td className="muted">{report.filePath}</td>
                <td>
                  <div className="actions-row">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleDownload(report)}
                    >
                      Download CSV
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleDelete(report.reportId)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default function ReportsAdminPage() {
  return (
    <RequireRole allowedRoles={['Admin']}>
      <ReportsAdminContent />
    </RequireRole>
  );
}
