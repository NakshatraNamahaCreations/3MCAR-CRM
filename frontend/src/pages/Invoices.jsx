import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import invoiceApi from '../api/invoiceApi.js';
import paymentApi from '../api/paymentApi.js';
import {
  Button,
  Card,
  PageHeader,
  Input,
  Select,
  Textarea,
  StatusBadge,
  Modal,
  ConfirmDialog,
} from '../components/common/ui.jsx';
import DataTable from '../components/tables/DataTable.jsx';
import { Pagination } from '../components/common/DataViews.jsx';
import { useBranchUserFilter } from '../hooks/useBranchUserFilter.jsx';

const PAGE_SIZE = 12;

const PAYMENT_STATUS_OPTIONS = ['unpaid', 'partial', 'paid', 'cancelled'];

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const inr = (v) =>
  '₹' +
  num(v).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const customerName = (row) =>
  row.customerId?.name ||
  row.customerName ||
  row.customer?.name ||
  row.customer?.customerName ||
  (typeof row.customer === 'string' ? row.customer : '') ||
  '-';

const customerPhone = (row) => row.customerId?.phone || row.phone || '';

const emptyPaymentForm = () => ({
  amount: '',
  paymentMode: 'cash',
  transactionId: '',
  remarks: '',
});

export default function Invoices() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.invoiceNumber, customerName(r), customerPhone(r)].filter(Boolean).join(' ').toLowerCase().includes(t)
    );
  }, [rows, search]);

  const { filtered: _buFiltered, controls: _buControls } = useBranchUserFilter(filteredRows, () => setPage(1));

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const _paged = useMemo(
    () => _buFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [_buFiltered, page]
  );

  const [viewInvoice, setViewInvoice] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  const [payInvoice, setPayInvoice] = useState(null);
  const [payForm, setPayForm] = useState(emptyPaymentForm());
  const [saving, setSaving] = useState(false);

  const [confirm, setConfirm] = useState(null);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { paymentStatus: statusFilter } : {};
      const data = await invoiceApi.list(params);
      setRows(Array.isArray(data) ? data : data?.items || data?.rows || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Load the formatted PDF into an object URL whenever an invoice is opened.
  useEffect(() => {
    let revoked = false;
    let currentUrl = '';
    if (viewInvoice?._id) {
      setPdfLoading(true);
      setPdfUrl('');
      invoiceApi
        .pdfObjectUrl(viewInvoice._id)
        .then((url) => {
          if (revoked) { window.URL.revokeObjectURL(url); return; }
          currentUrl = url;
          setPdfUrl(url);
        })
        .catch(() => {})
        .finally(() => { if (!revoked) setPdfLoading(false); });
    }
    return () => {
      revoked = true;
      if (currentUrl) window.URL.revokeObjectURL(currentUrl);
    };
  }, [viewInvoice]);

  const openView = (row) => setViewInvoice(row);

  const openPayment = (row) => {
    setPayInvoice(row);
    setPayForm({
      ...emptyPaymentForm(),
      amount: row.balanceAmount != null ? String(row.balanceAmount) : '',
    });
  };

  const setPayField = (key, value) =>
    setPayForm((f) => ({ ...f, [key]: value }));

  const handleAddPayment = async (e) => {
    if (e) e.preventDefault();
    if (!payInvoice) return;
    if (num(payForm.amount) <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    setSaving(true);
    try {
      await paymentApi.create({
        invoiceId: payInvoice._id,
        amount: num(payForm.amount),
        paymentMode: payForm.paymentMode,
        transactionId: payForm.transactionId,
        remarks: payForm.remarks,
      });
      toast.success('Payment recorded');
      setPayInvoice(null);
      setPayForm(emptyPaymentForm());
      await loadInvoices();
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm) return;
    try {
      await invoiceApi.cancel(confirm._id);
      toast.success('Invoice cancelled');
      await loadInvoices();
    } finally {
      setConfirm(null);
    }
  };

  const [downloadingId, setDownloadingId] = useState(null);
  const handleDownloadPdf = async (row) => {
    setDownloadingId(row._id);
    try {
      await invoiceApi.downloadPdf(row._id, row.invoiceNumber);
    } catch {
      toast.error('Could not download invoice PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const columns = [
    { key: 'sl', label: 'Sl. No.', className: 'w-16', render: (_row, index) => <span className="font-medium text-slate-400">{(page - 1) * PAGE_SIZE + index + 1}</span> },
    { key: 'invoiceNumber', label: 'Invoice #' },
    {
      key: 'customer',
      label: 'Customer',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-700">{customerName(row)}</p>
          {customerPhone(row) && <p className="text-xs text-slate-400">{customerPhone(row)}</p>}
        </div>
      ),
    },
    {
      key: 'grandTotal',
      label: 'Grand Total',
      className: 'text-right',
      render: (row) => inr(row.grandTotal),
    },
    {
      key: 'paidAmount',
      label: 'Paid',
      className: 'text-right',
      render: (row) => inr(row.paidAmount),
    },
    {
      key: 'balanceAmount',
      label: 'Balance',
      className: 'text-right',
      render: (row) => inr(row.balanceAmount),
    },
    {
      key: 'paymentStatus',
      label: 'Status',
      render: (row) => <StatusBadge status={row.paymentStatus} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => {
        const cancelled = row.paymentStatus === 'cancelled';
        return (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                openView(row);
              }}
            >
              View
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={downloadingId === row._id}
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadPdf(row);
              }}
            >
              {downloadingId === row._id ? '…' : 'PDF'}
            </Button>
            {!cancelled && num(row.balanceAmount) > 0 && (
              <Button
                size="sm"
                variant="success"
                onClick={(e) => {
                  e.stopPropagation();
                  openPayment(row);
                }}
              >
                Add Payment
              </Button>
            )}
            {!cancelled && (
              <Button
                size="sm"
                variant="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirm(row);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        );
      },
    },
  ];


  return (
    <div className="space-y-4">
      <PageHeader title="Invoices" />

      <Card>
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
          <Input
            label="Search"
            placeholder="Invoice # / customer / phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {_buControls}
          <Select
            label="Payment Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {PAYMENT_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </Select>
          {(search || statusFilter) && (
            <div>
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter(''); }}>Clear filters</Button>
            </div>
          )}
        </div>
      </Card>

      <Card padded={false}>
        <DataTable
          columns={columns}
          rows={_paged}
          loading={loading}
          emptyMessage="No invoices found."
          rowKey="_id"
          onRowClick={openView}
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={_buFiltered.length} onPageChange={setPage} />
      </Card>

      {/* View Invoice Modal */}
      <Modal
        open={!!viewInvoice}
        onClose={() => setViewInvoice(null)}
        title={
          viewInvoice
            ? `Invoice ${viewInvoice.invoiceNumber || ''}`
            : 'Invoice'
        }
        size="xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setViewInvoice(null)}>
              Close
            </Button>
            {viewInvoice && (
              <Button
                variant="secondary"
                disabled={downloadingId === viewInvoice._id}
                onClick={() => handleDownloadPdf(viewInvoice)}
              >
                {downloadingId === viewInvoice._id ? 'Downloading…' : 'Download PDF'}
              </Button>
            )}
            {viewInvoice &&
              viewInvoice.paymentStatus !== 'cancelled' &&
              num(viewInvoice.balanceAmount) > 0 && (
                <Button
                  variant="success"
                  onClick={() => {
                    const inv = viewInvoice;
                    setViewInvoice(null);
                    openPayment(inv);
                  }}
                >
                  Add Payment
                </Button>
              )}
          </div>
        }
      >
        {viewInvoice && (
          <div className="h-[70vh] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            {pdfLoading || !pdfUrl ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                {pdfLoading ? 'Generating invoice…' : 'Preview unavailable — use Download.'}
              </div>
            ) : (
              <iframe title="Invoice PDF" src={pdfUrl} className="h-full w-full" />
            )}
          </div>
        )}
      </Modal>

      {/* Add Payment Modal */}
      <Modal
        open={!!payInvoice}
        onClose={() => setPayInvoice(null)}
        title={
          payInvoice
            ? `Add Payment — ${payInvoice.invoiceNumber || ''}`
            : 'Add Payment'
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPayInvoice(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddPayment}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Record Payment'}
            </Button>
          </div>
        }
      >
        {payInvoice && (
          <form onSubmit={handleAddPayment} className="space-y-4">
            <div className="rounded-md bg-gray-50 p-3 text-sm flex justify-between">
              <span className="text-gray-500">Balance Due</span>
              <span className="font-medium text-gray-900">
                {inr(payInvoice.balanceAmount)}
              </span>
            </div>

            <Input
              label="Amount"
              type="number"
              min="0"
              step="0.01"
              value={payForm.amount}
              onChange={(e) => setPayField('amount', e.target.value)}
              required
            />

            <Select
              label="Payment Mode"
              value={payForm.paymentMode}
              onChange={(e) => setPayField('paymentMode', e.target.value)}
            >
              {PAYMENT_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>

            <Input
              label="Transaction ID"
              value={payForm.transactionId}
              onChange={(e) => setPayField('transactionId', e.target.value)}
              placeholder="Reference / UTR / cheque no."
            />

            <Textarea
              label="Remarks"
              rows={2}
              value={payForm.remarks}
              onChange={(e) => setPayField('remarks', e.target.value)}
            />

            <p className="text-xs text-gray-400">
              For split payments, record this payment and add another once
              saved.
            </p>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title="Cancel Invoice"
        message={`Cancel invoice ${confirm?.invoiceNumber || ''}? This cannot be undone.`}
        onConfirm={handleCancel}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
