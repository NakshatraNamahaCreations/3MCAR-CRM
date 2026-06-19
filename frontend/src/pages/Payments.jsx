import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import paymentApi from '../api/paymentApi.js';
import {
  Button,
  Card,
  PageHeader,
  Input,
  Select,
  Textarea,
  StatusBadge,
  Loading,
  Modal,
  ConfirmDialog,
} from '../components/common/ui.jsx';
import DataTable from '../components/tables/DataTable.jsx';
import { Pagination } from '../components/common/DataViews.jsx';
import { useBranchUserFilter } from '../hooks/useBranchUserFilter.jsx';

const PAGE_SIZE = 12;

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

const fmtDate = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN');
};

const toDateInput = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const modeLabel = (v) =>
  PAYMENT_MODES.find((m) => m.value === v)?.label || v || '-';

const emptyForm = () => ({
  invoiceId: '',
  amount: '',
  paymentMode: 'cash',
  transactionId: '',
  paymentDate: toDateInput(new Date()),
  remarks: '',
});

export default function Payments() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await paymentApi.list();
      setRows(Array.isArray(data) ? data : data?.items || data?.rows || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      invoiceId:
        row.invoiceId || row.invoice?._id || row.invoice || '',
      amount: row.amount != null ? String(row.amount) : '',
      paymentMode: row.paymentMode || 'cash',
      transactionId: row.transactionId || '',
      paymentDate: toDateInput(row.paymentDate),
      remarks: row.remarks || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (num(form.amount) <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    const payload = {
      invoiceId: form.invoiceId,
      amount: num(form.amount),
      paymentMode: form.paymentMode,
      transactionId: form.transactionId,
      paymentDate: form.paymentDate || undefined,
      remarks: form.remarks,
    };
    setSaving(true);
    try {
      if (editing) {
        await paymentApi.update(editing._id, payload);
        toast.success('Payment updated');
      } else {
        await paymentApi.create(payload);
        toast.success('Payment recorded');
      }
      closeModal();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await paymentApi.remove(confirm._id);
      toast.success('Payment deleted');
      await load();
    } finally {
      setConfirm(null);
    }
  };

  const _searched = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(t));
  }, [rows, search]);

  const { filtered: _buFiltered, controls: _buControls } = useBranchUserFilter(
    _searched,
    () => setPage(1)
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  const _paged = useMemo(
    () => _buFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [_buFiltered, page]
  );

  const columns = [
    {
      key: 'sl',
      label: 'Sl. No.',
      className: 'w-16',
      render: (_row, index) => (
        <span className="font-medium text-slate-400">
          {(page - 1) * PAGE_SIZE + index + 1}
        </span>
      ),
    },
    {
      key: 'paymentDate',
      label: 'Payment Date',
      render: (row) => fmtDate(row.paymentDate),
    },
    {
      key: 'amount',
      label: 'Amount',
      className: 'text-right',
      render: (row) => inr(row.amount),
    },
    {
      key: 'paymentMode',
      label: 'Mode',
      render: (row) => modeLabel(row.paymentMode),
    },
    {
      key: 'transactionId',
      label: 'Transaction ID',
      render: (row) => row.transactionId || '-',
    },
    {
      key: 'branch',
      label: 'Branch',
      render: (row) => (
        <span className="text-slate-500">{row.branchId?.name || '—'}</span>
      ),
    },
    {
      key: 'createdBy',
      label: 'Created By',
      render: (row) => (
        <span className="text-slate-500">{row.createdBy?.name || '—'}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              setConfirm(row);
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payments"
        actions={
          <Button variant="primary" onClick={openCreate}>
            Add Payment
          </Button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Input
            label="Search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {_buControls}
        </div>
      </div>

      <Card>
        {loading ? (
          <Loading label="Loading payments…" />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={_paged}
              loading={loading}
              emptyMessage="No payments found."
              rowKey="_id"
              onRowClick={openEdit}
            />
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={_buFiltered.length}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Payment' : 'Add Payment'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? 'Saving...' : editing ? 'Update' : 'Record Payment'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Invoice ID"
            value={form.invoiceId}
            onChange={(e) => setField('invoiceId', e.target.value)}
            placeholder="Linked invoice id"
          />

          <Input
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setField('amount', e.target.value)}
            required
          />

          <Select
            label="Payment Mode"
            value={form.paymentMode}
            onChange={(e) => setField('paymentMode', e.target.value)}
          >
            {PAYMENT_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>

          <Input
            label="Transaction ID"
            value={form.transactionId}
            onChange={(e) => setField('transactionId', e.target.value)}
            placeholder="Reference / UTR / cheque no."
          />

          <Input
            label="Payment Date"
            type="date"
            value={form.paymentDate}
            onChange={(e) => setField('paymentDate', e.target.value)}
          />

          <Textarea
            label="Remarks"
            rows={2}
            value={form.remarks}
            onChange={(e) => setField('remarks', e.target.value)}
          />

          <p className="text-xs text-gray-400">
            Payments are usually added from an Invoice. Use this ledger view
            for manual or corrective entries.
          </p>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title="Delete Payment"
        message={`Delete this payment of ${
          confirm ? inr(confirm.amount) : ''
        }? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
