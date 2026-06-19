import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import expenseApi from '../api/expenseApi.js';
import {
  Button,
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
  { value: 'petty_cash', label: 'Petty Cash' },
  { value: 'other', label: 'Other' },
];

const emptyForm = {
  expenseDate: '',
  category: '',
  amount: '',
  paymentMode: 'cash',
  paidTo: '',
  remarks: '',
};

const toDateInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

export default function Expenses() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const _searched = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(t));
  }, [rows, search]);

  const { filtered: _buFiltered, controls: _buControls } = useBranchUserFilter(
    _searched,
    () => setPage(1),
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  const _paged = useMemo(
    () => _buFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [_buFiltered, page],
  );

  const loadList = async () => {
    setLoading(true);
    try {
      const data = await expenseApi.list();
      setRows(Array.isArray(data) ? data : data?.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    // Default the expense date to today.
    setForm({ ...emptyForm, expenseDate: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id);
    setForm({
      expenseDate: toDateInput(row.expenseDate),
      category: row.category ?? '',
      amount: row.amount ?? '',
      paymentMode: row.paymentMode ?? 'cash',
      paidTo: row.paidTo ?? '',
      remarks: row.remarks ?? '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const setField = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: form.amount === '' ? 0 : Number(form.amount),
      };
      if (editingId) {
        await expenseApi.update(editingId, payload);
        toast.success('Expense updated');
      } else {
        await expenseApi.create(payload);
        toast.success('Expense created');
      }
      closeModal();
      await loadList();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const id = confirmId;
    setConfirmId(null);
    if (!id) return;
    await expenseApi.remove(id);
    toast.success('Expense deleted');
    await loadList();
  };

  const columns = [
    { key: 'sl', label: 'Sl. No.', className: 'w-16', render: (_row, index) => <span className="font-medium text-slate-400">{(page - 1) * PAGE_SIZE + index + 1}</span> },
    {
      key: 'expenseDate',
      label: 'Date',
      render: (row) =>
        row.expenseDate
          ? new Date(row.expenseDate).toLocaleDateString('en-IN')
          : '-',
    },
    { key: 'category', label: 'Category' },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => `₹${Number(row.amount ?? 0).toLocaleString('en-IN')}`,
    },
    {
      key: 'paymentMode',
      label: 'Payment Mode',
      render: (row) => <StatusBadge status={row.paymentMode} />,
    },
    { key: 'paidTo', label: 'Paid To' },
    { key: 'branch', label: 'Branch', render: (row) => <span className="text-slate-500">{row.branchId?.name || '—'}</span> },
    { key: 'createdBy', label: 'Created By', render: (row) => <span className="text-slate-500">{row.createdBy?.name || '—'}</span> },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
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
              setConfirmId(row._id);
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
        title="Expenses"
        actions={<Button onClick={openCreate}>Add Expense</Button>}
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

      {loading ? (
        <Loading />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={_paged}
            loading={loading}
            emptyMessage="No expenses found"
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={_buFiltered.length}
            onPageChange={setPage}
          />
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit Expense' : 'Add Expense'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Expense Date"
              type="date"
              value={form.expenseDate}
              onChange={setField('expenseDate')}
              required
            />
            <Input
              label="Amount (₹)"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={setField('amount')}
              required
            />
          </div>
          <Input
            label="Category"
            value={form.category}
            onChange={setField('category')}
            required
          />
          <Select
            label="Payment Mode"
            value={form.paymentMode}
            onChange={setField('paymentMode')}
          >
            {PAYMENT_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
          <Input
            label="Paid To"
            value={form.paidTo}
            onChange={setField('paidTo')}
          />
          <Textarea
            label="Remarks"
            value={form.remarks}
            onChange={setField('remarks')}
            rows={3}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
