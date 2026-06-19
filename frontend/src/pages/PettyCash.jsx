import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import pettyCashApi from '../api/pettyCashApi.js';
import { Pagination } from '../components/common/DataViews.jsx';
import { useBranchUserFilter } from '../hooks/useBranchUserFilter.jsx';
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

const PAGE_SIZE = 12;

const TRANSACTION_TYPES = [
  { value: 'cash_in', label: 'Cash In' },
  { value: 'cash_out', label: 'Cash Out' },
];

const emptyForm = {
  transactionDate: '',
  transactionType: 'cash_in',
  category: '',
  amount: '',
  paymentPurpose: '',
  paidTo: '',
  receivedFrom: '',
  remarks: '',
};

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 10);
};

const money = (value) =>
  value === null || value === undefined || value === ''
    ? '-'
    : `₹${Number(value).toLocaleString('en-IN')}`;

export default function PettyCash() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [confirm, setConfirm] = useState(null);

  const loadBalance = async () => {
    try {
      const data = await pettyCashApi.balance();
      setBalance(data);
    } catch {
      /* error auto-toasted */
    }
  };

  const loadRows = async () => {
    setLoading(true);
    try {
      const data = await pettyCashApi.list();
      setRows(Array.isArray(data) ? data : data?.items || []);
    } finally {
      setLoading(false);
    }
  };

  const reload = async () => {
    await Promise.all([loadRows(), loadBalance()]);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [typeFilter, setTypeFilter] = useState('');

  const _searched = useMemo(() => {
    const t = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter && r.transactionType !== typeFilter) return false;
      if (!t) return true;
      return JSON.stringify(r).toLowerCase().includes(t);
    });
  }, [rows, search, typeFilter]);

  const { filtered: _buFiltered, controls: _buControls } = useBranchUserFilter(
    _searched,
    () => setPage(1),
  );

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter]);

  const _paged = useMemo(
    () => _buFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [_buFiltered, page],
  );

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, transactionDate: formatDate(new Date()) });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id);
    setForm({
      transactionDate: formatDate(row.transactionDate),
      transactionType: row.transactionType || 'cash_in',
      category: row.category || '',
      amount: row.amount ?? '',
      paymentPurpose: row.paymentPurpose || '',
      paidTo: row.paidTo || '',
      receivedFrom: row.receivedFrom || '',
      remarks: row.remarks || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleChange = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: form.amount === '' ? undefined : Number(form.amount),
      };
      if (editingId) {
        await pettyCashApi.update(editingId, payload);
        toast.success('Transaction updated');
      } else {
        await pettyCashApi.create(payload);
        toast.success('Transaction created');
      }
      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm) return;
    const id = confirm._id;
    setConfirm(null);
    await pettyCashApi.remove(id);
    toast.success('Transaction deleted');
    await reload();
  };

  const handleApprove = async (row) => {
    await pettyCashApi.approve(row._id);
    toast.success('Transaction approved');
    await reload();
  };

  const isPendingCashOut = (row) =>
    row.transactionType === 'cash_out' &&
    String(row.status || '').toLowerCase() === 'pending';

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
      key: 'transactionDate',
      label: 'Date',
      render: (row) => formatDate(row.transactionDate) || '-',
    },
    {
      key: 'transactionType',
      label: 'Type',
      render: (row) => <StatusBadge status={row.transactionType} />,
    },
    {
      key: 'amount',
      label: 'Amount',
      className: 'text-right',
      render: (row) => money(row.amount),
    },
    {
      key: 'closingBalance',
      label: 'Closing Balance',
      className: 'text-right',
      render: (row) => money(row.closingBalance),
    },
    {
      key: 'category',
      label: 'Category',
      render: (row) => row.category || '-',
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
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          {isPendingCashOut(row) && (
            <Button
              size="sm"
              variant="success"
              onClick={(e) => {
                e.stopPropagation();
                handleApprove(row);
              }}
            >
              Approve
            </Button>
          )}
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
        title="Petty Cash"
        actions={<Button onClick={openCreate}>Add Transaction</Button>}
      />

      <Card>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">
            Current Balance
          </span>
          <span className="text-2xl font-semibold text-gray-900">
            {money(balance?.currentBalance ?? balance?.balance ?? balance?.closingBalance ?? (typeof balance === 'number' ? balance : 0))}
          </span>
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
          <Input
            label="Search"
            placeholder="Purpose / paid to / category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {_buControls}
          <Select label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            <option value="cash_in">Cash In</option>
            <option value="cash_out">Cash Out</option>
          </Select>
          {(search || typeFilter) && (
            <div><Button variant="ghost" size="sm" onClick={() => { setSearch(''); setTypeFilter(''); }}>Clear filters</Button></div>
          )}
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={_paged}
            emptyMessage="No petty cash transactions yet."
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
        title={editingId ? 'Edit Transaction' : 'Add Transaction'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="petty-cash-form" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      >
        <form
          id="petty-cash-form"
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <Input
            label="Transaction Date"
            type="date"
            value={form.transactionDate}
            onChange={handleChange('transactionDate')}
            required
          />
          <Select
            label="Transaction Type"
            value={form.transactionType}
            onChange={handleChange('transactionType')}
          >
            {TRANSACTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <Input
            label="Category"
            value={form.category}
            onChange={handleChange('category')}
          />
          <Input
            label="Amount"
            type="number"
            value={form.amount}
            onChange={handleChange('amount')}
            required
          />
          <Input
            label="Payment Purpose"
            value={form.paymentPurpose}
            onChange={handleChange('paymentPurpose')}
          />
          <Input
            label="Paid To"
            value={form.paidTo}
            onChange={handleChange('paidTo')}
          />
          <Input
            label="Received From"
            value={form.receivedFrom}
            onChange={handleChange('receivedFrom')}
          />
          <div className="sm:col-span-2">
            <Textarea
              label="Remarks"
              value={form.remarks}
              onChange={handleChange('remarks')}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title="Delete Transaction"
        message="Are you sure you want to delete this petty cash transaction?"
        onConfirm={handleDelete}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
