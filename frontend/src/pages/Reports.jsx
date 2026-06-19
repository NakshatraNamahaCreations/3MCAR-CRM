import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import reportApi from '../api/reportApi.js';
import {
  Button,
  Card,
  PageHeader,
  Input,
  Select,
  Spinner,
  EmptyState,
} from '../components/common/ui.jsx';
import DataTable from '../components/tables/DataTable.jsx';

// `value` must match the backend route slug (GET /api/reports/<value>).
const REPORT_TYPES = [
  { value: 'enquiry', label: 'Enquiry Report' },
  { value: 'followup', label: 'Followup Report' },
  { value: 'quote', label: 'Quote Report' },
  { value: 'customer', label: 'Customer Report' },
  { value: 'appointment', label: 'Appointment Report' },
  { value: 'job-card', label: 'Job Card Report' },
  { value: 'invoice', label: 'Invoice Report' },
  { value: 'payment', label: 'Payment Report' },
  { value: 'product-inventory', label: 'Product Inventory Report' },
  { value: 'stock-movement', label: 'Stock Movement Report' },
  { value: 'ppf-usage', label: 'PPF Usage Report' },
  { value: 'expense', label: 'Expense Report' },
  { value: 'petty-cash', label: 'Petty Cash Report' },
  { value: 'daily-cash', label: 'Daily Cash Report' },
  { value: 'employee', label: 'Employee Report' },
  { value: 'attendance', label: 'Attendance Report' },
  { value: 'monthly-attendance', label: 'Monthly Attendance Report' },
  { value: 'salary', label: 'Salary Report' },
  { value: 'salary-advance', label: 'Salary Advance Report' },
  { value: 'leave', label: 'Leave Report' },
  { value: 'payroll', label: 'Payroll Report' },
  { value: 'profit-and-loss', label: 'Profit & Loss Report' },
];

function prettifyKey(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

// Pick a human-friendly label from a populated ref / sub-document.
function labelFromObject(obj) {
  if (obj.name) return obj.code ? `${obj.name} (${obj.code})` : obj.name;
  return (
    obj.fullName ||
    obj.quoteNumber ||
    obj.invoiceNumber ||
    obj.enquiryNumber ||
    obj.appointmentNumber ||
    obj.jobCardNumber ||
    obj.vehicleNumber ||
    obj.productName ||
    obj.serviceName ||
    obj.employeeCode ||
    obj.customerCode ||
    obj.code ||
    ''
  );
}

function formatCell(value) {
  if (value === null || value === undefined) return '';

  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    return value.map(formatCell).filter(Boolean).join(', ');
  }

  if (typeof value === 'object') {
    const label = labelFromObject(value);
    return label || ''; // hide raw _id dumps for unlabelled sub-docs
  }

  // ISO date / datetime → readable local format
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString('en-IN');
  }

  return String(value);
}

function toCsvValue(value) {
  const str = formatCell(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function Reports() {
  const [type, setType] = useState(REPORT_TYPES[0].value);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [ranType, setRanType] = useState('');

  // Normalize the result into a usable shape.
  const { rows, columns, statCards, isEmpty } = useMemo(() => {
    let payload = result;

    // Some endpoints may wrap the data; try to find an array if the
    // top-level is an object that contains one obvious array.
    if (
      payload &&
      typeof payload === 'object' &&
      !Array.isArray(payload)
    ) {
      const arrayKeys = Object.keys(payload).filter((k) =>
        Array.isArray(payload[k])
      );
      if (arrayKeys.length === 1) {
        payload = payload[arrayKeys[0]];
      }
    }

    if (Array.isArray(payload)) {
      if (payload.length === 0) {
        return { rows: [], columns: [], statCards: null, isEmpty: true };
      }
      // Collect keys across rows (defensive: rows may differ).
      const HIDDEN_KEYS = new Set(['_id', '__v']);
      const keySet = [];
      payload.forEach((row) => {
        if (row && typeof row === 'object' && !Array.isArray(row)) {
          Object.keys(row).forEach((k) => {
            if (HIDDEN_KEYS.has(k)) return;
            if (!keySet.includes(k)) keySet.push(k);
          });
        }
      });

      if (keySet.length === 0) {
        // Array of primitives.
        const cols = [{ key: 'value', label: 'Value', render: (r) => formatCell(r.value) }];
        const mapped = payload.map((v, i) => ({ _idx: i, value: v }));
        return { rows: mapped, columns: cols, statCards: null, isEmpty: false };
      }

      const cols = keySet.map((k) => ({
        key: k,
        label: prettifyKey(k),
        render: (row) => formatCell(row[k]),
      }));
      const mapped = payload.map((row, i) => ({ _idx: i, ...row }));
      return { rows: mapped, columns: cols, statCards: null, isEmpty: false };
    }

    if (payload && typeof payload === 'object') {
      const cards = Object.keys(payload).map((k) => ({
        key: k,
        label: prettifyKey(k),
        value: formatCell(payload[k]),
      }));
      return {
        rows: [],
        columns: [],
        statCards: cards,
        isEmpty: cards.length === 0,
      };
    }

    return { rows: [], columns: [], statCards: null, isEmpty: result == null };
  }, [result]);

  async function handleRun() {
    setLoading(true);
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const data = await reportApi.get(type, params);
      setResult(data ?? null);
      setRanType(type);
    } finally {
      setLoading(false);
    }
  }

  function handleExportCsv() {
    if (!rows.length || !columns.length) {
      toast.error('No tabular data to export');
      return;
    }
    const header = columns.map((c) => toCsvValue(c.label)).join(',');
    const lines = rows.map((row) =>
      columns.map((c) => toCsvValue(row[c.key])).join(',')
    );
    const csv = [header, ...lines].join('\r\n');

    const blob = new Blob(['﻿' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `${ranType || 'report'}-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }

  const hasRun = result !== null;
  const hasTable = rows.length > 0 && columns.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" />

      <Card>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Report Type
            </label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {REPORT_TYPES.map((rt) => (
                <option key={rt.value} value={rt.value}>
                  {rt.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              From
            </label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              To
            </label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="primary" onClick={handleRun} disabled={loading}>
              {loading ? 'Running…' : 'Run'}
            </Button>
            <Button
              variant="secondary"
              onClick={handleExportCsv}
              disabled={!hasTable || loading}
            >
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {!loading && hasRun && statCards && statCards.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => (
            <Card key={card.key}>
              <div className="text-sm font-medium text-gray-500">
                {card.label}
              </div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {card.value || '—'}
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && hasRun && hasTable && (
        <Card>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey="_idx"
            emptyMessage="No records found."
          />
        </Card>
      )}

      {!loading && hasRun && isEmpty && (
        <Card>
          <EmptyState message="No data returned for this report." />
        </Card>
      )}

      {!loading && !hasRun && (
        <Card>
          <EmptyState message="Select a report type and date range, then click Run." />
        </Card>
      )}
    </div>
  );
}
